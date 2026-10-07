import { ARCANE_BACKGROUND_BY_ID, ATTRIBUTES, BASE_SKILL_IDS, EDGE_BY_ID, SKILL_BY_ID } from '../data';
import type { AppSettings, Character, EdgeRequirement, PromotionAllocation } from '../types';
import { DIE_STEPS, RANK_THRESHOLDS } from '../types';
import { dieIndex, rankFromAdvances } from './selectors';

export const VETERAN_EDGE_ID = 'veteran-o-the-weird-west';
export const MAX_PROMOTIONS = 1000;
const REPEATABLE_EDGES = new Set(['novye-sily', 'vernye-sputniki', 'flock', 'punkty-sily']);

export interface PromotionRow {
  key: string;
  number: number;
  origin: 'veteran' | 'earned' | 'bonus';
  active: boolean;
  allocations: PromotionAllocation[];
}

export interface PromotionResult extends PromotionRow {
  status: 'empty' | 'applied' | 'invalid' | 'inactive';
  error?: string;
  warnings: string[];
  changes: string[];
  before: Character;
}

export function promotionCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_PROMOTIONS, Math.max(0, Math.trunc(value)));
}

export function veteranPromotions(c: Character): number {
  return c.edges.some((edge) => edge.edgeId === VETERAN_EDGE_ID) ? 4 : 0;
}

export function promotionRows(c: Character, settings: AppSettings): PromotionRow[] {
  const allocations = c.promotions.allocations;
  const starting = veteranPromotions(c);
  const rows: PromotionRow[] = [];
  const add = (key: string, number: number, origin: PromotionRow['origin'], active: boolean) => {
    rows.push({ key, number, origin, active, allocations: allocations[key] ?? [] });
  };
  const hasVeteranSelections = Object.keys(allocations).some((key) => key.startsWith('veteran-'));
  if (starting > 0 || hasVeteranSelections) {
    for (let n = 1; n <= 4; n++) add(`veteran-${n}`, n, 'veteran', starting > 0);
  }
  const savedCount = Math.max(0, ...Object.keys(allocations).map((key) => {
    const match = /^earned-(\d+)(?:-bonus)?$/.exec(key);
    return match ? promotionCount(Number(match[1])) : 0;
  }));
  const earned = promotionCount(c.advancesUsed);
  for (let n = 1; n <= Math.max(earned, savedCount); n++) {
    const number = starting + n;
    add(`earned-${n}`, number, 'earned', n <= earned);
    const bonusKey = `earned-${n}-bonus`;
    if (number % 4 === 0 && (settings.doubleEveryFourthPromotion || allocations[bonusKey])) {
      add(bonusKey, number, 'bonus', n <= earned && settings.doubleEveryFourthPromotion);
    }
  }
  return rows;
}

function copyStats(c: Character): Character {
  return {
    ...c,
    attributes: { ...c.attributes },
    skills: { ...c.skills },
    customSkills: c.customSkills.map((skill) => ({ ...skill })),
    edges: c.edges.map((edge) => ({ ...edge })),
    customEdges: c.customEdges.map((edge) => ({ ...edge })),
  };
}

function skillInfo(c: Character, id: string) {
  const builtin = SKILL_BY_ID.get(id);
  if (builtin) {
    return { name: builtin.ru, attribute: builtin.linkedAttribute, die: c.skills[id] ?? (builtin.isBase ? 'd4' as const : null) };
  }
  const custom = c.customSkills.find((skill) => skill.id === id);
  if (custom) return { name: custom.name, attribute: custom.linkedAttribute, die: custom.die };
  return null;
}

function setSkillDie(c: Character, id: string, die: Character['attributes']['agility']): void {
  if (SKILL_BY_ID.has(id)) c.skills[id] = die;
  else {
    const custom = c.customSkills.find((skill) => skill.id === id);
    if (custom) custom.die = die;
  }
}

export function requirementWarning(requirement: EdgeRequirement, c: Character): string | null {
  switch (requirement.type) {
    case 'rank': {
      const rank = rankFromAdvances(c.advancesUsed).rank;
      const ranks = RANK_THRESHOLDS.map((item) => item.rank);
      return ranks.indexOf(rank) < ranks.indexOf(requirement.value) ? 'Не выполнено требование ранга.' : null;
    }
    case 'attribute':
      return dieIndex(c.attributes[requirement.attribute]) < dieIndex(requirement.minDie)
        ? `Требуется ${ATTRIBUTES.find((attr) => attr.id === requirement.attribute)?.ru}: ${requirement.minDie}.` : null;
    case 'skill':
      return dieIndex(skillInfo(c, requirement.skillId)?.die ?? null) < dieIndex(requirement.minDie)
        ? `Требуется ${skillInfo(c, requirement.skillId)?.name ?? requirement.skillId}: ${requirement.minDie}.` : null;
    case 'edge':
      if (requirement.edgeId === 'misticheskii-dar' && c.arcaneBackgroundId != null) return null;
      return c.edges.some((edge) => edge.edgeId === requirement.edgeId)
        ? null : `Требуется черта «${EDGE_BY_ID.get(requirement.edgeId)?.ru ?? requirement.edgeId}».`;
    case 'wildCard': return null;
    case 'other': return `Проверьте условие: ${requirement.description}`;
  }
}

export function edgeRequirementWarnings(c: Character): string[] {
  return c.edges.flatMap(({ edgeId }) => (EDGE_BY_ID.get(edgeId)?.requirements ?? [])
    .map((requirement) => requirementWarning(requirement, c))
    .filter((warning): warning is string => warning != null));
}

function applyAllocation(c: Character, allocation: PromotionAllocation, changes: string[], promotedCustomEdges: Set<string>): string | null {
  switch (allocation.kind) {
    case 'edgeSlot': {
      const name = allocation.customEdgeId
        ? c.customEdges.find((edge) => edge.id === allocation.customEdgeId)?.name
        : EDGE_BY_ID.get(allocation.edgeId ?? '')?.ru;
      changes.push(`Лимит черт +1${name ? ` · ${name}` : ''}`);
      return null;
    }
    case 'attribute': {
      const before = c.attributes[allocation.attributeId];
      const after = DIE_STEPS[dieIndex(before) + 1];
      if (!after) return 'Параметр уже достиг d12.';
      c.attributes[allocation.attributeId] = after;
      changes.push(`${ATTRIBUTES.find((attr) => attr.id === allocation.attributeId)?.ru}: ${before} → ${after}`);
      return null;
    }
    case 'learnSkill': {
      if (allocation.customSkill && !skillInfo(c, allocation.skillId)) {
        if (allocation.customSkill.id !== allocation.skillId || !allocation.customSkill.name.trim()) return 'Укажите название своего навыка.';
        c.customSkills.push({ ...allocation.customSkill, die: null });
      }
      const skill = skillInfo(c, allocation.skillId);
      if (!skill) return 'Навык удалён или не найден.';
      if (skill.die != null) return `Навык «${skill.name}» уже изучен. Выберите повышение навыка.`;
      setSkillDie(c, allocation.skillId, 'd4');
      changes.push(`${skill.name}: — → d4`);
      return null;
    }
    case 'skill': {
      const skill = skillInfo(c, allocation.skillId);
      if (!skill || skill.die == null) return 'Нельзя повысить неизученный или удалённый навык.';
      let die = skill.die;
      let remaining = allocation.points;
      while (remaining > 0) {
        const after = DIE_STEPS[dieIndex(die) + 1];
        if (!after) return `Навык «${skill.name}» уже достиг d12.`;
        const cost = dieIndex(die) < dieIndex(c.attributes[skill.attribute]) ? 1 : 2;
        if (remaining < cost) return `На следующий шаг навыка «${skill.name}» нужно ${cost} очка.`;
        remaining -= cost;
        die = after;
      }
      setSkillDie(c, allocation.skillId, die);
      changes.push(`${skill.name}: ${skill.die} → ${die}`);
      return null;
    }
    case 'edge': {
      const edge = EDGE_BY_ID.get(allocation.edgeId);
      if (!edge) return 'Черта не найдена.';
      if (edge.id === VETERAN_EDGE_ID) return '«Ветеран Дикого Запада» выбирается при создании персонажа.';
      if (edge.id === 'misticheskii-dar') {
        if (!allocation.arcaneBackgroundId || !ARCANE_BACKGROUND_BY_ID.has(allocation.arcaneBackgroundId)) return 'Выберите мистический дар.';
        if (c.arcaneBackgroundId != null) return 'Мистический дар уже выбран.';
        c.arcaneBackgroundId = allocation.arcaneBackgroundId;
      }
      const existing = c.edges.find((selected) => selected.edgeId === edge.id);
      if (existing && !REPEATABLE_EDGES.has(edge.id)) return `Черта «${edge.ru}» уже выбрана.`;
      if (existing) existing.count = (existing.count ?? 1) + 1;
      else c.edges.push({ edgeId: edge.id });
      changes.push(`Черта: ${edge.ru}`);
      return null;
    }
    case 'customEdge':
      if (promotedCustomEdges.has(allocation.edge.id)) return 'Своя черта уже выбрана в другом повышении.';
      if (!allocation.edge.name.trim()) return 'Укажите название своей черты.';
      if (!c.customEdges.some((edge) => edge.id === allocation.edge.id)) c.customEdges.push({ ...allocation.edge });
      changes.push(`Черта: ${allocation.edge.name}`);
      return null;
  }
}

function allocationIncomplete(allocation: PromotionAllocation): boolean {
  switch (allocation.kind) {
    case 'edgeSlot': return false;
    case 'attribute': return false;
    case 'skill': return !allocation.skillId;
    case 'learnSkill': return !allocation.skillId || (allocation.customSkill != null && !allocation.customSkill.name.trim());
    case 'edge': return !allocation.edgeId || (allocation.edgeId === 'misticheskii-dar' && !allocation.arcaneBackgroundId);
    case 'customEdge': return !allocation.edge.name.trim();
  }
}

export function replayPromotions(baseline: Character, settings: AppSettings): { character: Character; rows: PromotionResult[]; edgeSlots: number } {
  let character = copyStats(baseline);
  // Core skills cannot be unlearned, including when importing older saves.
  for (const id of BASE_SKILL_IDS) character.skills[id] ??= 'd4';
  const rows: PromotionResult[] = [];
  const attributeRanks = new Set<string>();
  let lastLegendaryAttribute = -Infinity;
  const powerPointRanks = new Set<string>();
  const promotedCustomEdges = new Set<string>();
  for (const row of promotionRows(baseline, settings)) {
    const before = { ...character, advancesUsed: row.number };
    const result: PromotionResult = { ...row, before, status: 'empty', warnings: [], changes: [] };
    rows.push(result);
    if (!row.active) { result.status = 'inactive'; continue; }
    if (row.allocations.length === 0 || row.allocations.some(allocationIncomplete)) continue;
    if (row.allocations.reduce((total, item) => total + item.points, 0) !== 2) {
      result.status = 'invalid';
      result.error = 'Распределите ровно 2 очка или оставьте повышение пустым.';
      continue;
    }
    const candidate = copyStats(before);
    for (const allocation of row.allocations) {
      const error = applyAllocation(candidate, allocation, result.changes, promotedCustomEdges);
      if (error) { result.error = error; break; }
      if (allocation.kind === 'edge') {
        result.warnings.push(...(EDGE_BY_ID.get(allocation.edgeId)?.requirements ?? [])
          .map((requirement) => requirementWarning(requirement, before))
          .filter((warning): warning is string => warning != null));
      }
      if (allocation.kind === 'edgeSlot') {
        const selected = allocation.customEdgeId
          ? before.customEdges.some((edge) => edge.id === allocation.customEdgeId)
          : before.edges.some((edge) => edge.edgeId === allocation.edgeId);
        if ((allocation.edgeId || allocation.customEdgeId) && !selected) {
          result.warnings.push('Указанная черта удалена. Лимит черт всё равно увеличивается.');
        } else if (allocation.edgeId) {
          result.warnings.push(...(EDGE_BY_ID.get(allocation.edgeId)?.requirements ?? [])
            .map((requirement) => requirementWarning(requirement, before))
            .filter((warning): warning is string => warning != null));
        }
      }
    }
    if (result.error) { result.status = 'invalid'; result.changes = []; continue; }
    const rank = rankFromAdvances(row.number).rank;
    for (const allocation of row.allocations) {
      if (allocation.kind === 'customEdge') promotedCustomEdges.add(allocation.edge.id);
      if (allocation.kind === 'attribute') {
        if (rank === 'legendary') {
          if (row.number - lastLegendaryAttribute < 2) result.warnings.push('На ранге Легенда параметр повышается не чаще, чем через одно повышение.');
          lastLegendaryAttribute = row.number;
        } else {
          if (attributeRanks.has(rank)) result.warnings.push('Параметр уже повышался на этом ранге.');
          attributeRanks.add(rank);
        }
      }
      if ((allocation.kind === 'edge' || allocation.kind === 'edgeSlot') && allocation.edgeId === 'punkty-sily' && rank !== 'legendary') {
        if (powerPointRanks.has(rank)) result.warnings.push('«Пункты силы» уже выбраны на этом ранге.');
        powerPointRanks.add(rank);
      }
    }
    result.status = 'applied';
    character = candidate;
  }
  character.advancesUsed = promotionCount(baseline.advancesUsed) + veteranPromotions(baseline);
  const edgeSlots = rows.reduce((total, row) => total + (row.status === 'applied'
    ? row.allocations.filter((allocation) => allocation.kind === 'edgeSlot').length : 0), 0);
  return { character, rows, edgeSlots };
}
