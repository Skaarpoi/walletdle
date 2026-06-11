import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { charactersById, characterDisplayNames } from '$lib/data';
import { GUESS_COST, HINT_COST } from '$lib/gameLogic';
import { getRandomCharacter } from '$lib/server/gameLogic';
import { applyGuess, applyHint, hasWon, rehydrateGuesses, type RoundState } from '$lib/server/game';
import { decryptCookie, encryptCookie } from '$lib/server/crypto';

const COOKIE = 'walletdle-endless';

// Running session stats accumulated across finished rounds.
type EndlessStats = {
	gamesWon: number;
	totalSpent: number;
	bestSpend: number | null; // lowest single-round spend, null until first win
};

// Unlike daily, the target is random so it must be persisted in the cookie.
type CookieData = RoundState & {
	targetId: string;
	stats: EndlessStats;
};

function emptyStats(): EndlessStats {
	return { gamesWon: 0, totalSpent: 0, bestSpend: null };
}

function newRound(stats: EndlessStats): CookieData {
	return { targetId: getRandomCharacter().id, guesses: [], purchasedHints: {}, stats };
}

function roundSpend(state: RoundState): number {
	return state.guesses.length * GUESS_COST + Object.keys(state.purchasedHints).length * HINT_COST;
}
async function readCookie(raw: string | undefined): Promise<{ data: CookieData; isNew: boolean }> {
	const fresh = (stats: EndlessStats) => ({ data: newRound(stats), isNew: true });
	if (!raw) return fresh(emptyStats());
	const json = await decryptCookie(raw);
	if (!json) return fresh(emptyStats());
	try {
		const data = JSON.parse(json) as Partial<CookieData>;
		const stats = { ...emptyStats(), ...data.stats };
		// Start a fresh round if the stored target is missing/unknown.
		if (!data.targetId || !charactersById[data.targetId]) return fresh(stats);
		return {
			data: {
				targetId: data.targetId,
				guesses: data.guesses ?? [],
				purchasedHints: data.purchasedHints ?? {},
				stats
			},
			isNew: false
		};
	} catch {
		return fresh(emptyStats());
	}
}

function writeCookie(data: CookieData): Promise<string> {
	return encryptCookie(JSON.stringify(data satisfies CookieData));
}

const cookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax',
	maxAge: 60 * 60 * 24 * 365
} as const;

export const load: PageServerLoad = async ({ cookies }) => {
	const { data: stored, isNew } = await readCookie(cookies.get(COOKIE));
	const target = charactersById[stored.targetId];

	if (isNew) cookies.set(COOKIE, await writeCookie(stored), cookieOpts);

	const guesses = rehydrateGuesses(stored, target);
	const won = guesses.some((g) => g.character.id === target.id);

	return {
		guesses,
		won,
		characterNames: characterDisplayNames,
		purchasedHints: stored.purchasedHints,
		stats: stored.stats
	};
};

export const actions: Actions = {
	guess: async ({ request, cookies }) => {
		const { data: stored } = await readCookie(cookies.get(COOKIE));
		const target = charactersById[stored.targetId];

		const failure = applyGuess(stored, target, await request.formData());
		if (failure) return failure;

		cookies.set(COOKIE, await writeCookie(stored), cookieOpts);
	},

	hint: async ({ request, cookies }) => {
		const { data: stored } = await readCookie(cookies.get(COOKIE));
		const target = charactersById[stored.targetId];

		const failure = applyHint(stored, target, await request.formData());
		if (failure) return failure;

		cookies.set(COOKIE, await writeCookie(stored), cookieOpts);
	},

	// Fold the won round into the running stats and deal a fresh character.
	next: async ({ cookies }) => {
		const { data: stored } = await readCookie(cookies.get(COOKIE));
		const target = charactersById[stored.targetId];

		if (!hasWon(stored, target)) return fail(400, { error: 'Finish the round first.' });

		const spend = roundSpend(stored);
		const stats: EndlessStats = {
			gamesWon: stored.stats.gamesWon + 1,
			totalSpent: stored.stats.totalSpent + spend,
			bestSpend: stored.stats.bestSpend === null ? spend : Math.min(stored.stats.bestSpend, spend)
		};

		cookies.set(COOKIE, await writeCookie(newRound(stats)), cookieOpts);
	}
};
