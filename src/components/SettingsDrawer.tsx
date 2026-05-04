import { type JSX } from 'solid-js';
import { Drawer, Toggle, Button, FileUpload, NumberStepper, pushToast } from '../ui';
import { useStore } from '../store/store';
import { exportCharacterJson, importCharacterJson } from '../storage/persist';

export function SettingsDrawer(props: { open: boolean; onClose: () => void }): JSX.Element {
  const { state, actions } = useStore();

  const handleExport = (): void => {
    const json = exportCharacterJson(state.character, state.settings, state.portrait);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.character.name || 'character'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File): Promise<void> => {
    try {
      const text = await file.text();
      const bundle = importCharacterJson(text);
      actions.importBundle(bundle);
      pushToast('Персонаж импортирован', 'success');
      props.onClose();
    } catch (err) {
      pushToast('Не удалось импортировать файл', 'error');
      console.error(err);
    }
  };

  const handleReset = (): void => {
    if (!confirm('Сбросить персонажа? Все данные будут удалены безвозвратно.')) return;
    actions.resetCharacter();
    pushToast('Персонаж сброшен', 'success');
    props.onClose();
  };

  return (
    <Drawer open={props.open} onClose={props.onClose} title="Настройки">
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-sm font-semibold">Deadlands</div>
            <div class="text-xs opacity-70">Показывать черты, изъяны и снаряжение мира Deadlands.</div>
          </div>
          <Toggle
            checked={state.settings.deadlandsEnabled}
            onChange={(v) => actions.setDeadlandsEnabled(v)}
          />
        </div>

        <div class="divider my-1" />

        <div class="flex flex-col gap-2">
          <div>
            <div class="text-sm font-semibold">Свободные очки навыков</div>
            <div class="text-xs opacity-70">Добавляются к лимиту очков навыков.</div>
          </div>
          <NumberStepper
            value={state.settings.freeSkillPoints ?? 0}
            onChange={(v) => actions.setFreeSkillPoints(v)}
            min={0}
          />
        </div>

        <div class="divider my-1" />

        <div class="flex flex-col gap-2">
          <div class="text-sm font-semibold">Резервная копия</div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            Экспорт JSON
          </Button>
          <FileUpload accept="application/json" onFile={handleImport} class="btn btn-outline btn-sm">
            Импорт JSON
          </FileUpload>
        </div>

        <div class="divider my-1" />

        <Button variant="error" size="sm" onClick={handleReset}>
          Сбросить персонажа
        </Button>
      </div>
    </Drawer>
  );
}
