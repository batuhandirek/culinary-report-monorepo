// A brand's key: what its branch names start with. Pure, with no imports beyond name
// normalizing, so the entities and migrations can use it.

import { normalizeVenueName } from './venue-names.js';

/** A name without what follows the brand: "(Prenzlauer Berg)", "| Berlin", " - Korean BBQ". */
export const brandHead = (name: string): string =>
	name
		.replace(/\([^)]*\)/g, ' ')
		.split(/\s[|\-–·•]\s|[|]/)[0]
		.replace(/\s+/g, ' ')
		.trim();

/** What a brand's branch names start with, normalized ("Brammibal's Donuts (Mitte)" → "brammibal s donuts"). */
export const brandKey = (name: string, cityWords?: ReadonlySet<string>): string =>
	normalizeVenueName(brandHead(name), cityWords);
