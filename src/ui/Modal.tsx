import { createEffect, createUniqueId, on, Show, type JSX } from 'solid-js';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: JSX.Element;
  actions?: JSX.Element;
}

export function Modal(props: ModalProps): JSX.Element {
  const titleId = createUniqueId();
  let previousFocus: HTMLElement | null = null;
  createEffect(on(() => props.open, (open) => {
    if (!open) previousFocus?.focus();
  }));

  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            props.onClose();
          }
          if (event.key !== 'Tab') return;
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          )].filter((element) => element.getClientRects().length > 0 && element.getAttribute('aria-label') !== 'Закрыть');
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/60"
          aria-label="Закрыть"
          onClick={props.onClose}
        />
        <div class="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col rounded-2xl bg-base-200 p-4 shadow-xl"
          ref={(element) => {
            previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            queueMicrotask(() => element.querySelector<HTMLElement>('select, input, button')?.focus());
          }}>
          <h2 id={titleId} class="mb-3 text-lg font-semibold">{props.title}</h2>
          <div class="min-h-0 overflow-y-auto">{props.children}</div>
          <div class="mt-4 flex justify-end gap-2">{props.actions}</div>
        </div>
      </div>
    </Show>
  );
}
