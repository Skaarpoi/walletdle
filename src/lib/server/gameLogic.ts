import type { Character, GuessResult, Hierarchical, HintResult } from '$lib/types';
import { characters } from '$lib/data/characters';
import { ATTRIBUTE_CONFIGS } from '$lib/gameLogic';

export function getDailyCharacter(): Character {
	const dayIndex = Math.floor(Date.now() / 86_400_000);
	return characters[dayIndex % characters.length];
}

function compareOrdered(gVal: unknown, tVal: unknown, order?: (v: unknown) => number): HintResult {
	const g = order ? order(gVal) : (gVal as number | string);
	const t = order ? order(tVal) : (tVal as number | string);
	if (g === t) return 'correct';
	return g < t ? 'higher' : 'lower';
}

function compareHierarchical(gVal: Hierarchical, tVal: Hierarchical): HintResult {
	if (gVal.type === tVal.type && gVal.sub === tVal.sub) return 'correct';
	if (gVal.type === tVal.type) return 'partial';
	return 'wrong';
}

export function evaluateGuess(guess: Character, target: Character): GuessResult {
	const hints: GuessResult['hints'] = {};

	for (const config of ATTRIBUTE_CONFIGS) {
		const gVal = guess[config.key];
		const tVal = target[config.key];

		let hint: HintResult;
		if (config.type === 'hierarchical') {
			hint = compareHierarchical(gVal as Hierarchical, tVal as Hierarchical);
		} else if (config.type === 'ordered') {
			hint = compareOrdered(gVal, tVal, config.order);
		} else {
			hint = gVal === tVal ? 'correct' : 'wrong';
		}

		hints[config.key] = hint;
	}

	return { character: guess, hints };
}
