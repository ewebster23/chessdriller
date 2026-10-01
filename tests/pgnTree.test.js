import { parseStudyPgn, parseChapter, splitChapters, nagSymbols } from '$lib/pgnTree.js';
import fs from 'fs';

const san = ( ch, id ) => ch.nodes[id].san;
const childSans = ( ch, id ) => ch.nodes[id].children.map( (c) => ch.nodes[c].san );

describe( 'parseChapter', () => {
	test( 'mainline and variations form a tree', () => {
		const ch = parseChapter( '[Event "RAV Test"]\n[Result "*"]\n\n1. d4 d5 (1... Nf6 2. Bg5 Ne4 (2... e6 3. e4) (2... d5) 3. Bf4) 2. c4 c6 *' );
		expect( ch.name ).toBe( 'RAV Test' );
		expect( childSans( ch, 0 ) ).toEqual( ['d4'] );
		const d4 = ch.nodes[0].children[0];
		expect( childSans( ch, d4 ) ).toEqual( ['d5','Nf6'] );
		const nf6 = ch.nodes[d4].children[1];
		const bg5 = ch.nodes[nf6].children[0];
		expect( childSans( ch, bg5 ) ).toEqual( ['Ne4','e6','d5'] );
		const d5 = ch.nodes[d4].children[0];
		expect( childSans( ch, d5 ) ).toEqual( ['c4'] );
	} );
	test( 'comments, shapes and NAGs', () => {
		const ch = parseChapter( '[Event "x"]\n\n{ intro } 1. e4! { best by test [%cal Ge2e4,Rd1h5] [%csl Yd4] [%clk 0:01:00] } e5 $6 2. Nf3 *' );
		expect( ch.nodes[0].comment ).toBe( 'intro' );
		const e4 = ch.nodes[1];
		expect( e4.nags ).toEqual( [1] );
		expect( e4.comment ).toBe( 'best by test' );
		expect( e4.shapes ).toEqual( [
			{ orig: 'e2', dest: 'e4', brush: 'green' },
			{ orig: 'd1', dest: 'h5', brush: 'red' },
			{ orig: 'd4', brush: 'yellow' }
		] );
		expect( nagSymbols( ch.nodes[2].nags ) ).toBe( '?!' );
	} );
	test( 'comment directly after a variation opens belongs to its first move', () => {
		const ch = parseChapter( '[Event "x"]\n\n1. d4 d5 ( { alt } 1... Nf6 ) *' );
		const nf6 = ch.nodes.find( (n) => n.san === 'Nf6' );
		expect( nf6.comment ).toBe( 'alt' );
	} );
	test( 'orientation is null when the chapter does not specify it', () => {
		expect( parseChapter( '[Event "x"]\n\n1. e4 *' ).orientation ).toBeNull();
	} );
	test( 'move numbers and colors', () => {
		const ch = parseChapter( '[Event "x"]\n\n1. e4 e5 2. Nf3 *' );
		expect( ch.nodes.slice(1).map( (n) => [n.color, n.moveNumber] ) ).toEqual( [['w',1],['b',1],['w',2]] );
	} );
	test( 'custom start position and orientation', () => {
		const ch = parseChapter( '[Event "x"]\n[SetUp "1"]\n[FEN "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1"]\n[Orientation "black"]\n\n1. e4 *' );
		expect( ch.orientation ).toBe( 'black' );
		expect( san( ch, 1 ) ).toBe( 'e4' );
	} );
	test( 'empty chapter', () => {
		const ch = parseChapter( '[Event "x"]\n[Result "*"]\n\n*' );
		expect( ch.nodes.length ).toBe( 1 );
	} );
	test( 'illegal move throws', () => {
		expect( () => parseChapter( '[Event "x"]\n\n1. e5 *' ) ).toThrow( /Illegal move/ );
	} );
} );

describe( 'parseStudyPgn', () => {
	test( 'splits chapters', () => {
		const pgn = fs.readFileSync( './tests/pgn/64-chapters.pgn', 'utf8' );
		expect( splitChapters( pgn ).length ).toBe( 64 );
		expect( parseStudyPgn( pgn ).length ).toBe( 64 );
	} );
	test( 'parses a real Lichess study export', () => {
		const pgn = fs.readFileSync( './tests/pgn/lichess_study_destroy-the-italian_by_abotofabot_2023.05.14.pgn', 'utf8' );
		const chapters = parseStudyPgn( pgn );
		expect( chapters.length ).toBe( 16 );
		expect( chapters.some( (c) => c.nodes.length > 10 ) ).toBe( true );
	} );
} );
