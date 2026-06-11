import { createRoot, createSignal, For, type JSX } from 'solid-js';

interface ToastEntry {
  id: number;
  text: string;
  variant: 'info' | 'error' | 'success';
}

const [toasts, setToasts] = createRoot(() => createSignal<ToastEntry[]>([]));
let nextId = 1;

function dismissToast(id: number): void {
  setToasts((xs) => xs.filter((t) => t.id !== id));
}

export function pushToast(text: string, variant: ToastEntry['variant'] = 'info'): void {
  const id = nextId++;
  setToasts((xs) => [...xs, { id, text, variant }]);
  setTimeout(() => dismissToast(id), 3500);
}

export function ToastHost(): JSX.Element {
  return (
    <div class="toast toast-top toast-center z-[100] w-full max-w-sm px-3">
      <For each={toasts()}>
        {(t) => (
          <button
            type="button"
            class={[
              'alert flex min-h-0 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm shadow-lg',
              t.variant === 'error' ? 'alert-error' : t.variant === 'success' ? 'alert-success' : 'alert-info',
            ].join(' ')}
            onClick={() => dismissToast(t.id)}
            aria-label="Закрыть уведомление"
          >
            <span class="leading-snug">{t.text}</span>
            <span class="text-base leading-none" aria-hidden="true">×</span>
          </button>
        )}
      </For>
    </div>
  );
}
