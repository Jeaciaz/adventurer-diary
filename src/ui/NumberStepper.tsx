import type { JSX } from 'solid-js';
import { Minus, Plus } from 'lucide-solid';

export interface NumberStepperProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  suffix?: string;
}

export function NumberStepper(props: NumberStepperProps): JSX.Element {
  const step = (): number => props.step ?? 1;
  const clamp = (v: number): number => {
    let r = v;
    if (props.min !== undefined) r = Math.max(props.min, r);
    if (props.max !== undefined) r = Math.min(props.max, r);
    return r;
  };
  return (
    <div class="form-control">
      {props.label ? <span class="label-text mb-1 text-sm">{props.label}</span> : null}
      <div class="join border border-base-300 rounded-lg">
        <button
          type="button"
          class="btn btn-ghost btn-sm join-item border-0"
          aria-label="Уменьшить"
          onClick={() => props.onChange(clamp(props.value - step()))}
        >
          <Minus size={16} />
        </button>
        <input
          type="number"
          class="input input-sm join-item w-16 border-y-0 border-x border-base-300 text-center focus:outline-none"
          value={props.value}
          onInput={(e) => {
            const n = Number(e.currentTarget.value);
            if (Number.isFinite(n)) props.onChange(clamp(n));
          }}
        />
        {props.suffix ? (
          <span class="join-item flex items-center border-r border-base-300 bg-base-200 px-2 text-xs">
            {props.suffix}
          </span>
        ) : null}
        <button
          type="button"
          class="btn btn-ghost btn-sm join-item border-0"
          aria-label="Увеличить"
          onClick={() => props.onChange(clamp(props.value + step()))}
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
