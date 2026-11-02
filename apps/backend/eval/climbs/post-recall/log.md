# Goal: post:claims.recall (agent A on posts and articles, gpt-5.4-mini)

Guardrails: every other post metric, compared on the test side (`compare --split test`), 99% bootstrap and
twice the noise gap. Noise pair: `mini-base` / `mini-base-2` (the prompts before round 1). Answer key ruled
on the test side (`adjudicate --label mini-base --apply`, 2026-11-01: 1,149 agent errors, 225 both fine,
18 reference errors, $4.50).

| Round | Run | Change | Goal (test) | Guardrails | Kept |
|---|---|---|---|---|---|
| 0 | mini-base | — | 68.6 | — | base |
| 1 | mini-v1 | Agent B: praise in posts is positive, an aspect for nearly every claim, food spellings from the source's quotes; agents A: idioms by meaning | ±0 | none moved (review kind +4 on all cases, train-heavy) | yes: harmless clarifications |
| 2 | mini-v2 | Long posts (> 2,000 chars) read in parts: places first, then ~1,500-char parts with the place list (`readPostClaims`) | 69.1 → 87.6 (+18.5, must pass ±12) | `claims.subject` −5.4 on all cases: a part that goes on about a place without naming it files its claims under none | yes, with round 3 |
| 3 | mini-v3 | Each part also gets the end of the part before, for which place it goes on about | against round 1: 69.1 → 76.7 test (+7.6, ±5.4); 72.2 → 80.3 all (+8.1, ±4.1); long posts 62.1 → 77.2 | none worse; `claims.subject` back (81.2 → 88.4 all), places found 82.2 → 89.1 | yes |

Notes: round 2's 87.6 on the test side was a lucky run: the test side has few long articles and they swing a
run by ~10 points; round 3 against round 1 is the honest gain. `compare --noise` now takes the noise pair
(two runs of the same prompts), not one run measured against whatever the base is.
