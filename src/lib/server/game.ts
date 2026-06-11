import { fail, type ActionFailure } from '@sveltejs/kit';
import type { Character, GuessResult } from '$lib/types';
import { charactersById, charactersByDisplayName } from '$lib/data';
import { ATTRIBUTE_CONFIGS } from '$lib/gameLogic';
import { evaluateGuess } from './gameLogic';

export type StoredGuess = {
	characterId: string;
	hints: GuessResult['hints'];
};

// The per-round state shared by every mode (daily, endless, …). Modes wrap this
// with their own extra fields (e.g. `date` or `targetId` + `stats`).
export type RoundState = {
	guesses: StoredGuess[];
	purchasedHints: Record<string, string>;
};

export function hasWon(state: RoundState, target: Character): boolean {
	return state.guesses.some((g) => g.characterId === target.id);
}

// Rehydrate compact stored guesses into full GuessResults, dropping unknown ids.
export function rehydrateGuesses(state: RoundState): GuessResult[] {
	return state.guesses
		.map((g) => {
			const character = charactersById[g.characterId];
			if (!character) return null;
			return { character, hints: g.hints } satisfies GuessResult;
		})
		.filter((g): g is GuessResult => g !== null);
}

// Validate + apply a guess to `state` (mutates it). Returns a fail() to be
// re-returned by the action, or undefined on success.
export function applyGuess(
	state: RoundState,
	target: Character,
	formData: FormData
): ActionFailure<{ error: string }> | undefined {
	if (hasWon(state, target)) return fail(400, { error: 'Game is already over.' });

	const name = ((formData.get('character') as string) ?? '').trim();
	const character = charactersByDisplayName[name.toLowerCase()];
	if (!character) return fail(400, { error: 'Unknown character — pick one from the list.' });

	if (state.guesses.some((g) => g.characterId === character.id)) {
		return fail(400, { error: 'Already guessed that one.' });
	}

	const result = evaluateGuess(character, target);
	state.guesses.push({ characterId: character.id, hints: result.hints });
}

// Validate + apply a purchased hint to `state` (mutates it).
export function applyHint(
	state: RoundState,
	target: Character,
	formData: FormData
): ActionFailure<{ error: string }> | undefined {
	if (hasWon(state, target)) return fail(400, { error: 'Game is already over.' });

	const key = (formData.get('key') as string) ?? '';
	const config = ATTRIBUTE_CONFIGS.find((c) => c.key === key);
	if (!config) return fail(400, { error: 'Invalid hint.' });

	if (state.purchasedHints[key]) return fail(400, { error: 'Hint already purchased.' });

	const rawVal = target[config.key];
	state.purchasedHints[key] = config.format ? config.format(rawVal) : String(rawVal);
}
