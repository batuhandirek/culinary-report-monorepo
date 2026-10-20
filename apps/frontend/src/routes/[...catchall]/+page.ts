import { error } from '@sveltejs/kit';

// Catch-all for any path no real route matches. Real routes always take
// precedence over a rest parameter, so nothing legitimate is affected.
//
// Server-rendered, so an unknown URL answers with a real **404 status**.
// Left to the root layout's `ssr = false` it served the empty shell with a 200 and
// only became a 404 after hydration — a soft-404 for every mistyped or retired URL.
export const ssr = true;

export function load() {
	error(404);
}
