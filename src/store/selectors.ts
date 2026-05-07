import type { Character, CustomSkill, DieStep, DieStepOrNone, Hindrance, Rank } from '../types';
import { DIE_STEPS, RANK_THRESHOLDS } from '../types';

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

export function edgeCap(): number {
  return 2;
}

/**
 * Unified free-points pool.
 * earned = advancesUsed × 2 + minor × 1 + major × 2
 * spent  = max(0, skillSpent − skillCap) × 1
 *        + max(0, attrSpent − 5)         × 2
 *        + max(0, edges     − edgeCap)   × 2
 */
function computeFreePoints(args: {
  c: Character;
  hindrancePoints: { minor: number; major: number };
  skillSpent: number;
  attrSpent: number;
  freeSkillPoints?: number;
}): number {
  const { c, hindrancePoints, skillSpent, attrSpent, freeSkillPoints = 0 } = args;
  const earned = c.advancesUsed * 2 + hindrancePoints.minor + hindrancePoints.major;
  const skillOver = Math.max(0, skillSpent - skillCap(c, freeSkillPoints));
  const attrOver = Math.max(0, attrSpent - attrCap());
  const edgesOver = Math.max(0, c.edges.length - edgeCap());
  return earned - skillOver - attrOver * 2 - edgesOver * 2;
}

export function characterPointTotals(args: {
  c: Character;
  baseSkillIds: string[];
  linkedAttrFor: (skillId: string) => keyof Character['attributes'] | undefined;
  hindranceMap: Map<string, Hindrance>;
  freeSkillPoints?: number;
}): {
  skillSpent: number;
  attrSpent: number;
  currentSkillCap: number;
  hindrancePoints: { minor: number; major: number; total: number };
  free: number;
} {
  const { c, baseSkillIds, linkedAttrFor, hindranceMap, freeSkillPoints = 0 } = args;
  const skillSpent = skillPointsSpent(c, baseSkillIds, linkedAttrFor);
  const attrSpent = attrPointsSpent(c);
  const hindrancePoints = hindrancePointsEarned(c, hindranceMap);
  return {
    skillSpent,
    attrSpent,
    currentSkillCap: skillCap(c, freeSkillPoints),
    hindrancePoints,
    free: computeFreePoints({ c, hindrancePoints, skillSpent, attrSpent, freeSkillPoints }),
  };
}
