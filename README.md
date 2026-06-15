# 花柄 hanagara

> *your life terminal*

A personal life OS — track your hobbies, goals, and daily quests with a soft, illustrated aesthetic inspired by the Kamiina Botan anime. Powered by Claude AI for a live companion, daily notes, and intro greetings.

---

## what it is

hanagara is a single-page web app that lives in your browser. No backend, no accounts — everything is saved to `localStorage`. It's yours.

**tabs:**
- **home** — AI-generated daily note, your auto-calculated stats, today's quests
- **hobbies** — aim training, ranking up, drawing, working out, photography — log sessions, earn XP, level up
- **goals** — long-term quests with progress tracking
- **todos** — daily checklist with XP rewards
- **companion** — live AI chat that knows your stats and history
- **settings** — 5 color themes (garden, dusk, ember, bloom, slate)

---

## running it locally

Just open `index.html` in your browser. No build step, no dependencies to install.

```bash
git clone https://github.com/YOUR_USERNAME/hanagara.git
cd hanagara
open index.html
```

> **Note:** The AI features (companion, daily whisper, intro greeting) call the Anthropic API. To use them, you'll need to serve the app through a proxy or local server that injects your API key — or add your key directly for local-only use.

---

## project structure

```
hanagara/
├── index.html       # app shell + markup
├── src/
│   ├── style.css    # all styles + themes
│   ├── data.js      # constants, default state, theme/color configs
│   └── app.js       # state, rendering, actions, AI calls
└── README.md
```

---

## themes

| name    | vibe                        |
|---------|-----------------------------|
| garden  | warm sage and parchment     |
| dusk    | deep purple night           |
| ember   | dark amber firelight        |
| bloom   | soft rose and pink          |
| slate   | dark blue, almost terminal  |

---

## design ideas — revisit later

### intro screen — flower bloom transition
The intro shows a **photo frame** containing a **flower bud with leaves in the backdrop**.
When the user enters, the flower **blossoms and expands** to fill the entire screen, transitioning into the app layout.

**open questions to decide:**
- flower rendering: SVG illustration (current approach) vs. supplying an actual photo/image
- bloom transition style: petals opening outward from center → app fades in behind, OR flower scales up and fills whole screen like a zoom/cover wipe
- backdrop leaves: soft + blurred (like the Vertere can photo) vs. graphic/flat (like the anime illustrations)
- post-bloom: does the flower remain visible anywhere in the app, or fully gives way to the layout?

**current implementation:** SVG-drawn flower bud + leaves, petals animate open on enter, app reveals underneath.

---



- [ ] weekly review screen
- [ ] calendar / heatmap view
- [ ] custom hobby/goal creation in-app
- [ ] milestone badges and level-up screen
- [ ] export data as JSON
- [ ] PWA support (installable, offline)
