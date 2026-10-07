import { CURRENT_SCHEMA_VERSION, type AppSettings, type Character, type PromotionAllocation } from '../types';
import { promotionCount, replayPromotions, VETERAN_EDGE_ID } from '../store/promotions';
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

// Preserve previously applied edge awards, then turn allocations into slot credits.
// This also handles exports without a schema version and runs only once per save.
export function migrateEdgeSlots(character: Character, settings: AppSettings): Character {
  const saved = Object.values(character.promotions.allocations).flat();
  if (!saved.some((allocation) => allocation.kind === 'edge' || allocation.kind === 'customEdge')) return character;
  const current = replayPromotions(character, settings).character;
  const allocations: Record<string, PromotionAllocation[]> = {};
  for (const [key, row] of Object.entries(character.promotions.allocations)) {
    allocations[key] = row.map((allocation): PromotionAllocation => {
      if (allocation.kind === 'edge') return { kind: 'edgeSlot', points: 2, edgeId: allocation.edgeId || undefined };
      if (allocation.kind === 'customEdge') return { kind: 'edgeSlot', points: 2, customEdgeId: allocation.edge.id };
      return allocation;
    });
  }
  return {
    ...character,
    edges: current.edges,
    customEdges: current.customEdges.map((edge) => character.customEdges.some((selected) => selected.id === edge.id)
      ? edge : { ...edge, countsTowardLimit: true }),
    arcaneBackgroundId: current.arcaneBackgroundId,
    promotions: { ...character.promotions, allocations },
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
