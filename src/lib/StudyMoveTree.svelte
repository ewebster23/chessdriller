<script>
	import { nagSymbols } from '$lib/pgnTree.js';
	import { createEventDispatcher } from 'svelte';

	export let nodes;
	export let startId; // first node of this line
	export let currentId;
	export let visible = null; // Set of node ids to show, or null for all of them
	export let pathIds = null; // Set of node ids on the way to the current position
	export let doneIds = null; // Set of node ids that end a line the student has reached
	export let depth = 0;

	const dispatch = createEventDispatcher();

	const isShown = ( id ) => visible === null || visible.has( id );

	// Nodes of this line: start, then each node's main continuation.
	$: chain = getChain( nodes, startId, visible );
	function getChain( nodes, id, visible ) {
		const out = [];
		while ( id !== undefined && ( visible === null || visible.has( id ) ) ) {
			out.push( nodes[id] );
			id = nodes[id].children[0];
		}
		return out;
	}

	// Alternatives to a move are the non-main children of its parent, shown after the move.
	function alternatives( n, visible ) {
		const parent = nodes[ n.parent ];
		return parent.children[0] === n.id ? parent.children.slice( 1 ).filter( isShown ) : [];
	}

	// Show "3..." before a black move that starts a line or follows a variation.
	function showNumber( n, i, prev, visible ) {
		if ( n.color === 'w' ) return true;
		return i === 0 || ( prev && alternatives( prev, visible ).length > 0 );
	}
</script>

<div class="line" class:variation={depth > 0}>
	{#each chain as n, i (n.id)}
		{@const prev = i > 0 ? chain[i-1] : null}
		{#if showNumber( n, i, prev, visible )}<span class="num">{n.moveNumber}{n.color === 'w' ? '.' : '...'}</span>{/if}
		<button
			class="move"
			class:current={n.id === currentId}
			class:onpath={n.id !== currentId && pathIds !== null && pathIds.has( n.id )}
			class:done={doneIds !== null && doneIds.has( n.id )}
			id="move-{n.id}"
			on:click={() => dispatch( 'select', n.id )}
		>{n.san}<span class="nag">{nagSymbols( n.nags )}</span>{#if doneIds !== null && doneIds.has( n.id )}<svg class="tick" viewBox="0 0 12 12" aria-label="line completed"><path d="M2 6.5l3 3 5-6.5" /></svg>{/if}</button>
		{#each alternatives( n, visible ) as altId}
			<svelte:self {nodes} startId={altId} {currentId} {visible} {pathIds} {doneIds} depth={depth+1} on:select />
		{/each}
	{/each}
</div>

<style>
	.line {
		line-height: 1.9;
	}
	.variation {
		margin: 2px 0 2px 14px;
		padding-left: 8px;
		border-left: 2px solid var(--border);
		font-size: 0.95em;
		color: var(--text-2);
	}
	.num {
		color: var(--muted);
		margin-right: 2px;
	}
	.move {
		font: inherit;
		color: inherit;
		background: none;
		border: none;
		padding: 1px 4px;
		margin-right: 2px;
		border-radius: 3px;
		cursor: pointer;
	}
	.move:hover {
		background: var(--panel-hover);
	}
	/* the moves that led here: the line(s) of play that got us into the current position */
	.move.onpath {
		background: color-mix(in srgb, var(--accent) 24%, transparent);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 45%, transparent) inset;
	}
	/* the move that ends a line the student has reached */
	.move.done {
		color: var(--success);
		font-weight: bold;
	}
	.move.current {
		background: var(--accent);
		color: var(--on-accent);
		box-shadow: none;
	}
	.tick {
		width: 11px;
		height: 11px;
		margin-left: 3px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.nag {
		font-weight: normal;
	}
</style>
