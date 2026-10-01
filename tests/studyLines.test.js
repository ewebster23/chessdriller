import { parseChapter } from '$lib/pgnTree.js';
import { lessonSequence, buildLesson, pathTo, moveRef, recentAnnotations, nextVisible, lineStatus, markLearned, applyResult, summarize } from '$lib/studyLines.js';
import { loadProgress, saveProgress, loadSettings, saveSettings } from '$lib/lineProgress.js';

const chapter = parseChapter( '[Event "Sicilian"]\n\n1. e4 c5 2. Nf3 (2. c3 d5) 2... d6 3. d4 (3. Bb5+ Bd7) 3... cxd4 *' );
const { nodes } = chapter;
const sans = ( ids ) => ids.map( (id) => nodes[id].san ).join( ' ' );

describe( 'lessonSequence', () => {
	test( 'follows the order of the PGN text, variations where they appear', () => {
		expect( sans( lessonSequence( chapter ) ) ).toBe( 'e4 c5 Nf3 c3 d5 d6 d4 Bb5+ Bd7 cxd4' );
	} );
	test( 'a variation on the first move comes right after it', () => {
		const ch = parseChapter( '[Event "x"]\n\n1. e4 (1. d4 d5) 1... e5 *' );
		expect( ch.nodes.length ).toBe( 5 );
		expect( lessonSequence( ch ).map( (id) => ch.nodes[id].san ) ).toEqual( [ 'e4', 'd4', 'd5', 'e5' ] );
	} );
	test( 'nested variations', () => {
		const ch = parseChapter( '[Event "x"]\n\n1. d4 d5 (1... Nf6 2. Bg5 Ne4 (2... e6) 3. Bf4) 2. c4 *' );
		expect( lessonSequence( ch ).map( (id) => ch.nodes[id].san ) ).toEqual( [ 'd4', 'd5', 'Nf6', 'Bg5', 'Ne4', 'e6', 'Bf4', 'c4' ] );
	} );
	test( 'every node appears exactly once', () => {
		const seq = lessonSequence( chapter );
		expect( new Set( seq ).size ).toBe( seq.length );
		expect( seq.length ).toBe( nodes.length - 1 );
	} );
	test( 'empty chapter has no moves', () => {
		expect( lessonSequence( parseChapter( '[Event "x"]\n\n*' ) ) ).toEqual( [] );
	} );
} );

describe( 'buildLesson', () => {
	test( 'counts moves and variations', () => {
		const lesson = buildLesson( chapter, 3 );
		expect( lesson.numMoves ).toBe( 10 );
		expect( lesson.numVariations ).toBe( 2 );
		expect( lesson.chapterIx ).toBe( 3 );
		expect( lesson.name ).toBe( 'Sicilian' );
	} );
	test( 'id is stable and differs by chapter position', () => {
		expect( buildLesson( chapter, 0 ).id ).toBe( buildLesson( chapter, 0 ).id );
		expect( buildLesson( chapter, 0 ).id ).not.toBe( buildLesson( chapter, 1 ).id );
	} );
} );

describe( 'pathTo', () => {
	test( 'moves from the start to a node', () => {
		const bishop = nodes.find( (n) => n.san === 'Bd7' );
		expect( sans( pathTo( nodes, bishop.id ) ) ).toBe( 'e4 c5 Nf3 d6 Bb5+ Bd7' );
		expect( pathTo( nodes, 0 ) ).toEqual( [] );
	} );
} );

describe( 'annotations and stepping', () => {
	const ch = parseChapter( '[Event "x"]\n\n{ intro } 1. e4 { king pawn } e5 2. Nf3 { develops } (2. Bc4 { bishop } Nf6) 2... Nc6 { knight } *' );
	const n = ch.nodes;
	const id = ( san ) => n.find( (x) => x.san === san ).id;
	test( 'moveRef', () => {
		expect( moveRef( n[ id( 'e4' ) ] ) ).toBe( '1.e4' );
		expect( moveRef( n[ id( 'e5' ) ] ) ).toBe( '1...e5' );
	} );
	test( 'recentAnnotations: this move first, the one before it dimmed after', () => {
		expect( recentAnnotations( n, id( 'Nf3' ) ) ).toEqual( [ { label: '2.Nf3', text: 'develops', dim: false } ] );
		expect( recentAnnotations( n, id( 'Nc6' ) ).map( (a) => [ a.label, a.dim ] ) ).toEqual( [ [ '2...Nc6', false ], [ '2.Nf3', true ] ] );
		expect( recentAnnotations( n, id( 'e4' ) ).map( (a) => [ a.label, a.text ] ) ).toEqual( [ [ '1.e4', 'king pawn' ], [ '', 'intro' ] ] );
	} );
	test( 'no annotations gives an empty list', () => {
		expect( recentAnnotations( n, id( 'e5' ) ).map( (a) => a.text ) ).toEqual( [ 'king pawn' ] );
		expect( recentAnnotations( parseChapter( '[Event "x"]\n\n1. e4 e5 *' ).nodes, 2 ) ).toEqual( [] );
	} );
	test( 'nextVisible only steps to shown moves and prefers the way to the live position', () => {
		const visible = new Set( [ id( 'e4' ), id( 'e5' ), id( 'Nf3' ), id( 'Bc4' ) ] );
		expect( nextVisible( n, visible, id( 'e5' ), id( 'Bc4' ) ) ).toBe( id( 'Bc4' ) );
		expect( nextVisible( n, visible, id( 'e5' ), id( 'Nf3' ) ) ).toBe( id( 'Nf3' ) );
		expect( nextVisible( n, visible, id( 'Nf3' ), id( 'Nf3' ) ) ).toBeNull(); // Nc6 not shown yet
		expect( nextVisible( n, new Set(), 0, 0 ) ).toBeNull();
	} );
} );

describe( 'progress', () => {
	test( 'status progression', () => {
		expect( lineStatus( undefined ) ).toBe( 'new' );
		let p = markLearned( undefined, 1 );
		expect( lineStatus( p ) ).toBe( 'learned' );
		p = applyResult( p, { clean: true, mistakes: 0 }, 2 );
		expect( lineStatus( p ) ).toBe( 'practicing' );
		p = applyResult( p, { clean: true, mistakes: 0 }, 3 );
		p = applyResult( p, { clean: true, mistakes: 0 }, 4 );
		expect( lineStatus( p ) ).toBe( 'mastered' );
		expect( p.runs ).toBe( 3 );
	} );
	test( 'a mistake resets the streak', () => {
		let p = applyResult( undefined, { clean: true, mistakes: 0 }, 1 );
		p = applyResult( p, { clean: false, mistakes: 2 }, 2 );
		expect( p.streak ).toBe( 0 );
		expect( p.mistakes ).toBe( 2 );
		expect( lineStatus( p ) ).toBe( 'learned' );
	} );
	test( 'summarize', () => {
		const lessons = [ buildLesson( chapter, 0 ), buildLesson( chapter, 1 ), buildLesson( chapter, 2 ) ];
		const progress = { [lessons[0].id]: markLearned( undefined ) };
		expect( summarize( lessons, progress ) ).toEqual( { new: 2, learned: 1, practicing: 0, mastered: 0, total: 3 } );
	} );
} );

describe( 'lineProgress storage', () => {
	const fakeStorage = () => {
		const data = {};
		return { getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
	};
	test( 'round trip', () => {
		const s = fakeStorage();
		expect( loadProgress( 'study1', s ) ).toEqual( {} );
		saveProgress( 'study1', { a: { learned: true } }, s );
		expect( loadProgress( 'study1', s ) ).toEqual( { a: { learned: true } } );
		expect( loadProgress( 'study2', s ) ).toEqual( {} );
	} );
	test( 'settings have defaults', () => {
		const s = fakeStorage();
		expect( loadSettings( s ).learnStyle ).toBe( 'play' );
		saveSettings( { learnStyle: 'watch' }, s );
		expect( loadSettings( s ).learnStyle ).toBe( 'watch' );
	} );
	test( 'missing or broken storage does not throw', () => {
		expect( loadProgress( 'x', null ) ).toEqual( {} );
		expect( () => saveProgress( 'x', {}, null ) ).not.toThrow();
		const broken = { getItem: () => { throw new Error( 'no' ); }, setItem: () => { throw new Error( 'no' ); } };
		expect( loadProgress( 'x', broken ) ).toEqual( {} );
		expect( () => saveProgress( 'x', {}, broken ) ).not.toThrow();
	} );
} );
