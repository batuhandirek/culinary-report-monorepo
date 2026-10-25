// A found icon is fetched again after this many days, so a redesigned site gets its new one
export const FAVICON_REFRESH_DAYS = 30;
// A venue with a website but no icon yet is tried again sooner: the site may have been down
export const FAVICON_RETRY_DAYS = 7;
// How long one hourly run keeps taking due websites. A website costs up to a page and five
// icon fetches of 10 s each, so one started at the end still finishes inside the job's 30 min
export const FAVICON_RUN_SECONDS = 20 * 60;
// Due venues read at a time; their websites are fetched once each
export const FAVICON_PAGE = 200;
// Websites fetched side by side: each is a different host, so no site sees more than one
export const FAVICON_CONCURRENCY = 8;
// Icon URLs tried per venue after the page's own links are ranked; the conventional
// `/favicon.ico` and Google's copy come after them
export const FAVICON_MAX_LINKS = 3;
// ImageKit folder (prefixed per environment by `ImageService`)
export const FAVICON_IMAGE_FOLDER = 'venue-favicons';
// The same icon on this many different website hosts is a platform's default (WordPress, Wix,
// a site builder), not the venue's own
export const GENERIC_FAVICON_HOSTS = 3;
// Contact, Impressum or about pages read for profile links when the home page has none
export const SITE_CONTACT_PAGES = 2;
