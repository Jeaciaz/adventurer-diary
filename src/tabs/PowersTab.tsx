import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Clock, Crosshair, Pin, PinOff, Plus, Ruler, Trash2, Zap } from 'lucide-solid';
import { useStore } from '../store/store';
import { ARCANE_BACKGROUNDS, ARCANE_BACKGROUND_BY_ID, POWERS, POWER_BY_ID } from '../data';
import { rankFromAdvances } from '../store/selectors';
import {
  Badge,
  Button,
  Card,
  Drawer,
  NumberStepper,
  Select,
  Toggle,
} from '../ui';
import type { ArcaneBackground, Character, Power, Rank, SelectedPower } from '../types';

const RANK_RU: Record<Rank, string> = {
  novice: 'Новичок',
  seasoned: 'Закалённый',
  veteran: 'Ветеран',
  heroic: 'Герой',
  legendary: 'Легенда',
};

const RANK_ORDER: Rank[] = ['novice', 'seasoned', 'veteran', 'heroic', 'legendary'];
const ATTACK_POWER_STATS: Record<string, { damage: string; sort: number }> = {
  banish: { damage: 'инертность', sort: 0 },
  izgnanie: { damage: '1 ранение/подъём', sort: 0 },
  oglushenie: { damage: 'оглушение', sort: 0 },
  'ammo-whammy': { damage: '+1 кость урона', sort: 1 },
  sokrushenie: { damage: '+2/+4 урона', sort: 2 },
  'razrushitelnoe-pole': { damage: '2d4', sort: 5 },
  smerch: { damage: '2d4', sort: 5 },
  potok: { damage: '2d6', sort: 7 },
  strela: { damage: '2d6', sort: 7 },
  vzryv: { damage: '2d6', sort: 7 },
};

type SelectedPowerEntry = { sel: SelectedPower; power: Power };

function rankLeq(a: Rank, b: Rank): boolean {
  return RANK_ORDER.indexOf(a) <= RANK_ORDER.indexOf(b);
}

function isDamagePower(p: Power): boolean {
  return ATTACK_POWER_STATS[p.id] != null;
}

function attackPowerRank(p: Power): number {
  return ATTACK_POWER_STATS[p.id]?.sort ?? 0;
}

function attackPowerSort(a: Power, b: Power): number {
  return attackPowerRank(a) - attackPowerRank(b) || a.ru.localeCompare(b.ru, 'ru');
}

function selectedArcaneBackground(c: Character): ArcaneBackground | null {
  const id = c.arcaneBackgroundId;
  if (id == null) return null;
  return ARCANE_BACKGROUND_BY_ID.get(id) ?? null;
}

function arcaneBackgroundLabel(a: ArcaneBackground): string {
  return a.source === 'dl' ? `${a.ru} (DL)` : a.ru;
}

function arcaneBackgroundValue(c: Character): string {
  return c.arcaneBackgroundId ?? '';
}

function arcaneBackgroundFromSelect(value: string): string | null {
  return value === '' ? null : value;
}

function allowedPowersFor(a: ArcaneBackground | null): Set<string> | null {
  if (!a || a.allowedPowers.length === 0) return null;
  return new Set(a.allowedPowers);
}

function powerAvailable(p: Power, taken: Set<string>, deadlandsEnabled: boolean): boolean {
  return (deadlandsEnabled || p.source !== 'dl') && !taken.has(p.id);
}

function abFilterActive(c: Character, allowed: Set<string> | null): boolean {
  return c.abFilterEnabled && allowed != null;
}

function filterByArcaneBackground(powers: Power[], c: Character, allowed: Set<string> | null): Power[] {
  if (allowed == null || !c.abFilterEnabled) return powers;
  return powers.filter((p) => allowed.has(p.id));
}

function availablePowers(c: Character, deadlandsEnabled: boolean, allowed: Set<string> | null): Power[] {
  const taken = new Set(c.powers.map((p) => p.powerId));
  const powers = POWERS.filter((p) => powerAvailable(p, taken, deadlandsEnabled));
  return filterByArcaneBackground(powers, c, allowed);
}

function compareSelectedPowers(a: SelectedPowerEntry, b: SelectedPowerEntry): number {
  if (a.sel.pinned !== b.sel.pinned) return a.sel.pinned ? -1 : 1;
  return a.sel.order - b.sel.order;
}

function selectedPowerEntries(c: Character): SelectedPowerEntry[] {
  const entries = c.powers
    .map((sel) => ({ sel, power: POWER_BY_ID.get(sel.powerId) }))
    .filter((x): x is SelectedPowerEntry => !!x.power);
  entries.sort(compareSelectedPowers);
  return entries;
}

function arcaneBackgroundWarn(c: Character, allowed: Set<string> | null, powerId: string): boolean {
  return allowed != null && c.abFilterEnabled && !allowed.has(powerId);
}

function pinActionLabel(pinned: boolean): string {
  return pinned ? 'Открепить' : 'Закрепить';
}

function pinIcon(pinned: boolean): JSX.Element {
  return pinned ? <PinOff size={14} /> : <Pin size={14} />;
}

function hasPower(c: Character, powerId: string): boolean {
  return c.powers.some((x) => x.powerId === powerId);
}

export function PowersTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [drawerPower, setDrawerPower] = createSignal<Power | null>(null);

  const ab = createMemo(() => selectedArcaneBackground(c()));

  const charRank = createMemo(() => rankFromAdvances(c().advancesUsed).rank);

  const visibleAbs = createMemo(() => ARCANE_BACKGROUNDS);

  const allowedSet = createMemo(() => allowedPowersFor(ab()));

  const visiblePowers = createMemo(() => availablePowers(c(), state.settings.deadlandsEnabled, allowedSet()));

  const groupedPowers = createMemo(() => {
    const powers = visiblePowers();
    return [
      { title: 'Атакующие силы', items: powers.filter(isDamagePower).sort(attackPowerSort) },
      { title: 'Прочие силы', items: powers.filter((p) => !isDamagePower(p)) },
    ].filter((group) => group.items.length > 0);
  });

  const selectedSorted = createMemo(() => selectedPowerEntries(c()));

  return (
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-col gap-3">
          <Select
            label="Мистический дар"
            options={visibleAbs().map((a) => ({
              value: a.id,
              label: arcaneBackgroundLabel(a),
            }))}
            value={arcaneBackgroundValue(c())}
            onChange={(v) => actions.setArcaneBackground(arcaneBackgroundFromSelect(v))}
            placeholder="— нет —"
          />
          <NumberStepper
            label="Пункты силы"
            value={c().powerPoints}
            onChange={(v) => actions.setPowerPoints(v)}
            min={0}
          />
          <Show when={ab() && allowedSet()}>
            <Toggle
              checked={c().abFilterEnabled}
              onChange={(v) => actions.setAbFilterEnabled(v)}
              label="Фильтр по дару"
            />
          </Show>
        </div>
      </Card>

      <Card>
        <div class="text-xs uppercase opacity-60">Выбранные</div>
        <Show
          when={selectedSorted().length > 0}
          fallback={<div class="mt-2 text-sm opacity-60">Ещё не выбраны.</div>}
        >
          <ul class="mt-2 flex flex-col gap-1">
            <For each={selectedSorted()}>
              {({ sel, power }) => (
                <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                  <button
                    type="button"
                    class="flex flex-1 flex-col items-start gap-0.5 text-left"
                    onClick={() => setDrawerPower(power)}
                  >
                    <div class="flex items-center gap-2 text-sm font-medium">
                      <Show when={sel.pinned}>
                        <Pin size={12} class="text-primary" />
                      </Show>
                      <span>{power.ru}</span>
                      <PowerSourceTag power={power} />
                    </div>
                    <PowerSubtitle power={power} showRank />
                  </button>
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    aria-label={pinActionLabel(sel.pinned)}
                    onClick={() => actions.togglePinPower(power.id)}
                  >
                    {pinIcon(sel.pinned)}
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    aria-label="Удалить"
                    onClick={() => actions.removePower(power.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </Card>

      <Card>
        <div class="text-xs uppercase opacity-60">Доступные ({visiblePowers().length})</div>
        <div class="mt-2 flex flex-col gap-3">
          <For each={groupedPowers()}>
            {(group) => (
              <section>
                <div class="divider my-1 text-xs uppercase tracking-wide text-base-content/60">
                  {group.title} ({group.items.length})
                </div>
                <ul class="flex flex-col gap-1">
                  <For each={group.items}>
                    {(p) => {
                      const rankWarn = !rankLeq(p.rank, charRank());
                      const abWarn = arcaneBackgroundWarn(c(), allowedSet(), p.id);
                      return (
                        <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                          <button
                            type="button"
                            class="flex flex-1 flex-col items-start gap-0.5 text-left"
                            onClick={() => setDrawerPower(p)}
                          >
                            <div class="text-sm font-medium">
                              <span>{p.ru}</span>
                              <PowerSourceTag power={p} />
                            </div>
                            <PowerWarningTags power={p} rankWarn={rankWarn} abWarn={abWarn} />
                            <PowerSubtitle power={p} />
                          </button>
                          <Button
                            size="xs"
                            variant="ghost"
                            square
                            aria-label="Добавить"
                            onClick={() =>
                              actions.addPower({
                                powerId: p.id,
                                pinned: false,
                                order: c().powers.length,
                              })
                            }
                          >
                            <Plus size={14} />
                          </Button>
                        </li>
                      );
                    }}
                  </For>
                </ul>
              </section>
            )}
          </For>
        </div>
      </Card>

      <Drawer
        open={drawerPower() != null}
        onClose={() => setDrawerPower(null)}
        title={drawerPower()?.ru ?? ''}
      >
        <Show when={drawerPower()}>
          {(p) => (
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap gap-1">
                <Show when={p().source === 'dl'}>
                  <Badge variant="info" outline>
                    DL
                  </Badge>
                </Show>
              </div>
              <PowerStats power={p()} />
              <p class="text-sm text-base-content/80">{p().shortDescription}</p>
              <p class="whitespace-pre-line text-sm leading-relaxed">{p().fullDescription}</p>
              <Show when={p().translationNote}>
                <p class="text-xs italic opacity-70">{p().translationNote}</p>
              </Show>
              <Show
                when={!hasPower(c(), p().id)}
                fallback={
                  <Button
                    variant="error"
                    onClick={() => {
                      actions.removePower(p().id);
                      setDrawerPower(null);
                    }}
                  >
                    Удалить
                  </Button>
                }
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    actions.addPower({
                      powerId: p().id,
                      pinned: false,
                      order: c().powers.length,
                    });
                    setDrawerPower(null);
                  }}
                >
                  Добавить
                </Button>
              </Show>
            </div>
          )}
        </Show>
      </Drawer>
    </div>
  );
}

function PowerSourceTag(props: { power: Power }): JSX.Element {
  return (
    <Show when={props.power.source === 'dl'}>
      <span class="ml-2 inline-block align-middle">
        <Badge variant="info" outline>
          DL
        </Badge>
      </span>
    </Show>
  );
}

function PowerWarningTags(props: { power: Power; rankWarn?: boolean; abWarn?: boolean }): JSX.Element {
  return (
    <div class="flex flex-wrap gap-1">
      <Show when={props.rankWarn}>
        <Badge variant="error" outline>
          ранг {RANK_RU[props.power.rank]}
        </Badge>
      </Show>
      <Show when={props.abWarn}>
        <Badge variant="error" outline>
          вне дара
        </Badge>
      </Show>
    </div>
  );
}

function PowerSubtitle(props: { power: Power; showRank?: boolean }): JSX.Element {
  return (
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-base-content/60">
      <Show when={props.showRank}>
        <span>{RANK_RU[props.power.rank]}</span>
      </Show>
      <Show when={ATTACK_POWER_STATS[props.power.id]?.damage}>
        {(damage) => (
          <span class="inline-flex items-center gap-1">
            <Crosshair size={12} aria-hidden="true" />
            {damage()}
          </span>
        )}
      </Show>
      <span class="inline-flex items-center gap-1">
        <Zap size={12} aria-hidden="true" />
        {props.power.powerPoints}
      </span>
      <span class="inline-flex items-center gap-1">
        <Ruler size={12} aria-hidden="true" />
        {props.power.range}
      </span>
      <span class="inline-flex items-center gap-1">
        <Clock size={12} aria-hidden="true" />
        {props.power.duration}
      </span>
    </div>
  );
}

function PowerStats(props: { power: Power }): JSX.Element {
  return (
    <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-base-300 text-sm sm:grid-cols-4">
      <PowerStat label="Ранг" value={RANK_RU[props.power.rank]} />
      <PowerStat label="Пункты силы" value={props.power.powerPoints} icon={<Zap size={13} />} />
      <PowerStat label="Дистанция" value={props.power.range} icon={<Ruler size={13} />} />
      <PowerStat label="Длительность" value={props.power.duration} icon={<Clock size={13} />} />
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
