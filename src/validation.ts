import * as v from 'valibot';
import type {
  ArcaneBackground,
  CustomHindrance,
  Attribute,
  CustomSkill,
  DieStep,
  DieStepOrNone,
  Edge,
  EquipmentItem,
  Hindrance,
  Power,
  SelectedEdge,
  SelectedEquipment,
  SelectedHindrance,
  SelectedPower,
  Skill,
  Weapon,
} from './types';

export function objectProp(value: object, key: string): unknown {
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

export function isObjectRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function arrayItems(value: unknown): readonly unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

const attributeIdSchema = v.picklist(['agility', 'smarts', 'spirit', 'strength', 'vigor']);
const dieStepSchema = v.picklist(['d4', 'd6', 'd8', 'd10', 'd12']);
const rankSchema = v.picklist(['novice', 'seasoned', 'veteran', 'heroic', 'legendary']);
const sourceSchema = v.picklist(['core', 'dl']);
const hindranceSeveritySchema = v.picklist(['minor', 'major']);
const edgeCategorySchema = v.picklist([
  'background',
  'combat',
  'leadership',
  'supernatural',
  'professional',
  'social',
  'mystic',
  'legendary',
  'weird',
  'harrowed',
  'huckster',
  'blessed',
  'shaman',
  'chi-master',
  'mad-scientist',
]);
const weaponCategorySchema = v.picklist(['melee', 'ranged', 'ammo']);
const equipmentCategorySchema = v.picklist([
  'armor',
  'mount',
  'gear',
  'electronics',
  'weird-tech',
  'ammo-supplies',
  'vehicle',
  'service',
]);
const finiteNumberSchema = v.pipe(v.number(), v.finite());
const dieStepOrNoneSchema = v.nullable(dieStepSchema);
const nullableStringSchema = v.nullable(v.string());

function guardFromSchema<T>(schema: v.GenericSchema<unknown, T>) {
  return (value: unknown): value is T => v.safeParse(schema, value).success;
}

export const isDieStep = guardFromSchema<DieStep>(dieStepSchema);
export const isDieStepOrNone = guardFromSchema<DieStepOrNone>(dieStepOrNoneSchema);

function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  const items = arrayItems(value);
  return items != null && items.every(guard);
}

export function checkedArray<T>(
  value: unknown,
  guard: (item: unknown) => item is T,
  label: string,
): T[] {
  if (isArrayOf(value, guard)) return value;
  throw new Error(`${label} has invalid shape`);
}

const attributeSchema = v.object({
  id: attributeIdSchema,
  ru: v.string(),
  description: v.string(),
});

export const isAttribute = guardFromSchema<Attribute>(attributeSchema);

const skillSchema = v.object({
  id: v.string(),
  ru: v.string(),
  linkedAttribute: attributeIdSchema,
  isBase: v.boolean(),
  description: v.string(),
});

export const isSkill = guardFromSchema<Skill>(skillSchema);

const hindranceSchema = v.object({
  id: v.string(),
  ru: v.string(),
  originalName: v.optional(v.string()),
  source: sourceSchema,
  severityOptions: v.array(hindranceSeveritySchema),
  description: v.string(),
  translationNote: v.optional(v.string()),
});

export const isHindrance = guardFromSchema<Hindrance>(hindranceSchema);

const edgeRequirementSchema = v.variant('type', [
  v.object({ type: v.literal('rank'), value: rankSchema }),
  v.object({ type: v.literal('attribute'), attribute: attributeIdSchema, minDie: dieStepSchema }),
  v.object({ type: v.literal('skill'), skillId: v.string(), minDie: dieStepSchema }),
  v.object({ type: v.literal('edge'), edgeId: v.string() }),
  v.object({ type: v.literal('wildCard') }),
  v.object({ type: v.literal('other'), description: v.string() }),
]);

const edgeSchema = v.object({
  id: v.string(),
  ru: v.string(),
  originalName: v.optional(v.string()),
  source: sourceSchema,
  category: edgeCategorySchema,
  requirements: v.array(edgeRequirementSchema),
  description: v.string(),
  fullDescription: v.string(),
  translationNote: v.optional(v.string()),
});

export const isEdge = guardFromSchema<Edge>(edgeSchema);

const powerSchema = v.object({
  id: v.string(),
  ru: v.string(),
  source: sourceSchema,
  rank: rankSchema,
  powerPoints: v.string(),
  range: v.string(),
  duration: v.string(),
  shortDescription: v.string(),
  fullDescription: v.string(),
  translationNote: v.optional(v.string()),
});

export const isPower = guardFromSchema<Power>(powerSchema);

const equipmentBaseSchema = {
  id: v.string(),
  ru: v.string(),
  originalName: v.optional(v.string()),
  source: sourceSchema,
  isWeirdWest: v.boolean(),
  cost: finiteNumberSchema,
  weight: finiteNumberSchema,
  description: v.string(),
  subcategory: v.optional(v.string()),
  notes: v.optional(v.string()),
};

const weaponSchema = v.object({
  ...equipmentBaseSchema,
  category: weaponCategorySchema,
  minStrength: dieStepOrNoneSchema,
  damage: v.optional(v.string()),
  range: v.optional(nullableStringSchema),
  rateOfFire: v.optional(v.nullable(finiteNumberSchema)),
  armorPiercing: v.optional(finiteNumberSchema),
  shots: v.optional(v.nullable(finiteNumberSchema)),
  reload: v.optional(v.string()),
  twoHanded: v.optional(v.boolean()),
});

export const isWeapon = guardFromSchema<Weapon>(weaponSchema);

const equipmentItemSchema = v.object({
  ...equipmentBaseSchema,
  category: equipmentCategorySchema,
  armor: v.optional(v.nullable(finiteNumberSchema)),
  minStrength: v.optional(dieStepOrNoneSchema),
  covers: v.optional(nullableStringSchema),
});

export const isEquipmentItem = guardFromSchema<EquipmentItem>(equipmentItemSchema);

const arcaneBackgroundSchema = v.object({
  id: v.string(),
  ru: v.string(),
  source: sourceSchema,
  skillId: nullableStringSchema,
  skillRu: nullableStringSchema,
  startingPowers: finiteNumberSchema,
  startingPowerPoints: finiteNumberSchema,
  allowedPowers: v.array(v.string()),
  description: v.string(),
  trapping: v.optional(v.string()),
  translationNote: v.optional(v.string()),
});

export const isArcaneBackground = guardFromSchema<ArcaneBackground>(arcaneBackgroundSchema);

const customSkillSchema = v.object({
  id: v.string(),
  name: v.string(),
  linkedAttribute: attributeIdSchema,
  die: dieStepOrNoneSchema,
});

export const isCustomSkill = guardFromSchema<CustomSkill>(customSkillSchema);

const customHindranceSchema = v.object({
  id: v.string(),
  name: v.string(),
  severity: hindranceSeveritySchema,
});

export const isCustomHindrance = guardFromSchema<CustomHindrance>(customHindranceSchema);

const selectedHindranceSchema = v.object({
  hindranceId: v.string(),
  severity: hindranceSeveritySchema,
});

export const isSelectedHindrance = guardFromSchema<SelectedHindrance>(selectedHindranceSchema);

const selectedEdgeSchema = v.object({ edgeId: v.string() });

export const isSelectedEdge = guardFromSchema<SelectedEdge>(selectedEdgeSchema);

const selectedEquipmentSchema = v.object({
  itemId: v.string(),
  quantity: finiteNumberSchema,
  type: v.picklist(['weapon', 'other']),
});

export const isSelectedEquipment = guardFromSchema<SelectedEquipment>(selectedEquipmentSchema);

const selectedPowerSchema = v.object({ powerId: v.string() });

export const isSelectedPower = guardFromSchema<SelectedPower>(selectedPowerSchema);
