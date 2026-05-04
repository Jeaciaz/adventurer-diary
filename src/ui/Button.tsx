import { splitProps, type JSX } from 'solid-js';
import { cx } from './classes';

type Variant = 'primary' | 'ghost' | 'outline' | 'error' | 'success' | 'neutral';
type Size = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
  square?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  outline: 'btn-outline',
  error: 'btn-error',
  success: 'btn-success',
  neutral: 'btn-neutral',
};

const sizeClass: Record<Size, string> = {
  xs: 'btn-xs',
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

function buttonVariant(variant: Variant | undefined): string {
  return variantClass[variant ?? 'neutral'];
}

function buttonSize(size: Size | undefined): string {
  return sizeClass[size ?? 'md'];
}

function buttonSquare(iconOnly: boolean | undefined, square: boolean | undefined): string {
  return iconOnly || square ? 'btn-square' : '';
}

function buttonClass(local: Pick<ButtonProps, 'variant' | 'size' | 'class' | 'iconOnly' | 'square'>): string {
  return cx([
    'btn',
    buttonVariant(local.variant),
    buttonSize(local.size),
    buttonSquare(local.iconOnly, local.square),
    local.class,
  ]);
}

export function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'iconOnly', 'square']);
  return (
    <button
      type="button"
      {...rest}
      class={buttonClass(local)}
    />
  );
}
