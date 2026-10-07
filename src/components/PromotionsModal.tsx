import { createEffect, createMemo, createSignal, For, on, Show } from 'solid-js';
import { unwrap } from 'solid-js/store';
import { ATTRIBUTES, EDGE_BY_ID, SKILL_BY_ID } from '../data';
import { useStore } from '../store/store';
import { replayPromotions, type PromotionResult } from '../store/promotions';
import { autoBackfillPromotion } from '../store/backfill';
import { characterPointTotalsFor } from '../store/selectors';
import type { AttributeId, Character, PromotionAllocation } from '../types';
import { Badge, Button, Input, Modal, Select, Toggle } from '../ui';

type AllocationMode = 'empty' | 'attribute' | 'learnSkill' | 'skill' | 'split' | 'edgeSlot';
const MODES: { value: AllocationMode; label: string }[] = [
  { value: 'empty', label: '— Не распределено —' },
  { value: 'attribute', label: 'Повысить параметр — 2 очка' },
  { value: 'learnSkill', label: 'Изучить навык (d4) — 2 очка' },
  { value: 'skill', label: 'Повысить один навык — 2 очка' },
  { value: 'split', label: 'Повысить два навыка — по 1 очку' },
  { value: 'edgeSlot', label: 'Увеличить лимит черт — 2 очка' },
];
const ATTRIBUTE_OPTIONS = ATTRIBUTES.map((attr) => ({ value: attr.id, label: attr.ru }));

function allocationMode(allocations: PromotionAllocation[]): AllocationMode {
  if (allocations.length === 0) return 'empty';
  if (allocations.length === 2 && allocations.every((allocation) => allocation.kind === 'skill')) return 'split';
  const kind = allocations[0]?.kind;
  return kind === 'edge' || kind === 'customEdge' ? 'edgeSlot' : kind ?? 'empty';
}

function initialAllocation(mode: AllocationMode): PromotionAllocation[] {
  switch (mode) {
    case 'empty': return [];
    case 'attribute': return [{ kind: 'attribute', attributeId: 'agility', points: 2 }];
    case 'learnSkill': return [{ kind: 'learnSkill', skillId: '', points: 2 }];
    case 'skill': return [{ kind: 'skill', skillId: '', points: 2 }];
    case 'split': return [{ kind: 'skill', skillId: '', points: 1 }, { kind: 'skill', skillId: '', points: 1 }];
    case 'edgeSlot': return [{ kind: 'edgeSlot', points: 2 }];
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

function PromotionEditor(props: {
  result: PromotionResult;
  onChange: (allocations: PromotionAllocation[]) => void;
  onAutoBackfill: () => void;
  canAutoBackfill: boolean;
  backfillError?: string;
}) {
  const { state } = useStore();
  const mode = () => allocationMode(props.result.allocations);
  const first = () => props.result.allocations[0];
  const attributeAllocation = () => {
    const allocation = first();
    return allocation?.kind === 'attribute' ? allocation : undefined;
  };
  const edgeAllocation = () => {
    const allocation = first();
    return allocation?.kind === 'edgeSlot' ? allocation : undefined;
  };
  const selectedEdgeValue = () => {
    const allocation = edgeAllocation();
    if (allocation?.customEdgeId) return `custom:${allocation.customEdgeId}`;
    return allocation?.edgeId ? `edge:${allocation.edgeId}` : '';
  };
  const skillAllocation = (index: number) => {
    const allocation = props.result.allocations[index];
    return allocation?.kind === 'skill' || allocation?.kind === 'learnSkill' ? allocation : undefined;
  };
  const replace = (index: number, allocation: PromotionAllocation) => {
    props.onChange(props.result.allocations.map((item, i) => i === index ? allocation : item));
  };
  const edgeOptions = () => {
    const options = [
      ...state.character.edges.map((edge) => ({ value: `edge:${edge.edgeId}`, label: EDGE_BY_ID.get(edge.edgeId)?.ru ?? edge.edgeId })),
      ...state.character.customEdges.map((edge) => ({ value: `custom:${edge.id}`, label: `${edge.name} (своя)` })),
    ];
    const selected = selectedEdgeValue();
    if (selected && !options.some((option) => option.value === selected)) options.push({ value: selected, label: 'Удалённая черта' });
    return options;
  };
  const selectEdgeReference = (value: string) => {
    const allocation: Extract<PromotionAllocation, { kind: 'edgeSlot' }> = { kind: 'edgeSlot', points: 2 };
    if (value.startsWith('custom:')) allocation.customEdgeId = value.slice(7);
    else if (value.startsWith('edge:')) allocation.edgeId = value.slice(5);
    props.onChange([allocation]);
  };
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
        <Show when={props.canAutoBackfill}>
          <Button size="xs" variant="ghost" class="self-start"
            onClick={props.onAutoBackfill}>Автозаполнить</Button>
        </Show>
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
        <Show when={mode() === 'edgeSlot'}>
          <p class="text-xs opacity-70">+1 к лимиту черт. Выбирайте и редактируйте черты во вкладке «Черты».</p>
          <Select label="Выбранная черта (необязательно)" options={edgeOptions()}
            value={selectedEdgeValue()} placeholder="— Без указания черты —"
            onChange={selectEdgeReference} />
        </Show>
        <Show when={props.result.error}>
          <p class="text-xs text-error" role="alert">{props.result.error} Повышение не применяется.</p>
        </Show>
        <Show when={props.backfillError}><p class="text-xs text-warning" role="status">{props.backfillError}</p></Show>
        <For each={props.result.changes}>{(change) => <p class="text-xs text-success">{change}</p>}</For>
        <For each={props.result.warnings}>{(warning) => <p class="text-xs text-warning">{warning}</p>}</For>
      </div>
    </section>
  );
}

export function PromotionsModal(props: { open: boolean; promotionKey?: string; onClose: () => void }) {
  const { state, actions } = useStore();
  const [draft, setDraft] = createSignal<Character>(structuredClone(unwrap(state.character)));
  const [showInactive, setShowInactive] = createSignal(false);
  const [backfilledKeys, setBackfilledKeys] = createSignal<string[]>([]);
  const [backfillErrors, setBackfillErrors] = createSignal<Record<string, string>>({});
  const [confirming, setConfirming] = createSignal(false);
  createEffect(on(() => props.open, (open) => {
    if (open) {
      setDraft(structuredClone(unwrap(state.character)));
      setShowInactive(false);
      setBackfilledKeys([]);
      setBackfillErrors({});
      setConfirming(false);
    }
  }));
  const results = createMemo(() => replayPromotions(draft(), state.settings));
  const visibleKeys = createMemo(() => results().rows.filter((row) => props.promotionKey
    ? row.key === props.promotionKey
    : row.active || showInactive()).map((row) => row.key));
  const inactiveCount = () => results().rows.filter((row) => !row.active).length;
  const backfillCandidates = createMemo(() => {
    if (!props.open || characterPointTotalsFor(draft(), state.settings.freeSkillPoints, results().edgeSlots).free >= 0) {
      return new Map<string, Character | null>();
    }
    return new Map(visibleKeys().map((key) => [key, autoBackfillPromotion(draft(), state.settings, key)] as const));
  });
  const baselineChanges = createMemo(() => {
    const changes: string[] = [];
    for (const { id, ru } of ATTRIBUTES) {
      if (state.character.attributes[id] !== draft().attributes[id]) {
        changes.push(`${ru}: ${state.character.attributes[id]} → ${draft().attributes[id]}`);
      }
    }
    for (const skill of SKILL_BY_ID.values()) {
      if (state.character.skills[skill.id] !== draft().skills[skill.id]) {
        changes.push(`${skill.ru}: ${state.character.skills[skill.id] ?? '—'} → ${draft().skills[skill.id] ?? '—'}`);
      }
    }
    for (const skill of draft().customSkills) {
      const before = state.character.customSkills.find((item) => item.id === skill.id);
      if (before?.die !== skill.die) changes.push(`${skill.name}: ${before?.die ?? '—'} → ${skill.die ?? '—'}`);
    }
    return changes;
  });
  const backfill = (key: string) => {
    const candidate = backfillCandidates().get(key);
    if (!candidate) {
      setBackfillErrors((current) => ({ ...current, [key]: 'Не удалось перенести 2 очка без изменения текущих значений или других повышений.' }));
      return;
    }
    setDraft(candidate);
    setBackfilledKeys((keys) => [...keys, key]);
    setBackfillErrors((current) => ({ ...current, [key]: '' }));
  };
  const changeAllocation = (key: string, allocations: PromotionAllocation[]) => {
    setDraft((current) => ({ ...current, promotions: {
      ...current.promotions, allocations: { ...current.promotions.allocations, [key]: allocations },
    } }));
    setBackfillErrors((current) => ({ ...current, [key]: '' }));
  };
  const close = () => {
    if (confirming()) setConfirming(false);
    else props.onClose();
  };
  const apply = () => {
    if (backfilledKeys().length > 0 && !confirming()) {
      setConfirming(true);
      return;
    }
    actions.applyPromotionDraft(draft());
    props.onClose();
  };
  return (
    <Modal open={props.open} onClose={close} title={confirming() ? 'Подтвердить автозаполнение' : 'Повышения'} actions={
      <>
        <Button size="sm" variant="ghost" onClick={close}>{confirming() ? 'Назад' : 'Отмена'}</Button>
        <Button size="sm" variant="primary" onClick={apply}>{confirming() ? 'Подтвердить и применить' : 'Применить'}</Button>
      </>
    }>
      <Show when={confirming()} fallback={
        <div class="flex flex-col gap-3">
          <p class="text-xs leading-relaxed opacity-70">Повышения применяются по порядку к значениям при создании. Красные поля сохраняются, но не меняют персонажа. Новые навыки стоят 2 очка; повышение навыка — 1 очко ниже параметра, иначе 2.</p>
          <Show when={[...backfillCandidates().values()].some(Boolean)}>
            <p class="text-xs leading-relaxed opacity-70">Автозаполнение исправляет перерасход очков при создании, сохраняя текущие значения. Изменения сохраняются только после подтверждения.</p>
          </Show>
          <Show when={!props.promotionKey && inactiveCount() > 0}>
            <Toggle label={`Показать неактивные (${inactiveCount()})`} checked={showInactive()} onChange={setShowInactive} />
          </Show>
          <Show when={visibleKeys().length > 0} fallback={<p class="text-sm opacity-70">Пока нет повышений. Добавьте полученные повышения во вкладке «Состояние».</p>}>
            <For each={visibleKeys()}>{(key) => <PromotionEditor
              result={results().rows.find((row) => row.key === key)!}
              onChange={(allocations) => changeAllocation(key, allocations)}
              onAutoBackfill={() => backfill(key)}
              canAutoBackfill={backfillCandidates().get(key) != null}
              backfillError={backfillErrors()[key]}
            />}</For>
          </Show>
        </div>
      }>
        <div class="flex flex-col gap-3 text-sm">
          <p>Автозаполнение изменит исходные значения и распределение повышений. Проверьте изменения перед сохранением.</p>
          <Show when={baselineChanges().length > 0}>
            <p class="font-semibold">Значения при создании</p>
            <ul class="list-inside list-disc"><For each={baselineChanges()}>{(change) => <li>{change}</li>}</For></ul>
          </Show>
          <For each={results().rows.filter((row) => backfilledKeys().includes(row.key))}>{(row) => (
            <div>
              <p class="font-semibold">{promotionLabel(row)}</p>
              <For each={row.changes}>{(change) => <p class="text-xs">{change}</p>}</For>
              <Show when={row.error}><p class="text-xs text-error">{row.error}</p></Show>
            </div>
          )}</For>
        </div>
      </Show>
    </Modal>
  );
}
