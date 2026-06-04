export type Game =
	| 'Genshin Impact'
	| 'Honkai: Star Rail'
	| 'Arknights'
	| 'Blue Archive'
	| 'Wuthering Waves';

export type Gender = 'Male' | 'Female' | 'Other';

export type Role = 'DPS' | 'Support' | 'Healer' | 'Tank' | 'Specialist';

export type ComparisonType = 'exact' | 'ordered';

export type RarityTier = 'R' | 'SR' | 'SSR';

export type HintResult = 'correct' | 'higher' | 'lower' | 'wrong';

export interface Character {
	id: string;
	name: string;
	game: Game;
	releaseDate: string;
	rarity: RarityTier;
	element: string;
	weaponType: string;
	gender: Gender;
	faction: string;
	role: Role;
}

export interface AttributeConfig {
	key: keyof Character;
	label: string;
	type: ComparisonType;
	format?: (val: unknown) => string;
}

export interface GuessResult {
	character: Character;
	hints: Partial<Record<keyof Character, HintResult>>;
}
