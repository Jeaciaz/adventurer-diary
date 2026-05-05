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
  Toggle,
} from '../ui';
import type { EquipmentItem, Weapon } from '../types';

type AnyItem = AnyEquipmentItem;

function selectedItem(sel: { itemId: string; type: 'weapon' | 'other' }): AnyItem | null {
  if (sel.type === 'weapon') {
    const item = WEAPON_BY_ID.get(sel.itemId);
    return item == null ? null : weaponItem(item);
  }
  const item = EQUIPMENT_OTHER_BY_ID.get(sel.itemId);
  return item == null ? null : otherItem(item);
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

function queryMatches(item: Pick<Weapon | EquipmentItem, 'ru'>, query: string): boolean {
  return query === '' || item.ru.toLowerCase().includes(query);
}

function matchesItemFilter(
  item: Pick<Weapon | EquipmentItem, 'ru' | 'source'>,
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
  const [onlyDeadlands, setOnlyDeadlands] = createSignal(false);
  const [drawerItem, setDrawerItem] = createSignal<AnyItem | null>(null);

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

  return (
    <div class="flex flex-col gap-4">
      <div class="self-start rounded-xl border border-base-300 bg-base-200 p-2">
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

      <Collapsible title={`Оружие (${weaponsVisible().length})`} defaultOpen={false}>
        <For each={weaponsByCategory()}>
          {([cat, items]) => (
            <ItemCategoryGroup title={`${WEAPON_SUBCAT_RU[cat] ?? cat} (${items.length})`} items={items} onTap={setDrawerItem} />
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
                <Button
                  variant="primary"
                  onClick={() => {
                    actions.addEquipment({
                      itemId: it().id,
                      quantity: 1,
                      type: isWeaponItem(it()) ? 'weapon' : 'other',
                    });
                    setDrawerItem(null);
                  }}
                >
                  Добавить
                </Button>
              }
            />
          )}
        </Show>
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
}): JSX.Element {
  return (
    <Collapsible title={props.title} defaultOpen={false}>
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
  const { actions } = useStore();
  return (
    <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
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
      </button>
      <Button
        size="xs"
        variant="ghost"
        square
        aria-label="Добавить"
        onClick={() =>
          actions.addEquipment({
            itemId: props.item.id,
            quantity: 1,
            type: isWeaponItem(props.item) ? 'weapon' : 'other',
          })
        }
      >
        <Plus size={14} />
      </Button>
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
