import { CURRENT_SCHEMA_VERSION } from '../types';
import type { AppSettings, Character } from '../types';
import { defaultCharacter, defaultSettings } from './defaults';
import { STORAGE_KEYS } from './keys';
import { runMigrations } from './migrations';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
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
  const raw = readJson<unknown>(STORAGE_KEYS.character, defaultCharacter);
  if (stored < CURRENT_SCHEMA_VERSION) {
    const migrated = runMigrations(raw, stored) as Character;
    writeSchemaVersion(CURRENT_SCHEMA_VERSION);
    writeJson(STORAGE_KEYS.character, migrated);
    return migrated;
  }
  return { ...defaultCharacter, ...(raw as Partial<Character>) };
}

export function saveCharacter(c: Character): void {
  writeJson(STORAGE_KEYS.character, c);
  writeSchemaVersion(CURRENT_SCHEMA_VERSION);
}

export function loadSettings(): AppSettings {
  return readJson<AppSettings>(STORAGE_KEYS.settings, defaultSettings);
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
  const parsed = JSON.parse(json) as {
    schemaVersion?: number;
    character?: unknown;
    settings?: unknown;
    portrait?: string | null;
  };
  const fromVersion = parsed.schemaVersion ?? CURRENT_SCHEMA_VERSION;
  const character =
    fromVersion < CURRENT_SCHEMA_VERSION
      ? (runMigrations(parsed.character, fromVersion) as Character)
      : (parsed.character as Character);
  return {
    character: { ...defaultCharacter, ...character },
    settings: { ...defaultSettings, ...((parsed.settings as Partial<AppSettings>) ?? {}) },
    portrait: parsed.portrait ?? null,
  };
}
