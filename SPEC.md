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
| `swade:settings` | `{ deadlandsEnabled, freeSkillPoints, doubleEveryFourthPromotion }` |
| `swade:portrait` | portrait base64 string (≤2MB) |
| `swade:schemaVersion` | integer, drives migrations |

Schema version 4 stores the creation baseline, lock, earned promotion count, edge-slot credits, custom-edge budget flags, and ordered point allocations alongside custom powers. Earlier edge promotion awards move into the managed edges list once, preserving current selections and converting their allocations to slot credits. Version 1 and pre-promotion version 2 saves retain their current stats as the baseline and their total promotion count, with empty allocation fields and a migration warning. Published version 2 promotion saves retain their existing lock and allocations. Exports/imports include all progression data and settings.

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

**Creation lock:** when unlocked, attributes, skills, and hindrances edit creation values. When locked, they show current values and cannot be edited directly. Edges and arcane backgrounds remain fully managed in their tabs; custom edges can be added, edited, and removed while locked. Custom hindrance additions remain available while locked. Lock icons by the name and status toggle explain unlocking via a tooltip. Derived stats, equipment, money, wounds, fatigue, and power point resources remain editable. Attribute and skill creation budgets use the baseline; edge capacity includes active promotion credits.

**Validation:** soft warn (allow over-spend, badge in red). Warnings do not prevent locking.

---

## Tab 2: Состояние

Fields:
- **Персонаж создан** — reversible creation-lock toggle; unlocking never snapshots promoted stats back into creation values.
- **Раны** — radio 0–3; **Усталость** — radio 0–2.
- **Ранг** — read-only, based on earned promotions plus the veteran's four starting promotions: 0–3 Новичок, 4–7 Закалённый, 8–11 Ветеран, 12–15 Герой, 16+ Легенда. Empty/invalid promotions still count; bonus fields do not.
- **Получено повышений** — manual count of earned promotions, excluding the veteran's automatic four.
- **Распределить повышения** — opens a modal with one editable field per promotion, in chronological order; any earlier field can be edited.
- Decreasing the earned count retains removed selections as inactive; increasing it restores them.
- Visible promotion list shows current allocations, effects, errors, and warnings; there is no history of edits.

### Creation point pool

```
freePoints =
    minorHindrances × 1 + majorHindrances × 2
  − max(0, skillPointsSpent − skillCap) × 1
  − max(0, attrPointsSpent − 5)         × 2
  − max(0, countedEdges − edgeLimit)             × 2
```

`skillCap = 12 + freeSkillPoints + (5 if Старость is taken)`. `edgeLimit = 2 + active valid edge-slot promotions`. Ordinary edge copies and custom edges with `countsTowardLimit` enabled each count; Мистический дар and freely granted custom edges are exempt. Excess counted edges cost 2 creation points each. Overspending and hindrance totals above four warn but do not block locking.

### Ordered promotions

Each completed field has exactly 2 points. Empty fields and unfinished choices remain pending, apply no effects, and show no error until their targets are selected. Choices:
- Raise an attribute one die step: 2 points.
- Learn an untrained skill at d4: 2 points (the table's rule).
- Invest 2 points in one existing skill, or 1 point in each of two skill allocations. Each die step costs 1 while below the linked attribute, otherwise 2. Costs and resulting dice are recalculated at that point in the sequence.
- Add one edge slot: 2 points. Optionally link an already picked ordinary or custom edge; the picker contains only taken edges. An unlinked slot is complete and effective. Edges are selected and edited in the edges tab. Removing a linked edge warns but retains the slot. New custom skills can also be defined and learned in the modal.

An existing-skill allocation never learns an untrained/deleted skill implicitly. An impossible or incompletely spent allocation makes the entire field red and ineffective; it remains saved and editable. Replay continues with later fields after skipping invalid ones. Edge prerequisites and attribute frequency limits warn but do not suppress otherwise valid fields. Empty fields apply nothing. Clicking a promotion card opens only that field; the distribution button opens the full list. Modal edits are a draft: apply saves changes; cancel discards the draft. Editing one field still replays the full sequence and preserves other fields.

Each empty active field has an auto-backfill button for existing characters. It first covers excess counted edges with an edge-slot credit; otherwise it transfers an attribute step if creation attributes exceed 5 points; otherwise it transfers one step from each of two eligible skills above d4; finally it transfers two points from one skill, prioritizing skills above their linked attribute. Attribute and skill transfers lower the creation baseline rather than increasing current dice. A candidate must replay legally, preserve all current dice, and leave every other promotion's status and allocation unchanged. Filled and inactive fields cannot be auto-backfilled. If no safe candidate exists, nothing changes and the field explains why. Applying any auto-backfilled draft requires a separate confirmation showing baseline changes and the affected promotions; cancelling discards the proposal.

**Homebrew:** `doubleEveryFourthPromotion` defaults OFF. When ON, an additional 2-point field appears immediately after earned total promotions 4, 8, 12, etc. These fields do not increase the count or rank. Turning the rule OFF preserves filled bonus fields inactive; turning it back ON restores them. Inactive fields can be revealed in the modal.

**Ветеран Дикого Запада:** choosing `veteran-o-the-weird-west` in the creation baseline automatically adds four ordinary starting fields and four promotions toward rank. Starting #4 receives no bonus. Earned promotions begin at total #5; the first possible bonus is total #8. Removing the creation edge disables its four fields while retaining their selections. The edge cannot be acquired through promotion fields.

The book's hindrance-removal promotion option remains out of scope. Powers may be selected within slots earned through the current arcane background and Новые силы; reducing available slots retains existing selections with a warning.

---

## Tab 5: Черты (Edges)

**Counter:** `counted / edgeLimit` — the limit includes active edge promotion credits; over-cap pulls 2 pts each from the unified pool. The counter remains visible while locked.

Two sections:
- **Доступные** — searchable, grouped by category (Предыстории, Боевые, Лидерские, Сверхъестественные, Профессиональные, Социальные, Мистические, Легендарные, + DL categories). Tap → drawer w/ full description + requirements. "Add" button.
- **Выбранные** — list of taken edges, tap = drawer, button to remove. All edge controls remain available while creation is locked. Custom edges have an edit button and a toggle for whether they count toward the limit; free grants default to excluded. Name, description, and budget flag can be edited without changing the edge ID.

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
- **Двойное каждое 4-е повышение** toggle (default OFF; includes the veteran exception)
- **Свободные очки навыков** — extra creation skill points
- **Сбросить персонажа** (reset, w/ confirm dialog)
- **Экспорт JSON** — download character as file
- **Импорт JSON** — upload + validate + replace

---

## Race

Fixed: Человек. Hidden in UI. Auto-grants a free Novice edge slot; combined with the baseline edge slot this gives `edgeCap = 2`.

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
- Reconstruction of historical promotion allocations from legacy final stats
- Multi-character
- Backend / sync / multiplayer
