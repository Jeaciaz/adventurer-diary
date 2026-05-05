import { createEffect, createSignal, onCleanup, Show, type JSX } from 'solid-js';
import { X } from 'lucide-solid';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: JSX.Element;
}

const DRAWER_ANIMATION_MS = 250;

let lockedDrawers = 0;
let lockedScrollY = 0;

function lockBodyScroll(): void {
  if (lockedDrawers === 0) {
    lockedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  lockedDrawers += 1;
}

function unlockBodyScroll(): void {
  lockedDrawers = Math.max(0, lockedDrawers - 1);
  if (lockedDrawers > 0) return;

  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.left = '';
  document.body.style.right = '';
  document.body.style.width = '';
  window.scrollTo(0, lockedScrollY);
}

export function Drawer(props: DrawerProps): JSX.Element {
  const [mounted, setMounted] = createSignal(props.open);
  const [visible, setVisible] = createSignal(false);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let openFrame: number | undefined;
  let bodyScrollLocked = false;

  const clearTimers = (): void => {
    if (closeTimer) clearTimeout(closeTimer);
    if (openFrame !== undefined) cancelAnimationFrame(openFrame);
    closeTimer = undefined;
    openFrame = undefined;
  };

  const requestClose = (): void => {
    clearTimers();
    setVisible(false);
    closeTimer = setTimeout(() => {
      props.onClose();
      setMounted(false);
    }, DRAWER_ANIMATION_MS);
  };

  const setBodyScrollLocked = (locked: boolean): void => {
    if (locked === bodyScrollLocked) return;
    bodyScrollLocked = locked;
    if (locked) lockBodyScroll();
    else unlockBodyScroll();
  };

  createEffect(() => {
    clearTimers();

    if (props.open) {
      setMounted(true);
      setBodyScrollLocked(true);
      setVisible(false);
      openFrame = requestAnimationFrame(() => setVisible(true));
      return;
    }

    setVisible(false);
    closeTimer = setTimeout(() => {
      setMounted(false);
      setBodyScrollLocked(false);
    }, DRAWER_ANIMATION_MS);
  });

  onCleanup(() => {
    clearTimers();
    setBodyScrollLocked(false);
  });

  return (
    <Show when={mounted()}>
      <div
        class={[
          'fixed inset-0 z-50 flex items-end transition-opacity duration-[250ms] ease-out sm:items-center sm:justify-center',
          visible() ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          class="absolute inset-0 bg-black/60"
          aria-label="Закрыть"
          onClick={requestClose}
        />
        <div
          class={[
            'relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-base-200 transition duration-[250ms] ease-out sm:max-w-lg sm:rounded-2xl',
            visible() ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
          ].join(' ')}
        >
          <div class="sticky top-0 flex items-start justify-between gap-3 border-b border-base-300 bg-base-200/95 px-4 py-3 backdrop-blur">
            <h2 class="text-lg font-semibold">{props.title}</h2>
            <button
              type="button"
              class="btn btn-ghost btn-sm btn-square"
              aria-label="Закрыть"
              onClick={requestClose}
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
