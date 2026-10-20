// A found icon is fetched again after this many days, so a redesigned site gets its new one
export const FAVICON_REFRESH_DAYS = 30;
// A venue with a website but no icon yet is tried again sooner: the site may have been down
export const FAVICON_RETRY_DAYS = 7;
// Venues per hourly run: every site costs up to a page and a few icon fetches of 10 s each
export const FAVICON_BATCH = 40;
export const FAVICON_CONCURRENCY = 4;
// Icon URLs tried per venue after the page's own links are ranked; the conventional
// `/favicon.ico` and Google's copy come after them
export const FAVICON_MAX_LINKS = 3;
// ImageKit folder (prefixed per environment by `ImageService`)
export const FAVICON_IMAGE_FOLDER = 'venue-favicons';
// The same icon on this many different website hosts is a platform's default (WordPress, Wix,
// a site builder), not the venue's own
export const GENERIC_FAVICON_HOSTS = 3;
