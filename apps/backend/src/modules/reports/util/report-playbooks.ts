// The standard questions about a move, answered in code before the model sees it: "did you
// post in the week before the follower jump?", "did your competitors' reviews move the same
// way?". Each answer is one quotable sentence with its numbers and says how finely the data
// places it in time; `unknown` means the data to answer is missing, and the answer says what.
// Pure.

import _ from 'lodash';

import { monthName } from 'src/modules/venues/util/month.js';
import { addDays, monthWeeks, weekStart } from 'src/modules/venues/util/week.js';

import type {
	ObservationResolution,
	ReportCheck,
	ReportObservation,
} from '../interfaces/report-analysis.interface.js';
import type { ReportCompetitor, ReportData, ReportPost } from '../interfaces/report-data.interface.js';

import type { ReportHistoryMonth } from './report-observations.js';
import { type ReportAspects, short, signed } from './summarize-report.js';

/** What the playbooks need of the aspect vocabulary */
type PlaybookAspects = Pick<ReportAspects, 'isAspect' | 'isRoot' | 'label' | 'rootOf'>;

/** One stored day of the city (`CityDay`). */
export interface PlaybookDay {
	date: string;
	rainMm?: number | null;
	holiday?: string | null;
}

/** The brand's reviews of one week (the month's weeks and the one after). */
export interface PlaybookReviewWeek {
	/** The week's Monday, `YYYY-MM-DD` */
	week: string;
	reviews: number;
	written: number;
	/** Reviews of 3 stars or fewer */
	lowStars: number;
	/** Complaint theme → written reviews raising it that week */
	complaintThemes: Record<string, number>;
}

/** A complaint theme city-wide this month (`ThemeInsightService.city`'s complaints rows). */
export interface PlaybookCityTheme {
	key: string;
	label: string;
	/** Of the city's written reviews with any point, percent; null without any */
	reviewShare: number | null;
	/** Against the month before, in points */
	reviewShareChange: number | null;
	/** Brands it came up at */
	venues: number;
}

export interface PlaybookContext {
	data: ReportData;
	previousData?: Partial<ReportData>;
	history: ReportHistoryMonth[];
	timeZone: string;
	/** The month's days and the next month's first week */
	days: PlaybookDay[];
	reviewWeeks: PlaybookReviewWeek[];
	/** The usual new reviews a week over the six months before; null without history */
	baselinePerWeek: number | null;
	/** Absent when the city's themes were not read (a report across cities) */
	cityThemes?: PlaybookCityTheme[];
	/** The month before's competitors by venue id */
	competitorsPrevious: Map<string, ReportCompetitor>;
	/** The aspect vocabulary (`TopicService.index`, read once per build): the names of every theme key */
	aspects: ReportAspects;
}

/** A city theme row by key. */
const cityTheme = (ctx: PlaybookContext, key: string) => ctx.cityThemes?.find(t => t.key === key);

const RAIN_MM = 1;
const STANDOUT_OWN_POST = 2;
const STANDOUT_POST = 3;
const CARRIES_MONTH = 0.5;
const PAID_SHARE = 0.5;
const SAME_WAY_PERCENT = 30;
const THEME_GREW_POINTS = 10;
const NEAR_POINTS = 5;
const ABOVE_POINTS = 10;
const CHANGES_NOTICED = 2;
const LOW_STARS_SHARE = 0.5;

const check = (
	question: string,
	answer: string,
	verdict: ReportCheck['verdict'],
	resolution: ObservationResolution,
): ReportCheck => ({ question, answer, verdict, resolution });

const dayLabel = (date: string) =>
	new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' });
const weekLabel = (week: string) => `the week of ${dayLabel(week)}`;
const percent = (n: number, of: number) => (of ? Math.round((n / of) * 100) : 0);
const list = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : items[0] ?? '');
const platformName = (p: string) => (p === 'tiktok' ? 'TikTok' : p === 'instagram' ? 'Instagram' : 'blogs');
const pct = (from: number, to: number) => (from > 0 ? Math.round(((to - from) / from) * 100) : undefined);

/** A post as a check names it: creator, followers, views, when. */
const postLine = (p: ReportPost, timeZone: string) =>
	`${p.author ? `@${p.author}` : 'a post'} on ${platformName(p.platform)}` +
	`${p.authorFans ? ` (${short(p.authorFans)} followers)` : ''}: ${short(p.views)} views in ${weekLabel(weekStart(new Date(p.postedAt), timeZone))}` +
	`${p.promotional ? ', paid or gifted' : ''}`;

const inWindow = (iso: string, from: string, to: string) => {
	const day = iso.slice(0, 10);
	return day >= from && day < to;
};

/** The month's weeks the observation is about: its week-level points' weeks, else the whole month. */
const windowOf = (o: ReportObservation, month: string): { from: string; to: string; label: string } => {
	const weeks = monthWeeks(month);
	return { from: weeks[0], to: addDays(weeks.at(-1)!, 7), label: monthName(month) };
};

const calendarIn = (ctx: PlaybookContext, from: string, to: string) => {
	const days = ctx.days.filter(d => d.date >= from && d.date < to);
	const rainy = days.filter(d => d.rainMm != null && d.rainMm >= RAIN_MM);
	const holidays = days.filter(d => d.holiday).map(d => `${d.holiday} (${dayLabel(d.date)})`);
	const events = (ctx.data.context?.events ?? [])
		.filter(e => e.startDate < to && e.endDate >= from)
		.map(e => `${e.name} (${dayLabel(e.startDate)}–${dayLabel(e.endDate)})`);
	const weather = days.some(d => d.rainMm != null);
	return { days: days.length, rainy: rainy.length, weather, holidays, events };
};

const calendarCheck = (ctx: PlaybookContext, from: string, to: string, what: string): ReportCheck => {
	const c = calendarIn(ctx, from, to);
	if (!c.days) return check(`Was there a holiday, an event or rain ${what}?`, 'The city\'s calendar has no days stored for this window.', 'unknown', 'day');
	const parts = [
		c.weather ? `rain on ${c.rainy} of ${c.days} days` : 'no weather stored',
		c.holidays.length ? `public holidays: ${list(c.holidays)}` : 'no public holiday',
		c.events.length ? `events: ${list(c.events)}` : 'no event',
	];
	return check(
		`Was there a holiday, an event or rain ${what}?`,
		`${parts.join('; ')}. Context only: the calendar never explains a move on its own.`,
		'neutral',
		'day',
	);
};

const competitorMoves = (
	ctx: PlaybookContext,
	pick: (now: ReportCompetitor, before: ReportCompetitor) => { from: number; to: number } | undefined,
) =>
	ctx.data.competitors.flatMap(c => {
		const before = ctx.competitorsPrevious.get(c.venueId);
		const pair = before && pick(c, before);
		if (!pair) return [];
		const change = pct(pair.from, pair.to);
		return change === undefined ? [] : [{ name: c.name, ...pair, change }];
	});

/** Did the competitors move the same way as the venue (sign of `direction`)? */
const competitorsCheck = (
	question: string,
	moves: { name: string; from: number; to: number; change: number }[],
	direction: number,
	unit: 'count' | 'views',
	missing: string,
): ReportCheck => {
	if (!moves.length) return check(question, missing, 'unknown', 'month');
	const sameWay = moves.filter(m => Math.sign(m.change) === Math.sign(direction) && Math.abs(m.change) >= SAME_WAY_PERCENT);
	const lines = moves.map(m => `${m.name} ${unit === 'views' ? short(m.from) : m.from} → ${unit === 'views' ? short(m.to) : m.to} (${signed(m.change, `${Math.abs(m.change)}%`)})`);
	const verdict: ReportCheck['verdict'] = sameWay.length * 2 >= moves.length ? 'weakens' : sameWay.length ? 'neutral' : 'supports';
	return check(
		question,
		`${lines.join('; ')}. ${sameWay.length} of ${moves.length} moved the same way by 30% or more` +
			(verdict === 'weakens' ? ': the move looks wider than your place.' : verdict === 'supports' ? ': the move looks like yours alone.' : '.'),
		verdict,
		'month',
	);
};

const followersChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data, timeZone } = ctx;
	const account = data.ownAccounts?.find(a => `followers:${a.platform}:${a.handle}` === o.key);
	if (!account) return [];
	const points = account.followerPoints ?? [];
	const jump = points.find((p, i) => i > 0 && Math.abs(p.followers - points[i - 1].followers) >= 50);
	const jumpWeek = jump ? weekStart(new Date(`${jump.date}T12:00:00Z`), timeZone) : undefined;
	const window =
		jumpWeek ?
			{ from: addDays(jumpWeek, -7), to: addDays(jumpWeek, 7), label: `the week before and ${weekLabel(jumpWeek)}` }
		:	windowOf(o, data.month);
	const resolution: ObservationResolution = jumpWeek ? 'week' : 'month';
	const out: ReportCheck[] = [];

	const own = data.ownPosts.filter(p => p.platform === account.platform && inWindow(p.postedAt, window.from, window.to));
	const topOwn = _.maxBy(own, p => p.views);
	const standout = topOwn && (account.avgViews ? topOwn.views >= account.avgViews * STANDOUT_OWN_POST : true);
	out.push(
		check(
			`Did you post on ${platformName(account.platform)} in ${window.label}?`,
			own.length ?
				`${own.length} own post${own.length > 1 ? 's' : ''}, the most viewed with ${short(topOwn!.views)} views in ${weekLabel(weekStart(new Date(topOwn!.postedAt), timeZone))}` +
					(account.avgViews ? ` against your usual ${short(account.avgViews)}.` : '.')
			:	`No own post on ${platformName(account.platform)} in ${window.label}.`,
			own.length ? (standout ? 'supports' : 'neutral') : 'weakens',
			'day',
		),
	);

	const others = data.posts.filter(p => p.platform === account.platform && inWindow(p.postedAt, window.from, window.to));
	const median = data.posts.length ? _.sortBy(data.posts.map(p => p.views))[Math.floor(data.posts.length / 2)] : 0;
	const top = _.orderBy(others, p => p.views, 'desc').slice(0, 3);
	out.push(
		check(
			`Did a creator's post about you take off in ${window.label}?`,
			top.length ?
				`${others.length} post${others.length > 1 ? 's' : ''} by others; the top: ${list(top.map(p => postLine(p, timeZone)))}. The month's median post has ${short(median)} views.`
			:	`No post by others on ${platformName(account.platform)} in ${window.label}.`,
			top.length ? (median && top[0].views >= median * STANDOUT_POST ? 'supports' : 'neutral') : 'weakens',
			'day',
		),
	);

	const press = data.press;
	out.push(
		press ?
			check(
				'Were you in the press this month?',
				`${press.features} feature${press.features === 1 ? '' : 's'}, ${press.listicles} list${press.listicles === 1 ? '' : 's'}, ${press.passing} passing mention${press.passing === 1 ? '' : 's'}` +
					(press.items[0] ? `; first: ${press.items[0].outlet ?? press.items[0].title}${press.items[0].publishedAt ? ` (${dayLabel(press.items[0].publishedAt)})` : ''}.` : '.'),
				press.features ? 'supports' : 'neutral',
				'day',
			)
		:	check('Were you in the press this month?', 'No press was found this month, or none was searched for.', 'unknown', 'month'),
	);

	if (resolution === 'month')
		out.push(
			check(
				'When exactly did the count move?',
				`Follower counts for @${account.handle} are monthly snapshots this month, so the move fell somewhere between the ${o.comparedWith} and ${monthName(data.month)} snapshots.`,
				'unknown',
				'month',
			),
		);
	return out;
};

const reviewsChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data } = ctx;
	const weeks = ctx.reviewWeeks.filter(w => w.week.slice(0, 7) <= data.month);
	const out: ReportCheck[] = [];
	if (weeks.length) {
		const usual = ctx.baselinePerWeek;
		out.push(
			check(
				'How did the reviews spread over the weeks?',
				`Reviews by week: ${weeks.map(w => `${w.reviews} in ${weekLabel(w.week)}`).join(', ')}` +
					(usual ? `; your usual pace is ${Math.round(usual * 10) / 10} a week.` : '.'),
				'neutral',
				'week',
			),
		);
		const busy = usual ? weeks.filter(w => w.reviews >= usual * 2 && w.reviews >= 3) : [];
		if (busy.length && o.kind === 'spike') {
			const low = _.sumBy(busy, w => w.lowStars);
			const total = _.sumBy(busy, w => w.reviews);
			const monthLow = _.sumBy(data.reviews.stars.filter(s => s.stars <= 3), s => s.count);
			out.push(
				check(
					'What stars did the busy weeks give?',
					`${low} of the ${total} reviews in ${list(busy.map(w => weekLabel(w.week)))} gave 3 stars or fewer (${percent(low, total)}%), against ${percent(monthLow, data.reviews.count)}% over the month.`,
					total && low / total >= LOW_STARS_SHARE ? 'supports' : 'neutral',
					'week',
				),
			);
			const window = { from: busy[0].week, to: addDays(busy.at(-1)!.week, 7) };
			out.push(calendarCheck(ctx, window.from, window.to, `in ${list(busy.map(w => weekLabel(w.week)))}`));
		} else {
			const window = windowOf(o, data.month);
			out.push(calendarCheck(ctx, window.from, window.to, `in ${monthName(data.month)}`));
		}
	}
	out.push(
		competitorsCheck(
			"Did your competitors' review counts move the same way?",
			competitorMoves(ctx, (now, before) => (now.reviewsTracked && before.reviewsTracked ? { from: before.reviews.count, to: now.reviews.count } : undefined)),
			o.change,
			'count',
			'No competitor has tracked reviews for both months.',
		),
	);
	if (ctx.cityThemes && data.reviews.complaintThemes && data.previous?.reviews?.complaintThemes) {
		const grown = grownThemes(data, data.previous.reviews.written, ctx.aspects);
		const cityGrown = grown.filter(g => (ctx.cityThemes!.find(t => t.key === g.theme)?.reviewShareChange ?? 0) >= 3);
		if (grown.length)
			out.push(
				check(
					'Did the complaints that grew for you grow across the city too?',
					cityGrown.length ?
						`${list(cityGrown.map(g => `${g.label} rose ${signed(cityTheme(ctx, g.theme)!.reviewShareChange!, `${Math.abs(cityTheme(ctx, g.theme)!.reviewShareChange!)} points`)} city-wide`))}: part of a wider move.`
					:	`${list(grown.map(g => g.label))} grew for you but not across the city's ${ctx.cityThemes[0]?.venues ?? ''} brands with reviews.`,
					cityGrown.length ? 'weakens' : 'supports',
					'month',
				),
			);
	}
	return out;
};

/** Complaint themes whose share of written reviews grew `THEME_GREW_POINTS`+ against the month before; the roots left out. */
const grownThemes = (data: ReportData, prevWritten: number, aspects: PlaybookAspects) => {
	const prev = data.previous?.reviews?.complaintThemes ?? {};
	const now = data.reviews.complaintThemes ?? {};
	return _.orderBy(
		Object.entries(now).flatMap(([theme, n]) => {
			if (!aspects.isAspect(theme) || aspects.isRoot(theme)) return [];
			const before = prev[theme] ?? 0;
			const change = percent(n, data.reviews.written) - percent(before, prevWritten);
			return change >= THEME_GREW_POINTS ?
					[{ theme, label: aspects.label(theme).toLowerCase(), topic: aspects.rootOf(theme) ?? theme, n, before, change }]
				:	[];
		}),
		g => -g.change,
	);
};

const starsChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data } = ctx;
	const prev = data.previous?.reviews;
	const out: ReportCheck[] = [];
	if (prev?.complaintThemes && data.reviews.complaintThemes) {
		const grown = grownThemes(data, prev.written, ctx.aspects).slice(0, 3);
		out.push(
			check(
				'Which complaints grew against last month?',
				grown.length ?
					list(grown.map(g => `${g.label}: from ${g.before} of ${prev.written} written reviews to ${g.n} of ${data.reviews.written} (${signed(g.change, `${g.change} points`)})`)) + '.'
				:	'No complaint theme grew by 10 points or more against last month.',
				grown.length ? 'supports' : 'neutral',
				'month',
			),
		);
	} else out.push(check('Which complaints grew against last month?', "Last month's complaint themes are not stored, so the shift cannot be placed.", 'unknown', 'month'));

	const changes = (data.reviews.changeThemes ?? []).filter(c => c.reviews >= CHANGES_NOTICED);
	out.push(
		check(
			'Did guests notice a change at your place?',
			changes.length ?
				`${list(changes.slice(0, 3).map(c => `${c.label.toLowerCase()} (${c.reviews} reviews: "${c.details[0]}")`))}.`
			:	'No review this month noticed a change since an earlier visit.',
			changes.length ? 'supports' : 'neutral',
			'month',
		),
	);

	if (prev?.stars) {
		const low = (stars: { stars: number; count: number }[]) => _.sumBy(stars.filter(s => s.stars <= 3), s => s.count);
		const rated = (stars: { stars: number; count: number }[]) => _.sumBy(stars, s => s.count);
		out.push(
			check(
				'Where did the stars go?',
				`Reviews of 3 stars or fewer: ${low(prev.stars)} of ${rated(prev.stars)} (${percent(low(prev.stars), rated(prev.stars))}%) in ${monthName(data.previous!.month)}, ` +
					`${low(data.reviews.stars)} of ${rated(data.reviews.stars)} (${percent(low(data.reviews.stars), rated(data.reviews.stars))}%) in ${monthName(data.month)}.`,
				'neutral',
				'month',
			),
		);
	}

	if (o.metric === 'complaint_theme' && o.theme && ctx.aspects.isAspect(o.theme)) {
		// The competitors' complaint counts are per root
		const topic = ctx.aspects.rootOf(o.theme) ?? o.theme;
		const tracked = data.competitors.filter(c => c.reviewsTracked && c.reviews.written >= 5);
		const theirs = tracked.map(c => percent(c.reviews.complaints[topic] ?? 0, c.reviews.written));
		const competitorMedian = theirs.length ? _.sortBy(theirs)[Math.floor(theirs.length / 2)] : undefined;
		const city = cityTheme(ctx, o.theme);
		const mine = o.to;
		const parts = [
			competitorMedian !== undefined ? `${topic} complaints at ${tracked.length} tracked competitor${tracked.length > 1 ? 's' : ''}: median ${competitorMedian}% of written reviews` : undefined,
			city?.reviewShare != null ? `${city.label.toLowerCase()} city-wide: ${Math.round(city.reviewShare)}% of written reviews at ${city.venues} brands` : undefined,
		].filter((p): p is string => !!p);
		const refs = [competitorMedian, city?.reviewShare != null ? Math.round(city.reviewShare) : undefined].filter((n): n is number => n !== undefined);
		const verdict: ReportCheck['verdict'] =
			!refs.length ? 'unknown'
			: refs.every(r => Math.abs(mine - r) <= NEAR_POINTS) ? 'weakens'
			: refs.every(r => mine - r >= ABOVE_POINTS) ? 'supports'
			: 'neutral';
		out.push(
			check(
				'Is this complaint higher at your place than at your competitors and in the city?',
				refs.length ? `Yours: ${mine}%. ${parts.join('; ')}.` : 'No tracked competitor with 5+ written reviews and no city-wide figure to compare with.',
				verdict,
				'month',
			),
		);
	}
	return out;
};

const socialChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data, timeZone } = ctx;
	const out: ReportCheck[] = [];
	const top = _.orderBy(data.posts, p => p.views, 'desc').slice(0, 3);
	const total = data.social.views;
	out.push(
		top.length ?
			check(
				'Which posts carried the month?',
				`${list(top.map(p => postLine(p, timeZone)))}. The top post holds ${percent(top[0].views, total)}% of the month's ${short(total)} views.`,
				o.kind === 'spike' && total && top[0].views / total >= CARRIES_MONTH ? 'supports' : 'neutral',
				'day',
			)
		:	check('Which posts carried the month?', 'No post by others this month.', 'neutral', 'month'),
	);
	if (data.social.postCount) {
		const paid = data.social.promotional;
		out.push(
			check(
				'How much of it was paid or gifted?',
				`${paid} of ${data.social.postCount} posts were paid or gifted (${percent(paid, data.social.postCount)}%)` +
					(data.previous ? `; ${data.previous.social.promotional} of ${data.previous.social.postCount} in ${monthName(data.previous.month)}.` : '.'),
				o.kind === 'spike' && paid / data.social.postCount >= PAID_SHARE ? 'supports' : 'neutral',
				'month',
			),
		);
	}
	const buzz = data.correlations?.buzzToReviews;
	out.push(
		buzz ?
			check('Did the buzz reach your reviews?', buzz.sentence, 'neutral', 'week')
		:	check('Did the buzz reach your reviews?', 'Below the floors for the buzz-to-reviews relation (10 reviews, 3 posts) or without six months of reviews.', 'unknown', 'week'),
	);
	if (o.kind === 'dip' && data.creatorsNearby.length)
		out.push(
			check(
				'Who posted about your neighbours instead?',
				`${data.creatorsNearby.length} creators covered neighbours in your district but not you; the biggest: ${list(
					data.creatorsNearby.slice(0, 3).map(c => `@${c.author} (${c.authorFans ? `${short(c.authorFans)} followers, ` : ''}${list(c.venues.slice(0, 2))})`),
				)}.`,
				'neutral',
				'month',
			),
		);
	return out;
};

const placeChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data, timeZone } = ctx;
	const branch = data.branches.find(b => b.venueId === o.branchId);
	if (!branch) return [];
	const out: ReportCheck[] = [];
	const dates =
		o.metric === 'booked' ? (branch.demand?.evenings.map(e => e.date) ?? [])
		: (branch.busyness?.weeks.map(w => w.week) ?? []);
	if (dates.length) {
		const from = _.min(dates)!;
		const to = addDays(_.max(dates)!, o.metric === 'booked' ? 1 : 7);
		if (o.metric === 'booked') {
			const evenings = branch.demand!.evenings;
			const rainy = evenings.filter(e => (ctx.days.find(d => d.date === e.date)?.rainMm ?? 0) >= RAIN_MM);
			const holidays = evenings.filter(e => ctx.days.find(d => d.date === e.date)?.holiday);
			out.push(
				check(
					'Was it raining or a holiday on the sampled evenings?',
					`${evenings.length} evenings sampled; rain on ${rainy.length}${holidays.length ? `, a public holiday on ${holidays.length}` : ''}. ` +
						`Booked: ${evenings.map(e => `${Math.round(e.booked)}% on ${dayLabel(e.date)}`).join(', ')}.`,
					'neutral',
					'day',
				),
			);
		} else out.push(calendarCheck(ctx, from, to, 'in the sampled weeks'));
		const own = data.ownPosts.filter(p => inWindow(p.postedAt, from, to));
		out.push(
			check(
				'Did you post in those weeks?',
				own.length ? `${own.length} own post${own.length > 1 ? 's' : ''}, the most viewed with ${short(_.maxBy(own, p => p.views)!.views)} views.` : 'No own post in those weeks.',
				'neutral',
				'day',
			),
		);
	}
	const competitors = data.competitors.filter(c => !c.branchId || c.branchId === branch.venueId);
	if (o.metric === 'busyness') {
		const moves = competitors.flatMap(c =>
			c.busyness?.previousIndex !== undefined ? [{ name: c.name, change: Math.round(c.busyness.index - c.busyness.previousIndex) }] : [],
		);
		const sameWay = moves.filter(m => Math.sign(m.change) === Math.sign(o.change) && Math.abs(m.change) >= 5);
		out.push(
			moves.length ?
				check(
					"Did your competitors' foot traffic move the same way?",
					`${list(moves.map(m => `${m.name} ${signed(m.change, `${Math.abs(m.change)} points`)}`))} (each against its own peak, never a level next to yours).`,
					sameWay.length * 2 >= moves.length ? 'weakens' : sameWay.length ? 'neutral' : 'supports',
					'week',
				)
			:	check("Did your competitors' foot traffic move the same way?", 'No competitor has popular times for both months.', 'unknown', 'week'),
		);
	}
	if (o.metric === 'booked') {
		const moves = competitors.flatMap(c => {
			const before = ctx.competitorsPrevious.get(c.venueId)?.demand?.booked;
			return c.demand && before !== undefined ? [{ name: c.name, from: Math.round(before), to: Math.round(c.demand.booked), change: Math.round(c.demand.booked - before) }] : [];
		});
		const sameWay = moves.filter(m => Math.sign(m.change) === Math.sign(o.change) && Math.abs(m.change) >= 10);
		out.push(
			moves.length ?
				check(
					"Did your competitors' weekend tables move the same way?",
					`${list(moves.map(m => `${m.name} ${m.from}% → ${m.to}% booked (${signed(m.change, `${Math.abs(m.change)} points`)})`))}` +
						(branch.demand?.district ? `; the district's median is ${Math.round(branch.demand.district.median)}% over ${branch.demand.district.venues} venues.` : '.'),
					sameWay.length * 2 >= moves.length ? 'weakens' : sameWay.length ? 'neutral' : 'supports',
					'week',
				)
			:	check("Did your competitors' weekend tables move the same way?", 'No competitor has booking samples for both months.', 'unknown', 'week'),
		);
	}
	void timeZone;
	return out;
};

const searchRankChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data, previousData } = ctx;
	const branch = data.branches.find(b => b.venueId === o.branchId);
	const rank = branch?.searchRanks?.find(r => r.query === o.query);
	if (!branch || !rank) return [];
	const out: ReportCheck[] = [];
	const above = rank.rank ? rank.top.slice(0, rank.rank - 1) : rank.top;
	const before = previousData?.branches?.find(b => b.venueId === o.branchId)?.searchRanks?.find(r => r.query === o.query);
	if (before) {
		const beforeNames = new Set(before.top.map(t => t.name.toLowerCase()));
		const newAbove = above.filter(t => !t.isVenue && !beforeNames.has(t.name.toLowerCase()));
		out.push(
			check(
				'Who ranks above you now, and were they there last month?',
				above.length ?
					`Above you: ${list(above.filter(t => !t.isVenue).map(t => `${t.name}${t.rating ? ` (${t.rating.toFixed(1)}★)` : ''}`))}. ` +
						(newAbove.length ? `New in the top ten since ${o.comparedWith}: ${list(newAbove.map(t => t.name))}.` : `All of them were in the top ten in ${o.comparedWith} too.`)
				:	'Nobody ranks above you.',
				o.change > 0 && newAbove.length ? 'supports' : 'neutral',
				'month',
			),
		);
	} else out.push(check('Who ranks above you now, and were they there last month?', `Above you: ${list(above.filter(t => !t.isVenue).map(t => t.name)) || 'nobody'}. Last month's top ten is not stored.`, 'unknown', 'month'));
	const opened = branch.neighbourhood?.changes.venues.filter(v => v.kind === 'opened') ?? [];
	const inTop = opened.filter(v => rank.top.some(t => t.name.toLowerCase() === v.name.toLowerCase()));
	out.push(
		branch.neighbourhood ?
			check(
				'Did a place open nearby this quarter?',
				opened.length ?
					`${branch.neighbourhood.changes.opened} opened in ${branch.neighbourhood.changes.district}: ${list(opened.slice(0, 4).map(v => `${v.name}${v.source === 'posts' ? ' (from a post)' : ''}`))}` +
						(inTop.length ? `; ${list(inTop.map(v => v.name))} now in this search's top ten.` : '; none of them in this search\'s top ten.')
				:	`No opening seen in ${branch.neighbourhood.changes.district} this quarter.`,
				o.change > 0 && inTop.length ? 'supports' : 'neutral',
				'month',
			)
		:	check('Did a place open nearby this quarter?', 'No district on record, so openings nearby are unknown.', 'unknown', 'month'),
	);
	return out;
};

const replyRateChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const { data, timeZone } = ctx;
	const unanswered = data.reviews.list.filter(r => (r.stars ?? 5) <= 3 && !r.replied);
	const byWeek = _.countBy(unanswered, r => weekStart(new Date(r.publishedAt), timeZone));
	const out: ReportCheck[] = [
		check(
			'Which critical reviews went unanswered?',
			unanswered.length ?
				`${unanswered.length} reviews of 3 stars or fewer have no answer: ${Object.entries(byWeek).sort().map(([w, n]) => `${n} in ${weekLabel(w)}`).join(', ')}.`
			:	'Every review of 3 stars or fewer this month has an answer.',
			'neutral',
			'week',
		),
	];
	const asked = (data.previous?.actions ?? []).filter(a => /repl|answer/i.test(`${a.title} ${a.text}`));
	if (asked.length)
		out.push(check("Did last month's actions ask for replies?", `Yes: "${asked[0].title}".`, 'neutral', 'month'));
	void o;
	return out;
};

const competitorReachChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const c = ctx.data.competitors.find(x => x.name === o.competitor);
	const before = c && ctx.competitorsPrevious.get(c.venueId);
	if (!c || !before) return [];
	const out: ReportCheck[] = [
		check(
			`Did ${c.name}'s post count move too?`,
			`${c.name}: ${before.social.postCount} → ${c.social.postCount} posts by others, ${before.social.creators} → ${c.social.creators} creators; you: ${ctx.data.previous?.social.postCount ?? '—'} → ${ctx.data.social.postCount} posts.`,
			'neutral',
			'month',
		),
	];
	if (c.reviewsTracked && before.reviewsTracked)
		out.push(check(`What about ${c.name}'s reviews?`, `${before.reviews.count} → ${c.reviews.count} Google reviews${c.reviews.avgStars ? `, ${c.reviews.avgStars} stars this month` : ''}.`, 'neutral', 'month'));
	out.push(check(`What did ${c.name}'s posts say?`, "We keep competitors' counts, not their posts, so what they posted is not stored here.", 'unknown', 'month'));
	return out;
};

const dishShareChecks = (o: ReportObservation, ctx: PlaybookContext): ReportCheck[] => {
	const name = o.key.slice('dish_share:'.length);
	const dish = ctx.data.dishes.find(d => d.name.toLowerCase() === name);
	if (!dish) return [];
	const inPosts = ctx.data.posts.filter(p => p.dishes.some(d => d.name.toLowerCase() === name)).length;
	return [
		check(
			`Was ${dish.name} named in posts or in reviews?`,
			`${dish.count} sources named it: ${inPosts} posts by others and ${dish.count - inPosts} reviews; ${dish.positive} praised it, ${dish.negative} criticised it.`,
			'neutral',
			'month',
		),
	];
};

/** The playbook's answers for one observation, in the order an owner would ask them. */
export const runPlaybook = (o: ReportObservation | Omit<ReportObservation, 'checks'>, ctx: PlaybookContext): ReportCheck[] => {
	const observation = o as ReportObservation;
	switch (o.metric) {
		case 'followers':
			return followersChecks(observation, ctx);
		case 'reviews':
		case 'written_reviews':
		case 'review_week':
			return reviewsChecks(observation, ctx);
		case 'avg_stars':
		case 'five_star_share':
		case 'complaint_theme':
			return starsChecks(observation, ctx);
		case 'posts':
		case 'views':
		case 'creators':
			return socialChecks(observation, ctx);
		case 'busyness':
		case 'booked':
			return placeChecks(observation, ctx);
		case 'search_rank':
			return searchRankChecks(observation, ctx);
		case 'reply_rate':
			return replyRateChecks(observation, ctx);
		case 'competitor_reach':
			return competitorReachChecks(observation, ctx);
		case 'dish_share':
			return dishShareChecks(observation, ctx);
		case 'rating':
			return starsChecks(observation, ctx);
	}
};

/** The month's reviews as `PlaybookReviewWeek`s, for the context builders. */
export const reviewWeeksOf = (
	reviews: { publishedAt: Date; stars?: number | null; text?: string | null; textTranslated?: string | null; themes: string[] }[],
	timeZone: string,
): PlaybookReviewWeek[] =>
	_.sortBy(
		Object.values(_.groupBy(reviews, r => weekStart(r.publishedAt, timeZone))).map(group => ({
			week: weekStart(group[0].publishedAt, timeZone),
			reviews: group.length,
			written: group.filter(r => r.text || r.textTranslated).length,
			lowStars: group.filter(r => (r.stars ?? 5) <= 3).length,
			complaintThemes: _.countBy(group.flatMap(r => _.uniq(r.themes))),
		})),
		w => w.week,
	);
