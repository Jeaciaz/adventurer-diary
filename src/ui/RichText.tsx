import { For, type JSX } from 'solid-js';

export type ReferenceKind = 'edge' | 'equipment' | 'power';

export interface TextReference {
  kind: ReferenceKind;
  id: string;
  label: string;
}

type Segment = { type: 'text'; text: string } | { type: 'reference'; reference: TextReference };

const REF_PATTERN = /\[\[(edge|equipment|power):([^|\]]+)\|([^\]]+)\]\]/g;

function parseRichText(text: string): Segment[] {
  const segments: Segment[] = [];
  let offset = 0;

  for (const match of text.matchAll(REF_PATTERN)) {
    offset = appendMatchSegments(segments, text, match, offset);
  }

  appendTextSegment(segments, text.slice(offset));
  return segments;
}

function appendMatchSegments(
  segments: Segment[],
  text: string,
  match: RegExpMatchArray,
  offset: number,
): number {
  const index = match.index ?? 0;
  appendTextSegment(segments, text.slice(offset, index));
  segments.push({ type: 'reference', reference: matchReference(match) });
  return index + match[0].length;
}

function appendTextSegment(segments: Segment[], text: string): void {
  if (text.length > 0) segments.push({ type: 'text', text });
}

function matchReference(match: RegExpMatchArray): TextReference {
  return {
    kind: referenceKind(match[1]),
    id: match[2] ?? '',
    label: match[3] ?? '',
  };
}

function referenceKind(value: string | undefined): ReferenceKind {
  if (value === 'edge' || value === 'equipment' || value === 'power') return value;
  return 'edge';
}

function RichTextSegment(props: {
  segment: Segment;
  onReference: (reference: TextReference) => void;
}): JSX.Element {
  if (props.segment.type === 'text') return <>{props.segment.text}</>;

  const reference = props.segment.reference;

  return (
    <button
      type="button"
      class="rounded px-0.5 text-info underline decoration-info/40 underline-offset-2 hover:bg-info/10"
      onClick={() => props.onReference(reference)}
    >
      {reference.label}
    </button>
  );
}

export function RichText(props: {
  text: string;
  onReference: (reference: TextReference) => void;
  class?: string;
}): JSX.Element {
  return (
    <span class={props.class}>
      <For each={parseRichText(props.text)}>
        {(segment) => <RichTextSegment segment={segment} onReference={props.onReference} />}
      </For>
    </span>
  );
}
