# Design reference

The approved look of Hive's screens. Implement from here; don't invent screen designs.

- **Working version:** the Claude Design canvas
  https://claude.ai/artifact/74nihVmJwrptag9mPcnK7P (private, owner @stefanruvceski). This is where the
  design is changed.
- **Approved version:** this folder. It changes only through a PR, like code.

| Path                                     | What                                                         |
| ---------------------------------------- | ------------------------------------------------------------ |
| [tokens.md](tokens.md)                   | Colors (dark and light), sizes, spacing, type scale          |
| [canvas/canvas.json](canvas/canvas.json) | Canvas index: every screen, its size and place on the canvas |
| `canvas/<Screen>.dc.html`                | Each screen's source, byte-identical to the canvas           |

## Screens (iteration 3, approved 2026-10-31)

Each screen exists in dark (`<Screen>.dc.html`) and light (`<Screen>Light.dc.html`, the same screen with
`theme="light"`).

| Screen            | File                                        | Shows                                                                                     |
| ----------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Home              | [Main](canvas/Main.dc.html)                 | Fixed header, Today widgets (swipe sideways), group cards (App Library style), Dock       |
| Home, scrolled    | [HomeScrolled](canvas/HomeScrolled.dc.html) | Today and groups sliding under the fixed header and under the Dock                        |
| Group opened      | [GroupSheet](canvas/GroupSheet.dc.html)     | Sheet listing the group's apps with names                                                 |
| Customize Home    | [Customize](canvas/Customize.dc.html)       | Dock slots, groups (rename, reorder, delete empty), move / pin / hide an app, hidden apps |
| Everything hidden | [Empty](canvas/Empty.dc.html)               | Empty state with "Customize Home"                                                         |
| Settings          | [Settings](canvas/Settings.dc.html)         | Home, Appearance (System / Dark / Light), Date format, Backup, About                      |
| Largest text size | [LargeText](canvas/LargeText.dc.html)       | Full-width Today widgets, wrapping title                                                  |

Placeholders in the screens are not product copy: `[AMOUNT]`, `[DESCRIPTION]`, `[VERSION]`,
`[Future group n]` (used only to make the prototype scroll).

## Decisions captured in this design

- Home = **Today** (glanceable summaries from modules) above **groups** of apps; pinned apps live in
  the **Dock** (max 4) and are not repeated in their group on Home.
- Groups are user-editable (rename, reorder, add, delete when empty); apps can be moved, pinned, hidden.
- Group cards are 2×2 squares without text inside; the group name is small, under the card.
- Liquid Glass only on floating controls (header buttons, Dock, action bars); content sits on frosted
  cards over a fixed wallpaper glow.
- Scrolling: the header stays put; content slides under it and under the Dock with a soft fade.
- Accent teal `#2DD4BF`; light theme uses `#0F766E` for teal text.

## Rules for agents

1. Implement from **this folder**, never from the canvas. If the canvas differs from the repo, ask the
   user whether the difference is wanted; don't implement it unasked.
2. A PR that changes a screen's look updates its files here in the same PR (pull the canvas at
   handoff) and says so in the PR description.
3. To read a screen: open its `.dc.html` — inline styles carry exact sizes and colors; the
   `renderVals()` script at the bottom holds the theme tokens (`c`), app tints and the type scale (`s`).
4. To work on the design visually (Claude agents only): open the canvas link above. If it is not
   available, create a new Claude Design canvas and publish every file in `canvas/` to it as
   `project/<file name>` (`canvas.json` as `project/canvas.json`) — it renders the same screens.
5. Other agents can read the files but not render them; they implement from `tokens.md` and the
   inline styles.
