import { createMemo, createSignal, For, Show, type JSX } from 'solid-js';
import { Plus, Trash2 } from 'lucide-solid';
import { useStore } from '../store/store';
import { EQUIPMENT_OTHER, EQUIPMENT_OTHER_BY_ID, WEAPONS, WEAPON_BY_ID } from '../data';
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

type AnyItem = (Weapon | EquipmentItem) & { _kind: 'weapon' | 'other' };

function isWeapon(i: AnyItem): i is Weapon & { _kind: 'weapon' } {
  return i._kind === 'weapon';
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
};

const MONEY_DELTAS = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10];

function damageSortValue(damage?: string): number {
  if (!damage || damage === '—') return Number.NEGATIVE_INFINITY;
  const normalized = damage.replace(/[−–]/g, '-');
  let value = 0;

  for (const match of normalized.matchAll(/(\d*)d(\d+)/gi)) {
    const count = match[1] ? Number(match[1]) : 1;
    const sides = Number(match[2]);
    value += count * ((sides + 1) / 2);
  }

  const withoutDice = normalized.replace(/\d*d\d+/gi, '');
  for (const match of withoutDice.matchAll(/[+-]\d+/g)) {
    value += Number(match[0]);
  }

  return value;
}

function compareWeaponDamage(a: Weapon, b: Weapon): number {
  return damageSortValue(a.damage) - damageSortValue(b.damage) || a.cost - b.cost || a.ru.localeCompare(b.ru, 'ru');
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
    return WEAPONS.filter(
      (w) =>
        (dlOn() || w.source !== 'dl') &&
        (!onlyDeadlands() || w.source === 'dl') &&
        (!q || w.ru.toLowerCase().includes(q)),
    )
      .map((w) => ({ ...w, _kind: 'weapon' as const }))
      .sort(compareWeaponDamage);
  });

  const otherVisible = createMemo<AnyItem[]>(() => {
    const q = search().toLowerCase().trim();
    return EQUIPMENT_OTHER.filter(
      (e) =>
        (dlOn() || e.source !== 'dl') &&
        (!onlyDeadlands() || e.source === 'dl') &&
        (!q || e.ru.toLowerCase().includes(q)),
    ).map((e) => ({ ...e, _kind: 'other' as const }));
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
                const item =
                  sel.type === 'weapon'
                    ? WEAPON_BY_ID.get(sel.itemId)
                    : EQUIPMENT_OTHER_BY_ID.get(sel.itemId);
                if (!item) return null;
                return (
                  <li class="flex items-center justify-between gap-2 rounded-lg border border-base-300 bg-base-100 px-2 py-1">
                    <button
                      type="button"
                      class="flex flex-1 flex-col items-start gap-0.5 text-left"
                      onClick={() =>
                        setDrawerItem({ ...item, _kind: sel.type === 'weapon' ? 'weapon' : 'other' } as AnyItem)
                      }
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
            <Collapsible title={`${WEAPON_SUBCAT_RU[cat] ?? cat} (${items.length})`} defaultOpen={false}>
              <ul class="flex flex-col gap-1">
                <For each={items}>{(item) => <ItemRow item={item} onTap={setDrawerItem} />}</For>
              </ul>
            </Collapsible>
          )}
        </For>
      </Collapsible>

      <Collapsible title={`Прочее (${otherVisible().length})`} defaultOpen={false}>
        <For each={otherByCategory()}>
          {([cat, items]) => (
            <Collapsible title={`${OTHER_CAT_RU[cat] ?? cat} (${items.length})`} defaultOpen={false}>
              <ul class="flex flex-col gap-1">
                <For each={items}>{(item) => <ItemRow item={item} onTap={setDrawerItem} />}</For>
              </ul>
            </Collapsible>
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
              <div class="flex flex-col gap-3">
                <div class="flex flex-wrap gap-1">
                  <Show when={it().source === 'dl'}>
                  <Badge variant="info" outline>
                    DL
                  </Badge>
                </Show>
                <Show when={it().isWeirdWest}>
                  <Badge variant="warning" outline>
                      Weird West
                    </Badge>
                  </Show>
                </div>
              <ItemStats item={it()} />
              <p class="whitespace-pre-line text-sm leading-relaxed">{it().description}</p>
              <Button
                variant="primary"
                onClick={() => {
                  actions.addEquipment({
                    itemId: it().id,
                    quantity: 1,
                    type: isWeapon(it()) ? 'weapon' : 'other',
                  });
                  setDrawerItem(null);
                }}
              >
                Добавить
              </Button>
            </div>
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

function ItemStats(props: { item: AnyItem }): JSX.Element {
  const item = (): AnyItem => props.item;
  const weapon = (): (Weapon & { _kind: 'weapon' }) | null => {
    const current = item();
    return isWeapon(current) ? current : null;
  };
  const other = (): (EquipmentItem & { _kind: 'other' }) | null => {
    const current = item();
    return isWeapon(current) ? null : (current as EquipmentItem & { _kind: 'other' });
  };

  return (
    <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-base-300 text-sm sm:grid-cols-3">
      <Stat label="Категория" value={categoryLabel(item())} />
      <Stat label="Цена" value={`$${item().cost}`} />
      <Stat label="Вес" value={`${item().weight} кг`} />
      <Show when={item().minStrength}>
        {(v) => <Stat label="Требуемая мощь" value={v()} />}
      </Show>
      <Show when={weapon()}>
        <Show when={weapon()!.damage}>
          {(v) => <Stat label="Урон" value={v()} />}
        </Show>
        <Show when={weapon()!.range}>
          {(v) => <Stat label="Дистанция" value={v()} />}
        </Show>
        <Show when={weapon()!.rateOfFire}>
          {(v) => <Stat label="СКС" value={String(v())} />}
        </Show>
        <Show when={weapon()!.armorPiercing != null}>
          <Stat label="ББ" value={String(weapon()!.armorPiercing ?? 0)} />
        </Show>
        <Show when={weapon()!.shots != null}>
          <Stat label="Выстрелы" value={String(weapon()!.shots ?? 0)} />
        </Show>
        <Show when={weapon()!.reload}>
          {(v) => <Stat label="Перезарядка" value={v()} />}
        </Show>
        <Show when={weapon()!.twoHanded}>
          <Stat label="Хват" value="2 руки" />
        </Show>
      </Show>
      <Show when={other()}>
        <Show when={other()!.armor != null}>
          <Stat label="Броня" value={String(other()!.armor ?? 0)} />
        </Show>
        <Show when={other()!.covers}>
          {(v) => <Stat label="Покрытие" value={v()} />}
        </Show>
      </Show>
      <Show when={item().notes}>
        {(v) => <Stat label="Особенности" value={v()} wide />}
      </Show>
    </dl>
  );
}

function Stat(props: { label: string; value: string; wide?: boolean }): JSX.Element {
  return (
    <div class={[props.wide ? 'col-span-2 sm:col-span-3' : '', 'border-base-300 p-2 [&:not(:last-child)]:border-r'].join(' ')}>
      <dt class="text-[10px] uppercase tracking-wide text-base-content/50">{props.label}</dt>
      <dd class="mt-0.5 break-words font-medium">{props.value}</dd>
    </div>
  );
}

function categoryLabel(item: AnyItem): string {
  const category = isWeapon(item)
    ? (WEAPON_SUBCAT_RU[item.category] ?? item.category)
    : (OTHER_CAT_RU[item.category] ?? item.category);
  return item.subcategory ? `${category} · ${item.subcategory}` : category;
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
          {isWeapon(props.item) && props.item.damage ? `${props.item.damage} · ` : ''}
          {props.item.weight} кг · ${props.item.cost}
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
            type: isWeapon(props.item) ? 'weapon' : 'other',
          })
        }
      >
        <Plus size={14} />
      </Button>
    </li>
  );
}
