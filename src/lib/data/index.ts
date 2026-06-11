import type {
	Character,
	EyeColor,
	Game,
	Gender,
	HairColor,
	HeightCategory,
	OutfitColor,
	RarityTier,
	SpeciesType
} from '$lib/types';
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
const VALID_GENDERS = new Set<string>(['Male', 'Female', 'Other'] satisfies Gender[]);
const VALID_SPECIES_TYPES = new Set<string>([
	'Human',
	'Demi-human',
	'Fantasy',
	'Android',
	'Other'
] satisfies SpeciesType[]);
const VALID_HAIR_COLORS = new Set<string>([
	'Black',
	'White',
	'Blonde',
	'Brown',
	'Red',
	'Blue',
	'Green',
	'Pink',
	'Purple',
	'Multicolor'
] satisfies HairColor[]);
const VALID_EYE_COLORS = new Set<string>([
	'Black',
	'Brown',
	'Red',
	'Blue',
	'Green',
	'Purple',
	'Yellow',
	'Pink',
	'White',
	'Multicolor'
] satisfies EyeColor[]);
const VALID_HEIGHT_CATEGORIES = new Set<string>([
	'Short',
	'Average',
	'Tall'
] satisfies HeightCategory[]);
const VALID_OUTFIT_COLORS = new Set<string>([
	'Black',
	'White',
	'Red',
	'Blue',
	'Green',
	'Purple',
	'Yellow',
	'Pink',
	'Brown',
	'Multicolor'
] satisfies OutfitColor[]);

type RawCharacter = (typeof genshinCharacters)[number];

function parseCharacters(raw: RawCharacter[]): Character[] {
	for (const c of raw) {
		if (!VALID_GAMES.has(c.game)) throw new Error(`Character "${c.id}": unknown game "${c.game}"`);
		if (!VALID_RARITIES.has(c.rarity))
			throw new Error(`Character "${c.id}": unknown rarity "${c.rarity}"`);
		if (!VALID_GENDERS.has(c.gender))
			throw new Error(`Character "${c.id}": unknown gender "${c.gender}"`);
		if (!VALID_SPECIES_TYPES.has(c.species.type))
			throw new Error(`Character "${c.id}": unknown species.type "${c.species.type}"`);
		if (!VALID_HAIR_COLORS.has(c.hairColor))
			throw new Error(`Character "${c.id}": unknown hairColor "${c.hairColor}"`);
		if (!VALID_EYE_COLORS.has(c.eyeColor))
			throw new Error(`Character "${c.id}": unknown eyeColor "${c.eyeColor}"`);
		if (!VALID_HEIGHT_CATEGORIES.has(c.heightCategory))
			throw new Error(`Character "${c.id}": unknown heightCategory "${c.heightCategory}"`);
		if (!VALID_OUTFIT_COLORS.has(c.outfitColor))
			throw new Error(`Character "${c.id}": unknown outfitColor "${c.outfitColor}"`);
	}
	return raw as unknown as Character[];
}

// Sorted by id so JSON file insertion order doesn't affect the daily character sequence.
export const characters: Character[] = [
	...parseCharacters(genshinCharacters),
	...parseCharacters(hsrCharacters),
	...parseCharacters(arknightsCharacters),
	...parseCharacters(blueArchiveCharacters)
].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

function buildIndex<K extends keyof Character>(
	chars: Character[],
	key: K,
	transform: (v: Character[K]) => string = String,
	strict = true
): Record<string, Character> {
	const result: Record<string, Character> = {};
	for (const c of chars) {
		const k = transform(c[key]);
		if (strict && Object.hasOwn(result, k)) throw new Error(`Duplicate character ${key}: "${k}"`);
		result[k] = c;
	}
	return result;
}

export const charactersById = buildIndex(characters, 'id');

// Names shared by characters from different games (case-insensitive).
const ambiguousNames = new Set<string>(
	[...Map.groupBy(characters, (c) => c.name.toLowerCase())]
		.filter(([, group]) => group.length > 1)
		.map(([name]) => name)
);

// "Name (Game)" for characters whose name collides with another game's character, else "Name".
export function displayName(c: Character): string {
	return ambiguousNames.has(c.name.toLowerCase()) ? `${c.name} (${c.game})` : c.name;
}

// Sorted list of display names for the guess autocomplete datalist.
export const characterDisplayNames: string[] = characters.map(displayName).sort();

// Lowercased display name → Character. Handles both "Name" and "Name (Game)" inputs.
export const charactersByDisplayName: Record<string, Character> = Object.fromEntries(
	characters.map((c) => [displayName(c).toLowerCase(), c])
);
