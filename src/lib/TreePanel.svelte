<script>
	import { tick } from 'svelte';
	import { revealInside } from '$lib/revealInside.js';

	export let showDone = false; // whether the legend explains completed lines

	let scroller;

	// Scroll the move with this node id into view inside the panel (and not the page)
	export async function reveal( id ) {
		await tick();
		const el = scroller?.querySelector( '#move-' + id );
		if ( el ) revealInside( scroller, el );
	}
</script>

<div class="panel">
	<div class="scroll" bind:this={scroller}><slot /></div>
	<div class="legend">
		<span class="item"><span class="key here"></span>You are here</span>
		<span class="item"><span class="key path"></span>Path to here</span>
		{#if showDone}
			<span class="item">
				<svg class="key tick" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l3 3 5-6.5" /></svg>Line completed
			</span>
		{/if}
	</div>
</div>

<style>
	.panel {
		box-sizing: border-box;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 4px;
	}
	.scroll {
		flex: 1 1 0;
		min-height: 0;
		overflow-y: auto;
		padding: 8px 12px;
	}
	.legend {
		flex: none;
		display: flex;
		flex-wrap: wrap;
		gap: 2px 14px;
		padding: 5px 12px;
		border-top: 1px solid var(--border-soft);
		font-size: 12px;
		color: var(--muted);
	}
	.item {
		display: inline-flex;
		align-items: center;
		gap: 5px;
	}
	.key {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 3px;
	}
	.here {
		background: var(--accent);
	}
	.path {
		background: color-mix(in srgb, var(--accent) 24%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent) inset;
	}
	.tick {
		fill: none;
		stroke: var(--success);
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
</style>
