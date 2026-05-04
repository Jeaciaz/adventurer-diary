import type { Character, DieStep, DieStepOrNone, Hindrance, Rank } from '../types';
import { DIE_STEPS, RANK_THRESHOLDS } from '../types';

export function dieIndex(die: DieStepOrNone): number {
  if (die == null) return -1;
  return DIE_STEPS.indexOf(die);
}

export function dieFromIndex(idx: number): DieStep {
  const step = DIE_STEPS[Math.max(0, Math.min(DIE_STEPS.length - 1, idx))];
  return step ?? 'd4';
}

/** Steps from d4 baseline. d4 = 0 steps, d12 = 4. Null = untrained. */
export function stepsFromBaseline(die: DieStepOrNone): number {
  if (die == null) return 0;
  return dieIndex(die);
}

export function attrPointsSpent(c: Character): number {
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
export function skillPointCost(skillDie: DieStepOrNone, attrDie: DieStep): number {
  if (skillDie == null) return 0;
  const skillSteps = dieIndex(skillDie); // d4=0..d12=4
  const attrSteps = dieIndex(attrDie);
  let cost = 0;
  for (let i = 0; i <= skillSteps; i++) {
    cost += i <= attrSteps ? 1 : 2;
  }
  return cost;
}

export function skillPointsSpent(
  c: Character,
  baseSkillIds: string[],
  linkedAttrFor: (skillId: string) => keyof Character['attributes'] | undefined,
): number {
  let total = 0;
  // Built-in skills (data-driven)
  for (const [skillId, die] of Object.entries(c.skills)) {
    const attrId = linkedAttrFor(skillId);
    if (!attrId) continue;
    const attrDie = c.attributes[attrId];
    let cost = skillPointCost(die, attrDie);
    // Base skills get d4 free (their start)
    if (baseSkillIds.includes(skillId) && die != null) {
      cost = Math.max(0, cost - 1);
    }
    total += cost;
  }
  // Custom skills
  for (const cs of c.customSkills) {
    if (cs.die == null) continue;
    const attrDie = c.attributes[cs.linkedAttribute];
    total += skillPointCost(cs.die, attrDie);
  }
  return total;
}

export function rankFromAdvances(advances: number): { rank: Rank; ru: string } {
  let result = RANK_THRESHOLDS[0]!;
  for (const t of RANK_THRESHOLDS) {
    if (advances >= t.minAdvances) result = t;
  }
  return { rank: result.rank, ru: result.ru };
}

export function hindrancePointsEarned(
  c: Character,
  hindranceMap: Map<string, Hindrance>,
): { minor: number; major: number; total: number } {
  let minor = 0;
  let major = 0;
  for (const sel of c.hindrances) {
    if (sel.severity === 'minor') minor += 1;
    else if (sel.severity === 'major') major += 2;
    void hindranceMap; // future use for validation
  }
  return { minor, major, total: minor + major };
}

const HINDRANCE_AGE_ID = 'starost';

export function hasAgeHindrance(c: Character): boolean {
  return c.hindrances.some((h) => h.hindranceId === HINDRANCE_AGE_ID);
}

export function skillCap(c: Character): number {
  return 12 + (hasAgeHindrance(c) ? 5 : 0);
}

export function attrCap(): number {
  return 5;
}

export function edgeCap(): number {
  // Human race auto-grants 1 free Novice edge (Разностороннее развитие).
  return 1;
}

/**
 * Unified free-points pool.
 * earned = advancesUsed × 2 + minor × 1 + major × 2
 * spent  = max(0, skillSpent − skillCap) × 1
 *        + max(0, attrSpent − 5)         × 2
 *        + max(0, edges     − edgeCap)   × 2
 */
export function computeFreePoints(args: {
  c: Character;
  hindrancePoints: { minor: number; major: number };
  skillSpent: number;
  attrSpent: number;
}): number {
  const { c, hindrancePoints, skillSpent, attrSpent } = args;
  const earned = c.advancesUsed * 2 + hindrancePoints.minor + hindrancePoints.major;
  const skillOver = Math.max(0, skillSpent - skillCap(c));
  const attrOver = Math.max(0, attrSpent - attrCap());
  const edgesOver = Math.max(0, c.edges.length - edgeCap());
  return earned - skillOver - attrOver * 2 - edgesOver * 2;
}
