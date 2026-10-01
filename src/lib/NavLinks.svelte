<script>
	export let loggedIn = false;
</script>

<ul>
	<li><a href="/study">Study</a></li>
	<li><a href="/rep">Repertoire</a></li>
	<li><a href="/pgn">PGNs</a></li>
	{#if ! loggedIn}
		<li><a href="/join">Join or log in</a></li>
	{:else}
		<li><a href="/settings">Settings</a></li>
	{/if}
	<li><a href="/faq">FAQ</a></li>
</ul>

<style>
	ul {
		margin:0;
		padding:0;
		display:flex;
		justify-content:center;
		list-style-type:none;
	}
	li {
		margin:0;
		padding:0px 8px;
	}
	li + li {
		border-color:var(--border);
		border-style:solid;
		border-width:0 0 0 1px;
	}
</style>
