<script lang="ts">
	import { enhance } from '$app/forms';
	import { ATTRIBUTE_CONFIGS, GUESS_COST, HINT_COST } from '$lib/gameLogic';
	import type { PageData, ActionData } from './$types';
	import type { HintResult } from '$lib/types';

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
						{#each ATTRIBUTE_CONFIGS as cfg (cfg.key)}
							<th>
								{cfg.label}
								{#if data.purchasedHints[cfg.key]}
									<span class="hint-reveal">{data.purchasedHints[cfg.key]}</span>
								{:else if !gameOver}
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
					{#each data.guesses as result (result.character.id)}
						<tr>
							<td class="name-cell">{result.character.name}</td>
							{#each ATTRIBUTE_CONFIGS as cfg (cfg.key)}
								{@const hint = result.hints[cfg.key] ?? 'wrong'}
								{@const rawVal = result.character[cfg.key]}
								{@const displayVal = cfg.format ? cfg.format(rawVal) : String(rawVal)}
								<td class="hint-cell hint-{hint}" title={hint}>
									<span class="cell-value">{displayVal}</span>
									<span class="cell-icon">{HINT_LABEL[hint]}</span>
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
		overflow-x: visible;
	}

	.guess-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 3px;
		font-size: 0.55rem;
		table-layout: fixed;
	}

	.guess-table th {
		padding: 0.6rem 0.4rem;
		text-align: center;
		font-size: 0.5rem;
		text-transform: uppercase;
		letter-spacing: 0.02em;
		color: #00ff99;
		background: #0a0a0a;
		border: 2px solid #333;
		word-break: break-word;
		line-height: 1.8;
	}

	.guess-table th:first-child {
		text-align: left;
		width: 6rem;
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
	}

	.name-cell {
		padding: 0.6rem 0.4rem;
		line-height: 1.8;
		color: #ffffff;
		background: #111;
		border: 2px solid #333;
	}

	.hint-cell {
		padding: 0.5rem 0.3rem;
		text-align: center;
		border: 2px solid #2a2a2a;
		background: #111;
		color: #444;
		line-height: 1.8;
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

	.cell-value {
		display: block;
		font-size: 0.55rem;
	}

	.cell-icon {
		display: block;
		font-size: 0.6rem;
		margin-top: 0.2rem;
	}
</style>
