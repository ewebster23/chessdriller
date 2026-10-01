<script>
	/*
	 * Shared layout for the study screens. Left: the board, its controls and the prompt.
	 * Right: annotation and move tree, each in a section of fixed proportion so nothing
	 * resizes between positions. On wide screens the right column is exactly as tall as the
	 * left; on narrow ones everything stacks.
	 */
	export let annotation = true;
	export let tree = true;
</script>

<div class="layout">
	<div class="title"><slot name="title" /></div>
	<div class="left">
		<slot name="board" />
		<div class="controls"><slot name="controls" /></div>
		<div class="prompt"><slot name="prompt" /></div>
	</div>
	<div class="right">
		<div class="right_inner">
			{#if annotation}<div class="section annotation"><slot name="annotation" /></div>{/if}
			{#if tree}<div class="section tree"><slot name="tree" /></div>{/if}
		</div>
	</div>
</div>

<style>
	.layout {
		display: grid;
		grid-template-columns: minmax(300px, 560px) minmax(300px, 1fr);
		grid-template-areas: "title title" "left right";
		gap: 12px 20px;
		max-width: 1000px;
		margin: 0 auto;
	}
	.title {
		grid-area: title;
	}
	.left {
		grid-area: left;
		min-width: 0;
	}
	.controls {
		margin-top: 10px;
	}
	.prompt {
		margin-top: 12px;
	}
	.right {
		grid-area: right;
		position: relative; /* the inner box fills the row without making it taller */
		min-width: 0;
	}
	.right_inner {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.section {
		min-height: 0;
	}
	.annotation {
		flex: 5 1 0;
	}
	.tree {
		flex: 4 1 0;
	}

	@media (max-width: 860px) {
		.layout {
			grid-template-columns: minmax(0, 1fr);
			grid-template-areas: "title" "left" "right";
		}
		.right {
			position: static;
		}
		.right_inner {
			position: static;
		}
		.annotation {
			flex: none;
			min-height: 7em;
			max-height: 16em;
		}
		.tree {
			flex: none;
			height: 40vh;
			min-height: 12em;
		}
	}
</style>
