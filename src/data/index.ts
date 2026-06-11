import attributesJson from './attributes.json';
import skillsJson from './skills.json';
import hindrancesJson from './hindrances.json';
import edgesJson from './edges.json';
import powersJson from './powers.json';
import weaponsJson from './equipment-weapons.json';
import equipmentOtherJson from './equipment-other.json';
import abJson from './arcane-backgrounds.json';

import type {
  ArcaneBackground,
  Attribute,
  Edge,
  EquipmentItem,
  Hindrance,
  Power,
  Skill,
  Weapon,
} from '../types';
import {
  checkedArray,
  isArcaneBackground,
  isAttribute,
  isEdge,
  isEquipmentItem,
  isHindrance,
  isPower,
  isSkill,
  isWeapon,
} from '../validation';

const POWER_ID_ALIASES: Record<string, string> = {
  'arcane-protection': 'zashchita-ot-misticheskikh-sil',
  barrier: 'stena',
  'beast-friend': 'drug-zverey',
  blast: 'vzryv',
  blind: 'osleplenie',
  bolt: 'strela',
  'boost-lower-trait': 'usilit-oslabit-parametr',
  burrow: 'podzemnyy-khod',
  burst: 'potok',
  confusion: 'smyatenie',
  'damage-field': 'razrushitelnoe-pole',
  darksight: 'sovinoe-chute',
  deflection: 'shchit',
  'detect-arcana': 'uvidet-skryt-sverkhestestvennoye',
  'detect-conceal-arcana': 'uvidet-skryt-sverkhestestvennoye',
  disguise: 'maska',
  dispel: 'rasseivaniye',
  divination: 'proricanie',
  'drain-power-points': 'issushenie',
  'elemental-manipulation': 'upravlenie-stikhiyami',
  empathy: 'empatiya',
  entangle: 'puty',
  'environmental-protection': 'zashchita-ot-okruzhayushchey-sredy',
  farsight: 'zorkost',
  fear: 'uzhas',
  fly: 'polyot',
  growth: 'uvelichenie-umenshenie',
  havoc: 'smerch',
  healing: 'istselenie',
  illusion: 'illyuziya',
  intangibility: 'neosyazaemost',
  invisibility: 'nevidimost',
  light: 'svet-tma',
  'light-darkness': 'svet-tma',
  'mind-wipe': 'stiranie-pamyati',
  'object-reading': 'psikhometriya',
  protection: 'dospekh',
  puppet: 'marionetka',
  relief: 'podderzhka',
  resurrection: 'voskreshenie',
  'shape-change': 'prevrashchenie',
  shrink: 'uvelichenie-umenshenie',
  'sloth-speed': 'zamedlenie-uskorenie',
  slumber: 'son',
  smite: 'sokrushenie',
  'sound-silence': 'zvuk-tishina',
  'speak-language': 'vladenie-yazykom',
  stun: 'oglushenie',
  'summon-ally': 'prizyv-soyuznika',
  telekinesis: 'telekinez',
  teleport: 'teleportatsiya',
  'wall-walker': 'paucheye-lapy',
  'warriors-gift': 'dar-voina',
  zombie: 'zombi',
};

function normalizePowerIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => POWER_ID_ALIASES[id] ?? id))];
}

export const ATTRIBUTES = checkedArray(attributesJson, isAttribute, 'attributes.json');
const SKILLS = checkedArray(skillsJson, isSkill, 'skills.json');
export const HINDRANCES = checkedArray(hindrancesJson, isHindrance, 'hindrances.json');
export const EDGES = checkedArray(edgesJson, isEdge, 'edges.json');
export const POWERS = checkedArray(powersJson, isPower, 'powers.json');
export const WEAPONS = checkedArray(weaponsJson, isWeapon, 'equipment-weapons.json').map(
  normalizeCoreCost,
);
export const EQUIPMENT_OTHER = checkedArray(
  equipmentOtherJson,
  isEquipmentItem,
  'equipment-other.json',
).map(normalizeCoreCost);
export const ARCANE_BACKGROUNDS: ArcaneBackground[] = checkedArray(
  abJson,
  isArcaneBackground,
  'arcane-backgrounds.json',
).map((a) => ({
  ...a,
  allowedPowers: normalizePowerIds(a.allowedPowers),
}));

export const SKILLS_BY_ATTRIBUTE = new Map<Attribute['id'], Skill[]>();
for (const a of ATTRIBUTES) SKILLS_BY_ATTRIBUTE.set(a.id, []);
for (const s of SKILLS) {
  const list = SKILLS_BY_ATTRIBUTE.get(s.linkedAttribute);
  if (list) list.push(s);
}

export const SKILL_BY_ID = new Map<string, Skill>(SKILLS.map((s) => [s.id, s]));
export const HINDRANCE_BY_ID = new Map<string, Hindrance>(HINDRANCES.map((h) => [h.id, h]));
export const EDGE_BY_ID = new Map<string, Edge>(EDGES.map((e) => [e.id, e]));
export const POWER_BY_ID = new Map<string, Power>(POWERS.map((p) => [p.id, p]));
export const WEAPON_BY_ID = new Map<string, Weapon>(WEAPONS.map((w) => [w.id, w]));
export const EQUIPMENT_OTHER_BY_ID = new Map<string, EquipmentItem>(
  EQUIPMENT_OTHER.map((e) => [e.id, e]),
);
export const ARCANE_BACKGROUND_BY_ID = new Map<string, ArcaneBackground>(
  ARCANE_BACKGROUNDS.map((a) => [a.id, a]),
);

export const BASE_SKILL_IDS = SKILLS.filter((s) => s.isBase).map((s) => s.id);

function normalizeCoreCost<T extends Weapon | EquipmentItem>(item: T): T {
  if (item.source === 'dl') return item;
  return { ...item, cost: item.cost / 10 };
}
