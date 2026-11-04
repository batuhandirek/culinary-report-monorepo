import showdown from 'showdown';

const converter = new showdown.Converter({
	tables: true,
	strikethrough: true,
	simpleLineBreaks: false,
	openLinksInNewWindow: true,
	noHeaderId: true,
	literalMidWordUnderscores: true
});

const ALLOWED = new Set([
	'P', 'BR', 'HR', 'STRONG', 'B', 'EM', 'I', 'DEL', 'CODE', 'PRE', 'BLOCKQUOTE',
	'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
	'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'A'
]);

/** Keeps the allowed tags (their text when not), and of attributes only a link's http(s) target */
const clean = (node: Element) => {
	for (const child of [...node.children]) {
		clean(child);
		if (!ALLOWED.has(child.tagName)) {
			child.replaceWith(...child.childNodes);
			continue;
		}
		const href = child.tagName === 'A' ? child.getAttribute('href') : null;
		for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
		if (href && /^https?:\/\//i.test(href)) {
			child.setAttribute('href', href);
			child.setAttribute('target', '_blank');
			child.setAttribute('rel', 'noopener noreferrer');
		}
	}
};

/**
 * Markdown written by a model (the analyst's answers) as safe HTML: showdown's output with every
 * tag outside a small list unwrapped and every attribute dropped but a link's http(s) target, so
 * text the model echoes from a review or a post can never run. Browser only (DOMParser).
 */
export const markdownHtml = (markdown: string): string => {
	const html = converter.makeHtml(markdown);
	const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
	const root = doc.body.firstElementChild;
	if (!root) return '';
	clean(root);
	return root.innerHTML;
};
