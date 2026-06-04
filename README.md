# 💸 Walletdle

A daily gacha character guessing game. Guess today's character by comparing attributes — each guess costs **$20**, each hint costs **$100**. Try not to go bankrupt. 💀

## 🧰 Stack

- **SvelteKit** + **Svelte 5** (runes mode)
- **TypeScript**
- **Cloudflare Workers** via `@sveltejs/adapter-cloudflare`

## 🎮 How it works

A new character is selected each day using a deterministic date-based index. The target is only ever known server-side — the client receives hints (correct / higher / lower / wrong) but never the character itself.

Guesses and purchased hints are persisted in an `httpOnly` cookie keyed by date, so progress survives page refreshes and resets automatically the next day.

## ➕ Adding characters

Edit [`src/lib/data/characters.ts`](src/lib/data/characters.ts). Each entry must satisfy the `Character` type:

| Field            | Type             | Notes                                                              |
| ---------------- | ---------------- | ------------------------------------------------------------------ |
| `id`             | `string`         | Unique kebab-case slug                                             |
| `name`           | `string`         | Display name                                                       |
| `game`           | `Game`           | Must match the `Game` union in `types.ts`                          |
| `developer`      | `Developer`      | Studio — `'HoYoverse' \| 'Yostar' \| 'Nexon' \| ...`               |
| `releaseDate`    | `string`         | `YYYY-MM-DD` global/EN release                                     |
| `rarity`         | `RarityTier`     | `'N' \| 'R' \| 'SR' \| 'SSR' \| 'Other'` — normalised across games |
| `gender`         | `Gender`         | `'Male' \| 'Female' \| 'Other'`                                    |
| `species`        | `Species`        | `{ type: 'Demi-human', sub: 'Wolf' }` — `sub` is `''` for humans   |
| `hairColor`      | `HairColor`      | Broad colour category                                              |
| `eyeColor`       | `EyeColor`       | Broad colour category                                              |
| `heightCategory` | `HeightCategory` | `'Short' \| 'Average' \| 'Tall'`                                   |
| `outfitColor`    | `OutfitColor`    | Dominant outfit colour                                             |
| `affiliation`    | `string`         | Nation, school, faction, stable, etc.                              |
| `voiceActorJP`   | `string`         | Japanese voice actor (romanised)                                   |

To add a new game, extend the `Game` union in [`src/lib/types.ts`](src/lib/types.ts).

## 🗂️ Adding or changing compared attributes

Edit `ATTRIBUTE_CONFIGS` in [`src/lib/gameLogic.ts`](src/lib/gameLogic.ts). Each entry controls a column in the guess table:

```ts
{ key: 'element', label: 'Element', type: 'exact' }
{ key: 'rarity',  label: 'Rarity',  type: 'ordered' }
```

- `exact` — ✅ green if match, grey if not
- `ordered` — ✅ green if match, 🔵 ↑ if target is higher, 🔵 ↓ if lower

## 💰 Cost constants

Also in `gameLogic.ts`:

```ts
export const GUESS_COST = 20; // $ per guess
export const HINT_COST = 100; // $ per column hint
export const MAX_GUESSES = 8;
```

## 🛠️ Dev

```sh
npm install
npm run dev
```

## 🚀 Deploy

```sh
npm run deploy   # builds and pushes to Cloudflare Workers
```
