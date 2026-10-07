import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import {
  Clock,
  Crosshair,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Ruler,
  Trash2,
  WandSparkles,
  Zap,
} from 'lucide-solid';
import { useStore } from '../store/store';
import { ARCANE_BACKGROUNDS, ARCANE_BACKGROUND_BY_ID, POWERS, POWER_BY_ID } from '../data';
import { rankFromAdvances } from '../store/selectors';
import { CustomPowerDetails, PowerDetails } from '../components/PowerDetails';
import { PowerIcon } from '../components/PowerIcon';
import {
  Badge,
  Button,
  Card,
  Drawer,
  Input,
  NumberStepper,
  Select,
  Toggle,
  pushToast,
} from '../ui';
import type { ArcaneBackground, Character, CustomPower, Power, Rank } from '../types';

const RANK_RU: Record<Rank, string> = {
  novice: 'Новичок',
  seasoned: 'Закалённый',
  veteran: 'Ветеран',
  heroic: 'Герой',
  legendary: 'Легенда',
};

const RANK_ORDER: Rank[] = ['novice', 'seasoned', 'veteran', 'heroic', 'legendary'];
const NEW_POWERS_EDGE_ID = 'novye-sily';
const ATTACK_POWER_SORT: Record<string, number> = {
  banish: 0,
  izgnanie: 0,
  oglushenie: 0,
  'ammo-whammy': 1,
  sokrushenie: 2,
  'razrushitelnoe-pole': 5,
  smerch: 5,
  potok: 7,
  strela: 7,
  vzryv: 7,
};

type LearnedPowerEntry =
  | { kind: 'official'; id: string; power: Power }
  | { kind: 'custom'; id: string; power: CustomPower };

type PowerDrawerTarget =
  | { kind: 'official'; id: string }
  | { kind: 'custom'; id: string };

interface CustomPowerDraft {
  name: string;
  powerPoints: string;
  range: string;
  duration: string;
  attackEffect: string;
  shortDescription: string;
  fullDescription: string;
}

const EMPTY_CUSTOM_POWER_DRAFT: CustomPowerDraft = {
  name: '',
  powerPoints: '',
  range: '',
  duration: '',
  attackEffect: '',
  shortDescription: '',
  fullDescription: '',
};

function rankLeq(a: Rank, b: Rank): boolean {
  return RANK_ORDER.indexOf(a) <= RANK_ORDER.indexOf(b);
}

function isAttackPower(power: Power): boolean {
  return power.attackEffect != null && power.attackEffect !== '';
}

function attackPowerSort(a: Power, b: Power): number {
  return (ATTACK_POWER_SORT[a.id] ?? 0) - (ATTACK_POWER_SORT[b.id] ?? 0)
    || a.ru.localeCompare(b.ru, 'ru');
}

function selectedArcaneBackground(character: Character): ArcaneBackground | null {
  const id = character.arcaneBackgroundId;
  if (id == null) return null;
  return ARCANE_BACKGROUND_BY_ID.get(id) ?? null;
}

function arcaneBackgroundLabel(background: ArcaneBackground): string {
  return background.source === 'dl' ? `${background.ru} (DL)` : background.ru;
}

function arcaneBackgroundValue(character: Character): string {
  return character.arcaneBackgroundId ?? '';
}

function arcaneBackgroundFromSelect(value: string): string | null {
  return value === '' ? null : value;
}

function allowedPowersFor(background: ArcaneBackground | null): Set<string> | null {
  if (!background || background.allowedPowers.length === 0) return null;
  return new Set(background.allowedPowers);
}

function powerAvailable(power: Power, taken: Set<string>, deadlandsEnabled: boolean): boolean {
  return (deadlandsEnabled || power.source !== 'dl') && !taken.has(power.id);
}

function filterByArcaneBackground(
  powers: Power[],
  character: Character,
  allowed: Set<string> | null,
): Power[] {
  if (allowed == null || !character.abFilterEnabled) return powers;
  return powers.filter((power) => allowed.has(power.id));
}

function availablePowers(
  character: Character,
  deadlandsEnabled: boolean,
  allowed: Set<string> | null,
): Power[] {
  const taken = new Set(character.powers.map((power) => power.powerId));
  const powers = POWERS.filter((power) => powerAvailable(power, taken, deadlandsEnabled));
  return filterByArcaneBackground(powers, character, allowed);
}

function arcaneBackgroundWarn(
  character: Character,
  allowed: Set<string> | null,
  powerId: string,
): boolean {
  return allowed != null && character.abFilterEnabled && !allowed.has(powerId);
}

function hasPower(character: Character, powerId: string): boolean {
  return character.powers.some((power) => power.powerId === powerId);
}

function isPinnedPower(character: Character, powerId: string): boolean {
  return character.pinnedPowerIds.includes(powerId);
}

function learnedPowerEntries(character: Character): LearnedPowerEntry[] {
  const official: LearnedPowerEntry[] = character.powers
    .map((selected) => {
      const power = POWER_BY_ID.get(selected.powerId);
      return power == null
        ? null
        : { kind: 'official' as const, id: power.id, power };
    })
    .filter((entry): entry is Extract<LearnedPowerEntry, { kind: 'official' }> => entry != null);

  const custom: LearnedPowerEntry[] = character.customPowers.map((power) => ({
    kind: 'custom',
    id: power.id,
    power,
  }));

  return [...official, ...custom].sort((a, b) => compareLearnedPowers(a, b, character));
}

function learnedPowerGroup(entry: LearnedPowerEntry, character: Character): number {
  const pinnedOffset = isPinnedPower(character, entry.id) ? 0 : 2;
  const customOffset = entry.kind === 'custom' ? 1 : 0;
  return pinnedOffset + customOffset;
}

function learnedPowerName(entry: LearnedPowerEntry): string {
  return entry.kind === 'official' ? entry.power.ru : entry.power.name;
}

function compareLearnedPowers(
  a: LearnedPowerEntry,
  b: LearnedPowerEntry,
  character: Character,
): number {
  return learnedPowerGroup(a, character) - learnedPowerGroup(b, character)
    || learnedPowerName(a).localeCompare(learnedPowerName(b), 'ru');
}

function newPowersEdgeCount(character: Character): number {
  const edge = character.edges.find((item) => item.edgeId === NEW_POWERS_EDGE_ID);
  if (edge == null) return 0;
  return Math.max(1, edge.count ?? 1);
}

function availablePowerSlots(character: Character, background: ArcaneBackground | null): number {
  return (background?.startingPowers ?? 0) + newPowersEdgeCount(character) * 2;
}

function makeCustomPowerId(): string {
  const suffix = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
  return `custom-power-${suffix}`;
}

function customPowerDraft(power?: CustomPower): CustomPowerDraft {
  if (power == null) return { ...EMPTY_CUSTOM_POWER_DRAFT };
  const {
    attackEffect = '',
    shortDescription = '',
    fullDescription = '',
  } = power;
  return {
    name: power.name,
    powerPoints: power.powerPoints,
    range: power.range,
    duration: power.duration,
    attackEffect,
    shortDescription,
    fullDescription,
  };
}

function powerDrawerTitle(official: Power | null, custom: CustomPower | null): string {
  if (official != null) return official.ru;
  if (custom != null) return custom.name;
  return '';
}

function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

function customPowerFromDraft(id: string, draft: CustomPowerDraft): CustomPower {
  return {
    id,
    name: draft.name.trim(),
    powerPoints: draft.powerPoints.trim(),
    range: draft.range.trim(),
    duration: draft.duration.trim(),
    attackEffect: optionalText(draft.attackEffect),
    shortDescription: optionalText(draft.shortDescription),
    fullDescription: optionalText(draft.fullDescription),
  };
}

function serializeDraft(draft: CustomPowerDraft): string {
  return JSON.stringify(draft);
}

export function PowersTab(): JSX.Element {
  const { state, actions, currentCharacter } = useStore();
  const character = currentCharacter;
  const [drawerTarget, setDrawerTarget] = createSignal<PowerDrawerTarget | null>(null);
  const [editorOpen, setEditorOpen] = createSignal(false);
  const [editingCustomPowerId, setEditingCustomPowerId] = createSignal<string | null>(null);
  const [draft, setDraft] = createSignal<CustomPowerDraft>({ ...EMPTY_CUSTOM_POWER_DRAFT });
  const [savedDraft, setSavedDraft] = createSignal(serializeDraft(EMPTY_CUSTOM_POWER_DRAFT));

  const background = createMemo(() => selectedArcaneBackground(character()));
  const characterRank = createMemo(() => rankFromAdvances(character().advancesUsed).rank);
  const allowedSet = createMemo(() => allowedPowersFor(background()));
  const visiblePowers = createMemo(() =>
    availablePowers(character(), state.settings.deadlandsEnabled, allowedSet()),
  );
  const groupedPowers = createMemo(() => {
    const powers = visiblePowers();
    return [
      { title: 'Атакующие силы', items: powers.filter(isAttackPower).sort(attackPowerSort) },
      { title: 'Прочие силы', items: powers.filter((power) => !isAttackPower(power)) },
    ].filter((group) => group.items.length > 0);
  });
  const learnedPowers = createMemo(() => learnedPowerEntries(character()));
  const officialPowerCount = createMemo(() =>
    learnedPowers().filter((entry) => entry.kind === 'official').length,
  );
  const powerSlots = createMemo(() => availablePowerSlots(character(), background()));
  const drawerOfficialPower = createMemo(() => {
    const target = drawerTarget();
    return target?.kind === 'official' ? POWER_BY_ID.get(target.id) ?? null : null;
  });
  const drawerCustomPower = createMemo(() => {
    const target = drawerTarget();
    return target?.kind === 'custom'
      ? character().customPowers.find((power) => power.id === target.id) ?? null
      : null;
  });
  const drawerTitle = createMemo(() =>
    powerDrawerTitle(drawerOfficialPower(), drawerCustomPower()),
  );
  const draftValid = createMemo(() => {
    const value = draft();
    return value.name.trim() !== ''
      && value.powerPoints.trim() !== ''
      && value.range.trim() !== ''
      && value.duration.trim() !== '';
  });
  const draftDirty = createMemo(() => serializeDraft(draft()) !== savedDraft());

  const openCreateEditor = (): void => {
    const nextDraft = customPowerDraft();
    setEditingCustomPowerId(null);
    setDraft(nextDraft);
    setSavedDraft(serializeDraft(nextDraft));
    setEditorOpen(true);
  };

  const openEditEditor = (power: CustomPower): void => {
    const nextDraft = customPowerDraft(power);
    setDrawerTarget(null);
    setEditingCustomPowerId(power.id);
    setDraft(nextDraft);
    setSavedDraft(serializeDraft(nextDraft));
    setEditorOpen(true);
  };

  const canCloseEditor = (): boolean =>
    !draftDirty() || confirm('Закрыть редактор? Несохранённые изменения будут потеряны.');

  const saveCustomPower = (): void => {
    if (!draftValid()) return;
    const existingId = editingCustomPowerId();
    const id = existingId ?? makeCustomPowerId();
    const power = customPowerFromDraft(id, draft());
    if (existingId == null) {
      actions.addCustomPower(power);
      pushToast(`Создано: ${power.name}`, 'success');
    } else {
      actions.updateCustomPower(existingId, power);
      pushToast(`Обновлено: ${power.name}`, 'success');
    }
    setSavedDraft(serializeDraft(draft()));
    setEditorOpen(false);
  };

  const deleteCustomPower = (power: CustomPower): void => {
    if (!confirm(`Удалить силу «${power.name}» безвозвратно?`)) return;
    actions.removeCustomPower(power.id);
    if (drawerTarget()?.id === power.id) setDrawerTarget(null);
    pushToast(`Удалено: ${power.name}`, 'success');
  };

  return (
    <div class="flex flex-col gap-4">
      <Card>
        <div class="flex flex-col gap-3">
          <Select
            label="Мистический дар"
            options={ARCANE_BACKGROUNDS.map((item) => ({
              value: item.id,
              label: arcaneBackgroundLabel(item),
            }))}
            value={arcaneBackgroundValue(character())}
            onChange={(value) => actions.setArcaneBackground(arcaneBackgroundFromSelect(value))}
            placeholder="— нет —"
          />
          <NumberStepper
            label="Пункты силы"
            value={character().powerPoints}
            onChange={(value) => actions.setPowerPoints(value)}
            min={0}
          />
          <Show when={background() && allowedSet()}>
            <Toggle
              checked={character().abFilterEnabled}
              onChange={(value) => actions.setAbFilterEnabled(value)}
              label="Фильтр по дару"
            />
          </Show>
        </div>
      </Card>

      <Card>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs uppercase opacity-60">
            Изученные силы ({learnedPowers().length})
          </div>
          <Badge variant="neutral" outline>
            По дару: {officialPowerCount()}/{powerSlots()}
          </Badge>
        </div>
        <Show when={officialPowerCount() > powerSlots()}>
          <p class="mt-2 text-xs text-warning">Выбрано больше сил, чем доступно. Проверьте повышения и мистический дар.</p>
        </Show>
        <Show
          when={learnedPowers().length > 0}
          fallback={<div class="mt-2 text-sm opacity-60">Ещё не изучены.</div>}
        >
          <ul class="mt-2 flex flex-col gap-1">
            <For each={learnedPowers()}>
              {(entry) => (
                <LearnedPowerRow
                  entry={entry}
                  pinned={isPinnedPower(character(), entry.id)}
                  onOpen={() => setDrawerTarget({ kind: entry.kind, id: entry.id })}
                  onTogglePinned={() => actions.togglePinnedPower(entry.id)}
                  onRemove={() => {
                    if (entry.kind === 'official') actions.removePower(entry.id);
                    else deleteCustomPower(entry.power);
                  }}
                />
              )}
            </For>
          </ul>
        </Show>
      </Card>

      <Card>
        <div class="text-xs uppercase opacity-60">Доступные силы ({visiblePowers().length})</div>
        <div class="mt-2 flex flex-col gap-3">
          <For each={groupedPowers()}>
            {(group) => (
              <section>
                <div class="divider my-1 text-xs uppercase tracking-wide text-base-content/60">
                  {group.title} ({group.items.length})
                </div>
                <ul class="flex flex-col gap-1">
                  <For each={group.items}>
                    {(power) => {
                      const rankWarn = !rankLeq(power.rank, characterRank());
                      const backgroundWarn = arcaneBackgroundWarn(character(), allowedSet(), power.id);
                      return (
                        <li class="flex items-start justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                          <button
                            type="button"
                            class="flex flex-1 flex-col items-start gap-0.5 text-left"
                            onClick={() => setDrawerTarget({ kind: 'official', id: power.id })}
                          >
                            <div class="text-sm font-medium">
                              <span>{power.ru}</span>
                              <PowerSourceTag power={power} />
                            </div>
                            <PowerWarningTags
                              power={power}
                              rankWarn={rankWarn}
                              abWarn={backgroundWarn}
                            />
                            <PowerSubtitle power={power} />
                          </button>
                          <Button
                            size="xs"
                            variant="ghost"
                            square
                            aria-label="Изучить"
                            disabled={state.character.creationLocked && officialPowerCount() >= powerSlots()}
                            onClick={() => actions.addPower({ powerId: power.id })}
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

      <Button
        size="md"
        variant="primary"
        square
        class="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg sm:bottom-6"
        aria-label="Создать свою силу"
        onClick={openCreateEditor}
      >
        <Plus size={24} />
      </Button>

      <Drawer
        open={drawerTarget() != null}
        onClose={() => setDrawerTarget(null)}
        title={drawerTitle()}
        decoration={
          <Show
            when={drawerOfficialPower()}
            fallback={<WandSparkles class="h-40 w-40 sm:h-48 sm:w-48" />}
          >
            {(power) => <PowerIcon id={power().id} class="h-40 w-40 sm:h-48 sm:w-48" />}
          </Show>
        }
      >
        <Show when={drawerOfficialPower()}>
          {(power) => (
            <PowerDetails
              power={power()}
              actions={
                <Show
                  when={!hasPower(character(), power().id)}
                  fallback={
                    <Button
                      variant="error"
                      onClick={() => {
                        actions.removePower(power().id);
                        setDrawerTarget(null);
                      }}
                    >
                      Забыть
                    </Button>
                  }
                >
                  <Button
                    variant="primary"
                    disabled={state.character.creationLocked && officialPowerCount() >= powerSlots()}
                    onClick={() => {
                      actions.addPower({ powerId: power().id });
                      setDrawerTarget(null);
                    }}
                  >
                    Изучить
                  </Button>
                </Show>
              }
            />
          )}
        </Show>
        <Show when={drawerCustomPower()}>
          {(power) => (
            <CustomPowerDetails
              power={power()}
              actions={
                <div class="flex gap-2">
                  <Button variant="primary" onClick={() => openEditEditor(power())}>
                    <Pencil size={16} />
                    Изменить
                  </Button>
                  <Button variant="error" onClick={() => deleteCustomPower(power())}>
                    <Trash2 size={16} />
                    Удалить
                  </Button>
                </div>
              }
            />
          )}
        </Show>
      </Drawer>

      <Drawer
        open={editorOpen()}
        onClose={() => setEditorOpen(false)}
        canClose={canCloseEditor}
        title={editingCustomPowerId() == null ? 'Создать свою силу' : 'Изменить свою силу'}
        decoration={<WandSparkles class="h-40 w-40 sm:h-48 sm:w-48" />}
      >
        <CustomPowerEditor draft={draft()} onChange={setDraft} onSave={saveCustomPower} valid={draftValid()} />
      </Drawer>
    </div>
  );
}

function LearnedPowerRow(props: {
  entry: LearnedPowerEntry;
  pinned: boolean;
  onOpen: () => void;
  onTogglePinned: () => void;
  onRemove: () => void;
}): JSX.Element {
  const official = (): Power | null =>
    props.entry.kind === 'official' ? props.entry.power : null;

  return (
    <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
      <button
        type="button"
        class="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        onClick={props.onOpen}
      >
        <div class="flex items-center gap-2 text-sm font-medium">
          <span>{learnedPowerName(props.entry)}</span>
          <Show when={official()}>{(power) => <PowerSourceTag power={power()} />}</Show>
          <Show when={props.entry.kind === 'custom'}>
            <Badge variant="primary" outline>
              своё
            </Badge>
          </Show>
        </div>
        <PowerSubtitle power={props.entry.power} showRank={props.entry.kind === 'official'} />
      </button>
      <Button
        size="xs"
        variant="ghost"
        square
        aria-label={props.pinned ? 'Открепить' : 'Закрепить'}
        onClick={props.onTogglePinned}
      >
        <Show when={props.pinned} fallback={<Pin size={14} />}>
          <PinOff size={14} />
        </Show>
      </Button>
      <Button
        size="xs"
        variant="ghost"
        square
        aria-label={props.entry.kind === 'official' ? 'Забыть' : 'Удалить'}
        onClick={props.onRemove}
      >
        <Trash2 size={14} />
      </Button>
    </li>
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

function isOfficialPower(power: Power | CustomPower): power is Power {
  return 'ru' in power;
}

function powerRankLabel(power: Power | CustomPower): string | undefined {
  return isOfficialPower(power) ? RANK_RU[power.rank] : undefined;
}

function PowerSubtitle(props: { power: Power | CustomPower; showRank?: boolean }): JSX.Element {
  const rank = (): string | undefined => props.showRank ? powerRankLabel(props.power) : undefined;

  return (
    <div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-base-content/60">
      <Show when={rank()}>{(label) => <span>{label()}</span>}</Show>
      <Show when={props.power.attackEffect}>
        {(effect) => (
          <span class="inline-flex items-center gap-1">
            <Crosshair size={12} aria-hidden="true" />
            {effect()}
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

function CustomPowerEditor(props: {
  draft: CustomPowerDraft;
  onChange: (draft: CustomPowerDraft) => void;
  onSave: () => void;
  valid: boolean;
}): JSX.Element {
  const update = (field: keyof CustomPowerDraft, value: string): void => {
    props.onChange({ ...props.draft, [field]: value });
  };

  return (
    <div class="flex flex-col gap-3">
      <Input
        label="Название"
        value={props.draft.name}
        onInput={(event) => update('name', event.currentTarget.value)}
        placeholder="Например: Призрачное пламя"
      />
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Пункты силы"
          value={props.draft.powerPoints}
          onInput={(event) => update('powerPoints', event.currentTarget.value)}
          placeholder="Например: 2 или Особо"
        />
        <Input
          label="Дистанция"
          value={props.draft.range}
          onInput={(event) => update('range', event.currentTarget.value)}
          placeholder="Например: Смекалка"
        />
        <Input
          label="Длительность"
          value={props.draft.duration}
          onInput={(event) => update('duration', event.currentTarget.value)}
          placeholder="Например: 5 или —"
        />
      </div>
      <Input
        label="Урон/эффект атаки (необязательно)"
        value={props.draft.attackEffect}
        onInput={(event) => update('attackEffect', event.currentTarget.value)}
        placeholder="Например: 2d6 или оглушение"
      />
      <TextArea
        label="Краткое описание (необязательно)"
        value={props.draft.shortDescription}
        onInput={(value) => update('shortDescription', value)}
        rows={3}
      />
      <TextArea
        label="Полное описание (необязательно)"
        value={props.draft.fullDescription}
        onInput={(value) => update('fullDescription', value)}
        rows={7}
      />
      <div class="sticky bottom-0 z-10 -mx-4 -mb-3 mt-1 border-t border-base-300 bg-base-200/95 px-4 py-3 backdrop-blur">
        <Button class="w-full" variant="primary" disabled={!props.valid} onClick={props.onSave}>
          Сохранить
        </Button>
      </div>
    </div>
  );
}

function TextArea(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  rows: number;
}): JSX.Element {
  return (
    <label class="form-control w-full">
      <span class="label-text mb-1 block text-sm">{props.label}</span>
      <textarea
        class="textarea textarea-bordered w-full"
        rows={props.rows}
        value={props.value}
        onInput={(event) => props.onInput(event.currentTarget.value)}
      />
    </label>
  );
}
