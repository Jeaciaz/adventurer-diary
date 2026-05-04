import { Show, type JSX } from 'solid-js';
import { Settings as SettingsIcon, UserRound } from 'lucide-solid';
import { useStore } from '../store/store';
import { FileUpload, pushToast } from '../ui';

const PORTRAIT_MAX_BYTES = 2 * 1024 * 1024;

async function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function TopBar(props: { onOpenSettings: () => void }): JSX.Element {
  const { state, actions } = useStore();
  const handleFile = async (file: File): Promise<void> => {
    if (file.size > PORTRAIT_MAX_BYTES) {
      pushToast('Размер изображения превышает 2 МБ', 'error');
      return;
    }
    if (!file.type.startsWith('image/')) {
      pushToast('Файл должен быть изображением', 'error');
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    actions.setPortrait(dataUrl);
  };
  return (
    <header class="safe-top sticky top-0 z-30 flex items-center gap-3 border-b border-base-300 bg-base-200/95 px-3 py-2 backdrop-blur">
      <FileUpload accept="image/*" onFile={handleFile} class="flex-shrink-0">
        <div class="avatar">
          <div class="h-12 w-12 overflow-hidden rounded-xl bg-base-300 ring-1 ring-base-content/10">
            <Show
              when={state.portrait}
              fallback={
                <div class="flex h-full w-full items-center justify-center text-base-content/40">
                  <UserRound size={24} />
                </div>
              }
            >
              {(portrait) => (
                <img src={portrait()} alt="Портрет" class="h-full w-full object-cover" />
              )}
            </Show>
          </div>
        </div>
      </FileUpload>
      <input
        class="input input-ghost flex-1 text-base font-semibold focus:outline-none"
        placeholder="Имя персонажа"
        value={state.character.name}
        onInput={(e) => actions.setName(e.currentTarget.value)}
      />
      <button
        type="button"
        class="btn btn-ghost btn-sm btn-square"
        aria-label="Настройки"
        onClick={props.onOpenSettings}
      >
        <SettingsIcon size={18} />
      </button>
    </header>
  );
}
