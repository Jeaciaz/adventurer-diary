import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Diamond } from 'lucide-solid';
import { useStore } from '../store/store';
import {
  edgeCap,
  edgeCount,
  rankFromAdvances,
} from '../store/selectors';
import { createCharacterPointTotalsMemo } from '../store/pointTotals';
import { creationRequirementWarnings, MAX_PROMOTIONS, veteranPromotions, type PromotionResult } from '../store/promotions';
import { PromotionsModal, promotionLabel } from '../components/PromotionsModal';
import { CreationLockIcon } from '../components/CreationLockIcon';
import { Badge, Button, Card, Counter, NumberStepper, RadioGroup, Toggle } from '../ui';
import type { Rank } from '../types';

const RANK_STEP: Record<Rank, number> = {
  novice: 0,
  seasoned: 1,
  veteran: 2,
  heroic: 3,
  legendary: 4,
};

const RANK_ICONS = [1, 2, 3, 4];

const woundOpts = [0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }));
const fatigueOpts = [0, 1, 2].map((n) => ({ value: n, label: String(n) }));

function promotionStatusLabel(status: PromotionResult['status']): string {
  switch (status) {
    case 'empty': return 'Не распределено';
    case 'invalid': return 'Не применяется';
    case 'inactive': return 'Неактивно';
    case 'applied': return 'Применено';
  }
}

export function StatusTab(): JSX.Element {
  const { state, actions, currentCharacter, promotionResults } = useStore();
  const c = currentCharacter;
  const [promotionsOpen, setPromotionsOpen] = createSignal(false);

  const totals = createCharacterPointTotalsMemo(() => state.character, () => state.settings.freeSkillPoints ?? 0);
  const rank = createMemo(() => rankFromAdvances(c().advancesUsed));
  const creationWarnings = createMemo(() => creationRequirementWarnings(state.character));
  const activeRows = createMemo(() => promotionResults().rows.filter((row) => row.active));

  return (
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex items-center gap-2">
          <Toggle label="Персонаж создан" checked={state.character.creationLocked} onChange={actions.setCreationLocked} />
          <CreationLockIcon />
        </div>
        <p class="mt-2 text-xs leading-relaxed opacity-70">
          {state.character.creationLocked
            ? 'Исходные параметры заблокированы. Развитие персонажа — через повышения. Снимите блокировку для исправления значений при создании.'
            : 'Редактируются значения при создании. Повышения сохраняются отдельно и пересчитываются после исправлений.'}
        </p>
        <Show when={totals().free < 0 || totals().hindrancePoints.total > 4 || creationWarnings().length > 0}>
          <div class="mt-2 text-xs text-warning" role="status">
            <Show when={totals().free < 0}>Превышен бюджет создания персонажа. </Show>
            <Show when={totals().hindrancePoints.total > 4}>Изъяны дают больше 4 очков. </Show>
            <Show when={creationWarnings().length > 0}>Проверьте требования выбранных черт. </Show>
            Блокировка всё равно доступна.
          </div>
        </Show>
      </Card>
      <Show when={state.character.promotions.legacyBaseline}>
        <Card>
          <p class="text-xs leading-relaxed text-warning">Старый персонаж: текущие значения сохранены как исходные, повышения пока пустые. Заполнение прошлых повышений добавит их эффекты к этим значениям. Чтобы восстановить развитие, сначала исправьте значения при создании.</p>
          <Button size="xs" variant="ghost" class="mt-2" onClick={actions.dismissLegacyWarning}>Понятно</Button>
        </Card>
      </Show>
      <Card>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="label-text mb-1 block text-sm">Раны</span>
            <RadioGroup<number>
              options={woundOpts}
              value={c().wounds}
              onChange={(v) => actions.setWounds(v)}
            />
          </div>
          <div>
            <span class="label-text mb-1 block text-sm">Усталость</span>
            <RadioGroup<number>
              options={fatigueOpts}
              value={c().fatigue}
              onChange={(v) => actions.setFatigue(v)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <div class="flex flex-wrap items-stretch gap-4">
          <div class="flex flex-1">
            <RankDisplay rank={rank().rank} label={rank().ru} />
          </div>
          <NumberStepper
            label="Получено повышений"
            value={state.character.advancesUsed}
            onChange={(v) => actions.setAdvances(v)}
            min={0}
            max={MAX_PROMOTIONS}
          />
        </div>
        <Show when={veteranPromotions(state.character) > 0}>
          <p class="mt-2 text-xs opacity-70">+4 при создании: «Ветеран Дикого Запада». Всего: {c().advancesUsed}. Эти четыре повышения не получают бонус.</p>
        </Show>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => setPromotionsOpen(true)}>Распределить повышения</Button>
        </div>
        <p class="mt-2 text-xs opacity-60">При уменьшении числа повышений их выбор сохраняется неактивным.</p>
      </Card>

      <Card>
        <div class="text-xs uppercase opacity-60">Очки при создании</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <Counter label="Свободные" value={totals().free} warn={totals().free < 0} />
          <Counter label="Параметры" value={totals().attrSpent} cap={5} />
          <Counter label="Навыки" value={totals().skillSpent} cap={totals().currentSkillCap} />
          <Counter label="Изъяны" value={totals().hindrancePoints.total} cap={4} warn={totals().hindrancePoints.total > 4} />
          <Counter label="Черты" value={edgeCount(state.character)} cap={edgeCap()} />
        </div>
        <p class="mt-3 text-xs leading-relaxed opacity-70">
          Очки изъянов покрывают перерасход параметров (×2), черт (×2) и навыков (×1). Повышения расходуются отдельно.
        </p>
      </Card>
      <Show when={activeRows().length > 0}>
        <Card>
          <div class="text-xs uppercase opacity-60">Повышения · применено {activeRows().filter((row) => row.status === 'applied').length}/{activeRows().length}</div>
          <div class="mt-2 flex flex-col gap-2">
            <For each={activeRows()}>{(row) => (
              <button type="button" class="rounded-lg border p-2 text-left text-xs"
                classList={{ 'border-error text-error': row.status === 'invalid', 'border-base-300': row.status !== 'invalid' }}
                onClick={() => setPromotionsOpen(true)}>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <span class="font-semibold">{promotionLabel(row)}</span>
                  <Badge variant={row.status === 'invalid' ? 'error' : 'ghost'}>{promotionStatusLabel(row.status)}</Badge>
                </div>
                <Show when={row.error}><p class="mt-1">{row.error}</p></Show>
                <For each={row.changes}>{(change) => <p class="mt-1">{change}</p>}</For>
                <For each={row.warnings}>{(warning) => <p class="mt-1 text-warning">{warning}</p>}</For>
              </button>
            )}</For>
          </div>
        </Card>
      </Show>
      <PromotionsModal open={promotionsOpen()} onClose={() => setPromotionsOpen(false)} />
    </div>
  );
}

function RankDisplay(props: { rank: Rank; label: string }): JSX.Element {
  const step = (): number => RANK_STEP[props.rank];
  return (
    <div class="inline-flex w-full flex-col items-center justify-center rounded-lg border border-base-300 bg-base-100 px-2 py-1">
      <div class="flex gap-0.5" aria-hidden="true">
        <For each={RANK_ICONS}>
          {(n) => (
            <Diamond
              size={13}
              class={n <= step() ? 'fill-primary text-primary' : 'text-base-content/25'}
            />
          )}
        </For>
      </div>
      <span class="mt-0.5 text-sm font-semibold leading-tight text-primary">{props.label}</span>
    </div>
  );
}
