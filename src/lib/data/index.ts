import type { Character, Game, RarityTier } from '$lib/types';
import genshinCharacters from './genshin-impact.json';
import hsrCharacters from './honkai-star-rail.json';
import arknightsCharacters from './arknights.json';
import blueArchiveCharacters from './blue-archive.json';

export { genshinCharacters, hsrCharacters, arknightsCharacters, blueArchiveCharacters };

const VALID_GAMES = new Set<string>([
	'Genshin Impact',
	'Honkai: Star Rail',
	'Arknights',
	'Blue Archive',
	'Wuthering Waves'
] satisfies Game[]);
const VALID_RARITIES = new Set<string>(['N', 'R', 'SR', 'SSR', 'Other'] satisfies RarityTier[]);

type RawCharacter = (typeof genshinCharacters)[number];

function parseCharacters(raw: RawCharacter[]): Character[] {
	for (const c of raw) {
		if (!VALID_GAMES.has(c.game)) throw new Error(`Character "${c.id}": unknown game "${c.game}"`);
		if (!VALID_RARITIES.has(c.rarity))
			throw new Error(`Character "${c.id}": unknown rarity "${c.rarity}"`);
	}
	return raw as unknown as Character[];
}

export const characters: Character[] = [
	...parseCharacters(genshinCharacters),
	...parseCharacters(hsrCharacters),
	...parseCharacters(arknightsCharacters),
	...parseCharacters(blueArchiveCharacters)
];

function buildIndex<K extends keyof Character>(
	chars: Character[],
	key: K,
	transform: (v: Character[K]) => string = String
): Record<string, Character> {
	const result: Record<string, Character> = {};
	for (const c of chars) {
		const k = transform(c[key]);
		if (k in result) throw new Error(`Duplicate character ${key}: "${k}"`);
		result[k] = c;
	}
	return result;
}

export const charactersById = buildIndex(characters, 'id');
export const charactersByName = buildIndex(characters, 'name', (n) => n.toLowerCase());
