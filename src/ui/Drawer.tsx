import { Show, type JSX } from 'solid-js';
import { X } from 'lucide-solid';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
}

export function Drawer(props: DrawerProps): JSX.Element {
  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/60"
          aria-label="Закрыть"
          onClick={props.onClose}
        />
        <div class="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-base-200 sm:max-w-lg sm:rounded-2xl">
          <div class="sticky top-0 flex items-start justify-between gap-3 border-b border-base-300 bg-base-200/95 px-4 py-3 backdrop-blur">
            <h2 class="text-lg font-semibold">{props.title}</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              aria-label="Закрыть"
              onClick={props.onClose}
            >
              <X size={18} />
            </button>
          </div>
          <div class="px-4 py-3">{props.children}</div>
        </div>
      </div>
    </Show>
  );
}
