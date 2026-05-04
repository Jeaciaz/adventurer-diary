import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import {
  ATTRIBUTES,
  BASE_SKILL_IDS,
  SKILL_BY_ID,
  SKILLS_BY_ATTRIBUTE,
} from '../data';
import {
  attrPointsSpent,
  computeFreePoints,
  dieIndex,
  hindrancePointsEarned,
  skillCap,
  skillPointCost,
  skillPointsSpent,
} from '../store/selectors';
import {
  Badge,
  Button,
  Card,
  Counter,
  Input,
  Modal,
  NumberStepper,
  RadioGroup,
  Select,
} from '../ui';
import { HINDRANCE_BY_ID } from '../data';
import type {
  AttributeId,
  CustomSkill,
  DieStep,
  DieStepOrNone,
} from '../types';
import { DIE_STEPS } from '../types';

const DIE_OPTIONS = DIE_STEPS.map((d) => ({ value: d, label: d }));
const SKILL_DIE_OPTIONS: { value: DieStepOrNone; label: string }[] = [
  { value: null as DieStepOrNone, label: '—' },
  ...DIE_STEPS.map((d) => ({ value: d as DieStepOrNone, label: d })),
];
const BASE_SKILL_DIE_OPTIONS = SKILL_DIE_OPTIONS.map((opt) => ({
  ...opt,
  disabled: opt.value == null,
}));

export function StatsSkillsTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;

  const linkedAttrFor = (skillId: string): AttributeId | undefined => {
    const builtin = SKILL_BY_ID.get(skillId);
    if (builtin) return builtin.linkedAttribute;
    return c().customSkills.find((cs) => cs.id === skillId)?.linkedAttribute;
  };

  const skillSpent = createMemo(() => skillPointsSpent(c(), BASE_SKILL_IDS, linkedAttrFor));
  const attrSpent = createMemo(() => attrPointsSpent(c()));
  const currentSkillCap = createMemo(() => skillCap(c(), state.settings.freeSkillPoints ?? 0));
  const hindrancePoints = createMemo(() => hindrancePointsEarned(c(), HINDRANCE_BY_ID));
  const free = createMemo(() =>
    computeFreePoints({
      c: c(),
      hindrancePoints: hindrancePoints(),
      skillSpent: skillSpent(),
      attrSpent: attrSpent(),
      freeSkillPoints: state.settings.freeSkillPoints ?? 0,
    }),
  );

  return (
    <div class="flex flex-col gap-4">
      <DerivedStatsSection />

      <div class="flex flex-wrap gap-2">
        <Counter
          label="Параметры"
          value={attrSpent()}
          cap={5}
          warn={attrSpent() > 5 && free() < 0}
        />
        <Counter
          label="Навыки"
          value={skillSpent()}
          cap={currentSkillCap()}
          warn={skillSpent() > currentSkillCap() && free() < 0}
        />
        <Counter label="Свободные" value={free()} warn={free() < 0} />
      </div>

      <For each={ATTRIBUTES}>
        {(attr) => (
          <Card>
            <div class="flex items-center justify-between gap-2">
              <span class="text-base font-semibold">{attr.ru}</span>
              <RadioGroup<DieStep>
                size="sm"
                options={DIE_OPTIONS}
                value={c().attributes[attr.id]}
                onChange={(v) => actions.setAttribute(attr.id, v)}
                ariaLabel={attr.ru}
              />
            </div>
            <div class="mt-3 flex flex-col gap-2">
              <For each={SKILLS_BY_ATTRIBUTE.get(attr.id) ?? []}>
                {(skill) => {
                  const die = (): DieStepOrNone => c().skills[skill.id] ?? (skill.isBase ? 'd4' : null);
                  const overAttr = (): boolean => {
                    const s = die();
                    if (s == null) return false;
                    return dieIndex(s) > dieIndex(c().attributes[attr.id]);
                  };
                  return (
                    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-base-300/50 bg-base-100 px-2 py-1">
                      <div class="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                        <span class="min-w-0 whitespace-normal break-words leading-tight">{skill.ru}</span>
                        <Show when={overAttr()}>
                          <Badge variant="warning">×2</Badge>
                        </Show>
                      </div>
                      <RadioGroup<DieStepOrNone>
                        size="xs"
                        options={skill.isBase ? BASE_SKILL_DIE_OPTIONS : SKILL_DIE_OPTIONS}
                        value={die()}
                        onChange={(v) => actions.setSkill(skill.id, v)}
                        ariaLabel={skill.ru}
                      />
                    </div>
                  );
                }}
              </For>
              <For each={c().customSkills.filter((cs) => cs.linkedAttribute === attr.id)}>
                {(cs) => {
                  const die = (): DieStepOrNone => cs.die;
                  const overAttr = (): boolean => {
                    if (die() == null) return false;
                    return dieIndex(die()) > dieIndex(c().attributes[attr.id]);
                  };
                  return (
                    <div class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1">
                      <div class="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                        <span class="min-w-0 whitespace-normal break-words leading-tight">{cs.name}</span>
                        <Badge variant="primary" outline>
                          польз.
                        </Badge>
                        <Show when={overAttr()}>
                          <Badge variant="warning">×2</Badge>
                        </Show>
                      </div>
                      <div class="flex items-center gap-1">
                        <RadioGroup<DieStepOrNone>
                          size="xs"
                          options={SKILL_DIE_OPTIONS}
                          value={die()}
                          onChange={(v) => actions.updateCustomSkill(cs.id, { die: v })}
                          ariaLabel={cs.name}
                        />
                        <Button
                          size="xs"
                          variant="ghost"
                          square
                          aria-label="Удалить навык"
                          onClick={() => actions.removeCustomSkill(cs.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  );
                }}
              </For>
              <AddCustomSkillButton attrId={attr.id} attrRu={attr.ru} />
            </div>
          </Card>
        )}
      </For>
    </div>
  );
}

function AddCustomSkillButton(props: { attrId: AttributeId; attrRu: string }): JSX.Element {
  const { actions } = useStore();
  const [open, setOpen] = createSignal(false);
  const [name, setName] = createSignal('');
  const [die, setDie] = createSignal<DieStepOrNone>('d4');

  const submit = (): void => {
    const trimmed = name().trim();
    if (!trimmed) return;
    actions.addCustomSkill({
      id: `custom-${crypto.randomUUID()}`,
      name: trimmed,
      linkedAttribute: props.attrId,
      die: die(),
    });
    setName('');
    setDie('d4');
    setOpen(false);
  };

  return (
    <>
      <Button size="xs" variant="ghost" class="self-start" onClick={() => setOpen(true)}>
        <Plus size={14} /> Добавить навык
      </Button>
      <Modal
        open={open()}
        onClose={() => setOpen(false)}
        title={`Новый навык — ${props.attrRu}`}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button size="sm" variant="primary" onClick={submit}>
              Добавить
            </Button>
          </>
        }
      >
        <div class="flex flex-col gap-3">
          <Input
            label="Название"
            value={name()}
            onInput={(e) => setName(e.currentTarget.value)}
            placeholder="Например: Кулинария"
          />
          <div>
            <span class="label-text mb-1 block text-sm">Стартовый уровень</span>
            <RadioGroup<DieStepOrNone>
              options={SKILL_DIE_OPTIONS}
              value={die()}
              onChange={(v) => setDie(v)}
            />
          </div>
        </div>
      </Modal>
    </>
  );
}

function DerivedStatsSection(): JSX.Element {
  const { state, actions } = useStore();
  const ds = (): typeof state.character.derivedStats => state.character.derivedStats;
  return (
    <Card class="flex flex-wrap items-end gap-3">
      <div class="basis-full text-xs uppercase tracking-wide opacity-60">Показатели</div>
      <NumberStepper
        label="Шаг"
        value={ds().pace}
        onChange={(v) => actions.setDerived('pace', v)}
        min={0}
      />
      <NumberStepper
        label="Защита"
        value={ds().parry}
        onChange={(v) => actions.setDerived('parry', v)}
        min={0}
      />
      <NumberStepper
        label="Стойкость"
        value={ds().toughness}
        onChange={(v) => actions.setDerived('toughness', v)}
        min={0}
      />
    </Card>
  );
}

void Select; // keep import for future filter use
