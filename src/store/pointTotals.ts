import { createMemo } from 'solid-js';
import type { Character } from '../types';
import { characterPointTotalsFor } from './selectors';

export function createCharacterPointTotalsMemo(
  character: () => Character,
  freeSkillPoints: () => number,
  promotionEdgeSlots?: () => number,
) {
  return createMemo(() => characterPointTotalsFor(character(), freeSkillPoints(), promotionEdgeSlots?.()));
}
