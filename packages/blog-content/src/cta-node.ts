import { mergeAttributes, Node } from '@tiptap/core';

export type BlogCtaVariant = 'primary' | 'secondary';

export interface BlogCtaAttrs {
	title: string;
	description: string;
	label: string;
	href: string;
	variant: BlogCtaVariant;
}

/**
 * A "call to action" block: a titled button/link that authors drop into an article.
 *
 * It's an atom block node, so its data lives entirely in `attrs` (nothing editable inside it).
 * The SAME node definition is used by the editor (frontend) and the server-side HTML renderer,
 * so the CTA looks identical in both. Attributes are mirrored onto `data-*` on the root element
 * so the node also survives an HTML → JSON round-trip; the visible structure (title + anchor)
 * is what the public page shows via `{@html}`.
 */
export const BlogCtaNode = Node.create({
	name: 'cta',
	group: 'block',
	atom: true,
	draggable: true,
	selectable: true,

	addAttributes() {
		return {
			title: {
				default: '',
				parseHTML: (el: HTMLElement) => el.getAttribute('data-title') ?? '',
				renderHTML: (attrs: Record<string, unknown>) =>
					attrs.title ? { 'data-title': attrs.title as string } : {},
			},
			description: {
				default: '',
				parseHTML: (el: HTMLElement) => el.getAttribute('data-description') ?? '',
				renderHTML: (attrs: Record<string, unknown>) =>
					attrs.description ? { 'data-description': attrs.description as string } : {},
			},
			label: {
				default: 'Learn more',
				parseHTML: (el: HTMLElement) => el.getAttribute('data-label') ?? 'Learn more',
				renderHTML: (attrs: Record<string, unknown>) => ({ 'data-label': attrs.label as string }),
			},
			href: {
				default: '',
				parseHTML: (el: HTMLElement) => el.getAttribute('data-href') ?? '',
				renderHTML: (attrs: Record<string, unknown>) => ({ 'data-href': attrs.href as string }),
			},
			variant: {
				default: 'primary',
				parseHTML: (el: HTMLElement) =>
					(el.getAttribute('data-variant') as BlogCtaVariant) ?? 'primary',
				renderHTML: (attrs: Record<string, unknown>) => ({
					'data-variant': attrs.variant as string,
				}),
			},
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-cta]' }];
	},

	renderHTML({ node, HTMLAttributes }) {
		const { title, description, label, href, variant } = node.attrs as BlogCtaAttrs;
		return [
			'div',
			mergeAttributes(HTMLAttributes, {
				'data-cta': '',
				class: `blog-cta blog-cta--${variant || 'primary'}`,
			}),
			...(title ? [['div', { class: 'blog-cta__title' }, title]] : []),
			...(description ? [['div', { class: 'blog-cta__description' }, description]] : []),
			[
				'a',
				{ class: 'blog-cta__button', href: href || '#', target: '_blank', rel: 'noopener' },
				label || 'Learn more',
			],
		];
	},
});
