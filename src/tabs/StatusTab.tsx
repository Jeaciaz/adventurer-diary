import { createMemo, type JSX } from 'solid-js';
import { For } from 'solid-js';
import { Diamond } from 'lucide-solid';
import { useStore } from '../store/store';
import {
  edgeCap,
  rankFromAdvances,
} from '../store/selectors';
import { createCharacterPointTotalsMemo } from '../store/pointTotals';
import { Card, Counter, NumberStepper, RadioGroup } from '../ui';
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

export function StatusTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;

  const totals = createCharacterPointTotalsMemo(c, () => state.settings.freeSkillPoints ?? 0);
  const rank = createMemo(() => rankFromAdvances(c().advancesUsed));

  return (
    <div class="flex flex-col gap-4">
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
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex-1">
            <RankDisplay rank={rank().rank} label={rank().ru} />
          </div>
          <NumberStepper
            label="Использовано повышений"
            value={c().advancesUsed}
            onChange={(v) => actions.setAdvances(v)}
            min={0}
          />
        </div>
      </Card>

      <Card>
        <div class="text-xs uppercase opacity-60">Очки персонажа</div>
        <div class="mt-2 flex flex-wrap gap-2">
          <Counter label="Свободные" value={totals().free} warn={totals().free < 0} />
          <Counter label="Параметры" value={totals().attrSpent} cap={5} />
          <Counter label="Навыки" value={totals().skillSpent} cap={totals().currentSkillCap} />
          <Counter label="Изъяны" value={totals().hindrancePoints.total} cap={4} warn={totals().hindrancePoints.total > 4} />
          <Counter label="Черты" value={c().edges.length} cap={edgeCap()} />
        </div>
        <p class="mt-3 text-xs leading-relaxed opacity-70">
          Свободные очки = повышения × 2 + мелкие изъяны + крупные изъяны × 2 − перерасход параметров (×2) −
          перерасход черт (×2) − перерасход навыков (×1).
        </p>
      </Card>
    </div>
  );
}

function RankDisplay(props: { rank: Rank; label: string }): JSX.Element {
  const step = (): number => RANK_STEP[props.rank];
  return (
    <div class="inline-flex w-full flex-col items-center rounded-lg border border-base-300 bg-base-100 px-2 py-1">
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
