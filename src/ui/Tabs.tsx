import { For, type JSX } from 'solid-js';

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: JSX.Element;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  active: T;
  onChange: (id: T) => void;
}

/**
 * Mobile: bottom nav. Desktop (sm+): top bar.
 * Renders both via responsive classes so the active control is always reachable.
 */
export function BottomTabs<T extends string>(props: TabsProps<T>): JSX.Element {
  return (
    <nav class="btm-nav btm-nav-sm safe-bottom border-t border-base-300 bg-base-200/95 backdrop-blur sm:hidden">
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            class={item.id === props.active ? 'active text-primary' : 'text-base-content/70'}
            onClick={() => props.onChange(item.id)}
            aria-label={item.label}
          >
            {item.icon}
          </button>
        )}
      </For>
    </nav>
  );
}

export function TopTabs<T extends string>(props: TabsProps<T>): JSX.Element {
  return (
    <div role="tablist" class="tabs tabs-bordered hidden sm:flex sm:px-2">
      <For each={props.items}>
        {(item) => (
          <button
            type="button"
            role="tab"
            aria-label={item.label}
            class={`tab px-4 ${item.id === props.active ? 'tab-active text-primary' : ''}`}
            onClick={() => props.onChange(item.id)}
          >
            {item.icon}
          </button>
        )}
      </For>
    </div>
  );
}
