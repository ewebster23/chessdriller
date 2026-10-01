import { parseStudyPgn } from '$lib/pgnTree.js';

/*
 * In-memory cache of parsed studies. Parsing a large study takes over a second,
 * so it is done once per version of the PGN instead of on every page load.
 * Callers must check that the user may see the study before asking for it.
 */

const MAX_ENTRIES = 10;
const cache = new Map(); // studyId -> { pgn, chapters }; insertion order doubles as recency

export function getParsedChapters( studyId, pgn ) {
	const hit = cache.get( studyId );
	if ( hit && hit.pgn === pgn ) {
		cache.delete( studyId ); // re-insert to mark as recently used
		cache.set( studyId, hit );
		return hit.chapters;
	}
	const chapters = parseStudyPgn( pgn ); // throws on an unparseable study; nothing is cached then
	cache.set( studyId, { pgn, chapters } );
	if ( cache.size > MAX_ENTRIES )
		cache.delete( cache.keys().next().value );
	return chapters;
}
