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

export const ATTRIBUTES = attributesJson as Attribute[];
export const SKILLS = skillsJson as Skill[];
export const HINDRANCES = hindrancesJson as Hindrance[];
export const EDGES = edgesJson as Edge[];
export const POWERS = powersJson as Power[];
export const WEAPONS = weaponsJson as Weapon[];
export const EQUIPMENT_OTHER = equipmentOtherJson as EquipmentItem[];
export const ARCANE_BACKGROUNDS = abJson as ArcaneBackground[];

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
