# Aspect at the leaf: agent B files at a root when a finer aspect covers the claim

Goal: `post:parts.aspect` (exact aspect on posts; one-v2 70%, review 82%) up, by B taking the finest aspect whose hint
covers a claim instead of the root (task `claim-parts-root-misfiling`). Guardrails: every other metric, in particular
`parts.aspect_root` (a wrong leaf under the right root is no gain) and `parts.sentiment`, not worse.

Why: aspect discovery's dry run on dev Berlin (2026-11-03) found ~260 of 12,000 sampled loose claims that an existing
aspect covers, read fresh on 2026-11-02 with the hints in the legend: stated prices → `price_level` ~180, vegan / halal
→ `dietary` 68, buffet / sauces → `menu_variety` 51, "made with love" → `authenticity` 24, bun texture → `cooking` 14.
The hints already say so (`price`: "a price stated for a dish is price level"), so the change is coaching, not rules:
no reference goes stale.

## Plan (needs gpt-5.4-mini: blocked on 2026-11-03, both OpenAI accounts "no credits remaining")

1. Base and noise, unchanged prompts (the aspects changed since `mini-v6`, so the old runs are no base):
   `npm run eval -- run --label leaf-r0` and `npm run eval -- run --label leaf-r0b`.
2. Round 1: `git apply apps/backend/eval/climbs/aspect-at-leaf/r1.patch` (coaching: the finest aspect first; stated
   prices, diets, menu range, homemade, texture each named with made-up examples), then
   `npm run eval -- run --label leaf-r1` and
   `npm run eval -- compare --label leaf-r1 --base leaf-r0 --noise leaf-r0,leaf-r0b --goal post:parts.aspect`.
3. Keep it when the goal is better and nothing worse; else `git apply -R` the patch. Then clear `parts_at` on the
   root-filed claims so the nightly `statement-parts` backlog re-reads them (free on the allowance).

| Round | Run | Change | Result (vs `leaf-r0`) | Kept |
|---|---|---|---|---|
| 1 | leaf-r1 | `r1.patch` | not run yet | — |
