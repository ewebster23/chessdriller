<script>
	import StudyLayout from '$lib/StudyLayout.svelte';
	import NavControls from '$lib/NavControls.svelte';
	import AnnotationPanel from '$lib/AnnotationPanel.svelte';
	import StudyMoveTree from '$lib/StudyMoveTree.svelte';
	import ViewerBoard from '$lib/ViewerBoard.svelte';
	import TreePanel from '$lib/TreePanel.svelte';
	import { pathTo, recentAnnotations } from '$lib/studyLines.js';
	import { findChild, playOffBook } from '$lib/studyTrainer.js';

	export let chapter;
	export let orientation; // default orientation for this chapter

	let currentId = 0;
	let flipped = false;
	let offBook = null; // moves played that are not in the study: { baseId, sans, fen, from, to }
	let board;
	let treePanel;

	$: nodes = chapter.nodes;
	$: node = nodes[ currentId ];
	$: shownOrientation = flipped ? ( orientation === 'white' ? 'black' : 'white' ) : orientation;
	$: fen = offBook ? offBook.fen : node.fen;
	$: lastMove = offBook ? [ offBook.from, offBook.to ] : ( node.from ? [ node.from, node.to ] : undefined );
	$: shapes = offBook ? [] : node.shapes;
	$: inputColor = fen.split( ' ' )[1] === 'w' ? 'white' : 'black';
	$: annotations = offBook ? [] : recentAnnotations( nodes, currentId );
	$: pathIds = new Set( pathTo( nodes, currentId ) );

	function goto( id ) {
		offBook = null;
		currentId = id;
	}
	const goFirst = () => goto( 0 );
	const goPrev  = () => node.parent !== null && goto( node.parent );
	const goNext  = () => node.children.length > 0 && goto( node.children[0] );
	function goLast() {
		let id = currentId;
		while ( nodes[id].children.length > 0 ) id = nodes[id].children[0];
		goto( id );
	}

	// keep the current move in sight in the tree
	$: reveal( currentId );
	function reveal( id ) {
		treePanel?.reveal( id );
	}

	function onMove( e ) {
		const { orig, dest } = e.detail;
		if ( ! offBook ) {
			const child = findChild( nodes, currentId, orig, dest );
			if ( child !== null ) {
				goto( child );
				return;
			}
		}
		const m = playOffBook( fen, orig, dest );
		if ( ! m ) {
			board.reset();
			return;
		}
		offBook = {
			baseId: offBook ? offBook.baseId : currentId,
			sans: [ ...( offBook ? offBook.sans : [] ), m.san ],
			fen: m.fen, from: m.from, to: m.to
		};
	}

	function onKey( e ) {
		if ( e.altKey || e.ctrlKey || e.metaKey ) return;
		if ( e.target instanceof HTMLElement && e.target.matches( 'input, select, textarea' ) ) return;
		switch ( e.key ) {
			case 'ArrowLeft':  goPrev();  break;
			case 'ArrowRight': goNext();  break;
			case 'ArrowUp':
			case 'Home':       goFirst(); break;
			case 'ArrowDown':
			case 'End':        goLast();  break;
			case 'f':          flipped = !flipped; break;
			default: return;
		}
		e.preventDefault();
	}
</script>

<svelte:window on:keydown={onKey} />

<StudyLayout>
	<svelte:fragment slot="title">
		<p class="title">{chapter.name}</p>
	</svelte:fragment>

	<svelte:fragment slot="board">
		<ViewerBoard bind:this={board} {fen} orientation={shownOrientation} {lastMove} {shapes} {inputColor} on:move={onMove} />
	</svelte:fragment>

	<svelte:fragment slot="controls">
		<div class="controls">
			<NavControls
				canFirst={currentId !== 0 || !!offBook} canPrev={currentId !== 0 || !!offBook}
				canNext={node.children.length > 0 && !offBook} canLast={node.children.length > 0 && !offBook}
				on:first={goFirst} on:prev={goPrev} on:next={goNext} on:last={goLast}
			/>
			<button class="cdbutton flip" title="Flip board (f)" on:click={() => flipped = !flipped}>&#x21C5; Flip</button>
		</div>
	</svelte:fragment>

	<svelte:fragment slot="prompt">
		<div class="status">
			{#if offBook}
				<div class="offbook">
					<b>Not in this study:</b> {offBook.sans.join( ' ' )}
					<button class="cdbutton" on:click={() => goto( offBook.baseId )}>Back to study</button>
				</div>
			{:else}
				<span class="hint">Click a move, use the arrow keys, or play a move on the board to explore.</span>
			{/if}
		</div>
	</svelte:fragment>

	<svelte:fragment slot="annotation">
		<AnnotationPanel items={annotations} />
	</svelte:fragment>

	<svelte:fragment slot="tree">
		<TreePanel bind:this={treePanel}>
			{#if nodes[0].children.length === 0}
				<p class="empty">This chapter has no moves.</p>
			{:else}
				<StudyMoveTree {nodes} startId={nodes[0].children[0]} {currentId} {pathIds} on:select={(e) => goto( e.detail )} />
			{/if}
		</TreePanel>
	</svelte:fragment>
</StudyLayout>

<style>
	.title {
		margin: 0;
		font-weight: bold;
	}
	.controls {
		display: flex;
		gap: 6px;
	}
	.controls :global(.nav) {
		flex: 4;
	}
	.flip {
		flex: 1;
		padding: 6px 10px;
	}
	.empty {
		margin: 0;
		color: var(--muted);
	}
	.status {
		min-height: 3em;
		font-size: 14px;
	}
	.hint {
		color: var(--muted);
	}
	.offbook {
		background: var(--warn-bg);
		border: 1px solid var(--warn-border);
		border-radius: 4px;
		padding: 6px 10px;
	}
	.offbook button {
		margin-left: 8px;
	}
</style>
