<script>
	import { createEventDispatcher } from 'svelte';

	export let canFirst = true;
	export let canPrev = true;
	export let canNext = true;
	export let canLast = true;
	export let showContinue = false; // trainer only: the green button that carries on after a line ends
	export let canContinue = false;

	const dispatch = createEventDispatcher();
</script>

<div class="nav" role="group" aria-label="Move navigation">
	<button class="cdbutton" title="Skip to start (Home)" aria-label="Skip to start" disabled={!canFirst} on:click={() => dispatch( 'first' )}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="2.5" height="14" /><polygon points="20,5 8.5,12 20,19" /></svg>
	</button>
	<button class="cdbutton" title="Back one move (&larr;)" aria-label="Back one move" disabled={!canPrev} on:click={() => dispatch( 'prev' )}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="17,5 7,12 17,19" /></svg>
	</button>
	<button class="cdbutton" title="Forward one move (&rarr;)" aria-label="Forward one move" disabled={!canNext} on:click={() => dispatch( 'next' )}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="7,5 17,12 7,19" /></svg>
	</button>
	<button class="cdbutton" title="Skip to end (End)" aria-label="Skip to end" disabled={!canLast} on:click={() => dispatch( 'last' )}>
		<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="4,5 15.5,12 4,19" /><rect x="17.5" y="5" width="2.5" height="14" /></svg>
	</button>
	{#if showContinue}
		<button
			class="go" class:ready={canContinue}
			title="Continue to the next line (Enter)" aria-label="Continue to the next line"
			disabled={!canContinue} on:click={() => dispatch( 'continue' )}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="6,3 21,12 6,21" /></svg>
		</button>
	{/if}
</div>

<style>
	.nav {
		display: flex;
		gap: 6px;
	}
	button {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 6px 0;
		color: var(--text);
	}
	button:disabled {
		opacity: 0.35;
		cursor: default;
	}
	svg {
		width: 20px;
		height: 20px;
		fill: currentColor;
	}
	/* the green "go on" button: only lit when the trainer is waiting for it */
	button.go {
		flex: 1.3;
		color: var(--on-accent);
		background: var(--success);
		border: 1px solid var(--success);
		border-radius: 4px;
		cursor: pointer;
	}
	button.go:disabled {
		opacity: 0.3;
		cursor: default;
	}
	button.go.ready {
		animation: ready 1.4s ease-in-out infinite;
	}
	@keyframes ready {
		0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--success) 60%, transparent); }
		50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--success) 0%, transparent); }
	}
</style>
