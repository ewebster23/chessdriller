<script>
	import { onMount } from 'svelte';
	import { THEMES, BOARDS, currentChoice, applyChoice } from '$lib/theme.js';

	let theme = 'parchment';
	let board = 'classic';

	onMount( () => {
		theme = currentChoice( 'theme' );
		board = currentChoice( 'board' );
	} );
</script>

<span class="picker">
	<label>Theme
		<select bind:value={theme} on:change={() => applyChoice( 'theme', theme )}>
			{#each THEMES as t}<option value={t.id}>{t.label}</option>{/each}
		</select>
	</label>
	<label>Board
		<select bind:value={board} on:change={() => applyChoice( 'board', board )}>
			{#each BOARDS as b}<option value={b.id}>{b.label}</option>{/each}
		</select>
	</label>
</span>

<style>
	.picker {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 4px 12px;
		align-items: center;
	}
	label {
		font-size: 14px;
		color: var(--text-2);
	}
	select {
		font: inherit;
		font-size: 14px;
		padding: 2px 4px;
		margin-left: 4px;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
	}
</style>
