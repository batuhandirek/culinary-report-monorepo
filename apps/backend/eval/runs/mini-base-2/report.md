# Ingestion eval: mini-base-2

2026-11-01 15:23 UTC · 169 reviews, 199 posts, 0 wordings · 503 cases left out (no reference or no output)
Tokens: 1,189,651
Models: review-claims: openai/gpt-5.4-mini (169); claim-parts: openai/gpt-5.4-mini (367); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (91)

## Reviews

| Metric | mini-base-2 | stored | mini-base | mini-r3 | second-gpt54 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% (928/962) | 93% +3 | 97% ±0 | 96% ±0 | 98% -1 |
| Claims that are real (of produced) | 98% (1209/1238) | 99% -1 | 98% -1 | 99% -1 | 99% -1 |
| Sentiment | 91% (965/1056) | 88% +4 | 91% ±0 | 93% -1 | 98% -6 |
| Aspect, exact | 80% (841/1056) | 71% +9 | 82% -3 | 82% -2 | 84% -4 |
| Aspect, right root | 85% (900/1056) | 81% +5 | 89% -4 | 90% -5 | 88% -3 |
| Kind | 87% (920/1056) | 67% +20 | 87% ±0 | 92% -4 | 97% -10 |
| Kind given at all | 100% (1056/1061) | 4% +96 | 99% ±0 | 98% +1 | 100% ±0 |
| Changes that are changes | 73% (11/15) | 56% +17 | 52% +21 | 72% +1 | 67% +7 |
| Changes found | 69% (11/16) | 80% -11 | 81% -12 | 81% -12 | 100% -31 |
| Amount | 65% (28/43) | 41% +24 | 68% -3 | 76% -11 | 87% -22 |
| Foods named, precision | 65% (262/401) | 32% +33 | 70% -5 | 71% -5 | 88% -23 |
| Foods named, recall | 64% (244/381) | 23% +41 | 67% -3 | 67% -3 | 80% -15 |

## Posts and articles

| Metric | mini-base-2 | stored | mini-base | mini-r3 | second-gpt54 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 76% (1582/2077) | 56% +21 | 76% ±0 | 85% -9 | 85% -9 |
| Claims that are real (of produced) | 91% (2014/2222) | 95% -4 | 93% -2 | 88% +3 | 92% -2 |
| Sentiment | 87% (1733/1983) | 86% +2 | 87% ±0 | 88% -1 | 91% -4 |
| Aspect, exact | 64% (1269/1983) | 63% +1 | 61% +3 | 63% +1 | 71% -7 |
| Aspect, right root | 77% (1526/1983) | 78% -1 | 74% +3 | 76% +1 | 83% -6 |
| Kind | 80% (1590/1983) | 47% +33 | 83% -3 | 84% -4 | 88% -8 |
| Kind given at all | 100% (1983/1987) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 40% (21/53) | 46% -7 | 56% -16 | 51% -11 | 79% -39 |
| Changes found | 44% (14/32) | 38% +6 | 50% -6 | 66% -22 | 60% -16 |
| Amount | 62% (63/101) | 46% +16 | 55% +7 | 47% +15 | 40% +22 |
| Foods named, precision | 77% (958/1248) | 46% +31 | 72% +5 | 75% +2 | 73% +3 |
| Foods named, recall | 70% (916/1304) | 39% +31 | 66% +4 | 63% +8 | 68% +2 |
| Subject (place, city, none) | 87% (1964/2270) | 85% +2 | 85% +2 | 88% -2 | 94% -8 |
| Claim on the right place | 90% (1666/1845) | 85% +6 | 90% +1 | 91% -1 | 97% -7 |
| Places found | 82% (356/433) | 73% +9 | 81% +1 | 90% -8 | 86% -4 |
| Places that are places | 92% (356/389) | 85% +6 | 91% ±0 | 92% -1 | 94% -3 |
| Match: brand (found places) | 92% (328/356) | 92% ±0 | 92% ±0 | 92% ±0 | 97% -5 |
| Match: branch (right brand) | 94% (272/288) | 97% -3 | 96% -1 | 96% -1 | 98% -3 |
| Match on the reference's places: brand | 93% (328/351) | — | 93% ±0 | 92% +1 | — |
| Match on the reference's places: branch | 96% (269/280) | — | 96% ±0 | 96% ±0 | — |
| Promotional flag | 79% (157/199) | 82% -3 | 79% ±0 | 78% +1 | 69% +10 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-base-2 (train) | mini-base-2 (test) | mini-base (test) | mini-r3 (test) | second-gpt54 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 97% | 95% (284/298) | 97% -2 | 96% -1 | 98% -2 |
| Claims that are real (of produced) | 97% | 99% (365/367) | 98% +1 | 99% ±0 | 99% +1 |
| Sentiment | 92% | 90% (295/326) | 92% -1 | 92% -2 | 98% -7 |
| Aspect, exact | 79% | 80% (262/326) | 81% -1 | 82% -2 | 84% -3 |
| Aspect, right root | 84% | 88% (287/326) | 89% -1 | 90% -2 | 88% ±0 |
| Kind | 86% | 89% (289/326) | 90% -1 | 92% -3 | 97% -9 |
| Kind given at all | 99% | 100% (326/326) | 100% ±0 | 95% +5 | 100% ±0 |
| Changes that are changes | 69% | 100% (2/2) | 40% +60 | 100% ±0 | 67% +33 |
| Changes found | 64% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 64% | 67% (10/15) | 71% -4 | 67% ±0 | 87% -20 |
| Foods named, precision | 65% | 66% (80/121) | 78% -12 | 71% -4 | 88% -22 |
| Foods named, recall | 66% | 61% (75/123) | 69% -8 | 60% +1 | 80% -19 |

### Posts and articles

| Metric | mini-base-2 (train) | mini-base-2 (test) | mini-base (test) | mini-r3 (test) | second-gpt54 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 77% | 75% (452/606) | 73% +1 | 88% -14 | 85% -11 |
| Claims that are real (of produced) | 90% | 93% (567/609) | 96% -2 | 86% +7 | 92% +1 |
| Sentiment | 87% | 89% (514/579) | 91% -2 | 88% +1 | 91% -2 |
| Aspect, exact | 64% | 65% (377/579) | 65% ±0 | 61% +4 | 71% -6 |
| Aspect, right root | 76% | 79% (459/579) | 76% +4 | 75% +4 | 83% -3 |
| Kind | 79% | 83% (481/579) | 85% -2 | 84% -1 | 88% -5 |
| Kind given at all | 100% | 99% (579/583) | 100% -1 | 100% ±0 | 100% -1 |
| Changes that are changes | 46% | 21% (3/14) | 45% -24 | 48% -26 | 79% -57 |
| Changes found | 50% | 30% (3/10) | 40% -10 | 80% -50 | 60% -30 |
| Amount | 55% | 80% (24/30) | 77% +3 | 67% +13 | 40% +40 |
| Foods named, precision | 74% | 83% (295/356) | 75% +7 | 75% +8 | 73% +9 |
| Foods named, recall | 70% | 71% (284/402) | 65% +6 | 60% +11 | 68% +2 |
| Subject (place, city, none) | 88% | 83% (538/646) | 86% -3 | 87% -4 | 94% -11 |
| Claim on the right place | 91% | 87% (437/500) | 83% +5 | 91% -4 | 97% -9 |
| Places found | 83% | 79% (88/111) | 77% +2 | 85% -5 | 86% -7 |
| Places that are places | 94% | 85% (88/103) | 84% +1 | 88% -2 | 94% -9 |
| Match: brand (found places) | 92% | 92% (81/88) | 91% +1 | 91% +1 | 97% -5 |
| Match: branch (right brand) | 94% | 96% (65/68) | 97% -1 | 99% -3 | 98% -2 |
| Match on the reference's places: brand | 94% | 90% (64/71) | 93% -3 | 92% -2 | — |
| Match on the reference's places: branch | 96% | 98% (48/49) | 95% +3 | 96% +2 | — |
| Promotional flag | 77% | 83% (48/58) | 81% +2 | 79% +3 | 69% +14 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 95% (366/385) | 99% (469/474) | 78% (328/419) | 94% (395/419) | — | — |
| hard | 87% (79/91) | 96% (102/106) | 74% (71/96) | 94% (90/96) | 100% (11/11) | 100% (11/11) |
| lang:de | 96% (334/347) | 98% (424/433) | 83% (306/368) | 93% (342/368) | — | — |
| lang:en | 96% (225/235) | 99% (295/298) | 80% (207/258) | 93% (239/258) | — | — |
| lang:other | 98% (306/313) | 96% (398/414) | 74% (260/350) | 90% (314/350) | — | — |
| lang:tr | 94% (63/67) | 99% (92/93) | 85% (68/80) | 88% (70/80) | — | — |
| length:long | 97% (284/294) | 96% (399/417) | 77% (261/337) | 88% (296/337) | — | — |
| length:medium | 96% (588/611) | 99% (750/761) | 80% (524/658) | 93% (610/658) | — | — |
| length:short | 98% (56/57) | 100% (60/60) | 92% (56/61) | 97% (59/61) | — | — |
| no-transcript | 91% (438/482) | 90% (593/658) | 72% (392/545) | 90% (489/545) | 95% (121/127) | 92% (111/121) |
| own | 86% (57/66) | 90% (101/112) | 72% (55/76) | 91% (69/76) | 100% (20/20) | 100% (20/20) |
| places:few | 74% (1107/1490) | 93% (1493/1606) | 68% (942/1387) | 88% (1223/1387) | 82% (152/186) | 92% (140/152) |
| places:many | 81% (466/578) | 85% (509/602) | 55% (319/585) | 85% (499/585) | 82% (202/245) | 92% (186/202) |
| places:none | 100% (9/9) | 86% (12/14) | 73% (8/11) | 100% (11/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 66% (699/1067) | 91% (839/924) | 57% (492/859) | 85% (732/859) | 69% (137/199) | 96% (132/137) |
| platform:google | 96% (928/962) | 98% (1209/1238) | 80% (841/1056) | 91% (965/1056) | — | — |
| platform:instagram | 90% (294/325) | 91% (399/438) | 75% (271/363) | 88% (321/363) | 93% (66/71) | 91% (60/66) |
| platform:tiktok | 86% (589/685) | 90% (776/860) | 66% (506/761) | 89% (680/761) | 94% (153/163) | 89% (136/153) |
| size:large | 67% (682/1016) | 91% (840/923) | 60% (500/837) | 86% (717/837) | 69% (131/191) | 95% (124/131) |
| size:medium | 81% (625/767) | 93% (770/825) | 65% (504/778) | 87% (680/778) | 93% (132/142) | 91% (120/132) |
| size:small | 94% (275/294) | 85% (404/474) | 72% (265/368) | 91% (336/368) | 93% (93/100) | 90% (84/93) |
| stars:1 | 97% (156/161) | 96% (214/224) | 77% (145/188) | 91% (172/188) | — | — |
| stars:2 | 97% (157/162) | 97% (207/214) | 81% (142/176) | 90% (159/176) | — | — |
| stars:3 | 97% (213/219) | 99% (273/276) | 75% (179/238) | 88% (209/238) | — | — |
| stars:4 | 97% (186/192) | 99% (241/244) | 82% (172/210) | 93% (195/210) | — | — |
| stars:5 | 95% (216/228) | 98% (274/280) | 83% (203/244) | 94% (230/244) | — | — |
| transcript | 84% (445/528) | 91% (582/640) | 66% (385/579) | 88% (512/579) | 92% (98/107) | 87% (85/98) |

## Misses

### parts.aspect (929)

- `review-02556664` at the competition you eat exactly the same thing with limo…: food ≠ authenticity
- `review-02d1586d` everything was very good: none ≠ vibe
- `review-02d1586d` they thank the waiter as well: service ≠ none
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the meat in the sandwich was chicken only: menu_variety ≠ ingredient_quality
- `review-0541b749` the pain was quickly made, nothing special: food ≠ none
- `review-070860ca` received a refund: complaint_handling ≠ billing
- `review-070860ca` had to reorder: order_accuracy ≠ none
- `review-070860ca` the food was mid, nothing to write home about: food ≠ none
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-0ac47c59` waited in line a little over an hour: queue ≠ wait
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ service
- `review-1016bd13` large groups should avoid this place: none ≠ space
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ menu_variety
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ order_accuracy
- `review-1016bd13` planned to order more drinks on site as needed: none ≠ menu_variety
- `review-1016bd13` the soup was served quickly on arrival: speed_of_service ≠ none
- `review-1016bd13` reserved 15 tables in total: none ≠ reservation_handling
- `review-1016bd13` none of the tables had a bottle opener: service ≠ order_accuracy
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ attentiveness
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ none
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-1798cc23` the Google listing is no longer accurate: other ≠ ownership
- `review-1798cc23` the menu, prices and cuisine differ from those in the listi…: menu_variety ≠ ownership
- `review-1798cc23` the cuisine is now Afghan instead of Persian: food ≠ ownership
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ price
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ none
- `review-257f4791` we were a table of five French people: none ≠ crowding
- `review-257f4791` there were live musicians: atmosphere ≠ none
- `review-27722511` the kebab is great, really very good: taste ≠ none
- `review-27722511` those who want the kebab have to wait in a queue: queue ≠ none
- `review-27722511` don't expect an exceptional atmosphere inside: atmosphere ≠ none
- `review-27722511` don't expect exceptional service: service ≠ none
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: food ≠ none
- `review-27722511` the kebab is very tasty: taste ≠ none
- `review-2799bbfa` only this branch gave the reviewer a wrong takeaway order: order_accuracy ≠ none
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ none
- `review-2799bbfa` going back to ask for the order to be fixed and having to w…: complaint_handling ≠ none
- `review-2799bbfa` no additional compensation offered for their mistake: complaint_handling ≠ none
- `review-279b23c3` the food rated 12/10: food ≠ none
- … 889 more in issues.jsonl

### parts.foods (787)

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
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer, cola, orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [drinks]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [drinks]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [hot dishes]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [drinks]
- … 747 more in issues.jsonl

### parts.kind (529)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02556664` at the competition you eat exactly the same thing with limo…: opinion ≠ fact
- `review-02d1586d` Rüyam Gemüse Kebab was their choice on their first day in B…: fact ≠ verdict
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: verdict ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-0541b749` the pain was quickly made, nothing special: opinion ≠ fact
- `review-070860ca` the food was mid, nothing to write home about: opinion ≠ fact
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
- … 489 more in issues.jsonl

### claims.missed (529)

- `review-0217fd90` very delicious
- `review-02556664` go to the competition instead
- `review-070860ca` the reviewer is not happy
- `review-07871fa7` all in all pretty okay
- `review-0ac47c59` found nothing to praise about the place
- `review-16bdd5e0` would not recommend
- `review-16bdd5e0` definitely not worth the time
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the kebab experts ignore guests' questions
- `review-21de844d` there are far better cafés in Berlin than this one
- `review-3639cae4` the meat was dry
- `review-36f2fac8` you wait 1.5 hours in the queue for your food
- `review-36f2fac8` go to another authentic spot instead
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-5d173a89` the döner is not worth €7.90
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7f3142f7` the website's ticket information is very misleading
- `review-7f3142f7` the atmosphere is lively
- `review-80d9a747` loved the visit
- `review-80d9a747` would highly recommend the place
- `review-937ea9e9` Sandos is simply outstanding
- `review-af8dacaa` the place is super
- `review-bf2322b7` keep up the great work
- `review-bf2322b7` absolutely recommended
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-dcd4db39` the order terminal takes card payment only
- `review-dcd4db39` keep up the good work, dear team
- `review-e12f5f74` the salad (salatası) was fresh
- `review-eacefe43` came late at night
- `review-fa5b28b1` the understaffing is a big failing of the shop owner
- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-020c68fb` Markthalle Neun is open Monday to Saturday 9:00–20:00
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026
- `post-047130f4` Salami Social Club is the tasty new kid on the Friedrichshain block
- `post-047130f4` Salami Social Club was founded by Jacob and Ben
- … 489 more in issues.jsonl

### parts.sentiment (341)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: positive ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-070860ca` the food was mid, nothing to write home about: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ positive
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
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
- `review-356e149a` that is no way to treat guests: negative ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-382cd7e9` the message is that they don't care about people, only thei…: negative ≠ neutral
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3bab8289` the service from the staff could have been better: negative ≠ mixed
- `review-3bab8289` the food is nothing extraordinary: negative ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3e075e7e` doesn't know what people are raving about: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-5582d6b8` the friend barely touched the table and the spoons fell: negative ≠ neutral
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: negative ≠ neutral
- `review-5582d6b8` skip the matcha latte: negative ≠ neutral
- … 301 more in issues.jsonl

### claims.subject (306)

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
- `post-0a8f804b` Each flavour brings together dishes and ingredients from ar…: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-11f0057b` Magma is hot, but in a cool way: place ≠ city
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: place ≠ city
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
- … 266 more in issues.jsonl

### claims.extra (237)

- `review-070860ca` the food was mid
- `review-1016bd13` first bus had 40 people
- `review-1016bd13` each table was supposed to have 6 bottles of beer
- `review-1016bd13` the soup came quickly
- `review-1016bd13` the cold dishes were already laid out
- `review-1016bd13` from 19:05 to 19:30
- `review-1016bd13` we would order extra drinks
- `review-356e149a` the employee works there
- `review-356e149a` replied "Nein"
- `review-356e149a` my order was taken
- `review-356e149a` replied "Ich bin Araber"
- `review-35fe7952` the Turkish black tea was free
- `review-382cd7e9` they do not care about the people
- `review-382cd7e9` they only care about their money
- `review-510fc086` the locale was very cute
- `review-510fc086` living in Berlin has advantages
- `review-510fc086` the Yuzu-Limo was truly phenomenal
- `review-5582d6b8` iced matcha latte cost 8€
- `review-6752188e` the trip to Berlin
- `review-7483275e` next time they mention Mustafa, remember Alibabà
- `review-88fe4146` the server knew the reviewer and friend were about to sit down together
- `review-88fe4146` the reviewer refused the table
- `review-937ea9e9` you must stop by here
- `review-96daa0a9` the young man had a schönen Bart
- `review-99fbc478` they had to eat outside in the evening
- `review-99fbc478` the famous schnitzel was ordered
- `review-a088b847` the micro locali and botteghe sold typical products of various kinds and countries
- `review-a088b847` the cuisines included bbq, argentino, italiano, coreano, panini and dolci
- `review-be6da436` went in the evening
- `post-01239695` the girl ATE
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothes
- `post-019b903e` good morning and a successful day
- `post-0216fd1d` the guide has new ideas for Neukölln
- `post-0a8f804b` they create a weekly secret flavor
- `post-0a8f804b` visitors can guess the ingredients and the dish that inspired the secret flavor
- `post-0a8f804b` the flavors include Gochujang caramel
- `post-0d484513` Dufte opens on 29 May
- `post-0dde5eb7` the dish does not need much to make them happy
- `post-0fa29641` the post is a Berlin guide for Kreuzberg
- … 197 more in issues.jsonl

### claims.place (179)

- `post-0d484513` CeeCee's review of Kissabo is enthusiastic: Kissabo ≠ Café Ploetz
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
- `post-2b231637` Zàgara has a 4.8 rating: Zàgara ≠ Cuore di Vetro
- `post-31344bc5` Stoke implements casual fine dining most convincingly: Stoke ≠ Cookies Cream
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-3a0ad71a` etwas. kleines in Friedrichshain is now a place dedicated o…: etwas. kleines ≠ Rram
- `post-3a0ad71a` is etwas. kleines, offering only croissants, one-dimensiona…: etwas. kleines ≠ Rram
- `post-3a0ad71a` Max Lemke is the owner and baker of Common: Common ≠ Ital. Eis Lanzano (la piccola gelateria)
- `post-3a0ad71a` Common's owner Max Lemke is known for his exceptional dough…: Common ≠ Ital. Eis Lanzano (la piccola gelateria)
- `post-3a0ad71a` Bertie is one of the Berlin restaurants selected by Max Lem…: Bertie ≠ Bar Clara
- `post-3a0ad71a` Goldies Smashburger is one of the Berlin restaurants select…: Goldies Smashburger ≠ Bar Clara
- `post-3a0ad71a` Ora is one of the Berlin restaurants selected by Max Lemke: Ora ≠ Bar Clara
- `post-3a0ad71a` Estelle is one of the Berlin restaurants selected by Max Le…: Estelle ≠ Bar Clara
- `post-3a0ad71a` the Torten at Mr. Minsch are great: Mr. Minsch ≠ d'Brunch Berlin
- `post-3a0ad71a` tip Berlin recommends the Torten at Mr. Minsch: Mr. Minsch ≠ d'Brunch Berlin
- `post-3a0ad71a` Mr. Minsch is open Wed-Sat 11-19 and Sun 10-18: Mr. Minsch ≠ d'Brunch Berlin
- `post-3a0ad71a` tip Berlin lists Hanuman Thai Curry House in Kreuzberg: Hanuman Thai Curry House ≠ Mr Minsch
- `post-3a0ad71a` Hanuman Thai Curry House stands for Thai cuisine: Hanuman Thai Curry House ≠ Mr Minsch
- `post-3a0ad71a` Grace Restaurant Bar is rated 4.4 stars: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Grace Restaurant Bar has good drinks: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Grace Restaurant Bar serves small dishes: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Grace Restaurant Bar's dishes are concentrated in flavour: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Grace Restaurant Bar has a special design language: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Grace Restaurant Bar has a flexible, casual atmosphere: Grace Restaurant Bar ≠ Mibap
- `post-3a0ad71a` Kírkē Deli is rated 4.9 stars: Kírkē Deli ≠ Magma
- … 139 more in issues.jsonl

### places.missed (77)

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
- `post-40f86f07` Jan Burgerrestaurant
- `post-45dafb41` Standard
- … 37 more in issues.jsonl

### parts.amount (53)

- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-279b23c3` the food rated 12/10: —  ≠ 10 money
- `review-279b23c3` the service rated 12/10: —  ≠ 10 money
- `review-2c7253a2` arrived around 5 PM: —  ≠ 5 minutes
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 1.5 minutes
- `review-5582d6b8` the iced matcha latte cost a whopping €8: 8 money ≠ —
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
- `post-31344bc5` Stoke is rated 4.5 stars: —  ≠ 4.5 money
- `post-31344bc5` the best Ramen bars in Berlin have Google ratings above 4.5: —  ≠ 4.5 money
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 330 minutes
- `post-3a0ad71a` Rram costs 30–60 €: 60 money ≠ —
- `post-3a0ad71a` Kírkē Deli costs 15–30 €: 30 money ≠ —
- `post-3a0ad71a` Le Faubourg is a fine-dining restaurant: —  ≠ 4 money
- `post-3a0ad71a` Le Faubourg offers four new Signature Cocktails on its terr…: —  ≠ 4 money
- `post-45841578` the four spots are must-tries for eating cheap and tasty in…: 10 money ≠ —
- `post-45841578` frozen yogurt at Drei starts from 6 euros: 6 money ≠ 9.9 money
- `post-45841578` the beef noodle soup is really good: —  ≠ 9.9 money
- `post-48e30fa6` open 11:00 to 18:30 at Oranienburg: —  ≠ 570 minutes
- `post-5db3b46a` Manello's price is not too bad: —  ≠ 15 money
- `post-606d88e9` took 3 different coffee cakes to go to try them: —  ≠ 3 minutes
- `post-68b0cd44` the creator had spicy bian bian hand pulled noodles: —  ≠ 8.9 money
- `post-68b0cd44` the bian bian noodles had an impressive texture: —  ≠ 8.9 money
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-875be07a` food at the Street Food Market at Markthalle Neun costs 5–1…: 12 money ≠ 5 money
- `post-a3178d9e` Come to The Bun Society before 17:00, then it is not too cr…: —  ≠ 17 minutes
- `post-a7757925` HOMì is a new spot in Berlin: —  ≠ 1 money
- `post-b41bb2f8` Olayinka is the founder of Berlin Naija Foodie: —  ≠ 90 minutes
- … 13 more in issues.jsonl

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

### places.extra (33)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-233389f4` an Indian restaurant
- `post-3a0ad71a` Rogacki
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-40f86f07` Jan Burger Restaurant
- `post-48e30fa6` Kaufland Oranienburg
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-63b83025` Restaurant Athen Adlershof
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

### match.brand (28)

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

### change.missed (23)

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
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-e2a421e9` After about 20 years Lindner is returning to its old name Butter Lindner
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
