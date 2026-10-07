import { ATTRIBUTES, SKILL_BY_ID } from '../data';
import type { AppSettings, Character, PromotionAllocation } from '../types';
import { DIE_STEPS } from '../types';
import { replayPromotions } from './promotions';
import { characterPointTotalsFor, dieIndex, edgeCount } from './selectors';

function sameDice(a: Character, b: Character): boolean {
  if (ATTRIBUTES.some(({ id }) => a.attributes[id] !== b.attributes[id])) return false;
  const skillIds = new Set([...Object.keys(a.skills), ...Object.keys(b.skills)]);
  if ([...skillIds].some((id) => (a.skills[id] ?? null) !== (b.skills[id] ?? null))) return false;
  return a.customSkills.length === b.customSkills.length && a.customSkills.every((skill) =>
    skill.die === b.customSkills.find((other) => other.id === skill.id)?.die);
}

/** Move existing stat investments into an empty promotion without changing the current sheet. */
export function autoBackfillPromotion(baseline: Character, settings: AppSettings, key: string): Character | null {
  const original = replayPromotions(baseline, settings);
  const row = original.rows.find((item) => item.key === key);
  if (!row?.active || row.allocations.length > 0) return null;

  const attempt = (allocations: PromotionAllocation[], lowerBaseline: (candidate: Character) => void): Character | null => {
    const candidate = structuredClone(baseline);
    lowerBaseline(candidate);
    candidate.promotions.allocations[key] = allocations;
    const result = replayPromotions(candidate, settings);
    if (result.rows.find((item) => item.key === key)?.status !== 'applied') return null;
    if (result.rows.some((item, index) => item.key !== key && item.status !== original.rows[index]?.status)) return null;
    return sameDice(original.character, result.character) ? candidate : null;
  };

  const totals = characterPointTotalsFor(baseline, settings.freeSkillPoints, original.edgeSlots);
  if (edgeCount(baseline) > totals.edgeLimit) {
    return attempt([{ kind: 'edgeSlot', points: 2 }], () => {});
  }

  const attributes = [...ATTRIBUTES].sort((a, b) => dieIndex(baseline.attributes[b.id]) - dieIndex(baseline.attributes[a.id]));
  const attributePoints = attributes.reduce((total, { id }) => total + dieIndex(baseline.attributes[id]), 0);
  if (attributePoints > 5) {
    for (const { id } of attributes) {
      const lower = DIE_STEPS[dieIndex(baseline.attributes[id]) - 1];
      if (!lower) continue;
      const candidate = attempt([{ kind: 'attribute', attributeId: id, points: 2 }], (c) => { c.attributes[id] = lower; });
      if (candidate) return candidate;
    }
  }

  const skills = [
    ...[...SKILL_BY_ID.values()].map((skill) => ({
      id: skill.id, die: baseline.skills[skill.id], attribute: skill.linkedAttribute, custom: false,
    })),
    ...baseline.customSkills.map((skill) => ({
      id: skill.id, die: skill.die, attribute: skill.linkedAttribute, custom: true,
    })),
  ].filter((skill) => dieIndex(skill.die ?? null) > 0)
    .sort((a, b) => dieIndex(b.die ?? null) - dieIndex(a.die ?? null));

  const lowerSkill = (c: Character, skill: typeof skills[number], steps: number): void => {
    const die = DIE_STEPS[dieIndex(skill.die ?? null) - steps]!;
    if (skill.custom) c.customSkills.find((item) => item.id === skill.id)!.die = die;
    else c.skills[skill.id] = die;
  };
  const onePointSkills = skills.filter((skill) => {
    const beforeDie = skill.custom
      ? row.before.customSkills.find((item) => item.id === skill.id)?.die
      : row.before.skills[skill.id];
    return dieIndex(beforeDie ?? null) <= dieIndex(row.before.attributes[skill.attribute]);
  });
  for (let i = 0; i < onePointSkills.length; i++) {
    for (let j = i + 1; j < onePointSkills.length; j++) {
      const first = onePointSkills[i]!;
      const second = onePointSkills[j]!;
      const candidate = attempt([
        { kind: 'skill', skillId: first.id, points: 1 },
        { kind: 'skill', skillId: second.id, points: 1 },
      ], (c) => { lowerSkill(c, first, 1); lowerSkill(c, second, 1); });
      if (candidate) return candidate;
    }
  }

  const singleSkills = [...skills].sort((a, b) => {
    const aboveAttribute = (skill: typeof skills[number]) =>
      dieIndex(skill.die ?? null) > dieIndex(row.before.attributes[skill.attribute]) ? 1 : 0;
    return aboveAttribute(b) - aboveAttribute(a);
  });
  for (const skill of singleSkills) {
    for (const steps of [1, 2]) {
      if (dieIndex(skill.die ?? null) < steps) continue;
      const candidate = attempt([{ kind: 'skill', skillId: skill.id, points: 2 }], (c) => lowerSkill(c, skill, steps));
      if (candidate) return candidate;
    }
  }
  return null;
}
