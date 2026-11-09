import { Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';

import type {
	LlmAccountUsageReader,
	LlmAccountUsageRow,
} from 'src/modules/llm/interfaces/llm-call-record.interface.js';

import { limitCovers, type LlmAccount, type LlmAccountLimit } from '../accounts/llm-account.js';

/** How often today's counts are read again from the ledger: another process's calls show up there */
export const LLM_QUOTA_SYNC_MS = 5 * 60_000;

/** The next 00:00 UTC after `now`, when an account's day starts again */
export const nextUtcMidnight = (now: number): number => {
	const day = new Date(now);
	return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1);
};

const utcMidnightOf = (now: number): number => nextUtcMidnight(now) - 86_400_000;

const utcDay = (now: number): string => new Date(now).toISOString().slice(0, 10);

/** An account out of a limit for the day */
export interface LlmQuotaBlock {
	until: number;
	reason: string;
}

/** One limit of an account, with what it used today */
export interface LlmQuotaUsage {
	account: string;
	kind: LlmAccountLimit['kind'];
	models?: readonly string[];
	used: number;
	max: number;
	/** When it counts from zero again (the next 00:00 UTC) */
	resetsAt: Date;
}

interface Counts {
	requests: number;
	tokens: number;
}

/**
 * What each account (`accounts/*.llm-account.ts`) used of its limits today (UTC), and whether it
 * may serve another agent call. The roster asks it before a call (`blockOf`), counts the call as
 * it starts (`begin`: a request, failed or not) and its tokens once it answers (`addTokens`). The
 * counts start from the `llm_calls` ledger at boot and are read again every `LLM_QUOTA_SYNC_MS`
 * (the higher count of the two kept, so a call not filed yet is not forgotten), so a restart or
 * another process (the eval CLI) doesn't hand an account a fresh day. Only agent calls count:
 * embeddings and classifiers pass by it. Calls already in flight when a limit is reached still
 * finish, so a token limit is overshot by them: leave a margin under the provider's own.
 */
export class LlmAccountQuotas implements OnApplicationBootstrap, OnApplicationShutdown {
	private readonly logger = new Logger(LlmAccountQuotas.name);
	private readonly now: () => number;
	private readonly reader?: LlmAccountUsageReader;
	/** The UTC day the counts are for */
	private day: string;
	/** `${account}|${model}` → today's counts */
	private counts = new Map<string, Counts>();
	/** Blocks already logged today, so a limit reached is said once */
	private readonly logged = new Set<string>();
	private timer?: NodeJS.Timeout;

	constructor(opts: { now?: () => number; reader?: LlmAccountUsageReader } = {}) {
		this.now = opts.now ?? Date.now;
		this.reader = opts.reader;
		this.day = utcDay(this.now());
	}

	async onApplicationBootstrap(): Promise<void> {
		if (!this.reader) return;
		await this.sync();
		this.timer = setInterval(() => void this.sync(), LLM_QUOTA_SYNC_MS);
		this.timer.unref();
	}

	onApplicationShutdown(): void {
		clearInterval(this.timer);
	}

	/** Today's counts from the ledger, merged in (the higher of the two per account and model) */
	async sync(): Promise<void> {
		if (!this.reader) return;
		try {
			this.merge(await this.reader.accountUsageSince(new Date(utcMidnightOf(this.now()))));
		} catch (e) {
			this.logger.warn(`Today's LLM account usage not read: ${(e as Error).message}`);
		}
	}

	merge(rows: LlmAccountUsageRow[]): void {
		this.rollDay();
		for (const row of rows) {
			const counts = this.countsOf(row.account, row.model);
			counts.requests = Math.max(counts.requests, row.requests);
			counts.tokens = Math.max(counts.tokens, row.tokens);
		}
	}

	/** The limit `account` has used up for `model` today, or null when it may serve the call */
	blockOf(account: LlmAccount, model: string): LlmQuotaBlock | null {
		this.rollDay();
		for (const limit of account.limits) {
			if (!limitCovers(limit, model)) continue;
			const used = this.used(account.id, limit);
			if (used < limit.max) continue;
			const until = nextUtcMidnight(this.now());
			const unit = limit.kind === 'requests' ? 'requests' : 'tokens';
			const scope = limit.models ? ` on ${limit.models.join(', ')}` : '';
			const reason = `${account.id} used ${used.toLocaleString('en')} of its ${limit.max.toLocaleString('en')} ${unit} a day${scope}, until ${new Date(until).toISOString()}`;
			const key = `${account.id}|${limit.kind}|${scope}`;
			if (!this.logged.has(key)) {
				this.logged.add(key);
				this.logger.warn(`LLM account out for the day: ${reason}`);
			}
			return { until, reason };
		}
		return null;
	}

	/** A call on `account` starts: one request, whatever comes of it */
	begin(account: LlmAccount, model: string): void {
		this.rollDay();
		this.countsOf(account.id, model).requests++;
	}

	/** A call on `account` answered with this many tokens, input and output together */
	addTokens(account: LlmAccount, model: string, tokens: number): void {
		this.rollDay();
		if (tokens > 0) this.countsOf(account.id, model).tokens += tokens;
	}

	/** Every limit of these accounts with today's use, for logs and an admin view */
	usage(accounts: readonly LlmAccount[]): LlmQuotaUsage[] {
		this.rollDay();
		const resetsAt = new Date(nextUtcMidnight(this.now()));
		return accounts.flatMap(account =>
			account.limits.map(limit => ({
				account: account.id,
				kind: limit.kind,
				...(limit.models && { models: limit.models }),
				used: this.used(account.id, limit),
				max: limit.max,
				resetsAt,
			})),
		);
	}

	private used(accountId: string, limit: LlmAccountLimit): number {
		let used = 0;
		for (const [key, counts] of this.counts) {
			const at = key.indexOf('|');
			if (key.slice(0, at) !== accountId || !limitCovers(limit, key.slice(at + 1))) continue;
			used += limit.kind === 'requests' ? counts.requests : counts.tokens;
		}
		return used;
	}

	private countsOf(accountId: string, model: string): Counts {
		const key = `${accountId}|${model}`;
		let counts = this.counts.get(key);
		if (!counts) this.counts.set(key, (counts = { requests: 0, tokens: 0 }));
		return counts;
	}

	/** A new UTC day starts every account from zero */
	private rollDay(): void {
		const day = utcDay(this.now());
		if (day === this.day) return;
		this.day = day;
		this.counts = new Map();
		this.logged.clear();
	}
}
