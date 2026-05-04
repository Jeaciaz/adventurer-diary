import type { JSX } from 'solid-js';

export interface CounterProps {
  label: string;
  value: number;
  cap?: number;
  warn?: boolean;
  class?: string;
}

/** Compact "label: used / cap" display. Goes red when warn=true. */
export function Counter(props: CounterProps): JSX.Element {
  return (
    <div
      class={[
        'flex items-baseline gap-2 rounded-lg border px-2 py-1 text-sm',
        props.warn ? 'border-error bg-error/10 text-error' : 'border-base-300 bg-base-200',
        props.class ?? '',
      ].join(' ')}
    >
      <span class="text-xs uppercase opacity-70">{props.label}</span>
      <span class="font-mono font-semibold">
        {props.value}
        {props.cap !== undefined ? <> / {props.cap}</> : null}
      </span>
    </div>
  );
}
