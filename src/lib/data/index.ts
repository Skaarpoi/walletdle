import type { Character } from '$lib/types';
import genshinCharacters from './genshin-impact.json';
import hsrCharacters from './honkai-star-rail.json';
import arknightsCharacters from './arknights.json';
import blueArchiveCharacters from './blue-archive.json';

export { genshinCharacters, hsrCharacters, arknightsCharacters, blueArchiveCharacters };

export const characters: Character[] = [
	...(genshinCharacters as Character[]),
	...(hsrCharacters as Character[]),
	...(arknightsCharacters as Character[]),
	...(blueArchiveCharacters as Character[])
];

export const charactersById: Record<string, Character> = Object.fromEntries(
	characters.map((c) => [c.id, c])
);

export const charactersByName: Record<string, Character> = Object.fromEntries(
	characters.map((c) => [c.name.toLowerCase(), c])
);
