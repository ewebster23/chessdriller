/*
 * Browser-side storage for line progress and viewer settings.
 *
 * This is the only place that knows where progress lives, so moving it to the
 * database later means replacing this module. Every access is wrapped because
 * localStorage can be missing or throw (private windows, blocked site data).
 */

const PROGRESS_PREFIX = 'chessdriller:progress:';
const SETTINGS_KEY = 'chessdriller:settings';

export const DEFAULT_SETTINGS = { learnStyle: 'play' }; // 'play': play your own moves; 'watch': watch the line first

function browserStorage() {
	try {
		return typeof localStorage !== 'undefined' ? localStorage : null;
	} catch (e) {
		return null;
	}
}

function readJson( storage, key, fallback ) {
	try {
		const raw = storage?.getItem( key );
		return raw ? JSON.parse( raw ) : fallback;
	} catch (e) {
		return fallback;
	}
}

function writeJson( storage, key, value ) {
	try {
		storage?.setItem( key, JSON.stringify( value ) );
	} catch (e) {
		// storage unavailable or full: progress just isn't remembered
	}
}

// Progress for one study: { [lineId]: progress }
export function loadProgress( studyKey, storage = browserStorage() ) {
	return readJson( storage, PROGRESS_PREFIX + studyKey, {} );
}

export function saveProgress( studyKey, progress, storage = browserStorage() ) {
	writeJson( storage, PROGRESS_PREFIX + studyKey, progress );
}

export function loadSettings( storage = browserStorage() ) {
	return { ...DEFAULT_SETTINGS, ...readJson( storage, SETTINGS_KEY, {} ) };
}

export function saveSettings( settings, storage = browserStorage() ) {
	writeJson( storage, SETTINGS_KEY, settings );
}
