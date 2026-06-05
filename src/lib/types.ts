export type Game =
	| 'Genshin Impact'
	| 'Honkai: Star Rail'
	| 'Arknights'
	| 'Blue Archive'
	| 'Wuthering Waves';

export type Gender = 'Male' | 'Female' | 'Other';

export type RarityTier = 'N' | 'R' | 'SR' | 'SSR' | 'Other';

export interface Hierarchical {
	type: string;
	sub: string;
}

export type SpeciesType = 'Human' | 'Demi-human' | 'Fantasy' | 'Android' | 'Other';

export interface Species extends Hierarchical {
	type: SpeciesType;
}

export type HairColor =
	| 'Black'
	| 'White'
	| 'Blonde'
	| 'Brown'
	| 'Red'
	| 'Blue'
	| 'Green'
	| 'Pink'
	| 'Purple'
	| 'Multicolor';

export type EyeColor =
	| 'Black'
	| 'Brown'
	| 'Red'
	| 'Blue'
	| 'Green'
	| 'Purple'
	| 'Yellow'
	| 'Pink'
	| 'White'
	| 'Multicolor';

export type HeightCategory = 'Short' | 'Average' | 'Tall';

export type OutfitColor =
	| 'Black'
	| 'White'
	| 'Red'
	| 'Blue'
	| 'Green'
	| 'Purple'
	| 'Yellow'
	| 'Pink'
	| 'Brown'
	| 'Multicolor';

export type ComparisonType = 'exact' | 'ordered' | 'hierarchical';

export type HintResult = 'correct' | 'partial' | 'higher' | 'lower' | 'wrong';

export interface Character {
	id: string;
	name: string;
	game: Game;
	releaseDate: string;
	rarity: RarityTier;
	gender: Gender;
	species: Species;
	hairColor: HairColor;
	eyeColor: EyeColor;
	heightCategory: HeightCategory;
	outfitColor: OutfitColor;
	affiliation: string;
	voiceActorJP: string;
}

export interface AttributeConfig {
	key: keyof Character;
	label: string;
	type: ComparisonType;
	format?: (val: unknown) => string;
	order?: (val: unknown) => number;
}

export interface GuessResult {
	character: Character;
	hints: Partial<Record<keyof Character, HintResult>>;
}
