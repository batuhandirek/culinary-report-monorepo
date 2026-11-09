import type { MentionMatchMethodEnum } from '../../entities/mention.entity.js';
import {
	type MatchAnswer,
	type MentionMatchingService,
	settleMatch,
} from '../../services/mention-matching.service.js';

/**
 * Matching as a city's run does it (`MatchMentionsWorkflow.matchCity`), without the workflow: the
 * code pass, then each close call planned, put to `ask` (the agent's stand-in) and saved, then
 * the saved ones relinked. Every method settled, counted.
 */
export const matchWithAgent = async (
	service: MentionMatchingService,
	ask: (message: string) => Promise<{ object: MatchAnswer }>,
	opts: { cityId?: string; rematch?: boolean } = {},
): Promise<Record<MentionMatchMethodEnum, number>> => {
	const pass = await service.match(opts);
	const counts = { ...pass.counts };
	for (const mentionId of pass.asks) {
		const plan = await service.planMention(mentionId);
		if (!plan) continue;
		const decision =
			'decision' in plan ?
				plan.decision
			:	settleMatch(plan.question, (await ask(plan.question.message)).object);
		const method = await service.saveMatch(mentionId, decision);
		if (method) counts[method]++;
	}
	await service.relinkMatched(pass.asks);
	return counts;
};
