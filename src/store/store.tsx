import { createContext, useContext, type JSX, type ParentProps } from 'solid-js';
import { createStore, produce, type SetStoreFunction } from 'solid-js/store';
import { createEffect } from 'solid-js';
import type {
  AppSettings,
  AttributeId,
  Character,
  CustomEdge,
  CustomHindrance,
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
import { defaultCharacter, defaultSettings } from '../storage/defaults';

interface StoreShape {
  character: Character;
  settings: AppSettings;
  portrait: string | null;
}

interface StoreApi {
  state: StoreShape;
  setCharacter: SetStoreFunction<StoreShape>;
  actions: ReturnType<typeof makeActions>;
}

const StoreCtx = createContext<StoreApi>();

function makeActions(set: SetStoreFunction<StoreShape>) {
  return {
    setName(name: string) {
      set('character', 'name', name);
    },
    setPortrait(base64: string | null) {
      set('portrait', base64);
      savePortrait(base64);
    },
    setAttribute(id: AttributeId, die: DieStep) {
      set('character', 'attributes', id, die);
    },
    setSkill(skillId: string, die: DieStepOrNone) {
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
      set('character', 'customSkills', (xs) => [...xs, skill]);
    },
    updateCustomSkill(id: string, patch: Partial<CustomSkill>) {
      set('character', 'customSkills', (xs) =>
        xs.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      );
    },
    removeCustomSkill(id: string) {
      set('character', 'customSkills', (xs) => xs.filter((x) => x.id !== id));
    },
    addHindrance(h: SelectedHindrance) {
      set('character', 'hindrances', (xs) => [...xs, h]);
    },
    removeHindrance(hindranceId: string) {
      set('character', 'hindrances', (xs) => xs.filter((x) => x.hindranceId !== hindranceId));
    },
    setHindranceSeverity(hindranceId: string, severity: HindranceSeverity) {
      set('character', 'hindrances', (xs) =>
        xs.map((x) => (x.hindranceId === hindranceId ? { ...x, severity } : x)),
      );
    },
    addCustomHindrance(h: CustomHindrance) {
      set('character', 'customHindrances', (xs) => [...xs, h]);
    },
    removeCustomHindrance(id: string) {
      set('character', 'customHindrances', (xs) => xs.filter((x) => x.id !== id));
    },
    setCustomHindranceSeverity(id: string, severity: HindranceSeverity) {
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
      set('character', 'powers', (xs) => [...xs, p]);
    },
    removePower(powerId: string) {
      set('character', 'powers', (xs) => xs.filter((x) => x.powerId !== powerId));
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
      set('character', 'advancesUsed', Math.max(0, n));
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
    resetCharacter() {
      set('character', { ...defaultCharacter });
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

  const actions = makeActions(setStore);

  createEffect(() => saveCharacter(state.character));
  createEffect(() => saveSettings(state.settings));

  return (
    <StoreCtx.Provider value={{ state, setCharacter: setStore, actions }}>
      {props.children}
    </StoreCtx.Provider>
  );
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
