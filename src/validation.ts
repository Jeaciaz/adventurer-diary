import type {
  ArcaneBackground,
  Attribute,
  AttributeId,
  CustomSkill,
  DieStep,
  DieStepOrNone,
  Edge,
  EdgeCategory,
  EdgeRequirement,
  EquipmentCategory,
  EquipmentItem,
  Hindrance,
  HindranceSeverity,
  Power,
  Rank,
  SelectedEdge,
  SelectedEquipment,
  SelectedHindrance,
  SelectedPower,
  Skill,
  Source,
  Weapon,
  WeaponCategory,
} from './types';
import { DIE_STEPS } from './types';

type ObjectCheck = (value: object) => boolean;

const ATTRIBUTE_IDS = new Set<string>(['agility', 'smarts', 'spirit', 'strength', 'vigor']);
const RANKS = new Set<string>(['novice', 'seasoned', 'veteran', 'heroic', 'legendary']);
const SOURCES = new Set<string>(['core', 'dl']);
const HINDRANCE_SEVERITIES = new Set<string>(['minor', 'major']);
const EDGE_CATEGORIES = new Set<string>([
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
const WEAPON_CATEGORIES = new Set<string>(['melee', 'ranged', 'ammo']);
const EQUIPMENT_CATEGORIES = new Set<string>([
  'armor',
  'mount',
  'gear',
  'electronics',
  'weird-tech',
  'ammo-supplies',
  'vehicle',
]);
const DIE_STEP_SET = new Set<string>(DIE_STEPS);

export function objectProp(value: object, key: string): unknown {
  return Object.getOwnPropertyDescriptor(value, key)?.value;
}

export function isObjectRecord(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function arrayItems(value: unknown): readonly unknown[] | null {
  if (!Array.isArray(value)) return null;
  const items: readonly unknown[] = value;
  return items;
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

function isAttributeId(value: unknown): value is AttributeId {
  return isString(value) && ATTRIBUTE_IDS.has(value);
}

export function isDieStep(value: unknown): value is DieStep {
  return isString(value) && DIE_STEP_SET.has(value);
}

export function isDieStepOrNone(value: unknown): value is DieStepOrNone {
  return value === null || isDieStep(value);
}

function isRank(value: unknown): value is Rank {
  return isString(value) && RANKS.has(value);
}

function isSource(value: unknown): value is Source {
  return isString(value) && SOURCES.has(value);
}

function isHindranceSeverity(value: unknown): value is HindranceSeverity {
  return isString(value) && HINDRANCE_SEVERITIES.has(value);
}

function isEdgeCategory(value: unknown): value is EdgeCategory {
  return isString(value) && EDGE_CATEGORIES.has(value);
}

function isWeaponCategory(value: unknown): value is WeaponCategory {
  return isString(value) && WEAPON_CATEGORIES.has(value);
}

function isEquipmentCategory(value: unknown): value is EquipmentCategory {
  return isString(value) && EQUIPMENT_CATEGORIES.has(value);
}

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

function requiredProp(value: object, key: string, guard: (item: unknown) => boolean): boolean {
  return guard(objectProp(value, key));
}

function optionalProp(value: object, key: string, guard: (item: unknown) => boolean): boolean {
  const prop = objectProp(value, key);
  return prop === undefined || guard(prop);
}

function optionalNullableProp(value: object, key: string, guard: (item: unknown) => boolean): boolean {
  const prop = objectProp(value, key);
  return prop === undefined || prop === null || guard(prop);
}

function allChecks(value: object, checks: readonly ObjectCheck[]): boolean {
  return checks.every((check) => check(value));
}

function objectMatches(value: unknown, checks: readonly ObjectCheck[]): value is object {
  return isObjectRecord(value) && allChecks(value, checks);
}

function checkAll(checks: readonly ObjectCheck[]): ObjectCheck {
  return (value) => allChecks(value, checks);
}

function hasChecked(key: string, guard: (item: unknown) => boolean): ObjectCheck {
  return (value) => requiredProp(value, key, guard);
}

function hasString(key: string): ObjectCheck {
  return hasChecked(key, isString);
}

function hasOptionalString(key: string): ObjectCheck {
  return (value) => optionalProp(value, key, isString);
}

function hasOptionalNullableString(key: string): ObjectCheck {
  return (value) => optionalNullableProp(value, key, isString);
}

function hasNumber(key: string): ObjectCheck {
  return hasChecked(key, isFiniteNumber);
}

function hasOptionalNumber(key: string): ObjectCheck {
  return (value) => optionalProp(value, key, isFiniteNumber);
}

function hasOptionalNullableNumber(key: string): ObjectCheck {
  return (value) => optionalNullableProp(value, key, isFiniteNumber);
}

function hasBoolean(key: string): ObjectCheck {
  return hasChecked(key, isBoolean);
}

function hasOptionalBoolean(key: string): ObjectCheck {
  return (value) => optionalProp(value, key, isBoolean);
}

const commonDataChecks: readonly ObjectCheck[] = [
  hasString('id'),
  hasString('ru'),
  hasString('description'),
];

const attributeChecks: readonly ObjectCheck[] = [
  hasChecked('id', isAttributeId),
  hasString('ru'),
  hasString('description'),
];

export function isAttribute(value: unknown): value is Attribute {
  return objectMatches(value, attributeChecks);
}

const skillChecks: readonly ObjectCheck[] = [
  ...commonDataChecks,
  hasChecked('linkedAttribute', isAttributeId),
  hasChecked('isBase', isBoolean),
];

export function isSkill(value: unknown): value is Skill {
  return objectMatches(value, skillChecks);
}

const hindranceChecks: readonly ObjectCheck[] = [
  ...commonDataChecks,
  hasChecked('source', isSource),
  hasChecked('severityOptions', (item) => isArrayOf(item, isHindranceSeverity)),
  hasOptionalString('translationNote'),
];

export function isHindrance(value: unknown): value is Hindrance {
  return objectMatches(value, hindranceChecks);
}

const edgeRequirementChecks = new Map<string, ObjectCheck>([
  ['rank', checkAll([hasChecked('value', isRank)])],
  ['attribute', checkAll([hasChecked('attribute', isAttributeId), hasChecked('minDie', isDieStep)])],
  ['skill', checkAll([hasString('skillId'), hasChecked('minDie', isDieStep)])],
  ['edge', checkAll([hasString('edgeId')])],
  ['wildCard', () => true],
  ['other', checkAll([hasString('description')])],
]);

const invalidObjectCheck: ObjectCheck = () => false;

function edgeRequirementCheck(value: object): ObjectCheck {
  const type = objectProp(value, 'type');
  if (!isString(type)) return invalidObjectCheck;
  return edgeRequirementChecks.get(type) ?? invalidObjectCheck;
}

function isEdgeRequirement(value: unknown): value is EdgeRequirement {
  if (!isObjectRecord(value)) return false;
  return edgeRequirementCheck(value)(value);
}

const edgeChecks: readonly ObjectCheck[] = [
  ...commonDataChecks,
  hasChecked('source', isSource),
  hasChecked('category', isEdgeCategory),
  hasChecked('requirements', (item) => isArrayOf(item, isEdgeRequirement)),
  hasOptionalString('translationNote'),
];

export function isEdge(value: unknown): value is Edge {
  return objectMatches(value, edgeChecks);
}

const powerChecks: readonly ObjectCheck[] = [
  hasString('id'),
  hasString('ru'),
  hasChecked('source', isSource),
  hasChecked('rank', isRank),
  hasString('powerPoints'),
  hasString('range'),
  hasString('duration'),
  hasString('shortDescription'),
  hasString('fullDescription'),
  hasOptionalString('translationNote'),
];

export function isPower(value: unknown): value is Power {
  return objectMatches(value, powerChecks);
}

const equipmentBaseChecks: readonly ObjectCheck[] = [
  hasString('id'),
  hasString('ru'),
  hasBoolean('isWeirdWest'),
  hasNumber('cost'),
  hasNumber('weight'),
  hasString('description'),
  hasOptionalString('subcategory'),
  hasOptionalString('notes'),
];

const weaponChecks: readonly ObjectCheck[] = [
  ...equipmentBaseChecks,
  hasChecked('source', isSource),
  hasChecked('category', isWeaponCategory),
  hasChecked('minStrength', isDieStepOrNone),
  hasOptionalString('damage'),
  hasOptionalNullableString('range'),
  hasOptionalNullableNumber('rateOfFire'),
  hasOptionalNumber('armorPiercing'),
  hasOptionalNullableNumber('shots'),
  hasOptionalString('reload'),
  hasOptionalBoolean('twoHanded'),
];

export function isWeapon(value: unknown): value is Weapon {
  return objectMatches(value, weaponChecks);
}

const equipmentItemChecks: readonly ObjectCheck[] = [
  ...equipmentBaseChecks,
  hasChecked('source', isSource),
  hasChecked('category', isEquipmentCategory),
  hasOptionalNullableNumber('armor'),
  (item) => optionalNullableProp(item, 'minStrength', isDieStep),
  hasOptionalNullableString('covers'),
];

export function isEquipmentItem(value: unknown): value is EquipmentItem {
  return objectMatches(value, equipmentItemChecks);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || isString(value);
}

const arcaneBackgroundChecks: readonly ObjectCheck[] = [
  hasString('id'),
  hasString('ru'),
  hasChecked('source', isSource),
  hasChecked('skillId', isNullableString),
  hasChecked('skillRu', isNullableString),
  hasNumber('startingPowers'),
  hasNumber('startingPowerPoints'),
  hasChecked('allowedPowers', (item) => isArrayOf(item, isString)),
  hasString('description'),
  hasOptionalString('trapping'),
  hasOptionalString('translationNote'),
];

export function isArcaneBackground(value: unknown): value is ArcaneBackground {
  return objectMatches(value, arcaneBackgroundChecks);
}

const customSkillChecks: readonly ObjectCheck[] = [
  hasString('id'),
  hasString('name'),
  hasChecked('linkedAttribute', isAttributeId),
  hasChecked('die', isDieStepOrNone),
];

export function isCustomSkill(value: unknown): value is CustomSkill {
  return objectMatches(value, customSkillChecks);
}

const selectedHindranceChecks: readonly ObjectCheck[] = [
  hasString('hindranceId'),
  hasChecked('severity', isHindranceSeverity),
];

export function isSelectedHindrance(value: unknown): value is SelectedHindrance {
  return objectMatches(value, selectedHindranceChecks);
}

export function isSelectedEdge(value: unknown): value is SelectedEdge {
  return objectMatches(value, [hasString('edgeId')]);
}

function isEquipmentType(value: unknown): value is SelectedEquipment['type'] {
  return value === 'weapon' || value === 'other';
}

const selectedEquipmentChecks: readonly ObjectCheck[] = [
  hasString('itemId'),
  hasNumber('quantity'),
  hasChecked('type', isEquipmentType),
];

export function isSelectedEquipment(value: unknown): value is SelectedEquipment {
  return objectMatches(value, selectedEquipmentChecks);
}

const selectedPowerChecks: readonly ObjectCheck[] = [
  hasString('powerId'),
  hasBoolean('pinned'),
  hasNumber('order'),
];

export function isSelectedPower(value: unknown): value is SelectedPower {
  return objectMatches(value, selectedPowerChecks);
}
