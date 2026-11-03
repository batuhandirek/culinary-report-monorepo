# Ingestion eval: terms-sonnet

2026-11-03 15:09 UTC · 0 reviews, 0 posts, 500 wordings · 371 cases left out (no reference or no output)
Tokens: 3,839,121 (3,725,370 input tokens from the prompt cache)
Models: term-topic: anthropic/claude-sonnet-5-5 (500)

## Wordings

| Metric | terms-sonnet | stored | terms-haiku | one-v2 | mini-v6b |
|---|---|---|---|---|---|
| Wording: topics exactly right | 89% (292/328) | 100% -11 | 85% +4 | — | — |
| Wording: topics right (of produced) | 99% (365/368) | 100% -1 | 98% +1 | — | — |
| Wording: topics found | 91% (347/382) | 100% -9 | 88% +3 | — | — |
| Wording: first topic | 94% (309/328) | 100% -6 | 91% +3 | — | — |
| Wording: relation | 89% (310/347) | 100% -11 | 92% -3 | — | — |
| Wording: none when none | 94% (161/172) | — | 94% ±0 | — | — |
| Wording: linked when it should be | 95% (310/328) | 100% -5 | 92% +2 | — | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Wordings

| Metric | terms-sonnet (train) | terms-sonnet (test) | terms-haiku (test) | one-v2 (test) | mini-v6b (test) |
|---|---|---|---|---|---|
| Wording: topics exactly right | 91% | 85% (80/94) | 80% +5 | — | — |
| Wording: topics right (of produced) | 99% | 100% (101/101) | 100% ±0 | — | — |
| Wording: topics found | 93% | 87% (98/113) | 81% +5 | — | — |
| Wording: first topic | 96% | 90% (85/94) | 86% +4 | — | — |
| Wording: relation | 90% | 88% (86/98) | 92% -5 | — | — |
| Wording: none when none | 94% | 92% (48/52) | 98% -6 | — | — |
| Wording: linked when it should be | 96% | 90% (85/94) | 89% +1 | — | — |

## Misses

### terms.topics (36)

- `term-10329` meat alternative: [vegetarian:with] ≠ [none]
- `term-10347` German taste: [taste:kind_of, german:with] ≠ [german:same]
- `term-1146` meat substitute: [vegetarian:with] ≠ [none]
- `term-1293` Miyazaki Wagyu A5: [steakhouse:kind_of] ≠ [none]
- `term-1330` Heaven and Earth: [german:kind_of] ≠ [none]
- `term-13669` flavors and textures: [taste:same] ≠ [taste:same, cooking:same]
- `term-144` gemuse kebab: [kebab:kind_of, vegetarian:with] ≠ [kebab:kind_of]
- `term-14904` seafood boil buldak ramen: [noodles:kind_of] ≠ [ramen:kind_of, seafood:with]
- `term-16455` kıymalı pide: [turkish:kind_of] ≠ [none]
- `term-1692` coleslaw: [salads:kind_of] ≠ [none]
- `term-22168` unique food experiences: [food:kind_of] ≠ [none]
- `term-2967` Kritharoto Thalassa: [seafood:with, greek:kind_of] ≠ [pasta:kind_of, seafood:with]
- `term-35404` butter squishies: [dessert:kind_of] ≠ [none]
- `term-3716` eggplant parmigiana: [italian:kind_of] ≠ [none]
- `term-37729` curry show rice and peas: [curry:kind_of, jamaican:kind_of] ≠ [curry:kind_of]
- `term-38289` tono pizza: [pizza:kind_of, seafood:with] ≠ [pizza:kind_of]
- `term-449` chicken fries: [fried chicken:kind_of] ≠ [fries:kind_of, chicken:with]
- `term-4557` Lachs Bagel: [bagels:kind_of, seafood:with] ≠ [bagels:kind_of]
- `term-4713` Chicken Tenders: [fried chicken:kind_of, chicken:kind_of] ≠ [fried chicken:kind_of]
- `term-4759` frozen yogurt: [dessert:kind_of] ≠ [ice cream:kind_of]
- `term-4788` Korean Fried Chicken: [fried chicken:kind_of, chicken:kind_of, korean:kind_of] ≠ [fried chicken:kind_of, korean:with]
- `term-4830` Sashimi: [seafood:kind_of, japanese:kind_of] ≠ [seafood:kind_of]
- `term-5092` kebab (characteristically seasoned): [kebab:same] ≠ [kebab:same, seasoning:with]
- `term-541` ayran: [turkish:kind_of] ≠ [none]
- `term-55` momo: [dumplings:kind_of, nepalese:kind_of] ≠ [dumplings:kind_of]
- `term-5595` Bistecca Fiorentina: [steakhouse:kind_of, italian:kind_of] ≠ [steakhouse:kind_of]
- `term-7015` spicy tuna roll: [sushi:kind_of, seafood:with] ≠ [sushi:kind_of]
- `term-783` Königsberger Klopse: [german:kind_of] ≠ [none]
- `term-802` kimchi: [korean:kind_of] ≠ [none]
- `term-806` Köfte: [turkish:kind_of] ≠ [none]
- `term-8226` kothu parotta: [sri lankan:kind_of] ≠ [south indian:kind_of]
- `term-834` Peking duck: [chinese:kind_of] ≠ [none]
- `term-841` pork knuckle: [german:kind_of] ≠ [none]
- `term-851` rolls: [bread:kind_of] ≠ [none]
- `term-879` tzatziki: [greek:kind_of] ≠ [none]
- `term-920` Taramas: [greek:kind_of, seafood:with] ≠ [none]

### terms.none (11)

- `term-2129` Com gia dinh: none ≠ vietnamese
- `term-2357` hot dog: none ≠ sausages
- `term-2621` Samowar set for two: none ≠ tea
- `term-35217` cookie roast: none ≠ cookies
- `term-45655` sushi set: none ≠ sushi
- `term-4934` dish with layers of tender dough, juicy minced meat and creamy garlic yogurt: none ≠ dumplings
- `term-5723` vegan Thanksgiving plate: none ≠ vegan
- `term-7696` music: none ≠ vibe
- `term-79` sweets: none ≠ dessert
- `term-832` patty: none ≠ burgers
- `term-898` wrap: none ≠ sandwiches
