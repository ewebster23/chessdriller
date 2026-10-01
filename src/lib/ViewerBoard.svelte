<script>
	import { ChessgroundUnstyled } from 'svelte-chessground';
	import { createEventDispatcher } from 'svelte';
	import { destsFromFen } from '$lib/studyTrainer.js';

	import './chessground.base.css';
	import './chessground.brown.css';
	import './chessground-pieces.css';

	export let fen;
	export let orientation = 'white';
	export let lastMove = undefined; // [from, to]
	export let shapes = [];
	export let inputColor = null; // color allowed to move, or null for a view-only board
	export let shake = false;

	const dispatch = createEventDispatcher();
	let chessground;

	$: if ( chessground ) apply( fen, orientation, lastMove, shapes, inputColor );

	function apply( fen, orientation, lastMove, shapes, inputColor ) {
		chessground.set({
			fen,
			orientation,
			lastMove,
			turnColor: fen.split( ' ' )[1] === 'w' ? 'white' : 'black',
			check: false,
			movable: inputColor
				? { free: false, color: inputColor, dests: destsFromFen( fen ), events: { after: (orig, dest) => dispatch( 'move', { orig, dest } ) } }
				: { color: undefined, dests: new Map() }
		});
		chessground.setAutoShapes( shapes );
	}

	// Put the pieces back after a rejected move
	export function reset() {
		apply( fen, orientation, lastMove, shapes, inputColor );
	}
</script>

<div class="board" class:shake>
	<ChessgroundUnstyled
		className="cg-print"
		config={{ viewOnly: false, coordinates: true, drawable: { enabled: false }, premovable: { enabled: false } }}
		bind:this={chessground}
	/>
</div>

<style>
	.board {
		width: 100%;
		aspect-ratio: 1;
	}
	.board.shake {
		animation: shake 0.4s;
	}
	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%, 60% { transform: translateX(-6px); }
		40%, 80% { transform: translateX(6px); }
	}
</style>
