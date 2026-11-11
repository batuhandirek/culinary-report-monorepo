// Pure: when two names are one thing, so promotion never makes a twin topic.

import { termKey } from 'src/modules/venues/util/dishes.js';

/**
 * The keys under which two names are one thing, on `termKey` (accents and plurals folded): the
 * same words run together ("hotdog", "hot dog") or in another order ("pizza margherita",
 * "margherita pizza"). Two names sharing any key are twins. Empty for a name with no key.
 */
export const twinKeys = (name: string): string[] => {
	const words = termKey(name).split(' ').filter(Boolean);
	if (!words.length) return [];
	return [`run:${words.join('')}`, `order:${[...words].sort().join(' ')}`];
};

/**
 * The items grouped so that two sharing a twin key of their names are in one group, through any
 * chain of twins; each group in the order its items came. An item whose name has no key is left
 * out.
 */
export const groupTwins = <T>(items: T[], nameOf: (item: T) => string): T[][] => {
	const groupOf = new Map<string, number>();
	const groups: (T[] | null)[] = [];
	for (const item of items) {
		const keys = twinKeys(nameOf(item));
		if (!keys.length) continue;
		const found = [
			...new Set(keys.map(k => groupOf.get(k)).filter((g): g is number => g !== undefined)),
		].sort((a, b) => a - b);
		const target = found[0] ?? groups.push([]) - 1;
		for (const other of found.slice(1)) {
			groups[target]!.push(...groups[other]!);
			groups[other] = null;
			for (const [k, g] of groupOf) if (g === other) groupOf.set(k, target);
		}
		groups[target]!.push(item);
		for (const k of keys) groupOf.set(k, target);
	}
	return groups.filter((g): g is T[] => g !== null);
};
