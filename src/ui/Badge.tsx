import type { JSX } from 'solid-js';
import { cx } from './classes';

export type BadgeVariant = 'neutral' | 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'info' | 'success' | 'ghost';

const badgeVariantClass: Record<BadgeVariant, string> = {
  neutral: '',
  primary: 'badge-primary',
  secondary: 'badge-secondary',
  accent: 'badge-accent',
  warning: 'badge-warning',
  error: 'badge-error',
  info: 'badge-info',
  success: 'badge-success',
  ghost: 'badge-ghost',
};

function badgeOutlineClass(outline: boolean | undefined): string {
  return outline ? 'badge-outline' : '';
}

export function Badge(props: {
  children: JSX.Element;
  variant?: BadgeVariant;
  outline?: boolean;
  class?: string;
}): JSX.Element {
  const v = props.variant ?? 'neutral';
  return (
    <span
      class={cx([
        'badge badge-sm',
        badgeVariantClass[v],
        badgeOutlineClass(props.outline),
        props.class ?? '',
      ])}
    >
      {props.children}
    </span>
  );
}
