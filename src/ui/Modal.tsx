import { Show, type JSX } from 'solid-js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  actions?: JSX.Element;
}

export function Modal(props: ModalProps): JSX.Element {
  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/60"
          aria-label="Закрыть"
          onClick={props.onClose}
        />
        <div class="relative w-full max-w-md rounded-2xl bg-base-200 p-4 shadow-xl">
          <h2 class="mb-3 text-lg font-semibold">{props.title}</h2>
          <div>{props.children}</div>
          <div class="mt-4 flex justify-end gap-2">{props.actions}</div>
        </div>
      </div>
    </Show>
  );
}
