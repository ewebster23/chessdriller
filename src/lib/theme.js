/*
 * Site theme and chessboard theme choice. The choice is remembered in localStorage and
 * applied as data-theme / data-board on <html>; the same two keys are read by the inline
 * script in app.html so the page doesn't flash the default look before this code loads.
 * The defaults (parchment, classic) are represented by having no attribute.
 */

export const THEMES = [
	{ id: 'parchment', label: 'Parchment' },
	{ id: 'slate',     label: 'Slate' },
	{ id: 'forest',    label: 'Forest' },
	{ id: 'dark',      label: 'Dark' },
	{ id: 'midnight',  label: 'Midnight' },
	{ id: 'wood',      label: 'Cozy Wood' }
];

export const BOARDS = [
	{ id: 'classic', label: 'Classic' },
	{ id: 'brown',   label: 'Walnut' },
	{ id: 'green',   label: 'Green' },
	{ id: 'blue',    label: 'Blue' },
	{ id: 'purple',  label: 'Purple' },
	{ id: 'gray',    label: 'Gray' },
	{ id: 'wood',    label: 'Wood' }
];

const DEFAULTS = { theme: 'parchment', board: 'classic' };
const KEYS = { theme: 'chessdriller:theme', board: 'chessdriller:board' };

// What is currently applied to the page
export function currentChoice( kind ) {
	return document.documentElement.dataset[ kind ] ?? DEFAULTS[ kind ];
}

// Each board theme has a matching set of pieces in static/pieces/<board>.css, loaded only when
// that board is chosen. The classic board keeps the built-in pieces.
function setPieceStylesheet( board ) {
	let link = document.getElementById( 'piece-theme' );
	if ( board === DEFAULTS.board ) {
		link?.remove();
		return;
	}
	if ( ! link ) {
		link = document.createElement( 'link' );
		link.id = 'piece-theme';
		link.rel = 'stylesheet';
		document.head.appendChild( link );
	}
	link.href = '/pieces/' + board + '.css';
}

// kind: 'theme' or 'board'
export function applyChoice( kind, id ) {
	const el = document.documentElement;
	if ( id === DEFAULTS[ kind ] ) delete el.dataset[ kind ];
	else el.dataset[ kind ] = id;
	if ( kind === 'board' ) setPieceStylesheet( id );
	try {
		localStorage.setItem( KEYS[ kind ], id === DEFAULTS[ kind ] ? '' : id );
	} catch (e) {
		// storage unavailable: the choice just isn't remembered
	}
}
