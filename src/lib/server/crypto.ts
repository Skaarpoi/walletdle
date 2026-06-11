import { env } from '$env/dynamic/private';

// AES-GCM cookie encryption. Keeps game state (notably the endless target id)
// opaque to the client: the cookie holds iv+ciphertext, decryptable only with the
// server secret. Tampering fails the GCM auth tag, so a forged cookie decrypts to
// null and is treated as a fresh game.

const ALGO = 'AES-GCM';
const IV_LEN = 12;

// Dev fallback so the game runs with no setup. In production set a real secret:
//   wrangler secret put WALLETDLE_SECRET
// (and put it in .dev.vars / .env for local `wrangler dev` / `vite dev`).
function secret(): string {
	return env.WALLETDLE_SECRET ?? 'walletdle-dev-secret-change-me';
}

// Derive a 256-bit AES key from the secret (cached per secret value).
const keyCache = new Map<string, Promise<CryptoKey>>();

function getKey(): Promise<CryptoKey> {
	const s = secret();
	let key = keyCache.get(s);
	if (!key) {
		key = crypto.subtle
			.digest('SHA-256', new TextEncoder().encode(s))
			.then((hash) => crypto.subtle.importKey('raw', hash, ALGO, false, ['encrypt', 'decrypt']));
		keyCache.set(s, key);
	}
	return key;
}

export async function encryptCookie(plaintext: string): Promise<string> {
	const key = await getKey();
	const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
	const ct = new Uint8Array(
		await crypto.subtle.encrypt({ name: ALGO, iv }, key, new TextEncoder().encode(plaintext))
	);

	const combined = new Uint8Array(iv.length + ct.length);
	combined.set(iv);
	combined.set(ct, iv.length);

	let bin = '';
	for (const b of combined) bin += String.fromCharCode(b);
	return btoa(bin);
}

export async function decryptCookie(token: string): Promise<string | null> {
	try {
		const combined = Uint8Array.from(atob(token), (c) => c.charCodeAt(0));
		const iv = combined.subarray(0, IV_LEN);
		const ct = combined.subarray(IV_LEN);
		const key = await getKey();
		const pt = await crypto.subtle.decrypt({ name: ALGO, iv }, key, ct);
		return new TextDecoder().decode(pt);
	} catch {
		return null;
	}
}
