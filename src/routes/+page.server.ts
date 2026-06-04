import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charactersById, charactersByName, characters } from '$lib/data/characters';
import { getDailyCharacter, evaluateGuess } from '$lib/server/gameLogic';
import { MAX_GUESSES, ATTRIBUTE_CONFIGS } from '$lib/gameLogic';
import type { GuessResult } from '$lib/types';

const COOKIE = 'walletdle';

type StoredGuess = {
	characterId: string;
	hints: GuessResult['hints'];
};

type CookieData = {
	date: string;
	guesses: StoredGuess[];
	purchasedHints: Record<string, string>;
};

function readCookie(raw: string | undefined, today: string): CookieData {
	const empty: CookieData = { date: today, guesses: [], purchasedHints: {} };
	if (!raw) return empty;
	try {
		const data = JSON.parse(raw) as CookieData;
		return data.date === today ? { ...empty, ...data } : empty;
	} catch {
		return empty;
	}
}

function writeCookie(data: CookieData): string {
	return JSON.stringify(data satisfies CookieData);
}

const cookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 60 * 60 * 48
} as const;

export const load: PageServerLoad = async ({ cookies }) => {
	const target = getDailyCharacter();
	const today = new Date().toISOString().slice(0, 10);

	const stored = readCookie(cookies.get(COOKIE), today);

	const guesses: GuessResult[] = stored.guesses
		.map((g) => {
			const character = charactersById[g.characterId];
			if (!character) return null;
			return { character, hints: g.hints } satisfies GuessResult;
		})
		.filter((g): g is GuessResult => g !== null);

	const won = guesses.some((g) => g.character.id === target.id);
	const lost = !won && guesses.length >= MAX_GUESSES;

	return {
		guesses,
		won,
		lost,
		characterNames: characters.map((c) => c.name).sort(),
		purchasedHints: stored.purchasedHints
	};
};

export const actions: Actions = {
	guess: async ({ request, cookies }) => {
		const target = getDailyCharacter();
		const today = new Date().toISOString().slice(0, 10);
		const stored = readCookie(cookies.get(COOKIE), today);

		const won = stored.guesses.some((g) => g.characterId === target.id);
		const lost = !won && stored.guesses.length >= MAX_GUESSES;

		if (won || lost) return fail(400, { error: 'Game is already over.' });

		const formData = await request.formData();
		const name = ((formData.get('character') as string) ?? '').trim();

		const character = charactersByName[name.toLowerCase()];
		if (!character) return fail(400, { error: 'Unknown character — pick one from the list.' });

		if (stored.guesses.some((g) => g.characterId === character.id)) {
			return fail(400, { error: 'Already guessed that one.' });
		}

		const result = evaluateGuess(character, target);
		stored.guesses.push({ characterId: character.id, hints: result.hints });
		cookies.set(COOKIE, writeCookie(stored), cookieOpts);
	},

	hint: async ({ request, cookies }) => {
		const target = getDailyCharacter();
		const today = new Date().toISOString().slice(0, 10);
		const stored = readCookie(cookies.get(COOKIE), today);

		const won = stored.guesses.some((g) => g.characterId === target.id);
		const lost = !won && stored.guesses.length >= MAX_GUESSES;
		if (won || lost) return fail(400, { error: 'Game is already over.' });

		const formData = await request.formData();
		const key = (formData.get('key') as string) ?? '';

		const config = ATTRIBUTE_CONFIGS.find((c) => c.key === key);
		if (!config) return fail(400, { error: 'Invalid hint.' });

		if (stored.purchasedHints[key]) return fail(400, { error: 'Hint already purchased.' });

		const rawVal = target[config.key];
		stored.purchasedHints[key] = config.format ? config.format(rawVal) : String(rawVal);

		cookies.set(COOKIE, writeCookie(stored), cookieOpts);
	}
};
