export type AttributeId = 'agility' | 'smarts' | 'spirit' | 'strength' | 'vigor';

export type DieStep = 'd4' | 'd6' | 'd8' | 'd10' | 'd12';
export type DieStepOrNone = DieStep | null;

export type Rank = 'novice' | 'seasoned' | 'veteran' | 'heroic' | 'legendary';
export type Source = 'core' | 'dl';
export type HindranceSeverity = 'minor' | 'major';

export interface Attribute {
  id: AttributeId;
  ru: string;
  description: string;
}

export interface Skill {
  id: string;
  ru: string;
  linkedAttribute: AttributeId;
  isBase: boolean;
  description: string;
}

export interface Hindrance {
  id: string;
  ru: string;
  source: Source;
  severityOptions: HindranceSeverity[];
  description: string;
  translationNote?: string;
}

export type EdgeCategory =
  | 'background'
  | 'combat'
  | 'leadership'
  | 'supernatural'
  | 'professional'
  | 'social'
  | 'mystic'
  | 'legendary'
  | 'weird'
  | 'harrowed'
  | 'huckster'
  | 'blessed'
  | 'shaman'
  | 'chi-master'
  | 'mad-scientist';

export type EdgeRequirement =
  | { type: 'rank'; value: Rank }
  | { type: 'attribute'; attribute: AttributeId; minDie: DieStep }
  | { type: 'skill'; skillId: string; minDie: DieStep }
  | { type: 'edge'; edgeId: string }
  | { type: 'wildCard' }
  | { type: 'other'; description: string };

export interface Edge {
  id: string;
  ru: string;
  source: Source;
  category: EdgeCategory;
  requirements: EdgeRequirement[];
  description: string;
  fullDescription: string;
  translationNote?: string;
}

export interface Power {
  id: string;
  ru: string;
  source: Source;
  rank: Rank;
  powerPoints: string;
  range: string;
  duration: string;
  shortDescription: string;
  fullDescription: string;
  translationNote?: string;
}

export type WeaponCategory = 'melee' | 'ranged' | 'ammo';

export interface Weapon {
  id: string;
  ru: string;
  source: Source;
  isWeirdWest: boolean;
  category: WeaponCategory;
  subcategory?: string;
  cost: number;
  weight: number;
  minStrength: DieStep | null;
  damage?: string;
  range?: string | null;
  rateOfFire?: number | null;
  armorPiercing?: number;
  shots?: number | null;
  reload?: string;
  twoHanded?: boolean;
  notes?: string;
  description: string;
}

export type EquipmentCategory =
  | 'armor'
  | 'mount'
  | 'gear'
  | 'electronics'
  | 'weird-tech'
  | 'ammo-supplies'
  | 'vehicle'
  | 'service';

export interface EquipmentItem {
  id: string;
  ru: string;
  source: Source;
  isWeirdWest: boolean;
  category: EquipmentCategory;
  subcategory?: string;
  cost: number;
  weight: number;
  armor?: number | null;
  minStrength?: DieStep | null;
  covers?: string | null;
  notes?: string;
  description: string;
}

export interface ArcaneBackground {
  id: string;
  ru: string;
  source: Source;
  skillId: string | null;
  skillRu: string | null;
  startingPowers: number;
  startingPowerPoints: number;
  allowedPowers: string[];
  description: string;
  trapping?: string;
  translationNote?: string;
}

export interface CustomSkill {
  id: string;
  name: string;
  linkedAttribute: AttributeId;
  die: DieStepOrNone;
}

export interface SelectedHindrance {
  hindranceId: string;
  severity: HindranceSeverity;
}

export interface SelectedEdge {
  edgeId: string;
}

export interface SelectedEquipment {
  itemId: string;
  quantity: number;
  type: 'weapon' | 'other';
}

export interface SelectedPower {
  powerId: string;
}

export interface DerivedStats {
  pace: number;
  parry: number;
  toughness: number;
}

export interface Character {
  name: string;
  attributes: Record<AttributeId, DieStep>;
  skills: Record<string, DieStepOrNone>;
  customSkills: CustomSkill[];
  hindrances: SelectedHindrance[];
  edges: SelectedEdge[];
  equipment: SelectedEquipment[];
  arcaneBackgroundId: string | null;
  powers: SelectedPower[];
  powerPoints: number;
  money: number;
  wounds: number;
  fatigue: number;
  advancesUsed: number;
  derivedStats: DerivedStats;
  abFilterEnabled: boolean;
}

export interface AppSettings {
  deadlandsEnabled: boolean;
  freeSkillPoints: number;
}

export const CURRENT_SCHEMA_VERSION = 1;

export const RANK_THRESHOLDS: { rank: Rank; minAdvances: number; ru: string }[] = [
  { rank: 'novice', minAdvances: 0, ru: 'Новичок' },
  { rank: 'seasoned', minAdvances: 4, ru: 'Закалённый' },
  { rank: 'veteran', minAdvances: 8, ru: 'Ветеран' },
  { rank: 'heroic', minAdvances: 12, ru: 'Герой' },
  { rank: 'legendary', minAdvances: 16, ru: 'Легенда' },
];

export const DIE_STEPS: DieStep[] = ['d4', 'd6', 'd8', 'd10', 'd12'];
