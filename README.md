# CommandCrafter

A form-based command builder for **Minecraft: Bedrock Edition**. Fill in the
fields, get a working command with a copy button on it.

Built for two jobs: putting blocks in the world, and wiring up NPC vendors and
dialogue.

## Pages

| Page | What's on it |
| --- | --- |
| `index.html` | Landing page |
| `build.html` | `/fill`, `/clone`, `/setblock`, clearing entities from a region |
| `npc.html` | Vendor buy/sell buttons, `/dialogue`, redstone summon chains, area locks |
| `scoreboard.html` | Objectives, editing scores, score maths, random rolls, global counters, display slots |
| `notes.html` | Free-form notes, saved in the browser, with search and export |
| `reference.html` | Bedrock syntax: coordinates, selectors, ranges, command blocks, colour codes |

## Running it

There is no build step and no dependencies. Open `index.html` in a browser —
double-clicking the file works fine, including the copy buttons.

To serve it locally instead:

```
python -m http.server 8000
```

then visit <http://localhost:8000>.

## How the generators work

Each one returns the **full set of commands in the order they have to run**, split
into success and failure branches where that applies. Every line has its own copy
button, each group has a "copy group", and there's a "copy all" at the bottom.
Copying never includes the headings, so a group can go straight into a dialogue
button.

A few things the generators handle so you don't have to:

- **Score ranges.** A price of 10 becomes `Coins=..9` for the failure branch and
  `Coins=10..` for the success branch. An exact `Coins=10` would lock out anyone
  holding 11.
- **Command ordering.** Charging a player, clearing an item and removing a tag all
  stop that player matching the selector, so anything after them silently does
  nothing. Rewards come first, every time.
- **The positional data value.** `/fill` needs a number before `replace`, so a `0`
  gets inserted when the field is left blank.
- **`dx/dy/dz`.** These are region *sizes*, not the second corner's coordinates.
  Give it two corners and it works out the box.
- **The 32,768 block ceiling** on `/fill` and `/clone`, with a warning and a
  rough split count when a region goes over.

## Coordinates

A coordinate set goes in **one box**, so you can paste a whole line straight out
of the game or out of a notes file. All of these read correctly:

```
607 62 1238
-394.74 66.00 -300.93        the game's own position readout
-337, 64, -318
x: 80 y: 70 z: -513
/tp 80 70 -513
Mizerville market: -337 64 -318
~ ~-1 ~
```

Decimals are rounded **down** to the block the position sits in. When a label
carries its own digits — `Cell 1: -320 55 -302` — the last three numbers are
taken as the coordinates. A readout under the field shows what was parsed before
you generate anything.

Tick **relative** to turn the numbers into tilde offsets: `-1` becomes `~-1`, and
an empty box becomes `~`.

## Notes

The notes page keeps free-form notes in the browser's `localStorage` — on that
machine, in that browser. Nothing is uploaded anywhere, and nothing is shared
between computers.

That also means clearing site data deletes them, so there are **Export .txt** and
**Export .json** buttons; the `.json` can be imported back. Import adds to what is
already saved rather than replacing it. Opened directly from disk, some browsers
block `localStorage` outright — the page detects this and says so instead of
pretending to have saved.

## Project layout

```
index.html   build.html   npc.html   scoreboard.html   notes.html   reference.html
assets/
  favicon.svg
  css/style.css
  js/icons.js       inline SVG icon set
  js/common.js      shared helpers: coordinates, names, ranges, clipboard, output
  js/data.js        block / item / entity / sound autocomplete lists
  js/build.js       build command generators
  js/npc.js         NPC and gameplay-logic generators
  js/scoreboard.js  scoreboard generators
  js/notes.js       notes storage, search, export and import
```

Plain HTML, CSS and JavaScript — no framework, no bundler, no `node_modules`.
Scripts are loaded as classic `<script>` tags rather than ES modules so the site
still works opened directly from disk.

The `dev/` directory is local scratch space and is not tracked.

---

Not affiliated with Mojang or Microsoft.
