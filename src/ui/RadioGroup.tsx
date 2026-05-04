import { For, Show, type JSX } from 'solid-js';
import { cx } from './classes';

export interface RadioOption<T extends string | number | null> {
  value: T;
  label: string;
  badge?: string;
  disabled?: boolean;
}

export interface RadioGroupProps<T extends string | number | null> {
  options: RadioOption<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: 'xs' | 'sm' | 'md';
  ariaLabel?: string;
}

const sizeClass = { xs: 'btn-xs', sm: 'btn-sm', md: '' };

function disabledButtonClass(disabled: boolean | undefined): string {
  return disabled ? 'btn-disabled' : '';
}

function selectedButtonClass(selected: boolean): string {
  return selected ? 'btn-primary' : 'btn-ghost border-base-300';
}

function radioButtonClass(size: 'xs' | 'sm' | 'md' | undefined, selected: boolean, disabled: boolean | undefined): string {
  return cx([
    'btn join-item',
    sizeClass[size ?? 'sm'],
    disabledButtonClass(disabled),
    selectedButtonClass(selected),
  ]);
}

export function RadioGroup<T extends string | number | null>(
  props: RadioGroupProps<T>,
): JSX.Element {
  const cmp = (a: T, b: T): boolean => a === b;
  return (
    <div class="join" role="radiogroup" aria-label={props.ariaLabel}>
      <For each={props.options}>
        {(opt) => (
          <RadioButton
            option={opt}
            selected={cmp(opt.value, props.value)}
            size={props.size}
            onChange={props.onChange}
          />
        )}
      </For>
    </div>
  );
}

function RadioButton<T extends string | number | null>(props: {
  option: RadioOption<T>;
  selected: boolean;
  size?: 'xs' | 'sm' | 'md';
  onChange: (v: T) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={props.selected}
      aria-disabled={props.option.disabled}
      disabled={props.option.disabled}
      class={radioButtonClass(props.size, props.selected, props.option.disabled)}
      onClick={() => props.onChange(props.option.value)}
    >
      <span>{props.option.label}</span>
      <Show when={props.option.badge}>
        {(badge) => <span class="badge badge-sm ml-1">{badge()}</span>}
      </Show>
    </button>
  );
}
