# Design tokens — Hive Home (iteration 3, approved 2026-10-31)

Values taken from the approved screens in [canvas/](canvas/). They are the input for the theme
issue (#4), which turns them into `src/constants/theme.ts`; until then this file is the source of truth.
Both themes are required (Settings → Appearance: System / Dark / Light).

## Color

| Token             | Dark                                                       | Light                                                    | Use                                                             |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| `background`      | `#0A0F1C`                                                  | `#EEF2F5`                                                | Screen base under the glow                                      |
| `text`            | `#F8FAFC`                                                  | `#0F172A`                                                | Titles, primary text                                            |
| `textSecondary`   | `#CBD5E1`                                                  | `#334155`                                                | Body text in cards                                              |
| `textTertiary`    | `#A3AEC2`                                                  | `#475569`                                                | Date line, hints, values                                        |
| `textQuaternary`  | `#8B95A7`                                                  | `#64748B`                                                | Section headers, group names, footnotes                         |
| `glass`           | `rgba(17,26,46,0.52)` + border `rgba(255,255,255,0.09)`    | `rgba(255,255,255,0.62)` + border `rgba(15,23,42,0.07)`  | Cards, sheets (blur 22, saturate 160%)                          |
| `control`         | `rgba(255,255,255,0.08)` + border `rgba(255,255,255,0.16)` | `rgba(255,255,255,0.70)` + border `rgba(15,23,42,0.10)`  | Round glass buttons, Dock                                       |
| `separator`       | `rgba(255,255,255,0.08)`                                   | `rgba(15,23,42,0.08)`                                    | List row dividers                                               |
| `accent`          | `#2DD4BF`                                                  | `#2DD4BF`                                                | Fills: primary buttons, switches, active dot, selection ring    |
| `accentText`      | `#2DD4BF`                                                  | `#0F766E`                                                | Teal text and icons (light needs the darker shade for contrast) |
| `accentFill`      | `rgba(45,212,191,0.16)`                                    | `rgba(45,212,191,0.22)`                                  | Faint teal behind a Settings row icon                           |
| `segmentTrack`    | `rgba(10,15,28,0.45)`                                      | `rgba(15,23,42,0.06)`                                    | Segmented control track                                         |
| `segmentSelected` | `rgba(45,212,191,0.18)` + border `rgba(45,212,191,0.55)`   | `rgba(45,212,191,0.22)` + border `rgba(45,212,191,0.55)` | Chosen segment (text `accentText`; others `textSecondary`)      |
| `switchOff`       | `#334155`                                                  | `rgba(15,23,42,0.18)`                                    | Switch track when off (on = `accent`); knob `#FFFFFF`           |
| `dock`            | `rgba(255,255,255,0.08)`                                   | `rgba(255,255,255,0.72)`                                 | Dock capsule (blur 28)                                          |
| `accentEdge`      | `rgba(45,212,191,0.4)`                                     | `rgba(45,212,191,0.4)`                                   | Dock border, Customize button border                            |
| `divider`         | `rgba(255,255,255,0.16)`                                   | `rgba(15,23,42,0.12)`                                    | Divider between pinned apps and Customize in the Dock           |
| `dashedSlot`      | `rgba(255,255,255,0.18)`                                   | `rgba(15,23,42,0.18)`                                    | Dashed empty app slot (empty Home; the last slot is `accent`)   |
| `onAccent`        | `#042F2A`                                                  | `#042F2A`                                                | Text on a teal fill                                             |
| `danger`          | `#F87171`                                                  | `#DC2626`                                                | Delete group                                                    |

**Group card and folder** ([canvas/Main.dc.html](canvas/Main.dc.html), [canvas/GroupSheet.dc.html](canvas/GroupSheet.dc.html)), as implemented in `theme.ts`:

| Token            | Dark                  | Light                    | Use                                               |
| ---------------- | --------------------- | ------------------------ | ------------------------------------------------- |
| `folderDim`      | `rgba(3,6,14,0.45)`   | `rgba(238,242,245,0.45)` | Over the blurred Home behind an open folder (iOS) |
| `folderDimSolid` | `rgba(10,15,28,0.92)` | `rgba(238,242,245,0.92)` | The same where Home can't be blurred (Android)    |
| `clear`          | `transparent`         | `transparent`            | The folder's modal screen, so Home shows through  |

Card: four apps or fewer → every tile (65) opens its app. More → the three most used stay big; the rest
shrink to 2×2 icons of 30 (radius 8, glyph 16, gap 5) in the fourth spot, which opens the folder. "Most
used" = opens in the last 30 days, each worth half as much a week later. Folder: the group name (title
style) above a glass panel (radius 38, padding 24 · 20) with a grid of four card icons per row, name under
each (12/15 medium, `textSecondary`, row gap 18); "Edit group" as a 44-high glass pill under it. A tap
on the dimmed Home closes it.

**Customize Home** ([canvas/Customize.dc.html](canvas/Customize.dc.html)), as implemented in `theme.ts`:

| Token          | Dark                     | Light                    | Use                                                            |
| -------------- | ------------------------ | ------------------------ | -------------------------------------------------------------- |
| `field`        | `rgba(10,15,28,0.45)`    | `rgba(255,255,255,0.85)` | Group name field                                               |
| `fieldBorder`  | `rgba(255,255,255,0.12)` | `rgba(15,23,42,0.10)`    | Group name field border, Hide button border                    |
| `iconMuted`    | `#94A3B8`                | `#64748B`                | Up / down chevrons, Cancel ×                                   |
| `bar`          | `rgba(19,27,46,0.72)`    | `rgba(255,255,255,0.78)` | Action bar for the selected app (blur 28, border `accentEdge`) |
| `accentTarget` | `rgba(45,212,191,0.53)`  | `rgba(45,212,191,0.53)`  | Border of a group that offers "Move <app> here"                |

The Dock section's border is `accentEdge`; other groups use `glassBorder`. The selected app has a
3 px `accent` ring 2 px outside its tile; a pinned app carries a 22 pt `accent` badge with an
`onAccent` pin (12), 6 pt over its top-end corner; hidden apps are drawn at 55 % opacity. Action
bar shadow: `c.barShadow` in [canvas/Customize.dc.html](canvas/Customize.dc.html). Sizes: sections
14 apart, padding 13 · 13 · 16, gap 13; name field radius 14, padding 14, text 16 semibold; Move
here radius 16; New group 54 high, radius 27; action bar 16 from the sides and 28 from the bottom,
radius 32, padding 8 · 8 · 8 · 18, gap 8, buttons 42 high (radius 21, padding 16, text 14). Touch
targets: the group row's up / down / delete and the name field are 48 (the design draws 40 × 42),
Move here at least 48 (#31).

**Scrims** (Home): content fades under the fixed header (`scrimTop`, header height + 10) and under the
Dock (`scrimBottom`, 150 high). Exact gradients: `c.scrimTop` / `c.scrimBottom` in
[canvas/Main.dc.html](canvas/Main.dc.html). The Dock's shadow: `c.dockShadow` there.

**Wallpaper glow** (fixed, does not scroll): five soft radial glows over `background` — teal top-left,
amber right at ~22 %, teal left at ~52 %, violet right at ~74 %, teal bottom. Dark uses deep, saturated
glows (alpha 0.45–0.75); light uses pale ones (alpha 0.16–0.32). Exact gradients: `c.wallpaper` in
[canvas/Main.dc.html](canvas/Main.dc.html).

### App tints (icon glyph and border)

| App     | Dark      | Light     |
| ------- | --------- | --------- |
| Health  | `#FB7185` | `#E11D48` |
| Habits  | `#FBBF24` | `#B45309` |
| Money   | `#34D399` | `#047857` |
| Wallet  | `#60A5FA` | `#2563EB` |
| Invest  | `#7DD3FC` | `#0369A1` |
| Books   | `#FDBA74` | `#C2410C` |
| Drawify | `#C4B5FD` | `#6D28D9` |
| Music   | `#F9A8D4` | `#BE185D` |

Icon tiles are tinted, not filled: dark = navy gradient `#1D2A47 → #111A2E`, light = white gradient
`#FFFFFF → #F1F5F9`; the glyph and a 1 px border (tint at ~27 % alpha) carry the app color. No app may
use the accent teal as its tint (it would read as "selected").

## Size and spacing

| Token                   | Value                                         | Notes                                  |
| ----------------------- | --------------------------------------------- | -------------------------------------- |
| Screen margin           | 20                                            | Left and right, everywhere             |
| Square card             | 169 × 169                                     | Today widgets and group cards share it |
| Card padding = icon gap | 13                                            | 13 · 65 · 13 · 65 · 13 = 169           |
| App icon (in cards)     | 65, radius 17                                 | Glyph 30                               |
| App icon (Dock)         | 52, radius 14                                 | Glyph 26                               |
| Card radius             | 30                                            | Sheets 38, list groups in Settings 26  |
| Grid gap                | 12 across, 14 down                            | Group name sits 6 below its card       |
| Dock                    | Glass capsule, radius 34, 28 above the bottom | Max 4 pinned + Customize button (52)   |
| Dock padding            | 10 · 10 · 10 · 14 (start), gap 12             | Divider 1 × 32                         |
| Touch targets           | ≥ 44                                          | Buttons, dots (28 × 20 hit area)       |
| Settings row            | ≥ 54 high, 16 side padding, 12 gap            | Icon tile 30, radius 8, glyph 16       |
| Segmented control       | Segments 38 high, radius 19; track padding 3  | Track radius 22, 12 inside its card    |
| Switch                  | 51 × 31, padding 2, knob 27                   | Knob shadow `0 2px 6px rgba(0,0,0,.3)` |

## Type (SF Pro on iOS, Roboto on Android — system font, no custom font)

| Style                        | Default                       | Largest accessibility size |
| ---------------------------- | ----------------------------- | -------------------------- |
| Date line                    | 13 semibold, uppercase        | 17                         |
| Screen title                 | 30 bold, one line             | 40 bold, may wrap          |
| Section title ("Today")      | 17 semibold                   | 24                         |
| Widget headline              | 20 bold                       | 28                         |
| Widget big number            | 26 bold                       | 38                         |
| Body / labels                | 13                            | 18–19                      |
| Group name under a card      | 11 medium, `textQuaternary`   | 17                         |
| List rows (Settings, sheets) | 17                            | follows Dynamic Type       |
| Settings group header        | 15 semibold, `textQuaternary` | follows Dynamic Type       |
| Settings footnote            | 13 / 18, `textQuaternary`     | follows Dynamic Type       |
| Segment label                | 15, chosen 15 semibold        | follows Dynamic Type       |
| Hash / id value (About)      | 15 monospace                  | follows Dynamic Type       |

At the largest sizes Today widgets become full width (one per page); group cards stay square because
they hold no text.
