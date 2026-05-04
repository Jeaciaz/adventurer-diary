import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Pin, PinOff, Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { ARCANE_BACKGROUNDS, ARCANE_BACKGROUND_BY_ID, POWERS, POWER_BY_ID } from '../data';
import { rankFromAdvances } from '../store/selectors';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  NumberStepper,
  Select,
  Toggle,
} from '../ui';
import type { Power, Rank } from '../types';

const RANK_RU: Record<Rank, string> = {
  novice: 'Новичок',
  seasoned: 'Закалённый',
  veteran: 'Ветеран',
  heroic: 'Герой',
  legendary: 'Легенда',
};

const RANK_ORDER: Rank[] = ['novice', 'seasoned', 'veteran', 'heroic', 'legendary'];

function rankLeq(a: Rank, b: Rank): boolean {
  return RANK_ORDER.indexOf(a) <= RANK_ORDER.indexOf(b);
}

export function PowersTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [drawerPower, setDrawerPower] = createSignal<Power | null>(null);

  const ab = createMemo(() =>
    c().arcaneBackgroundId ? ARCANE_BACKGROUND_BY_ID.get(c().arcaneBackgroundId!) ?? null : null,
  );

  const charRank = createMemo(() => rankFromAdvances(c().advancesUsed).rank);

  const visibleAbs = createMemo(() =>
    state.settings.deadlandsEnabled
      ? ARCANE_BACKGROUNDS.filter((a) => a.source === 'dl')
      : ARCANE_BACKGROUNDS.filter((a) => a.source !== 'dl'),
  );

  const allowedSet = createMemo(() => {
    const a = ab();
    if (!a || a.allowedPowers.length === 0) return null;
    return new Set(a.allowedPowers);
  });

  const visiblePowers = createMemo(() => {
    const q = search().toLowerCase().trim();
    const taken = new Set(c().powers.map((p) => p.powerId));
    let list = POWERS.filter(
      (p) =>
        (state.settings.deadlandsEnabled || p.source !== 'dl') &&
        !taken.has(p.id) &&
        (!q || p.ru.toLowerCase().includes(q)),
    );
    if (c().abFilterEnabled && allowedSet()) {
      list = list.filter((p) => allowedSet()!.has(p.id));
    }
    return list;
  });

  const selectedSorted = createMemo(() => {
    const enriched = c()
      .powers.map((sel) => ({ sel, power: POWER_BY_ID.get(sel.powerId) }))
      .filter((x): x is { sel: typeof x.sel; power: Power } => !!x.power);
    enriched.sort((a, b) => {
      if (a.sel.pinned !== b.sel.pinned) return a.sel.pinned ? -1 : 1;
      return a.sel.order - b.sel.order;
    });
    return enriched;
  });

  return (
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-col gap-3">
          <Select
            label="Мистический дар"
            options={visibleAbs().map((a) => ({
              value: a.id,
              label: `${a.ru}${a.source === 'dl' ? ' (DL)' : ''}`,
            }))}
            value={c().arcaneBackgroundId ?? ''}
            onChange={(v) => actions.setArcaneBackground(v === '' ? null : v)}
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
                      <Show when={power.source === 'dl'}>
                        <Badge variant="info" outline>
                          DL
                        </Badge>
                      </Show>
                    </div>
                    <div class="text-xs opacity-60">
                      {RANK_RU[power.rank]} · ПС {power.powerPoints} · {power.range} ·{' '}
                      {power.duration}
                    </div>
                  </button>
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    aria-label={sel.pinned ? 'Открепить' : 'Закрепить'}
                    onClick={() => actions.togglePinPower(power.id)}
                  >
                    {sel.pinned ? <PinOff size={14} /> : <Pin size={14} />}
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

      <Input
        placeholder="Поиск по силам…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <Card>
        <div class="text-xs uppercase opacity-60">Доступные ({visiblePowers().length})</div>
        <ul class="mt-2 flex flex-col gap-1">
          <For each={visiblePowers()}>
            {(p) => {
              const rankWarn = !rankLeq(p.rank, charRank());
              const abWarn =
                c().abFilterEnabled && allowedSet() != null && !allowedSet()!.has(p.id);
              return (
                <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                  <button
                    type="button"
                    class="flex flex-1 flex-col items-start gap-0.5 text-left"
                    onClick={() => setDrawerPower(p)}
                  >
                    <div class="flex items-center gap-2 text-sm font-medium">
                      <span>{p.ru}</span>
                      <Show when={p.source === 'dl'}>
                        <Badge variant="info" outline>
                          DL
                        </Badge>
                      </Show>
                      <Show when={rankWarn}>
                        <Badge variant="warning" outline>
                          ранг {RANK_RU[p.rank]}
                        </Badge>
                      </Show>
                      <Show when={abWarn}>
                        <Badge variant="warning" outline>
                          вне дара
                        </Badge>
                      </Show>
                    </div>
                    <div class="text-xs opacity-60">
                      ПС {p.powerPoints} · {p.range} · {p.duration}
                    </div>
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
                <Badge variant="primary" outline>
                  {RANK_RU[p().rank]}
                </Badge>
                <Show when={p().source === 'dl'}>
                  <Badge variant="info" outline>
                    DL
                  </Badge>
                </Show>
                <Badge variant="ghost">ПС {p().powerPoints}</Badge>
                <Badge variant="ghost">{p().range}</Badge>
                <Badge variant="ghost">{p().duration}</Badge>
              </div>
              <p class="text-sm text-base-content/80">{p().shortDescription}</p>
              <p class="whitespace-pre-line text-sm leading-relaxed">{p().fullDescription}</p>
              <Show when={p().translationNote}>
                <p class="text-xs italic opacity-70">{p().translationNote}</p>
              </Show>
              <Show
                when={!c().powers.some((x) => x.powerId === p().id)}
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
