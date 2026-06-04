import type { AttributeConfig, HeightCategory, RarityTier, Species } from '$lib/types';

export const MAX_GUESSES = 8;
export const HINT_COST = 100;
export const GUESS_COST = 20;

const RARITY_ORDER: Record<RarityTier, number> = { N: 0, R: 1, SR: 2, SSR: 3, Other: 4 };
const HEIGHT_ORDER: Record<HeightCategory, number> = { Short: 0, Average: 1, Tall: 2 };
export const ATTRIBUTE_CONFIGS: AttributeConfig[] = [
	{ key: 'game',          label: 'Game',        type: 'exact' },
	{ key: 'developer',     label: 'Developer',   type: 'exact' },
	{ key: 'rarity',        label: 'Rarity',      type: 'ordered', order: (v) => RARITY_ORDER[v as RarityTier] ?? -1 },
	{ key: 'gender',        label: 'Gender',      type: 'exact' },
	{
		key: 'species',
		label: 'Species',
		type: 'hierarchical',
		format: (v) => {
			const s = v as Species;
			return s.sub ? `${s.type} (${s.sub})` : s.type;
		}
	},
	{ key: 'hairColor',     label: 'Hair',        type: 'exact' },
	{ key: 'eyeColor',      label: 'Eyes',        type: 'exact' },
	{ key: 'heightCategory',label: 'Height',      type: 'ordered', order: (v) => HEIGHT_ORDER[v as HeightCategory] ?? -1 },
	{ key: 'outfitColor',   label: 'Outfit',      type: 'exact' },
	{ key: 'affiliation',   label: 'Affiliation', type: 'exact' },
	{ key: 'voiceActorJP',  label: 'JP VA',       type: 'exact' },
	{ key: 'releaseDate',   label: 'Released',    type: 'ordered', format: (v) => (v as string).slice(0, 7) }
];
