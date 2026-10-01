<script>
	import { onDestroy, createEventDispatcher } from 'svelte';
	import ViewerBoard from '$lib/ViewerBoard.svelte';
	import StudyLayout from '$lib/StudyLayout.svelte';
	import NavControls from '$lib/NavControls.svelte';
	import AnnotationPanel from '$lib/AnnotationPanel.svelte';
	import StudyMoveTree from '$lib/StudyMoveTree.svelte';
	import TreePanel from '$lib/TreePanel.svelte';
	import { findChild } from '$lib/studyTrainer.js';
	import { moveRef, pathTo, recentAnnotations, nextVisible } from '$lib/studyLines.js';

	/*
	 * Guided trainer for one lesson (a whole chapter, in the author's order) in
	 * learn, practice or drill mode, or for a pool of lessons against the clock
	 * (timetrial). The student plays their own color; opponent moves are played
	 * automatically and play never waits for a click, with one exception: when a line has
	 * reached its end the lesson waits for the green button before the board jumps back to the
	 * branch point of the next variation, so there is time to take in what just happened.
	 *
	 * Two positions are tracked: the "live" one the lesson has reached (displayId) and the
	 * one being looked at (viewId). The student can navigate back through what has been
	 * played and return to the live position to carry on.
	 */

	export let stage; // 'learn' | 'practice' | 'drill' | 'timetrial'
	export let sources; // [{ chapter, lesson, orientation }]; one entry unless timetrial
	export let learnStyle = 'play'; // 'play': play your own moves | 'watch': watch the lesson first

	const dispatch = createEventDispatcher();

	const OPPONENT_DELAY = 450;
	const JUMP_EXTRA_DELAY = 700; // a little longer after jumping to a variation so the note can be read
	const NEXT_LESSON_DELAY = 500;
	const MISTAKE_PENALTY_MS = 5000;
	const MISTAKES_BEFORE_HINT = 2;

	let src = sources[0];
	let step = 0; // number of moves of the lesson sequence played so far
	let displayId = 0; // live position
	let viewId = 0; // position shown on the board
	let phase = 'play'; // 'watch' (learn, watch-first) or 'play'
	let status = stage === 'timetrial' ? 'idle' : 'playing'; // idle | playing | lineEnd | done | failed | finished
	let jumpNote = '';
	let waiting = false;
	let message = '';
	let runMistakes = 0;
	let runHints = 0;
	let attempts = 0;
	let hintShapes = [];
	let shake = false;
	let board;
	let treePanel;
	let token = 0; // bumped to cancel pending timeouts

	// time trial
	let trialMinutes = 2;
	let remainingMs = 0;
	let timer = null;
	let score = 0;
	let lessonsDone = 0;
	let totalMistakes = 0;

	$: nodes = src.chapter.nodes;
	$: seq = src.lesson.sequence;
	$: orientation = src.orientation;
	$: userChar = orientation === 'white' ? 'w' : 'b';
	$: live = nodes[ displayId ];
	$: viewNode = nodes[ viewId ];
	$: atLive = viewId === displayId;
	$: expected = step < seq.length ? nodes[ seq[ step ] ] : null;
	$: showsComments = stage === 'learn' || stage === 'practice';
	$: visible = new Set( seq.slice( 0, step ) ); // moves reached so far: the tree grows as the lesson goes
	$: pathIds = new Set( pathTo( nodes, viewId ) ); // the moves that led to the position being viewed
	$: doneIds = new Set( seq.slice( 0, step ).filter( (id) => nodes[id].children.length === 0 ) ); // ends of lines reached
	$: inputColor = atLive && phase === 'play' && status === 'playing' && !waiting && expected && expected.color === userChar ? orientation : null;
	$: guide = stage === 'learn' && inputColor ? [ { orig: expected.from, dest: expected.to, brush: 'green' } ] : [];
	$: shapes = [ ...( showsComments ? viewNode.shapes : [] ), ...guide, ...( atLive ? hintShapes : [] ) ];
	$: lastMove = viewNode.from ? [ viewNode.from, viewNode.to ] : undefined;
	$: annotations = showsComments ? recentAnnotations( nodes, viewId ) : [];
	$: opponentName = orientation === 'white' ? 'Black' : 'White';
	$: isAlternative = live.parent !== null && nodes[ live.parent ].children[0] !== live.id;
	$: forward = nextVisible( nodes, visible, viewId, displayId );
	$: canNext = forward !== null || ( phase === 'watch' && atLive && step < seq.length );

	begin();

	function setLive( id ) {
		displayId = id;
		viewId = id;
	}

	// Start the lesson over, or for the time trial pick a new one
	function begin() {
		token++;
		step = 0;
		setLive( 0 );
		message = '';
		jumpNote = '';
		runMistakes = 0;
		runHints = 0;
		attempts = 0;
		hintShapes = [];
		waiting = false;
		phase = stage === 'learn' && learnStyle === 'watch' ? 'watch' : 'play';
		if ( stage === 'timetrial' ) {
			src = sources[ Math.floor( Math.random() * sources.length ) ];
			if ( status === 'idle' ) return;
		}
		status = 'playing';
		if ( phase === 'play' ) proceed();
	}

	// Get to the next move of the lesson: jump back if it starts a variation (or resumes the
	// main line), then play the opponent's move or wait for the student's.
	function proceed( confirmed = false ) {
		const t = token;
		const s = src;
		const sq = s.lesson.sequence;
		if ( step >= sq.length ) {
			finish();
			return;
		}
		const ns = s.chapter.nodes;
		const next = ns[ sq[ step ] ];
		let delay = OPPONENT_DELAY;
		if ( displayId !== next.parent ) {
			// The previous line has ended and the next move belongs to another one. Wait for the
			// student (green button) before resetting the position, except against the clock.
			if ( stage !== 'timetrial' && ! confirmed ) {
				waiting = false;
				jumpNote = '';
				status = 'lineEnd';
				return;
			}
			const branch = ns[ next.parent ];
			const where = branch.parent === null ? 'the starting position' : moveRef( branch );
			setLive( next.parent );
			jumpNote = ns[ next.parent ].children[0] === next.id ? 'Continuing after ' + where : 'Alternative: back to ' + where;
			hintShapes = [];
			delay += JUMP_EXTRA_DELAY;
		}
		if ( next.color !== ( s.orientation === 'white' ? 'w' : 'b' ) ) {
			waiting = true;
			setTimeout( () => {
				if ( t !== token ) return;
				step++;
				setLive( next.id );
				jumpNote = '';
				waiting = false;
				proceed();
			}, delay );
		} else {
			waiting = false;
			status = 'playing';
		}
	}

	// The green button: carry on to the next line
	function continueLine() {
		if ( status !== 'lineEnd' ) return;
		status = 'playing';
		proceed( true );
	}

	function finish() {
		const t = token;
		waiting = false;
		hintShapes = [];
		if ( stage === 'timetrial' ) {
			lessonsDone++;
			setTimeout( () => t === token && begin(), NEXT_LESSON_DELAY );
			return;
		}
		status = 'done';
		report();
	}

	function report() {
		dispatch( 'complete', {
			stage,
			lessonId: src.lesson.id,
			clean: runMistakes === 0 && runHints === 0,
			mistakes: runMistakes,
			hints: runHints
		} );
	}

	function onMove( e ) {
		const { orig, dest } = e.detail;
		if ( ! expected ) return;
		if ( orig === expected.from && dest === expected.to ) {
			step++;
			setLive( expected.id );
			hintShapes = [];
			attempts = 0;
			message = '';
			jumpNote = '';
			if ( stage === 'timetrial' ) score++;
			proceed();
			return;
		}
		if ( findChild( nodes, displayId, orig, dest ) !== null ) {
			message = "That's a book move too, but the lesson plays " + expected.san + ' here first.';
			setTimeout( () => board.reset(), 250 );
			return;
		}
		runMistakes++;
		totalMistakes++;
		attempts++;
		shake = true;
		setTimeout( () => shake = false, 400 );
		if ( stage === 'drill' ) {
			hintShapes = [ { orig: expected.from, dest: expected.to, brush: 'green' } ];
			message = 'Wrong move. The book move was ' + expected.san + '.';
			status = 'failed';
			report();
			return;
		}
		if ( stage === 'timetrial' ) {
			remainingMs -= MISTAKE_PENALTY_MS;
			message = 'Wrong move: -' + ( MISTAKE_PENALTY_MS / 1000 ) + 's';
		} else {
			message = 'Not quite, try again.';
			if ( stage === 'practice' && attempts >= MISTAKES_BEFORE_HINT ) showHint();
		}
		setTimeout( () => board.reset(), 250 );
	}

	function showHint() {
		if ( ! expected ) return;
		if ( hintShapes.length === 0 ) runHints++;
		hintShapes = [ { orig: expected.from, dest: expected.to, brush: 'green' } ];
	}

	/*
	 * Navigation
	 */

	const goFirst = () => viewId = 0;
	const goLast = () => viewId = displayId;
	function goPrev() {
		if ( viewNode.parent !== null ) viewId = viewNode.parent;
	}
	function goNext() {
		if ( forward !== null ) viewId = forward;
		else if ( phase === 'watch' && atLive ) watchNext();
	}

	// Watch-first phase of learning: reveal the lesson one move at a time
	function watchNext() {
		if ( step >= seq.length ) return;
		step++;
		setLive( seq[ step - 1 ] );
	}
	function startPlaying() {
		token++;
		phase = 'play';
		step = 0;
		setLive( 0 );
		status = 'playing';
		proceed();
	}

	// keep the position being viewed in sight in the tree
	$: reveal( viewId );
	function reveal( id ) {
		treePanel?.reveal( id );
	}

	function onKey( e ) {
		if ( e.altKey || e.ctrlKey || e.metaKey ) return;
		if ( e.target instanceof HTMLElement && e.target.matches( 'input, select, textarea' ) ) return;
		switch ( e.key ) {
			case 'Enter':      if ( status !== 'lineEnd' ) return; continueLine(); break;
			case 'ArrowLeft':  goPrev();  break;
			case 'ArrowRight': goNext();  break;
			case 'ArrowUp':
			case 'Home':       goFirst(); break;
			case 'ArrowDown':
			case 'End':        goLast();  break;
			default: return;
		}
		e.preventDefault();
	}

	/*
	 * Time trial
	 */

	function startTrial() {
		remainingMs = trialMinutes * 60000;
		score = 0;
		lessonsDone = 0;
		totalMistakes = 0;
		status = 'playing';
		let last = Date.now();
		timer = setInterval( () => {
			const now = Date.now();
			remainingMs -= now - last;
			last = now;
			if ( remainingMs <= 0 ) endTrial();
		}, 100 );
		begin();
	}
	function endTrial() {
		stopTimer();
		token++;
		waiting = false;
		hintShapes = [];
		remainingMs = Math.max( 0, remainingMs );
		status = 'finished';
	}
	function stopTimer() {
		if ( timer ) clearInterval( timer );
		timer = null;
	}
	onDestroy( () => {
		stopTimer();
		token++;
	} );

	$: clock = formatClock( remainingMs );
	$: accuracy = score + totalMistakes > 0 ? Math.round( 100 * score / ( score + totalMistakes ) ) : null;
	function formatClock( ms ) {
		const s = Math.max( 0, Math.ceil( ms / 1000 ) );
		return Math.floor( s / 60 ) + ':' + String( s % 60 ).padStart( 2, '0' );
	}
</script>

<svelte:window on:keydown={onKey} />

<StudyLayout annotation={stage !== 'timetrial'} tree={stage !== 'timetrial'}>
	<svelte:fragment slot="title">
		{#if stage === 'timetrial'}
			{#if status === 'idle' || status === 'finished'}
				<div class="card">
					{#if status === 'finished'}
						<h2>Time!</h2>
						<p class="big">Score: {score}</p>
						<p>{lessonsDone} lesson{lessonsDone === 1 ? '' : 's'} finished, {totalMistakes} mistake{totalMistakes === 1 ? '' : 's'}{accuracy !== null ? ', ' + accuracy + '% accuracy' : ''}</p>
					{:else}
						<p>Play as many correct moves as you can before time runs out, across the {sources.length} lesson{sources.length === 1 ? '' : 's'} you have learned. Each mistake costs {MISTAKE_PENALTY_MS / 1000} seconds.</p>
					{/if}
					<label>
						Duration
						<select bind:value={trialMinutes}>
							<option value={1}>1 min</option>
							<option value={2}>2 min</option>
							<option value={5}>5 min</option>
						</select>
					</label>
					<button class="cdbutton primary" on:click={startTrial}>{status === 'finished' ? 'Play again' : 'Start'}</button>
				</div>
			{:else}
				<div class="trial_head">
					<span class="clock" class:low={remainingMs < 10000}>{clock}</span>
					<span class="big">Score: {score}</span>
				</div>
			{/if}
		{:else}
			<p class="lesson_title">{src.lesson.name}</p>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="board">
		<ViewerBoard
			bind:this={board}
			fen={viewNode.fen} {orientation} {lastMove} {shapes} {inputColor} {shake}
			on:move={onMove}
		/>
		<div class="progress" title="{step} of {seq.length} moves"><div class="bar" style="width:{seq.length ? 100 * step / seq.length : 0}%"></div></div>
	</svelte:fragment>

	<svelte:fragment slot="controls">
		{#if stage !== 'timetrial'}
			<NavControls
				canFirst={viewId !== 0} canPrev={viewId !== 0} canNext={canNext} canLast={!atLive}
				showContinue={true} canContinue={status === 'lineEnd'}
				on:first={goFirst} on:prev={goPrev} on:next={goNext} on:last={goLast} on:continue={continueLine}
			/>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="prompt">
		{#if stage !== 'timetrial' || ( status !== 'idle' && status !== 'finished' )}
			<div class="prompt" class:bad={status === 'failed'}>
				<p class="instruction">
					{#if !atLive}
						<span class="note">Looking at an earlier position. Skip to the end to get back to where you were.</span>
					{:else if phase === 'watch'}
						{#if step === 0}Step through the lesson with Next, then you'll play it yourself.
						{:else if step < seq.length}{live.color === 'w' ? 'White' : 'Black'} plays <b>{live.san}</b>{isAlternative ? ' (an alternative)' : ''}
						{:else}That's the whole lesson.{/if}
					{:else if status === 'lineEnd'}
						{#if live.children.length === 0}
							<b>Line complete.</b> Take your time, then press the green button to carry on.
						{:else}
							The lesson now goes back to look at an alternative. Press the green button when you're ready.
						{/if}
					{:else if status === 'done'}
						<b>Lesson complete!</b>
					{:else if status === 'failed'}
						<b>{message}</b>
					{:else if waiting}
						{opponentName} replies&hellip;
						{#if jumpNote}<span class="note">{jumpNote}</span>{/if}
					{:else if status === 'playing' && expected}
						{#if stage === 'learn'}Your move: play <b>{expected.san}</b>{:else}Your move{/if}
						{#if message}<span class="msg">{message}</span>{:else if jumpNote}<span class="note">{jumpNote}</span>{/if}
					{/if}
				</p>

				<div class="actions">
					{#if phase === 'watch'}
						{#if step < seq.length}
							<button class="cdbutton primary" on:click={watchNext} disabled={!atLive}>Next</button>
						{:else}
							<button class="cdbutton primary" on:click={startPlaying}>Now you play it</button>
						{/if}
					{:else if status === 'done'}
						{#if stage === 'learn'}
							<button class="cdbutton primary" on:click={() => dispatch( 'setStage', 'practice' )}>Practice this lesson</button>
						{:else}
							<button class="cdbutton primary" on:click={begin}>Again</button>
						{/if}
						<button class="cdbutton" on:click={() => dispatch( 'nextLesson' )}>Next lesson</button>
					{:else if status === 'failed'}
						<button class="cdbutton primary" on:click={begin}>Try again</button>
						<button class="cdbutton" on:click={() => dispatch( 'nextLesson' )}>Next lesson</button>
					{:else if stage === 'practice' && status === 'playing'}
						<button class="cdbutton" on:click={showHint} disabled={waiting || !expected || !atLive}>Hint</button>
					{:else if stage === 'timetrial'}
						<button class="cdbutton" on:click={endTrial}>End</button>
					{/if}
				</div>
			</div>
		{/if}
	</svelte:fragment>

	<svelte:fragment slot="annotation">
		<AnnotationPanel items={annotations} />
	</svelte:fragment>

	<svelte:fragment slot="tree">
		<TreePanel bind:this={treePanel} showDone={true}>
			<StudyMoveTree {nodes} startId={nodes[0].children[0]} currentId={viewId} {visible} {pathIds} {doneIds} on:select={(e) => viewId = e.detail} />
		</TreePanel>
	</svelte:fragment>
</StudyLayout>

<style>
	.lesson_title {
		margin: 0;
		font-weight: bold;
	}
	.progress {
		height: 6px;
		background: var(--track);
		border-radius: 3px;
		margin-top: 8px;
		overflow: hidden;
	}
	.bar {
		height: 100%;
		background: var(--accent);
		transition: width 0.3s;
	}
	.prompt, .card {
		background: var(--panel);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 8px 12px;
	}
	.prompt.bad {
		border-color: var(--danger);
	}
	.instruction {
		margin: 0;
		min-height: 3.2em; /* reserve room so the buttons below don't jump */
		font-size: 16px;
	}
	.msg {
		display: block;
		margin-top: 2px;
		color: var(--danger);
		font-size: 14px;
	}
	.note {
		display: block;
		margin-top: 2px;
		color: var(--text-2);
		font-size: 14px;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-start;
		gap: 8px;
		margin-top: 8px;
		min-height: 36px;
	}
	.actions button, .card button {
		padding: 6px 12px;
	}
	.actions button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.primary {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--on-accent);
	}
	.primary:hover {
		background: var(--accent-hover);
	}
	.trial_head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.clock {
		font-size: 34px;
		font-weight: bold;
		font-variant-numeric: tabular-nums;
	}
	.clock.low {
		color: var(--danger);
	}
	.big {
		font-size: 20px;
		font-weight: bold;
	}
	.card h2 {
		margin: 4px 0;
	}
	.card label {
		display: block;
		margin: 8px 0;
	}
</style>
