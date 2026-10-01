import { Chess } from 'chess.js';

/*
 * Logic for the study viewer's practice modes (practice, drill, time trial)
 * and for playing off-book moves in explore mode. Works on the node maps
 * produced by pgnTree.js and is free of UI code so it can be tested.
 */

// 'w' or 'b': side to move at a node
export function sideToMove( node ) {
	return node.fen.split( ' ' )[1];
}

// True if the student (playing the orientation's color) is to move at this node.
export function isUserTurn( node, orientation ) {
	return sideToMove( node ) === ( orientation === 'white' ? 'w' : 'b' );
}

// Child of a node reached by moving from->to, or null. Matching on squares
// only means a book promotion is accepted whichever piece it names.
export function findChild( nodes, id, from, to ) {
	for ( const childId of nodes[id].children ) {
		if ( nodes[childId].from === from && nodes[childId].to === to )
			return childId;
	}
	return null;
}

export function randomChild( nodes, id, rng = Math.random ) {
	const children = nodes[id].children;
	return children[ Math.floor( rng() * children.length ) ];
}

// Chapter to practice next. With allChapters, a random chapter that has moves;
// otherwise the current one. Returns null if there is nothing to practice.
export function pickChapterIndex( chapters, currentIx, allChapters, rng = Math.random ) {
	const hasMoves = ( ix ) => chapters[ix].nodes[0].children.length > 0;
	if ( ! allChapters )
		return hasMoves( currentIx ) ? currentIx : null;
	const candidates = chapters.map( (_, ix) => ix ).filter( hasMoves );
	if ( candidates.length === 0 )
		return null;
	return candidates[ Math.floor( rng() * candidates.length ) ];
}

// Destinations map for chessground: square -> legal target squares
export function destsFromFen( fen ) {
	const chess = new Chess( fen );
	const dests = new Map();
	for ( const m of chess.moves({ verbose: true }) ) {
		if ( ! dests.has( m.from ) )
			dests.set( m.from, [] );
		dests.get( m.from ).push( m.to );
	}
	return dests;
}

// Play a move that isn't in the study. Promotes to a queen. Null if illegal.
export function playOffBook( fen, from, to ) {
	const chess = new Chess( fen );
	try {
		const m = chess.move({ from, to, promotion: 'q' });
		return { san: m.san, fen: chess.fen(), from: m.from, to: m.to };
	} catch (e) {
		return null;
	}
}
