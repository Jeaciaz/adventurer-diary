import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { ARCANE_BACKGROUNDS, ATTRIBUTES, EDGES, SKILL_BY_ID } from '../data';
import { useStore } from '../store/store';
import { replayPromotions, VETERAN_EDGE_ID, type PromotionResult } from '../store/promotions';
import type { AttributeId, Character, PromotionAllocation, Promotions } from '../types';
import { Badge, Button, Input, Modal, Select, Toggle } from '../ui';

type AllocationMode = 'empty' | 'attribute' | 'learnSkill' | 'skill' | 'split' | 'edge' | 'customEdge';
const MODES: { value: AllocationMode; label: string }[] = [
  { value: 'empty', label: '— Не распределено —' },
  { value: 'attribute', label: 'Повысить параметр — 2 очка' },
  { value: 'learnSkill', label: 'Изучить навык (d4) — 2 очка' },
  { value: 'skill', label: 'Повысить один навык — 2 очка' },
  { value: 'split', label: 'Повысить два навыка — по 1 очку' },
  { value: 'edge', label: 'Получить черту — 2 очка' },
  { value: 'customEdge', label: 'Получить свою черту — 2 очка' },
];
const ATTRIBUTE_OPTIONS = ATTRIBUTES.map((attr) => ({ value: attr.id, label: attr.ru }));

function allocationMode(allocations: PromotionAllocation[]): AllocationMode {
  if (allocations.length === 0) return 'empty';
  if (allocations.length === 2 && allocations.every((allocation) => allocation.kind === 'skill')) return 'split';
  return allocations[0]?.kind ?? 'empty';
}

function initialAllocation(mode: AllocationMode): PromotionAllocation[] {
  switch (mode) {
    case 'empty': return [];
    case 'attribute': return [{ kind: 'attribute', attributeId: 'agility', points: 2 }];
    case 'learnSkill': return [{ kind: 'learnSkill', skillId: '', points: 2 }];
    case 'skill': return [{ kind: 'skill', skillId: '', points: 2 }];
    case 'split': return [{ kind: 'skill', skillId: '', points: 1 }, { kind: 'skill', skillId: '', points: 1 }];
    case 'edge': return [{ kind: 'edge', edgeId: '', points: 2 }];
    case 'customEdge': return [{ kind: 'customEdge', edge: { id: crypto.randomUUID(), name: '', description: '' }, points: 2 }];
  }
}

export function promotionLabel(row: PromotionResult): string {
  if (row.origin === 'bonus') return `Бонус к повышению №${row.number}`;
  if (row.origin === 'veteran') return `Повышение №${row.number} · Ветеран Дикого Запада`;
  return `Повышение №${row.number}`;
}

function skillOptions(character: Character) {
  return [
    ...[...SKILL_BY_ID.values()].map((skill) => ({
      value: skill.id,
      label: `${skill.ru} (${character.skills[skill.id] ?? (skill.isBase ? 'd4' : '—')})`,
    })),
    ...character.customSkills.map((skill) => ({ value: skill.id, label: `${skill.name} (${skill.die ?? '—'})` })),
  ];
}

function SkillAllocationEditor(props: {
  allocation: Extract<PromotionAllocation, { kind: 'skill' | 'learnSkill' }>;
  before: Character;
  label: string;
  onChange: (allocation: PromotionAllocation) => void;
}) {
  const isNewCustom = () => props.allocation.kind === 'learnSkill' && !!props.allocation.customSkill;
  const options = () => {
    const available = skillOptions(props.before);
    if (props.allocation.skillId && !isNewCustom() && !available.some((option) => option.value === props.allocation.skillId)) {
      available.push({ value: props.allocation.skillId, label: `${props.allocation.skillId} (удалён)` });
    }
    if (props.allocation.kind === 'learnSkill') available.push({ value: '__custom', label: '+ Новый свой навык' });
    return available;
  };
  return (
    <div class="flex flex-col gap-2">
      <Select
        label={props.label}
        options={options()}
        value={isNewCustom() ? '__custom' : props.allocation.skillId}
        placeholder="Выберите навык"
        onChange={(id) => {
          if (id === '__custom') {
            const skillId = `custom-${crypto.randomUUID()}`;
            props.onChange({ kind: 'learnSkill', skillId, points: 2, customSkill: { id: skillId, name: '', linkedAttribute: 'smarts' } });
          } else if (props.allocation.kind === 'learnSkill') {
            props.onChange({ kind: 'learnSkill', skillId: id, points: 2 });
          } else props.onChange({ ...props.allocation, skillId: id });
        }}
      />
      <Show when={isNewCustom()}>
        <Input label="Название навыка" value={props.allocation.kind === 'learnSkill' ? props.allocation.customSkill?.name ?? '' : ''}
          onInput={(event) => {
            const allocation = props.allocation;
            if (allocation.kind === 'learnSkill' && allocation.customSkill) {
              props.onChange({ ...allocation, customSkill: { ...allocation.customSkill, name: event.currentTarget.value } });
            }
          }} />
        <Select<AttributeId> label="Связанный параметр" options={ATTRIBUTE_OPTIONS}
          value={props.allocation.kind === 'learnSkill' ? props.allocation.customSkill?.linkedAttribute ?? 'smarts' : 'smarts'}
          onChange={(value) => {
            const allocation = props.allocation;
            if (value && allocation.kind === 'learnSkill' && allocation.customSkill) {
              props.onChange({ ...allocation, customSkill: { ...allocation.customSkill, linkedAttribute: value } });
            }
          }} />
      </Show>
    </div>
  );
}

function PromotionEditor(props: { result: PromotionResult; onChange: (allocations: PromotionAllocation[]) => void }) {
  const { state } = useStore();
  const mode = () => allocationMode(props.result.allocations);
  const first = () => props.result.allocations[0];
  const attributeAllocation = () => {
    const allocation = first();
    return allocation?.kind === 'attribute' ? allocation : undefined;
  };
  const edgeAllocation = () => {
    const allocation = first();
    return allocation?.kind === 'edge' ? allocation : undefined;
  };
  const customEdgeAllocation = () => {
    const allocation = first();
    return allocation?.kind === 'customEdge' ? allocation : undefined;
  };
  const skillAllocation = (index: number) => {
    const allocation = props.result.allocations[index];
    return allocation?.kind === 'skill' || allocation?.kind === 'learnSkill' ? allocation : undefined;
  };
  const replace = (index: number, allocation: PromotionAllocation) => {
    props.onChange(props.result.allocations.map((item, i) => i === index ? allocation : item));
  };
  const edgeOptions = () => EDGES
    .filter((edge) => edge.id !== VETERAN_EDGE_ID && (state.settings.deadlandsEnabled || edge.source !== 'dl' || edgeAllocation()?.edgeId === edge.id))
    .map((edge) => ({ value: edge.id, label: edge.ru }));
  return (
    <section class="rounded-xl border p-3" classList={{
      'border-error bg-error/5': props.result.status === 'invalid',
      'border-base-300': props.result.status !== 'invalid',
      'opacity-60': !props.result.active,
    }} aria-label={promotionLabel(props.result)}>
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-sm font-semibold">{promotionLabel(props.result)}</h3>
        <Show when={!props.result.active}><Badge variant="ghost">Неактивно</Badge></Show>
      </div>
      <div class="flex flex-col gap-2">
        <Select<AllocationMode> ariaLabel="Распределение" options={MODES} value={mode()}
          onChange={(value) => props.onChange(initialAllocation(value || 'empty'))} />
        <Show when={mode() === 'attribute'}>
          <Select<AttributeId> label="Параметр" options={ATTRIBUTE_OPTIONS}
            value={attributeAllocation()?.attributeId ?? ''}
            onChange={(attributeId) => { if (attributeId) props.onChange([{ kind: 'attribute', attributeId, points: 2 }]); }} />
        </Show>
        <Show when={mode() === 'skill' || mode() === 'learnSkill' || mode() === 'split'}>
          <For each={mode() === 'split' ? [0, 1] : [0]}>
            {(index) => <SkillAllocationEditor
              allocation={skillAllocation(index)!}
              before={props.result.before}
              label={mode() === 'split' ? `Навык ${index + 1} · 1 очко` : 'Навык · 2 очка'}
              onChange={(allocation) => replace(index, allocation)}
            />}
          </For>
        </Show>
        <Show when={mode() === 'edge'}>
          <Select label="Черта" options={edgeOptions()}
            value={edgeAllocation()?.edgeId ?? ''}
            placeholder="Выберите черту"
            onChange={(edgeId) => props.onChange([{ kind: 'edge', edgeId, points: 2 }])} />
          <Show when={edgeAllocation()?.edgeId === 'misticheskii-dar'}>
            <Select label="Мистический дар" options={ARCANE_BACKGROUNDS.map((ab) => ({ value: ab.id, label: ab.ru }))}
              value={edgeAllocation()?.arcaneBackgroundId ?? ''}
              placeholder="Выберите мистический дар"
              onChange={(arcaneBackgroundId) => {
                const allocation = first();
                if (allocation?.kind === 'edge') props.onChange([{ ...allocation, arcaneBackgroundId }]);
              }} />
          </Show>
        </Show>
        <Show when={mode() === 'customEdge'}>
          <Input label="Название черты" value={customEdgeAllocation()?.edge.name ?? ''}
            onInput={(event) => {
              const allocation = first();
              if (allocation?.kind === 'customEdge') props.onChange([{ ...allocation, edge: { ...allocation.edge, name: event.currentTarget.value } }]);
            }} />
          <Input label="Описание черты" value={customEdgeAllocation()?.edge.description ?? ''}
            onInput={(event) => {
              const allocation = first();
              if (allocation?.kind === 'customEdge') props.onChange([{ ...allocation, edge: { ...allocation.edge, description: event.currentTarget.value } }]);
            }} />
        </Show>
        <Show when={props.result.error}>
          <p class="text-xs text-error" role="alert">{props.result.error} Повышение не применяется.</p>
        </Show>
        <For each={props.result.changes}>{(change) => <p class="text-xs text-success">{change}</p>}</For>
        <For each={props.result.warnings}>{(warning) => <p class="text-xs text-warning">{warning}</p>}</For>
      </div>
    </section>
  );
}

export function PromotionsModal(props: { open: boolean; onClose: () => void }) {
  const { state, actions } = useStore();
  const [draft, setDraft] = createSignal<Promotions['allocations']>({});
  const [showInactive, setShowInactive] = createSignal(false);
  createEffect(on(() => props.open, (open) => {
    if (open) {
      setDraft(structuredClone(unwrap(state.character.promotions.allocations)));
      setShowInactive(false);
    }
  }));
  const results = createMemo(() => replayPromotions({ ...state.character, promotions: { ...state.character.promotions, allocations: draft() } }, state.settings));
  const visibleKeys = createMemo(() => results().rows.filter((row) => row.active || showInactive()).map((row) => row.key));
  const inactiveCount = () => results().rows.filter((row) => !row.active).length;
  return (
    <Modal open={props.open} onClose={props.onClose} title="Повышения" actions={
      <>
        <Button size="sm" variant="ghost" onClick={props.onClose}>Отмена</Button>
        <Button size="sm" variant="primary" onClick={() => { actions.setPromotionAllocations(draft()); props.onClose(); }}>Применить</Button>
      </>
    }>
      <div class="flex flex-col gap-3">
        <p class="text-xs leading-relaxed opacity-70">Повышения применяются по порядку к значениям при создании. Красные поля сохраняются, но не меняют персонажа. Новые навыки стоят 2 очка; повышение навыка — 1 очко ниже параметра, иначе 2.</p>
        <Show when={inactiveCount() > 0}>
          <Toggle label={`Показать неактивные (${inactiveCount()})`} checked={showInactive()} onChange={setShowInactive} />
        </Show>
        <Show when={visibleKeys().length > 0} fallback={<p class="text-sm opacity-70">Пока нет повышений. Добавьте полученные повышения во вкладке «Состояние».</p>}>
          <For each={visibleKeys()}>{(key) => <PromotionEditor
            result={results().rows.find((row) => row.key === key)!}
            onChange={(allocations) => setDraft((current) => ({ ...current, [key]: allocations }))}
          />}</For>
        </Show>
      </div>
    </Modal>
  );
}
