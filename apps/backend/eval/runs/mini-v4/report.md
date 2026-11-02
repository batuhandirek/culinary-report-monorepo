# Ingestion eval: mini-v4

2026-11-01 15:30 UTC · 167 reviews, 199 posts, 0 wordings · 505 cases left out (no reference or no output)
Tokens: 1,746,459
Models: review-claims: openai/gpt-5.4-mini (167); claim-parts: openai/gpt-5.4-mini (365); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (90)

## Reviews

| Metric | mini-v4 | stored | second-gpt54 | mini-base-2 | mini-base |
|---|---|---|---|---|---|
| Claims found (of the reference) | 97% (928/957) | 93% +3 | 98% -1 | 96% +1 | 97% ±0 |
| Claims that are real (of produced) | 99% (1189/1201) | 99% ±0 | 99% ±0 | 98% +1 | 98% +1 |
| Sentiment | 92% (979/1061) | 88% +5 | 99% -7 | 91% +1 | 91% +1 |
| Aspect, exact | 86% (916/1061) | 71% +16 | 84% +2 | 80% +7 | 82% +4 |
| Aspect, right root | 93% (983/1061) | 81% +12 | 87% +5 | 85% +7 | 89% +4 |
| Kind | 94% (994/1061) | 67% +27 | 98% -5 | 87% +7 | 87% +6 |
| Kind given at all | 100% (1061/1061) | 4% +96 | 100% ±0 | 100% ±0 | 99% +1 |
| Changes that are changes | 60% (15/25) | 56% +4 | 67% -7 | 73% -13 | 52% +8 |
| Changes found | 81% (13/16) | 80% +1 | 100% -19 | 69% +13 | 81% ±0 |
| Amount | 63% (29/46) | 41% +22 | 87% -24 | 65% -2 | 68% -5 |
| Foods named, precision | 76% (331/437) | 32% +43 | 91% -15 | 65% +10 | 70% +6 |
| Foods named, recall | 80% (308/386) | 23% +57 | 86% -6 | 64% +16 | 67% +13 |

## Posts and articles

| Metric | mini-v4 | stored | second-gpt54 | mini-base-2 | mini-base |
|---|---|---|---|---|---|
| Claims found (of the reference) | 81% (1689/2077) | 56% +26 | 85% -4 | 76% +5 | 76% +6 |
| Claims that are real (of produced) | 89% (2449/2763) | 95% -6 | 96% -7 | 91% -2 | 93% -4 |
| Sentiment | 89% (1882/2125) | 86% +3 | 96% -7 | 87% +1 | 87% +1 |
| Aspect, exact | 73% (1557/2125) | 63% +10 | 79% -5 | 64% +9 | 61% +13 |
| Aspect, right root | 85% (1809/2125) | 78% +7 | 87% -1 | 77% +8 | 74% +11 |
| Kind | 85% (1807/2125) | 47% +38 | 93% -8 | 80% +5 | 83% +2 |
| Kind given at all | 98% (2125/2161) | 4% +94 | 100% -2 | 100% -1 | 100% -1 |
| Changes that are changes | 48% (30/63) | 46% +1 | 57% -10 | 40% +8 | 56% -8 |
| Changes found | 56% (18/32) | 38% +19 | 50% +6 | 44% +13 | 50% +6 |
| Amount | 54% (51/94) | 46% +8 | 56% -2 | 62% -8 | 55% -1 |
| Foods named, precision | 75% (1111/1479) | 46% +29 | 86% -11 | 77% -2 | 72% +3 |
| Foods named, recall | 73% (1016/1386) | 39% +34 | 88% -15 | 70% +3 | 66% +7 |
| Subject (place, city, none) | 85% (2227/2611) | 85% ±0 | 94% -9 | 87% -1 | 85% +1 |
| Claim on the right place | 92% (1937/2112) | 85% +7 | 97% -5 | 90% +1 | 90% +2 |
| Places found | 87% (376/433) | 73% +14 | 86% ±0 | 82% +5 | 81% +6 |
| Places that are places | 86% (376/435) | 85% +1 | 94% -8 | 92% -5 | 91% -5 |
| Match: brand (found places) | 89% (333/376) | 92% -3 | 97% -8 | 92% -4 | 92% -3 |
| Match: branch (right brand) | 97% (276/286) | 97% -1 | 98% -1 | 94% +2 | 96% +1 |
| Match on the reference's places: brand | 93% (402/433) | — | — | 93% -1 | 93% ±0 |
| Match on the reference's places: branch | 96% (328/341) | — | — | 96% ±0 | 96% ±0 |
| Promotional flag | 78% (156/199) | 82% -4 | 69% +9 | 79% -1 | 79% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-v4 (train) | mini-v4 (test) | second-gpt54 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 97% | 97% (280/290) | 98% -1 | 95% +1 | 97% -1 |
| Claims that are real (of produced) | 99% | 99% (355/358) | 99% +1 | 99% ±0 | 98% +1 |
| Sentiment | 92% | 92% (297/323) | 99% -7 | 90% +1 | 92% ±0 |
| Aspect, exact | 86% | 88% (283/323) | 84% +3 | 80% +7 | 81% +6 |
| Aspect, right root | 92% | 94% (304/323) | 87% +7 | 88% +6 | 89% +5 |
| Kind | 93% | 96% (310/323) | 98% -3 | 89% +7 | 90% +6 |
| Kind given at all | 100% | 100% (323/323) | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 57% | 100% (2/2) | 67% +33 | 100% ±0 | 40% +60 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 58% | 73% (11/15) | 87% -13 | 67% +7 | 71% +3 |
| Foods named, precision | 75% | 79% (103/131) | 91% -12 | 66% +13 | 78% +1 |
| Foods named, recall | 79% | 82% (101/123) | 86% -4 | 61% +21 | 69% +13 |

### Posts and articles

| Metric | mini-v4 (train) | mini-v4 (test) | second-gpt54 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 79% | 86% (522/606) | 85% +1 | 75% +12 | 73% +13 |
| Claims that are real (of produced) | 89% | 89% (759/854) | 96% -7 | 93% -4 | 96% -7 |
| Sentiment | 89% | 89% (594/670) | 96% -7 | 89% ±0 | 91% -2 |
| Aspect, exact | 74% | 71% (479/670) | 79% -7 | 65% +6 | 65% +7 |
| Aspect, right root | 87% | 81% (542/670) | 87% -6 | 79% +2 | 76% +5 |
| Kind | 85% | 84% (564/670) | 93% -9 | 83% +1 | 85% -1 |
| Kind given at all | 99% | 96% (670/696) | 100% -4 | 99% -3 | 100% -4 |
| Changes that are changes | 45% | 56% (9/16) | 57% -1 | 21% +35 | 45% +11 |
| Changes found | 50% | 70% (7/10) | 50% +20 | 30% +40 | 40% +30 |
| Amount | 52% | 60% (18/30) | 56% +4 | 80% -20 | 77% -17 |
| Foods named, precision | 77% | 70% (311/442) | 86% -16 | 83% -13 | 75% -5 |
| Foods named, recall | 76% | 67% (288/432) | 88% -21 | 71% -4 | 65% +2 |
| Subject (place, city, none) | 85% | 86% (710/821) | 94% -7 | 83% +3 | 86% +1 |
| Claim on the right place | 90% | 94% (642/680) | 97% -3 | 87% +7 | 83% +12 |
| Places found | 86% | 88% (98/111) | 86% +2 | 79% +9 | 77% +11 |
| Places that are places | 86% | 88% (98/111) | 94% -6 | 85% +3 | 84% +4 |
| Match: brand (found places) | 89% | 88% (86/98) | 97% -9 | 92% -4 | 91% -3 |
| Match: branch (right brand) | 95% | 100% (71/71) | 98% +2 | 96% +4 | 97% +3 |
| Match on the reference's places: brand | 93% | 91% (101/111) | — | 90% +1 | 93% -2 |
| Match on the reference's places: branch | 96% | 96% (80/83) | — | 98% -2 | 95% +1 |
| Promotional flag | 79% | 78% (45/58) | 69% +9 | 83% -5 | 81% -3 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 98% (372/381) | 100% (473/475) | 87% (373/427) | 93% (397/427) | — | — |
| hard | 91% (83/91) | 95% (110/116) | 81% (83/102) | 94% (96/102) | 100% (11/11) | 100% (11/11) |
| lang:de | 97% (342/351) | 100% (435/436) | 88% (338/385) | 94% (363/385) | — | — |
| lang:en | 96% (221/230) | 100% (279/280) | 88% (222/252) | 94% (236/252) | — | — |
| lang:other | 97% (299/309) | 98% (381/389) | 84% (287/340) | 90% (305/340) | — | — |
| lang:tr | 99% (66/67) | 98% (94/96) | 82% (69/84) | 89% (75/84) | — | — |
| length:long | 96% (282/294) | 98% (398/405) | 81% (273/337) | 91% (305/337) | — | — |
| length:medium | 98% (593/608) | 99% (735/740) | 88% (588/667) | 93% (619/667) | — | — |
| length:short | 96% (53/55) | 100% (56/56) | 96% (55/57) | 96% (55/57) | — | — |
| no-transcript | 91% (440/482) | 89% (579/650) | 77% (421/549) | 91% (501/549) | 94% (120/127) | 92% (110/120) |
| own | 89% (59/66) | 91% (96/106) | 83% (68/82) | 96% (79/82) | 100% (20/20) | 100% (20/20) |
| places:few | 85% (1273/1490) | 90% (1907/2109) | 73% (1175/1606) | 89% (1428/1606) | 86% (160/186) | 93% (149/160) |
| places:many | 70% (407/578) | 83% (531/641) | 74% (375/508) | 88% (445/508) | 87% (214/245) | 85% (182/214) |
| places:none | 100% (9/9) | 85% (11/13) | 64% (7/11) | 82% (9/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 75% (801/1067) | 88% (1220/1390) | 70% (699/992) | 87% (864/992) | 79% (157/199) | 90% (142/157) |
| platform:google | 97% (928/957) | 99% (1189/1201) | 86% (916/1061) | 92% (979/1061) | — | — |
| platform:instagram | 92% (298/325) | 91% (389/427) | 74% (274/370) | 90% (334/370) | 94% (67/71) | 90% (60/67) |
| platform:tiktok | 86% (590/685) | 89% (840/946) | 77% (584/763) | 90% (684/763) | 93% (152/163) | 86% (131/152) |
| size:large | 76% (773/1016) | 92% (1188/1292) | 73% (691/944) | 88% (827/944) | 80% (153/191) | 84% (129/153) |
| size:medium | 84% (641/767) | 86% (851/987) | 71% (574/809) | 88% (711/809) | 93% (132/142) | 91% (120/132) |
| size:small | 94% (275/294) | 85% (410/484) | 78% (292/372) | 92% (344/372) | 91% (91/100) | 92% (84/91) |
| stars:1 | 98% (157/161) | 97% (213/219) | 84% (158/189) | 93% (175/189) | — | — |
| stars:2 | 99% (152/154) | 98% (193/197) | 88% (148/169) | 88% (149/169) | — | — |
| stars:3 | 97% (212/219) | 100% (270/270) | 83% (202/244) | 91% (222/244) | — | — |
| stars:4 | 97% (187/193) | 99% (245/247) | 90% (189/211) | 92% (194/211) | — | — |
| stars:5 | 96% (220/230) | 100% (268/268) | 88% (219/248) | 96% (239/248) | — | — |
| transcript | 85% (448/528) | 90% (650/723) | 75% (437/584) | 89% (517/584) | 93% (99/107) | 82% (81/99) |

## Misses

### parts.foods (735)

- `review-019a8099` the food is really delicious: [] ≠ [Essen]
- `review-0217fd90` very delicious: [] ≠ [Suppe]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ []
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-037bbe20` the food was good: [] ≠ [Cibo]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread, bread]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the fresh légumes were good: [légumes] ≠ [légumes, frais]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [légumes, frais]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` the music was very loud: [] ≠ [muziek]
- `review-08c67545` the food was tasty: [] ≠ [Essen]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan]
- `review-0ac47c59` waited in line a little over an hour: [] ≠ [döner]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [soğandan]
- `review-0e8741f9` the food was delicious: [] ≠ [eten]
- `review-0f14e04b` great food: [] ≠ [food]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer, cola, orange juice]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` planned to order more drinks on site as needed: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [Kebab]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [Kebab]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- … 695 more in issues.jsonl

### parts.aspect (713)

- `review-02d1586d` everything was very good: none ≠ vibe
- `review-02d1586d` they thank the waiter as well: service ≠ none
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-07871fa7` the loud music fits the vibe they want to create: atmosphere ≠ vibe
- `review-0ac47c59` waited in line a little over an hour: queue ≠ wait_for_food
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ order_accuracy
- `review-0ac47c59` sales slowed down as the line shortened: queue ≠ speed_of_service
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ food
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ menu_variety
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` planned to order more drinks on site as needed: none ≠ service
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ food
- `review-1016bd13` none of the tables had a bottle opener: service ≠ none
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ wait
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ wait_for_food
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-170f36a3` the food is high in calories: food ≠ none
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ none
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ price
- `review-1798cc23` Bier was only available by the bottle: drink_selection ≠ drinks
- `review-1798cc23` the Pommes were forgotten: order_accuracy ≠ availability
- `review-196641fc` ordering was with a friendly lady: friendliness ≠ service
- `review-196641fc` the male kebab experts at pickup are consistently arrogant,…: friendliness ≠ advice
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ none
- `review-2799bbfa` ordered 2 extra fleisch pattys for a single hamburger, 3 in…: order_accuracy ≠ portion_size
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- `review-2d6d3829` the meat options are really excellent: taste ≠ ingredient_quality
- `review-3486a0a9` the fries are perfectly thin and crispy: cooking ≠ portion_size
- `review-356e149a` won't spend another cent at this place as long as this empl…: service ≠ value_for_money
- `review-356e149a` the first thing the employee said was asking if I was the d…: friendliness ≠ none
- `review-356e149a` the employee made me wait several more minutes before takin…: attentiveness ≠ wait
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: friendliness ≠ language
- `review-35fe7952` the kebab shop is very popular: crowding ≠ none
- `review-3639cae4` there were practically no sauces: portion_size ≠ ingredient_quality
- `review-3639cae4` the bun was bitter: taste ≠ food
- `review-3639cae4` the kebab at this branch was awful: food ≠ none
- `review-36f2fac8` the food is definitely not worth the wait: wait ≠ value_for_money
- … 673 more in issues.jsonl

### claims.missed (417)

- `review-02556664` go to the competition instead
- `review-07871fa7` all in all pretty okay
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the kebab experts ignore guests' questions
- `review-37016d87` everything was incredible
- `review-39166eb1` check your food if you still go there
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-5d173a89` the döner is not worth €7.90
- `review-5d173a89` definitely not a place the reviewer would recommend
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà
- `review-7593dfff` the sauces were nicely balanced
- `review-7f3142f7` the atmosphere is lively
- `review-80d9a747` loved the visit
- `review-80d9a747` would highly recommend the place
- `review-937ea9e9` Sandos is simply outstanding
- `review-af8dacaa` the place is super
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-eacefe43` came late at night
- `review-ec04d472` the place is an extreme rip-off
- `review-f51e95e9` everything was great
- `review-feb41b4e` the reviewer has to agree with some of the criticism
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-020c68fb` Markthalle Neun is open Monday to Saturday 9:00–20:00
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salami Social Club made
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game changer
- `post-0a8f804b` Cousins serves generous scoops
- `post-0a8f804b` Going elsewhere instead of waiting for Cousins is foolish
- `post-0a8f804b` Kavita and Marieke opened Cousins
- `post-0a8f804b` The Kaylin is a particular crowd favourite
- `post-0d484513` at India Club Restaurant traditional preparation methods meet high-quality ingredients
- `post-0d484513` NOUMI Sushi Lounge serves colorful noodles, sushi and cocktails
- `post-11f0057b` Reichenberger Straße in Kreuzberg has legendary status for mild summer evenings
- … 377 more in issues.jsonl

### parts.kind (385)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02556664` at the competition you eat exactly the same thing with limo…: opinion ≠ fact
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: verdict ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-0ac47c59` sales slowed down as the line shortened: fact ≠ opinion
- `review-1016bd13` planned to order more drinks on site as needed: fact ≠ opinion
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-170f36a3` the food is high in calories: opinion ≠ fact
- `review-1798cc23` two things were disappointing: opinion ≠ fact
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-1798cc23` the old listing including its reviews was simply continued: opinion ≠ change
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ change
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ new_item
- `review-36f2fac8` the line looks okay: opinion ≠ fact
- `review-36f2fac8` go to another authentic spot instead: verdict ≠ opinion
- `review-37daa9e9` tried the traditional beer Shifu and the rhubarb drink: fact ≠ new_item
- `review-3e075e7e` doesn't know what people are raving about: opinion ≠ fact
- `review-4cd140a3` once seated they got the menus and the food quickly: opinion ≠ fact
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-4cd140a3` the restaurant became packed: opinion ≠ change
- `review-4cd140a3` they had hoped for a nice date and a pleasant evening: opinion ≠ verdict
- `review-4cd140a3` it got fuller and therefore louder: opinion ≠ change
- `review-4cd140a3` they had to leave because it was unbearable: opinion ≠ verdict
- `review-5604a426` came yesterday expecting to enjoy a tasty broodje gemuse ke…: fact ≠ opinion
- `review-58540992` the reviewer does not want to be told off because someone e…: opinion ≠ fact
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-70467fba` the kebab was not worth waiting forever for: opinion ≠ verdict
- `review-71868223` recommends waiting in the queue at least once: verdict ≠ opinion
- `review-7483275e` the long wait was due to the service, not the queue itself: opinion ≠ fact
- `review-7483275e` the meat is a classic, basic chicken kebap: opinion ≠ fact
- `review-7483275e` first-time kebap eaters can find a much better kebap elsewh…: verdict ≠ opinion
- `review-7483275e` experienced kebap eaters can also find a better kebap elsew…: verdict ≠ opinion
- `review-7483275e` for Romans: the kebab is like any unpretentious kebab in Ro…: opinion ≠ fact
- … 345 more in issues.jsonl

### claims.subject (384)

- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: place ≠ city
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0fa29641` the author genuinely loves and keeps coming back to these s…: city ≠ none
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ city
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are washed-processed: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: none ≠ place
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: none ≠ place
- `post-1c78d4ed` The El Líbano espresso is Arabica: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ place
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-217c8e79` Bún chả was tested: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the schweinebulette is really nice and hot, Hanoi style: place ≠ none
- `post-217c8e79` Fischsoße is very popular in Vietnam: none ≠ city
- `post-217c8e79` the meat is grilled over charcoal: place ≠ none
- `post-217c8e79` the gegrillter Schweinebauch is delicious with grill aromas: place ≠ none
- `post-217c8e79` the grill aromas really come from the charcoal grill: place ≠ none
- `post-217c8e79` the dessert is the creator's favourite snack: place ≠ none
- `post-217c8e79` the dessert is super sweet but the creator loves it: place ≠ none
- `post-217c8e79` the dessert is eaten like a pudding, with Gele and rote Boh…: place ≠ none
- … 344 more in issues.jsonl

### claims.extra (326)

- `review-0ac47c59` the kebab was not prepared while we waited in line
- `review-1016bd13` first bus had 40 people
- `review-1016bd13` each table had 6 bottles of beer
- `review-1016bd13` soup arrived quickly
- `review-1016bd13` cold dishes were already laid out
- `review-356e149a` is Arab
- `review-71868223` they were very hungry
- `review-7593dfff` the sauces were nicely balanced
- `review-88fe4146` friend and I were about to sit down together
- `review-88fe4146` refused the one-person table
- `review-99fbc478` had to eat outside in the evening
- `review-a6b69e2b` Burgermaister did not refund the order
- `post-01239695` the girl did very well
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` good morning and have a nice, successful day
- `post-047130f4` the article is about pizza
- `post-047130f4` pizza is eaten at any time of day or night
- `post-047130f4` the concept is simple
- `post-047130f4` they serve pizza
- `post-047130f4` they make their pizza for staff meals
- `post-047130f4` the restaurant had an old pizza oven
- `post-047130f4` it used to be Italian
- `post-047130f4` they want to go to beer events and festivals next summer
- `post-0a8f804b` none of their flavors are boring
- `post-0a8f804b` the Kaylin feels both bold and subtle
- `post-0dde5eb7` the meal makes them happy with little else needed
- `post-0fa29641` the post is a Berlin guide for Kreuzberg
- `post-0fa29641` the spots are tagged for saving later
- `post-1c0d4023` the selection and order are based on the number of independent editorial recommendations
- `post-1c0d4023` the data is aggregated from publicly available recommendations without guarantee
- `post-1c25f2d1` the creator visited Wochenmarkt Karl-August-Platz
- `post-1c25f2d1` the creator says to say hi from them when you go
- `post-1ca1ffee` the steak came with chimichurri
- `post-1ca1ffee` the place is cool
- `post-1ca1ffee` the creator thanks the place
- `post-1ca1ffee` the place is awesome
- `post-1d0aeaca` Die Eismacher is an ice cream shop
- `post-1d0aeaca` Die Eismacher makes ice cream with quirky and unbridled Berlin personality
- `post-1d0aeaca` the best and strangest flavors haven’t been discovered yet
- … 286 more in issues.jsonl

### parts.sentiment (325)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: positive ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-037bbe20` the venue is unique: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-1016bd13` planned to order more drinks on site as needed: neutral ≠ negative
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ positive
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: positive ≠ negative
- `review-1798cc23` two things were disappointing: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-27722511` there are better kebabs in Berlin: negative ≠ positive
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-35fe7952` the free Turkish black tea is no longer offered: negative ≠ neutral
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-36f2fac8` not a place where you will have a good döner experience: negative ≠ positive
- `review-3bab8289` the service from the staff could have been better: negative ≠ mixed
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3e075e7e` doesn't know what people are raving about: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ neutral
- `review-41d8256f` the Pommes were sort of okay: mixed ≠ neutral
- `review-4a46a87d` the new location isn't the same as the old one: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` once seated they got the menus and the food quickly: positive ≠ neutral
- `review-4cd140a3` they had hoped for a nice date and a pleasant evening: negative ≠ positive
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-58540992` the reviewer does not want to be told off because someone e…: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- … 285 more in issues.jsonl

### claims.place (175)

- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: Pastaia ≠ Pastaia Pizzeria Spandau
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: Pastaia ≠ Pastaia Pizzeria Spandau
- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: Magma ≠ Fuerst Wiacek
- `post-217c8e79` the creator has been loyal to the restaurant for years: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the creator eats there regularly: Dong Xuan Center ≠ El Kampinski
- `post-22c25ac1` the restaurant in Mitte has new owners: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satis…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three women's food truly opens every heart: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Manufaktur has a daily changing offering: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-2a8e9606` at the Café im Haus am Waldsee the large group tables are t…: Café im Haus am Waldsee ≠ Café Benjamine
- `post-31344bc5` Common has 5 creator recommendations: Common ≠ Cookies Cream
- `post-31344bc5` Common is trending: Common ≠ Cookies Cream
- `post-31344bc5` Cookies Cream is trending among creator picks: Cookies Cream ≠ Stoke
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-3a0ad71a` FACIL is listed by editors and guides: FACIL ≠ Rram
- `post-3a0ad71a` Hanuman Thai Curry House stands for Thai cuisine: Hanuman Thai Curry House ≠ Rram
- `post-3a0ad71a` Le Faubourg offers four new Signature Cocktails on its terr…: Le Faubourg ≠ Le Faubourg Charlottenburg
- … 135 more in issues.jsonl

### parts.amount (60)

- `review-1016bd13` the group was 120 people: —  ≠ 120 money
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 6 money
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` reserved 15 tables in total: —  ≠ 15 money
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: —  ≠ 4 money
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: —  ≠ 1 money
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-2c7253a2` arrived around 5 PM: —  ≠ 5 minutes
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 8 minutes
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ —
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-020c68fb` about ten different birre to taste, not bad: —  ≠ 10 money
- `post-0216fd1d` Neukölln has places to eat well and cheaply: —  ≠ 6 money
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 5.5 minutes
- `post-3a0ad71a` Yumcha Heroes is open Wed-Sun 12-18: —  ≠ 18 minutes
- `post-421f8a5b` the sandos are available from tomorrow at 14:00 at Scharnwe…: —  ≠ 14 minutes
- `post-45841578` Aroma is one of the most authentic dumpling shops in Berlin: —  ≠ 3 money
- `post-45841578` dumplings at Aroma start from 3 euros: 3 money ≠ 1 money
- `post-45dafb41` the pizza with Burrata, Mortadella, roasted pine nuts and l…: 17 money ≠ —
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: —  ≠ 5 money
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-816a40e7` the restaurant opens at 13:00 on Friday: —  ≠ 13 minutes
- `post-875be07a` entry to the Street Food Market at Markthalle Neun is free: —  ≠ 5 money
- `post-9223f335` Gercek Chicken's 30-year anniversary celebration continues …: —  ≠ 30 money
- `post-93526d04` they rate Kaffee Peri 7 out of 10: —  ≠ 7 money
- `post-935c2fd2` restaurant revenue in Germany fell by 4 percent according t…: —  ≠ 4 money
- `post-93ac6d3b` Birds in the Kitchen serves burgers that guests rate five s…: —  ≠ 5 money
- `post-93ac6d3b` Kírkē Deli has a perfect five-star rating: —  ≠ 5 money
- `post-93ac6d3b` 100 GRAMM Lounge scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Beavis Bar also scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Augusta am Savignyplatz has 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` La Miche has full marks, five stars: —  ≠ 4.9 money
- … 20 more in issues.jsonl

### places.extra (59)

- `post-047130f4` a french restaurant
- `post-047130f4` an Italian
- `post-047130f4` french restaurant
- `post-047130f4` Italian
- `post-0bf8447d` Pastaia Pizzeria Spandau
- `post-0dde5eb7` Ristorante Bocca Felice
- `post-0fa29641` Five Elephant
- `post-0fa29641` VOO Store
- `post-0fa29641` Antonia Lingemann
- `post-0fa29641` König Galerie
- `post-0fa29641` Westberlin
- `post-0fa29641` Barra Val
- `post-0fa29641` Yummy Vintage
- `post-0fa29641` Ingwer
- `post-0fa29641` Annelies
- `post-0fa29641` Original Feelings Studio
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c25f2d1` Wochenmarkt Karl-August-Platz
- `post-1c78d4ed` We Roast Coffee Berlin
- `post-217c8e79` El Kampinski
- `post-233389f4` an Indian restaurant
- `post-3a0ad71a` Rogacki
- `post-3a0ad71a` la piccola gelateria
- `post-3a0ad71a` Juit
- `post-3a0ad71a` Le Faubourg Charlottenburg
- `post-483d6cc6` Love at first Bite
- `post-48e30fa6` Kaufland Oranienburg
- `post-48e30fa6` Trabrennbahn Karlshorst
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-60ff28c2` Sandos
- `post-67af1ad6` vvecafe
- `post-68b0cd44` Panda Meister Dumpling
- `post-7516d1de` Prince of Punjab
- `post-7516d1de` Bahadur Tandoori Grill & Currys
- `post-875be07a` KOMPLEX Berlin
- `post-875be07a` Street Food Market
- `post-8901fb9b` Mister Scott from Bonanza Coffee
- `post-8901fb9b` Boy
- … 19 more in issues.jsonl

### places.missed (57)

- `post-0bf8447d` Pastaia
- `post-1e024518` Masalas
- `post-217c8e79` Dong Xuan Center
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
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
- `post-48e30fa6` Gauchos del Gusto
- `post-4c3e2a10` The Cell
- `post-51a97d36` GIG Gastro
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-5b5671fa` City Chicken
- `post-66f606db` The Curried Cactus
- `post-66f606db` Mani in Pasta
- `post-66f606db` Abuya
- `post-66f606db` tacho
- `post-66f606db` Café Dufte
- … 17 more in issues.jsonl

### change.false (43)

- `review-1798cc23` the Google listing is no longer accurate
- `review-1798cc23` the old listing and reviews were simply continued
- `review-3486a0a9` Bun Society has become a new local favourite
- `review-3486a0a9` they'll add a vegetarian option for their chicken burgers
- `review-382cd7e9` they still want more money
- `review-4cd140a3` the service became worse as the evening went on
- `review-4cd140a3` the restaurant became very full
- `review-4cd140a3` the restaurant became more crowded
- `review-4cd140a3` the restaurant became louder
- `review-c5e1a090` I had much fewer strawberries
- `post-047130f4` it used to be Italian
- `post-2a8e9606` the relationship between the museum and the neighborhood has grown
- `post-31344bc5` Korean cuisine is growing steadily
- `post-31344bc5` the ramen trend is not slowing down
- `post-388b4383` the quality has stayed the same
- `post-3a0ad71a` YOU opens as a new concept of restaurant, bar and meeting place
- `post-3a0ad71a` YOU replaces the former Heritage
- `post-45dafb41` Monti has just opened
- `post-56bff2cf` the version at Dro is subtler
- `post-57ab8313` the place has become a fixture in the neighborhood after two years
- `post-57ab8313` the place keeps working to offer variety to Berlin diners
- `post-58a16831` the concept convinced the owners
- `post-59699006` the hotel opens this green window now
- `post-6b4377f6` the restaurant returns to regional ingredients
- `post-6b4377f6` the restaurant returns to traditional craftsmanship in cooking
- `post-6b4377f6` the menu changes weekly
- `post-6ddca88c` the Garibaldi became the signature drink right after opening
- `post-812c90d9` the seafood version costs 3€ more
- `post-8e94e7ea` sharing is no longer an option
- `post-93ac6d3b` Charlottenburg is experiencing a gastronomic revival
- `post-a3178d9e` the visit changed the creator's opinion on smashburgers positively
- `post-b5e879f0` Restaurant India has closed
- `post-b8d2bcf3` the flowers from Buchholz made the café interior merge with the garden Archipel
- `post-baac3611` 44 CHKN will open its third branch soon
- `post-baac3611` 44 CHKN is opening its 3rd branch soon
- `post-babe1142` the recipes will not be changed for health-conscious customers
- `post-cb785d0b` the bread has been perfected and baked by them every day since then
- `post-d1ab7367` Andy King is returning to Australia
- `post-d1ab7367` Josepha's short study trip became a lasting connection to Argentina
- `post-e2a421e9` the company is returning to its beginnings
- … 3 more in issues.jsonl

### match.brand (43)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-388b4383` Konnopke’s Imbiß: Konnopke's Imbiss ≠ none (none)
- `post-3a0ad71a` etwas. kleines: etwas. kleines ≠ none (other_city)
- `post-3a0ad71a` Hanuman Thai Curry House: Hanuman Thai Curry House ≠ none (other_city)
- `post-3a0ad71a` Grace Restaurant Bar: GRACE Restaurant & Bar ≠ none (other_city)
- `post-3a0ad71a` Kírkē Deli: Kírkē ≠ none (other_city)
- `post-3a0ad71a` Magma: Magma ≠ none (other_city)
- `post-3a0ad71a` Coffee Circle: Coffee Circle ≠ none (other_city)
- `post-3a0ad71a` Yumcha Heroes: Yumcha Heroes ≠ none (other_city)
- `post-3a0ad71a` YOU.Berlin: YOU. Berlin ≠ none (other_city)
- `post-3a0ad71a` Le Faubourg: Le Faubourg ≠ none (other_city)
- `post-3a0ad71a` Verōnika: Verōnika Berlin ≠ none (other_city)
- `post-3a0ad71a` Bar Clara: Bar Clara ≠ none (other_city)
- `post-3a0ad71a` Nyde: nyde ≠ none (other_city)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-3d9147ff` Schüsseldienst: Schüsseldienst - iss keine gewöhnliche Bowl! ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-483d6cc6` Love at First Bite: Love at first bite ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-78e0e15a` Gaffel Haus: Gaffel Haus Berlin - Das Kölsche Konsulat in der Hauptstadt ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- … 3 more in issues.jsonl

### match_isolated.brand (31)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2672e9fe` Delicia: none ≠ Cafe Delicias (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-388b4383` Curry & Chili: Curry und Chili ≠ none (none)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-58a16831` Bäckerei Johann: JOHANN Bäckerei ≠ none (none)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ L'Osteria (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ none (none)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### change.missed (17)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-7516d1de` Bahadur now operates as Prince of Punjab at the same address
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-b8d2bcf3` in July 2026 a new generation took over Bravo: Clemens Roesch, Eva Alken, Sören Zuppke an…
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-fc96acff` Facil has quietly gotten better

### match_isolated.branch (13)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - F-hain
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-5b5671fa` City Chicken: brand only ≠ Nhas City Chicken
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only

### match.branch (10)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2a8e9606` Michelberger Hotel: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-ad6a11c0` Bonanza: brand only ≠ Bonanza Coffee
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only
