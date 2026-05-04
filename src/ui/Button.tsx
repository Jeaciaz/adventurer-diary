import { splitProps, type JSX } from 'solid-js';

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

export function Button(props: ButtonProps): JSX.Element {
  const [local, rest] = splitProps(props, ['variant', 'size', 'class', 'iconOnly', 'square']);
  return (
    <button
      type="button"
      {...rest}
      class={[
        'btn',
        variantClass[local.variant ?? 'neutral'],
        sizeClass[local.size ?? 'md'],
        local.iconOnly || local.square ? 'btn-square' : '',
        local.class ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}
