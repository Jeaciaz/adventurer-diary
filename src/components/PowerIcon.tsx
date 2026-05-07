import { Show, type JSX } from 'solid-js';

const POWER_ICON_PATHS: Record<string, string> = {
  vzryv: `
    <circle cx="32" cy="32" r="5" />
    <path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58" />
    <path d="M14 14 L20 20 M44 44 L50 50 M50 14 L44 20 M14 50 L20 44" />
  `,
  'vladenie-yazykom': `
    <path d="M10 16 H54 V40 H32 L22 50 V40 H10 Z" />
    <circle cx="22" cy="28" r="1.5" />
    <circle cx="32" cy="28" r="1.5" />
    <circle cx="42" cy="28" r="1.5" />
  `,
  voskreshenie: `
    <ellipse cx="32" cy="20" rx="9" ry="10" />
    <line x1="32" y1="30" x2="32" y2="56" />
    <line x1="20" y1="38" x2="44" y2="38" />
  `,
  'dar-voina': `
    <line x1="32" y1="6" x2="32" y2="46" />
    <line x1="22" y1="42" x2="42" y2="42" />
    <line x1="32" y1="46" x2="32" y2="58" />
    <line x1="28" y1="58" x2="36" y2="58" />
  `,
  dospekh: `
    <path d="M32 8 L52 16 V32 C52 44 42 54 32 58 C22 54 12 44 12 32 V16 Z" />
    <circle cx="22" cy="22" r="1.5" />
    <circle cx="42" cy="22" r="1.5" />
    <line x1="32" y1="20" x2="32" y2="48" />
  `,
  'drug-zverey': `
    <ellipse cx="32" cy="40" rx="11" ry="9" />
    <ellipse cx="20" cy="22" rx="3" ry="4" />
    <ellipse cx="44" cy="22" rx="3" ry="4" />
    <ellipse cx="12" cy="34" rx="3" ry="4" />
    <ellipse cx="52" cy="34" rx="3" ry="4" />
  `,
  'zamedlenie-uskorenie': `
    <circle cx="32" cy="32" r="22" />
    <polyline points="32,16 32,32 44,32" />
    <line x1="32" y1="6" x2="32" y2="10" />
    <line x1="32" y1="54" x2="32" y2="58" />
  `,
  'zashchita-ot-okruzhayushchey-sredy': `
    <circle cx="32" cy="32" r="22" />
    <path d="M22 38 C22 26 32 18 44 20 C44 32 34 42 22 38 Z" />
    <path d="M22 38 L34 26" />
  `,
  'zashchita-ot-misticheskikh-sil': `
    <path d="M32 8 L52 16 V32 C52 44 42 54 32 58 C22 54 12 44 12 32 V16 Z" />
    <polygon points="32,22 35,30 44,30 37,36 40,44 32,39 24,44 27,36 20,30 29,30" />
  `,
  'zvuk-tishina': `
    <path d="M14 26 H22 L32 18 V46 L22 38 H14 Z" />
    <path d="M40 26 Q46 32 40 38" />
    <path d="M44 20 Q54 32 44 44" />
  `,
  zombi: `
    <path d="M16 28 C16 18 24 12 32 12 C40 12 48 18 48 28 V36 H44 V44 H40 V36 H24 V44 H20 V36 H16 Z" />
    <circle cx="24" cy="28" r="2.5" />
    <circle cx="40" cy="28" r="2.5" />
    <line x1="28" y1="40" x2="36" y2="40" />
  `,
  zorkost: `
    <path d="M8 32 Q20 18 32 18 Q44 18 56 32 Q44 46 32 46 Q20 46 8 32 Z" />
    <circle cx="32" cy="32" r="6" />
    <circle cx="32" cy="32" r="2" />
  `,
  izgnanie: `
    <circle cx="24" cy="32" r="13" />
    <line x1="24" y1="32" x2="56" y2="32" />
    <polyline points="48,24 56,32 48,40" />
  `,
  illyuziya: `
    <rect x="12" y="18" width="24" height="24" />
    <rect x="26" y="26" width="24" height="24" />
  `,
  issushenie: `
    <path d="M32 10 C24 22 18 30 18 38 A14 14 0 0 0 46 38 C46 30 40 22 32 10 Z" />
    <polyline points="26,32 32,42 38,32" />
  `,
  istselenie: `
    <circle cx="32" cy="32" r="20" />
    <line x1="32" y1="14" x2="32" y2="50" />
    <line x1="14" y1="32" x2="50" y2="32" />
  `,
  marionetka: `
    <line x1="14" y1="8" x2="24" y2="22" />
    <line x1="50" y1="8" x2="40" y2="22" />
    <circle cx="32" cy="22" r="6" />
    <line x1="32" y1="28" x2="32" y2="44" />
    <line x1="22" y1="32" x2="42" y2="32" />
    <line x1="32" y1="44" x2="24" y2="56" />
    <line x1="32" y1="44" x2="40" y2="56" />
  `,
  maska: `
    <path d="M14 18 Q32 14 50 18 Q50 40 32 52 Q14 40 14 18 Z" />
    <circle cx="24" cy="28" r="2.5" />
    <circle cx="40" cy="28" r="2.5" />
    <path d="M24 40 Q32 44 40 40" />
  `,
  'mentalnaya-svyaz': `
    <circle cx="18" cy="32" r="8" />
    <circle cx="46" cy="32" r="8" />
    <line x1="26" y1="32" x2="38" y2="32" stroke-dasharray="3 3" />
  `,
  nevidimost: `
    <path d="M22 14 a10 10 0 0 1 20 0 v6 q0 4 -4 8 v24 h-12 V28 q-4 -4 -4 -8 z" stroke-dasharray="3 3" />
  `,
  neosyazaemost: `
    <path d="M14 56 V28 a18 18 0 0 1 36 0 V56 L44 50 L38 56 L32 50 L26 56 L20 50 Z" />
    <circle cx="26" cy="28" r="2" />
    <circle cx="38" cy="28" r="2" />
  `,
  oglushenie: `
    <polygon points="32,6 22,32 32,32 26,58 44,28 34,28 40,6" />
  `,
  osleplenie: `
    <path d="M8 32 Q20 18 32 18 Q44 18 56 32 Q44 46 32 46 Q20 46 8 32 Z" />
    <circle cx="32" cy="32" r="5" />
    <line x1="12" y1="12" x2="52" y2="52" />
  `,
  'paucheye-lapy': `
    <circle cx="32" cy="32" r="6" />
    <path d="M26 26 L14 18 M26 32 L10 32 M26 38 L14 46 M38 26 L50 18 M38 32 L54 32 M38 38 L50 46" />
  `,
  podderzhka: `
    <polyline points="14,40 32,22 50,40" />
    <polyline points="14,28 32,10 50,28" />
    <line x1="20" y1="54" x2="44" y2="54" />
  `,
  'podzemnyy-khod': `
    <path d="M8 52 V32 a24 18 0 0 1 48 0 V52" />
    <path d="M16 52 V36 a16 12 0 0 1 32 0 V52" />
    <line x1="8" y1="52" x2="56" y2="52" />
  `,
  polyot: `
    <path d="M32 32 Q20 22 8 26 Q14 32 22 34 Q14 36 12 42 Q24 38 32 32" />
    <path d="M32 32 Q44 22 56 26 Q50 32 42 34 Q50 36 52 42 Q40 38 32 32" />
  `,
  potok: `
    <path d="M8 22 Q16 16 24 22 T40 22 T56 22" />
    <path d="M8 34 Q16 28 24 34 T40 34 T56 34" />
    <path d="M8 46 Q16 40 24 46 T40 46 T56 46" />
  `,
  prevrashchenie: `
    <path d="M16 24 Q32 12 48 24" />
    <polyline points="42,18 48,24 42,30" />
    <path d="M48 40 Q32 52 16 40" />
    <polyline points="22,46 16,40 22,34" />
  `,
  'prizyv-soyuznika': `
    <circle cx="32" cy="32" r="22" />
    <polygon points="32,14 38,28 52,28 41,38 45,52 32,44 19,52 23,38 12,28 26,28" />
  `,
  proricanie: `
    <circle cx="32" cy="28" r="14" />
    <line x1="14" y1="50" x2="50" y2="50" />
    <path d="M18 50 Q32 42 46 50" />
    <circle cx="28" cy="24" r="2" />
  `,
  psikhometriya: `
    <rect x="20" y="38" width="24" height="14" rx="2" />
    <path d="M22 38 V20 a4 4 0 0 1 8 0 V32" />
    <path d="M30 32 V14 a4 4 0 0 1 8 0 V32" />
    <path d="M38 32 V18 a4 4 0 0 1 8 0 V38" />
  `,
  puty: `
    <rect x="8" y="22" width="20" height="20" rx="10" />
    <rect x="36" y="22" width="20" height="20" rx="10" />
    <line x1="28" y1="32" x2="36" y2="32" />
  `,
  'razrushitelnoe-pole': `
    <circle cx="32" cy="32" r="22" />
    <circle cx="32" cy="32" r="14" />
    <circle cx="32" cy="32" r="6" />
    <line x1="32" y1="6" x2="32" y2="58" />
    <line x1="6" y1="32" x2="58" y2="32" />
  `,
  rasseivaniye: `
    <path d="M14 32 a18 18 0 1 1 36 0" />
    <path d="M14 32 a18 18 0 0 0 36 0" stroke-dasharray="3 3" />
    <line x1="16" y1="48" x2="48" y2="16" />
  `,
  'svet-tma': `
    <circle cx="32" cy="32" r="20" />
    <path d="M32 12 a20 20 0 0 1 0 40 a10 10 0 0 1 0 -20 a10 10 0 0 0 0 -20 Z" />
    <line x1="32" y1="2" x2="32" y2="8" />
    <line x1="32" y1="56" x2="32" y2="62" />
  `,
  smerch: `
    <path d="M12 14 H52" />
    <path d="M16 22 H48" />
    <path d="M20 30 H44" />
    <path d="M24 38 H40" />
    <path d="M28 46 H36" />
    <path d="M30 54 H34" />
  `,
  smyatenie: `
    <path d="M48 32 a16 16 0 1 1 -16 -16 a12 12 0 1 1 12 12 a8 8 0 1 1 -8 -8 a4 4 0 1 1 4 4" />
  `,
  'sovinoe-chute': `
    <circle cx="20" cy="32" r="10" />
    <circle cx="44" cy="32" r="10" />
    <circle cx="20" cy="32" r="3" />
    <circle cx="44" cy="32" r="3" />
    <path d="M28 22 L32 18 L36 22" />
  `,
  sokrushenie: `
    <rect x="18" y="14" width="28" height="14" />
    <line x1="32" y1="28" x2="32" y2="56" />
    <line x1="22" y1="20" x2="42" y2="20" />
  `,
  son: `
    <polyline points="18,16 32,16 18,32 32,32" />
    <polyline points="36,34 48,34 36,46 48,46" />
  `,
  stena: `
    <rect x="10" y="14" width="44" height="36" />
    <line x1="10" y1="26" x2="54" y2="26" />
    <line x1="10" y1="38" x2="54" y2="38" />
    <line x1="22" y1="14" x2="22" y2="26" />
    <line x1="42" y1="14" x2="42" y2="26" />
    <line x1="32" y1="26" x2="32" y2="38" />
    <line x1="22" y1="38" x2="22" y2="50" />
    <line x1="42" y1="38" x2="42" y2="50" />
  `,
  'stiranie-pamyati': `
    <circle cx="32" cy="26" r="14" />
    <line x1="22" y1="30" x2="42" y2="30" />
    <line x1="18" y1="50" x2="46" y2="50" stroke-dasharray="3 3" />
  `,
  strela: `
    <line x1="12" y1="52" x2="52" y2="12" />
    <polyline points="38,12 52,12 52,26" />
    <line x1="8" y1="44" x2="20" y2="56" />
    <line x1="14" y1="38" x2="26" y2="50" />
    <line x1="20" y1="32" x2="32" y2="44" />
  `,
  telekinez: `
    <polygon points="32,18 44,30 32,42 20,30" />
    <path d="M14 28 q4 -4 8 0 M14 34 q4 4 8 0" />
    <path d="M42 28 q4 -4 8 0 M42 34 q4 4 8 0" />
    <line x1="20" y1="54" x2="44" y2="54" />
  `,
  teleportatsiya: `
    <ellipse cx="32" cy="32" rx="14" ry="20" />
    <ellipse cx="32" cy="32" rx="8" ry="14" />
    <ellipse cx="32" cy="32" rx="3" ry="6" />
  `,
  'uvelichenie-umenshenie': `
    <polyline points="14,14 22,14 22,22" />
    <polyline points="50,14 42,14 42,22" />
    <polyline points="14,50 22,50 22,42" />
    <polyline points="50,50 42,50 42,42" />
    <line x1="22" y1="22" x2="42" y2="42" />
    <line x1="42" y1="22" x2="22" y2="42" />
  `,
  'uvidet-skryt-sverkhestestvennoye': `
    <path d="M8 32 Q20 18 32 18 Q44 18 56 32 Q44 46 32 46 Q20 46 8 32 Z" />
    <polygon points="32,24 34,30 40,30 35,34 37,40 32,36 27,40 29,34 24,30 30,30" />
  `,
  uzhas: `
    <circle cx="32" cy="32" r="20" />
    <circle cx="24" cy="28" r="2.5" />
    <circle cx="40" cy="28" r="2.5" />
    <ellipse cx="32" cy="42" rx="4" ry="6" />
  `,
  'upravlenie-stikhiyami': `
    <polygon points="32,12 26,24 38,24" />
    <polygon points="32,52 26,40 38,40" />
    <polygon points="12,32 24,26 24,38" />
    <polygon points="52,32 40,26 40,38" />
  `,
  'usilit-oslabit-parametr': `
    <polyline points="18,18 24,12 30,18" />
    <line x1="24" y1="12" x2="24" y2="52" />
    <polyline points="34,46 40,52 46,46" />
    <line x1="40" y1="52" x2="40" y2="12" />
  `,
  'chtenie-mysleu': `
    <circle cx="22" cy="36" r="10" />
    <circle cx="44" cy="20" r="6" />
    <circle cx="36" cy="28" r="2.5" />
  `,
  shchit: `
    <path d="M32 8 L52 16 V32 C52 44 42 54 32 58 C22 54 12 44 12 32 V16 Z" />
  `,
  empatiya: `
    <path d="M32 50 C20 42 12 34 12 24 C12 18 18 14 24 14 C28 14 30 16 32 20 C34 16 36 14 40 14 C46 14 52 18 52 24 C52 34 44 42 32 50 Z" />
    <line x1="4" y1="24" x2="9" y2="24" />
    <line x1="55" y1="24" x2="60" y2="24" />
    <line x1="32" y1="56" x2="32" y2="60" />
  `,
  'ammo-whammy': `
    <path d="M28 14 L36 14 L36 38 L32 44 L28 38 Z" />
    <line x1="28" y1="22" x2="36" y2="22" />
    <circle cx="32" cy="52" r="2" />
  `,
  banish: `
    <circle cx="32" cy="32" r="20" />
    <line x1="20" y1="20" x2="44" y2="44" />
    <line x1="44" y1="20" x2="20" y2="44" />
  `,
  curse: `
    <path d="M16 28 C16 18 24 12 32 12 C40 12 48 18 48 28 V36 H44 V44 H38 L32 50 L26 44 H20 V36 H16 Z" />
    <circle cx="24" cy="28" r="2.5" />
    <circle cx="40" cy="28" r="2.5" />
    <line x1="28" y1="40" x2="36" y2="40" />
  `,
  'holy-symbol': `
    <circle cx="32" cy="32" r="22" />
    <line x1="32" y1="12" x2="32" y2="52" />
    <line x1="22" y1="22" x2="42" y2="22" />
  `,
  numb: `
    <line x1="32" y1="8" x2="32" y2="56" />
    <line x1="8" y1="32" x2="56" y2="32" />
    <line x1="16" y1="16" x2="48" y2="48" />
    <line x1="48" y1="16" x2="16" y2="48" />
    <polyline points="28,12 32,8 36,12" />
    <polyline points="28,52 32,56 36,52" />
    <polyline points="12,28 8,32 12,36" />
    <polyline points="52,28 56,32 52,36" />
  `,
  sanctify: `
    <circle cx="32" cy="32" r="20" />
    <line x1="32" y1="18" x2="32" y2="46" />
    <line x1="18" y1="32" x2="46" y2="32" />
  `,
  trinkets: `
    <circle cx="22" cy="38" r="10" />
    <circle cx="42" cy="22" r="8" />
    <polygon points="22,33 24,38 29,38 25,41 27,46 22,43 17,46 19,41 15,38 20,38" />
  `,
  'wilderness-walk': `
    <path d="M14 50 C14 30 30 14 50 14 C50 34 34 50 14 50 Z" />
    <line x1="14" y1="50" x2="40" y2="24" />
  `,
};

export interface PowerIconProps {
  id: string;
  class?: string;
}

export function PowerIcon(props: PowerIconProps): JSX.Element {
  return (
    <Show when={POWER_ICON_PATHS[props.id]}>
      {(inner) => (
        <svg
          viewBox="0 0 64 64"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class={props.class}
          aria-hidden="true"
          innerHTML={inner()}
        />
      )}
    </Show>
  );
}
