# Walletdle — Code Overview

A gacha-character guessing game (Wordle-style) where each guess and hint "costs
money," and your goal is to identify the target character while spending as little
as possible. Built with **SvelteKit 5 (runes mode)** and deployed to **Cloudflare
Workers** via `@sveltejs/adapter-cloudflare`.

There are two modes, each its own route sharing one game board:

- **Daily** (`/`) — one target character per calendar day, the same for everyone.
- **Endless** (`/endless`) — a new random character each round, with running
  session stats (games won, total spent, best single-round spend).

This document describes everything under [src/](src/) and how the pieces fit
together. It is meant as a fast lookup for future work.

---

## How the game works (player's view)

- Each calendar day has one **target character**, the same for everyone.
- You type a character name (autocompleted from a datalist) and submit a guess.
  Each guess costs **$20**.
- For every attribute (Game, Rarity, Gender, …), the guessed character's value is
  compared to the target and shown as a colored cell:
  - **correct** (✓, green), **wrong** (✗, dim)
  - **partial** (~, yellow) — only for `species` (same type, different sub)
  - **higher** (↑) / **lower** (↓, blue) — for ordered attributes (rarity, height,
    release date), telling you which direction the target is.
- You can **buy a hint** for a single column for **$100**, which permanently reveals
  the target's value for that attribute.
- You win by guessing the exact character. There is **no guess limit** and no lose
  state — you keep guessing (at $20 each) until you win, and your score is the total
  spent (lower is better).
- When you win you can **Share** an emoji grid + total spent to the clipboard.
- Progress is stored in an **httpOnly cookie**. In **daily** mode it resets each
  day; in **endless** mode (`/endless`) winning reveals a **Next character** button
  that deals a fresh random target, and a running session line tracks games won,
  total spent, and your best (lowest) single-round spend.

---

## File map

```
src/
├── app.html                     # HTML shell (loads "Press Start 2P" font)
├── app.d.ts                     # SvelteKit App.Platform types (Cloudflare env)
├── worker-configuration.d.ts    # Generated Cloudflare Worker env types (wrangler types)
├── routes/
│   ├── +layout.svelte           # Sets favicon, renders children
│   ├── +page.svelte             # Daily route: thin wrapper around <GameBoard>
│   ├── +page.server.ts          # Daily load + actions (guess/hint), daily cookie
│   └── endless/
│       ├── +page.svelte         # Endless route: <GameBoard> + stats + "Next" button
│       └── +page.server.ts      # Endless load + actions (guess/hint/next), endless cookie
└── lib/
    ├── index.ts                 # $lib placeholder (empty)
    ├── types.ts                 # All domain types (Character, attributes, enums, hints)
    ├── gameLogic.ts             # Constants + ATTRIBUTE_CONFIGS (shared client/server)
    ├── components/
    │   └── GameBoard.svelte     # Shared UI: input, table, slot animation, share
    ├── server/
    │   ├── gameLogic.ts         # getDailyCharacter/getRandomCharacter + evaluateGuess
    │   └── game.ts              # Shared round logic (applyGuess/applyHint/rehydrate)
    ├── assets/favicon.svg
    ├── data/
    │   ├── index.ts             # Loads + validates JSON, builds lookup indexes
    │   ├── characterschema.json # JSON Schema for a character entry (authoring aid)
    │   ├── genshin-impact.json  # Character data per game
    │   ├── honkai-star-rail.json
    │   ├── arknights.json
    │   └── blue-archive.json
    └── vitest-examples/         # Starter test examples (not part of the game)
```

---

## Core concepts

### The Character model — [src/lib/types.ts](src/lib/types.ts)

A `Character` has these attributes (all guessable/comparable):

| field            | type                             | comparison                          |
| ---------------- | -------------------------------- | ----------------------------------- |
| `id`             | kebab-case slug                  | unique key, not shown as a column   |
| `name`           | string                           | the thing you're guessing           |
| `game`           | `Game` union                     | exact                               |
| `rarity`         | `N`\|`R`\|`SR`\|`SSR`\|`Other`   | ordered                             |
| `gender`         | `Male`\|`Female`\|`Other`        | exact                               |
| `species`        | `{ type, sub }` (`Hierarchical`) | hierarchical (type match = partial) |
| `hairColor`      | `HairColor` union                | exact                               |
| `eyeColor`       | `EyeColor` union                 | exact                               |
| `heightCategory` | `Short`\|`Average`\|`Tall`       | ordered                             |
| `outfitColor`    | `OutfitColor` union              | exact                               |
| `affiliation`    | string                           | exact                               |
| `voiceActorJP`   | string                           | exact                               |
| `releaseDate`    | `YYYY-MM-DD`                     | ordered (displayed as `YYYY-MM`)    |

Key supporting types:

- `ComparisonType = 'exact' | 'ordered' | 'hierarchical'`
- `HintResult = 'correct' | 'partial' | 'higher' | 'lower' | 'wrong'`
- `AttributeConfig` — declares how an attribute is labeled, compared, formatted,
  and (for ordered) ranked via an `order` fn.
- `GuessResult = { character, hints: Partial<Record<keyof Character, HintResult>> }`

### Attribute configuration — [src/lib/gameLogic.ts](src/lib/gameLogic.ts)

The single source of truth for **which columns exist and how each compares** is
`ATTRIBUTE_CONFIGS`. The page renders columns by iterating this array, and the
server evaluates guesses by iterating it too — so adding/removing a column is done
here in one place.

Also exports the economy constants:

- `HINT_COST = 100`
- `GUESS_COST = 20`

(There is no guess limit — the game ends only on a win.)

Ordered attributes use rank maps: `RARITY_ORDER`, `HEIGHT_ORDER`; `releaseDate`
relies on string comparison of the ISO date (no `order` fn, just `format`).

> This file is imported by **both** client and server, so keep it free of
> server-only or data-loading code.

### Guess evaluation — [src/lib/server/gameLogic.ts](src/lib/server/gameLogic.ts)

Server-only (lives under `lib/server`, so SvelteKit forbids client import).

- `getDailyCharacter()` — deterministic daily pick:
  `characters[floor(Date.now() / 86_400_000) % characters.length]`.
  The day index is UTC-based (ms since epoch / ms-per-day).
- `getRandomCharacter()` — uniform random pick, used by endless mode.
- `evaluateGuess(guess, target)` — walks `ATTRIBUTE_CONFIGS` and produces a
  `HintResult` per attribute:
  - `exact`: strict `===`.
  - `ordered` (`compareOrdered`): maps both values through `order` (or compares
    raw), returns `correct` / `higher` / `lower`; invalid ranks → `wrong`.
    `higher` means the target's value is higher than the guess.
  - `hierarchical` (`compareHierarchical`): same type+sub → `correct`; same type
    only → `partial`; else `wrong`.

### Character data + indexes — [src/lib/data/index.ts](src/lib/data/index.ts)

Loads the four per-game JSON files and merges them into one `characters` array,
**sorted by `id`** so the file insertion order can't change the daily sequence.

`parseCharacters` validates every record at module load against `Set`s of valid
enum values and throws a descriptive error if any field is invalid (a build/boot
time guard; the JSON is the runtime source of truth, not the TS unions).

Derived lookups exported for the routes:

- `charactersById` — id → Character (used to rehydrate cookie guesses).
- `displayName(c)` — returns `"Name (Game)"` only when the bare name collides with
  a character from another game (case-insensitive), else `"Name"`.
- `characterDisplayNames` — sorted display names for the autocomplete `<datalist>`.
- `charactersByDisplayName` — lowercased display name → Character (resolves the
  player's typed guess; accepts both `"Name"` and `"Name (Game)"`).

> `genshin-impact.json` is also imported for its inferred type as `RawCharacter`.

Each game JSON is an array of character objects matching
[characterschema.json](src/lib/data/characterschema.json) (a JSON Schema kept for
authoring/validation reference; not wired into the runtime). When adding
characters, follow that schema: unique kebab-case `id`, `releaseDate` as
`YYYY-MM-DD`, `species.sub = ""` for plain humans.

---

## Request/response flow

The two modes share their core logic; only target selection and cookie shape
differ. All game rules are enforced **server-side** — the client cannot fabricate
a win, and the target identity is never sent to the client except via revealed
hints / a correct guess.

### Cookie encryption — [src/lib/server/crypto.ts](src/lib/server/crypto.ts)

Both cookies are **AES-GCM encrypted** before being set and decrypted on read, so
their contents (notably the endless `targetId`) are opaque to the client and
tamper-evident — a forged/edited cookie fails the GCM auth tag, `decryptCookie`
returns `null`, and the mode treats it as a fresh game. The key is derived
(SHA-256) from a server secret read lazily from `$env/dynamic/private` as
`WALLETDLE_SECRET`.

> **Reminder is server-state aware:** a Cloudflare Worker is stateless/ephemeral
> (no per-user server memory; module globals are shared across users and evicted),
> so per-user state lives in the cookie. Encryption is what keeps that
> client-held state private without needing KV/Durable Objects.

> **Secret setup:** copy [.dev.vars.example](.dev.vars.example) → `.dev.vars`
> (gitignored) for local `wrangler dev` / `vite dev`; in production run
> `wrangler secret put WALLETDLE_SECRET`. `WALLETDLE_SECRET` is declared on the
> generated `Env`/`ProcessEnv` types (via `npm run cf-typegen`, which reads
> `.dev.vars`). Without a secret, `crypto.ts` falls back to an insecure dev
> default. Rotating the secret invalidates all existing cookies (in-progress
> games reset).

### Shared round logic — [src/lib/server/game.ts](src/lib/server/game.ts)

Mode-agnostic helpers operating on a `RoundState` (`{ guesses, purchasedHints }`),
which each mode's cookie extends:

- `hasWon(state, target)` — has the target's id been guessed.
- `rehydrateGuesses(state)` — expand compact stored guesses (`{ characterId,
hints }`) into full `GuessResult[]`, dropping any unknown id.
- `applyGuess(state, target, formData)` — validates the typed name (unknown /
  duplicate), evaluates server-side, pushes onto `state.guesses`. Returns a
  `fail(400, { error })` for the action to re-return, or `undefined` on success.
- `applyHint(state, target, formData)` — validates the key / already-purchased,
  stores the formatted target value in `state.purchasedHints`.

Each route wraps these with its own cookie read/write and target resolution.

### Daily mode — [src/routes/+page.server.ts](src/routes/+page.server.ts)

Cookie `walletdle` (httpOnly, sameSite=lax, maxAge 48h):

```ts
type CookieData = RoundState & {
	date: string; // YYYY-MM-DD; mismatched date → reset
};
```

The target is **derived from the date** (`getDailyCharacter`), so it is never
stored. `readCookie` returns a fresh empty state if the cookie is missing,
malformed, or from a previous day (the daily reset). `load` rehydrates guesses and
computes `won`; `actions.guess` / `actions.hint` call the shared helpers and persist.

### Endless mode — [src/routes/endless/+page.server.ts](src/routes/endless/+page.server.ts)

Cookie `walletdle-endless` (httpOnly, sameSite=lax, maxAge 1yr):

```ts
type CookieData = RoundState & {
	targetId: string; // random target MUST be persisted (not derivable)
	stats: { gamesWon: number; totalSpent: number; bestSpend: number | null };
};
```

- The target is random, so `targetId` is stored in the cookie. `load` persists the
  cookie (so a freshly dealt target stays stable across requests) and starts a new
  round if the stored id is missing/unknown.
- `actions.guess` / `actions.hint` resolve the target via `charactersById[targetId]`
  and reuse the shared helpers.
- `actions.next` — only valid once the round is won; folds the round's spend into
  `stats` (`gamesWon++`, `totalSpent +=`, `bestSpend = min`) and deals a fresh
  random character with empty guesses/hints.

> `targetId` is kept out of reach because the cookie is **encrypted** (see below),
> so the player can't read the answer from it.

### Shared UI — [src/lib/components/GameBoard.svelte](src/lib/components/GameBoard.svelte)

One Svelte 5 (runes) component renders the board for both routes. Props: `data`
(guesses/won/characterNames/purchasedHints), `form`, `title`, `shareTitle`, and a
`headerExtra` snippet for mode-specific header controls.

- `spent` (`$derived`) = `guesses * 20 + purchasedHints * 100`.
- Forms use `use:enhance`; the guess form clears the input and re-renders without a
  full reload.
- **Table**: header row renders one `<th>` per `ATTRIBUTE_CONFIGS` entry, showing
  either a revealed hint value (`getRevealedValue`: from a purchased hint or a
  prior `correct` guess) or a **$100 hint buy button**. Body renders one row per
  guess with colored `hint-{result}` cells.
- **Slot-machine animation** (`animateRow` + `rowDisplays`/`SPIN_POOLS`): when a
  new guess appears, each new row's cells "spin" through random pool values, then
  stop left-to-right with a stagger. Purely cosmetic. `$effect` triggers it only
  when the guess count increases (not on initial hydration).
- **Share** (`buildShareText` + `shareResults`): emoji grid (`SHARE_EMOJI` per
  hint) + spend + origin, copied to clipboard; available in both modes.
- All styling is component-scoped retro/arcade CSS (Press Start 2P, neon accents).

The route components are thin: each passes data/form to `<GameBoard>` and supplies
a `headerExtra` snippet — daily adds a link to `/endless`; endless adds the running
stats line, a link back to `/`, and (on win) the **Next character** form button.
Internal links use `resolve()` from `$app/paths` (required by the lint config).

---

## Build / deploy / tooling

- **Framework**: SvelteKit 2 + Svelte 5, runes forced on (`svelte.config.js`).
- **Adapter / host**: Cloudflare Workers ([wrangler.jsonc](wrangler.jsonc));
  `nodejs_compat` + `nodejs_als` flags; static assets served via `ASSETS` binding;
  observability + source map upload on. No KV/D1/R2 bindings — state is cookie-only.
- **Scripts** ([package.json](package.json)): `dev` (vite), `build`,
  `preview` (build + `wrangler dev`), `deploy` (build + `wrangler deploy`),
  `check` (svelte-check), `lint` (prettier + eslint), `format`,
  `test`/`test:unit` (vitest), `cf-typegen` (regenerate worker types).
- **Tests**: `src/lib/vitest-examples/` are template examples only; there are no
  game-specific tests yet. Vitest is configured with a browser (Playwright) project
  for `.svelte` tests and a node project for server logic — good places to add
  tests for `evaluateGuess` and the data indexes.
- **Pre-commit**: simple-git-hooks → lint-staged.

---

## Common change recipes

- **Add a character**: append an object to the relevant
  `src/lib/data/<game>.json` following `characterschema.json`. Validation runs at
  load; a bad enum value throws with the offending `id`. Unique `id` required.
- **Add a new game**: extend the `Game` union in `types.ts`, add its name to
  `VALID_GAMES` in `data/index.ts`, create `data/<game>.json`, import + spread it
  into `characters`, and add it to `SPIN_POOLS.game` in `components/GameBoard.svelte`.
- **Add/change a guessable attribute**: update the `Character` type and any enum in
  `types.ts`, add an `AttributeConfig` entry in `gameLogic.ts` (this drives both
  columns and evaluation), add a `SPIN_POOLS` entry in `components/GameBoard.svelte`,
  and add data to each game JSON (+ schema). `evaluateGuess` in `server/gameLogic.ts`
  is generic over the config and usually needs no change unless a new
  `ComparisonType` is added.
- **Change the board for both modes**: edit `components/GameBoard.svelte` — it's the
  single shared UI. Mode-specific header controls go in each route's `headerExtra`
  snippet; shared guess/hint validation lives in `server/game.ts`.
- **Add another mode**: create a route with its own `+page.server.ts` (cookie +
  target resolver) reusing `server/game.ts` helpers, and a `+page.svelte` that
  renders `<GameBoard>` with a `headerExtra` snippet.
- **Tune the economy**: edit `GUESS_COST`, `HINT_COST` in `gameLogic.ts`.
- **Re-add a guess limit / lose state**: reintroduce a `MAX_GUESSES` constant in
  `gameLogic.ts`, compute `lost = !won && guesses.length >= MAX_GUESSES` in
  `+page.server.ts` (in `load` and both action guards), return it from `load`, and
  render a lose branch in `+page.svelte` (the previous "You went bankrupt!" message
  - `.wallet-lose` style).
