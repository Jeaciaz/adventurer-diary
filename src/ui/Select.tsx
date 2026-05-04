import { For, type JSX } from 'solid-js';

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
}

export function Select<T extends string>(props: SelectProps<T>): JSX.Element {
  return (
    <label class="form-control w-full">
      {props.label ? <span class="label-text mb-1 block text-sm">{props.label}</span> : null}
      <select
        class="select select-bordered select-sm w-full"
        value={props.value}
        onChange={(e) => props.onChange(e.currentTarget.value as T | '')}
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        <For each={props.options}>{(opt) => <option value={opt.value}>{opt.label}</option>}</For>
      </select>
    </label>
  );
}
