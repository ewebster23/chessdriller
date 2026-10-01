import { parseChapter } from '$lib/pgnTree.js';
import { sideToMove, isUserTurn, findChild, randomChild, pickChapterIndex, destsFromFen, playOffBook } from '$lib/studyTrainer.js';

const chapter = parseChapter( '[Event "x"]\n\n1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *' );
const nodes = chapter.nodes;

describe( 'studyTrainer', () => {
	test( 'side to move and user turn', () => {
		expect( sideToMove( nodes[0] ) ).toBe( 'w' );
		expect( isUserTurn( nodes[0], 'white' ) ).toBe( true );
		expect( isUserTurn( nodes[0], 'black' ) ).toBe( false );
		expect( isUserTurn( nodes[1], 'black' ) ).toBe( true );
	} );
	test( 'findChild matches book moves, including variations', () => {
		expect( findChild( nodes, 0, 'e2', 'e4' ) ).toBe( 1 );
		expect( findChild( nodes, 1, 'e7', 'e5' ) ).toBe( nodes[1].children[0] );
		expect( findChild( nodes, 1, 'c7', 'c5' ) ).toBe( nodes[1].children[1] );
		expect( findChild( nodes, 1, 'd7', 'd5' ) ).toBeNull();
	} );
	test( 'randomChild picks among all children', () => {
		expect( randomChild( nodes, 1, () => 0 ) ).toBe( nodes[1].children[0] );
		expect( randomChild( nodes, 1, () => 0.99 ) ).toBe( nodes[1].children[1] );
	} );
	test( 'pickChapterIndex', () => {
		const empty = parseChapter( '[Event "e"]\n\n*' );
		const chapters = [ empty, chapter, chapter ];
		expect( pickChapterIndex( chapters, 0, false ) ).toBeNull();
		expect( pickChapterIndex( chapters, 1, false ) ).toBe( 1 );
		expect( pickChapterIndex( chapters, 0, true, () => 0 ) ).toBe( 1 );
		expect( pickChapterIndex( chapters, 0, true, () => 0.99 ) ).toBe( 2 );
		expect( pickChapterIndex( [ empty ], 0, true ) ).toBeNull();
	} );
	test( 'destsFromFen', () => {
		const dests = destsFromFen( nodes[0].fen );
		expect( dests.get( 'e2' ).sort() ).toEqual( [ 'e3', 'e4' ] );
		expect( dests.get( 'g1' ).sort() ).toEqual( [ 'f3', 'h3' ] );
	} );
	test( 'playOffBook', () => {
		const m = playOffBook( nodes[0].fen, 'd2', 'd4' );
		expect( m.san ).toBe( 'd4' );
		expect( m.fen ).toContain( ' b ' );
		expect( playOffBook( nodes[0].fen, 'e2', 'e5' ) ).toBeNull();
	} );
} );
