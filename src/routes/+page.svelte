<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { ATTRIBUTE_CONFIGS, GUESS_COST, HINT_COST } from '$lib/gameLogic';
	import type { PageData, ActionData } from './$types';
	import type { AttributeConfig, GuessResult, HintResult } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let input = $state('');

	const gameOver = $derived(data.won || data.lost);
	const spent = $derived(
		data.guesses.length * GUESS_COST + Object.keys(data.purchasedHints).length * HINT_COST
	);

	const HINT_LABEL: Record<HintResult, string> = {
		correct: '✓',
		partial: '~',
		wrong: '✗',
		higher: '↑',
		lower: '↓'
	};

	function getRevealedValue(
		cfg: AttributeConfig,
		guesses: GuessResult[],
		purchasedHints: Record<string, string>
	): string | null {
		if (purchasedHints[cfg.key]) return purchasedHints[cfg.key];
		const correctGuess = guesses.find((g) => g.hints[cfg.key] === 'correct');
		if (!correctGuess) return null;
		const rawVal = correctGuess.character[cfg.key];
		return cfg.format ? cfg.format(rawVal) : String(rawVal);
	}

	// ── Slot machine animation ────────────────────────────────────────────
	const SPIN_POOLS: Partial<Record<string, string[]>> = {
		game: ['Genshin Impact', 'Honkai: Star Rail', 'Arknights', 'Blue Archive', 'Wuthering Waves'],
		rarity: ['N', 'R', 'SR', 'SSR', 'Other'],
		gender: ['Male', 'Female', 'Other'],
		species: ['Human', 'Demi-human', 'Fantasy', 'Android', 'Other'],
		hairColor: [
			'Black',
			'White',
			'Blonde',
			'Brown',
			'Red',
			'Blue',
			'Green',
			'Pink',
			'Purple',
			'Multicolor'
		],
		eyeColor: [
			'Black',
			'Brown',
			'Red',
			'Blue',
			'Green',
			'Purple',
			'Yellow',
			'Pink',
			'White',
			'Multicolor'
		],
		heightCategory: ['Short', 'Average', 'Tall'],
		outfitColor: [
			'Black',
			'White',
			'Red',
			'Blue',
			'Green',
			'Purple',
			'Yellow',
			'Pink',
			'Brown',
			'Multicolor'
		],
		affiliation: ['???'],
		voiceActorJP: ['???'],
		releaseDate: ['2019-01', '2020-06', '2021-03', '2022-09', '2023-04', '2024-01']
	};

	type RowSpinState = {
		reelItems: Record<string, string[]>;
		stoppedCount: number;
	};

	let rowDisplays = $state<Record<number, RowSpinState>>({});
	let lastAnimatedCount = -1;

	const latestSpin = $derived(rowDisplays[data.guesses.length - 1]);

	$effect(() => {
		const count = data.guesses.length;
		if (lastAnimatedCount === -1 || lastAnimatedCount > count) {
			lastAnimatedCount = count;
			return;
		}
		if (count > lastAnimatedCount) {
			lastAnimatedCount = count;
			animateRow(count - 1);
		}
	});

	// ── Share ─────────────────────────────────────────────────────────────
	const SHARE_EMOJI: Record<HintResult, string> = {
		correct: '🟩',
		partial: '🟨',
		wrong: '⬛',
		higher: '🔼',
		lower: '🔽'
	};

	let shareLabel = $state<'Share' | 'Copied!'>('Share');

	function buildShareText(): string {
		const date = new Date().toISOString().slice(0, 10);
		const grid = data.guesses
			.map((g) => ATTRIBUTE_CONFIGS.map((cfg) => SHARE_EMOJI[g.hints[cfg.key] ?? 'wrong']).join(''))
			.join('\n');
		return `Walletdle ${date}\n$${spent} spent\n\n${grid}`;
	}

	async function shareResults() {
		if (!browser) return;
		const text = buildShareText();
		if (navigator.share) {
			await navigator.share({ text });
		} else {
			await navigator.clipboard.writeText(text);
			shareLabel = 'Copied!';
			setTimeout(() => (shareLabel = 'Share'), 2000);
		}
	}

	async function animateRow(rowIdx: number) {
		const reelItems: Record<string, string[]> = {};
		for (const cfg of ATTRIBUTE_CONFIGS) {
			const pool = SPIN_POOLS[cfg.key] ?? ['???'];
			reelItems[cfg.key] = Array.from(
				{ length: 20 },
				() => pool[Math.floor(Math.random() * pool.length)]
			);
		}
		rowDisplays[rowIdx] = { reelItems, stoppedCount: 0 };

		const STAGGER = 300;
		const INITIAL_DELAY = 600;
		await new Promise<void>((r) => setTimeout(r, INITIAL_DELAY));
		for (let i = 0; i < ATTRIBUTE_CONFIGS.length; i++) {
			rowDisplays[rowIdx].stoppedCount = i + 1;
			await new Promise<void>((r) => setTimeout(r, STAGGER));
		}
	}
</script>

<main>
	<header>
		<h1>Walletdle</h1>
		{#if data.won}
			<p class="wallet wallet-win">You spent ${spent}!</p>
		{:else if data.lost}
			<p class="wallet wallet-lose">You went bankrupt!</p>
		{:else}
			<p class="wallet">${spent} spent</p>
		{/if}
		{#if gameOver}
			<button class="share-btn" onclick={shareResults}>{shareLabel}</button>
		{/if}
	</header>

	{#if !gameOver}
		<form
			method="POST"
			action="?/guess"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
					input = '';
				};
			}}
		>
			<section class="input-row">
				<input
					type="text"
					name="character"
					list="character-list"
					placeholder="Guess!"
					bind:value={input}
					autocomplete="off"
				/>
				<datalist id="character-list">
					{#each data.characterNames as name (name)}
						<option value={name}></option>
					{/each}
				</datalist>
				<button type="submit">$20</button>
			</section>
		</form>
		{#if form?.error}
			<p class="error">{form.error}</p>
		{/if}
	{/if}

	{#if data.guesses.length > 0}
		<section class="guess-table-wrapper">
			<table class="guess-table">
				<thead>
					<tr>
						<th>Name</th>
						{#each ATTRIBUTE_CONFIGS as cfg, cfgIdx (cfg.key)}
							{@const colSpinning = latestSpin !== undefined && cfgIdx >= latestSpin.stoppedCount}
							{@const revealedValue = colSpinning
								? (data.purchasedHints[cfg.key] ?? null)
								: getRevealedValue(cfg, data.guesses, data.purchasedHints)}
							<th>
								{cfg.label}
								{#if revealedValue}
									<span class="hint-reveal">{revealedValue}</span>
								{:else if !gameOver && !colSpinning}
									<form method="POST" action="?/hint" use:enhance>
										<input type="hidden" name="key" value={cfg.key} />
										<button type="submit" class="hint-btn">${HINT_COST}</button>
									</form>
								{/if}
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.guesses as result, rowIdx (result.character.id)}
						{@const spinState = rowDisplays[rowIdx]}
						<tr>
							<td class="name-cell">
								<div class="cell-inner">{result.character.name}</div>
							</td>
							{#each ATTRIBUTE_CONFIGS as cfg, cfgIdx (cfg.key)}
								{@const spinning = spinState !== undefined && cfgIdx >= spinState.stoppedCount}
								{@const hint = result.hints[cfg.key] ?? 'wrong'}
								{@const rawVal = result.character[cfg.key]}
								{@const displayVal = cfg.format ? cfg.format(rawVal) : String(rawVal)}
								<td class="hint-cell hint-{spinning ? 'wrong' : hint}" class:spinning title={hint}>
									{#if spinning}
										<div class="reel-clip">
											<div class="reel-track">
												{#each spinState.reelItems[cfg.key] as item, i (i)}
													<div class="reel-item">{item}</div>
												{/each}
											</div>
										</div>
									{:else}
										<div class="cell-inner">
											<span class="cell-value">{displayVal}</span>
											<span class="cell-icon">{HINT_LABEL[hint]}</span>
										</div>
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</section>
	{/if}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: 'Press Start 2P', system-ui, sans-serif;
		background: #0f0f0f;
		color: #e0e0e0;
		line-height: 1.6;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		max-width: 1100px;
		width: 100%;
		margin: 0 auto;
		padding: 2rem 1rem;
		box-sizing: border-box;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
	}

	h1 {
		font-size: 2.5rem;
		margin: 0 0 0.25rem;
		letter-spacing: 0.05em;
	}

	.wallet {
		margin: 0.25rem 0 0;
		font-size: 1.1rem;
		color: #facc15;
	}

	.share-btn {
		margin: 0.75rem auto 0;
		display: block;
		padding: 0.6rem 1.2rem;
		font-family: inherit;
		font-size: 0.65rem;
		background: #0a0a0a;
		border: 2px solid #00ff99;
		color: #00ff99;
		cursor: pointer;
		letter-spacing: 0.05em;
	}

	.share-btn:hover {
		background: #00ff99;
		color: #000;
	}

	.wallet-win {
		color: #4ade80;
	}

	.wallet-lose {
		color: #f87171;
	}

	form {
		max-width: 700px;
		margin: 0 auto;
	}

	.input-row {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.input-row input {
		flex: 1;
		padding: 1rem 1.2rem;
		font-size: 0.75rem;
		background: #0a0a0a;
		border: 2px solid #444;
		color: #e0e0e0;
		font-family: inherit;
	}

	.input-row input:focus {
		outline: none;
		border-color: #00ff99;
	}

	.input-row button {
		padding: 1rem 1.5rem;
		font-size: 0.75rem;
		font-family: inherit;
		background: #1a0a00;
		border: 2px solid #f59e0b;
		color: #f59e0b;
		cursor: pointer;
		white-space: nowrap;
	}

	.input-row button:hover {
		background: #f59e0b;
		color: #000;
	}

	.error {
		color: #f87171;
		margin: 0 0 0.5rem;
		font-size: 0.9rem;
		text-align: center;
	}

	.guess-table-wrapper {
		overflow-x: auto;
	}

	.guess-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 3px;
		font-size: 0.45rem;
		table-layout: fixed;
	}

	.guess-table th {
		padding: 0.6rem 0.4rem;
		text-align: center;
		font-size: 0.4rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: #00ff99;
		background: #0a0a0a;
		border: 2px solid #333;
		white-space: nowrap;
		line-height: 1.8;
	}

	.guess-table th:first-child {
		text-align: left;
		width: 4rem;
	}

	.hint-btn {
		display: block;
		margin: 0.4rem auto 0;
		padding: 0.25rem 0.4rem;
		font-family: inherit;
		font-size: 0.45rem;
		background: #1a0a00;
		color: #f59e0b;
		border: 2px solid #f59e0b;
		cursor: pointer;
		width: 100%;
	}

	.hint-btn:hover {
		background: #f59e0b;
		color: #000;
	}

	.hint-reveal {
		display: block;
		margin-top: 0.4rem;
		color: #f59e0b;
		font-size: 0.5rem;
		white-space: normal;
		word-break: break-word;
	}

	.name-cell {
		padding: 0;
		color: #ffffff;
		background: #111;
		border: 2px solid #333;
		overflow: hidden;
	}

	.hint-cell {
		padding: 0;
		text-align: center;
		border: 2px solid #2a2a2a;
		background: #111;
		color: #444;
		overflow: hidden;
	}

	.guess-table tbody {
		--cell-h: 3.5rem;
	}

	.cell-inner {
		height: var(--cell-h);
		box-sizing: border-box;
		padding: 0.5rem 0.4rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		line-height: 1.8;
	}

	.name-cell .cell-inner {
		align-items: flex-start;
	}

	.hint-correct {
		background: #003300;
		color: #00ff41;
		border-color: #00ff41;
	}

	.hint-partial {
		background: #1a1000;
		color: #fbbf24;
		border-color: #fbbf24;
	}

	.hint-wrong {
		background: #111;
		color: #444;
		border-color: #2a2a2a;
	}

	.hint-higher,
	.hint-lower {
		background: #00001a;
		color: #4488ff;
		border-color: #4488ff;
	}

	.hint-cell.spinning {
		padding: 0;
		border-color: transparent;
		background: transparent;
		overflow: hidden;
	}

	@keyframes reel-scroll {
		from {
			transform: translateY(calc(-100% + var(--cell-h)));
		}
		to {
			transform: translateY(0);
		}
	}

	.reel-clip {
		height: var(--cell-h);
		overflow: hidden;
		width: 100%;
	}

	.reel-track {
		display: flex;
		flex-direction: column;
		animation: reel-scroll 1.6s linear infinite;
	}

	.reel-item {
		height: var(--cell-h);
		flex-shrink: 0;
		box-sizing: border-box;
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.45rem;
		color: #666;
		border: 2px solid #2a2a2a;
		background: #111;
	}

	.cell-value {
		display: block;
		font-size: 0.45rem;
	}

	.cell-icon {
		display: block;
		font-size: 0.45rem;
		margin-top: 0.2rem;
	}
</style>
