import { Coins, Crosshair, Dumbbell, Gauge, Package, Ruler, Shield, Target } from 'lucide-solid';
import { Show, type JSX } from 'solid-js';
import { Badge } from '../ui';
import type { EquipmentItem, Weapon } from '../types';

type WeaponItem = Weapon & { _kind: 'weapon' };
type OtherItem = EquipmentItem & { _kind: 'other' };
export type AnyEquipmentItem = WeaponItem | OtherItem;

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

export function weaponItem(item: Weapon): WeaponItem {
  return { ...item, _kind: 'weapon' };
}

export function otherItem(item: EquipmentItem): OtherItem {
  return { ...item, _kind: 'other' };
}

export function isWeaponItem(item: AnyEquipmentItem): item is WeaponItem {
  return item._kind === 'weapon';
}

function isOtherItem(item: AnyEquipmentItem): item is OtherItem {
  return item._kind === 'other';
}

export function EquipmentDetails(props: { item: AnyEquipmentItem; actions?: JSX.Element }): JSX.Element {
  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap gap-1">
        <Show when={props.item.source === 'dl'}>
          <Badge variant="info" outline>
            DL
          </Badge>
        </Show>
        <Show when={props.item.isWeirdWest}>
          <Badge variant="warning" outline>
            Weird West
          </Badge>
        </Show>
      </div>
      <ItemStats item={props.item} />
      <p class="whitespace-pre-line text-sm leading-relaxed">{props.item.description}</p>
      {props.actions}
    </div>
  );
}

function ItemStats(props: { item: AnyEquipmentItem }): JSX.Element {
  const item = (): AnyEquipmentItem => props.item;
  const weapon = (): WeaponItem | null => {
    const current = item();
    return isWeaponItem(current) ? current : null;
  };
  const other = (): OtherItem | null => {
    const current = item();
    return isOtherItem(current) ? current : null;
  };

  return (
    <dl class="grid grid-cols-2 overflow-hidden rounded-lg border border-base-300 text-sm sm:grid-cols-3">
      <Stat label="Категория" value={categoryLabel(item())} />
      <Stat label="Цена" value={`$${item().cost}`} icon={<Coins size={13} />} />
      <Stat label="Вес" value={`${item().weight} кг`} icon={<Package size={13} />} />
      <Show when={item().minStrength}>
        {(v) => <Stat label="Требуемая мощь" value={v()} icon={<Dumbbell size={13} />} />}
      </Show>
      <Show when={weapon()}>
        {(w) => (
          <>
            <Show when={w().damage}>
              {(v) => <Stat label="Урон" value={v()} icon={<Crosshair size={13} />} />}
            </Show>
            <Show when={w().range}>
              {(v) => <Stat label="Дистанция" value={v()} icon={<Ruler size={13} />} />}
            </Show>
            <Show when={w().rateOfFire}>
              {(v) => <Stat label="Скорострельность" value={String(v())} icon={<Gauge size={13} />} />}
            </Show>
            <Show when={w().armorPiercing != null}>
              <Stat label="ББ" value={String(w().armorPiercing ?? 0)} icon={<Target size={13} />} />
            </Show>
            <Show when={w().shots != null}>
              <Stat label="Выстрелы" value={String(w().shots ?? 0)} icon={<Crosshair size={13} />} />
            </Show>
            <Show when={w().reload}>
              {(v) => <Stat label="Перезарядка" value={v()} />}
            </Show>
            <Show when={w().twoHanded}>
              <Stat label="Хват" value="2 руки" />
            </Show>
          </>
        )}
      </Show>
      <Show when={other()}>
        {(o) => (
          <>
            <Show when={o().armor != null}>
              <Stat label="Броня" value={String(o().armor ?? 0)} icon={<Shield size={13} />} />
            </Show>
            <Show when={o().covers}>
              {(v) => <Stat label="Покрытие" value={v()} />}
            </Show>
          </>
        )}
      </Show>
      <Show when={item().notes}>
        {(v) => <Stat label="Особенности" value={v()} wide />}
      </Show>
    </dl>
  );
}

function Stat(props: { label: string; value: string; icon?: JSX.Element; wide?: boolean }): JSX.Element {
  return (
    <div class={[props.wide ? 'col-span-2 sm:col-span-3' : '', 'border-base-300 px-2 py-1.5 [&:not(:last-child)]:border-r'].join(' ')}>
      <dt class="text-[10px] uppercase tracking-wide text-base-content/50">{props.label}</dt>
      <dd class="flex items-center gap-1 break-words font-medium leading-tight">
        {props.icon}
        <span>{props.value}</span>
      </dd>
    </div>
  );
}

function categoryLabel(item: AnyEquipmentItem): string {
  return withSubcategory(categoryName(item), item.subcategory);
}

function categoryName(item: AnyEquipmentItem): string {
  if (isWeaponItem(item)) return WEAPON_SUBCAT_RU[item.category] ?? item.category;
  return OTHER_CAT_RU[item.category] ?? item.category;
}

function withSubcategory(category: string, subcategory: string | undefined): string {
  return subcategory ? `${category} · ${subcategory}` : category;
}
