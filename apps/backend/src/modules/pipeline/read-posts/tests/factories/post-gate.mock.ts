import type { PostSkipReasonEnum } from 'src/modules/social/entities/social-post.entity.js';
import { mockAgent } from 'src/tests/mock-agent.js';

import type { PostGateInput } from '../../agents/post-gate.agent.js';

/**
 * A mocked gate (`PostGateAgent`) for tests that read or re-read posts: every post is digested
 * unless `skip` gives a reason for it (by what the gate is shown: its start of text, transcript,
 * own brand). Wire it as `{ provide: PostGateAgent, useValue: gateAgent() }`.
 */
export const gateAgent = (
	skip: (post: PostGateInput) => PostSkipReasonEnum | null | undefined = () => null,
) =>
	// One post a call
	mockAgent((input: unknown) => {
		const reason = skip(JSON.parse(input as string) as PostGateInput) ?? null;
		return { digest: !reason, reason };
	});
