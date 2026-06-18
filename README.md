# 花柄 hanagara

*a personal life terminal*

Single-page web app. No backend, no accounts, no build step. Everything lives in `localStorage` and runs straight from the file system. You open `index.html` and that's it.

Originally built around tracking the things that actually matter day to day: what you're playing, reading, watching, working toward, listening to. Grew into something more complete from there.

---

## getting started

```bash
git clone https://github.com/Lahpy/hanagara.git
cd hanagara
open index.html
```

You'll need to add your API keys to `src/config.js` before the AI features and weather work:

```js
const ANTHROPIC_API_KEY   = 'sk-ant-...';
const OPENWEATHER_API_KEY = 'your-key-here';
```

Both files are gitignored by default so your keys stay local.

---

## what's in it

**world** is the home screen. Live weather and a 5-day forecast (tap any day to drill into hourly). A 30-day activity heatmap. Four insight quadrants showing your current todos, top goal, last hobby session, and last song with real context and breakdowns. A pulse feed that searches the web for news about what's actually on your board right now: patch notes for the games you're playing, new releases matching your drink profile, author news for books you're reading. A decorative shinkansen scene at the bottom that themes correctly across all color modes.

**interests** is a free-arrange card grid covering six types:

| type | what it tracks |
|------|----------------|
| general | anything with session logging and streaks |
| games | UID, characters with tier ratings, daily/weekly reminders |
| anime | watch status, character tier lists (S through D), taste tags, AI recs |
| books | reading status, author, star rating, manga toggle, notes, AI recs |
| fitness | activity type, session log with duration, streak, total minutes |
| alcohol | favorites list, taste profile tags, notes, AI recs |

Cards are draggable to any position. Tapping a card opens a detail drawer with the full feature set for that type. Filter by type using the pill bar at the top.

**goals** uses a two-column layout. The left side is the goal list with circular progress rings, pace estimates, and AI advice on demand. The right side is a sticky overview card with a large 160px ring showing your average completion across all goals, a per-goal breakdown with colored bars, and a "closest to done" shortlist.

**todos** has a calendar view at the top, grouped task sections (today, upcoming, completed), and priority color coding per item.

**music** is a log of everything you've been listening to with AI-assisted parsing from free-text input. The right column builds a taste profile in real time: a genre pie chart in the app's accent colors, top artists ranked by play count, mood tags across recent sessions.

**journal** is a daily writing space with a five-point mood picker. Past entries show word count, expand on tap, and are stored by date key so the structure stays clean.

**notes** renders as a masonry column grid. Each note gets a color-coded left accent bar. Search, sort by recency or pin status.

**history** is a chronological activity log with type-colored icons and a per-day summary line showing what kinds of things happened.

**settings** has theme selection, manual location entry (skips the GPS prompt), export/import as JSON, and a weekly recap button that fires an AI-generated summary through the spirit orb.

---

## the spirit orb

The floating circle in the bottom-right corner is a quiet AI presence. It watches your data and speaks when opened. Its color and breathing rate change based on how recently you've been active: amber and faster when you logged something today, blue and slower when a couple days have passed, violet with a slow drift when it's been a while.

It can take actions from conversation: add a todo, log a hobby session, increment a goal. It remembers the last several exchanges across sessions and its tone shifts with your activity. The weekly recap routes through it automatically on Sundays.

---

## themes

12 themes covering a wide range of the color spectrum:

**light:** paper, parchment, ember, rose, stone, slate

**dark:** charcoal, ink, midnight, grape, plum, matcha

Each theme tunes its own accent colors so the sage, rose, amber, and violet values complement the base rather than clashing with it.

---

## project structure

```
hanagara/
├── index.html       # app shell, all panels, modals, drawers
├── src/
│   ├── style.css    # all styles and all 12 themes (~1400 lines)
│   ├── data.js      # constants, default state, interest types, theme configs
│   ├── app.js       # all logic and rendering (~3750 lines)
│   ├── blossom.js   # intro flower animation
│   └── config.js    # API keys (gitignored)
└── README.md
```

No framework. No bundler. No npm. Vanilla JS and CSS, structured around a single state object persisted to `localStorage` under the key `hanagara-v1`.
