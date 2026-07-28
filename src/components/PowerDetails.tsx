import { Clock, Crosshair, Ruler, Zap } from 'lucide-solid';
import { Show, type JSX } from 'solid-js';
import { Badge } from '../ui';
import type { CustomPower, Power, Rank } from '../types';

const RANK_RU: Record<Rank, string> = {
  novice: 'Новичок',
  seasoned: 'Закалённый',
  veteran: 'Ветеран',
  heroic: 'Герой',
  legendary: 'Легенда',
};

export function PowerDetails(props: { power: Power; actions?: JSX.Element }): JSX.Element {
  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-1">
        <Show when={props.power.source === 'dl'}>
          <Badge variant="info" outline>
            DL
          </Badge>
        </Show>
      </div>
      <PowerStats power={props.power} />
      <PowerDescriptions power={props.power} />
      <Show when={props.power.translationNote}>
        <p class="text-xs italic opacity-70">{props.power.translationNote}</p>
      </Show>
      {props.actions}
    </div>
  );
}

export function CustomPowerDetails(props: { power: CustomPower; actions?: JSX.Element }): JSX.Element {
  return (
    <div class="flex flex-col gap-3">
      <div>
        <Badge variant="primary" outline>
          своё
        </Badge>
      </div>
      <PowerStats power={props.power} />
      <PowerDescriptions power={props.power} />
      {props.actions}
    </div>
  );
}

function PowerDescriptions(props: {
  power: Pick<Power | CustomPower, 'shortDescription' | 'fullDescription'>;
}): JSX.Element {
  return (
    <>
      <Show when={props.power.shortDescription}>
        {(description) => <p class="text-sm text-base-content/80">{description()}</p>}
      </Show>
      <Show when={props.power.fullDescription}>
        {(description) => (
          <p class="whitespace-pre-line text-sm leading-relaxed">{description()}</p>
        )}
      </Show>
    </>
  );
}

function powerRank(power: Power | CustomPower): string | undefined {
  return 'rank' in power ? RANK_RU[power.rank] : undefined;
}

function PowerStats(props: { power: Power | CustomPower }): JSX.Element {
  const rank = (): string | undefined => powerRank(props.power);

  return (
    <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-base-300 text-sm sm:grid-cols-4">
      <Show when={rank()}>{(value) => <PowerStat label="Ранг" value={value()} />}</Show>
      <PowerStat label="Пункты силы" value={props.power.powerPoints} icon={<Zap size={13} />} />
      <PowerStat label="Дистанция" value={props.power.range} icon={<Ruler size={13} />} />
      <PowerStat label="Длительность" value={props.power.duration} icon={<Clock size={13} />} />
      <Show when={props.power.attackEffect}>
        {(effect) => <PowerStat label="Урон/эффект" value={effect()} icon={<Crosshair size={13} />} />}
      </Show>
    </dl>
  );
}

function PowerStat(props: { label: string; value: string; icon?: JSX.Element }): JSX.Element {
  return (
    <div class="border-base-300 px-2 py-1.5 [&:not(:last-child)]:border-r">
      <dt class="text-[10px] uppercase tracking-wide text-base-content/50">{props.label}</dt>
      <dd class="flex items-center gap-1 break-words font-medium leading-tight">
        {props.icon}
        <span>{props.value}</span>
      </dd>
    </div>
  );
}
