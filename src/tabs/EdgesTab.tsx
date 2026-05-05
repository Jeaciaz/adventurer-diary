import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { ATTRIBUTES, BASE_SKILL_IDS, EDGES, EDGE_BY_ID, EQUIPMENT_OTHER_BY_ID, POWER_BY_ID, SKILL_BY_ID, WEAPON_BY_ID } from '../data';
import { dieIndex, edgeCap, rankFromAdvances } from '../store/selectors';
import { EquipmentDetails, otherItem, weaponItem, type AnyEquipmentItem } from '../components/EquipmentDetails';
import { PowerDetails } from '../components/PowerDetails';
import { Badge, Button, Card, Collapsible, Counter, Drawer, Input, RichText, type TextReference } from '../ui';
import type { Character, DieStepOrNone, Edge, EdgeCategory, EdgeRequirement, Power, Rank } from '../types';

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
  harrowed: 'Меченые (DL)',
  huckster: 'Картёжник (DL)',
  blessed: 'Благословенный (DL)',
  shaman: 'Шаман (DL)',
  'chi-master': 'Мастер ци (DL)',
  'mad-scientist': 'Безумный учёный (DL)',
};

function matchesSearch(item: Pick<Edge, 'ru' | 'originalName'>, query: string): boolean {
  return query === '' || item.ru.toLowerCase().includes(query) || item.originalName?.toLowerCase().includes(query) === true;
}

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

const RANK_ORDER: Rank[] = ['novice', 'seasoned', 'veteran', 'heroic', 'legendary'];

type ReferenceTarget =
  | { kind: 'edge'; item: Edge }
  | { kind: 'equipment'; item: AnyEquipmentItem }
  | { kind: 'power'; item: Power };

type ReferenceTargetSetter = (target: ReferenceTarget) => void;

function openEdgeReference(id: string, setTarget: ReferenceTargetSetter): void {
  const edge = EDGE_BY_ID.get(id);
  if (edge) setTarget({ kind: 'edge', item: edge });
}

function openPowerReference(id: string, setTarget: ReferenceTargetSetter): void {
  const power = POWER_BY_ID.get(id);
  if (power) setTarget({ kind: 'power', item: power });
}

function openEquipmentReference(id: string, setTarget: ReferenceTargetSetter): void {
  const weapon = WEAPON_BY_ID.get(id);
  if (weapon) {
    setTarget({ kind: 'equipment', item: weaponItem(weapon) });
    return;
  }

  const equipment = EQUIPMENT_OTHER_BY_ID.get(id);
  if (equipment) setTarget({ kind: 'equipment', item: otherItem(equipment) });
}

function skillRequirementName(skillId: string): string {
  return SKILL_BY_ID.get(skillId)?.ru ?? REMOVED_SKILL_RU[skillId] ?? skillId;
}

type RequirementLabeler = (requirement: EdgeRequirement) => string;
type RequirementChecker = (requirement: EdgeRequirement, character: Character) => boolean | null;

function rankReqLabel(r: EdgeRequirement): string {
  return r.type === 'rank' ? RANK_RU[r.value] : '';
}

function attributeReqLabel(r: EdgeRequirement): string {
  return r.type === 'attribute' ? `${ATTRIBUTE_RU.get(r.attribute) ?? r.attribute} ${r.minDie}+` : '';
}

function skillReqLabel(r: EdgeRequirement): string {
  return r.type === 'skill' ? `${skillRequirementName(r.skillId)} ${r.minDie}+` : '';
}

function edgeReqLabel(r: EdgeRequirement): string {
  return r.type === 'edge' ? `«${EDGE_BY_ID.get(r.edgeId)?.ru ?? r.edgeId}»` : '';
}

function otherReqLabel(r: EdgeRequirement): string {
  return r.type === 'other' ? r.description : '';
}

const REQUIREMENT_LABELERS = new Map<EdgeRequirement['type'], RequirementLabeler>([
  ['rank', rankReqLabel],
  ['attribute', attributeReqLabel],
  ['skill', skillReqLabel],
  ['edge', edgeReqLabel],
  ['wildCard', () => 'Дикая карта'],
  ['other', otherReqLabel],
]);

function reqLabel(r: EdgeRequirement): string {
  return REQUIREMENT_LABELERS.get(r.type)?.(r) ?? '';
}

function rankMeets(current: Rank, required: Rank): boolean {
  return RANK_ORDER.indexOf(current) >= RANK_ORDER.indexOf(required);
}

function builtinSkillDie(c: Character, skillId: string): DieStepOrNone {
  const die = c.skills[skillId];
  if (die != null) return die;
  if (BASE_SKILL_IDS.includes(skillId)) return 'd4';
  return null;
}

function customSkillDie(c: Character, skillId: string): DieStepOrNone {
  return c.customSkills.find((skill) => skill.id === skillId)?.die ?? null;
}

function skillDie(c: Character, skillId: string): DieStepOrNone {
  if (SKILL_BY_ID.has(skillId)) return builtinSkillDie(c, skillId);
  return customSkillDie(c, skillId);
}

function rankReqMet(r: EdgeRequirement, c: Character): boolean | null {
  return r.type === 'rank' ? rankMeets(rankFromAdvances(c.advancesUsed).rank, r.value) : null;
}

function attributeReqMet(r: EdgeRequirement, c: Character): boolean | null {
  return r.type === 'attribute'
    ? dieIndex(c.attributes[r.attribute]) >= dieIndex(r.minDie)
    : null;
}

function skillReqMet(r: EdgeRequirement, c: Character): boolean | null {
  return r.type === 'skill' ? dieIndex(skillDie(c, r.skillId)) >= dieIndex(r.minDie) : null;
}

function edgeReqMet(r: EdgeRequirement, c: Character): boolean | null {
  return r.type === 'edge' ? c.edges.some((edge) => edge.edgeId === r.edgeId) : null;
}

const REQUIREMENT_CHECKERS = new Map<EdgeRequirement['type'], RequirementChecker>([
  ['rank', rankReqMet],
  ['attribute', attributeReqMet],
  ['skill', skillReqMet],
  ['edge', edgeReqMet],
  ['wildCard', () => true],
  ['other', () => null],
]);

function reqMet(r: EdgeRequirement, c: Character): boolean | null {
  return REQUIREMENT_CHECKERS.get(r.type)?.(r, c) ?? null;
}

function RequirementBadge(props: { requirement: EdgeRequirement; character: Character }): JSX.Element {
  const met = (): boolean | null => reqMet(props.requirement, props.character);
  return (
    <Badge variant={met() === false ? 'error' : 'ghost'} outline={met() === false}>
      {reqLabel(props.requirement)}
    </Badge>
  );
}

export function EdgesTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [drawerEdge, setDrawerEdge] = createSignal<Edge | null>(null);
  const [referenceTarget, setReferenceTarget] = createSignal<ReferenceTarget | null>(null);

  const referenceOpeners: Record<TextReference['kind'], (id: string) => void> = {
    edge: (id) => openEdgeReference(id, setReferenceTarget),
    equipment: (id) => openEquipmentReference(id, setReferenceTarget),
    power: (id) => openPowerReference(id, setReferenceTarget),
  };

  const openReference = (reference: TextReference): void => {
    referenceOpeners[reference.kind](reference.id);
  };

  const visibleEdges = createMemo(() => {
    const dlOn = state.settings.deadlandsEnabled;
    const q = search().toLowerCase().trim();
    return EDGES.filter((e) => (dlOn || e.source !== 'dl') && matchesSearch(e, q));
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
                    <EdgeTitle edge={e} />
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
                      <EdgeTitle edge={e} />
                      <RequirementBadges requirements={e.requirements} character={c()} />
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
            <EdgeDetails
              edge={e()}
              character={c()}
              onReference={openReference}
              actions={
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
              }
            />
          )}
        </Show>
      </Drawer>
      <Drawer
        open={referenceTarget() != null}
        onClose={() => setReferenceTarget(null)}
        title={referenceTitle(referenceTarget())}
      >
        <Show when={referenceTarget()}>
          {(target) => <ReferenceDetails target={target()} />}
        </Show>
      </Drawer>
    </div>
  );
}

function referenceTitle(target: ReferenceTarget | null): string {
  if (target == null) return '';
  return target.item.ru;
}

function ReferenceDetails(props: { target: ReferenceTarget }): JSX.Element {
  if (props.target.kind === 'edge') {
    return (
      <EdgeDetails
        edge={props.target.item}
        character={null}
        onReference={() => undefined}
      />
    );
  }
  if (props.target.kind === 'power') return <PowerDetails power={props.target.item} />;
  return <EquipmentDetails item={props.target.item} />;
}

function EdgeDetails(props: {
  edge: Edge;
  character: Character | null;
  onReference: (reference: TextReference) => void;
  actions?: JSX.Element;
}): JSX.Element {
  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-1">
        <Badge variant="primary" outline>
          {CATEGORY_RU[props.edge.category]}
        </Badge>
        <Show when={props.edge.source === 'dl'}>
          <Badge variant="info" outline>
            DL
          </Badge>
        </Show>
        <Show when={props.character}>
          {(character) => (
            <RequirementBadges requirements={props.edge.requirements} character={character()} />
          )}
        </Show>
      </div>
      <div>
        <div class="mb-1 text-xs uppercase tracking-wide text-base-content/50">Кратко</div>
        <p class="whitespace-pre-line text-sm leading-relaxed">
          <RichText text={props.edge.description} onReference={props.onReference} />
        </p>
      </div>
      <div>
        <div class="mb-1 text-xs uppercase tracking-wide text-base-content/50">Полное описание</div>
        <p class="whitespace-pre-line text-sm leading-relaxed text-base-content/85">
          <RichText text={props.edge.fullDescription} onReference={props.onReference} />
        </p>
      </div>
      <Show when={props.edge.translationNote}>
        <p class="text-xs italic opacity-70">{props.edge.translationNote}</p>
      </Show>
      {props.actions}
    </div>
  );
}

function EdgeTitle(props: { edge: Edge }): JSX.Element {
  return (
    <div class="flex items-center gap-2 text-sm font-medium">
      <span>{props.edge.ru}</span>
      <Show when={props.edge.source === 'dl'}>
        <Badge variant="info" outline>
          DL
        </Badge>
      </Show>
    </div>
  );
}

function RequirementBadges(props: { requirements: EdgeRequirement[]; character: Character }): JSX.Element {
  return (
    <div class="flex flex-wrap gap-1">
      <For each={props.requirements}>
        {(r) => <RequirementBadge requirement={r} character={props.character} />}
      </For>
    </div>
  );
}
