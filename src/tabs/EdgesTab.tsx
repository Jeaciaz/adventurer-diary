import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { ATTRIBUTES, EDGES, EDGE_BY_ID, SKILL_BY_ID } from '../data';
import { edgeCap } from '../store/selectors';
import { Badge, Button, Card, Collapsible, Counter, Drawer, Input } from '../ui';
import type { Edge, EdgeCategory, EdgeRequirement, Rank } from '../types';

const CATEGORY_RU: Record<EdgeCategory, string> = {
  background: 'Предыстория',
  combat: 'Боевые',
  leadership: 'Лидерские',
  supernatural: 'Сверхъестественные',
  professional: 'Профессиональные',
  social: 'Социальные',
  mystic: 'Мистические',
  legendary: 'Легендарные',
  weird: 'Сверхъестественные',
  harrowed: 'Меченый (DL)',
  huckster: 'Картёжник (DL)',
  blessed: 'Благословенный (DL)',
  shaman: 'Шаман (DL)',
  'chi-master': 'Мастер ци (DL)',
  'mad-scientist': 'Безумный учёный (DL)',
};

const ATTRIBUTE_RU = new Map(ATTRIBUTES.map((a) => [a.id, a.ru]));
const REMOVED_SKILL_RU: Record<string, string> = {
  'akademicheskie-znaniia': 'Академические знания',
  'bezumnaia-nauka': 'Безумная наука',
  'voennoe-delo': 'Военное дело',
  vozhdenie: 'Вождение',
  nasmeshka: 'Насмешка',
  okkultizm: 'Оккультизм',
  'poisk-informatsii': 'Поиск информации',
  psionika: 'Псионика',
  khakerstvo: 'Хакерство',
  elektronika: 'Электроника',
  iazyk: 'Язык',
  vera: 'Вера',
  talant: 'Талант',
};

const RANK_RU: Record<Rank, string> = {
  novice: 'Новичок',
  seasoned: 'Закалённый',
  veteran: 'Ветеран',
  heroic: 'Герой',
  legendary: 'Легенда',
};

function reqLabel(r: EdgeRequirement): string {
  switch (r.type) {
    case 'rank':
      return RANK_RU[r.value];
    case 'attribute':
      return `${ATTRIBUTE_RU.get(r.attribute) ?? r.attribute} ${r.minDie}+`;
    case 'skill':
      return `${SKILL_BY_ID.get(r.skillId)?.ru ?? REMOVED_SKILL_RU[r.skillId] ?? r.skillId} ${r.minDie}+`;
    case 'edge':
      return `«${EDGE_BY_ID.get(r.edgeId)?.ru ?? r.edgeId}»`;
    case 'wildCard':
      return 'Дикая карта';
    case 'other':
      return r.description;
  }
}

export function EdgesTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [drawerEdge, setDrawerEdge] = createSignal<Edge | null>(null);

  const visibleEdges = createMemo(() => {
    const dlOn = state.settings.deadlandsEnabled;
    const q = search().toLowerCase().trim();
    return EDGES.filter((e) => (dlOn || e.source !== 'dl') && (!q || e.ru.toLowerCase().includes(q)));
  });

  const grouped = createMemo(() => {
    const byCat = new Map<EdgeCategory, Edge[]>();
    for (const e of visibleEdges()) {
      const taken = c().edges.some((x) => x.edgeId === e.id);
      if (taken) continue;
      const list = byCat.get(e.category) ?? [];
      list.push(e);
      byCat.set(e.category, list);
    }
    return [...byCat.entries()];
  });

  const selectedEdges = createMemo(() =>
    c()
      .edges.map((s) => EDGE_BY_ID.get(s.edgeId))
      .filter((e): e is Edge => !!e),
  );

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center gap-2">
        <Counter
          label="Черты"
          value={c().edges.length}
          cap={edgeCap()}
          warn={c().edges.length > edgeCap()}
        />
      </div>

      <Card>
        <div class="text-xs uppercase opacity-60">Выбранные</div>
        <Show
          when={selectedEdges().length > 0}
          fallback={<div class="mt-2 text-sm opacity-60">Ещё не выбраны.</div>}
        >
          <ul class="mt-2 flex flex-col gap-1">
            <For each={selectedEdges()}>
              {(e) => (
                <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                  <button
                    type="button"
                    class="flex flex-1 flex-col items-start gap-0.5 text-left"
                    onClick={() => setDrawerEdge(e)}
                  >
                    <div class="flex items-center gap-2 text-sm font-medium">
                      <span>{e.ru}</span>
                      <Show when={e.source === 'dl'}>
                        <Badge variant="info" outline>
                          DL
                        </Badge>
                      </Show>
                    </div>
                    <div class="text-xs opacity-60">{CATEGORY_RU[e.category]}</div>
                  </button>
                  <Button
                    size="xs"
                    variant="ghost"
                    square
                    aria-label="Удалить"
                    onClick={() => actions.removeEdge(e.id)}
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
        placeholder="Поиск по чертам…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <For each={grouped()}>
        {([cat, items]) => (
          <Collapsible title={`${CATEGORY_RU[cat]} (${items.length})`} defaultOpen={false}>
            <ul class="flex flex-col gap-1">
              <For each={items}>
                {(e) => (
                  <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                    <button
                      type="button"
                      class="flex flex-1 flex-col items-start gap-0.5 text-left"
                      onClick={() => setDrawerEdge(e)}
                    >
                      <div class="flex items-center gap-2 text-sm font-medium">
                        <span>{e.ru}</span>
                        <Show when={e.source === 'dl'}>
                          <Badge variant="info" outline>
                            DL
                          </Badge>
                        </Show>
                      </div>
                      <div class="flex flex-wrap gap-1">
                        <For each={e.requirements}>
                          {(r) => <Badge variant="ghost">{reqLabel(r)}</Badge>}
                        </For>
                      </div>
                    </button>
                    <Button
                      size="xs"
                      variant="ghost"
                      square
                      aria-label="Добавить"
                      onClick={() => actions.addEdge({ edgeId: e.id })}
                    >
                      <Plus size={14} />
                    </Button>
                  </li>
                )}
              </For>
            </ul>
          </Collapsible>
        )}
      </For>

      <Drawer
        open={drawerEdge() != null}
        onClose={() => setDrawerEdge(null)}
        title={drawerEdge()?.ru ?? ''}
      >
        <Show when={drawerEdge()}>
          {(e) => (
            <div class="flex flex-col gap-3">
              <div class="flex flex-wrap gap-1">
                <Badge variant="primary" outline>
                  {CATEGORY_RU[e().category]}
                </Badge>
                <Show when={e().source === 'dl'}>
                  <Badge variant="info" outline>
                    DL
                  </Badge>
                </Show>
                <For each={e().requirements}>
                  {(r) => <Badge variant="ghost">{reqLabel(r)}</Badge>}
                </For>
              </div>
              <p class="whitespace-pre-line text-sm leading-relaxed">{e().description}</p>
              <Show when={e().translationNote}>
                <p class="text-xs italic opacity-70">{e().translationNote}</p>
              </Show>
              <Show
                when={!c().edges.some((x) => x.edgeId === e().id)}
                fallback={
                  <Button
                    variant="error"
                    onClick={() => {
                      actions.removeEdge(e().id);
                      setDrawerEdge(null);
                    }}
                  >
                    Удалить
                  </Button>
                }
              >
                <Button
                  variant="primary"
                  onClick={() => {
                    actions.addEdge({ edgeId: e().id });
                    setDrawerEdge(null);
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
