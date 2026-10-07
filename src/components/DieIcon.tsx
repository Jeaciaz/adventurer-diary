import { Show } from 'solid-js';
import type { DieStep, DieStepOrNone } from '../types';

const SHAPES: Record<DieStep, { outline: string; facets: string }> = {
  d4: { outline: 'M12 2 22 21H2L12 2Z', facets: 'M12 2v12M2 21l10-7 10 7' },
  d6: { outline: 'm12 2 10 5v10l-10 5-10-5V7l10-5Z', facets: 'm2 7 10 5 10-5M12 12v10' },
  d8: { outline: 'm12 2 7 10-7 10-7-10 7-10Z', facets: 'm19 12-8 2-6-2M12 2l-1 12 1 8' },
  d10: { outline: 'm12 2 10 10-10 10L2 12 12 2Z', facets: 'M2 12h20M12 2 8 12l4 10 4-10-4-10Z' },
  d12: {
    outline: 'M12 2 17.88 3.91 21.51 8.91v6.18l-3.63 5L12 22l-5.88-1.91-3.63-5V8.91l3.63-5L12 2Z',
    facets: 'M12 6 17.71 10.15 15.53 16.85H8.47L6.29 10.15 12 6Z'
      + 'M12 2v4M21.51 8.91 17.71 10.15M17.88 20.09 15.53 16.85M6.12 20.09 8.47 16.85M2.49 8.91 6.29 10.15',
  },
};

export function DieIcon(props: { die: DieStepOrNone }) {
  const shape = () => props.die ? SHAPES[props.die] : undefined;
  return (
    <Show when={shape()}>{(paths) => (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0">
        <path d={paths().outline} />
        <path d={paths().facets} />
      </svg>
    )}</Show>
  );
}
