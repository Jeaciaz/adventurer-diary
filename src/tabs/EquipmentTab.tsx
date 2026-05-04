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

export function EquipmentTab(): JSX.Element {
  const { state, actions } = useStore();
  const c = (): typeof state.character => state.character;
  const [search, setSearch] = createSignal('');
  const [drawerItem, setDrawerItem] = createSignal<AnyItem | null>(null);

  const dlOn = (): boolean => state.settings.deadlandsEnabled;

  const weaponsVisible = createMemo<AnyItem[]>(() => {
    const q = search().toLowerCase().trim();
    return WEAPONS.filter(
      (w) => (dlOn() || w.source !== 'dl') && (!q || w.ru.toLowerCase().includes(q)),
    ).map((w) => ({ ...w, _kind: 'weapon' as const }));
  });

  const otherVisible = createMemo<AnyItem[]>(() => {
    const q = search().toLowerCase().trim();
    return EQUIPMENT_OTHER.filter(
      (e) => (dlOn() || e.source !== 'dl') && (!q || e.ru.toLowerCase().includes(q)),
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
      <Card class="flex items-end gap-3">
        <NumberStepper
          label="Деньги ($)"
          value={c().money}
          onChange={(v) => actions.setMoney(v)}
          step={5}
          min={0}
        />
      </Card>

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
                <Badge variant="ghost">${it().cost}</Badge>
                <Badge variant="ghost">{it().weight} кг</Badge>
                <Show when={it().minStrength}>
                  <Badge variant="ghost">сила {it().minStrength}</Badge>
                </Show>
                <Show when={isWeapon(it()) && (it() as Weapon).damage}>
                  <Badge variant="ghost">урон {(it() as Weapon).damage}</Badge>
                </Show>
                <Show when={isWeapon(it()) && (it() as Weapon).range}>
                  <Badge variant="ghost">дист. {(it() as Weapon).range}</Badge>
                </Show>
                <Show when={isWeapon(it()) && (it() as Weapon).rateOfFire}>
                  <Badge variant="ghost">скс {(it() as Weapon).rateOfFire}</Badge>
                </Show>
                <Show when={isWeapon(it()) && ((it() as Weapon).armorPiercing ?? 0) > 0}>
                  <Badge variant="ghost">бб {(it() as Weapon).armorPiercing}</Badge>
                </Show>
                <Show when={!isWeapon(it()) && (it() as EquipmentItem).armor}>
                  <Badge variant="ghost">броня {(it() as EquipmentItem).armor}</Badge>
                </Show>
              </div>
              <p class="whitespace-pre-line text-sm leading-relaxed">{it().description}</p>
              <Show when={!isWeapon(it()) && (it() as EquipmentItem).notes}>
                <p class="text-xs italic opacity-70">{(it() as EquipmentItem).notes}</p>
              </Show>
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
          ${props.item.cost} · {props.item.weight} кг
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
