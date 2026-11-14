import type { Rel } from '@mikro-orm/core';
import { Entity, Index, ManyToOne, Property, Unique } from '@mikro-orm/decorators/legacy';

import { MenuItem } from 'src/modules/venues/entities/menu-item.entity.js';
import { MikroOrmSimpleEntityAbstractClass } from 'src/shared/abstractions/mikro-orm-simple-entity.abstract-class.js';

import type { MenuTermMethod } from '../util/menu-terms.js';

import { Term } from './term.entity.js';

/**
 * A wording that means this menu item at its venue's brand: reviews and posts about the brand that
 * say "banging bangkok burger" are about its "Banging Bangkok". A wording is global and a menu is
 * one brand's, so the link is per item: the claims naming an item are joined through it at read
 * time (claim → food part → term → this row → item, the claim's brand the item's venue's), never
 * copied, so a claim's re-match or a brand merge moves them with no row rewritten.
 *
 * Written by `MenuTermService` only, in code (`matchMenuItem`): the wordings the brand's claims
 * name against its venues' menus, `method` saying how sure the match is.
 */
@Entity({ tableName: 'menu_item_terms' })
@Unique({ properties: ['menuItem', 'term'] })
@Index({ properties: ['term'] })
export class MenuItemTerm extends MikroOrmSimpleEntityAbstractClass {
	@ManyToOne({ entity: () => MenuItem, deleteRule: 'cascade' })
	menuItem: Rel<MenuItem>;

	@ManyToOne({ entity: () => Term, deleteRule: 'cascade' })
	term: Rel<Term>;

	// How the wording was matched to the item: `exact` (the same key), `contains` (the wording
	// holds the item's name) or `similar` (a close spelling)
	@Property({ type: 'text' })
	method: MenuTermMethod;
}
