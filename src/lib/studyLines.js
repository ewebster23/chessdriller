/*
 * Lessons and progress. A lesson is one chapter of a study, taught in the order
 * the author wrote it. Pure functions over the node maps from pgnTree.js.
 *
 * (The filename dates from when chapters were split into lines.)
 */

// Node ids in the order they appear in the chapter's PGN text: each move, then the
// variations that are alternatives to it, then the main line continues. The same order
// the move tree displays, and the order a lesson teaches.
export function lessonSequence( chapter ) {
	const { nodes } = chapter;
	const seq = [];
	const visitLine = ( startId ) => {
		let id = startId;
		while ( id !== undefined ) {
			seq.push( id );
			const parent = nodes[ nodes[id].parent ];
			if ( parent.children[0] === id ) {
				for ( const altId of parent.children.slice( 1 ) ) visitLine( altId );
			}
			id = nodes[id].children[0];
		}
	};
	if ( nodes[0].children.length > 0 ) visitLine( nodes[0].children[0] );
	return seq;
}

// A lesson: { id, chapterIx, name, sequence, numMoves, numVariations }
export function buildLesson( chapter, chapterIx ) {
	const sequence = lessonSequence( chapter );
	const numVariations = chapter.nodes.filter( (n) => n.children.length > 1 ).reduce( (sum, n) => sum + n.children.length - 1, 0 );
	return {
		id: lessonId( chapter.name, chapterIx ),
		chapterIx,
		name: chapter.name,
		sequence,
		numMoves: sequence.length,
		numVariations
	};
}

// Depends on the chapter's name and position only, so progress survives re-fetching a
// study. (Edits to the moves keep the progress, so an extended chapter still counts as learned.)
function lessonId( name, chapterIx ) {
	let h = 5381;
	for ( let i = 0; i < name.length; i++ ) h = ( ( h << 5 ) + h + name.charCodeAt( i ) ) | 0;
	return ( h >>> 0 ).toString( 36 ) + '-' + chapterIx;
}

// "4.d4" or "4...d5": a move with its number
export function moveRef( n ) {
	return n.moveNumber + ( n.color === 'w' ? '.' : '...' ) + n.san;
}

// The annotations to show at a position: the comment on that move first, then the one on the
// move before it as context (marked dim), so the explanation of your move can still be read after
// the opponent replies without pushing the current one out of view.
export function recentAnnotations( nodes, id, count = 2 ) {
	const items = [];
	let n = nodes[id];
	for ( let plies = 0; n && plies < count; plies++ ) { // the last `count` moves only, not the last few annotated ones
		if ( n.comment ) items.push( { label: n.parent === null ? '' : moveRef( n ), text: n.comment, dim: false } );
		n = n.parent === null ? null : nodes[ n.parent ];
	}
	items.forEach( (item, i) => item.dim = i > 0 );
	return items;
}

// The node to step forward to from fromId, considering only nodes already shown (visible).
// Prefers the child that leads to liveId, so stepping forward retraces what was played.
export function nextVisible( nodes, visible, fromId, liveId ) {
	const kids = nodes[ fromId ].children.filter( (id) => visible.has( id ) );
	if ( kids.length === 0 ) return null;
	const leadsToLive = ( id ) => {
		for ( let n = liveId; n !== null; n = nodes[n].parent ) if ( n === id ) return true;
		return false;
	};
	return kids.find( leadsToLive ) ?? kids[0];
}

// Node ids from the first move down to the given node
export function pathTo( nodes, id ) {
	const path = [];
	for ( ; id !== 0 && id !== null; id = nodes[id].parent ) path.push( id );
	return path.reverse();
}

/*
 * Progress
 *
 * Per lesson: { learned, learnedAt, runs, cleanRuns, streak, mistakes, lastPracticed }.
 * A "clean" run has no mistakes and no hints. Streak counts consecutive clean runs.
 */

export const MASTERED_STREAK = 3;

export function lineStatus( p ) {
	if ( ! p || ! p.learned ) return 'new';
	if ( p.streak >= MASTERED_STREAK ) return 'mastered';
	if ( p.streak >= 1 ) return 'practicing';
	return 'learned';
}

export function markLearned( p, at = Date.now() ) {
	return { runs: 0, cleanRuns: 0, streak: 0, mistakes: 0, ...p, learned: true, learnedAt: p?.learnedAt ?? at };
}

export function applyResult( p, { clean, mistakes }, at = Date.now() ) {
	const base = markLearned( p, at );
	return {
		...base,
		runs: base.runs + 1,
		cleanRuns: base.cleanRuns + ( clean ? 1 : 0 ),
		streak: clean ? base.streak + 1 : 0,
		mistakes: base.mistakes + mistakes,
		lastPracticed: at
	};
}

// Counts of lessons per status, e.g. { new: 3, learned: 1, practicing: 2, mastered: 0, total: 6 }
export function summarize( lessons, progress ) {
	const out = { new: 0, learned: 0, practicing: 0, mastered: 0, total: lessons.length };
	for ( const lesson of lessons ) out[ lineStatus( progress[ lesson.id ] ) ]++;
	return out;
}
