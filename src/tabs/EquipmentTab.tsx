import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Coins, Crosshair, Package, Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { EQUIPMENT_OTHER, EQUIPMENT_OTHER_BY_ID, WEAPONS, WEAPON_BY_ID } from '../data';
import {
  EquipmentDetails,
  isWeaponItem,
  otherItem,
  weaponItem,
  type AnyEquipmentItem,
} from '../components/EquipmentDetails';
import {
  Badge,
  Button,
  Card,
  Collapsible,
  Drawer,
  Input,
  NumberStepper,
  pushToast,
  Toggle,
} from '../ui';
import type { EquipmentItem, SelectedEquipment, Weapon } from '../types';

type AnyItem = AnyEquipmentItem;

function selectedItem(sel: { itemId: string; type: SelectedEquipment['type'] }): AnyItem | null {
  if (sel.type === 'weapon') {
    const item = WEAPON_BY_ID.get(sel.itemId);
    return item == null ? null : weaponItem(item);
  }
  const item = EQUIPMENT_OTHER_BY_ID.get(sel.itemId);
  return item == null ? null : otherItem(item);
}

function makeCustomEquipmentId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `custom-equipment-${Date.now()}`;
}

function selectionFor(item: AnyItem): SelectedEquipment {
  return {
    itemId: item.id,
    quantity: 1,
    type: isWeaponItem(item) ? 'weapon' : 'other',
  };
}

function addEquipment(actions: ReturnType<typeof useStore>['actions'], item: AnyItem): void {
  actions.addEquipment(selectionFor(item));
  pushToast(`Добавлено: ${item.ru}`, 'success');
}

function buyEquipment(
  actions: ReturnType<typeof useStore>['actions'],
  money: number,
  item: AnyItem,
): void {
  actions.addEquipment(selectionFor(item));
  actions.setMoney(Math.max(0, money - item.cost));
  pushToast(`Куплено: ${item.ru} ($${item.cost})`, 'success');
}

const WEAPON_SUBCAT_RU: Record<string, string> = {
  melee: 'Ближнего боя',
  ranged: 'Дальнего боя',
  ammo: 'Боеприпасы',
};

const OTHER_CAT_RU: Record<string, string> = {
  armor: 'Броня',
  mount: 'Транспорт',
  gear: 'Снаряжение',
  electronics: 'Электроника',
  'weird-tech': 'Странная техника',
  'ammo-supplies': 'Припасы',
  vehicle: 'Транспорт',
  service: 'Услуги',
};

const MONEY_DELTAS = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10];

function normalizedDamage(damage: string): string {
  return damage.replace(/[−–]/g, '-');
}

function diceAverage(match: RegExpMatchArray): number {
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  return count * ((sides + 1) / 2);
}

function diceDamageValue(damage: string): number {
  let value = 0;
  for (const match of damage.matchAll(/(\d*)d(\d+)/gi)) {
    value += diceAverage(match);
  }
  return value;
}

function flatModifierValue(damage: string): number {
  const withoutDice = damage.replace(/\d*d\d+/gi, '');
  let value = 0;
  for (const match of withoutDice.matchAll(/[+-]\d+/g)) {
    value += Number(match[0]);
  }
  return value;
}

function damageSortValue(damage?: string): number {
  if (!damage || damage === '—') return Number.NEGATIVE_INFINITY;
  const normalized = normalizedDamage(damage);
  return diceDamageValue(normalized) + flatModifierValue(normalized);
}

function compareWeaponDamage(a: Weapon, b: Weapon): number {
  return damageSortValue(a.damage) - damageSortValue(b.damage) || a.cost - b.cost || a.ru.localeCompare(b.ru, 'ru');
}

function sourceAllowed(item: Pick<Weapon | EquipmentItem, 'source'>, deadlandsEnabled: boolean): boolean {
  return deadlandsEnabled || item.source !== 'dl';
}

function deadlandsOnlyAllowed(item: Pick<Weapon | EquipmentItem, 'source'>, onlyDeadlands: boolean): boolean {
  return !onlyDeadlands || item.source === 'dl';
}

function queryMatches(item: Pick<Weapon | EquipmentItem, 'ru' | 'originalName'>, query: string): boolean {
  return query === '' || item.ru.toLowerCase().includes(query) || item.originalName?.toLowerCase().includes(query) === true;
}

function matchesItemFilter(
  item: Pick<Weapon | EquipmentItem, 'ru' | 'source' | 'originalName'>,
  query: string,
  onlyDeadlands: boolean,
  deadlandsEnabled: boolean,
): boolean {
  return (
    sourceAllowed(item, deadlandsEnabled) &&
    deadlandsOnlyAllowed(item, onlyDeadlands) &&
    queryMatches(item, query)
  );
}

export function EquipmentTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [onlyDeadlands, setOnlyDeadlands] = createSignal(true);
  const [drawerItem, setDrawerItem] = createSignal<AnyItem | null>(null);
  const [customOpen, setCustomOpen] = createSignal(false);
  const [customName, setCustomName] = createSignal('');
  const [customDescription, setCustomDescription] = createSignal('');

  const dlOn = (): boolean => state.settings.deadlandsEnabled;

  const weaponsVisible = createMemo<AnyItem[]>(() => {
    const q = search().toLowerCase().trim();
    return WEAPONS.filter((w) => matchesItemFilter(w, q, onlyDeadlands(), dlOn()))
      .map(weaponItem)
      .sort(compareWeaponDamage);
  });

  const otherVisible = createMemo<AnyItem[]>(() => {
    const q = search().toLowerCase().trim();
    return EQUIPMENT_OTHER.filter((e) => matchesItemFilter(e, q, onlyDeadlands(), dlOn())).map(otherItem);
  });

  const weaponsByCategory = createMemo(() => {
    const map = new Map<string, AnyItem[]>();
    for (const w of weaponsVisible()) {
      const list = map.get(w.category) ?? [];
      list.push(w);
      map.set(w.category, list);
    }
    return [...map.entries()];
  });

  const otherByCategory = createMemo(() => {
    const map = new Map<string, AnyItem[]>();
    for (const e of otherVisible()) {
      const list = map.get(e.category) ?? [];
      list.push(e);
      map.set(e.category, list);
    }
    return [...map.entries()];
  });

  const customEquipmentById = createMemo(() => new Map(c().customEquipment.map((item) => [item.id, item])));

  const submitCustom = (): void => {
    const name = customName().trim();
    const description = customDescription().trim();
    if (!name) return;
    actions.addCustomEquipment({ id: makeCustomEquipmentId(), name, description });
    pushToast(`Добавлено: ${name}`, 'success');
    setCustomName('');
    setCustomDescription('');
    setCustomOpen(false);
  };

  return (
    <div class="flex flex-col gap-4">
      <div class="sticky top-0 z-20 self-start rounded-b-xl border border-t-0 border-base-300 bg-base-200/95 p-2 shadow-lg backdrop-blur">
        <MoneyControl value={c().money} onChange={actions.setMoney} />
      </div>

      <Card>
        <div class="text-xs uppercase opacity-60">Выбранное</div>
        <Show
          when={c().equipment.length > 0}
          fallback={<div class="mt-2 text-sm opacity-60">Ничего не выбрано.</div>}
        >
          <ul class="mt-2 flex flex-col gap-1">
            <For each={c().equipment}>
              {(sel) => {
                const customItem = (): typeof state.character.customEquipment[number] | undefined => customEquipmentById().get(sel.itemId);
                if (sel.type === 'custom') {
                  return (
                    <li class="flex items-start justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-2 py-1">
                      <div class="flex flex-1 flex-col items-start gap-0.5 text-left">
                        <div class="flex items-center gap-2 text-sm font-medium">
                          <span>{customItem()?.name ?? sel.itemId}</span>
                          <Badge variant="primary" outline>
                            своё
                          </Badge>
                        </div>
                        <Show when={customItem()?.description}>
                          {(description) => (
                            <p class="whitespace-pre-line text-xs leading-snug text-base-content/70">
                              {description()}
                            </p>
                          )}
                        </Show>
                      </div>
                      <NumberStepper
                        value={sel.quantity}
                        onChange={(v) => actions.setEquipmentQuantity(sel.itemId, v)}
                        min={0}
                      />
                      <Button
                        size="xs"
                        variant="ghost"
                        square
                        aria-label="Удалить"
                        onClick={() => actions.removeEquipment(sel.itemId)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </li>
                  );
                }
                const item = selectedItem(sel);
                if (item == null) return null;
                return (
                  <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                    <button
                      type="button"
                      class="flex flex-1 flex-col items-start gap-0.5 text-left"
                      onClick={() => setDrawerItem(item)}
                    >
                      <div class="flex items-center gap-2 text-sm font-medium">
                        <span>{item.ru}</span>
                        <Show when={item.source === 'dl'}>
                          <Badge variant="info" outline>
                            DL
                          </Badge>
                        </Show>
                      </div>
                      <div class="text-xs opacity-60">
                        ${item.cost} · {item.weight} кг
                      </div>
                    </button>
                    <NumberStepper
                      value={sel.quantity}
                      onChange={(v) => actions.setEquipmentQuantity(item.id, v)}
                      min={0}
                    />
                    <Button
                      size="xs"
                      variant="ghost"
                      square
                      aria-label="Удалить"
                      onClick={() => actions.removeEquipment(item.id)}
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
        placeholder="Поиск по снаряжению…"
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <Toggle checked={onlyDeadlands()} onChange={setOnlyDeadlands} label="Только Deadlands" />

      <Collapsible title={`Оружие (${weaponsVisible().length})`}>
        <For each={weaponsByCategory()}>
          {([cat, items]) => (
            <ItemCategoryGroup
              title={`${WEAPON_SUBCAT_RU[cat] ?? cat} (${items.length})`}
              items={items}
              onTap={setDrawerItem}
              defaultOpen
            />
          )}
        </For>
      </Collapsible>

      <Collapsible title={`Прочее (${otherVisible().length})`} defaultOpen={false}>
        <For each={otherByCategory()}>
          {([cat, items]) => (
            <ItemCategoryGroup title={`${OTHER_CAT_RU[cat] ?? cat} (${items.length})`} items={items} onTap={setDrawerItem} />
          )}
        </For>
      </Collapsible>

      <Drawer
        open={drawerItem() != null}
        onClose={() => setDrawerItem(null)}
        title={drawerItem()?.ru ?? ''}
      >
        <Show when={drawerItem()}>
          {(it) => (
            <EquipmentDetails
              item={it()}
              actions={
                <div class="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      addEquipment(actions, it());
                      setDrawerItem(null);
                    }}
                  >
                    Добавить
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      buyEquipment(actions, c().money, it());
                      setDrawerItem(null);
                    }}
                  >
                    Купить
                  </Button>
                </div>
              }
            />
          )}
        </Show>
      </Drawer>
      <Button
        size="md"
        variant="primary"
        square
        class="fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg sm:bottom-6"
        aria-label="Добавить своё снаряжение"
        onClick={() => setCustomOpen(true)}
      >
        <Plus size={24} />
      </Button>
      <Drawer
        open={customOpen()}
        onClose={() => setCustomOpen(false)}
        title="Своё снаряжение"
      >
        <div class="flex flex-col gap-3">
          <Input
            label="Название"
            value={customName()}
            onInput={(e) => setCustomName(e.currentTarget.value)}
            placeholder="Например: серебряная фляга"
          />
          <label class="form-control w-full">
            <span class="label-text mb-1 block text-sm">Описание</span>
            <textarea
              class="textarea textarea-bordered min-h-28 w-full"
              value={customDescription()}
              onInput={(event) => setCustomDescription(event.currentTarget.value)}
            />
          </label>
          <Button variant="primary" disabled={customName().trim() === ''} onClick={submitCustom}>
            Добавить
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

function MoneyControl(props: { value: number; onChange: (v: number) => void }): JSX.Element {
  const setMoney = (value: number): void => props.onChange(Math.max(0, value));
  return (
    <div class="form-control max-w-full">
      <span class="label-text mb-1 text-sm">Деньги ($)</span>
      <div class="max-w-full overflow-x-auto">
        <div class="join min-w-max border border-base-300 rounded-lg">
          <For each={MONEY_DELTAS}>
            {(delta) => (
              <>
                <Show when={delta === 1}>
                  <input
                    type="number"
                    class="input input-xs join-item w-14 border-y-0 border-x border-base-300 text-center focus:outline-none"
                    value={props.value}
                    onInput={(e) => {
                      const n = Number(e.currentTarget.value);
                      if (Number.isFinite(n)) setMoney(n);
                    }}
                  />
                </Show>
                <button
                  type="button"
                  class="btn btn-ghost btn-xs join-item border-0 px-2"
                  onClick={() => setMoney(props.value + delta)}
                >
                  {delta === -1 ? '-': delta === 1 ? '+' : delta > 0 ? `+${delta}` : delta}
                </button>
              </>
            )}
          </For>
        </div>
      </div>
    </div>
  );
}

function ItemCategoryGroup(props: {
  title: string;
  items: AnyItem[];
  onTap: (item: AnyItem) => void;
  defaultOpen?: boolean;
}): JSX.Element {
  return (
    <Collapsible title={props.title} defaultOpen={props.defaultOpen ?? false}>
      <ul class="flex flex-col gap-1">
        <For each={props.items}>{(item) => <ItemRow item={item} onTap={props.onTap} />}</For>
      </ul>
    </Collapsible>
  );
}

function ItemRow(props: {
  item: AnyItem;
  onTap: (i: AnyItem) => void;
}): JSX.Element {
  const { state, actions } = useStore();
  return (
    <li class="flex items-start justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
      <button
        type="button"
        class="flex flex-1 flex-col items-start gap-0.5 text-left"
        onClick={() => props.onTap(props.item)}
      >
        <div class="flex items-center gap-2 text-sm font-medium">
          <span>{props.item.ru}</span>
          <Show when={props.item.source === 'dl'}>
            <Badge variant="info" outline>
              DL
            </Badge>
          </Show>
          <Show when={props.item.isWeirdWest}>
            <Badge variant="warning" outline>
              WW
            </Badge>
          </Show>
        </div>
        <div class="text-xs opacity-60">
          <EquipmentSubtitle item={props.item} />
        </div>
        <Show when={isWeaponItem(props.item)}>
          <p class="text-xs leading-snug text-base-content/70">{props.item.description}</p>
        </Show>
      </button>
      <div class="flex shrink-0 gap-1">
        <Button
          size="xs"
          variant="ghost"
          square
          aria-label="Добавить"
          onClick={() => addEquipment(actions, props.item)}
        >
          <Plus size={14} />
        </Button>
        <Button
          size="xs"
          variant="primary"
          aria-label="Купить"
          onClick={() => buyEquipment(actions, state.character.money, props.item)}
        >
          Купить
        </Button>
      </div>
    </li>
  );
}

function weaponDamage(item: AnyItem): string | undefined {
  if (!isWeaponItem(item)) return undefined;
  return item.damage;
}

function EquipmentSubtitle(props: { item: AnyItem }): JSX.Element {
  return (
    <span class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base-content/60">
      <Show when={weaponDamage(props.item)}>
        {(damage) => (
        <span class="inline-flex items-center gap-1">
          <Crosshair size={12} aria-hidden="true" />
          {damage()}
        </span>
        )}
      </Show>
      <span class="inline-flex items-center gap-1">
        <Package size={12} aria-hidden="true" />
        {props.item.weight} кг
      </span>
      <span class="inline-flex items-center gap-1">
        <Coins size={12} aria-hidden="true" />
        ${props.item.cost}
      </span>
    </span>
  );
}
