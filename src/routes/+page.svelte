<script lang="ts">
	import { resolve } from '$app/paths';
	import GameBoard from '$lib/components/GameBoard.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<GameBoard {data} {form}>
	{#snippet headerExtra()}
		<nav class="mode-nav"><a href={resolve('/endless')}>Endless mode →</a></nav>
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
</style>
