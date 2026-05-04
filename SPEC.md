# Дневник Авантюриста — Spec

Mobile-first PWA pocket character sheet for Savage Worlds Adventure Edition (SWADE), Deadlands flavor. Single-character, local-only, RU UI.

## Tech

- **SolidJS + TypeScript + Vite**
- **Tailwind + daisyUI** (theme: `night`)
- **lucide-solid** icons
- Custom UI primitives layered on daisyUI — no external component lib
- PWA: installable, offline-first, service worker
- No backend, no analytics

## Storage

`localStorage`, split keys:

| Key | Contents |
|---|---|
| `swade:character` | character data (json) |
| `swade:settings` | `{ deadlandsEnabled: boolean }` |
| `swade:portrait` | portrait base64 string (≤2MB) |
| `swade:schemaVersion` | integer, drives migrations |

Schema versioning + migration pipeline from day one. Bumped on breaking shape changes.

## Top bar (always visible)

- Character name (inline-editable, empty by default)
- Portrait (tap to upload, base64, 2MB cap, reject larger w/ toast)

## Tabs (in order)

1. **Параметры и навыки** (Stats & Skills)
2. **Состояние** (Status)
3. **Черты** (Edges)
4. **Изъяны** (Hindrances)
5. **Снаряжение** (Equipment)
6. **Силы** (Powers)

Bottom nav (mobile) or top tabs (wider).

---

## Tab 1: Параметры и навыки

**Top section — derived stats (manual numbers):**
- Шаг, Защита, Стойкость, Нагрузка, Размер

**Budget counters (visible):**
- Параметры: `used / 5` (over-cap pulls from unified pool — see Status)
- Навыки: `used / (12 + Старость bonus)` (over-cap pulls from unified pool)
- Свободные очки: `<derived value>` (read-only mirror from Status)

**Stats + skills body:**

For each of 5 attributes (Ловкость, Смекалка, Характер, Сила, Выносливость):
- Attribute name + radio group: `d4 d6 d8 d10 d12`
- Skill list under it (radio per skill: `— d4 d6 d8 d10 d12`)
  - Base SWADE skills shown by default (non-deletable)
  - Custom skills addable per-attr-group via `+ Добавить навык` (name + die step)
  - Custom skills deletable
  - Visualize cost-multiplier when skill > attr (e.g. badge "×2")

**Validation:** soft warn (allow over-spend, badge in red).

---

## Tab 2: Состояние

Fields:
- **Раны** — radio 0–3
- **Усталость** — radio 0–2
- **Ранг** — read-only badge, derived from `advancesUsed`:
  - 0–3 Новичок, 4–7 Закалённый, 8–11 Ветеран, 12–15 Герой, 16+ Легенда
- **Использовано повышений** — number stepper
- **Свободные очки** — read-only derived counter (formula below)

### Unified point pool

Single derived counter replaces all conversion UI. No advance grant-type modal, no explicit hindrance trades, no money-from-hindrance.

```
freePoints =
    advancesUsed × 2
  + minorHindrances × 1
  + majorHindrances × 2
  − max(0, skillPointsSpent − skillCap) × 1
  − max(0, attrPointsSpent − 5)         × 2
  − max(0, edgesTaken − edgeCap)        × 2
```

Where:
- `skillCap = 12 + (5 if Старость taken else 0)`
- `edgeCap = 1` (free Novice edge from human race) `+ 0` baseline (no other free grants)
- Each over-cap **skill** point costs 1 from pool
- Each over-cap **attr** point costs 2 from pool
- Each over-cap **edge** costs 2 from pool

When `freePoints < 0` → red warning badge in Status + Параметры/Навыки/Черты tabs. Soft warn, never blocks.

`advancesUsed` is a single number stepper. Each advance silently grants +2 to pool — user spends it implicitly by raising attrs/skills/edges. No grant-type choice. (The book's "remove minor hindrance" advance option is dropped.)

---

## Tab 5: Черты (Edges)

**Counter:** `used / edgeCap` — over-cap pulls 2 pts each from unified pool.

Two sections:
- **Доступные** — searchable, grouped by category (Предыстории, Боевые, Лидерские, Сверхъестественные, Профессиональные, Социальные, Мистические, Легендарные, + DL categories). Tap → drawer w/ full description + requirements. "Add" button.
- **Выбранные** — list of taken edges, tap = drawer, button to remove.

DL edges marked with `(DL)` badge, only visible when `deadlandsEnabled`.

Requirement display: prereq (Rank, attr, skill, other edge) shown as chips. Warn-only if unmet.

---

## Tab 4: Изъяны (Hindrances)

**Counter:** hindrance points earned (`minor + major × 2`, soft cap 4 — warn over). No conversion UI; earned points feed unified pool directly (see Status).

Two sections: **Доступные** + **Выбранные** (same UX as Edges). Severity (мелкий/крупный) selector when hindrance has both options.

DL hindrances marked `(DL)`.

Special: **Старость** taken → bumps `skillCap` from 12 to 17 (separate from pool).

---

## Tab 5: Снаряжение (Equipment)

**Counter:** Деньги (number, default $500). Manual edit. (No automatic doubling — hindrance→money conversion was dropped.)

Two sub-sections (separately scrollable):
- **Оружие** (weapons) — searchable, grouped (melee / ranged / ammo)
- **Прочее** (rest) — searchable, grouped (armor / mounts / gear / electronics / weird-tech)

DL items filtered by global `deadlandsEnabled` setting (default ON; toggle OFF with selected DL items → warn-and-keep).

Each item drawer: full stats (cost, weight, AP, range, RoF, min str, armor, description). "Добавить" button → moves to Selected list with quantity field.

---

## Tab 6: Силы (Powers)

**Header:**
- **Мистический дар** (Arcane Background) selector — when DL toggle is OFF, shows the 5 core ABs; when ON, shows only the 6 DL ABs
- **Пункты силы (ПС)** — number input (manual)
- **Фильтр по дару** — toggle (default ON when an AB is selected; when ON, available list filters to only powers in that AB's allowed list — see DL AB power lists below). Toggling OFF reveals all powers.

**All powers always visible** regardless of DL toggle. DL powers marked `(DL)`.

Two sections (in order):
- **Выбранные** — taken powers. Pinned powers float to the top of this list (sorted: pinned first, then unpinned, each group user-orderable). Each row has inline icon-buttons: pin/unpin + remove. Tap row body → drawer.
- **Доступные** — searchable, table-like list w/ columns: name, Rank, ПС, дальность, длительность. Each row has inline "Добавить" icon-button. Tap row body → drawer w/ short + full description.
  - Warn (don't block) if power's Rank > character's Rank.
  - Warn (don't block) if power not in selected AB's allowed list and "Фильтр по дару" is ON.

**Pinning:** each selected power has a `pinned: boolean` flag toggled inline (or from drawer). Pinned powers sort to the top of **Выбранные** for quick play-time access. No separate section.

**AB → power list mapping:** each Deadlands Arcane Background restricts power access to a curated subset (per Deadlands rulebook, p.51-77). Extracted into `arcane-backgrounds.json` as `allowedPowers: string[]` (referencing power IDs). Base SWADE ABs default to allowing all powers (no restriction) unless the rulebook specifies otherwise.

No trappings.

---

## Settings (gear icon in top bar)

- **Deadlands** toggle (default ON)
- **Сбросить персонажа** (reset, w/ confirm dialog)
- **Экспорт JSON** — download character as file
- **Импорт JSON** — upload + validate + replace

---

## Race

Fixed: Человек. Hidden in UI. Auto-grants 1 free Novice edge slot via `edgeCap = 1` ("Разностороннее развитие" — user picks any qualifying Novice edge).

---

## Component primitives (`src/ui/`)

To build first:

- `Button`
- `Tabs` (mobile: bottom nav, desktop: top tabs)
- `RadioGroup` (used heavily for die steps + wounds + fatigue)
- `Input` (text, number)
- `NumberStepper`
- `Select`
- `Drawer` (mobile slide-up sheet)
- `Modal`
- `Toggle`
- `FileUpload` (portrait, JSON import)
- `Card`
- `Counter` (budget displays)
- `Badge` (DL marker, ×2 cost, requirement chips)
- `Collapsible` (skill groups)

Built on Tailwind + daisyUI utilities.

---

## Data files

Split JSON in `src/data/`:

| File | Notes |
|---|---|
| `attributes.json` | 5 fixed |
| `skills.json` | base SWADE list, `linkedAttribute`, `isBase` flag |
| `hindrances.json` | base + DL (`source: "core" \| "dl"`), severity options, cost, verbatim ru description |
| `edges.json` | base + DL, category, requirements (structured), verbatim ru description |
| `powers.json` | base + DL, rank, pp, range, duration, short + full ru description |
| `equipment-weapons.json` | base + DL + `isWeirdWest`, full stats, verbatim |
| `equipment-other.json` | base + DL + `isWeirdWest`, grouped, full stats, verbatim |
| `arcane-backgrounds.json` | 5 base + 6 DL (Huckster, Blessed, Shaman, Chi Master, Mad Scientist, Harrowed). Fields: skill, starting powers count, starting PP, `allowedPowers: string[]` (power IDs the AB can take; empty array = unrestricted). Extract DL restrictions verbatim from rulebook p.51-77. |

All names + descriptions in Russian. Translate Deadlands content from English ad-verbatim where possible; if translation lossy, include `translationNote` field.

---

## Subagent extraction task

After spec confirmed, spawn agent (general-purpose or Explore) with:

- Both PDFs as input
- Schema definitions
- Output: above JSON files in `src/data/`
- Instruction: verbatim copies from Russian rulebook (RU SWADE) + ad-verbatim translations from English (Deadlands), with `translationNote` when imperfect
- Explicit listing of which sections to extract from each PDF
- Categorization/grouping rules per spec above

---

## Out of scope (v1)

- Race selection beyond Человек
- Bennies (фишки)
- Trappings (Проявления)
- Stat auto-calc from attrs/edges/armor
- Backwards-compat once schema bumped (use migrations)
- Multi-character
- Backend / sync / multiplayer
