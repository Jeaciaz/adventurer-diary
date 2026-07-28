import { CURRENT_SCHEMA_VERSION } from '../types';
import { arrayItems, isObjectRecord, isString, objectProp } from '../validation';

type Migration = (data: unknown) => unknown;

function migratePinnedPowers(data: unknown): unknown {
  if (!isObjectRecord(data)) return data;

  const powers = arrayItems(objectProp(data, 'powers')) ?? [];
  const learnedIds = new Set(
    powers.flatMap((power) => {
      if (!isObjectRecord(power)) return [];
      const powerId = objectProp(power, 'powerId');
      return isString(powerId) ? [powerId] : [];
    }),
  );
  const pinnedPowerIds = (arrayItems(objectProp(data, 'pinnedPowerIds')) ?? [])
    .filter(isString)
    .filter((powerId) => learnedIds.has(powerId));

  return { ...data, pinnedPowerIds };
}

const migrations: Record<number, Migration> = {
  2: migratePinnedPowers,
};

export function runMigrations(rawData: unknown, fromVersion: number): unknown {
  let data = rawData;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) data = migrate(data);
  }
  return data;
}
