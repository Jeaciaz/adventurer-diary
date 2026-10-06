import { Index, type JSX } from 'solid-js';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  options: SelectOption<T>[];
  value: T | '';
  onChange: (v: T | '') => void;
  placeholder?: string;
  label?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

function selectedOptionValue<T extends string>(options: SelectOption<T>[], value: string): T | '' {
  if (value === '') return '';
  return options.find((opt) => opt.value === value)?.value ?? '';
}

export function Select<T extends string>(props: SelectProps<T>): JSX.Element {
  return (
    <label class="form-control w-full">
      {props.label ? <span class="label-text mb-1 block text-sm">{props.label}</span> : null}
      <select
        class="select select-bordered select-sm w-full"
        value={props.value}
        disabled={props.disabled}
        aria-label={props.ariaLabel ?? props.label ?? props.placeholder}
        onChange={(e) => props.onChange(selectedOptionValue(props.options, e.currentTarget.value))}
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        <Index each={props.options}>
          {(opt) => <option value={opt().value} selected={opt().value === props.value}>{opt().label}</option>}
        </Index>
      </select>
    </label>
  );
}
