# Ingestion eval: mini-base-2

2026-11-02 09:22 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output) · 3 sources dropped by the agents (scored as nothing read)
Tokens: 1,191,863
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (367); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (91)

## Reviews

| Metric | mini-base-2 | stored | mini-base | one-v1 | one-v2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% (926/978) | 93% +1 | 96% -1 | 98% -3 | 98% -3 |
| Claims that are real (of produced) | 99% (1224/1238) | 99% ±0 | 99% ±0 | 98% +1 | 98% ±0 |
| Sentiment | 92% (973/1055) | 88% +5 | 91% +1 | 92% ±0 | 93% -1 |
| Aspect, exact | 76% (797/1055) | 71% +5 | 77% -2 | 80% -4 | 82% -7 |
| Aspect, right root | 84% (888/1055) | 81% +3 | 87% -3 | 90% -6 | 91% -7 |
| Kind | 89% (935/1055) | 67% +22 | 88% ±0 | 94% -6 | 95% -6 |
| Kind given at all | 100% (1055/1060) | 4% +96 | 99% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 73% (11/15) | 56% +17 | 52% +21 | 58% +15 | 55% +18 |
| Changes found | 69% (11/16) | 80% -11 | 81% -12 | 75% -6 | 81% -12 |
| Amount | 64% (29/45) | 41% +23 | 69% -5 | 63% +1 | 73% -8 |
| Foods named, precision | 66% (273/413) | 32% +34 | 71% -4 | 75% -9 | 76% -9 |
| Foods named, recall | 66% (252/383) | 23% +43 | 68% -2 | 86% -20 | 86% -20 |

## Posts and articles

| Metric | mini-base-2 | stored | mini-base | one-v1 | one-v2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 74% (1545/2077) | 56% +19 | 75% -1 | 86% -11 | 86% -12 |
| Claims that are real (of produced) | 91% (2032/2222) | 95% -3 | 94% -2 | 88% +3 | 86% +5 |
| Sentiment | 89% (1669/1873) | 86% +4 | 88% +1 | 90% -1 | 89% ±0 |
| Aspect, exact | 51% (959/1873) | 63% -12 | 49% +2 | 65% -14 | 70% -19 |
| Aspect, right root | 77% (1448/1873) | 78% ±0 | 73% +4 | 83% -6 | 86% -8 |
| Kind | 85% (1585/1873) | 47% +38 | 86% -1 | 87% -3 | 87% -3 |
| Kind given at all | 100% (1873/1876) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 40% (21/53) | 46% -7 | 53% -14 | 49% -9 | 41% -1 |
| Changes found | 41% (13/32) | 38% +3 | 38% +3 | 63% -22 | 66% -25 |
| Amount | 65% (64/98) | 46% +19 | 53% +12 | 74% -9 | 71% -6 |
| Foods named, precision | 78% (990/1276) | 46% +31 | 74% +3 | 74% +3 | 73% +5 |
| Foods named, recall | 72% (929/1288) | 39% +33 | 68% +4 | 82% -10 | 83% -11 |
| Subject (place, city, none) | 87% (1887/2175) | 85% +2 | 84% +3 | 91% -5 | 90% -4 |
| Claim on the right place | 91% (1601/1769) | 85% +6 | 90% ±0 | 92% -1 | 92% -2 |
| Places found | 83% (358/433) | 73% +10 | 81% +1 | 87% -5 | 88% -6 |
| Places that are places | 92% (358/389) | 85% +7 | 92% ±0 | 91% +1 | 91% +1 |
| Match: brand (found places) | 92% (329/358) | 92% ±0 | 92% ±0 | 93% -1 | 91% +1 |
| Match: branch (right brand) | 94% (272/288) | 97% -3 | 96% -1 | 96% -2 | 94% ±0 |
| Match on the reference's places: brand | 93% (328/351) | — | 93% ±0 | 93% +1 | 92% +2 |
| Match on the reference's places: branch | 96% (269/280) | — | 96% ±0 | 96% ±0 | 95% +1 |
| Promotional flag | 79% (157/199) | 82% -3 | 79% ±0 | 78% +1 | 79% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-base-2 (train) | mini-base-2 (test) | mini-base (test) | one-v1 (test) | one-v2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% | 94% (281/298) | 97% -3 | 98% -3 | 97% -2 |
| Claims that are real (of produced) | 99% | 100% (366/367) | 99% +1 | 99% ±0 | 99% ±0 |
| Sentiment | 92% | 92% (296/323) | 92% -1 | 91% +1 | 93% -1 |
| Aspect, exact | 75% | 76% (247/323) | 77% ±0 | 78% -2 | 79% -3 |
| Aspect, right root | 83% | 86% (278/323) | 87% -1 | 89% -3 | 88% -2 |
| Kind | 88% | 91% (294/323) | 91% ±0 | 95% -4 | 96% -5 |
| Kind given at all | 99% | 100% (323/323) | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 69% | 100% (2/2) | 40% +60 | 40% +60 | 40% +60 |
| Changes found | 64% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 60% | 73% (11/15) | 81% -8 | 72% +1 | 82% -9 |
| Foods named, precision | 66% | 67% (82/122) | 78% -11 | 76% -9 | 76% -9 |
| Foods named, recall | 68% | 62% (76/123) | 70% -8 | 83% -21 | 82% -20 |

### Posts and articles

| Metric | mini-base-2 (train) | mini-base-2 (test) | mini-base (test) | one-v1 (test) | one-v2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 75% | 72% (437/606) | 72% ±0 | 91% -18 | 90% -18 |
| Claims that are real (of produced) | 90% | 95% (581/609) | 96% ±0 | 91% +4 | 85% +11 |
| Sentiment | 88% | 91% (493/542) | 92% -1 | 90% ±0 | 89% +2 |
| Aspect, exact | 51% | 51% (279/542) | 51% +1 | 62% -11 | 67% -16 |
| Aspect, right root | 77% | 77% (419/542) | 76% +2 | 80% -3 | 82% -5 |
| Kind | 83% | 87% (474/542) | 89% -2 | 86% +1 | 86% +1 |
| Kind given at all | 100% | 99% (542/545) | 100% ±0 | 100% -1 | 100% -1 |
| Changes that are changes | 46% | 21% (3/14) | 45% -24 | 50% -29 | 34% -13 |
| Changes found | 45% | 30% (3/10) | 30% ±0 | 70% -40 | 70% -40 |
| Amount | 59% | 80% (24/30) | 69% +11 | 72% +8 | 64% +16 |
| Foods named, precision | 76% | 82% (303/369) | 78% +5 | 72% +10 | 72% +10 |
| Foods named, recall | 72% | 73% (286/391) | 67% +6 | 80% -6 | 85% -12 |
| Subject (place, city, none) | 88% | 83% (516/624) | 85% -2 | 91% -8 | 91% -8 |
| Claim on the right place | 91% | 88% (421/477) | 84% +4 | 88% ±0 | 89% -1 |
| Places found | 84% | 80% (89/111) | 78% +2 | 84% -4 | 90% -10 |
| Places that are places | 94% | 86% (89/103) | 85% +1 | 88% -1 | 85% +2 |
| Match: brand (found places) | 92% | 91% (81/89) | 90% +1 | 90% +1 | 90% +1 |
| Match: branch (right brand) | 94% | 96% (65/68) | 97% -1 | 99% -3 | 96% ±0 |
| Match on the reference's places: brand | 94% | 90% (64/71) | 93% -3 | 93% -3 | 91% -1 |
| Match on the reference's places: branch | 96% | 98% (48/49) | 95% +3 | 96% +1 | 95% +3 |
| Promotional flag | 77% | 83% (48/58) | 81% +2 | 79% +3 | 83% ±0 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 94% (364/389) | 99% (470/474) | 75% (313/417) | 95% (397/417) | — | — |
| hard | 86% (78/91) | 93% (99/106) | 63% (59/94) | 94% (88/94) | 100% (11/11) | 100% (11/11) |
| lang:de | 93% (333/359) | 99% (427/433) | 78% (288/369) | 93% (345/369) | — | — |
| lang:en | 95% (227/239) | 100% (297/298) | 75% (196/260) | 93% (242/260) | — | — |
| lang:other | 96% (302/313) | 98% (407/414) | 71% (245/345) | 91% (315/345) | — | — |
| lang:tr | 96% (64/67) | 100% (93/93) | 84% (68/81) | 88% (71/81) | — | — |
| length:long | 96% (281/294) | 98% (410/417) | 75% (251/336) | 90% (301/336) | — | — |
| length:medium | 94% (589/627) | 99% (754/761) | 75% (493/658) | 93% (613/658) | — | — |
| length:short | 98% (56/57) | 100% (60/60) | 87% (53/61) | 97% (59/61) | — | — |
| no-transcript | 93% (446/482) | 90% (591/658) | 55% (301/546) | 90% (493/546) | 96% (122/127) | 91% (111/122) |
| own | 91% (60/66) | 87% (97/112) | 62% (47/76) | 89% (68/76) | 100% (20/20) | 100% (20/20) |
| places:few | 74% (1098/1490) | 94% (1505/1606) | 54% (724/1341) | 90% (1202/1341) | 82% (153/186) | 92% (140/153) |
| places:many | 76% (438/578) | 86% (515/602) | 44% (228/521) | 88% (456/521) | 83% (203/245) | 92% (187/203) |
| places:none | 100% (9/9) | 86% (12/14) | 64% (7/11) | 100% (11/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 64% (679/1067) | 93% (855/924) | 45% (359/805) | 87% (699/805) | 69% (138/199) | 96% (133/138) |
| platform:google | 95% (926/978) | 99% (1224/1238) | 76% (797/1055) | 92% (973/1055) | — | — |
| platform:instagram | 92% (300/325) | 91% (399/438) | 58% (212/364) | 89% (325/364) | 94% (67/71) | 90% (60/67) |
| platform:tiktok | 83% (566/685) | 90% (778/860) | 55% (388/704) | 92% (645/704) | 94% (153/163) | 89% (136/153) |
| size:large | 66% (675/1016) | 93% (859/923) | 47% (376/804) | 87% (699/804) | 69% (132/191) | 95% (125/132) |
| size:medium | 77% (590/767) | 94% (776/825) | 52% (369/703) | 91% (637/703) | 93% (132/142) | 91% (120/132) |
| size:small | 95% (280/294) | 84% (397/474) | 58% (214/366) | 91% (333/366) | 94% (94/100) | 89% (84/94) |
| stars:1 | 98% (157/161) | 97% (217/224) | 70% (132/188) | 93% (174/188) | — | — |
| stars:2 | 97% (157/162) | 99% (212/214) | 76% (133/176) | 91% (161/176) | — | — |
| stars:3 | 96% (210/219) | 100% (275/276) | 72% (170/236) | 90% (212/236) | — | — |
| stars:4 | 91% (186/204) | 99% (242/244) | 80% (167/210) | 93% (195/210) | — | — |
| stars:5 | 93% (216/232) | 99% (278/280) | 80% (195/245) | 94% (231/245) | — | — |
| transcript | 80% (420/528) | 92% (586/640) | 57% (299/522) | 91% (477/522) | 92% (98/107) | 87% (85/98) |

## Misses

### parts.aspect (1172)

- `review-019a8099` a very nice restaurant: none ≠ atmosphere
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: queue ≠ wait
- `review-02556664` at the competition you eat exactly the same thing with limo…: none ≠ authenticity
- `review-02d1586d` everything was very good: none ≠ vibe
- `review-02d1586d` the staff were very good: service ≠ friendliness
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the pain was quickly made, nothing special: food ≠ none
- `review-070860ca` received a refund: complaint_handling ≠ billing
- `review-070860ca` had to reorder: order_accuracy ≠ none
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: food ≠ taste
- `review-0ac47c59` waited in line a little over an hour: queue ≠ wait
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ service
- `review-0ac47c59` the chicken meat was in the döner: food ≠ ingredient_quality
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: on_the_house ≠ drinks
- `review-1016bd13` large groups should avoid this place: occasion ≠ space
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: drinks ≠ order_accuracy
- `review-1016bd13` planned to order more drinks on site as needed: drinks ≠ menu_variety
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: reservation_handling ≠ none
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: reservation_handling ≠ none
- `review-1016bd13` the restaurant said the cold dishes were already set out: service ≠ none
- `review-1016bd13` the soup was served quickly on arrival: wait_for_food ≠ none
- `review-1016bd13` none of the tables had a bottle opener: service ≠ order_accuracy
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: wait_for_food ≠ speed_of_service
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: wait_for_food ≠ speed_of_service
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ attentiveness
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ availability
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: wait_for_food ≠ speed_of_service
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: pressure ≠ advice
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: pressure ≠ speed_of_service
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: occasion ≠ none
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: presentation ≠ portion_size
- `review-1798cc23` the Google listing is no longer accurate: other ≠ ownership
- `review-1798cc23` the menu, prices and cuisine differ from those in the listi…: other ≠ ownership
- `review-1798cc23` the cuisine is now Afghan instead of Persian: menu_variety ≠ ownership
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ ownership
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ price
- `review-1798cc23` one of the three Bier bottles looked different: drinks ≠ order_accuracy
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ none
- … 1132 more in issues.jsonl

### parts.foods (750)

- `review-0217fd90` the soup was really incredibly good: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was really incredibly good: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ []
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ []
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ []
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [viande, poulet]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato, potato]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [potato]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, döner]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [meat, chicken meat]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [lettuce, tomatoes, onions, lettuce, tomatoes, onions]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea, tea]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [meat, chicken meat]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [lettuce, tomatoes, onions]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [lettuce]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [tomatoes, onions]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer, cola, orange juice, beer]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup, soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [drinks]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [drinks]
- … 710 more in issues.jsonl

### claims.missed (584)

- `review-0217fd90` very delicious
- `review-02556664` go to the competition instead
- `review-070860ca` the reviewer is not happy
- `review-07871fa7` all in all pretty okay
- `review-0ac47c59` found nothing to praise about the place
- `review-16bdd5e0` would not recommend
- `review-16bdd5e0` definitely not worth the time
- `review-170f36a3` everything is awesome
- `review-170f36a3` the atmosphere has vibes
- `review-170f36a3` the service is fast
- `review-170f36a3` the food is really tasty
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the kebab experts ignore guests' questions
- `review-21de844d` there are far better cafés in Berlin than this one
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-3e075e7e` doesn't know what people are raving about
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-69365171` had the Büffet from 12-15 Uhr for 16,50€
- `review-69365171` very good selection of food and desserts
- `review-69365171` value for money is ok
- `review-69365171` staff very friendly
- `review-69365171` we will come back
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7d7ef8ca` the food is super delicious
- `review-7d7ef8ca` the food is a bit pricey
- `review-7d7ef8ca` it was still a very great experience
- `review-7d7ef8ca` you need to allow some time, even on weekdays
- `review-7d7ef8ca` waited almost 40 minutes for the food
- `review-7d7ef8ca` drinks arrive faster
- `review-7d7ef8ca` the drinks are almost empty again by the time the food arrives
- `review-7f3142f7` the website's ticket information is very misleading
- `review-80d9a747` loved the visit
- `review-80d9a747` would highly recommend the place
- `review-90e99b19` staff clearing the reviewer's table left the dishcloth on the table
- `review-937ea9e9` Sandos is simply outstanding
- … 544 more in issues.jsonl

### parts.kind (408)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` Rüyam Gemüse Kebab was their choice on their first day in B…: fact ≠ verdict
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: verdict ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-0541b749` the pain was quickly made, nothing special: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-0ac47c59` the line didn't move: opinion ≠ fact
- `review-0ac47c59` asking a question in Turkish gets a 'no Turkish' answer: opinion ≠ fact
- `review-0c8b6a9b` the visit was a great experience: opinion ≠ event
- `review-1016bd13` none of the tables had a bottle opener: opinion ≠ fact
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-16bdd5e0` they mixed up our sauces: opinion ≠ fact
- `review-16bdd5e0` my sauce was wrong: opinion ≠ fact
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: opinion ≠ fact
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: opinion ≠ fact
- `review-1798cc23` the restaurant has apparently been taken over: change ≠ fact
- `review-1798cc23` the menu, prices and cuisine differ from those in the listi…: change ≠ fact
- `review-1798cc23` the cuisine is now Afghan instead of Persian: change ≠ fact
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-1798cc23` the Pommes were forgotten: opinion ≠ fact
- `review-1798cc23` no information was given about the Weinen: opinion ≠ fact
- `review-196641fc` the total wait of 50 minutes was too long: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-21de844d` waited over half an hour before being served: opinion ≠ fact
- `review-257f4791` perfect for the atmosphere: opinion ≠ fact
- `review-2799bbfa` only this branch gave the reviewer a wrong takeaway order: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-2c7253a2` the burger joint is definitely worth a try: verdict ≠ opinion
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: opinion ≠ new_item
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ new_item
- `review-356e149a` the employee made me wait several more minutes before takin…: opinion ≠ fact
- `review-35fe7952` orders are prepared in no time: opinion ≠ fact
- `review-3639cae4` there were practically no sauces: opinion ≠ fact
- … 368 more in issues.jsonl

### claims.subject (288)

- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0a8f804b` Flavours range from Gochujang-Karamell to silky tofu with p…: place ≠ none
- `post-0a8f804b` Flavours range from Gochujang-Karamell to silky tofu with p…: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ city
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1d0aeaca` the Pandan flavor, a Thai herb, is almost toffee-like, brig…: place ≠ none
- `post-1d0aeaca` the Pandan flavor, a Thai herb, is almost toffee-like, brig…: place ≠ none
- `post-1d0aeaca` the Pandan flavor, a Thai herb, is almost toffee-like, brig…: place ≠ none
- `post-1d0aeaca` Miriam considers a Club Mate flavor as the Berlin flavor: place ≠ none
- `post-1d0aeaca` a sauerkraut with lemon flavor actually doesn't sound too b…: place ≠ none
- `post-1d0aeaca` Miriam says the proper Berlin flavor is anything with beer: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the meat is grilled over charcoal: place ≠ none
- `post-217c8e79` the gegrillter Schweinebauch is delicious with grill aromas: place ≠ none
- `post-217c8e79` the dessert is the creator's favourite snack: place ≠ none
- `post-217c8e79` the dessert traditionally has Kokosmilch and Eis in it: place ≠ none
- … 248 more in issues.jsonl

### parts.sentiment (286)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: positive ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ positive
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-257f4791` perfect for the atmosphere: positive ≠ neutral
- `review-27722511` there are better kebabs in Berlin: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ neutral
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` stood at the counter for about five minutes without being g…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3bab8289` the service from the staff could have been better: negative ≠ mixed
- `review-3bab8289` the food is nothing extraordinary: negative ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-5582d6b8` the friend barely touched the table and the spoons fell: negative ≠ neutral
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: negative ≠ neutral
- `review-5d173a89` it took around 30 minutes to prepare a single döner: negative ≠ neutral
- `review-5d173a89` the döner is not worth €7.90: negative ≠ neutral
- `review-6217ec70` waited in line for about an hour: negative ≠ mixed
- `review-6217ec70` not sure they would repeat the experience: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-693fb047` expected the best kebab but the kebab was only edible: negative ≠ positive
- … 246 more in issues.jsonl

### claims.extra (204)

- `review-1016bd13` first bus had 40 people
- `review-1016bd13` from 19:05 to 19:30
- `review-356e149a` the employee works there
- `review-356e149a` replied "Nein"
- `review-356e149a` leaned against the counter
- `review-356e149a` replied "Ich bin Araber"
- `review-35fe7952` the Turkish black tea was free
- `review-382cd7e9` the message is clear
- `review-510fc086` living in Berlin has advantages
- `review-88fe4146` the server knew the reviewer and friend were about to sit down together
- `review-88fe4146` the reviewer refused the table
- `review-90e99b19` they left the dishcloth on the table
- `review-96daa0a9` the young man had a schönen Bart
- `review-c117171d` cheeseburger had signature caramelized onions
- `post-01239695` the girl ATE
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothes
- `post-019b903e` good morning and a successful day
- `post-0216fd1d` the guide has new ideas for Neukölln
- `post-0a8f804b` each flavor is a tribute to people they love and the communities they belong to
- `post-0dde5eb7` the dish does not need much to make them happy
- `post-0fa29641` the post is a Berlin guide for Kreuzberg
- `post-0fa29641` the spots are in the creator's neighborhood
- `post-0fa29641` everything is tagged
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-1b8b0789` the creator ordered for takeout
- `post-1b8b0789` they tried it before flying to New York
- `post-1b8b0789` they came for the food
- `post-1b8b0789` the creator asks viewers to comment what they think of the place
- `post-1b8b0789` they want opinions especially about the food there
- `post-1c0d4023` Nobelhart & Schmutzig is in Kreuzberg
- `post-1c0d4023` Nobelhart & Schmutzig is German
- `post-1c0d4023` Rutz Restaurant is in Mitte
- `post-1c0d4023` Rutz Restaurant is a bar
- `post-1c0d4023` Tulus Lotrek is in Kreuzberg
- `post-1c0d4023` Coda is in Neukoelln
- `post-1c0d4023` Coda is a bar
- `post-1c0d4023` Hallmann & Klee is in Neukoelln
- `post-1c0d4023` Otto is in Pankow / Prenzlauer Berg
- … 164 more in issues.jsonl

### claims.place (168)

- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: Magma ≠ Fuerst Wiacek
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` through the tinted shop window you can watch the three wome…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` ten dumplings cost 16 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` 20 dumplings cost 30 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` you can take fresh Dumplings home or stock up on a frozen a…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Manufaktur is open Wednesday to Sunday from 12 to 18: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2a8e9606` at Café Benjamine guests stay longer with the quality of th…: Café Benjamine ≠ Michelberger Hotel
- `post-2b231637` Tribeca Ice Cream is a CeeCee tip: Tribeca Ice Cream ≠ Chipi Chipi Bombón
- `post-31344bc5` Stoke is trending among creator picks: Stoke ≠ Cookies Cream
- `post-31344bc5` Ming Dynastie is a favourite of Berlin food creators: Ming Dynastie ≠ Stoke
- `post-31344bc5` Ming Dynastie is rated 4.6 stars: Ming Dynastie ≠ Stoke
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-3a0ad71a` Max Lemke is the owner and baker of Common: Common ≠ Ital. Eis Lanzano (la piccola gelateria)
- `post-3a0ad71a` Common's owner Max Lemke is known for his exceptional dough…: Common ≠ Ital. Eis Lanzano (la piccola gelateria)
- `post-3a0ad71a` Bertie is one of the Berlin restaurants selected by Max Lem…: Bertie ≠ d'Brunch Berlin
- `post-3a0ad71a` Goldies Smashburger is one of the Berlin restaurants select…: Goldies Smashburger ≠ d'Brunch Berlin
- `post-3a0ad71a` Ora is one of the Berlin restaurants selected by Max Lemke: Ora ≠ d'Brunch Berlin
- `post-3a0ad71a` Estelle is one of the Berlin restaurants selected by Max Le…: Estelle ≠ d'Brunch Berlin
- `post-3a0ad71a` the Torten at Mr. Minsch are great: Mr. Minsch ≠ d'Brunch Berlin
- `post-3a0ad71a` tip Berlin recommends the Torten at Mr. Minsch: Mr. Minsch ≠ d'Brunch Berlin
- `post-3a0ad71a` tip Berlin lists Hanuman Thai Curry House in Kreuzberg: Hanuman Thai Curry House ≠ Mr Minsch
- `post-3a0ad71a` Hanuman Thai Curry House stands for Thai cuisine: Hanuman Thai Curry House ≠ Mr Minsch
- `post-3a0ad71a` Grace Restaurant Bar is rated 4.4 stars: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Grace Restaurant Bar has good drinks: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Grace Restaurant Bar serves small dishes: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Grace Restaurant Bar's dishes are concentrated in flavour: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Grace Restaurant Bar has a special design language: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Grace Restaurant Bar has a flexible, casual atmosphere: Grace Restaurant Bar ≠ none
- `post-3a0ad71a` Kírkē Deli is rated 4.9 stars: Kírkē Deli ≠ Magma
- `post-3a0ad71a` Kírkē Deli costs 15–30 €: Kírkē Deli ≠ Magma
- … 128 more in issues.jsonl

### places.missed (75)

- `post-0bf8447d` Pastaia
- `post-1e024518` Masalas
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-2a8e9606` Landmann
- `post-2a8e9606` Schwarzes Kamel
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
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Common
- `post-3a0ad71a` Bertie
- `post-3a0ad71a` Goldies Smashburger
- `post-3a0ad71a` Ora
- `post-3a0ad71a` Estelle
- `post-3a0ad71a` Grace Restaurant Bar
- `post-3a0ad71a` Kírkē Deli
- `post-3a0ad71a` File Asto Taverna
- `post-3a0ad71a` Ploetz
- `post-3a0ad71a` Zur letzten Instanz
- `post-3a0ad71a` Figl
- `post-3a0ad71a` Terese
- `post-3a0ad71a` Gut Kerkow Biometzgerei
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei
- `post-3a0ad71a` Nanum
- `post-3a0ad71a` Kissabo
- `post-40f86f07` Jan Burgerrestaurant
- `post-45dafb41` Standard
- `post-45dafb41` Malafemmena
- … 35 more in issues.jsonl

### parts.amount (50)

- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-279b23c3` the food rated 12/10: —  ≠ 10 money
- `review-279b23c3` the service rated 12/10: —  ≠ 10 money
- `review-2c7253a2` arrived around 5 PM: —  ≠ 5 minutes
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 1.5 minutes
- `review-36f2fac8` you wait 1.5 hours in the queue for your food: 90 minutes ≠ 1.5 minutes
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 12 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-b9d9100a` in such a famous place only 2 people do all the work, inclu…: —  ≠ 2 minutes
- `review-dcd4db39` the meal was ready just 5-10 minutes after ordering: 10 minutes ≠ —
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-0d1e7abc` Isla has existed for 10 years: —  ≠ 10 minutes
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-31344bc5` Cookies Cream is rated 4.7 stars: —  ≠ 4.7 money
- `post-31344bc5` Stoke has 5 creator recommendations: —  ≠ 4.5 money
- `post-31344bc5` the best Ramen bars in Berlin have Google ratings above 4.5: —  ≠ 4.5 money
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 330 minutes
- `post-3a0ad71a` Kírkē Deli costs 15–30 €: 30 money ≠ —
- `post-3a0ad71a` Le Faubourg offers four new Signature Cocktails on its terr…: —  ≠ 4 money
- `post-45841578` the four spots are must-tries for eating cheap and tasty in…: 10 money ≠ —
- `post-45841578` frozen yogurt at Drei starts from 6 euros: 6 money ≠ 9.9 money
- `post-45841578` the beef noodle soup is really good: —  ≠ 9.9 money
- `post-48e30fa6` open 11:00 to 18:30 at Oranienburg: —  ≠ 570 minutes
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: —  ≠ 5 money
- `post-606d88e9` took 3 different coffee cakes to go to try them: —  ≠ 3 minutes
- `post-68b0cd44` the creator had spicy bian bian hand pulled noodles: —  ≠ 8.9 money
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-875be07a` food at the Street Food Market at Markthalle Neun costs 5–1…: 12 money ≠ 5 money
- `post-a3178d9e` Come to The Bun Society before 17:00, then it is not too cr…: —  ≠ 17 minutes
- `post-a7757925` HOMì is a new spot in Berlin: —  ≠ 1 money
- `post-cb785d0b` the place now has almost 60 seats: —  ≠ 60 money
- `post-cb785d0b` the renovation took 8 months: —  ≠ 8 minutes
- `post-cb785d0b` Sagos opened exactly 2 years ago: —  ≠ 2 money
- … 10 more in issues.jsonl

### change.false (36)

- `review-3486a0a9` Bun Society has become a new local favourite
- `review-4cd140a3` the service got worse over the evening
- `review-4cd140a3` it got louder and louder
- `review-83cf47fa` roe rice became a cold dish
- `post-31344bc5` Nouri has buzz in recent weeks
- `post-31344bc5` Kohle & Salz has buzz in recent weeks
- `post-31344bc5` Elotl has buzz in recent weeks
- `post-31344bc5` Fukagawa has buzz in recent weeks
- `post-33308126` the batter stays the same and only the fish is different
- `post-388b4383` the quality has stayed the same
- `post-3a0ad71a` CeeCee gives positive to enthusiastic coverage of Magma and Coffee Circle
- `post-3a0ad71a` Magma and Coffee Circle were added later
- `post-3a0ad71a` YOU opens as a new concept in Hotel Luc
- `post-4590c8ff` the meal is different every time you visit
- `post-4c3e2a10` the kebab is through
- `post-4c3e2a10` the upper gas burner has run out
- `post-56bff2cf` the opening felt well-established after a few weeks
- `post-8c6bd842` the salad was forgotten
- `post-8e94e7ea` sharing is no longer an option
- `post-909ca5ee` Barlevain opened in spring
- `post-909ca5ee` the menu changes seasonally
- `post-909ca5ee` the cavatelli are currently served as pasta alla Norma
- `post-93526d04` they forgot the rice
- `post-935c2fd2` gastronomy turnover in Germany fell by 4 percent
- `post-a3178d9e` smashburgers changed the creator's opinion for the positive
- `post-ab252276` it is the new opening of Haus des Döners
- `post-b5e879f0` the food stayed affordable despite rising costs
- `post-baac3611` 44 CHKN opens its third branch soon
- `post-c4e7c0a9` the menu changes seasonally
- `post-cb785d0b` the döner is sold at the same price as at the opening
- `post-cb785d0b` there will be no dürüm, box or plate that day
- `post-d1ab7367` the new owners kept the shop's Eastern European focus
- `post-d232f1ca` they teamed up with BRLO Beer again
- `post-e62d3c39` the café became a new café after the wall opening did not happen
- `post-fe3794c9` this year SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin in Mi…
- `post-fe3794c9` an own SpreeWiesn area was set up for the season

### places.extra (31)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-233389f4` an Indian restaurant
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-40f86f07` Jan Burger Restaurant
- `post-48e30fa6` Kaufland Oranienburg
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-875be07a` Humboldt Forum
- `post-8901fb9b` Soehne
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-93526d04` Baklava Laden
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Borschtsch
- `post-9f93c25b` Main
- `post-ad6a11c0` Korean restaurant
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` internationaler Feinkostsupermarkt
- `post-cecea20e` Bikini Berlin
- `post-f0fb51e5` Hackescher Markt
- `post-fe3794c9` SpreeWiesn

### match.brand (29)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Amo Café: none ≠ ama Café (llm)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ none (none)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-f17dfe96` Jemenitisches Restaurant: Jemenitisches Restaurant المطعم اليمني ≠ Jemenitisches Restaurant (llm)

### change.missed (24)

- `review-1798cc23` the restaurant has apparently been taken over
- `review-1798cc23` the menu, prices and cuisine differ from those in the listing
- `review-1798cc23` the cuisine is now Afghan instead of Persian
- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-2a8e9606` Sören Zupke and Vadim Otto Ursus take over Café Bravo in the summer
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-7516d1de` Bahadur now operates as Prince of Punjab at the same address
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-c0a7fdc2` Pêle-Mêle has changed owners
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-e2a421e9` Butter Lindner was renamed to just Lindner
- `post-fc96acff` Facil has quietly gotten better

### match_isolated.brand (23)

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
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### match.branch (16)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-1c0d4023` Michelberger Restaurant: brand only ≠ Michelberger Café & Bar
- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Yumcha Heroes Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Zur Bratpfanne: Zur Bratpfanne ≠ Zur Bratpfanne
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-ad6a11c0` Bonanza: brand only ≠ Bonanza Coffee
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-d232f1ca` BRLO: brand only ≠ BRLO Chicken & Beer

### match_isolated.branch (11)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
