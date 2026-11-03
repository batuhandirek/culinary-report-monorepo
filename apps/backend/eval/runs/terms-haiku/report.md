# Ingestion eval: terms-haiku

2026-11-03 14:43 UTC · 0 reviews, 0 posts, 500 wordings · 371 cases left out (no reference or no output)
Tokens: 3,889,772 (3,725,370 input tokens from the prompt cache)
Models: term-topic: anthropic/claude-haiku-5-5 (500)

## Wordings

| Metric | terms-haiku | stored | one-v2 | mini-v6b | mini-v6 |
|---|---|---|---|---|---|
| Wording: topics exactly right | 85% (279/328) | 100% -15 | — | — | — |
| Wording: topics right (of produced) | 98% (352/360) | 100% -2 | — | — | — |
| Wording: topics found | 88% (335/382) | 100% -12 | — | — | — |
| Wording: first topic | 91% (299/328) | 100% -9 | — | — | — |
| Wording: relation | 92% (308/335) | 100% -8 | — | — | — |
| Wording: none when none | 94% (161/172) | — | — | — | — |
| Wording: linked when it should be | 92% (303/328) | 100% -8 | — | — | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Wordings

| Metric | terms-haiku (train) | terms-haiku (test) | one-v2 (test) | mini-v6b (test) | mini-v6 (test) |
|---|---|---|---|---|---|
| Wording: topics exactly right | 87% | 80% (75/94) | — | — | — |
| Wording: topics right (of produced) | 97% | 100% (98/98) | — | — | — |
| Wording: topics found | 90% | 81% (92/113) | — | — | — |
| Wording: first topic | 93% | 86% (81/94) | — | — | — |
| Wording: relation | 92% | 92% (85/92) | — | — | — |
| Wording: none when none | 92% | 98% (51/52) | — | — | — |
| Wording: linked when it should be | 94% | 89% (84/94) | — | — | — |

## Misses

### terms.topics (49)

- `term-10329` meat alternative: [vegetarian:with] ≠ [none]
- `term-10864` 1-liter mugs: [beer:kind_of] ≠ [none]
- `term-1146` meat substitute: [vegetarian:with] ≠ [none]
- `term-1330` Heaven and Earth: [german:kind_of] ≠ [none]
- `term-13669` flavors and textures: [taste:same] ≠ [none]
- `term-14904` seafood boil buldak ramen: [noodles:kind_of] ≠ [ramen:kind_of, seafood:with, chicken:with]
- `term-15548` Jollof Fries: [fries:kind_of, west african:with] ≠ [fries:kind_of]
- `term-16968` Moksal: [korean barbecue:kind_of] ≠ [none]
- `term-173` cheesecake: [cake:kind_of] ≠ [cake:kind_of, dessert:kind_of]
- `term-18243` cuisson d'un kilo: [cooking:kind_of] ≠ [none]
- `term-1834` Panisse mit Trüffelmayonnaise: [fries:kind_of] ≠ [none]
- `term-18531` breakfast offer: [breakfast:same] ≠ [none]
- `term-18825` K Wings: [fried chicken:kind_of, korean:kind_of] ≠ [korean:with, chicken:with]
- `term-20759` malaycofter: [curry:kind_of] ≠ [none]
- `term-21605` the John: [toilets:same] ≠ [none]
- `term-22168` unique food experiences: [food:kind_of] ≠ [none]
- `term-2567` Diätbratwurst: [sausages:kind_of] ≠ [sausages:kind_of, healthy:with]
- `term-3167` Indian favourites: [indian:same] ≠ [none]
- `term-3235` sound latte: [coffee drinks:kind_of] ≠ [none]
- `term-35404` butter squishies: [dessert:kind_of] ≠ [none]
- `term-37002` tuz: [seasoning:kind_of] ≠ [none]
- `term-373` cheesecake with berry sauce: [cake:kind_of] ≠ [dessert:kind_of]
- `term-37729` curry show rice and peas: [curry:kind_of, jamaican:kind_of] ≠ [none]
- `term-38289` tono pizza: [pizza:kind_of, seafood:with] ≠ [pizza:kind_of]
- `term-45188` breakfast pita: [sandwiches:kind_of, breakfast:with] ≠ [bread:kind_of, breakfast:with]
- `term-4713` Chicken Tenders: [fried chicken:kind_of, chicken:kind_of] ≠ [chicken:kind_of]
- `term-4788` Korean Fried Chicken: [fried chicken:kind_of, chicken:kind_of, korean:kind_of] ≠ [fried chicken:kind_of, korean:with]
- `term-4873` vegetable döner: [kebab:kind_of, vegetarian:with] ≠ [kebab:kind_of]
- `term-4874` vegetable doner kebab: [kebab:kind_of, vegetarian:with] ≠ [kebab:kind_of]
- `term-4876` vegetable kebab: [kebab:kind_of, vegetarian:with] ≠ [kebab:kind_of]
- `term-52` dim sum: [dumplings:kind_of] ≠ [chinese:kind_of]
- `term-55` momo: [dumplings:kind_of, nepalese:kind_of] ≠ [dumplings:kind_of]
- `term-5581` Prosecco flat rate: [wine:kind_of] ≠ [wine:kind_of, price:with]
- `term-5595` Bistecca Fiorentina: [steakhouse:kind_of, italian:kind_of] ≠ [steakhouse:kind_of]
- `term-5886` Hähnchenschnitzel mit Pommes und Gemüse: [schnitzel:kind_of, chicken:with] ≠ [none]
- `term-602` broth: [soups:kind_of] ≠ [none]
- `term-6102` kavurma toast: [sandwiches:kind_of] ≠ [turkish:kind_of]
- `term-6166` Korean wings: [fried chicken:kind_of, korean:kind_of] ≠ [chicken:kind_of, korean:with]
- `term-6307` matcha (mixed with orange juice): [matcha:kind_of] ≠ [matcha:same, milkshakes:with]
- `term-6481` original city chicken: [chicken:kind_of] ≠ [none]
- … 9 more in issues.jsonl

### terms.none (11)

- `term-17247` sambal dummer: none ≠ chicken
- `term-2129` Com gia dinh: none ≠ vietnamese
- `term-2306` cút lộn xào me: none ≠ vietnamese
- `term-2357` hot dog: none ≠ sausages
- `term-2621` Samowar set for two: none ≠ tea
- `term-2825` Sapa Rolls: none ≠ vietnamese
- `term-4138` tataki with choy choi: none ≠ japanese
- `term-45655` sushi set: none ≠ sushi
- `term-5723` vegan Thanksgiving plate: none ≠ vegan
- `term-683` French toast: none ≠ bread
- `term-7993` deposit: none ≠ payment
