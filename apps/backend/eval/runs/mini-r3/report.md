# Ingestion eval: mini-r3

2026-11-01 15:21 UTC · 169 reviews, 199 posts, 0 wordings · 503 cases left out (no reference or no output)
Tokens: 1,693,712
Models: review-claims: openai/gpt-5.4-mini (169); claim-parts: openai/gpt-5.4-mini (367); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (91)

## Reviews

| Metric | mini-r3 | stored | second-gpt54 | mini-v3 | mini-v2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% (929/968) | 93% +2 | 98% -2 | — | — |
| Claims that are real (of produced) | 99% (1203/1219) | 99% ±0 | 99% ±0 | — | — |
| Sentiment | 93% (962/1040) | 88% +5 | 98% -5 | — | — |
| Aspect, exact | 82% (854/1040) | 71% +11 | 84% -2 | — | — |
| Aspect, right root | 90% (935/1040) | 81% +9 | 88% +2 | — | — |
| Kind | 92% (952/1040) | 67% +25 | 97% -6 | — | — |
| Kind given at all | 98% (1040/1060) | 4% +94 | 100% -2 | — | — |
| Changes that are changes | 72% (13/18) | 56% +16 | 67% +6 | — | — |
| Changes found | 81% (13/16) | 80% +1 | 100% -19 | — | — |
| Amount | 76% (29/38) | 41% +35 | 87% -10 | — | — |
| Foods named, precision | 71% (272/384) | 32% +38 | 88% -17 | — | — |
| Foods named, recall | 67% (255/379) | 23% +44 | 80% -12 | — | — |

## Posts and articles

| Metric | mini-r3 | stored | second-gpt54 | mini-v3 | mini-v2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 85% (1772/2077) | 56% +30 | 85% ±0 | 82% +3 | 81% +4 |
| Claims that are real (of produced) | 88% (2395/2728) | 95% -7 | 92% -4 | 87% +1 | 81% +6 |
| Sentiment | 88% (2000/2270) | 86% +3 | 91% -3 | 87% +2 | 87% +2 |
| Aspect, exact | 63% (1428/2270) | 63% ±0 | 71% -8 | 60% +3 | 62% +1 |
| Aspect, right root | 76% (1726/2270) | 78% -2 | 83% -7 | 75% +1 | 76% ±0 |
| Kind | 84% (1914/2270) | 47% +38 | 88% -4 | 83% +1 | 82% +2 |
| Kind given at all | 100% (2270/2280) | 4% +96 | 100% ±0 | 100% ±0 | 98% +2 |
| Changes that are changes | 51% (33/65) | 46% +4 | 79% -28 | 51% ±0 | 54% -3 |
| Changes found | 66% (21/32) | 38% +28 | 60% +6 | 59% +6 | 66% ±0 |
| Amount | 47% (64/135) | 46% +1 | 40% +7 | 43% +4 | 59% -11 |
| Foods named, precision | 75% (922/1230) | 46% +29 | 73% +2 | 66% +9 | 63% +12 |
| Foods named, recall | 63% (873/1395) | 39% +24 | 68% -6 | 54% +9 | 54% +8 |
| Subject (place, city, none) | 88% (2310/2620) | 85% +3 | 94% -6 | 89% ±0 | 81% +7 |
| Claim on the right place | 91% (2020/2214) | 85% +7 | 97% -6 | 89% +2 | 89% +3 |
| Places found | 90% (391/433) | 73% +17 | 86% +4 | 89% +1 | 87% +4 |
| Places that are places | 92% (391/424) | 85% +7 | 94% -2 | 91% +1 | 90% +2 |
| Match: brand (found places) | 92% (361/391) | 92% +1 | 97% -5 | 93% -1 | 93% -1 |
| Match: branch (right brand) | 96% (301/314) | 97% -1 | 98% -2 | 96% ±0 | 95% +1 |
| Match on the reference's places: brand | 92% (400/433) | — | — | 92% ±0 | 93% -1 |
| Match on the reference's places: branch | 96% (328/342) | — | — | 96% ±0 | 97% -1 |
| Promotional flag | 78% (156/199) | 82% -4 | 69% +9 | 78% ±0 | 78% +1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-r3 (train) | mini-r3 (test) | second-gpt54 (test) | mini-v3 (test) | mini-v2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% | 96% (287/298) | 98% -1 | — | — |
| Claims that are real (of produced) | 98% | 99% (355/358) | 99% ±0 | — | — |
| Sentiment | 93% | 92% (288/313) | 98% -6 | — | — |
| Aspect, exact | 82% | 82% (257/313) | 84% -2 | — | — |
| Aspect, right root | 90% | 90% (281/313) | 88% +2 | — | — |
| Kind | 91% | 92% (288/313) | 97% -5 | — | — |
| Kind given at all | 99% | 95% (313/328) | 100% -5 | — | — |
| Changes that are changes | 69% | 100% (2/2) | 67% +33 | — | — |
| Changes found | 79% | 100% (2/2) | 100% ±0 | — | — |
| Amount | 83% | 67% (10/15) | 87% -20 | — | — |
| Foods named, precision | 71% | 71% (72/102) | 88% -18 | — | — |
| Foods named, recall | 71% | 60% (71/119) | 80% -20 | — | — |

### Posts and articles

| Metric | mini-r3 (train) | mini-r3 (test) | second-gpt54 (test) | mini-v3 (test) | mini-v2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 84% | 88% (535/606) | 85% +3 | 84% +5 | 88% +1 |
| Claims that are real (of produced) | 89% | 86% (733/853) | 92% -6 | 87% -1 | 84% +1 |
| Sentiment | 88% | 88% (627/711) | 91% -3 | 87% +1 | 86% +2 |
| Aspect, exact | 64% | 61% (433/711) | 71% -10 | 60% +1 | 62% -1 |
| Aspect, right root | 77% | 75% (532/711) | 83% -8 | 75% ±0 | 75% ±0 |
| Kind | 85% | 84% (596/711) | 88% -4 | 83% ±0 | 83% +1 |
| Kind given at all | 99% | 100% (711/713) | 100% ±0 | 100% ±0 | 99% +1 |
| Changes that are changes | 52% | 48% (10/21) | 79% -31 | 48% ±0 | 50% -2 |
| Changes found | 59% | 80% (8/10) | 60% +20 | 70% +10 | 80% ±0 |
| Amount | 40% | 67% (24/36) | 40% +27 | 69% -3 | 53% +14 |
| Foods named, precision | 75% | 75% (277/368) | 73% +2 | 73% +3 | 64% +12 |
| Foods named, recall | 64% | 60% (264/443) | 68% -9 | 54% +5 | 50% +10 |
| Subject (place, city, none) | 89% | 87% (702/804) | 94% -7 | 88% -1 | 81% +7 |
| Claim on the right place | 91% | 91% (608/668) | 97% -6 | 91% ±0 | 86% +5 |
| Places found | 92% | 85% (94/111) | 86% -2 | 84% +1 | 86% -1 |
| Places that are places | 94% | 88% (94/107) | 94% -6 | 87% +1 | 88% ±0 |
| Match: brand (found places) | 93% | 91% (86/94) | 97% -5 | 92% -1 | 92% ±0 |
| Match: branch (right brand) | 95% | 99% (71/72) | 98% +1 | 99% ±0 | 97% +1 |
| Match on the reference's places: brand | 93% | 92% (102/111) | — | 92% ±0 | 94% -2 |
| Match on the reference's places: branch | 96% | 96% (81/84) | — | 96% ±0 | 98% -1 |
| Promotional flag | 78% | 79% (46/58) | 69% +10 | 79% ±0 | 79% ±0 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 95% (368/388) | 99% (467/471) | 81% (329/407) | 93% (380/407) | — | — |
| hard | 81% (74/91) | 92% (92/100) | 72% (67/93) | 89% (83/93) | 100% (11/11) | 100% (11/11) |
| lang:de | 95% (334/350) | 99% (422/425) | 88% (330/373) | 93% (347/373) | — | — |
| lang:en | 96% (228/238) | 99% (293/297) | 81% (211/259) | 96% (248/259) | — | — |
| lang:other | 97% (303/313) | 98% (401/409) | 76% (263/344) | 90% (311/344) | — | — |
| lang:tr | 96% (64/67) | 99% (87/88) | 78% (50/64) | 88% (56/64) | — | — |
| length:long | 93% (274/294) | 97% (382/393) | 82% (254/310) | 91% (281/310) | — | — |
| length:medium | 97% (602/620) | 99% (763/767) | 81% (546/672) | 93% (625/672) | — | — |
| length:short | 98% (53/54) | 98% (58/59) | 93% (54/58) | 97% (56/58) | — | — |
| no-transcript | 92% (443/482) | 90% (577/644) | 70% (379/545) | 92% (499/545) | 96% (122/127) | 91% (111/122) |
| own | 92% (61/66) | 87% (103/118) | 73% (60/82) | 89% (73/82) | 100% (20/20) | 100% (20/20) |
| places:few | 88% (1311/1490) | 88% (1811/2049) | 66% (1117/1688) | 89% (1498/1688) | 86% (160/186) | 93% (148/160) |
| places:many | 78% (452/578) | 86% (572/664) | 53% (303/571) | 86% (492/571) | 93% (229/245) | 92% (211/229) |
| places:none | 100% (9/9) | 80% (12/15) | 73% (8/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 82% (878/1067) | 88% (1219/1385) | 57% (650/1133) | 86% (973/1133) | 83% (166/199) | 96% (160/166) |
| platform:google | 96% (929/968) | 99% (1203/1219) | 82% (854/1040) | 93% (962/1040) | — | — |
| platform:instagram | 92% (298/325) | 91% (392/432) | 73% (269/366) | 90% (328/366) | 94% (67/71) | 90% (60/67) |
| platform:tiktok | 87% (596/685) | 86% (784/911) | 66% (509/771) | 91% (699/771) | 97% (158/163) | 89% (141/158) |
| size:large | 84% (855/1016) | 89% (1195/1343) | 61% (666/1092) | 87% (949/1092) | 85% (162/191) | 95% (154/162) |
| size:medium | 84% (648/767) | 88% (820/930) | 61% (507/825) | 88% (728/825) | 94% (134/142) | 90% (121/134) |
| size:small | 91% (269/294) | 84% (380/455) | 72% (255/353) | 92% (323/353) | 95% (95/100) | 91% (86/95) |
| stars:1 | 96% (155/161) | 99% (212/215) | 79% (132/167) | 90% (150/167) | — | — |
| stars:2 | 96% (156/162) | 98% (201/206) | 81% (140/173) | 90% (155/173) | — | — |
| stars:3 | 96% (210/219) | 98% (258/262) | 78% (182/233) | 93% (217/233) | — | — |
| stars:4 | 95% (186/195) | 100% (251/252) | 89% (188/212) | 94% (199/212) | — | — |
| stars:5 | 96% (222/231) | 99% (281/284) | 83% (212/255) | 95% (241/255) | — | — |
| transcript | 85% (451/528) | 86% (599/699) | 67% (399/592) | 89% (528/592) | 96% (103/107) | 87% (90/103) |

## Misses

### parts.aspect (1028)

- `review-02d1586d` everything was very good: none ≠ vibe
- `review-0541b749` the frites were too salty: seasoning ≠ ingredient_quality
- `review-0541b749` the meat in the sandwich was chicken only: menu_variety ≠ ingredient_quality
- `review-070860ca` a very unhelpful and very angry man hung up on the reviewer: complaint_handling ≠ service
- `review-070860ca` had to reorder: order_accuracy ≠ service
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` all in all pretty okay: none ≠ vibe
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ food
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ food
- `review-1016bd13` none of the tables had a bottle opener: service ≠ order_accuracy
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ wait_for_food
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ wait_for_food
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: order_accuracy ≠ none
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: service ≠ price
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: speed_of_service ≠ wait_for_food
- `review-13683c42` Burgermeister is a chain of burger restaurants: ownership ≠ other
- `review-13683c42` the chain has several locations in Berlin: ownership ≠ other
- `review-13683c42` the price is similar to McDonald's: price_level ≠ price
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-164fbfea` ordered by app: takeaway_handling ≠ other
- `review-170f36a3` everything is awesome: none ≠ vibe
- `review-1798cc23` the menu, prices and cuisine differ from those in the listi…: menu_variety ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: food ≠ none
- `review-1798cc23` the service did not match the price: value_for_money ≠ price
- `review-196641fc` eating on site is possible: space ≠ dining_area
- `review-257f4791` we were a table of five French people: none ≠ crowding
- `review-257f4791` there were live musicians: atmosphere ≠ other
- `review-2799bbfa` Burgermeister all over is amazing: none ≠ other
- `review-2799bbfa` ordered 2 extra fleisch pattys for a single hamburger, 3 in…: order_accuracy ≠ food
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- `review-279b23c3` everything rated over 10: none ≠ other
- `review-279b23c3` Justin is the most important and gets a 13/10: service ≠ other
- `review-2c7253a2` the burger joint was less amazing than expected: none ≠ taste
- `review-2c7253a2` the burger joint is a unique local Berlin experience: atmosphere ≠ other
- `review-2c7253a2` the burger joint is converted from a public restroom: interior ≠ other
- `review-2d6d3829` the meat options are really excellent: taste ≠ ingredient_quality
- `review-3486a0a9` Bun Society has become a new local favourite: none ≠ other
- `review-3486a0a9` the fries are perfectly thin and crispy: cooking ≠ food
- … 988 more in issues.jsonl

### parts.foods (851)

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
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [啤酒]
- `review-1016bd13` none of the tables had a bottle opener: [] ≠ [啤酒]
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: [] ≠ [啤酒]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [酒水]
- `review-1104925b` the food is so, so delicious: [] ≠ [kebab]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- … 811 more in issues.jsonl

### parts.kind (444)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` Rüyam Gemüse Kebab was their choice on their first day in B…: fact ≠ verdict
- `review-02d1586d` the staff were very good: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-1016bd13` none of the tables had a bottle opener: opinion ≠ fact
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: opinion ≠ fact
- `review-16bdd5e0` they mixed up our sauces: opinion ≠ fact
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: opinion ≠ fact
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
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ new_item
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: opinion ≠ fact
- `review-436b38b2` staff barely reacted when the wrong order was pointed out: opinion ≠ fact
- `review-436b38b2` did not really feel attended to overall: opinion ≠ fact
- `review-4cd140a3` once seated they got the menus and the food quickly: opinion ≠ fact
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-4cd140a3` the restaurant became packed: opinion ≠ fact
- `review-4cd140a3` it got fuller and therefore louder: opinion ≠ change
- `review-503d63e2` one day the Acai machine was broken: opinion ≠ change
- `review-503d63e2` waited at the table at least 30 minutes until the order was…: opinion ≠ fact
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: opinion ≠ fact
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-5604a426` came yesterday expecting to enjoy a tasty broodje gemuse ke…: fact ≠ opinion
- … 404 more in issues.jsonl

### claims.extra (349)

- `review-0ac47c59` the long line was not because of the döner being prepared
- `review-1016bd13` first bus had 40 people
- `review-1016bd13` cold dishes were already laid out
- `review-1016bd13` hot dishes started at 7:05 PM
- `review-1016bd13` questioned whether the chefs were serving food that fast
- `review-1016bd13` questioned whether the chefs had three heads and six arms
- `review-356e149a` he is Arab
- `review-35fe7952` the Turkish black tea was free
- `review-3f2a2713` the year is 2026
- `review-510fc086` living in Berlin has advantages
- `review-6b917d41` the burger was mentioned
- `review-7483275e` Mustafa is like a no-frills kebab in Rome
- `review-7483275e` next time call it Alibabà
- `review-96daa0a9` young man had a beautiful beard
- `review-99fbc478` they had to eat outside in the evening
- `review-a2c14088` the water was not in a sealed plastic bottle or glass bottle
- `post-01239695` the unidentified girl "ATE"
- `post-01431335` the trip is worth saving
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` a good, successful day
- `post-0216fd1d` the guide is for Neukölln
- `post-0a8f804b` the flavors bring dishes and ingredients from around the world together in a unique way
- `post-0a8f804b` the Kaylin feels both bold and subtle
- `post-0a8f804b` Marieke says seeing the grumps smile gives her a brighter view of the world
- `post-0d484513` Smooches has artisanal quality
- `post-0dde5eb7` the dish is special
- `post-0fa29641` the post is a Berlin guide for Kreuzberg
- `post-0fa29641` the spots are tagged so the post can be saved for later
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-11f0057b` the venue is perfect for date nights
- `post-14d4fc29` Heimatliebe trifft Fernweh
- `post-1c0d4023` Nobelhart & Schmutzig is in Kreuzberg
- `post-1c0d4023` Nobelhart & Schmutzig serves German food
- `post-1c0d4023` Rutz Restaurant is in Mitte
- `post-1c0d4023` Rutz Restaurant is a bar
- `post-1c0d4023` Tulus Lotrek is in Kreuzberg
- `post-1c0d4023` Coda is in Neukoelln
- `post-1c0d4023` Coda is a bar
- … 309 more in issues.jsonl

### parts.sentiment (348)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` the staff were very good: positive ≠ neutral
- `review-07871fa7` all in all pretty okay: positive ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: positive ≠ neutral
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ positive
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ neutral
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` the kebab had loads of lemon: negative ≠ neutral
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-3639cae4` ate at the other branch two years ago and the kebab there w…: positive ≠ mixed
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: negative ≠ neutral
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3bab8289` the food is nothing extraordinary: negative ≠ neutral
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-41d8256f` the Pommes were sort of okay: mixed ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` once seated they got the menus and the food quickly: positive ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: negative ≠ neutral
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab: negative ≠ positive
- `review-693fb047` the Kebab was so-so: negative ≠ neutral
- `review-6b4df664` a small deduction for the service: negative ≠ mixed
- `review-6e97260b` the coca-cola sent in the delivery was warm: negative ≠ neutral
- … 308 more in issues.jsonl

### claims.missed (344)

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
- `review-5582d6b8` don't eat outside
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-5cd39af6` recommends the place to everyone
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-693fb047` the food was nothing special
- `review-693fb047` expected the best kebab but the kebab was only edible
- `review-70467fba` the kebab was good
- `review-7483275e` for Romans: the kebab is like any unpretentious kebab in Rome
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7a1ba6d7` the reviewer recommends the place
- `review-7f3142f7` the atmosphere is lively
- `review-80d9a747` loved the visit
- `review-937ea9e9` Sandos is simply outstanding
- `review-af8dacaa` the place is super
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-c117171d` the place is degrading
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-f51e95e9` everything was great
- `review-fb1415dc` the cleanliness and service issues are not that bad
- `review-feb41b4e` the reviewer has to agree with some of the criticism
- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- … 304 more in issues.jsonl

### claims.subject (310)

- `post-020c68fb` if you have never been to Markthalle Neun you cannot say yo…: place ≠ city
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: none ≠ place
- `post-047130f4` Nudja on pizza is absolutely delicious: none ≠ place
- `post-047130f4` salmon on pizza just doesn't work: none ≠ place
- `post-047130f4` tuna fish should not be eaten on pizza: none ≠ place
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0d484513` Berlin shows its artisanal side this week: city ≠ place
- `post-0d484513` creators are discovering new places off the mainstream in B…: city ≠ place
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-11f0057b` Reichenberger Straße in Kreuzberg has legendary status for …: city ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` whipped butter always works: place ≠ none
- `post-11f0057b` the whipped butter is refined with Maldon salt: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ none
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: place ≠ none
- `post-11f0057b` a date night at Magma is better without hearing about the l…: place ≠ none
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ none
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ city
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: place ≠ none
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are washed-processed: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: none ≠ place
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: none ≠ place
- `post-1c78d4ed` The El Líbano espresso is Arabica: none ≠ place
- … 270 more in issues.jsonl

### claims.place (194)

- `post-0d484513` CeeCee's review of Smooches is enthusiastic: Smooches ≠ Kissabo
- `post-0d484513` CeeCee's review of Kissabo is enthusiastic: Kissabo ≠ India Club Restaurant
- `post-0d484513` CeeCee's review of India Club Restaurant is enthusiastic: India Club Restaurant ≠ Café Ploetz
- `post-0d484513` CeeCee's review of Café Ploetz is enthusiastic: Café Ploetz ≠ Dufte Berlin
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: Dufte ≠ Paule’s Metal Eck
- `post-0d484513` Paule’s Metal Eck is a loud, unpolished rock bar: Paule’s Metal Eck ≠ NOUMI Sushi Lounge Berlin
- `post-11f0057b` the butter is served with wheat sourdough bread from Albatr…: Magma ≠ Albatross Bäckerei
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: Hallmann & Klee ≠ Otto
- `post-1c0d4023` Otto has a Google rating of 4.6 stars: Otto ≠ Hallmann & Klee
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satis…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2a8e9606` Ilona Scholl is the host at Tulus Lotrek: Tulus Lotrek ≠ none
- `post-2a8e9606` Tulus Lotrek is perhaps the most vibrant restaurant in the …: Tulus Lotrek ≠ none
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: Schwarzes Kamel ≠ Landmann
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: Schwarzes Kamel ≠ Landmann
- `post-2a8e9606` Markus Mahla and Jasmin Hein run the Café im Haus am Waldsee: Café im Haus am Waldsee ≠ Café Benjamine
- … 154 more in issues.jsonl

### parts.amount (80)

- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` waited in line a little over an hour: 60 minutes ≠ —
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-1798cc23` the service did not match the price: —  ≠ 20 money
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ —
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-dcd4db39` the meal was ready just 5-10 minutes after ordering: 10 minutes ≠ 5 minutes
- `post-0a8f804b` Early visitors are told to come back in an hour: 60 minutes ≠ —
- `post-0d1e7abc` Isla is not new but still hot: —  ≠ 10 minutes
- `post-0d1e7abc` Isla is one of the author's old favourite spots: —  ≠ 10 minutes
- `post-0d1e7abc` Isla has existed for 10 years: —  ≠ 10 minutes
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: —  ≠ 7 money
- `post-1c0d4023` Rutz Restaurant has a Google rating of 4.6 stars: —  ≠ 4.6 money
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Tulus Lotrek has a Google rating of 4.8 stars: —  ≠ 4.8 money
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Coda has a Google rating of 4.7 stars: —  ≠ 4.7 money
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Hallmann & Klee has a Google rating of 4.6 stars: —  ≠ 4.6 money
- `post-1c0d4023` Otto is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Otto has a Google rating of 4.6 stars: —  ≠ 4.6 money
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-24601e6d` the €48 ticket includes three drinks: —  ≠ 3 money
- `post-24601e6d` you choose two drinks inside the ice bar and one outside: —  ≠ 3 money
- `post-2a8e9606` Landmann serves a glass of Sekt or a Pfiff, a small Bier, f…: —  ≠ 15 minutes
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: —  ≠ 15 minutes
- `post-2a8e9606` the Michelberger Hotel started in 2009: —  ≠ 2009 minutes
- `post-31344bc5` Cookies Cream has 5 creator recommendations: —  ≠ 5 money
- `post-31344bc5` Cookies Cream is rated 4.7 stars: —  ≠ 4.7 money
- `post-31344bc5` Stoke has 5 creator recommendations: —  ≠ 5 money
- … 40 more in issues.jsonl

### places.missed (42)

- `post-1e024518` Masalas
- `post-2a8e9606` Pluto
- `post-2a8e9606` Starbucks
- `post-3a0ad71a` etwas. kleines
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
- `post-45dafb41` Jolesch
- `post-48e30fa6` Gauchos del Gusto
- `post-56bff2cf` 8000 Vintages
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-63b83025` Restaurant Athen
- `post-6b4377f6` Mraz & Sohn
- `post-6b4377f6` Nobelhart & Schmutzig
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Bonanza Coffee
- `post-8901fb9b` Papaya
- `post-9f93c25b` Mine
- `post-b8d2bcf3` Otto
- `post-b8d2bcf3` Trio
- `post-b8d2bcf3` Pluto
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO
- `post-e2a421e9` Rogacki
- `post-e2a421e9` Rram
- `post-e62d3c39` Otto
- `post-e62d3c39` Trio
- `post-e62d3c39` Pluto
- `post-e62d3c39` The Barn
- `post-fc96acff` Hallmann & Klee
- `post-fc96acff` Lorenz Adlon Esszimmer
- `post-fc96acff` Birds in the Kitchen
- … 2 more in issues.jsonl

### change.false (37)

- `review-1798cc23` the old listing and reviews were simply continued
- `review-3486a0a9` Bun Society has become a new local favourite
- `review-4cd140a3` the service got worse over the evening
- `review-4cd140a3` it got more full and louder
- `review-503d63e2` the Acai machine was broken one day
- `post-047130f4` they put Hawaiian pizza on the menu
- `post-22c25ac1` the manufactory is now open
- `post-2a8e9606` the museum and the neighborhood relationship has clearly grown
- `post-2b231637` Tribeca Ice Cream has a second branch in Graefekiez
- `post-3a0ad71a` YOU is a new concept with restaurant, bar and meeting place instead of Heritage
- `post-3e56e67d` everything is finished now
- `post-674e7322` Mrs. Robinsons is closed
- `post-7516d1de` Bahadur is now Prince of Punjab
- `post-75c11d7c` Nichi Getsu opened in June 2026
- `post-75c11d7c` during the day the focus shifts to bara chirashi
- `post-816a40e7` the venue is a new opening
- `post-8d8803aa` ORA is hiring a new Chef de Partie starting in November 2026
- `post-8e94e7ea` a small snack turned into a full meal
- `post-8e94e7ea` sharing is no longer an option
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-b8d2bcf3` the café serves a weekly changing lunch
- `post-baac3611` 44 CHKN is opening its third branch soon
- `post-babe1142` Enrico is developing the gelato
- `post-babe1142` the spiciness of the gelato is being adjusted
- `post-babe1142` the owner will not change the recipes for a health-conscious crowd
- `post-c4e7c0a9` seasonal dishes change regularly
- `post-cb785d0b` tomorrow they will only offer döner with chicken or homemade falafel
- `post-cb785d0b` there will be no dürüm
- `post-d1ab7367` Andy King is returning to Australia to start a new chapter there
- `post-d1ab7367` Vinos (Naturales) keeps the Eastern European focus of the shop
- `post-d1ab7367` the identity should be expanded with wines from Argentina and Chile
- `post-d1ab7367` Josepha wants to add more female winemakers to the assortment
- `post-e2a421e9` Lindner is reverting to its old name
- `post-fc96acff` Facil has not lost its glamour at 25
- `post-fe3794c9` this year SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin in Mi…
- `post-fe3794c9` SpreeWiesn got its own area for the season
- `post-fe3794c9` the move to the upper floor made it more weatherproof and logistically optimized

### places.extra (33)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c78d4ed` Col-Spirit
- `post-233389f4` an Indian restaurant
- `post-3a0ad71a` Rogacki
- `post-48e30fa6` Kaufland Oranienburg
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-63b83025` Restaurant Athen Adlershof
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-7516d1de` Bahadur – Tandoori Grill & Currys
- `post-816a40e7` Surich Kurdish Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-8901fb9b` Tacos
- `post-93526d04` Süd Baklava
- `post-93526d04` Baklava Laden
- `post-9f93c25b` Main
- `post-aa137bfa` TITANIC Gendarmenmarkt Berlin
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-ad6a11c0` Korean restaurant
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt
- `post-b5e879f0` Bäcker nebenan
- `post-cecea20e` Bikini Berlin
- `post-d1ab7367` Natural Selection
- `post-d232f1ca` BRLO Beer
- `post-f0fb51e5` Hackescher Markt
- `post-fe3794c9` SpreeWiesn

### match_isolated.brand (33)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Duo Sicilian Ice Cream: Duo Sicilian Ice Cream ≠ Duo Sicilian Ice Cream (llm)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ LOTTA Tagesbar (llm)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### match.brand (30)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-3d9147ff` Schüsseldienst: Schüsseldienst - iss keine gewöhnliche Bowl! ≠ none (none)
- `post-40f86f07` Amo Café: none ≠ ama Café (llm)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### change.missed (14)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` the Döner was improved day by day since the start, from vegetables to bread
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen

### match_isolated.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-1c0d4023` Michelberger Restaurant: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - Schöneberg
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only

### match.branch (13)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Prenzlauer Berg
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
