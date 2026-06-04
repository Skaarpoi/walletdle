import type { Character, GuessResult, HintResult } from '$lib/types';
import { characters } from '$lib/data/characters';
import { ATTRIBUTE_CONFIGS } from '$lib/gameLogic';

export function getDailyCharacter(): Character {
	const dayIndex = Math.floor(Date.now() / 86_400_000);
	return characters[dayIndex % characters.length];
}

function compareOrdered(guessVal: number | string, targetVal: number | string): HintResult {
	if (guessVal === targetVal) return 'correct';
	return guessVal < targetVal ? 'higher' : 'lower';
}

export function evaluateGuess(guess: Character, target: Character): GuessResult {
	const hints: GuessResult['hints'] = {};
	for (const config of ATTRIBUTE_CONFIGS) {
		const gVal = guess[config.key];
		const tVal = target[config.key];
		hints[config.key] =
			config.type === 'ordered'
				? compareOrdered(gVal as number | string, tVal as number | string)
				: gVal === tVal
					? 'correct'
					: 'wrong';
	}
	return { character: guess, hints };
}
