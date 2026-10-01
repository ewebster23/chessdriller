<script>
	import { onMount } from 'svelte';
	import LineTrainer from '$lib/LineTrainer.svelte';
	import StudyExplorer from '$lib/StudyExplorer.svelte';
	import { buildLesson, lineStatus, markLearned, applyResult, summarize } from '$lib/studyLines.js';
	import { loadProgress, saveProgress, loadSettings, saveSettings, DEFAULT_SETTINGS } from '$lib/lineProgress.js';

	export let data;
	const { study, chapters } = data;

	const studyKey = study.lichessId;
	const chapterOrientation = ( ch ) => ch.orientation ?? ( study.repForWhite ? 'white' : 'black' );
	// Each chapter is one lesson, in the order the author laid them out
	const lessons = chapters.map( buildLesson ).filter( (l) => l.numMoves > 0 );
	const STATUS_LABELS = { new: 'New', learned: 'Learned', practicing: 'Practicing', mastered: 'Mastered' };

	let view = 'lessons'; // 'lessons' | 'trainer' | 'timetrial' | 'explore'
	let active = null; // the lesson being trained
	let stage = 'learn';
	let exploreIx = 0;
	let progress = {};
	let settings = { ...DEFAULT_SETTINGS };

	onMount( () => {
		progress = loadProgress( studyKey );
		settings = loadSettings();
	} );

	$: summary = summarize( lessons, progress );
	$: learnedCount = summary.total - summary.new;
	$: nextNew = lessons.find( (l) => lineStatus( progress[ l.id ] ) === 'new' ) ?? null; // first unlearned lesson, in order
	$: trialSources = lessons.filter( (l) => lineStatus( progress[ l.id ] ) !== 'new' ).map( sourceFor );
	$: trainerSources = active ? [ sourceFor( active ) ] : [];

	function sourceFor( lesson ) {
		const chapter = chapters[ lesson.chapterIx ];
		return { chapter, lesson, orientation: chapterOrientation( chapter ) };
	}

	function openLesson( lesson, newStage ) {
		active = lesson;
		stage = newStage;
		view = 'trainer';
	}

	function back() {
		view = 'lessons';
		active = null;
	}

	// The next lesson in the author's order, or back to the list after the last one
	function nextLesson() {
		const next = lessons[ lessons.findIndex( (l) => l.id === active.id ) + 1 ];
		if ( next ) openLesson( next, stage );
		else back();
	}

	function onComplete( e ) {
		const { stage, lessonId, clean, mistakes } = e.detail;
		const p = stage === 'learn' ? markLearned( progress[ lessonId ] ) : applyResult( progress[ lessonId ], { clean, mistakes } );
		progress = { ...progress, [ lessonId ]: p };
		saveProgress( studyKey, progress );
	}

	function changeSettings() {
		saveSettings( settings );
	}
</script>

<svelte:head><title>{study.name} - Chessdriller</title></svelte:head>

<div class="page">
	<p class="back">
		{#if view === 'lessons'}<a href="/rep">&larr; Repertoire</a>
		{:else}<a href="#lessons" on:click|preventDefault={back}>&larr; All lessons</a>{/if}
	</p>
	<h1>{study.name}</h1>

	{#if lessons.length === 0}
		<p style="text-align:center;">This study has no moves to learn.</p>

	{:else if view === 'lessons'}
		<div class="overview">
			<div class="summary">
				<p class="count"><b>{learnedCount}</b> of {summary.total} lessons learned
					{#if summary.mastered > 0}&middot; {summary.mastered} mastered{/if}</p>
				<div class="meter" title="{learnedCount} of {summary.total} lessons learned">
					<div class="mastered" style="width:{100 * summary.mastered / summary.total}%"></div><div class="learned" style="width:{100 * ( learnedCount - summary.mastered ) / summary.total}%"></div>
				</div>
				<div class="actions">
					{#if nextNew}
						<button class="cdbutton primary" on:click={() => openLesson( nextNew, 'learn' )}>
							{learnedCount === 0 ? 'Start learning' : 'Continue learning'}
						</button>
					{:else}
						<span class="done">All lessons learned!</span>
					{/if}
					<button class="cdbutton" disabled={trialSources.length === 0} title={trialSources.length === 0 ? 'Learn a lesson first' : ''} on:click={() => view = 'timetrial'}>Time trial</button>
					<button class="cdbutton" on:click={() => view = 'explore'} title="Browse the whole variation tree">Explore tree</button>
				</div>
			</div>

			<ol class="lessons">
				{#each lessons as lesson (lesson.id)}
					{@const st = lineStatus( progress[ lesson.id ] )}
					<li>
						<span class="badge {st}">{STATUS_LABELS[ st ]}</span>
						<span class="label">
							<span class="name">{lesson.name}</span>
							<small>{lesson.numMoves} moves{lesson.numVariations > 0 ? ', ' + lesson.numVariations + ' variation' + ( lesson.numVariations === 1 ? '' : 's' ) : ''}</small>
						</span>
						<span class="row_actions">
							{#if st === 'new'}
								<button class="cdbutton primary" on:click={() => openLesson( lesson, 'learn' )}>Learn</button>
							{:else}
								<button class="cdbutton primary" on:click={() => openLesson( lesson, 'practice' )}>Practice</button>
								<button class="cdbutton" on:click={() => openLesson( lesson, 'drill' )}>Drill</button>
								<button class="cdbutton" title="Go through the lesson again with commentary" on:click={() => openLesson( lesson, 'learn' )}>Review</button>
							{/if}
						</span>
					</li>
				{/each}
			</ol>

			<label class="setting">
				When learning a lesson:
				<select bind:value={settings.learnStyle} on:change={changeSettings}>
					<option value="play">I play my own moves</option>
					<option value="watch">Show me the lesson first</option>
				</select>
			</label>
		</div>

	{:else if view === 'trainer' && active}
		<div class="stages" role="tablist">
			{#each [ [ 'learn', 'Learn' ], [ 'practice', 'Practice' ], [ 'drill', 'Drill' ] ] as [ key, label ]}
				<button role="tab" aria-selected={stage === key} class:active={stage === key} on:click={() => stage = key}>{label}</button>
			{/each}
		</div>
		{#key stage + active.id}
			<LineTrainer
				{stage}
				sources={trainerSources}
				learnStyle={settings.learnStyle}
				on:complete={onComplete}
				on:nextLesson={nextLesson}
				on:setStage={(e) => stage = e.detail}
			/>
		{/key}

	{:else if view === 'timetrial'}
		<LineTrainer stage="timetrial" sources={trialSources} />

	{:else if view === 'explore'}
		{#if chapters.length > 1}
			<label class="chapters">
				Chapter
				<select bind:value={exploreIx}>
					{#each chapters as ch, i}
						<option value={i}>{i+1}. {ch.name}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#key exploreIx}
			<StudyExplorer chapter={chapters[ exploreIx ]} orientation={chapterOrientation( chapters[ exploreIx ] )} />
		{/key}
	{/if}
</div>

<style>
	.page {
		max-width: 1000px;
		margin: 0 auto;
	}
	.back {
		margin: 0;
	}
	h1 {
		margin-top: 4px;
		margin-bottom: 16px;
	}
	.overview {
		max-width: 720px;
		margin: 0 auto;
	}
	.summary {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 12px 16px;
		margin-bottom: 16px;
	}
	.count {
		margin: 0 0 8px 0;
	}
	.meter {
		display: flex;
		height: 8px;
		background: var(--track);
		border-radius: 4px;
		overflow: hidden;
	}
	.meter .mastered {
		background: var(--success);
	}
	.meter .learned {
		background: var(--meter-learned);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 12px;
	}
	.actions button, .row_actions button {
		padding: 6px 12px;
	}
	.actions button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.done {
		color: var(--success);
		font-weight: bold;
	}
	.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.primary:hover {
		background: var(--accent-hover);
	}
	.chapters {
		display: block;
		margin-bottom: 12px;
	}
	.chapters select, .setting select {
		padding: 5px;
		font: inherit;
	}
	.chapters select {
		width: 100%;
		margin-top: 4px;
	}
	.lessons {
		list-style: none;
		counter-reset: lesson;
		margin: 0 0 16px 0;
		padding: 0;
	}
	.lessons li {
		counter-increment: lesson;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 10px;
		padding: 8px 10px;
		border-bottom: 1px solid var(--border-soft);
	}
	.lessons li:first-child {
		border-top: 1px solid var(--border-soft);
	}
	.lessons .name::before {
		content: counter(lesson) '. ';
		color: var(--muted);
	}
	.label {
		flex: 1 1 200px;
		min-width: 0;
	}
	.label small {
		display: block;
		color: var(--muted);
	}
	.row_actions {
		display: flex;
		gap: 6px;
	}
	.badge {
		font-size: 12px;
		padding: 2px 8px;
		border-radius: 10px;
		min-width: 62px;
		text-align: center;
		background: var(--track);
	}
	.badge.learned {
		background: var(--badge-learned);
	}
	.badge.practicing {
		background: var(--badge-practicing);
	}
	.badge.mastered {
		background: var(--success);
		color: var(--on-accent);
	}
	.setting {
		display: block;
		font-size: 14px;
		color: var(--text-2);
	}
	.stages {
		display: flex;
		justify-content: center;
		gap: 4px;
		margin-bottom: 16px;
	}
	.stages button {
		padding: 6px 16px;
		font-size: 15px;
		background: var(--panel);
		border: 1px solid var(--border-strong);
		border-radius: 4px;
		cursor: pointer;
	}
	.stages button:hover {
		background: var(--panel-hover);
	}
	.stages button.active {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
</style>
