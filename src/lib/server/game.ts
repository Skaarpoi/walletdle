import { fail, type ActionFailure } from '@sveltejs/kit';
import type { Character, GuessResult } from '$lib/types';
import { charactersById, charactersByDisplayName } from '$lib/data';
import { ATTRIBUTE_CONFIGS } from '$lib/gameLogic';
import { evaluateGuess } from './gameLogic';

export type RoundState = {
	guesses: string[];
	purchasedHints: Record<string, string>;
};

export function hasWon(state: RoundState, target: Character): boolean {
	return state.guesses.includes(target.id);
}

// Expand stored character ids into full GuessResults, re-evaluating each against
// the target and dropping any unknown id.
export function rehydrateGuesses(state: RoundState, target: Character): GuessResult[] {
	return state.guesses
		.map((id) => {
			const character = charactersById[id];
			return character ? evaluateGuess(character, target) : null;
		})
		.filter((g): g is GuessResult => g !== null);
}

export function applyGuess(
	state: RoundState,
	target: Character,
	formData: FormData
): ActionFailure<{ error: string }> | undefined {
	if (hasWon(state, target)) return fail(400, { error: 'Game is already over.' });

	const name = ((formData.get('character') as string) ?? '').trim();
	const character = charactersByDisplayName[name.toLowerCase()];
	if (!character) return fail(400, { error: 'Unknown character — pick one from the list.' });

	if (state.guesses.includes(character.id)) {
		return fail(400, { error: 'Already guessed that one.' });
	}

	state.guesses.push(character.id);
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
