<script lang="ts">
	import KitSection from './KitSection.svelte';
	import KitSpecimen from './KitSpecimen.svelte';

	import StatementNotes from '#components/admin/statements/StatementNotes.svelte';
	import TalksAbout from '#components/admin/statements/TalksAbout.svelte';
	import type { Statement, StatementPart, StatementTopic } from '#lib/statements.js';

	// What a review or a post's mention says, as every route serving `statements` shapes it: one
	// claim per statement, its aspect and its food wordings as parts, every label on the parts. The
	// sample covers each group a page must show: praise, complaints with a stated number, a noted
	// fact, a noticed change, a dish the source only listed, a wording linked to no topic yet, a
	// claim about no aspect, and a claim agent B has not read yet.
	const FOOD = { key: 'food', label: 'Food' };
	const PRICE = { key: 'price', label: 'Price' };
	const DONER: StatementTopic = { key: 'döner', label: 'Döner & kebab', kind: 'dish' };
	const aspect = (key: string, label: string, parent?: { key: string; label: string }): StatementPart => ({
		role: 'aspect',
		topic: { key, label, kind: 'aspect', parent }
	});
	const food = (name: string, ...topics: StatementTopic[]): StatementPart => ({
		role: 'food',
		term: { key: name.toLowerCase(), name, topics: topics.map((topic, rank) => ({ rank, topic })) }
	});
	const STATEMENTS: Statement[] = [
		{ id: 1, text: 'The döner was damn good', quote: 'Der Döner war verdammt gut', sentiment: 'positive', kind: 'opinion', parts: [aspect('food_quality', 'Food quality', FOOD), food('döner', DONER)] },
		{ id: 2, text: 'The döner cost 15 euros', sentiment: 'negative', kind: 'opinion', amount: 15, unit: 'money', parts: [aspect('price_level', 'Price level', PRICE), food('döner', DONER)] },
		{ id: 3, text: 'Waited 40 minutes for a table', sentiment: 'negative', kind: 'opinion', amount: 40, unit: 'minutes', parts: [aspect('wait_for_table', 'Wait for a table', { key: 'wait', label: 'Waiting time' })] },
		{ id: 4, text: 'Fries are 10 euros', quote: 'Pommes 10 €', sentiment: 'neutral', kind: 'fact', amount: 10, unit: 'money', parts: [aspect('price_level', 'Price level', PRICE), food('Pommes', { key: 'fries', label: 'Fries', kind: 'dish' })] },
		{ id: 5, text: 'New owner since the summer', sentiment: 'neutral', kind: 'change', parts: [aspect('ownership', 'Ownership', { key: 'other', label: 'Other' })] },
		{ id: 6, text: 'The vegan döner is the better one', sentiment: 'positive', kind: 'opinion', parts: [aspect('food_quality', 'Food quality', FOOD), food('vegan döner')] },
		{ id: 7, text: 'Came on a Tuesday', sentiment: 'neutral', kind: 'fact', parts: [] },
		{ id: 8, sentiment: 'positive', parts: [food('lahmacun', { key: 'lahmacun', label: 'Lahmacun', kind: 'dish' })] },
		{ id: 9, text: 'The ayran comes in a glass bottle now', parts: [] }
	];
</script>

<KitSection
	id="statements"
	title="Statements"
	description="What a review or a post's mention says, one claim per statement, grouped by what it is: praise, complaints, noted facts, noticed changes, then what agent B has not read yet. Every label comes from the statement's parts; the frontend holds no copy of the vocabulary.">
	<KitSpecimen
		label="StatementNotes"
		note="#components/admin/statements/StatementNotes.svelte — a post's page, under each mention. A wording links to its first dish or drink topic; one with no topic yet is plain."
		ground="paper"
		wide
		stack>
		<StatementNotes statements={STATEMENTS} cityId="city" month="2026-09" />
	</KitSpecimen>

	<KitSpecimen label="StatementNotes · nothing yet" note="A review before it is analysed, or a mention the post says nothing in particular about" ground="paper" stack>
		<StatementNotes statements={[]} />
	</KitSpecimen>

	<KitSpecimen label="StatementNotes · not read yet" note="Claims agent A kept that agent B has not read: no sentiment, aspect or foods" ground="paper" stack>
		<StatementNotes statements={STATEMENTS.filter((s) => s.id === 9)} />
	</KitSpecimen>

	<KitSpecimen
		label="TalksAbout"
		note="#components/admin/statements/TalksAbout.svelte — the aspects of its complaints, then of its praise, each once, then its foods. Noted facts and unread claims raise no chip."
		ground="paper"
		stack>
		<TalksAbout statements={STATEMENTS} cityId="city" month="2026-09" />
	</KitSpecimen>

	<KitSpecimen label="TalksAbout · compact" note="The “Talks about” column of a brand's and a branch's Reviews tabs: no label" ground="paper" stack>
		<TalksAbout statements={STATEMENTS} cityId="city" month="2026-09" compact />
	</KitSpecimen>
</KitSection>
