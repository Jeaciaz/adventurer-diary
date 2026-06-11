import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { HINDRANCES, HINDRANCE_BY_ID } from '../data';
import { hindrancePointsEarned } from '../store/selectors';
import { Badge, Button, Card, Counter, Drawer, Input, RadioGroup } from '../ui';
import type { Hindrance, HindranceSeverity } from '../types';

const SEVERITY_RU: Record<HindranceSeverity, string> = {
  minor: 'мелкий',
  major: 'крупный',
};

function defaultSeverity(h: Hindrance): HindranceSeverity | undefined {
  return h.severityOptions[0];
}

function matchesSearch(item: Pick<Hindrance, 'ru' | 'originalName'>, query: string): boolean {
  return query === '' || item.ru.toLowerCase().includes(query) || item.originalName?.toLowerCase().includes(query) === true;
}

function HindranceTitle(props: { hindrance: Hindrance }): JSX.Element {
  return (
    <div class="flex items-center gap-2 text-sm font-medium">
      <span>{props.hindrance.ru}</span>
      <Show when={props.hindrance.source === 'dl'}>
        <Badge variant="info" outline>
          DL
        </Badge>
      </Show>
    </div>
  );
}

function makeCustomHindranceId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `custom-hindrance-${Date.now()}`;
}

export function HindrancesTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [drawerHindrance, setDrawerHindrance] = createSignal<Hindrance | null>(null);
  const [customDrawerOpen, setCustomDrawerOpen] = createSignal(false);
  const [customName, setCustomName] = createSignal('');
  const [customSeverity, setCustomSeverity] = createSignal<HindranceSeverity>('minor');
  const [customDescription, setCustomDescription] = createSignal('');

  const addHindrance = (h: Hindrance): void => {
    const severity = defaultSeverity(h);
    if (severity == null) return;
    actions.addHindrance({ hindranceId: h.id, severity });
  };

  const addCustomHindrance = (): void => {
    const name = customName().trim();
    const description = customDescription().trim();
    if (name === '') return;
    actions.addCustomHindrance({ id: makeCustomHindranceId(), name, severity: customSeverity(), description });
    setCustomName('');
    setCustomSeverity('minor');
    setCustomDescription('');
    setCustomDrawerOpen(false);
  };

  const visible = createMemo(() => {
    const dlOn = state.settings.deadlandsEnabled;
    const q = search().toLowerCase().trim();
    return HINDRANCES.filter((h) => (dlOn || h.source !== 'dl') && matchesSearch(h, q));
  });

  const available = createMemo(() => {
    const taken = new Set(c().hindrances.map((h) => h.hindranceId));
    return visible().filter((h) => !taken.has(h.id));
  });

  const points = createMemo(() => hindrancePointsEarned(c(), HINDRANCE_BY_ID));

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Counter
          label="Очки изъянов"
          value={points().total}
          cap={4}
          warn={points().total > 4}
        />
        <Counter label="Мелкие" value={points().minor} />
        <Counter label="Крупные ×2" value={points().major} />
      </div>

      <Card>
        <div class="text-xs uppercase opacity-60">Выбранные</div>
        <Show
          when={c().hindrances.length + c().customHindrances.length > 0}
          fallback={<div class="mt-2 text-sm opacity-60">Ещё не выбраны.</div>}
        >
          <ul class="mt-2 flex flex-col gap-1">
            <For each={c().customHindrances}>
              {(h) => (
                <li class="flex items-start justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                  <div class="flex flex-1 flex-col items-start gap-1 text-left">
                    <div class="flex items-center gap-2 text-sm font-medium">
                      <span>{h.name}</span>
                      <Badge variant="ghost">свой</Badge>
                    </div>
                    <Show when={h.description}>
                      {(description) => (
                        <p class="whitespace-pre-line text-xs leading-snug text-base-content/70">
                          {description()}
                        </p>
                      )}
                    </Show>
                  </div>
                  <RadioGroup<HindranceSeverity>
                    size="xs"
                    options={[
                      { value: 'minor', label: SEVERITY_RU.minor },
                      { value: 'major', label: SEVERITY_RU.major },
                    ]}
                    value={h.severity}
                    onChange={(v) => actions.setCustomHindranceSeverity(h.id, v)}
                  />
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    aria-label="Удалить"
                    onClick={() => actions.removeCustomHindrance(h.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </li>
              )}
            </For>
            <For each={c().hindrances}>
              {(sel) => {
                const h = HINDRANCE_BY_ID.get(sel.hindranceId);
                if (!h) return null;
                return (
                  <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                    <button
                      type="button"
                      class="flex flex-1 flex-col items-start gap-1 text-left"
                      onClick={() => setDrawerHindrance(h)}
                    >
                      <HindranceTitle hindrance={h} />
                    </button>
                    <Show when={h.severityOptions.length > 1}>
                      <RadioGroup<HindranceSeverity>
                        size="xs"
                        options={h.severityOptions.map((s) => ({ value: s, label: SEVERITY_RU[s] }))}
                        value={sel.severity}
                        onChange={(v) => actions.setHindranceSeverity(h.id, v)}
                      />
                    </Show>
                    <Show when={h.severityOptions.length === 1}>
                      <Badge variant="ghost">{SEVERITY_RU[sel.severity]}</Badge>
                    </Show>
                    <Button
                      size="xs"
                      variant="ghost"
                      square
                      aria-label="Удалить"
                      onClick={() => actions.removeHindrance(h.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </li>
                );
              }}
            </For>
          </ul>
        </Show>
      </Card>

      <Input
        placeholder="Поиск по изъянам…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <Card>
        <div class="text-xs uppercase opacity-60">Доступные ({available().length})</div>
        <ul class="mt-2 flex flex-col gap-1">
          <For each={available()}>
            {(h) => (
              <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                <button
                  type="button"
                  class="flex flex-1 flex-col items-start gap-0.5 text-left"
                  onClick={() => setDrawerHindrance(h)}
                >
                  <HindranceTitle hindrance={h} />
                  <div class="text-xs opacity-60">
                    <For each={h.severityOptions}>
                      {(s, i) => (
                        <>
                          <Show when={i() > 0}> · </Show>
                          <span>{SEVERITY_RU[s]}</span>
                        </>
                      )}
                    </For>
                  </div>
                </button>
                <Button
                  size="xs"
                  variant="ghost"
                  square
                  aria-label="Добавить"
                  disabled={defaultSeverity(h) == null}
                  onClick={() => addHindrance(h)}
                >
                  <Plus size={14} />
                </Button>
              </li>
            )}
          </For>
        </ul>
      </Card>

      <Button
        size="md"
        variant="primary"
        square
        class="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg sm:bottom-6"
        aria-label="Добавить свой изъян"
        onClick={() => setCustomDrawerOpen(true)}
      >
        <Plus size={24} />
      </Button>

      <Drawer
        open={customDrawerOpen()}
        onClose={() => setCustomDrawerOpen(false)}
        title="Свой изъян"
      >
        <div class="flex flex-col gap-3">
          <Input
            label="Название"
            value={customName()}
            onInput={(e) => setCustomName(e.currentTarget.value)}
          />
          <label class="form-control w-full">
            <span class="label-text mb-1 block text-sm">Описание</span>
            <textarea
              class="textarea textarea-bordered min-h-28 w-full"
              value={customDescription()}
              onInput={(event) => setCustomDescription(event.currentTarget.value)}
            />
          </label>
          <div>
            <span class="label-text mb-1 block text-sm">Тяжесть</span>
            <RadioGroup<HindranceSeverity>
              size="xs"
              options={[
                { value: 'minor', label: SEVERITY_RU.minor },
                { value: 'major', label: SEVERITY_RU.major },
              ]}
              value={customSeverity()}
              onChange={setCustomSeverity}
            />
          </div>
          <Button
            variant="primary"
            disabled={customName().trim() === ''}
            onClick={addCustomHindrance}
          >
            Добавить
          </Button>
        </div>
      </Drawer>

      <Drawer
        open={drawerHindrance() != null}
        onClose={() => setDrawerHindrance(null)}
        title={drawerHindrance()?.ru ?? ''}
      >
        <Show when={drawerHindrance()}>
          {(h) => (
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap gap-1">
                <Show when={h().source === 'dl'}>
                  <Badge variant="info" outline>
                    DL
                  </Badge>
                </Show>
                <For each={h().severityOptions}>
                  {(s) => <Badge variant="ghost">{SEVERITY_RU[s]}</Badge>}
                </For>
              </div>
              <p class="whitespace-pre-line text-sm leading-relaxed">{h().description}</p>
              <Show when={h().translationNote}>
                <p class="text-xs italic opacity-70">{h().translationNote}</p>
              </Show>
              <Show
                when={!c().hindrances.some((x) => x.hindranceId === h().id)}
                fallback={
                  <Button
                    variant="error"
                    onClick={() => {
                      actions.removeHindrance(h().id);
                      setDrawerHindrance(null);
                    }}
                  >
                    Удалить
                  </Button>
                }
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    addHindrance(h());
                    setDrawerHindrance(null);
                  }}
                  disabled={defaultSeverity(h()) == null}
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
