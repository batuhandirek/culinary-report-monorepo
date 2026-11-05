# Claims and labels apart: a stronger agent A, a decision model for the labels

Task: `stronger-claims-and-label-classifier`. Labels (sentiment, aspect, kind) and claims are measured apart, then
together. Labels on the reference's own claims (`--claims reference`): no agent A, no pairing.

## Runs

| Date | Run | What | Cost |
|---|---|---|---|
| 2026-11-05 | `labels-jev` | `ClaimLabelsClassifier` on `typesafe-ai/jev-latest`, every case's reference claims (4,010 claims, 369 cases) | 16.9M tokens, $0.60 (~4.2k tokens, $0.00015 a claim) |

## `labels-jev` against B on mini (`one-v2`, A's claims paired with the reference's: not the same claims) and gpt-5.4 (`second-gpt54`, its own claims)

| Metric | Jev reviews | B mini reviews | gpt-5.4 reviews | Jev posts | B mini posts | gpt-5.4 posts |
|---|---|---|---|---|---|---|
| Sentiment | 98% | 93% | 99% | 97% | 89% | 96% |
| Aspect, exact | 93% | 82% | 84% | 87% | 70% | 79% |
| Aspect, right root | 96% | 91% | 87% | 92% | 86% | 87% |
| Kind | 98% | 95% | 98% | 94% | 87% | 93% |
| Changes that are changes | 76% (13/17) | 55% | 67% | 50% (47/94) | 41% | 57% |
| Changes found | 81% | 81% | 100% | 94% | 66% | 50% |
| Amount (parsed in code) | 72% | 73% | 87% | 84% | 71% | 56% |

Sure answers (p ≥ 0.9): sentiment 73% / 67% of answers, right 100% / 100%; aspect 49% / 40%, right 99% / 98%;
kind 73% / 60%, right 99% / 98% (reviews / posts).

Caveat: Jev read the reference's own wording, B read agent A's. The fair base is B on the same claims (`labels-b`:
free on mini once OpenAI serves again; or `--parts-model anthropic/claude-haiku-5-5 --paid`, under $1).

## 2026-11-05: both designs on Sonnet 5.5, held-back cases (`--split test`: 51 reviews, 58 posts)

| Run | What | Tokens |
|---|---|---|
| `sq-sonnet` | A + B on Sonnet 5.5 (today's design on a strong model) | 7.37M (6.49M from cache) |
| `new-sonnet` | A on Sonnet 5.5 naming foods, Jev labels (`--labeller classifier`) | 6.25M (Jev ~4.3M of it, $0.18) |

Both ~$10 together (estimated from tokens); matching and pairing moved to Haiku (OpenAI out of credit).

| Test side | sq-sonnet | new-sonnet | one-v2 (A + B mini) |
|---|---|---|---|
| Post claims found / real | 93 / 94 | 94 / 95 | 90 / 85 |
| Post subject | 97 | 96 | 91 |
| Post places found / real | 92 / 91 | 92 / 92 | 90 / 85 |
| Post brand match | 89 | 91 | 90 |
| Aspect exact rev / post | 93 / 86 | 91 / 82 | 79 / 67 |
| Sentiment rev / post | 97 / 96 | 97 / 95 | 93 / 89 |
| Kind rev / post | 97 / 94 | 97 / 92 | 96 / 86 |
| Foods recall rev / post | 88 / 96 | 91 / 94 | 82 / 85 |
| Amount rev / post | 93 / 81 | 64 / 79 | 82 / 64 |
| Post changes that are changes / found | 68 / 90 | 53 / 100 | 34 / 70 |

Read: a stronger A is worth it (post precision +10, subject +6); Jev is within noise of B on Sonnet on the labels at a
thirtieth of its cost; A's foods hold up. The gap is amounts: Jev answers no number and `parseAmount` alone gives 64%
on reviews; next, agent A writes each claim's amount and unit as it does its foods.

## 2026-11-05: aspect shortlist for Jev (`labels-jev-k8`, `--aspect-shortlist 8`, reference claims)

Half the cost ($0.30 against $0.60; 8.0M tokens against 16.9M), but aspect exact 92.7 → 89.6 (reviews) and
86.8 → 81.7 (posts); right root 96.2 → 95.5 and 92.4 → 90.7; sentiment and kind unchanged. The reference's aspect
was among the offered 97.9% / 95.0% of the time, so most of the loss is aspects never offered. Not worth ~$11 a
month at 8; a wider list (12–16) may keep the accuracy at a smaller saving.

## 2026-11-05: the new agent A (foods and amounts copied out) on four models, Jev labels, held-back cases

| Test side | one-v2 (A + B mini) | A mini | A Haiku 5.5 | A gpt-5.4 | A Sonnet 5.5 | sq-sonnet (A + B Sonnet) |
|---|---|---|---|---|---|---|
| Review claims found | 97 | 95 | 99 | 99 | 100 | 100 |
| Review aspect exact | 79 | 88 | 92 | 91 | 89 | 93 |
| Review amount | 82 | 61 | 75 | 88 | 100 | 93 |
| Review foods precision / recall | 76 / 82 | 91 / 94 | 93 / 91 | 89 / 91 | 89 / 90 | 86 / 88 |
| Post claims found / real | 90 / 85 | 81 / 89 | 88 / 90 | 92 / 88 | 94 / 93 | 93 / 94 |
| Post aspect exact | 67 | 78 | 81 | 83 | 80 | 86 |
| Post amount | 64 | 55 | 80 | 43 | 76 | 81 |
| Post changes that are changes / found | 34 / 70 | 39 / 90 | 23 / 70 | 41 / 60 | 40 / 80 | 68 / 90 |
| Post subject / claim's place | 91 / 89 | 91 / 88 | 92 / 97 | 93 / 93 | 96 / 88 | 97 / 86 |
| Post places found / real | 90 / 85 | 86 / 83 | 89 / 92 | 90 / 88 | 91 / 88 | 92 / 91 |
| Post brand match | 90 | 94 | 91 | 99 | 93 | 89 |

Agent A's tokens a source (mean / median): mini 2.0k / 1.9k a review, 8.1k / 4.0k a post; gpt-5.4 2.0k / 1.9k,
8.5k / 4.2k; Haiku 4.0k / 3.9k, 18.0k / 8.6k; Sonnet 3.3k / 3.2k, 15.2k / 7.4k (Claude's tokenizer counts more).

Read: A + Jev beats today's A + B on mini on every label, on any model. Mini cannot carry the new A on posts
(claims found 90 → 81 with foods and amounts to copy too); gpt-5.4 and Sonnet can. Weak spots left: post changes
(Jev's change label 23–41% right against B on Sonnet's 68%) and amounts on posts, both on few claims.
