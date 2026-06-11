<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import GameBoard from '$lib/components/GameBoard.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<GameBoard {data} {form} title="Walletdle ∞" shareTitle="Walletdle Endless">
	{#snippet headerExtra()}
		<nav class="mode-nav"><a href={resolve('/')}>← Daily mode</a></nav>
		<p class="stats">
			{data.stats.gamesWon} won · ${data.stats.totalSpent} total · best ${data.stats.bestSpend ??
				'—'}
		</p>
		{#if data.won}
			<form method="POST" action="?/next" use:enhance>
				<button type="submit" class="next-btn">Next character →</button>
			</form>
		{/if}
	{/snippet}
</GameBoard>

<style>
	.mode-nav {
		margin-top: 0.75rem;
		font-size: 0.55rem;
	}

	.mode-nav a {
		color: #00ff99;
		text-decoration: none;
		letter-spacing: 0.05em;
	}

	.mode-nav a:hover {
		text-decoration: underline;
	}

	.stats {
		margin: 0.5rem 0 0;
		font-size: 0.55rem;
		color: #888;
		letter-spacing: 0.03em;
	}

	.next-btn {
		margin: 0.75rem auto 0;
		display: block;
		padding: 0.6rem 1.2rem;
		font-family: inherit;
		font-size: 0.65rem;
		background: #1a0a00;
		border: 2px solid #f59e0b;
		color: #f59e0b;
		cursor: pointer;
		letter-spacing: 0.05em;
	}

	.next-btn:hover {
		background: #f59e0b;
		color: #000;
	}
</style>
