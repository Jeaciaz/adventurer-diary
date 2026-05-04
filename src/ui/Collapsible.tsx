import { createSignal, type JSX, Show } from 'solid-js';
import { ChevronDown, ChevronRight } from 'lucide-solid';

export interface CollapsibleProps {
  title: JSX.Element;
  defaultOpen?: boolean;
  children: JSX.Element;
}

export function Collapsible(props: CollapsibleProps): JSX.Element {
  const [open, setOpen] = createSignal(props.defaultOpen ?? true);
  return (
    <div class="rounded-xl border border-base-300 bg-base-200">
      <button
        type="button"
        class="flex w-full items-center justify-between gap-2 rounded-t-xl px-3 py-2 text-left text-sm font-semibold hover:bg-base-300/50"
        onClick={() => setOpen(!open())}
      >
        <span>{props.title}</span>
        {open() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <Show when={open()}>
        <div class="border-t border-base-300 px-3 py-2">{props.children}</div>
      </Show>
    </div>
  );
}
