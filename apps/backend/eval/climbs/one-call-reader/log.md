# One-call reader (gpt-5.4) against A + B (mini)

Task: `one-call-reader`. A review or a post read with one call on gpt-5.4 (`ReviewReaderAgent`,
`PostReaderAgent`): agent A's claims and agent B's parts of each together, rules composed from A's and B's
`rulesFor`, coaching from both. Same inputs as production (`reviewClaimsInput`; `readPostClaims` with
`postClaimsPlan`'s split, the city in the message), parts through `claimPartsOf`; matching and agent C
unchanged.

- Base: `one-v2` (A + B on mini, production today). Noise: `mini-v6` / `mini-v6b`. Ceiling: `second-gpt54`
  (gpt-5.4 on the reference task, 109 test cases, reference input).
- Ship rule: no metric worse beyond noise, and the post metrics better.
- Command: `npm run eval -- run --label <run> --kind review,post --reader one-call --model openai/gpt-5.4`,
  then `npm run eval -- compare --label <run> --base one-v2 --noise mini-v6,mini-v6b`.
- Free only: OpenAI's gpt-5.4 allowance (1M a day per account, two accounts). A run stops when it is out and
  goes on the next day (cases with no answer are read again on the next run of the label).

## Instruction size (measured from `dist`, 2026-11-03, ~4 characters a token)

| | characters | ~tokens |
|---|---|---|
| A, reviews (rules + coaching) | 3,387 | 850 |
| A, posts (Berlin, with topic labels) | 6,399 | 1,600 |
| B (with the aspect legend) | 11,907 | 2,980 |
| Review reader | 16,407 | 4,100 |
| Post reader | 19,553 | 4,890 |

Fixed for every call (no city, brand or place; the legend and topic labels are the same for every source),
so OpenAI can cache them. Plus the output schema. Before measuring: ~5k tokens a review, ~7k a short post,
~15–25k a long one (1 + its parts calls, each with the instructions): ~3M a run of 371 cases.

## Tokens per source, before

| Run | Reader | per review | per post | of which cached |
|---|---|---|---|---|
| `one-v2` | A + B, mini | 25,852 | 58,489 (with matching) | 78% / 76% |
| `second-gpt54` | reference task, gpt-5.4 | 3,866 | 9,597 (no split) | 0 |

## Runs

| Date | Run | Cases | gpt-5.4 tokens | per review | per post (reader) | Note |
|---|---|---|---|---|---|---|
| 2026-11-03 | — | — | — | — | — | Both accounts already out of the gpt-5.4 allowance at 13:06 local; runs start after 00:00 UTC |
