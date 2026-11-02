# Rounds across the pipeline (gpt-5.4-mini), after post-recall

Base for each round: the best so far (`mini-r3` = round 1's reviews + round 3's posts). Noise: two runs of the
same prompts (`mini-base` / `mini-base-2` before round 6, `mini-v6` / `mini-v6b` after). Compared on the test
side and on all cases; guardrails at 99% bootstrap and twice the noise gap.

Ceiling for reference: gpt-5.4 reading the held-back cases from the same rules as Opus (`second-gpt54`), i.e.
how far two strong readers agree: reviews topic 84%, sentiment 99%; posts topic 79%, sentiment 96%,
promotional 69% (an undefined rule, see `promotional-flag-definition`).

Analysis: four read-only analyst agents read the train-side misses of `mini-v3` / `mini-v1` (agent B on posts,
agent A on posts, matching, reviews) and proposed changes; the scorer artifacts they found were fixed first.

| Round | Run | Change | Result (vs `mini-r3`) | Kept |
|---|---|---|---|---|
| scorer | — | quotes in the claim pairing and long cases paired alone (`links-3-quotes`); a split claim's parts on its best fragment; foods matched when one wording is inside the other (`sameFood`); place names compared without the city's words, or as one when matched to the same brand; an unread claim's aspect not scored | all runs re-scored; noise pair still within threshold | yes |
| 4 | mini-v4 | B coaching (foods from the quote, every food, general words in any language; `other` is not none; music is atmosphere); `claimPartsOf` guards (bare `other` → none, a judging fact → opinion); matching (`hintElsewhere` veto, 8 candidates, a chain's branch-none drops the match); A on posts: extras coaching, `Posted by` line, promotional flag from the first pass | post aspect +10, post and review foods recall +11/+12; but post claims found 85 → 81, places real 92 → 86 | B and matching yes; A's extras coaching no |
| 5 | mini-v5 | round 4 without A's extras coaching | claims found back within noise; places real 92 → 89 (worse): the `Posted by` line made A list venues posting from unlinked accounts, which the references never saw | `Posted by` no (moved to the promotional decision task) |
| 6 | mini-v6 (+ mini-v6b) | round 5 without `Posted by` | post aspect 63 → 74, post foods recall 63 → 76, review foods recall 67 → 78; nothing worse. Against `mini-base`: 7 metrics better (review foods both ways, review kind 87 → 93, post aspect 61 → 74, post foods both ways, places found 81 → 90), none worse | yes: the state now |

Watch: post `change.precision` 56 → 38–40 (few changes, within the threshold); post `claims.precision` 92 → 88
(more claims read, some extras).

## After round 6 (2026-11-01 evening)

Scorer: the reference's kinds read through the stored rule (a fact it lets judge accepts opinion; post kind
83 → 86 on `mini-v6` with no run); place names heading each other (`namesSameHead`) pair.

A reviewer agent read the day's production changes; fixed:
- `hintElsewhere` removed the right brand when a hint named a square or a street near the branch ("near
  Rosenthaler Platz" for Torstraße): it now only keeps a sure name from being accepted in code; the LLM decides.
- `splitText` joined every piece with a blank line (a transcript became one line a paragraph, the "end of the
  part before" one line): pieces are joined with what they were split at; the context is the part's last 400
  characters.
- A split post repeated its other field in full in every part (its claims read twice): each field is cut on its
  own and read once; the other field is shown as marked context.
- A chain answered by a branch's id was dropped; a hint that is only the city's name asked a needless question.
- `mergePostParts` let any part flag a known place as a new opening; the first pass decides now.
- `other` was logged as an aspect key the table lacks on every batch.

Round 7 (pending, the gpt-mini allowance ran out at 16:55): B coaching on praise others gave (scores, stars,
guide picks) and on words that only sound like change; A coaching on a claim's subject (a visit's dishes are
the place's); the merge treating "Bahadur" and "Bahadur – Tandoori Grill" as one place; the bug fixes above.
Run as `mini-v7` against `mini-v6`, noise `mini-v6,mini-v6b`.
