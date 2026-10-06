import { Show } from 'solid-js';
import { Lock, LockOpen } from 'lucide-solid';
import { useStore } from '../store/store';

export function CreationLockIcon() {
  const { state } = useStore();
  const description = () => state.character.creationLocked
    ? 'Персонаж создан. Для исправления исходных значений снимите блокировку во вкладке «Состояние».'
    : 'Создание персонажа разблокировано. Редактируются исходные значения.';
  return (
    <span role="img" aria-label={description()} title={description()} class="inline-flex shrink-0"
      classList={{ 'text-primary': state.character.creationLocked, 'text-base-content/50': !state.character.creationLocked }}>
      <Show when={state.character.creationLocked} fallback={<LockOpen size={18} aria-hidden="true" />}>
        <Lock size={18} aria-hidden="true" />
      </Show>
    </span>
  );
}
