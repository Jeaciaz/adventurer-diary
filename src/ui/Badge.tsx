import type { JSX } from 'solid-js';

export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'info' | 'success' | 'ghost';

export function Badge(props: {
  children: JSX.Element;
  variant?: BadgeVariant;
  outline?: boolean;
  class?: string;
}): JSX.Element {
  const v = props.variant ?? 'neutral';
  return (
    <span
      class={[
        'badge badge-sm',
        v !== 'neutral' ? `badge-${v}` : '',
        props.outline ? 'badge-outline' : '',
        props.class ?? '',
      ].join(' ')}
    >
      {props.children}
    </span>
  );
}
