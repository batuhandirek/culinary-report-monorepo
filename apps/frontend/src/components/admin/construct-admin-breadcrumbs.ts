import type { Component } from 'svelte';

import { page } from '$app/state';
import { ADMIN_MENUS, findAdminMenu } from '#constants/ADMIN_MENUS.js';

export interface AdminBreadcrumb {
	// Empty for the page you are on: it is not a link.
	href: string;
	name: string;
	icon?: Component;
}

// `some-page` → "Some page", for a path nobody named.
const sentence = (segment: string) =>
	segment.charAt(0).toUpperCase() + segment.slice(1).replaceAll('-', ' ');

// Keyed by the section's href; `segment` is the path part right after it.
const DETAIL_NAMES: Record<string, (segment: string) => string | undefined> = {
	'/admin/users': () => {
		const user = page.data.user;
		return user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'User' : undefined;
	},
	'/admin/brands': () => page.data.brand?.name,
	'/admin/venues': () => page.data.venue?.name,
	'/admin/cities': () => page.data.city?.name,
	'/admin/posts': () => (page.data.post ? `@${page.data.post.author ?? 'post'}` : undefined),
	'/admin/creators': () => page.data.creator?.name,
	'/admin/reports': () =>
		page.data.report ? `${page.data.report.brand.name} · ${page.data.report.month}` : undefined,
	'/admin/blog': (segment) => (segment === 'new' ? 'New article' : page.data.entry?.title),
	'/admin/instagram': () => page.data.designName,
	// A topic's page loads its own data per city: its key reads well enough
	'/admin/trends': (segment) => sentence(decodeURIComponent(segment)),
	'/admin/ui-kit': (segment) => sentence(segment)
};

// Reads `page` from $app/state, so calls are reactive when made inside $derived.
export function constructAdminBreadcrumbs(): AdminBreadcrumb[] {
	const pathname = page.url.pathname;
	const overview = ADMIN_MENUS[0];
	const crumbs: AdminBreadcrumb[] = [
		{ href: overview.href, name: overview.name, icon: overview.icon }
	];

	const section = findAdminMenu(pathname);
	if (!section || section === overview) return crumbs;
	crumbs.push({ href: section.href, name: section.name, icon: section.icon });

	// The path the section matched on: its own, or an older one it took in (`/admin/venues`)
	const base =
		[...section.paths]
			.sort((a, b) => b.length - a.length)
			.find((path) => pathname === path || pathname.startsWith(`${path}/`)) ?? section.href;
	const segment = pathname.slice(base.length).split('/').filter(Boolean)[0];
	if (!segment) return crumbs;
	// A theme sits under the Trends tab that lists the themes, for the same city and month
	if (base === '/admin/trends' && segment === 'themes') {
		const params = new URLSearchParams({ tab: 'themes' });
		for (const name of ['cityId', 'month']) {
			const value = page.url.searchParams.get(name);
			if (value) params.set(name, value);
		}
		const theme = pathname.split('/').filter(Boolean)[3];
		crumbs.push({ href: `/admin/trends?${params}`, name: 'Praise and complaints' });
		// Its label comes with the page's data (the vocabulary lives in the topics table): the key reads well enough
		crumbs.push({ href: '', name: theme ? sentence(decodeURIComponent(theme).replaceAll('_', ' ')) : 'Theme' });
		return crumbs;
	}
	// Report templates sit beside the reports: Reports › Report templates › a template
	if (base === '/admin/reports' && segment === 'templates') {
		const template = page.data.reportTemplate as { name: string } | undefined;
		if (!template) {
			crumbs.push({ href: '', name: 'Report templates' });
			return crumbs;
		}
		crumbs.push({ href: '/admin/reports/templates', name: 'Report templates' });
		crumbs.push({ href: '', name: template.name });
		return crumbs;
	}
	// A brand's report configuration sits under the brand's Reports tab
	const config = page.data.reportConfig as { name: string } | undefined;
	const brand = page.data.brand as { id: string; name: string } | undefined;
	if (base === '/admin/brands' && config && brand) {
		crumbs.push({ href: `/admin/brands/${brand.id}?tab=reports`, name: brand.name });
		crumbs.push({ href: '', name: config.name });
		return crumbs;
	}
	// A branch sits under its brand
	const venue = page.data.venue as { brand?: { id: string; name: string } } | undefined;
	if (base === '/admin/venues' && venue?.brand) {
		crumbs.push({ href: `/admin/brands/${venue.brand.id}`, name: venue.brand.name });
	}
	// A page that has not said what it is still gets a crumb, so the section stays a link;
	// one that failed to load says so instead of pretending to be a record.
	const unnamed = page.error ? (page.status === 404 ? 'Not found' : 'Error') : 'Details';
	crumbs.push({ href: '', name: DETAIL_NAMES[base]?.(segment) ?? unnamed });
	return crumbs;
}

/** `<title>` for an admin path: the section it is in. */
export const adminSectionName = (pathname: string) => findAdminMenu(pathname)?.name ?? 'Admin';
