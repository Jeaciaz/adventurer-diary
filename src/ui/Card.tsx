import type { JSX } from 'solid-js';

export function Card(props: { children: JSX.Element; class?: string }): JSX.Element {
  return (
    <div class={['rounded-xl border border-base-300 bg-base-200 p-3', props.class ?? ''].join(' ')}>
      {props.children}
    </div>
  );
}
