import { For, type JSX } from 'solid-js';

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

export function RadioGroup<T extends string | number | null>(
  props: RadioGroupProps<T>,
): JSX.Element {
  const cmp = (a: T, b: T): boolean => a === b;
  return (
    <div class="join" role="radiogroup" aria-label={props.ariaLabel}>
      <For each={props.options}>
        {(opt) => (
          <button
            type="button"
            role="radio"
            aria-checked={cmp(opt.value, props.value)}
            aria-disabled={opt.disabled}
            disabled={opt.disabled}
            class={[
              'btn join-item',
              sizeClass[props.size ?? 'sm'],
              opt.disabled ? 'btn-disabled' : '',
              cmp(opt.value, props.value) ? 'btn-primary' : 'btn-ghost border-base-300',
            ].join(' ')}
            onClick={() => props.onChange(opt.value)}
          >
            <span>{opt.label}</span>
            {opt.badge ? <span class="badge badge-sm ml-1">{opt.badge}</span> : null}
          </button>
        )}
      </For>
    </div>
  );
}
