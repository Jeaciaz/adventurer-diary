import { createSignal, Match, Switch, type JSX } from 'solid-js';
import { Activity, HeartCrack, Medal, Sword, User, WandSparkles } from 'lucide-solid';
import { StoreProvider } from './store/store';
import { TopBar } from './components/TopBar';
import { SettingsDrawer } from './components/SettingsDrawer';
import { BottomTabs, TopTabs, ToastHost, type TabItem } from './ui';
import { StatsSkillsTab } from './tabs/StatsSkillsTab';
import { StatusTab } from './tabs/StatusTab';
import { EdgesTab } from './tabs/EdgesTab';
import { HindrancesTab } from './tabs/HindrancesTab';
import { EquipmentTab } from './tabs/EquipmentTab';
import { PowersTab } from './tabs/PowersTab';

type TabId = 'stats' | 'status' | 'edges' | 'hindrances' | 'equipment' | 'powers';

const TABS: TabItem[] = [
  { id: 'stats', label: 'Параметры', icon: <User size={20} /> },
  { id: 'status', label: 'Состояние', icon: <Activity size={20} /> },
  { id: 'edges', label: 'Черты', icon: <Medal size={20} /> },
  { id: 'hindrances', label: 'Изъяны', icon: <HeartCrack size={20} /> },
  { id: 'equipment', label: 'Снаряжение', icon: <Sword size={20} /> },
  { id: 'powers', label: 'Силы', icon: <WandSparkles size={20} /> },
];

export function App(): JSX.Element {
  const [tab, setTab] = createSignal<TabId>('stats');
  const [settingsOpen, setSettingsOpen] = createSignal(false);

  return (
    <StoreProvider>
      <div class="flex min-h-screen flex-col">
        <TopBar onOpenSettings={() => setSettingsOpen(true)} />
        <TopTabs items={TABS} active={tab()} onChange={(id) => setTab(id as TabId)} />
        <main class="flex-1 overflow-y-auto px-3 pb-24 pt-3 sm:pb-6">
          <Switch>
            <Match when={tab() === 'stats'}>
              <StatsSkillsTab />
            </Match>
            <Match when={tab() === 'status'}>
              <StatusTab />
            </Match>
            <Match when={tab() === 'edges'}>
              <EdgesTab />
            </Match>
            <Match when={tab() === 'hindrances'}>
              <HindrancesTab />
            </Match>
            <Match when={tab() === 'equipment'}>
              <EquipmentTab />
            </Match>
            <Match when={tab() === 'powers'}>
              <PowersTab />
            </Match>
          </Switch>
        </main>
        <BottomTabs items={TABS} active={tab()} onChange={(id) => setTab(id as TabId)} />
        <SettingsDrawer open={settingsOpen()} onClose={() => setSettingsOpen(false)} />
        <ToastHost />
      </div>
    </StoreProvider>
  );
}
