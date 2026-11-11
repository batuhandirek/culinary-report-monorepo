import { BadgeCheck, CircleDashed, Equal, Sparkles } from '@lucide/svelte';
import type { Component } from 'svelte';

// The one place a wording's decision state gets its word, icon and colour, so a chip, a row and
// the decision card read the same: an admin approved it (final for the AI), the AI decided it, its
// name matched a topic's, or it is waiting (not decided yet: a link carried over from the old
// links, or none, until the `terms` backlog reads it).

export type TermState = 'admin' | 'ai' | 'match' | 'waiting';

/** The state of a wording from who decided it (`Term.decidedBy`; absent while undecided) */
export const termState = (decidedBy?: string | null): TermState =>
	decidedBy === 'admin' || decidedBy === 'ai' || decidedBy === 'match' ? decidedBy : 'waiting';

export const TERM_STATES: Record<
	TermState,
	{ label: string; hint: string; icon: Component; chip: string; badge: string; iconClass: string }
> = {
	admin: {
		label: 'Approved',
		hint: 'An admin decided it: final, the AI never changes it',
		icon: BadgeCheck,
		chip: 'border-primary-darker bg-paper',
		badge: 'border-primary-darker text-primary-darker',
		iconClass: 'text-primary-darker'
	},
	ai: {
		label: 'AI',
		hint: 'The AI decided it: change it to make it yours',
		icon: Sparkles,
		chip: 'border-grape/35 bg-grape/5',
		badge: 'border-grape/40 text-grape',
		iconClass: 'text-grape'
	},
	match: {
		label: 'Name match',
		hint: "Its name is the topic's own name",
		icon: Equal,
		chip: 'border-line bg-paper',
		badge: 'border-line text-muted-foreground',
		iconClass: 'text-muted-foreground'
	},
	waiting: {
		label: 'Waiting',
		hint: 'Not decided yet: the AI reads it in the nightly run; until then it counts where its old links put it',
		icon: CircleDashed,
		chip: 'border-faint bg-tint border-dashed',
		badge: 'border-faint text-muted-foreground border-dashed',
		iconClass: 'text-muted-foreground'
	}
};

/** In the order a legend lists them */
export const TERM_STATE_ORDER: TermState[] = ['admin', 'ai', 'match', 'waiting'];
