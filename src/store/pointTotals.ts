import { createMemo } from 'solid-js';
import { BASE_SKILL_IDS, HINDRANCE_BY_ID, SKILL_BY_ID } from '../data';
import type { AttributeId, Character } from '../types';
import { characterPointTotals } from './selectors';

function characterPointTotalsFor(c: Character, freeSkillPoints = 0) {
  const linkedAttrFor = (skillId: string): AttributeId | undefined => {
    const builtin = SKILL_BY_ID.get(skillId);
    if (builtin) return builtin.linkedAttribute;
    return c.customSkills.find((skill) => skill.id === skillId)?.linkedAttribute;
  };

  return characterPointTotals({
    c,
    baseSkillIds: BASE_SKILL_IDS,
    linkedAttrFor,
    hindranceMap: HINDRANCE_BY_ID,
    freeSkillPoints,
  });
}

export function createCharacterPointTotalsMemo(
  character: () => Character,
  freeSkillPoints: () => number,
) {
  return createMemo(() => characterPointTotalsFor(character(), freeSkillPoints()));
}
