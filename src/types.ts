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
  originalName?: string;
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
  originalName?: string;
  source: Source;
  category: EdgeCategory;
  requirements: EdgeRequirement[];
  description: string;
  fullDescription: string;
  translationNote?: string;
}

export interface CustomEdge {
  id: string;
  name: string;
  description: string;
  countsTowardLimit?: boolean;
}

export interface Power {
  id: string;
  ru: string;
  source: Source;
  rank: Rank;
  powerPoints: string;
  range: string;
  duration: string;
  attackEffect?: string;
  shortDescription: string;
  fullDescription: string;
  translationNote?: string;
}

export interface CustomPower {
  id: string;
  name: string;
  powerPoints: string;
  range: string;
  duration: string;
  attackEffect?: string;
  shortDescription?: string;
  fullDescription?: string;
}

export type WeaponCategory = 'melee' | 'ranged' | 'ammo';

export interface Weapon {
  id: string;
  ru: string;
  originalName?: string;
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
  originalName?: string;
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

export interface CustomHindrance {
  id: string;
  name: string;
  severity: HindranceSeverity;
  description?: string;
}

export interface SelectedEdge {
  edgeId: string;
  count?: number;
}

export interface SelectedEquipment {
  itemId: string;
  quantity: number;
  type: 'weapon' | 'other' | 'custom';
}

export interface CustomEquipment {
  id: string;
  name: string;
  description?: string;
}

export interface SelectedPower {
  powerId: string;
}

export interface DerivedStats {
  pace: number;
  parry: number;
  toughness: number;
}

export type PromotionAllocation =
  | { kind: 'attribute'; attributeId: AttributeId; points: 2 }
  | { kind: 'learnSkill'; skillId: string; points: 2; customSkill?: Omit<CustomSkill, 'die'> }
  | { kind: 'skill'; skillId: string; points: 1 | 2 }
  | { kind: 'edgeSlot'; points: 2; edgeId?: string; customEdgeId?: string }
  // Legacy allocations are read only to migrate saved characters.
  | { kind: 'edge'; edgeId: string; points: 2; arcaneBackgroundId?: string }
  | { kind: 'customEdge'; edge: CustomEdge; points: 2 };

export interface Promotions {
  allocations: Record<string, PromotionAllocation[]>;
  legacyBaseline: boolean;
}

export interface Character {
  // Attributes and skills are the creation baseline; edges are managed independently.
  creationLocked: boolean;
  promotions: Promotions;
  name: string;
  attributes: Record<AttributeId, DieStep>;
  skills: Record<string, DieStepOrNone>;
  customSkills: CustomSkill[];
  hindrances: SelectedHindrance[];
  customHindrances: CustomHindrance[];
  edges: SelectedEdge[];
  customEdges: CustomEdge[];
  equipment: SelectedEquipment[];
  customEquipment: CustomEquipment[];
  arcaneBackgroundId: string | null;
  powers: SelectedPower[];
  customPowers: CustomPower[];
  pinnedPowerIds: string[];
  powerPoints: number;
  money: number;
  wounds: number;
  fatigue: number;
  advancesUsed: number; // Manually earned promotions, excluding the veteran's four.
  derivedStats: DerivedStats;
  abFilterEnabled: boolean;
}

export interface AppSettings {
  deadlandsEnabled: boolean;
  freeSkillPoints: number;
  doubleEveryFourthPromotion: boolean;
}

export const CURRENT_SCHEMA_VERSION = 4;

export const RANK_THRESHOLDS: { rank: Rank; minAdvances: number; ru: string }[] = [
  { rank: 'novice', minAdvances: 0, ru: 'Новичок' },
  { rank: 'seasoned', minAdvances: 4, ru: 'Закалённый' },
  { rank: 'veteran', minAdvances: 8, ru: 'Ветеран' },
  { rank: 'heroic', minAdvances: 12, ru: 'Герой' },
  { rank: 'legendary', minAdvances: 16, ru: 'Легенда' },
];

export const DIE_STEPS: DieStep[] = ['d4', 'd6', 'd8', 'd10', 'd12'];
