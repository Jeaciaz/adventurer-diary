import type { AppSettings, Character } from '../types';

export const defaultSettings: AppSettings = {
  deadlandsEnabled: true,
  freeSkillPoints: 0,
};

export const defaultCharacter: Character = {
  name: '',
  attributes: {
    agility: 'd4',
    smarts: 'd4',
    spirit: 'd4',
    strength: 'd4',
    vigor: 'd4',
  },
  skills: {
    atletika: 'd4',
    vnimanie: 'd4',
    osvedomlionnost: 'd4',
    skrytnost: 'd4',
    ubezhdenie: 'd4',
  },
  customSkills: [],
  hindrances: [],
  customHindrances: [],
  edges: [],
  customEdges: [],
  equipment: [],
  customEquipment: [],
  arcaneBackgroundId: null,
  powers: [],
  pinnedPowerIds: [],
  powerPoints: 0,
  money: 500,
  wounds: 0,
  fatigue: 0,
  advancesUsed: 0,
  derivedStats: {
    pace: 6,
    parry: 2,
    toughness: 4,
  },
  abFilterEnabled: true,
};
