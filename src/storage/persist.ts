import { CURRENT_SCHEMA_VERSION } from '../types';
import type { AppSettings, Character } from '../types';
import {
  arrayItems,
  isBoolean,
  isCustomHindrance,
  isCustomSkill,
  isDieStep,
  isDieStepOrNone,
  isFiniteNumber,
  isObjectRecord,
  isSelectedEdge,
  isSelectedEquipment,
  isSelectedHindrance,
  isSelectedPower,
  isString,
  objectProp,
} from '../validation';
import { defaultCharacter, defaultSettings } from './defaults';
import { STORAGE_KEYS } from './keys';
import { runMigrations } from './migrations';

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return parsed;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('localStorage write failed', key, err);
  }
}

function readSchemaVersion(): number {
  const raw = localStorage.getItem(STORAGE_KEYS.schemaVersion);
  if (raw == null) return CURRENT_SCHEMA_VERSION;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : CURRENT_SCHEMA_VERSION;
}

function writeSchemaVersion(v: number): void {
  localStorage.setItem(STORAGE_KEYS.schemaVersion, String(v));
}

export function loadCharacter(): Character {
  const stored = readSchemaVersion();
  const raw = readJson(STORAGE_KEYS.character);
  if (stored < CURRENT_SCHEMA_VERSION) {
    const migrated = mergeCharacter(runMigrations(raw, stored));
    writeSchemaVersion(CURRENT_SCHEMA_VERSION);
    writeJson(STORAGE_KEYS.character, migrated);
    return migrated;
  }
  return mergeCharacter(raw);
}

export function saveCharacter(c: Character): void {
  writeJson(STORAGE_KEYS.character, c);
  writeSchemaVersion(CURRENT_SCHEMA_VERSION);
}

export function loadSettings(): AppSettings {
  return mergeSettings(readJson(STORAGE_KEYS.settings));
}

export function saveSettings(s: AppSettings): void {
  writeJson(STORAGE_KEYS.settings, s);
}

export function loadPortrait(): string | null {
  return localStorage.getItem(STORAGE_KEYS.portrait);
}

export function savePortrait(base64: string | null): void {
  if (base64 == null) localStorage.removeItem(STORAGE_KEYS.portrait);
  else localStorage.setItem(STORAGE_KEYS.portrait, base64);
}

export function resetCharacter(): void {
  localStorage.removeItem(STORAGE_KEYS.character);
  localStorage.removeItem(STORAGE_KEYS.portrait);
}

export function exportCharacterJson(c: Character, settings: AppSettings, portrait: string | null): string {
  return JSON.stringify(
    {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      character: c,
      settings,
      portrait,
    },
    null,
    2,
  );
}

export interface ImportedBundle {
  character: Character;
  settings: AppSettings;
  portrait: string | null;
}

export function importCharacterJson(json: string): ImportedBundle {
  const parsed: unknown = JSON.parse(json);
  const source = isObjectRecord(parsed) ? parsed : null;
  const schemaVersion = schemaVersionFrom(source);
  return {
    character: mergeCharacter(importedCharacterSource(source, schemaVersion)),
    settings: mergeSettings(source == null ? undefined : objectProp(source, 'settings')),
    portrait: parsePortrait(source == null ? undefined : objectProp(source, 'portrait')),
  };
}

function importedCharacterSource(source: object | null, schemaVersion: number): unknown {
  const characterSource = source == null ? undefined : objectProp(source, 'character');
  if (schemaVersion < CURRENT_SCHEMA_VERSION) return runMigrations(characterSource, schemaVersion);
  return characterSource;
}

function schemaVersionFrom(source: object | null): number {
  if (source == null) return CURRENT_SCHEMA_VERSION;
  const value = objectProp(source, 'schemaVersion');
  return isFiniteNumber(value) ? value : CURRENT_SCHEMA_VERSION;
}

function propFrom(source: unknown, key: string): unknown {
  if (!isObjectRecord(source)) return undefined;
  return objectProp(source, key);
}

function stringField(source: unknown, key: string, fallback: string): string {
  const value = propFrom(source, key);
  return isString(value) ? value : fallback;
}

function numberField(source: unknown, key: string, fallback: number): number {
  const value = propFrom(source, key);
  return isFiniteNumber(value) ? value : fallback;
}

function booleanField(source: unknown, key: string, fallback: boolean): boolean {
  const value = propFrom(source, key);
  return isBoolean(value) ? value : fallback;
}

function nullableStringField(source: unknown, key: string, fallback: string | null): string | null {
  const value = propFrom(source, key);
  if (value === null) return null;
  return isString(value) ? value : fallback;
}

function parseAttributes(value: unknown): Character['attributes'] {
  const source = isObjectRecord(value) ? value : null;
  return {
    agility: dieField(source, 'agility', defaultCharacter.attributes.agility),
    smarts: dieField(source, 'smarts', defaultCharacter.attributes.smarts),
    spirit: dieField(source, 'spirit', defaultCharacter.attributes.spirit),
    strength: dieField(source, 'strength', defaultCharacter.attributes.strength),
    vigor: dieField(source, 'vigor', defaultCharacter.attributes.vigor),
  };
}

function dieField(source: object | null, key: string, fallback: Character['attributes']['agility']) {
  if (source == null) return fallback;
  const value = objectProp(source, key);
  return isDieStep(value) ? value : fallback;
}

function parseSkills(value: unknown): Character['skills'] {
  const result: Character['skills'] = { ...defaultCharacter.skills };
  if (!isObjectRecord(value)) return result;
  for (const key of Object.keys(value)) {
    const die = objectProp(value, key);
    if (isDieStepOrNone(die)) result[key] = die;
  }
  return result;
}

function parseArray<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  const items = arrayItems(value);
  if (items == null) return [];
  return items.filter(guard);
}

function parseStringArray(value: unknown): string[] {
  const items = arrayItems(value);
  if (items == null) return [];
  return items.filter(isString);
}

function parseDerivedStats(value: unknown): Character['derivedStats'] {
  return {
    pace: numberField(value, 'pace', defaultCharacter.derivedStats.pace),
    parry: numberField(value, 'parry', defaultCharacter.derivedStats.parry),
    toughness: numberField(value, 'toughness', defaultCharacter.derivedStats.toughness),
  };
}

function mergeCharacter(value: unknown): Character {
  return {
    name: stringField(value, 'name', defaultCharacter.name),
    attributes: parseAttributes(propFrom(value, 'attributes')),
    skills: parseSkills(propFrom(value, 'skills')),
    customSkills: parseArray(propFrom(value, 'customSkills'), isCustomSkill),
    hindrances: parseArray(propFrom(value, 'hindrances'), isSelectedHindrance),
    customHindrances: parseArray(propFrom(value, 'customHindrances'), isCustomHindrance),
    edges: parseArray(propFrom(value, 'edges'), isSelectedEdge),
    equipment: parseArray(propFrom(value, 'equipment'), isSelectedEquipment),
    arcaneBackgroundId: nullableStringField(value, 'arcaneBackgroundId', defaultCharacter.arcaneBackgroundId),
    powers: parseArray(propFrom(value, 'powers'), isSelectedPower),
    pinnedPowerIds: parseStringArray(propFrom(value, 'pinnedPowerIds')),
    powerPoints: numberField(value, 'powerPoints', defaultCharacter.powerPoints),
    money: numberField(value, 'money', defaultCharacter.money),
    wounds: numberField(value, 'wounds', defaultCharacter.wounds),
    fatigue: numberField(value, 'fatigue', defaultCharacter.fatigue),
    advancesUsed: numberField(value, 'advancesUsed', defaultCharacter.advancesUsed),
    derivedStats: parseDerivedStats(propFrom(value, 'derivedStats')),
    abFilterEnabled: booleanField(value, 'abFilterEnabled', defaultCharacter.abFilterEnabled),
  };
}

function mergeSettings(value: unknown): AppSettings {
  return {
    deadlandsEnabled: booleanField(value, 'deadlandsEnabled', defaultSettings.deadlandsEnabled),
    freeSkillPoints: numberField(value, 'freeSkillPoints', defaultSettings.freeSkillPoints),
  };
}

function parsePortrait(value: unknown): string | null {
  if (value === null) return null;
  return isString(value) ? value : null;
}
