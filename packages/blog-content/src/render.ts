// `@tiptap/html` resolves per environment via its exports conditions: the ESM `node` condition
// picks a DOM-free server build (backend), the browser condition uses the DOM build (editor live
// preview). The CJS build (swagger harness) only ever *loads* this module, never calls it.
import { generateHTML } from '@tiptap/html';
import type { JSONContent } from '@tiptap/core';

import { blogExtensions } from './extensions.js';

/** A TipTap/ProseMirror document (what the editor produces via `getJSON()`). */
export type BlogDoc = JSONContent;

const EMPTY_DOC: BlogDoc = { type: 'doc', content: [] };

/**
 * Parse the stored stringified-JSON content into a document, tolerating empty/invalid input
 * (returns an empty doc) so callers never have to guard around `JSON.parse`.
 */
export function parseBlogContent(content: string | null | undefined): BlogDoc {
	if (!content) return EMPTY_DOC;
	try {
		const parsed = JSON.parse(content) as BlogDoc;
		return parsed && typeof parsed === 'object' ? parsed : EMPTY_DOC;
	} catch {
		return EMPTY_DOC;
	}
}

/** Render a document to HTML using the shared schema — deterministic, DOM-free, SSR-safe. */
export function renderBlogHtml(doc: BlogDoc): string {
	return generateHTML(doc, blogExtensions);
}

/**
 * Extract plain text from a document for search / reading-time. Walks text nodes and also folds
 * in CTA titles/labels so a CTA's copy is searchable.
 */
export function extractBlogText(doc: BlogDoc): string {
	const parts: string[] = [];
	const walk = (node?: BlogDoc): void => {
		if (!node) return;
		if (node.type === 'text' && node.text) parts.push(node.text);
		if (node.type === 'cta') {
			const attrs = node.attrs ?? {};
			if (attrs.title) parts.push(String(attrs.title));
			if (attrs.description) parts.push(String(attrs.description));
			if (attrs.label) parts.push(String(attrs.label));
		}
		node.content?.forEach(walk);
	};
	walk(doc);
	return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * One-shot: parse stored content and derive the rendered HTML + plain text. Used by the backend
 * on save (persist all three) and by the editor's live preview.
 */
export function deriveBlogContent(content: string | null | undefined): {
	html: string;
	text: string;
} {
	const doc = parseBlogContent(content);
	return { html: renderBlogHtml(doc), text: extractBlogText(doc) };
}
