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
| `npc.html` | Vendor buy/sell buttons, `/dialogue`, scoreboards, redstone summon chains, area locks |
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

Every coordinate field takes an absolute number (`607`) or a tilde offset (`~-1`).
Tick **relative** on a corner and you can type just the offset — `-1` becomes
`~-1`, and leaving the box empty gives you `~`.

## Project layout

```
index.html          build.html          npc.html          reference.html
assets/
  css/style.css
  js/common.js      shared helpers: coordinates, clipboard, output rendering
  js/data.js        block / item / entity / sound autocomplete lists
  js/build.js       build command generators
  js/npc.js         NPC and gameplay-logic generators
```

Plain HTML, CSS and JavaScript — no framework, no bundler, no `node_modules`.
Scripts are loaded as classic `<script>` tags rather than ES modules so the site
still works opened directly from disk.

The `dev/` directory is local scratch space and is not tracked.

---

Not affiliated with Mojang or Microsoft.
