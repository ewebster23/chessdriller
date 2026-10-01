import { Chess } from 'chess.js';

/*
 * Full PGN tree parsing for the study viewer.
 *
 * Unlike pgnParsing.js, which flattens a PGN into a list of moves for
 * scheduling, this keeps variations, comments, NAGs and drawn shapes so a
 * study can be browsed like on Lichess.
 *
 * A chapter is a flat map of nodes keyed by id. Node 0 is the root (the
 * starting position); every other node is a move. For each node, children[0]
 * is the main continuation and the rest are variations.
 */

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const SUFFIX_NAGS = { '!': 1, '?': 2, '!!': 3, '??': 4, '!?': 5, '?!': 6 };
const BRUSHES = { G: 'green', R: 'red', Y: 'yellow', B: 'blue' };

// Split a PGN database (e.g. a whole Lichess study) into single-game texts.
export function splitChapters( pgndb ) {
	const text = pgndb.replaceAll( '\r', '' ).trim();
	if ( ! text )
		return [];
	return text.split( /\n\s*\n(?=\[Event )/ ).map( (t) => t.trim() ).filter( (t) => t.length > 0 );
}

// Parse a PGN database into chapters: [{ name, orientation, headers, rootId, nodes }]
export function parseStudyPgn( pgndb ) {
	return splitChapters( pgndb ).map( parseChapter );
}

export function parseChapter( pgn ) {
	const { headers, movetext } = splitHeaders( pgn );
	const useFen = headers.SetUp === '1' && headers.FEN;
	const startFen = useFen ? headers.FEN : INITIAL_FEN;
	const { nodes, pendingRootComment } = buildTree( movetext, startFen );
	const root = nodes[0];
	if ( pendingRootComment )
		applyComment( root, pendingRootComment );
	return {
		name: headers.ChapterName ?? headers.Event ?? 'Chapter',
		orientation: headers.Orientation === 'black' ? 'black' : ( headers.Orientation === 'white' ? 'white' : null ), // null: not specified
		headers,
		rootId: 0,
		nodes
	};
}

function splitHeaders( pgn ) {
	const headers = {};
	const lines = pgn.split( '\n' );
	let i = 0;
	for ( ; i < lines.length; i++ ) {
		const m = lines[i].match( /^\s*\[(\w+)\s+"((?:[^"\\]|\\.)*)"\]\s*$/ );
		if ( ! m )
			break;
		headers[ m[1] ] = m[2].replaceAll( /\\(["\\])/g, '$1' );
	}
	return { headers, movetext: lines.slice( i ).join( '\n' ) };
}

function tokenize( text ) {
	const tokens = [];
	const re = /\{([^}]*)\}|;([^\n]*)|(\()|(\))|\$(\d+)|(\d+\.+)|(1-0|0-1|1\/2-1\/2|\*)|([^\s(){};$]+)/gs;
	let m;
	while ( ( m = re.exec( text ) ) !== null ) {
		if ( m[1] !== undefined )      tokens.push( { type: 'comment', value: m[1] } );
		else if ( m[2] !== undefined ) tokens.push( { type: 'comment', value: m[2] } );
		else if ( m[3] )               tokens.push( { type: 'open' } );
		else if ( m[4] )               tokens.push( { type: 'close' } );
		else if ( m[5] )               tokens.push( { type: 'nag', value: parseInt( m[5] ) } );
		else if ( m[6] )               continue; // move number, ignored
		else if ( m[7] )               tokens.push( { type: 'result' } );
		else                           tokens.push( { type: 'san', value: m[8] } );
	}
	return tokens;
}

function buildTree( movetext, startFen ) {
	const nodes = [ {
		id: 0, parent: null, children: [], san: null, from: null, to: null,
		fen: startFen, color: null, moveNumber: null,
		nags: [], comment: '', shapes: []
	} ];
	const tokens = tokenize( movetext );

	// One board is reused for the whole chapter: building a fresh one per move
	// (which validates a FEN every time) was most of the parsing time.
	const chess = new Chess( startFen );
	let chessAt = 0; // node whose position the board is in
	let viaMove = false; // whether the board's last step was a move, so undo() is valid
	const moveTo = ( id ) => {
		if ( chessAt === id ) return;
		if ( viaMove && nodes[ chessAt ].parent === id ) {
			chess.undo();
		} else {
			chess.load( nodes[ id ].fen );
		}
		chessAt = id;
		viaMove = false;
	};

	let cur = 0; // node that the next move is played from
	let last = 0; // most recently added node
	const stack = [];
	let pendingBefore = []; // comments before the first move of a line
	let pendingRootComment = null;

	for ( const tok of tokens ) {
		if ( tok.type === 'san' ) {
			const parent = nodes[cur];
			moveTo( cur );
			let san = tok.value;
			const nags = [];
			const suffix = san.match( /(!!|\?\?|!\?|\?!|!|\?)$/ );
			if ( suffix ) {
				san = san.slice( 0, -suffix[1].length );
				nags.push( SUFFIX_NAGS[ suffix[1] ] );
			}
			let move;
			try {
				move = chess.move( san );
			} catch (e) {
				throw new Error( 'Illegal move "' + tok.value + '" in position ' + parent.fen );
			}
			const node = {
				id: nodes.length, parent: cur, children: [],
				san: move.san, from: move.from, to: move.to, fen: chess.fen(),
				color: move.color,
				moveNumber: parseInt( parent.fen.split( ' ' )[5] ),
				nags, comment: '', shapes: []
			};
			nodes.push( node );
			chessAt = node.id;
			viaMove = true;
			parent.children.push( node.id );
			for ( const c of pendingBefore )
				applyComment( node, c );
			pendingBefore = [];
			cur = node.id;
			last = node.id;
		} else if ( tok.type === 'nag' ) {
			if ( last !== 0 )
				nodes[last].nags.push( tok.value );
		} else if ( tok.type === 'comment' ) {
			if ( last === 0 && cur === 0 && stack.length === 0 ) {
				pendingRootComment = ( pendingRootComment ? pendingRootComment + ' ' : '' ) + tok.value;
			} else if ( cur === nodes[last].parent && last !== cur ) {
				// directly after "(": belongs to the first move of the variation
				pendingBefore.push( tok.value );
			} else {
				applyComment( nodes[last], tok.value );
			}
		} else if ( tok.type === 'open' ) {
			// variation: alternative to the last move, so play from its parent
			if ( last === 0 )
				continue;
			stack.push( { cur, last } );
			cur = nodes[last].parent;
		} else if ( tok.type === 'close' ) {
			const saved = stack.pop();
			if ( saved ) {
				cur = saved.cur;
				last = saved.last;
			}
		}
		// results are ignored
	}
	return { nodes, pendingRootComment };
}

// Extract Lichess [%cal]/[%csl] shapes and strip other [%...] commands from a comment.
function applyComment( node, raw ) {
	let text = raw;
	text = text.replaceAll( /\[%(cal|csl)\s+([^\]]*)\]/g, ( _, kind, body ) => {
		for ( const item of body.split( ',' ) ) {
			const s = item.trim();
			const brush = BRUSHES[ s[0] ];
			if ( ! brush )
				continue;
			if ( kind === 'cal' && /^[a-h][1-8][a-h][1-8]$/.test( s.slice( 1 ) ) ) {
				node.shapes.push( { orig: s.slice( 1, 3 ), dest: s.slice( 3, 5 ), brush } );
			} else if ( kind === 'csl' && /^[a-h][1-8]$/.test( s.slice( 1 ) ) ) {
				node.shapes.push( { orig: s.slice( 1, 3 ), brush } );
			}
		}
		return '';
	} );
	text = text.replaceAll( /\[%[^\]]*\]/g, '' ).replaceAll( /\s+/g, ' ' ).trim();
	if ( text )
		node.comment = node.comment ? node.comment + ' ' + text : text;
}

const NAG_SYMBOLS = {
	1: '!', 2: '?', 3: '!!', 4: '??', 5: '!?', 6: '?!',
	10: '=', 13: '∞', 14: '⩲', 15: '⩱', 16: '±', 17: '∓', 18: '+−', 19: '−+'
};

// Printable symbols for a node's NAGs, e.g. "!?"
export function nagSymbols( nags ) {
	return nags.map( (n) => NAG_SYMBOLS[n] ?? '' ).join( '' );
}
