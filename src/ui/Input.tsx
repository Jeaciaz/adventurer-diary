import { splitProps, type JSX } from 'solid-js';

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input(props: InputProps): JSX.Element {
  const [local, rest] = splitProps(props, ['label', 'class']);
  return (
    <label class="form-control w-full">
      {local.label ? <span class="label-text mb-1 block text-sm">{local.label}</span> : null}
      <input
        {...rest}
        class={['input input-bordered input-sm w-full', local.class ?? ''].join(' ')}
      />
    </label>
  );
}
