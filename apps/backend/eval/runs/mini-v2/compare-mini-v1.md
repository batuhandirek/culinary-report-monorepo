# mini-v2 against mini-v1 (all cases tagged size:large)

| Kind | Metric | Base | Candidate | Δ points | Must pass | Verdict | Cases |
|---|---|---|---|---|---|---|---|
| post | claims.recall | 62.1 | 78.1 | +15.9 | ±10.9 | better | 32 |
| post | parts.amount | 73.3 | 48.6 | -24.7 | ±24.0 | worse | 16 |
| post | places.recall | 69.6 | 80.1 | +10.5 | ±9.6 | better | 32 |

Verdict: goal post:claims.recall better; 2 better, 1 worse (post:parts.amount), 18 within the threshold.