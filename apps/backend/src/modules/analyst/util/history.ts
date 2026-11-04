import type { AnalystMention, AnalystPartData } from 'sdk';

import type { MastraMessage } from 'src/modules/llm/abstractions/base-mastra-agent.abstract.js';

import { ANALYST_HISTORY_MESSAGES } from '../constants/analyst.constant.js';

/** A stored message as the history reads it */
export interface HistoryMessage {
	fromAnalyst: boolean;
	status: string;
	parts: AnalystPartData[];
}

const mentionLines = (mentions: AnalystMention[]): string[] =>
	mentions.map(m =>
		m.found ?
			`- @${m.type}:${m.ref} = ${m.facts ?? m.label}`
		:	`- @${m.type}:${m.ref}: no such ${m.type} (tell the admin)`,
	);

/** A question as the model reads it: the text, then the rows it named */
export const questionContent = (parts: AnalystPartData[]): string => {
	const text = parts
		.filter(p => p.type === 'text')
		.map(p => p.text)
		.join('\n\n');
	const mentions = parts.flatMap(p => (p.type === 'mentions' ? p.mentions : []));
	return mentions.length ? `${text}\n\nReferenced:\n${mentionLines(mentions).join('\n')}` : text;
};

/**
 * An earlier answer as the model reads it: its text, and the queries it ran (purpose, rows, the
 * SQL), so a follow-up can build on them without running them again
 */
export const answerContent = (status: string, parts: AnalystPartData[]): string => {
	const text = parts
		.filter(p => p.type === 'text')
		.map(p => p.text)
		.join('\n\n')
		.trim();
	const queries = parts.flatMap(p => (p.type === 'query' && !p.error ? [p] : []));
	const lines = [text || '(no text)'];
	if (queries.length)
		lines.push(
			`(Queries this answer ran:\n${queries
				.map(
					(q, i) =>
						`${i + 1}. ${q.purpose}: ${q.rowCount ?? 0}${q.truncated ? '+' : ''} rows\n${q.sql}`,
				)
				.join('\n')})`,
		);
	if (status === 'failed') {
		const error = parts.find(p => p.type === 'error');
		lines.push(
			`(This answer failed${error && error.type === 'error' ? `: ${error.message}` : ''}.)`,
		);
	}
	return lines.join('\n\n');
};

/**
 * The model's input: the thread's last messages (an answer only once finished), then the new
 * question with today's date and the cities, which change and so stay out of the instructions
 */
export const historyMessages = (
	history: HistoryMessage[],
	context: { today: string; cities: string },
): MastraMessage[] => {
	const earlier = history.slice(0, -1).slice(-ANALYST_HISTORY_MESSAGES);
	const question = history[history.length - 1];
	const messages: MastraMessage[] = [];
	for (const m of earlier) {
		if (m.fromAnalyst) {
			if (m.status !== 'done' && m.status !== 'failed') continue;
			messages.push({ role: 'assistant', content: answerContent(m.status, m.parts) });
		} else messages.push({ role: 'user', content: questionContent(m.parts) });
	}
	// Two questions in a row (an answer that never finished): Claude wants turns to alternate
	const merged: MastraMessage[] = [];
	for (const m of messages) {
		const last = merged[merged.length - 1];
		if (
			last &&
			last.role === m.role &&
			typeof last.content === 'string' &&
			typeof m.content === 'string'
		)
			last.content = `${last.content}\n\n${m.content}`;
		else merged.push({ ...m } as MastraMessage);
	}
	// The cut may start on an answer; a conversation starts with a question
	while (merged[0]?.role === 'assistant') merged.shift();
	const content = `${question ? questionContent(question.parts) : ''}\n\n(Today is ${context.today}. Cities: ${context.cities}.)`;
	const last = merged[merged.length - 1];
	if (last?.role === 'user' && typeof last.content === 'string')
		last.content = `${last.content}\n\n${content}`;
	else merged.push({ role: 'user', content });
	return merged;
};
