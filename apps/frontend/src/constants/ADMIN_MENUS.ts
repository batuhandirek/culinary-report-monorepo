import {
	FileText,
	GalleryHorizontalEnd,
	LayoutDashboard,
	MapPin,
	Megaphone,
	MessageSquareText,
	MonitorSmartphone,
	Newspaper,
	Palette,
	Store,
	TrendingUp,
	Users,
	Workflow
} from '@lucide/svelte';
import type { Component } from 'svelte';

// The sidebar's sections, in the order they are listed. `null` is the ungrouped top.
export const ADMIN_MENU_GROUPS = ['Market', 'Output', 'Operations', 'Content', 'People', 'System'] as const;
export type AdminMenuGroup = (typeof ADMIN_MENU_GROUPS)[number];

export interface AdminMenu {
	name: string;
	href: string;
	icon: Component;
	group: AdminMenuGroup | null;
	// Other words an operator might type for it in the command palette.
	keywords?: string[];
	// One line for the list page's header.
	description?: string;
	// Whether this entry is where `pathname` lives (the page itself or anything under it).
	isActive: (pathname: string) => boolean;
	// Its own path and the older ones that live under it now (a branch page under Brands)
	paths: string[];
}

// Its own page, or a path under it — never a mere substring (`/admin/users` is not
// `/admin/user-sessions`).
const under = (href: string) => (pathname: string) =>
	pathname === href || pathname.startsWith(`${href}/`);

const menu = (
	item: Omit<AdminMenu, 'isActive' | 'paths'> & { also?: string[] }
): AdminMenu => {
	const { also = [], ...rest } = item;
	return {
		...rest,
		paths: [item.href, ...also],
		isActive:
			item.href === '/admin'
				? (pathname) => pathname === '/admin'
				: (pathname) => [item.href, ...also].some((href) => under(href)(pathname))
	};
};

export const ADMIN_MENUS: AdminMenu[] = [
	menu({
		name: 'Today',
		href: '/admin',
		icon: LayoutDashboard,
		group: null,
		keywords: ['overview', 'home', 'inbox', 'todo', 'follow-ups']
	}),

	menu({
		name: 'Brands',
		href: '/admin/brands',
		icon: Store,
		group: 'Market',
		// A venue is a brand's branch
		also: ['/admin/venues'],
		keywords: ['venues', 'restaurants', 'bars', 'cafes', 'places', 'chains', 'branches', 'prospects', 'outreach', 'sales', 'customers', 'leads'],
		description:
			"Every business in the city: the month's posts by others and reviews, its lead score, where it stands with us and its report."
	}),
	menu({
		name: 'Social',
		href: '/admin/posts',
		icon: MessageSquareText,
		group: 'Market',
		// A creator's page lives under it
		also: ['/admin/creators'],
		keywords: ['posts', 'tiktok', 'instagram', 'videos', 'mentions', 'listening', 'creators', 'influencers', 'accounts', 'handles', 'own accounts', 'followers'],
		description:
			"Everything we listened to on TikTok and Instagram: the posts and the brands each names, the creators behind them, and the venues' own accounts."
	}),
	menu({
		name: 'Trends',
		href: '/admin/trends',
		icon: TrendingUp,
		group: 'Market',
		keywords: ['topics', 'cuisines', 'dishes', 'food', 'districts', 'creators', 'rising', 'google trends', 'searches', 'openings', 'praise', 'complaints', 'themes', 'what guests say', 'dish names', 'unrecognised words'],
		description:
			'What the city eats and talks about: each kind of food with its venues, posts and Google searches, and how the month moved against the last.'
	}),
	menu({
		name: 'Cities',
		href: '/admin/cities',
		icon: MapPin,
		group: 'Market',
		keywords: ['city', 'country', 'districts', 'hashtags', 'searches', 'sources', 'calendar', 'budgets'],
		description: 'The places we cover: districts, the hashtags and searches we listen to, holidays and budgets.'
	}),

	menu({
		name: 'Reports',
		href: '/admin/reports',
		icon: FileText,
		group: 'Output',
		keywords: ['monthly', 'report', 'pdf', 'share', 'report templates', 'report configurations', 'sections', 'layout'],
		description: 'Monthly reports per brand and city: built, shared and sent.'
	}),

	menu({
		name: 'Data',
		href: '/admin/data',
		icon: Workflow,
		group: 'Operations',
		keywords: ['pipeline', 'scrape', 'apify', 'cron', 'jobs', 'costs', 'coverage', 'runs'],
		description: 'Which months are complete, what each step found, what failed, and what it cost.'
	}),

	menu({
		name: 'Blog',
		href: '/admin/blog',
		icon: Newspaper,
		group: 'Content',
		keywords: ['posts', 'articles', 'content', 'seo'],
		description: 'Articles on the public blog, drafts included.'
	}),
	menu({
		name: 'Instagram',
		href: '/admin/instagram',
		icon: GalleryHorizontalEnd,
		group: 'Content',
		keywords: ['posts', 'carousel', 'stories', 'design', 'templates', 'canvas', 'share images', 'png', 'caption', 'social media'],
		description: 'Design a post from one of our layouts, fill it in, save it as images for Instagram.'
	}),
	menu({
		name: 'Public reports',
		href: '/admin/public-reports',
		icon: Megaphone,
		group: 'Content',
		keywords: ['highlights', 'public highlights', 'public page', 'city month', 'top hits', 'food trends', 'quarter', 'share cards', 'share images', 'do-not-list', 'leave out', 'publish', 'pull searches', 'front page', 'landing', 'live edition', 'newsletter'],
		description: 'The pages we publish about a city: its month and its quarter of food trends, built from stored data and published by hand, and the front page\'s live edition, rebuilt every five days.'
	}),

	menu({
		name: 'Users',
		href: '/admin/users',
		icon: Users,
		group: 'People',
		keywords: ['members', 'accounts'],
		description: 'Every account.'
	}),
	menu({
		name: 'Sessions',
		href: '/admin/user-sessions',
		icon: MonitorSmartphone,
		group: 'People',
		keywords: ['user sessions', 'devices', 'logins'],
		description: 'Signed-in sessions. Revoking one signs that browser out.'
	}),

	menu({
		name: 'UI kit',
		href: '/admin/ui-kit',
		icon: Palette,
		group: 'System',
		keywords: ['design system', 'components']
	})
];

/** The entry `pathname` lives under: the longest matching one, so nothing shadows another. */
export const findAdminMenu = (pathname: string): AdminMenu | undefined =>
	ADMIN_MENUS.filter((item) => item.isActive(pathname)).sort(
		(a, b) => b.href.length - a.href.length
	)[0];
