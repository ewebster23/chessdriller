// Scroll a container just enough to show an element inside it, without scrolling the page
// (which scrollIntoView would do).
export function revealInside( container, el ) {
	const c = container.getBoundingClientRect();
	const r = el.getBoundingClientRect();
	if ( r.top < c.top ) container.scrollTop -= c.top - r.top + 8;
	else if ( r.bottom > c.bottom ) container.scrollTop += r.bottom - c.bottom + 8;
}
