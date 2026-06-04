import type { AttributeConfig } from '$lib/types';

export const MAX_GUESSES = 8;
export const HINT_COST = 100;
export const GUESS_COST = 20;

export const ATTRIBUTE_CONFIGS: AttributeConfig[] = [
	{ key: 'game', label: 'Game', type: 'exact' },
	{ key: 'rarity', label: 'Rarity', type: 'ordered' },
	{ key: 'element', label: 'Element', type: 'exact' },
	{ key: 'weaponType', label: 'Weapon / Class', type: 'exact' },
	{ key: 'gender', label: 'Gender', type: 'exact' },
	{ key: 'faction', label: 'Faction', type: 'exact' },
	{ key: 'role', label: 'Role', type: 'exact' },
{ key: 'releaseDate', label: 'Released', type: 'ordered', format: (v) => (v as string).slice(0, 7) }
];
