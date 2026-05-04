import { CURRENT_SCHEMA_VERSION } from '../types';

type Migration = (data: unknown) => unknown;

const migrations: Record<number, Migration> = {
  // Future: migrations[2] = (data) => { ... }
};

export function runMigrations(rawData: unknown, fromVersion: number): unknown {
  let data = rawData;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) data = migrate(data);
  }
  return data;
}
