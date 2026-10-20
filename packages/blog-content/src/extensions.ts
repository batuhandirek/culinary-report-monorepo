import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import StarterKit from '@tiptap/starter-kit';
import type { Extensions } from '@tiptap/core';

import { BlogCtaNode } from './cta-node.js';

/**
 * The canonical schema for blog article content. This is the single source of truth shared by
 * the frontend editor (which builds the WYSIWYG on top of it) and the backend renderer (which
 * turns stored JSON into HTML + plain text). Both sides MUST use this exact list, or the HTML the
 * server generates could diverge from what the editor produced.
 *
 * Notes:
 * - Headings start at h2 (h1 is the page title); StarterKit v3 bundles Link.
 * - Strike is disabled to match the previous editor (kept intentional).
 * - `Image` allows base64 so freshly-inserted images stay as data URLs until the backend hosts
 *   them on save.
 * - `TextAlign` is why paragraphs/headings can carry a `textAlign` attr (the reason we moved off
 *   markdown).
 */
export const blogExtensions: Extensions = [
	StarterKit.configure({
		heading: { levels: [2, 3, 4] },
		link: { openOnClick: false, autolink: true },
		strike: false,
	}),
	Image.configure({ allowBase64: true }),
	TextAlign.configure({ types: ['heading', 'paragraph'] }),
	BlogCtaNode,
];
