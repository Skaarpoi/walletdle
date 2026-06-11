import type { Actions, PageServerLoad } from './$types';
import { characterDisplayNames } from '$lib/data';
import { getDailyCharacter } from '$lib/server/gameLogic';
import { applyGuess, applyHint, rehydrateGuesses, type RoundState } from '$lib/server/game';
import { decryptCookie, encryptCookie } from '$lib/server/crypto';

const COOKIE = 'walletdle';

type CookieData = RoundState & {
	date: string;
};

async function readCookie(raw: string | undefined, today: string): Promise<CookieData> {
	const empty: CookieData = { date: today, guesses: [], purchasedHints: {} };
	if (!raw) return empty;
	const json = await decryptCookie(raw);
	if (!json) return empty;
	try {
		const data = JSON.parse(json) as CookieData;
		return data.date === today ? { ...empty, ...data } : empty;
	} catch {
		return empty;
	}
}

function writeCookie(data: CookieData): Promise<string> {
	return encryptCookie(JSON.stringify(data satisfies CookieData));
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
	const stored = await readCookie(cookies.get(COOKIE), today);

	const guesses = rehydrateGuesses(stored);
	const won = guesses.some((g) => g.character.id === target.id);

	return {
		guesses,
		won,
		characterNames: characterDisplayNames,
		purchasedHints: stored.purchasedHints
	};
};

export const actions: Actions = {
	guess: async ({ request, cookies }) => {
		const target = getDailyCharacter();
		const today = new Date().toISOString().slice(0, 10);
		const stored = await readCookie(cookies.get(COOKIE), today);

		const failure = applyGuess(stored, target, await request.formData());
		if (failure) return failure;

		cookies.set(COOKIE, await writeCookie(stored), cookieOpts);
	},

	hint: async ({ request, cookies }) => {
		const target = getDailyCharacter();
		const today = new Date().toISOString().slice(0, 10);
		const stored = await readCookie(cookies.get(COOKIE), today);

		const failure = applyHint(stored, target, await request.formData());
		if (failure) return failure;

		cookies.set(COOKIE, await writeCookie(stored), cookieOpts);
	}
};
