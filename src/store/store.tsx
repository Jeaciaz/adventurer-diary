import { createContext, createMemo, useContext, type JSX, type ParentProps } from 'solid-js';
import { createStore, produce, type SetStoreFunction } from 'solid-js/store';
import { createEffect } from 'solid-js';
import type {
  AppSettings,
  AttributeId,
  Character,
  CustomEquipment,
  CustomEdge,
  CustomHindrance,
  CustomPower,
  CustomSkill,
  DieStep,
  DieStepOrNone,
  HindranceSeverity,
  SelectedEdge,
  SelectedEquipment,
  SelectedHindrance,
  SelectedPower,
} from '../types';
import {
  loadCharacter,
  loadPortrait,
  loadSettings,
  resetCharacter as clearStorage,
  saveCharacter,
  savePortrait,
  saveSettings,
} from '../storage/persist';
import { defaultCharacter } from '../storage/defaults';
import { ARCANE_BACKGROUND_BY_ID } from '../data';
import { promotionCount, replayPromotions, veteranPromotions } from './promotions';
import { edgeCap } from './selectors';

interface StoreShape {
  character: Character;
  settings: AppSettings;
  portrait: string | null;
}

interface StoreApi {
  state: StoreShape;
  actions: ReturnType<typeof makeActions>;
  currentCharacter: () => Character;
  sheetCharacter: () => Character;
  promotionResults: () => ReturnType<typeof replayPromotions>;
  edgeLimit: () => number;
}

const StoreCtx = createContext<StoreApi>();

function makeActions(set: SetStoreFunction<StoreShape>, state: StoreShape, currentCharacter: () => Character) {
  return {
    setName(name: string) {
      set('character', 'name', name);
    },
    setPortrait(base64: string | null) {
      set('portrait', base64);
      savePortrait(base64);
    },
    setAttribute(id: AttributeId, die: DieStep) {
      if (state.character.creationLocked) return;
      set('character', 'attributes', id, die);
    },
    setSkill(skillId: string, die: DieStepOrNone) {
      if (state.character.creationLocked) return;
      set(
        'character',
        'skills',
        produce((s: Record<string, DieStepOrNone>) => {
          if (die == null) delete s[skillId];
          else s[skillId] = die;
        }),
      );
    },
    addCustomSkill(skill: CustomSkill) {
      if (state.character.creationLocked) return;
      set('character', 'customSkills', (xs) => [...xs, skill]);
    },
    updateCustomSkill(id: string, patch: Partial<CustomSkill>) {
      if (state.character.creationLocked) return;
      set('character', 'customSkills', (xs) =>
        xs.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      );
    },
    removeCustomSkill(id: string) {
      if (state.character.creationLocked) return;
      set('character', 'customSkills', (xs) => xs.filter((x) => x.id !== id));
    },
    addHindrance(h: SelectedHindrance) {
      if (state.character.creationLocked) return;
      set('character', 'hindrances', (xs) => [...xs, h]);
    },
    removeHindrance(hindranceId: string) {
      if (state.character.creationLocked) return;
      set('character', 'hindrances', (xs) => xs.filter((x) => x.hindranceId !== hindranceId));
    },
    setHindranceSeverity(hindranceId: string, severity: HindranceSeverity) {
      if (state.character.creationLocked) return;
      set('character', 'hindrances', (xs) =>
        xs.map((x) => (x.hindranceId === hindranceId ? { ...x, severity } : x)),
      );
    },
    addCustomHindrance(h: CustomHindrance) {
      set('character', 'customHindrances', (xs) => [...xs, h]);
    },
    removeCustomHindrance(id: string) {
      if (state.character.creationLocked) return;
      set('character', 'customHindrances', (xs) => xs.filter((x) => x.id !== id));
    },
    setCustomHindranceSeverity(id: string, severity: HindranceSeverity) {
      if (state.character.creationLocked) return;
      set('character', 'customHindrances', (xs) =>
        xs.map((x) => (x.id === id ? { ...x, severity } : x)),
      );
    },
    addEdge(e: SelectedEdge) {
      set('character', 'edges', (xs) => {
        const existing = xs.find((x) => x.edgeId === e.edgeId);
        if (existing) {
          return xs.map((x) =>
            x.edgeId === e.edgeId ? { ...x, count: Math.max(1, (x.count ?? 1) + (e.count ?? 1)) } : x,
          );
        }
        return [...xs, e];
      });
    },
    removeEdge(edgeId: string) {
      set('character', 'edges', (xs) => xs.filter((x) => x.edgeId !== edgeId));
    },
    setEdgeCount(edgeId: string, count: number) {
      set('character', 'edges', (xs) =>
        count <= 0
          ? xs.filter((x) => x.edgeId !== edgeId)
          : xs.map((x) => (x.edgeId === edgeId ? { ...x, count: Math.max(1, count) } : x)),
      );
    },
    addCustomEdge(edge: CustomEdge) {
      set('character', 'customEdges', (xs) => [...xs, edge]);
    },
    removeCustomEdge(id: string) {
      set('character', 'customEdges', (xs) => xs.filter((x) => x.id !== id));
    },
    updateCustomEdge(id: string, patch: Partial<Omit<CustomEdge, 'id'>>) {
      set('character', 'customEdges', (xs) => xs.map((edge) => edge.id === id ? { ...edge, ...patch } : edge));
    },
    addCustomEquipment(item: CustomEquipment) {
      set('character', 'customEquipment', (xs) => [...xs, item]);
      const selected: SelectedEquipment = { itemId: item.id, quantity: 1, type: 'custom' };
      set('character', 'equipment', (xs) => [...xs, selected]);
    },
    addEquipment(item: SelectedEquipment) {
      set('character', 'equipment', (xs) => {
        const existing = xs.find((x) => x.itemId === item.itemId);
        if (existing) {
          return xs.map((x) =>
            x.itemId === item.itemId ? { ...x, quantity: x.quantity + item.quantity } : x,
          );
        }
        return [...xs, item];
      });
    },
    setEquipmentQuantity(itemId: string, quantity: number) {
      set('character', 'equipment', (xs) =>
        quantity <= 0
          ? xs.filter((x) => x.itemId !== itemId)
          : xs.map((x) => (x.itemId === itemId ? { ...x, quantity } : x)),
      );
    },
    removeEquipment(itemId: string) {
      set('character', 'equipment', (xs) => xs.filter((x) => x.itemId !== itemId));
    },
    setMoney(money: number) {
      set('character', 'money', money);
    },
    setArcaneBackground(id: string | null) {
      set('character', 'arcaneBackgroundId', id);
    },
    setPowerPoints(pp: number) {
      set('character', 'powerPoints', pp);
    },
    addPower(p: SelectedPower) {
      if (state.character.powers.some((power) => power.powerId === p.powerId)) return;
      if (state.character.creationLocked) {
        const c = currentCharacter();
        const ab = ARCANE_BACKGROUND_BY_ID.get(c.arcaneBackgroundId ?? '');
        const edge = c.edges.find((item) => item.edgeId === 'novye-sily');
        const copies = edge ? Math.max(1, edge.count ?? 1) : 0;
        if (c.powers.length >= (ab?.startingPowers ?? 0) + copies * 2) return;
      }
      set('character', 'powers', (xs) => [...xs, p]);
    },
    removePower(powerId: string) {
      set('character', 'powers', (xs) => xs.filter((x) => x.powerId !== powerId));
      set('character', 'pinnedPowerIds', (xs) => xs.filter((id) => id !== powerId));
    },
    addCustomPower(power: CustomPower) {
      set('character', 'customPowers', (xs) => [...xs, power]);
    },
    updateCustomPower(id: string, power: CustomPower) {
      set('character', 'customPowers', (xs) =>
        xs.map((item) => (item.id === id ? power : item)),
      );
    },
    removeCustomPower(id: string) {
      set('character', 'customPowers', (xs) => xs.filter((power) => power.id !== id));
      set('character', 'pinnedPowerIds', (xs) => xs.filter((powerId) => powerId !== id));
    },
    togglePinnedPower(powerId: string) {
      set('character', 'pinnedPowerIds', (xs) =>
        xs.includes(powerId) ? xs.filter((id) => id !== powerId) : [...xs, powerId],
      );
    },
    setAbFilterEnabled(enabled: boolean) {
      set('character', 'abFilterEnabled', enabled);
    },
    setWounds(n: number) {
      set('character', 'wounds', n);
    },
    setFatigue(n: number) {
      set('character', 'fatigue', n);
    },
    setAdvances(n: number) {
      set('character', 'advancesUsed', promotionCount(n));
    },
    setCreationLocked(locked: boolean) {
      set('character', 'creationLocked', locked);
    },
    applyPromotionDraft(draft: Pick<Character, 'attributes' | 'skills' | 'customSkills' | 'promotions'>) {
      set('character', {
        attributes: draft.attributes,
        skills: draft.skills,
        customSkills: draft.customSkills,
        promotions: draft.promotions,
      });
    },
    dismissLegacyWarning() {
      set('character', 'promotions', 'legacyBaseline', false);
    },
    setDerived(field: keyof Character['derivedStats'], value: number) {
      set('character', 'derivedStats', field, value);
    },
    setDeadlandsEnabled(enabled: boolean) {
      set('settings', 'deadlandsEnabled', enabled);
    },
    setFreeSkillPoints(points: number) {
      set('settings', 'freeSkillPoints', Math.max(0, points));
    },
    setDoubleEveryFourthPromotion(enabled: boolean) {
      set('settings', 'doubleEveryFourthPromotion', enabled);
    },
    resetCharacter() {
      set('character', structuredClone(defaultCharacter));
      set('portrait', null);
      clearStorage();
    },
    importBundle(b: { character: Character; settings: AppSettings; portrait: string | null }) {
      set('character', b.character);
      set('settings', b.settings);
      set('portrait', b.portrait);
    },
  };
}

export function StoreProvider(props: ParentProps): JSX.Element {
  const [state, setStore] = createStore<StoreShape>({
    character: loadCharacter(),
    settings: loadSettings(),
    portrait: loadPortrait(),
  });

  const promotionResults = createMemo(() => replayPromotions(state.character, state.settings));
  const currentCharacter = () => promotionResults().character;
  const edgeLimit = () => edgeCap(promotionResults().edgeSlots);
  const sheetCharacter = () => state.character.creationLocked
    ? currentCharacter()
    : { ...state.character, advancesUsed: veteranPromotions(state.character) };
  const actions = makeActions(setStore, state, currentCharacter);

  createEffect(() => saveCharacter(state.character));
  createEffect(() => saveSettings(state.settings));

  return (
    <StoreCtx.Provider value={{ state, actions, currentCharacter, sheetCharacter, promotionResults, edgeLimit }}>
      {props.children}
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
