import { findAdminMenu } from '#constants/ADMIN_MENUS.js';

export const ssr = false;

// Every admin page is titled after its section and kept out of search engines. A page
// with a better name (a record's own) returns its own `pageMetaTags`.
export const load = ({ url }: { url: URL }) => {
	const section = findAdminMenu(url.pathname)?.name;
	return {
		pageMetaTags: {
			title: section ? `${section} · Admin` : 'Admin',
			robots: 'noindex, nofollow'
		}
	};
};
