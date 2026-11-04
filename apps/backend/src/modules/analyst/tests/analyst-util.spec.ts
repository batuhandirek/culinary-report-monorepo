import { describe, expect, it } from '@jest/globals';

import { answerContent, historyMessages } from '../util/history.js';
import { mentionToken, parseMentions } from '../util/mentions.js';
import { checkSql } from '../util/sql-guard.js';

describe('the analyst’s SQL guard', () => {
	it('lets one read statement through, its trailing semicolon dropped', () => {
		expect(checkSql('select 1;')).toEqual({ ok: true, sql: 'select 1' });
		expect(checkSql('WITH x AS (SELECT 1) SELECT * FROM x').ok).toBe(true);
		expect(checkSql("select '{\"a\":1}'::jsonb ? 'a'").ok).toBe(true);
	});

	it('refuses writes, several statements and anything not a read', () => {
		expect(checkSql('delete from venues')).toMatchObject({ ok: false });
		expect(
			checkSql('with x as (delete from venues returning 1) select * from x'),
		).toMatchObject({
			ok: false,
			error: expect.stringContaining('DELETE'),
		});
		expect(checkSql('select 1; select 2')).toMatchObject({
			ok: false,
			error: expect.stringContaining('One statement'),
		});
		expect(checkSql('select * into copy_of_venues from venues')).toMatchObject({ ok: false });
		expect(checkSql('explain select 1')).toMatchObject({ ok: false });
		expect(checkSql('   ')).toMatchObject({ ok: false });
	});

	it('refuses people’s tables, the queue’s schema and the server’s functions, quoted or not', () => {
		expect(checkSql('select email from users')).toMatchObject({
			ok: false,
			error: expect.stringContaining('"users"'),
		});
		expect(checkSql('select * from public."user_sessions"')).toMatchObject({ ok: false });
		expect(checkSql('select * from pgboss.job')).toMatchObject({ ok: false });
		expect(checkSql("select pg_read_file('/etc/passwd')")).toMatchObject({ ok: false });
		expect(checkSql('select pg_sleep (5)')).toMatchObject({ ok: false });
		expect(checkSql('select rolpassword from pg_authid')).toMatchObject({ ok: false });
	});

	it('is not fooled by a quoted function name or an escaped quote', () => {
		expect(checkSql('select "pg_terminate_backend"(1)')).toMatchObject({ ok: false });
		expect(checkSql('select pg_catalog."pg_sleep" (1)')).toMatchObject({ ok: false });
		// Postgres reads E'\'' as one string: what follows is code, a second statement here
		expect(checkSql("select E'\\'' ; delete from venues --'")).toMatchObject({ ok: false });
		expect(checkSql("select E'it\\'s fine' as t").ok).toBe(true);
	});

	it('reads words in strings and comments as text, never as statements or tables', () => {
		expect(
			checkSql(
				"select count(*) from statements where text ilike '%we drop by; users love it%'",
			).ok,
		).toBe(true);
		expect(checkSql('select 1 -- delete from users\n').ok).toBe(true);
		expect(checkSql('select 1 /* ; insert */').ok).toBe(true);
		expect(checkSql('select $$delete; users$$ as t').ok).toBe(true);
		// Words inside other words are not words
		expect(checkSql('select updated_at, created_at from venues').ok).toBe(true);
	});
});

describe('mentions in a question', () => {
	it('reads each `@Type:ref` once, in order, aliases folded, unknown types left as text', () => {
		const text =
			'How does @Venue:3f1c2a9e-0000-4000-8000-000000000001 do on @Aspect:wait_for_food- and @aspect:wait_for_food, vs @Brand:3f1c2a9e-0000-4000-8000-000000000002? @Someone:x @Food:ramen';
		expect(parseMentions(text).map(({ type, ref }) => `${type}:${ref}`)).toEqual([
			'venue:3f1c2a9e-0000-4000-8000-000000000001',
			'aspect:wait_for_food',
			'brand:3f1c2a9e-0000-4000-8000-000000000002',
			'topic:ramen',
		]);
	});

	it('writes the token the composer inserts', () => {
		expect(mentionToken('aspect', 'wait')).toBe('@Aspect:wait');
	});
});

describe('the thread as the model reads it', () => {
	const question = (text: string) => ({
		fromAnalyst: false,
		status: 'done',
		parts: [{ type: 'text' as const, text }],
	});

	it('gives earlier answers with their queries, and the date and cities with the new question', () => {
		const messages = historyMessages(
			[
				question('How many reviews?'),
				{
					fromAnalyst: true,
					status: 'done',
					parts: [
						{
							type: 'query',
							purpose: 'count reviews',
							sql: 'select count(*) from reviews',
							show: false,
							rowCount: 1,
						},
						{ type: 'text', text: 'There are 12.' },
					],
				},
				question('And last month?'),
			],
			{ today: '2026-11-03', cities: 'Berlin (x)' },
		);
		expect(messages.map(m => m.role)).toEqual(['user', 'assistant', 'user']);
		expect(messages[1].content).toContain('There are 12.');
		expect(messages[1].content).toContain('select count(*) from reviews');
		expect(messages[2].content).toContain('And last month?');
		expect(messages[2].content).toContain('Today is 2026-11-03');
	});

	it('folds questions an unfinished answer left in a row, and never starts on an answer', () => {
		const messages = historyMessages(
			[
				{ fromAnalyst: true, status: 'done', parts: [{ type: 'text', text: 'old' }] },
				question('First?'),
				{ fromAnalyst: true, status: 'running', parts: [] },
				question('Second?'),
			],
			{ today: '2026-11-03', cities: '' },
		);
		expect(messages).toHaveLength(1);
		expect(messages[0].content).toContain('First?');
		expect(messages[0].content).toContain('Second?');
	});

	it('says when an answer failed', () => {
		expect(
			answerContent('failed', [{ type: 'error', message: 'No model could answer' }]),
		).toContain('This answer failed: No model could answer');
	});
});
