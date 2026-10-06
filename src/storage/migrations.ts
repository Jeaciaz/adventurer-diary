import { CURRENT_SCHEMA_VERSION } from '../types';
import { promotionCount, VETERAN_EDGE_ID } from '../store/promotions';
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
  3: migratePromotionBaseline,
};

export function migratePromotionBaseline(data: unknown): unknown {
  if (!isObjectRecord(data) || isObjectRecord(objectProp(data, 'promotions'))) return data;
  const advances = objectProp(data, 'advancesUsed');
  const count = promotionCount(typeof advances === 'number' ? advances : 0);
  const edges = objectProp(data, 'edges');
  const veteran = Array.isArray(edges) && edges.some((edge: unknown) =>
    isObjectRecord(edge) && objectProp(edge, 'edgeId') === VETERAN_EDGE_ID);
  return {
    ...data,
    creationLocked: false,
    advancesUsed: Math.max(0, count - (veteran ? 4 : 0)),
    promotions: { allocations: {}, legacyBaseline: count > 0 || veteran },
  };
}

export function runMigrations(rawData: unknown, fromVersion: number): unknown {
  let data = rawData;
  for (let v = fromVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
    const migrate = migrations[v];
    if (migrate) data = migrate(data);
  }
  return data;
}
