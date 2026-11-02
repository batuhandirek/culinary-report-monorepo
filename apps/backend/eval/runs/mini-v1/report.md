# Ingestion eval: mini-v1

2026-11-01 14:40 UTC · 169 reviews, 199 posts, 0 wordings · 503 cases left out (no reference or no output)
Tokens: 1,195,147
Models: review-claims: openai/gpt-5.4-mini (169); claim-parts: openai/gpt-5.4-mini (366); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (87)

> 299 references were written against older instructions than the agents have now: where the rules changed, they score the old rules.

## Reviews

| Metric | mini-v1 | stored | mini-base-2 | mini-base | baseline |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% (926/968) | 93% +2 | 96% ±0 | 96% -1 | 99% -4 |
| Claims that are real (of produced) | 99% (1201/1219) | 99% -1 | 98% ±0 | 98% ±0 | 98% ±0 |
| Sentiment | 89% (1063/1192) | 88% +2 | 88% +2 | 88% +1 | 94% -5 |
| Aspect, exact | 78% (956/1218) | 71% +8 | 77% +2 | 80% -2 | 90% -11 |
| Aspect, right root | 86% (1052/1218) | 81% +6 | 83% +4 | 87% -1 | 93% -7 |
| Kind | 89% (1058/1192) | 67% +22 | 84% +5 | 84% +4 | 95% -6 |
| Kind given at all | 98% (1192/1218) | 4% +94 | 99% -2 | 99% -1 | 100% -2 |
| Changes that are changes | 72% (13/18) | 56% +16 | 73% -1 | 52% +20 | 88% -16 |
| Changes found | 81% (13/16) | 80% +1 | 69% +13 | 81% ±0 | 93% -12 |
| Amount | 67% (30/45) | 41% +25 | 56% +11 | 62% +4 | 74% -8 |
| Foods named, precision | 66% (252/383) | 32% +33 | 63% +3 | 65% +1 | 73% -7 |
| Foods named, recall | 63% (239/381) | 23% +40 | 63% ±0 | 62% ±0 | 59% +4 |

## Posts and articles

| Metric | mini-v1 | stored | mini-base-2 | mini-base | baseline |
|---|---|---|---|---|---|
| Claims found (of the reference) | 72% (1500/2077) | 56% +17 | 74% -2 | 73% -1 | 84% -11 |
| Claims that are real (of produced) | 87% (1838/2104) | 95% -7 | 89% -1 | 91% -4 | 96% -9 |
| Sentiment | 88% (1750/1992) | 86% +2 | 87% +1 | 87% +1 | 92% -4 |
| Aspect, exact | 63% (1268/2000) | 63% ±0 | 62% +1 | 60% +3 | 80% -16 |
| Aspect, right root | 79% (1573/2000) | 78% +1 | 76% +2 | 75% +3 | 85% -6 |
| Kind | 81% (1622/1992) | 47% +35 | 80% +2 | 83% -1 | 91% -9 |
| Kind given at all | 100% (1992/2000) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 48% (20/42) | 46% +1 | 42% +6 | 56% -8 | 73% -25 |
| Changes found | 41% (13/32) | 38% +3 | 38% +3 | 44% -3 | 67% -26 |
| Amount | 58% (63/108) | 46% +12 | 59% ±0 | 47% +11 | 83% -25 |
| Foods named, precision | 63% (669/1069) | 46% +16 | 68% -6 | 63% -1 | 72% -10 |
| Foods named, recall | 53% (644/1213) | 39% +14 | 63% -10 | 59% -6 | 59% -6 |
| Subject (place, city, none) | 87% (1732/2000) | 85% +2 | 87% ±0 | 85% +1 | 94% -7 |
| Claim on the right place | 88% (1415/1615) | 85% +3 | 89% -1 | 90% -2 | 94% -6 |
| Places found | 82% (356/433) | 73% +9 | 81% +1 | 80% +2 | 92% -10 |
| Places that are places | 90% (356/394) | 85% +5 | 90% ±0 | 91% ±0 | 93% -2 |
| Match: brand (found places) | 93% (330/356) | 92% +1 | 93% ±0 | 93% ±0 | 91% +1 |
| Match: branch (right brand) | 96% (277/289) | 97% -1 | 94% +1 | 96% ±0 | 97% -1 |
| Match on the reference's places: brand | 92% (326/353) | — | 93% -1 | 93% -1 | 91% +1 |
| Match on the reference's places: branch | 96% (268/280) | — | 96% ±0 | 96% ±0 | 96% -1 |
| Promotional flag | 78% (155/199) | 82% -4 | 79% -1 | 79% -1 | 80% -2 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-v1 (train) | mini-v1 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|
| Claims found (of the reference) | 96% | 95% (284/298) | 94% +1 | 97% -2 |
| Claims that are real (of produced) | 98% | 99% (356/358) | 99% ±0 | 99% ±0 |
| Sentiment | 89% | 89% (305/343) | 88% +1 | 89% ±0 |
| Aspect, exact | 80% | 75% (273/362) | 79% -3 | 78% -2 |
| Aspect, right root | 87% | 85% (307/362) | 86% -1 | 87% -2 |
| Kind | 89% | 88% (303/343) | 86% +3 | 87% +1 |
| Kind given at all | 99% | 95% (343/362) | 100% -5 | 100% -5 |
| Changes that are changes | 69% | 100% (2/2) | 100% ±0 | 40% +60 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 |
| Amount | 70% | 61% (11/18) | 67% -6 | 70% -9 |
| Foods named, precision | 65% | 67% (69/103) | 65% +2 | 71% -4 |
| Foods named, recall | 65% | 57% (69/121) | 59% -2 | 64% -7 |

### Posts and articles

| Metric | mini-v1 (train) | mini-v1 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|
| Claims found (of the reference) | 73% | 69% (419/606) | 69% ±0 | 71% -2 |
| Claims that are real (of produced) | 89% | 83% (514/620) | 91% -9 | 93% -10 |
| Sentiment | 87% | 91% (495/544) | 90% +1 | 92% -1 |
| Aspect, exact | 63% | 65% (356/548) | 64% +1 | 64% +1 |
| Aspect, right root | 79% | 78% (428/548) | 78% ±0 | 77% +1 |
| Kind | 80% | 85% (463/544) | 84% +2 | 85% ±0 |
| Kind given at all | 100% | 99% (544/548) | 99% ±0 | 100% -1 |
| Changes that are changes | 48% | 47% (7/15) | 29% +18 | 45% +1 |
| Changes found | 41% | 40% (4/10) | 20% +20 | 30% +10 |
| Amount | 53% | 73% (22/30) | 71% +3 | 62% +12 |
| Foods named, precision | 61% | 68% (204/301) | 72% -4 | 67% ±0 |
| Foods named, recall | 52% | 55% (198/362) | 66% -12 | 60% -5 |
| Subject (place, city, none) | 86% | 87% (478/548) | 83% +4 | 84% +3 |
| Claim on the right place | 91% | 80% (362/453) | 85% -6 | 82% -2 |
| Places found | 82% | 82% (91/111) | 79% +3 | 77% +5 |
| Places that are places | 91% | 88% (91/104) | 85% +2 | 84% +3 |
| Match: brand (found places) | 93% | 92% (84/91) | 92% ±0 | 91% +2 |
| Match: branch (right brand) | 96% | 96% (67/70) | 96% ±0 | 97% -1 |
| Match on the reference's places: brand | 93% | 89% (63/71) | 90% -1 | 93% -4 |
| Match on the reference's places: branch | 96% | 96% (47/49) | 98% -2 | 95% +1 |
| Promotional flag | 78% | 78% (45/58) | 83% -5 | 81% -3 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 94% (364/388) | 99% (467/471) | 78% (370/472) | 91% (411/453) | — | — |
| hard | 84% (76/91) | 92% (92/100) | 79% (75/95) | 97% (92/95) | 100% (11/11) | 100% (11/11) |
| lang:de | 95% (332/350) | 99% (421/425) | 85% (361/426) | 90% (379/419) | — | — |
| lang:en | 97% (232/238) | 99% (294/297) | 79% (237/300) | 93% (278/300) | — | — |
| lang:other | 96% (299/313) | 98% (399/409) | 75% (302/404) | 86% (347/404) | — | — |
| lang:tr | 94% (63/67) | 99% (87/88) | 64% (56/88) | 86% (59/69) | — | — |
| length:long | 94% (275/294) | 96% (379/393) | 74% (288/387) | 85% (314/368) | — | — |
| length:medium | 96% (598/620) | 100% (764/767) | 80% (614/772) | 91% (693/765) | — | — |
| length:short | 98% (53/54) | 98% (58/59) | 92% (54/59) | 95% (56/59) | — | — |
| no-transcript | 88% (424/482) | 90% (559/624) | 70% (419/600) | 88% (529/599) | 94% (119/127) | 94% (112/119) |
| own | 95% (63/66) | 87% (91/105) | 67% (63/94) | 91% (86/94) | 100% (20/20) | 100% (20/20) |
| places:few | 70% (1049/1490) | 87% (1316/1510) | 67% (927/1384) | 89% (1229/1376) | 81% (151/186) | 93% (141/151) |
| places:many | 76% (442/578) | 88% (509/579) | 55% (333/603) | 84% (509/603) | 83% (203/245) | 92% (187/203) |
| places:none | 100% (9/9) | 87% (13/15) | 62% (8/13) | 92% (12/13) | 100% (2/2) | 100% (2/2) |
| platform:blog | 61% (652/1067) | 85% (731/860) | 58% (476/823) | 85% (697/818) | 69% (137/199) | 96% (131/137) |
| platform:google | 96% (926/968) | 99% (1201/1219) | 78% (956/1218) | 89% (1063/1192) | — | — |
| platform:instagram | 87% (283/325) | 91% (376/412) | 74% (294/399) | 88% (350/398) | 90% (64/71) | 94% (60/64) |
| platform:tiktok | 82% (565/685) | 88% (731/832) | 64% (498/778) | 91% (703/776) | 95% (155/163) | 90% (139/155) |
| size:large | 62% (631/1016) | 84% (717/852) | 57% (464/807) | 85% (683/802) | 70% (133/191) | 93% (124/133) |
| size:medium | 79% (604/767) | 94% (748/793) | 66% (520/793) | 89% (706/792) | 92% (130/142) | 92% (119/130) |
| size:small | 90% (265/294) | 81% (373/459) | 71% (284/400) | 91% (361/398) | 93% (93/100) | 94% (87/93) |
| stars:1 | 96% (155/161) | 98% (211/215) | 74% (156/211) | 90% (172/192) | — | — |
| stars:2 | 96% (156/162) | 96% (197/206) | 75% (149/198) | 84% (167/198) | — | — |
| stars:3 | 95% (209/219) | 100% (261/262) | 74% (201/270) | 89% (234/263) | — | — |
| stars:4 | 95% (186/195) | 100% (251/252) | 86% (216/252) | 90% (226/252) | — | — |
| stars:5 | 95% (220/231) | 99% (281/284) | 82% (234/287) | 92% (264/287) | — | — |
| transcript | 80% (424/528) | 88% (548/620) | 65% (373/577) | 91% (524/575) | 93% (100/107) | 87% (87/100) |

## Misses

### parts.aspect (994)

- `review-02d1586d` everything was very good: none ≠ vibe
- `review-0541b749` the frites were too salty: seasoning ≠ ingredient_quality
- `review-0541b749` the meat in the sandwich was chicken only: menu_variety ≠ ingredient_quality
- `review-0541b749` the pain was quickly made, nothing special: food ≠ cooking
- `review-070860ca` a very unhelpful and very angry man hung up on the reviewer: complaint_handling ≠ service
- `review-070860ca` had to reorder: order_accuracy ≠ service
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` all in all pretty okay: none ≠ vibe
- `review-08c67545` the portion was quite small for almost 30€: value_for_money ≠ price
- `review-0ac47c59` a line stretching outside: queue ≠ none
- `review-0ac47c59` the line didn't move: queue ≠ none
- `review-0ac47c59` waited in line a little over an hour: queue ≠ none
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ none
- `review-0ac47c59` sales slowed down as the line shortened: queue ≠ none
- `review-0ac47c59` after ordering, waited as long again with an order number t…: wait_for_food ≠ none
- `review-0ac47c59` asking a question in Turkish gets a 'no Turkish' answer: language ≠ none
- `review-0ac47c59` the döner tasted nothing like Turkish döner: authenticity ≠ none
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: authenticity ≠ none
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: authenticity ≠ none
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ none
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ none
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ none
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ none
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ none
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ food
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ food
- `review-1016bd13` none of the tables had a bottle opener: service ≠ order_accuracy
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: attentiveness ≠ crowding
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: wait_for_food ≠ service
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ wait_for_food
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ wait_for_food
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: speed_of_service ≠ wait_for_food
- `review-1016bd13` at a 16-person round table the waiter said all dishes come …: portion_size ≠ none
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: order_accuracy ≠ none
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: order_accuracy ≠ none
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: service ≠ price
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: speed_of_service ≠ wait_for_food
- … 954 more in issues.jsonl

### parts.foods (946)

- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ []
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-037bbe20` the beer is a strong point: [birra] ≠ [beer]
- `review-037bbe20` the beer is a strong point: [birra] ≠ [beer]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread, bread]
- `review-0541b749` the fresh légumes were good: [légumes] ≠ [vegetables]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the fresh légumes were good: [légumes] ≠ [vegetables]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato, dürüm, potato]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato]
- `review-08c67545` none of the starters or desserts appealed to the reviewer: [] ≠ [appetizers, desserts]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ []
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ []
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ []
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ []
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ []
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ []
- `review-1016bd13` none of the tables had a bottle opener: [] ≠ [啤酒]
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: [] ≠ [啤酒]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [汤]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [酒水]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [Kebab No. 1]
- `review-1104925b` the food is so, so delicious: [] ≠ [kebab]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [Kebab No. 1]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- … 906 more in issues.jsonl

### claims.missed (619)

- `review-0217fd90` very delicious
- `review-02556664` go to the competition instead
- `review-070860ca` the reviewer is not happy
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab shop in Berlin on Google
- `review-0ac47c59` the reviews were probably inflated
- `review-0ac47c59` found nothing to praise about the place
- `review-1798cc23` dishes cost around 20 € each
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the male kebab experts at pickup are consistently arrogant, presumably due to the success
- `review-196641fc` the kebab experts ignore guests' questions
- `review-196641fc` cool stickers from all over the (football) world as the design
- `review-356e149a` we usually love eating here
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-39166eb1` check your food if you still go there
- `review-3bab8289` when a bit empty, the place feels a little soulless
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-5cd39af6` recommends the place to everyone
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-693fb047` the food was nothing special
- `review-693fb047` expected the best kebab but the kebab was only edible
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7a1ba6d7` the reviewer recommends the place
- `review-80d9a747` loved the visit
- `review-937ea9e9` Sandos is simply outstanding
- `review-af8dacaa` the place is super
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-eacefe43` came late at night
- `review-f51e95e9` everything was great
- `review-fb1415dc` the cleanliness and service issues are not that bad
- … 579 more in issues.jsonl

### parts.kind (504)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` Rüyam Gemüse Kebab was their choice on their first day in B…: fact ≠ verdict
- `review-02d1586d` the staff were very good: opinion ≠ fact
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: opinion ≠ fact
- `review-0541b749` the pain was quickly made, nothing special: opinion ≠ fact
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: opinion ≠ fact
- `review-08c67545` the portion was quite small for almost 30€: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-1016bd13` none of the tables had a bottle opener: opinion ≠ fact
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: opinion ≠ fact
- `review-16bdd5e0` they mixed up our sauces: opinion ≠ fact
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: opinion ≠ fact
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: opinion ≠ fact
- `review-170f36a3` the food is high in calories: opinion ≠ fact
- `review-1798cc23` the old listing including its reviews was simply continued: opinion ≠ change
- `review-1798cc23` the service did not match the price: opinion ≠ fact
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-1798cc23` the Pommes were forgotten: opinion ≠ fact
- `review-1798cc23` no information was given about the Weinen: opinion ≠ fact
- `review-196641fc` the total wait of 50 minutes was too long: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-21de844d` waited over half an hour before being served: opinion ≠ fact
- `review-2799bbfa` only this branch gave the reviewer a wrong takeaway order: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: opinion ≠ fact
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: opinion ≠ fact
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ new_item
- `review-382cd7e9` the restaurant chain already has plenty of money but still …: opinion ≠ fact
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: opinion ≠ fact
- … 464 more in issues.jsonl

### parts.sentiment (371)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` the staff were very good: positive ≠ neutral
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: negative ≠ neutral
- `review-07871fa7` all in all pretty okay: positive ≠ neutral
- `review-08c67545` the portion was quite small for almost 30€: negative ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: negative ≠ neutral
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: negative ≠ positive
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: negative ≠ positive
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: positive ≠ neutral
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ positive
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: negative ≠ neutral
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ neutral
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ positive
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: negative ≠ positive
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: negative ≠ positive
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` the kebab had loads of lemon: negative ≠ neutral
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- … 331 more in issues.jsonl

### claims.extra (284)

- `review-0ac47c59` the long line was not because of the döner being prepared
- `review-1016bd13` first bus had 40 people
- `review-1016bd13` each table was supposed to have 6 bottles of beer
- `review-1016bd13` soup came quickly after guests were seated
- `review-1016bd13` cold dishes were already laid out
- `review-1016bd13` each hot dish had 15 plates
- `review-1016bd13` all hot dishes came within 5 minutes
- `review-1016bd13` questioned whether the chefs were serving food that fast
- `review-1016bd13` questioned whether the chefs had three heads and six arms
- `review-1016bd13` waiter said all dishes were double portions
- `review-356e149a` the staff member asked where he came from
- `review-356e149a` he is Arab
- `review-35fe7952` the Turkish black tea was free
- `review-39166eb1` the restaurant is for an authentic South Indian dining experience
- `review-3f2a2713` the year is 2026
- `review-510fc086` living in Berlin has advantages
- `review-510fc086` the Yuzu-Limo was truly phenomenal
- `review-6b917d41` the burger was mentioned
- `post-01239695` the girl did well
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only the wrong clothing
- `post-019b903e` greeting for a good, successful day
- `post-0bf8447d` it is best viewed from above
- `post-0d484513` Café Ploetz uses organic ingredients
- `post-0dde5eb7` the food does not need much to make them happy
- `post-0fa29641` this is a Berlin guide, Kreuzberg edition
- `post-0fa29641` the post includes tagged spots for later saving
- `post-1c0d4023` the recommendations are aggregated from public sources
- `post-1d0aeaca` the milk and honey uses bee pollen from a beekeeper friend
- `post-1e024518` the post shows a masala dosa
- `post-2161780e` the venue serves Healthy Matcha
- `post-22c25ac1` Mrs. Chens Blue Pearl were eaten
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces
- `post-22c25ac1` Berlin has a location called Prenzlauer Berg
- `post-233389f4` they ordered there anyway
- `post-2927e673` the post is an ad
- `post-2927e673` after eating, you can go up to the dome and enjoy the view
- `post-2a8e9606` from 3 or 4 p.m. there is sparkling wine or a small beer
- `post-2b231637` the article is about the best ice cream spots in Berlin for summer 2026
- `post-2b231637` the article is current as of July 2026
- … 244 more in issues.jsonl

### claims.subject (268)

- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: place ≠ none
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: place ≠ none
- `post-0d1e7abc` the warm dishes are tasty: place ≠ none
- `post-0d1e7abc` the author especially likes the Grilled Cheese mit Kimchi: place ≠ none
- `post-0fa29641` the author genuinely loves and keeps coming back to these s…: city ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1ca1ffee` the creator would definitely come back: place ≠ none
- `post-1ca1ffee` if you want to experience Wedding, drop by Doree 65: place ≠ city
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-217c8e79` Bún chả is the creator's absolute favourite food: none ≠ place
- `post-217c8e79` Fischsoße is very popular in Vietnam: none ≠ place
- `post-233389f4` the Indian restaurant in Mitte was empty when they came in: none ≠ place
- `post-233389f4` the food at the Indian restaurant looked good: none ≠ place
- `post-233389f4` both of them had bad diarrhea after eating at the Indian re…: none ≠ place
- `post-233389f4` tip: never go into a restaurant where business is slow and …: none ≠ place
- `post-233389f4` tip: never go into a restaurant where business is slow and …: none ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide: place ≠ none
- `post-2927e673` Lunch can be eaten on the roof of the Reichstag: place ≠ none
- … 228 more in issues.jsonl

### claims.place (200)

- `post-106450e8` the Coconut Pandan Cloud is so good: Amato ≠ Amato Berlin
- `post-106450e8` Amato has fun drinks: Amato ≠ Amato Berlin
- `post-22c25ac1` the new owners gave the three women a share of the profits: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` through the tinted shop window you can watch the three wome…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` ten dumplings cost 16 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` 20 dumplings cost 30 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the prices are fairly calculated and worth every cent: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` you can take fresh Dumplings home or stock up on a frozen a…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Manufaktur is open Wednesday to Sunday from 12 to 18: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Manufaktur is a gain for everyone who loves good food a…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2a8e9606` Otto is run by Zupke and Ursus: Otto ≠ Café Bravo
- `post-2a8e9606` Otto is run by Zupke and Ursus: Otto ≠ Café Benjamine
- `post-2a8e9606` Pluto is run by Zupke and Ursus: Pluto ≠ Café Bravo
- `post-2a8e9606` Pluto is run by Zupke and Ursus: Pluto ≠ Café Benjamine
- `post-2a8e9606` Trio is run by Zupke and Ursus: Trio ≠ Café Bravo
- `post-2a8e9606` Trio is run by Zupke and Ursus: Trio ≠ Café im Haus am Waldsee
- … 160 more in issues.jsonl

### places.missed (77)

- `post-106450e8` Amato
- `post-1e024518` Masalas
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-2a8e9606` Kulturcafé im Dussmann Kulturkaufhaus
- `post-2a8e9606` Barlevain
- `post-2a8e9606` File Asto
- `post-2a8e9606` Sagma
- `post-2a8e9606` Almi Bistro
- `post-2a8e9606` Burma Bliss
- `post-2a8e9606` Nobelhardt & Schmutzig
- `post-2a8e9606` Volk
- `post-2a8e9606` Luzii
- `post-2a8e9606` Daia
- `post-2a8e9606` Kōji
- `post-2a8e9606` Goldies Bar
- `post-2a8e9606` Bar Matrëshka
- `post-3a0ad71a` FACIL
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Common
- `post-3a0ad71a` Bertie
- `post-3a0ad71a` Goldies Smashburger
- `post-3a0ad71a` Ora
- `post-3a0ad71a` Estelle
- `post-3a0ad71a` Grace Restaurant Bar
- `post-3a0ad71a` Kírkē Deli
- `post-3a0ad71a` Coffee Circle
- `post-3a0ad71a` Rogacki (Markthalle Neun)
- `post-3a0ad71a` File Asto Taverna
- `post-3a0ad71a` Ploetz
- `post-3a0ad71a` Zur letzten Instanz
- `post-3a0ad71a` Figl
- `post-3a0ad71a` Terese
- `post-3a0ad71a` Gut Kerkow Biometzgerei
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei
- `post-3a0ad71a` Nanum
- `post-3a0ad71a` Kissabo
- `post-3d9147ff` Schüsseldienst
- … 37 more in issues.jsonl

### parts.amount (60)

- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: 30 minutes ≠ —
- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` waited in line a little over an hour: 60 minutes ≠ —
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: 20 minutes ≠ —
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-1798cc23` the service did not match the price: —  ≠ 20 money
- `review-69365171` had the Büffet from 12-15 Uhr for 16,50€: 16.5 money ≠ —
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ —
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 12 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-b9d9100a` waited almost 90 minutes in a not very long line of about 2…: 90 minutes ≠ 20 minutes
- `review-dcd4db39` waited about half an hour in the queue at peak time: 30 minutes ≠ —
- `review-dcd4db39` the meal was ready just 5-10 minutes after ordering: 10 minutes ≠ 5 minutes
- `post-0216fd1d` Neukölln has places to eat well and cheaply: —  ≠ 6 money
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: —  ≠ 6 money
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: 1 money ≠ —
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-0d1e7abc` Isla has existed for 10 years: —  ≠ 10 minutes
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-2927e673` 5% discount on the first GetYourGuide app booking with code…: —  ≠ 5 money
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-3a0ad71a` Kírkē Deli costs 15–30 €: 30 money ≠ —
- `post-421f8a5b` the sandos are available from tomorrow at 14:00 at Scharnwe…: —  ≠ 14 minutes
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ —
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ —
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ 18 money
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ —
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ 18 money
- `post-57ab8313` The Tacos de Birria Veganos cost 11.50 euros: 11.5 money ≠ 12 money
- `post-5db3b46a` Manello's price is not too bad: —  ≠ 15 money
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-73286ffe` the Heitlinger Brasserie opens on 1 November from 12:00: —  ≠ 1 minutes
- … 20 more in issues.jsonl

### places.extra (38)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-0fa29641` Five Elephant
- `post-0fa29641` VOO Store
- `post-0fa29641` Antonia Lingemann
- `post-0fa29641` König Galerie
- `post-0fa29641` Westberlin
- `post-0fa29641` Barra Bar
- `post-0fa29641` Yummy Vintage
- `post-0fa29641` Ingwer
- `post-0fa29641` Annelies
- `post-0fa29641` Original Feelings Studio
- `post-106450e8` Amato Berlin
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c78d4ed` Col-Spirit
- `post-233389f4` indisches Restaurant
- `post-3d9147ff` Schuesseldienst Berlin
- `post-40f86f07` Amo Cafe Berlin
- `post-483d6cc6` Love at First Bite Berlin
- `post-4c3e2a10` Haftschaden
- `post-5476133a` KaDeWe Berlin
- `post-63b83025` Restaurant Athen Adlershof
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-68b0cd44` Panda Meister Dumpling
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Suits
- `post-8901fb9b` Mister Scott from Bonanza Coffee
- `post-8901fb9b` Boy
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Main
- `post-ad6a11c0` a favourite Korean in Berlin
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt
- `post-cecea20e` Bikini Berlin
- `post-fe3794c9` SpreeWiesn

### change.false (27)

- `review-1798cc23` the old listing and reviews were simply continued
- `review-3486a0a9` Bun Society has become a new local favourite
- `review-4cd140a3` the service got worse over the evening
- `review-4cd140a3` it got more full and louder
- `review-503d63e2` the Acai machine was broken one day
- `post-388b4383` Jörgs Curry Container's quality has remained the same
- `post-3a0ad71a` YOU is a new concept replacing Heritage
- `post-3e56e67d` everything is finished now
- `post-6ddca88c` Breda is a new trattoria by the Pinci founders
- `post-75c11d7c` Nichi Getsu opened in June 2026
- `post-75c11d7c` at lunch the focus shifts to Bara Chirashi
- `post-812c90d9` the seafood jjm costs 3€ more than the regular
- `post-909ca5ee` Barlevain has opened in spring
- `post-909ca5ee` the menu changes seasonally
- `post-909ca5ee` the cavatelli are currently served as pasta alla Norma
- `post-93ac6d3b` Charlottenburg is experiencing a gastronomic revival
- `post-93ac6d3b` Handcraft bakeries are rare in Berlin
- `post-a3178d9e` the smashburgers changed their opinion positively
- `post-b5e879f0` Restaurant India has closed
- `post-b5e879f0` the food stayed affordable despite rising costs
- `post-baac3611` 44 CHKN is opening its third branch soon
- `post-c4e7c0a9` the menu changes seasonally
- `post-cb785d0b` the place was closed for longer wait times during the renovation
- `post-cb785d0b` tomorrow they will only offer chicken or housemade falafel döner
- `post-cb785d0b` tomorrow they will not offer dürüm or other dishes
- `post-e62d3c39` Bravo became a café after the missing wall breakthrough prevented the original plan
- `post-fe3794c9` the SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin in Mitte th…

### match_isolated.brand (27)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)

### match.brand (26)

- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-cb785d0b` Sagos: none ≠ Sagano (llm)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ none (none)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### change.missed (22)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-2a8e9606` Sören Zupke and Vadim Otto Ursus take over Café Bravo in the summer
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-b8d2bcf3` the pavilion was refurnished with architects Studio Affin without changing its openness
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-cb785d0b` the renovation is finished, celebrated with the 1-cent promotion
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-fc96acff` Facil has quietly gotten better

### match.branch (12)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Yumcha Heroes Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Café, Breakfast Brunch
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-d232f1ca` BRLO: brand only ≠ BRLO Chicken & Beer

### match_isolated.branch (12)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - Schöneberg
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
