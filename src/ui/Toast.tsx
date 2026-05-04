import { createSignal, For, type JSX } from 'solid-js';

interface ToastEntry {
  id: number;
  text: string;
  variant: 'info' | 'error' | 'success';
}

const [toasts, setToasts] = createSignal<ToastEntry[]>([]);
let nextId = 1;

export function pushToast(text: string, variant: ToastEntry['variant'] = 'info'): void {
  const id = nextId++;
  setToasts((xs) => [...xs, { id, text, variant }]);
  setTimeout(() => setToasts((xs) => xs.filter((t) => t.id !== id)), 3500);
}

export function ToastHost(): JSX.Element {
  return (
    <div class="toast toast-top toast-center z-[100]">
      <For each={toasts()}>
        {(t) => (
          <div
            class={[
              'alert',
              t.variant === 'error' ? 'alert-error' : t.variant === 'success' ? 'alert-success' : 'alert-info',
            ].join(' ')}
          >
            <span>{t.text}</span>
          </div>
        )}
      </For>
    </div>
  );
}
