# 花柄 hanagara

> *your life terminal*

A personal life OS — track your hobbies, goals, music taste, and daily life. Powered by Claude AI for a live companion, weather-aware world view, and music identity profiling.

---

## what it is

hanagara is a single-page web app that lives in your browser. No backend, no accounts — everything is saved to `localStorage`. It's yours.

**tabs:**
- **world** — live sky based on real weather, 30-day activity grid, horizontal timeline of logged sessions
- **hobbies** — log sessions, track what you spend time on
- **goals** — long-term progress tracking
- **todos** — daily checklist
- **music** — log what you listen to, AI identifies artist/genre/mood, builds a living taste profile with pie chart
- **history** — audit log of everything you've done in the app
- **settings** — 6 themes, data reset

**spirit** — a persistent AI companion in the bottom-right corner. Always watching, occasionally speaks unprompted. Knows your data, has memory, has moods. Can add todos, log sessions, and create goals on your behalf.

---

## running it locally

Serve with Live Server (VS Code extension) or any local server — don't open index.html directly as a file, the API calls won't work.

```bash
git clone https://github.com/Lahpy/hanagara.git
cd hanagara
# open with VS Code Live Server, or:
python -m http.server 8000
```

Then open `http://localhost:8000`.

---

## config

Create `src/config.js` (gitignored — never committed):

```js
const ANTHROPIC_API_KEY = 'your-key-here';
const OPENWEATHER_API_KEY = 'your-key-here';
```

- Anthropic key: [console.anthropic.com](https://console.anthropic.com)
- OpenWeather key: [openweathermap.org/api](https://openweathermap.org/api) (free)

---

## project structure

```
hanagara/
├── index.html        # app shell + markup
├── src/
│   ├── style.css     # all styles + themes
│   ├── data.js       # constants, default state, theme/color configs
│   ├── app.js        # state, rendering, actions, AI calls
│   ├── blossom.js    # world tab — timeline, streak grid, sketches
│   └── config.js     # API keys (gitignored)
└── README.md
```

---

## themes

| name  | vibe                     |
|-------|--------------------------|
| white | clean, minimal, daylight |
| warm  | paper tone, soft         |
| dark  | deep black               |
| dusk  | indigo night             |
| teal  | moonlit river            |
| stone | cool grey                |

---

## design notes — revisit later

### intro screen — flower bloom
The intro shows an SVG flower bud in a photo frame with illustrated leaves.
On enter: petals open one by one → stamen fades in → frame expands and fades → app reveals.

**open questions:**
- Real photo vs SVG illustration for the frame content
- Bloom style: petals outward vs full-screen zoom wipe
- Backdrop: blurred photographic vs graphic/flat
- Does the flower persist anywhere after entering?

---

## roadmap

### personal (current focus)
- [ ] Notes field on timeline entries (partially done)
- [ ] Better empty states — guide new users through first setup
- [ ] Spirit memory persistence — remember things across sessions more reliably
- [ ] Music: album art placeholder per genre (color field per genre type)
- [ ] Hobby session notes — add a short note when logging a session
- [ ] Weekly recap — spirit generates a summary of the week on Sunday
- [ ] PWA support — installable, works offline for non-AI features
- [ ] Export data as JSON backup

### public / sharing (future)
The long-term vision is that each person has their own terminal they can share — a link that shows a read-only view of their world: music taste, hobbies, goals, activity. A window into who someone is.

This requires:
- **Backend + database** — user accounts, data stored server-side (Supabase or similar)
- **Public profile URLs** — `hanagara.app/u/username` shows a shareable read-only view
- **Auth layer** — sign in, own your data
- **Public vs private split** — music and hobbies public, todos and spirit conversations private
- **Share unit** — share whole terminal, or just music profile card, or just world view
- **Onboarding** — first-run flow explaining the terminal model to new users

Data structures are already shaped well for this — the music card is already designed as a shareable artifact. The main work is infrastructure, not redesign.
