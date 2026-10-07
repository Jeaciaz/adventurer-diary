import type { Character, CustomSkill, DieStep, DieStepOrNone, Hindrance, Rank } from '../types';
import { DIE_STEPS, RANK_THRESHOLDS } from '../types';
import { BASE_SKILL_IDS, HINDRANCE_BY_ID, SKILL_BY_ID } from '../data';

export function dieIndex(die: DieStepOrNone): number {
  if (die == null) return -1;
  return DIE_STEPS.indexOf(die);
}

function attrPointsSpent(c: Character): number {
  let total = 0;
  for (const attr of Object.values(c.attributes)) {
    total += dieIndex(attr); // d4=0, d6=1, ..., d12=4
  }
  return total;
}

/**
 * Skill point cost rules:
 * - 1 pt per step up to linked attribute
 * - 2 pts per step above linked attribute
 * - Untrained (null) = 0 cost
 * - d4 costs 1 point for regular skills
 * - Base skills start at d4 free; caller subtracts that first step.
 */
function skillPointCost(skillDie: DieStepOrNone, attrDie: DieStep): number {
  if (skillDie == null) return 0;
  const skillSteps = dieIndex(skillDie); // d4=0..d12=4
  const attrSteps = dieIndex(attrDie);
  let cost = 0;
  for (let i = 0; i <= skillSteps; i++) {
    cost += i <= attrSteps ? 1 : 2;
  }
  return cost;
}

function baseSkillDiscount(baseSkillIds: string[], skillId: string, die: DieStepOrNone): number {
  return baseSkillIds.includes(skillId) && die != null ? 1 : 0;
}

function builtinSkillPoints(
  c: Character,
  skillId: string,
  die: DieStepOrNone,
  baseSkillIds: string[],
  linkedAttrFor: (skillId: string) => keyof Character['attributes'] | undefined,
): number {
  const attrId = linkedAttrFor(skillId);
  if (!attrId) return 0;
  const cost = skillPointCost(die, c.attributes[attrId]);
  return Math.max(0, cost - baseSkillDiscount(baseSkillIds, skillId, die));
}

function customSkillPoints(c: Character, skill: CustomSkill): number {
  if (skill.die == null) return 0;
  return skillPointCost(skill.die, c.attributes[skill.linkedAttribute]);
}

function skillPointsSpent(
  c: Character,
  baseSkillIds: string[],
  linkedAttrFor: (skillId: string) => keyof Character['attributes'] | undefined,
): number {
  let total = 0;
  for (const [skillId, die] of Object.entries(c.skills)) {
    total += builtinSkillPoints(c, skillId, die, baseSkillIds, linkedAttrFor);
  }
  for (const cs of c.customSkills) {
    total += customSkillPoints(c, cs);
  }
  return total;
}

export function rankFromAdvances(advances: number): { rank: Rank; ru: string } {
  const firstRank = RANK_THRESHOLDS[0];
  if (firstRank == null) throw new Error('RANK_THRESHOLDS must not be empty');
  let result = firstRank;
  for (const t of RANK_THRESHOLDS) {
    if (advances >= t.minAdvances) result = t;
  }
  return { rank: result.rank, ru: result.ru };
}

export function hindrancePointsEarned(
  c: Character,
  hindranceMap: Map<string, Hindrance>,
): { minor: number; major: number; total: number } {
  void hindranceMap; // future use for validation
  const severities = [
    ...c.hindrances.map((h) => h.severity),
    ...c.customHindrances.map((h) => h.severity),
  ];
  const minor = severities.filter((s) => s === 'minor').length;
  const major = severities.filter((s) => s === 'major').length * 2;
  return { minor, major, total: minor + major };
}

const HINDRANCE_AGE_ID = 'starost';

function hasAgeHindrance(c: Character): boolean {
  return c.hindrances.some((h) => h.hindranceId === HINDRANCE_AGE_ID);
}

function skillCap(c: Character, freeSkillPoints = 0): number {
  return 12 + freeSkillPoints + (hasAgeHindrance(c) ? 5 : 0);
}

function attrCap(): number {
  return 5;
}

export function edgeCap(promotionSlots = 0): number {
  return 2 + promotionSlots;
}

export function edgeCount(c: Character): number {
  return c.edges.reduce((total, edge) => total + (edge.edgeId === 'misticheskii-dar' ? 0 : Math.max(1, edge.count ?? 1)),
    c.customEdges.filter((edge) => edge.countsTowardLimit === true).length);
}

export function characterPointTotals(args: {
  c: Character;
  baseSkillIds: string[];
  linkedAttrFor: (skillId: string) => keyof Character['attributes'] | undefined;
  hindranceMap: Map<string, Hindrance>;
  freeSkillPoints?: number;
  promotionEdgeSlots?: number;
}): {
  skillSpent: number;
  attrSpent: number;
  currentSkillCap: number;
  hindrancePoints: { minor: number; major: number; total: number };
  edgeLimit: number;
  free: number;
} {
  const { c, baseSkillIds, linkedAttrFor, hindranceMap, freeSkillPoints = 0, promotionEdgeSlots = 0 } = args;
  const skillSpent = skillPointsSpent(c, baseSkillIds, linkedAttrFor);
  const attrSpent = attrPointsSpent(c);
  const hindrancePoints = hindrancePointsEarned(c, hindranceMap);
  const currentSkillCap = skillCap(c, freeSkillPoints);
  const skillOver = Math.max(0, skillSpent - currentSkillCap);
  const attrOver = Math.max(0, attrSpent - attrCap());
  const pointsForEdges = hindrancePoints.total - skillOver - attrOver * 2;
  const baseEdgeLimit = edgeCap(promotionEdgeSlots);
  return {
    skillSpent,
    attrSpent,
    currentSkillCap,
    hindrancePoints,
    edgeLimit: baseEdgeLimit + Math.floor(Math.max(0, pointsForEdges) / 2),
    // Affordable extra slots still consume hindrance points; only promotion slots are free.
    free: pointsForEdges - Math.max(0, edgeCount(c) - baseEdgeLimit) * 2,
  };
}

export function characterPointTotalsFor(c: Character, freeSkillPoints = 0, promotionEdgeSlots = 0) {
  return characterPointTotals({
    c,
    baseSkillIds: BASE_SKILL_IDS,
    linkedAttrFor: (id) => SKILL_BY_ID.get(id)?.linkedAttribute
      ?? c.customSkills.find((skill) => skill.id === id)?.linkedAttribute,
    hindranceMap: HINDRANCE_BY_ID,
    freeSkillPoints,
    promotionEdgeSlots,
  });
}
