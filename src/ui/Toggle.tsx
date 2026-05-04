import type { JSX } from 'solid-js';

export interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}

export function Toggle(props: ToggleProps): JSX.Element {
  return (
    <label class="flex items-center gap-2">
      <input
        type="checkbox"
        class="toggle toggle-primary toggle-sm"
        checked={props.checked}
        onChange={(e) => props.onChange(e.currentTarget.checked)}
      />
      {props.label ? <span class="text-sm">{props.label}</span> : null}
    </label>
  );
}
