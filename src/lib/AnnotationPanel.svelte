<script>
	// items: [{ label, text, dim }] from recentAnnotations(). With none, the panel stays
	// empty and unremarkable rather than announcing that there is nothing to say.
	export let items = [];
</script>

<div class="annotation" class:filled={items.length > 0}>
	{#each items as item}
		<p class:dim={item.dim}>{#if item.label}<b>{item.label}</b> {/if}{item.text}</p>
	{/each}
</div>

<style>
	.annotation {
		--fill: var(--panel);
		box-sizing: border-box;
		height: 100%;
		overflow-y: auto;
		padding: 10px 14px;
		border: 1px solid var(--border);
		border-radius: 4px;
		font-size: 17px;
		line-height: 1.5;
		/* shadows at the top/bottom edge appear only while there is more text to scroll to */
		background:
			linear-gradient(var(--fill) 30%, transparent) 0 0 / 100% 28px no-repeat local,
			linear-gradient(transparent, var(--fill) 70%) 0 100% / 100% 28px no-repeat local,
			radial-gradient(farthest-side at 50% 0, rgba(0,0,0,0.28), transparent) 0 0 / 100% 10px no-repeat scroll,
			radial-gradient(farthest-side at 50% 100%, rgba(0,0,0,0.28), transparent) 0 100% / 100% 10px no-repeat scroll,
			var(--fill);
	}
	.annotation.filled {
		--fill: var(--note-bg);
		border-left: 5px solid var(--accent);
	}
	p {
		margin: 0 0 8px 0;
	}
	p:last-child {
		margin-bottom: 0;
	}
	/* context from the previous move: small, and clamped so it can never crowd out the current one */
	p.dim {
		opacity: 0.65;
		font-size: 14px;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
