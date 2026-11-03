# Ingestion eval: mini-v6b

2026-11-02 09:22 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output) · 4 sources dropped by the agents (scored as nothing read)
Tokens: 1,693,549
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (367); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (88)

## Reviews

| Metric | mini-v6b | stored | mini-v6 | mini-base-2 | mini-base |
|---|---|---|---|---|---|
| Claims found (of the reference) | 94% (923/978) | 93% +1 | 95% -1 | 95% ±0 | 96% -1 |
| Claims that are real (of produced) | 99% (1215/1232) | 99% -1 | 99% ±0 | 99% ±0 | 99% ±0 |
| Sentiment | 93% (959/1036) | 88% +5 | 92% ±0 | 92% ±0 | 91% +1 |
| Aspect, exact | 75% (772/1036) | 71% +4 | 79% -5 | 76% -1 | 77% -3 |
| Aspect, right root | 82% (853/1036) | 81% +2 | 88% -6 | 84% -2 | 87% -5 |
| Kind | 95% (985/1036) | 67% +28 | 95% ±0 | 89% +6 | 88% +7 |
| Kind given at all | 98% (1036/1053) | 4% +94 | 100% -2 | 100% -1 | 99% -1 |
| Changes that are changes | 75% (15/20) | 56% +19 | 63% +13 | 73% +2 | 52% +23 |
| Changes found | 81% (13/16) | 80% +1 | 81% ±0 | 69% +13 | 81% ±0 |
| Amount | 65% (28/43) | 41% +24 | 63% +2 | 64% +1 | 69% -4 |
| Foods named, precision | 78% (326/417) | 32% +46 | 81% -3 | 66% +12 | 71% +8 |
| Foods named, recall | 79% (295/375) | 23% +56 | 79% -1 | 66% +13 | 68% +11 |

## Posts and articles

| Metric | mini-v6b | stored | mini-v6 | mini-base-2 | mini-base |
|---|---|---|---|---|---|
| Claims found (of the reference) | 85% (1762/2077) | 56% +29 | 83% +2 | 74% +10 | 75% +10 |
| Claims that are real (of produced) | 91% (2399/2634) | 95% -4 | 88% +4 | 91% ±0 | 94% -3 |
| Sentiment | 89% (1922/2162) | 86% +3 | 89% ±0 | 89% ±0 | 88% +1 |
| Aspect, exact | 61% (1327/2162) | 63% -2 | 64% -3 | 51% +10 | 49% +12 |
| Aspect, right root | 78% (1697/2162) | 78% +1 | 84% -5 | 77% +1 | 73% +5 |
| Kind | 85% (1841/2162) | 47% +38 | 87% -2 | 85% +1 | 86% -1 |
| Kind given at all | 98% (2162/2208) | 4% +94 | 99% -1 | 100% -2 | 100% -2 |
| Changes that are changes | 40% (35/87) | 46% -6 | 44% -4 | 40% +1 | 53% -13 |
| Changes found | 59% (19/32) | 38% +22 | 56% +3 | 41% +19 | 38% +22 |
| Amount | 66% (61/92) | 46% +20 | 61% +5 | 65% +1 | 53% +13 |
| Foods named, precision | 80% (1141/1426) | 46% +34 | 78% +2 | 78% +2 | 74% +6 |
| Foods named, recall | 75% (1051/1396) | 39% +36 | 77% -2 | 72% +3 | 68% +7 |
| Subject (place, city, none) | 86% (2266/2630) | 85% +1 | 87% -1 | 87% -1 | 84% +2 |
| Claim on the right place | 91% (1967/2160) | 85% +7 | 89% +2 | 91% +1 | 90% +1 |
| Places found | 90% (389/433) | 73% +17 | 91% -1 | 83% +7 | 81% +9 |
| Places that are places | 89% (389/438) | 85% +4 | 89% -1 | 92% -3 | 92% -3 |
| Match: brand (found places) | 93% (361/389) | 92% +1 | 92% +1 | 92% +1 | 92% +1 |
| Match: branch (right brand) | 95% (295/309) | 97% -2 | 95% ±0 | 94% +1 | 96% ±0 |
| Match on the reference's places: brand | 92% (399/433) | — | 92% ±0 | 93% -1 | 93% -1 |
| Match on the reference's places: branch | 96% (326/340) | — | 96% ±0 | 96% ±0 | 96% ±0 |
| Promotional flag | 80% (159/199) | 82% -2 | 77% +3 | 79% +1 | 79% +1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-v6b (train) | mini-v6b (test) | mini-v6 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% | 94% (280/298) | 95% -1 | 94% ±0 | 97% -3 |
| Claims that are real (of produced) | 98% | 100% (358/359) | 100% ±0 | 100% ±0 | 99% +1 |
| Sentiment | 92% | 94% (287/305) | 91% +3 | 92% +2 | 92% +2 |
| Aspect, exact | 76% | 72% (219/305) | 79% -8 | 76% -5 | 77% -5 |
| Aspect, right root | 83% | 80% (244/305) | 89% -9 | 86% -6 | 87% -7 |
| Kind | 94% | 98% (298/305) | 95% +3 | 91% +7 | 91% +7 |
| Kind given at all | 100% | 95% (305/322) | 100% -5 | 100% -5 | 100% -5 |
| Changes that are changes | 76% | 67% (2/3) | 40% +27 | 100% -33 | 40% +27 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 56% | 81% (13/16) | 72% +9 | 73% +8 | 81% ±0 |
| Foods named, precision | 78% | 78% (81/104) | 84% -6 | 67% +11 | 78% ±0 |
| Foods named, recall | 84% | 67% (79/118) | 84% -17 | 62% +5 | 70% -3 |

### Posts and articles

| Metric | mini-v6b (train) | mini-v6b (test) | mini-v6 (test) | mini-base-2 (test) | mini-base (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 83% | 90% (544/606) | 86% +3 | 72% +18 | 72% +17 |
| Claims that are real (of produced) | 90% | 92% (778/842) | 89% +4 | 95% -3 | 96% -3 |
| Sentiment | 89% | 90% (616/688) | 89% ±0 | 91% -1 | 92% -3 |
| Aspect, exact | 62% | 59% (408/688) | 61% -2 | 51% +8 | 51% +9 |
| Aspect, right root | 79% | 77% (531/688) | 79% -2 | 77% ±0 | 76% +2 |
| Kind | 85% | 85% (586/688) | 87% -2 | 87% -2 | 89% -4 |
| Kind given at all | 98% | 97% (688/709) | 100% -3 | 99% -2 | 100% -3 |
| Changes that are changes | 40% | 41% (12/29) | 54% -12 | 21% +20 | 45% -4 |
| Changes found | 50% | 80% (8/10) | 70% +10 | 30% +50 | 30% +50 |
| Amount | 67% | 66% (21/32) | 65% +1 | 80% -14 | 69% -4 |
| Foods named, precision | 80% | 79% (343/434) | 80% -1 | 82% -3 | 78% +1 |
| Foods named, recall | 78% | 70% (311/447) | 79% -9 | 73% -4 | 67% +3 |
| Subject (place, city, none) | 85% | 89% (741/835) | 86% +3 | 83% +6 | 85% +4 |
| Claim on the right place | 91% | 90% (635/704) | 91% -1 | 88% +2 | 84% +6 |
| Places found | 92% | 85% (94/111) | 86% -2 | 80% +5 | 78% +6 |
| Places that are places | 90% | 84% (94/112) | 90% -6 | 86% -2 | 85% -1 |
| Match: brand (found places) | 93% | 91% (86/94) | 91% +1 | 91% ±0 | 90% +2 |
| Match: branch (right brand) | 95% | 99% (70/71) | 99% ±0 | 96% +3 | 97% +2 |
| Match on the reference's places: brand | 92% | 93% (103/111) | 92% +1 | 90% +3 | 93% ±0 |
| Match on the reference's places: branch | 96% | 96% (82/85) | 98% -1 | 98% -1 | 95% +1 |
| Promotional flag | 80% | 79% (46/58) | 78% +2 | 83% -3 | 81% -2 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 96% (372/389) | 100% (476/478) | 77% (313/407) | 95% (388/407) | — | — |
| hard | 88% (80/91) | 93% (104/112) | 67% (64/96) | 93% (89/96) | 100% (11/11) | 100% (11/11) |
| lang:de | 91% (326/359) | 98% (413/420) | 81% (297/368) | 94% (345/368) | — | — |
| lang:en | 95% (228/239) | 100% (296/297) | 71% (185/262) | 94% (245/262) | — | — |
| lang:other | 97% (303/313) | 98% (411/420) | 70% (241/342) | 91% (312/342) | — | — |
| lang:tr | 99% (66/67) | 100% (95/95) | 77% (49/64) | 89% (57/64) | — | — |
| length:long | 91% (269/294) | 97% (398/411) | 72% (223/308) | 90% (276/308) | — | — |
| length:medium | 96% (600/627) | 99% (758/762) | 75% (503/669) | 93% (625/669) | — | — |
| length:short | 95% (54/57) | 100% (59/59) | 78% (46/59) | 98% (58/59) | — | — |
| no-transcript | 92% (444/482) | 91% (580/636) | 64% (350/544) | 93% (505/544) | 95% (121/127) | 94% (114/121) |
| own | 95% (63/66) | 85% (94/110) | 70% (58/83) | 94% (78/83) | 100% (20/20) | 100% (20/20) |
| places:few | 87% (1301/1490) | 92% (1895/2052) | 60% (958/1594) | 92% (1459/1594) | 89% (166/186) | 93% (154/166) |
| places:many | 78% (452/578) | 87% (492/565) | 65% (361/557) | 81% (453/557) | 90% (221/245) | 93% (205/221) |
| places:none | 100% (9/9) | 71% (12/17) | 73% (8/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 80% (855/1067) | 92% (1187/1297) | 58% (606/1047) | 86% (903/1047) | 84% (167/199) | 96% (161/167) |
| platform:google | 94% (923/978) | 99% (1215/1232) | 75% (772/1036) | 93% (959/1036) | — | — |
| platform:instagram | 92% (298/325) | 92% (389/423) | 64% (236/367) | 92% (339/367) | 94% (67/71) | 93% (62/67) |
| platform:tiktok | 89% (609/685) | 90% (823/914) | 65% (485/748) | 91% (680/748) | 95% (155/163) | 89% (138/155) |
| size:large | 82% (829/1016) | 93% (1149/1238) | 60% (595/991) | 87% (860/991) | 84% (161/191) | 93% (149/161) |
| size:medium | 86% (657/767) | 91% (857/938) | 61% (487/803) | 90% (723/803) | 94% (134/142) | 93% (125/134) |
| size:small | 94% (276/294) | 86% (393/458) | 67% (245/368) | 92% (339/368) | 94% (94/100) | 93% (87/94) |
| stars:1 | 97% (156/161) | 97% (216/222) | 74% (125/168) | 92% (155/168) | — | — |
| stars:2 | 96% (156/162) | 97% (212/219) | 75% (130/174) | 90% (156/174) | — | — |
| stars:3 | 92% (201/219) | 100% (258/259) | 68% (158/231) | 90% (207/231) | — | — |
| stars:4 | 94% (191/204) | 100% (254/254) | 77% (166/215) | 94% (202/215) | — | — |
| stars:5 | 94% (219/232) | 99% (275/278) | 78% (193/248) | 96% (239/248) | — | — |
| transcript | 88% (463/528) | 90% (632/701) | 65% (371/571) | 90% (514/571) | 94% (101/107) | 85% (86/101) |

## Misses

### parts.aspect (1099)

- `review-019a8099` a very nice restaurant: none ≠ atmosphere
- `review-02556664` at the competition you eat exactly the same thing with limo…: none ≠ taste
- `review-02d1586d` the staff were very good: service ≠ friendliness
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: food ≠ taste
- `review-0f14e04b` great food: food ≠ none
- `review-0f14e04b` great service: service ≠ none
- `review-0f14e04b` good prices: price_level ≠ none
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: drinks ≠ menu_variety
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: reservation_handling ≠ none
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: reservation_handling ≠ none
- `review-1016bd13` the restaurant said the cold dishes were already set out: service ≠ none
- `review-1016bd13` the soup was served quickly on arrival: wait_for_food ≠ none
- `review-1016bd13` reserved 15 tables in total: reservation_handling ≠ wait_for_table
- `review-1016bd13` none of the tables had a bottle opener: service ≠ none
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: attentiveness ≠ none
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: wait_for_food ≠ none
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: wait_for_food ≠ none
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ none
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ none
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: wait_for_food ≠ none
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: pressure ≠ none
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: pressure ≠ none
- `review-1016bd13` drinks are sold at exorbitant prices: price_level ≠ none
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: pressure ≠ none
- `review-1104925b` the food is so, so delicious: taste ≠ none
- `review-1104925b` the staff are friendly: friendliness ≠ none
- `review-1104925b` Kebab No. 1 is super tasty: taste ≠ none
- `review-13683c42` the chain has several locations in Berlin: other ≠ none
- `review-13683c42` the hamburguesas are decent: taste ≠ none
- `review-13683c42` the price is similar to McDonald's: price_level ≠ none
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: ingredient_quality ≠ none
- `review-13683c42` the patatas fritas are tastier than McDonald's: taste ≠ none
- `review-13683c42` Burgermeister is an option for a quick lunch or dinner: occasion ≠ none
- `review-13683c42` the price is reasonable: price_level ≠ none
- `review-13683c42` some locations only have a terrace with high tables: outdoor_seating ≠ none
- `review-13683c42` the seating is quite uncomfortable: interior ≠ none
- `review-13f72d12` the taste of the kebsa was mediocre: taste ≠ none
- `review-164fbfea` the burgers were very good: taste ≠ none
- … 1059 more in issues.jsonl

### parts.foods (661)

- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ [lime]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ [lime]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` the music was very loud: [] ≠ [muziek]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ []
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ []
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ []
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ []
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ []
- `review-1016bd13` arrived on time at 7 PM: [] ≠ [汤]
- `review-1016bd13` none of the tables had a bottle opener: [] ≠ [啤酒]
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: [] ≠ [啤酒]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [热菜]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [凉菜, 啤酒]
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: [] ≠ [热菜]
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: [] ≠ [热菜]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [热菜]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-13683c42` the price is similar to McDonald's: [] ≠ [burger]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [hamburguesas, McDonald's]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [patatas fritas, McDonald's]
- `review-13f72d12` the taste of the kebsa was mediocre: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebabs]
- `review-13f72d12` the taste of the kebsa was mediocre: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebabs]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi, halloumi]
- `review-1798cc23` one of the three Bier bottles looked different: [Bier] ≠ []
- `review-279b23c3` the food rated 12/10: [] ≠ [Essen]
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: [beef noodle soup] ≠ [beef noodle soup, MSG]
- `review-2b737ce5` before today the food was okay: [] ≠ [beef noodle soup]
- `review-2b737ce5` the price was affordable: [] ≠ [beef noodle soup]
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: [sostituto della carne, falafel, formaggio] ≠ [falafel, cheese]
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: [sostituto della carne, falafel, formaggio] ≠ [cheese]
- `review-356e149a` wanted to order four dishes but only ordered one for my dau…: [] ≠ [Gerichte]
- … 621 more in issues.jsonl

### parts.kind (372)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-037bbe20` the venue is unique: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-1798cc23` the old listing including its reviews was simply continued: opinion ≠ change
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ deal
- `review-36f2fac8` go to another authentic spot instead: verdict ≠ opinion
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: opinion ≠ fact
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-58540992` they came with fewer people than reserved, 4 instead of 6: fact ≠ opinion
- `review-5d173a89` the döner is not worth €7.90: opinion ≠ fact
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-6752188e` the reviewer rates the market 10000/10: verdict ≠ opinion
- `review-697fb05e` the kebab restaurant is unrivaled: verdict ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-6b4df664` definitely worth the experience: verdict ≠ opinion
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` the long wait was due to the service, not the queue itself: opinion ≠ fact
- `review-7483275e` for Romans: the kebab is like any unpretentious kebab in Ro…: opinion ≠ fact
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà: verdict ≠ fact
- `review-8c6d84ed` Burgermeister Konstanzer is the worst shop: verdict ≠ opinion
- `review-90e99b19` the staff then brought a new döner to that table: opinion ≠ change
- `review-90e99b19` the place is not worth more than 15 minutes of travel: verdict ≠ opinion
- `review-937ea9e9` Sandos is definitely one of the best dessert shops ever: verdict ≠ opinion
- `review-937ea9e9` anyone who loves delicious Desserts absolutely has to stop …: verdict ≠ opinion
- `review-99fbc478` the place is like an industrial factory: opinion ≠ fact
- `review-99fbc478` you had to search for a single caper under the giant flap: opinion ≠ fact
- `review-99fbc478` when paying they offered a consolation drink: opinion ≠ fact
- `review-9accbc5b` a celebrity chef lending his name to this makes it even wor…: opinion ≠ fact
- `review-a753c04a` they serve typical Bavarian food such as codillo and salchi…: fact ≠ new_item
- … 332 more in issues.jsonl

### claims.missed (370)

- `review-0217fd90` very delicious
- `review-02556664` go to the competition instead
- `review-070860ca` the reviewer is not happy
- `review-07871fa7` all in all pretty okay
- `review-0ac47c59` found nothing to praise about the place
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue
- `review-13f72d12` doesn't understand the hype about this place
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the kebab experts ignore guests' questions
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-3e075e7e` doesn't know what people are raving about
- `review-4cd140a3` they had to leave because it was unbearable
- `review-5582d6b8` the friend barely touched the table and the spoons fell
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` they were very rudely reprimanded on arrival
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-6e97260b` the coca-cola sent in the delivery was warm
- `review-6e97260b` never seen such terrible attitude towards a customer
- `review-6e97260b` the burger was mediocre
- `review-7d7ef8ca` the food is super delicious
- `review-7d7ef8ca` the food is a bit pricey
- `review-7d7ef8ca` it was still a very great experience
- `review-7d7ef8ca` you need to allow some time, even on weekdays
- `review-7d7ef8ca` waited almost 40 minutes for the food
- `review-7d7ef8ca` drinks arrive faster
- `review-7d7ef8ca` the drinks are almost empty again by the time the food arrives
- `review-80d9a747` loved the visit
- `review-80d9a747` would highly recommend the place
- `review-937ea9e9` Sandos is simply outstanding
- `review-af8dacaa` the place is super
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-bef6212c` given the quality of the food, another visit is out of the question
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- … 330 more in issues.jsonl

### claims.subject (364)

- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: city ≠ place
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: place ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0dde5eb7` the dish is for everyone who appreciates good Fleisch and l…: place ≠ none
- `post-0fa29641` the author genuinely loves and keeps coming back to these s…: city ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ none
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ city
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: place ≠ none
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: place ≠ none
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Otto is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams: place ≠ none
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams: place ≠ none
- … 324 more in issues.jsonl

### parts.sentiment (317)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-037bbe20` the venue is unique: positive ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: positive ≠ negative
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ positive
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-27722511` there are better kebabs in Berlin: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ positive
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ positive
- `review-36f2fac8` not a place where you will have a good döner experience: negative ≠ positive
- `review-39166eb1` check your food if you still go there: negative ≠ positive
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: negative ≠ neutral
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3bab8289` the food is nothing extraordinary: negative ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ positive
- `review-436b38b2` staff were on the phone constantly during the visit: negative ≠ neutral
- `review-480994b6` the noodle thickness is a matter of personal taste: mixed ≠ positive
- `review-4a46a87d` the new location isn't the same as the old one: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` they had hoped for a nice date and a pleasant evening: negative ≠ positive
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-58540992` they came with fewer people than reserved, 4 instead of 6: neutral ≠ negative
- `review-5d173a89` the döner is not worth €7.90: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-693fb047` expected the best kebab but the kebab was only edible: negative ≠ neutral
- `review-71868223` glad they waited in the queue: positive ≠ neutral
- `review-7483275e` the long wait was due to the service, not the queue itself: negative ≠ neutral
- … 277 more in issues.jsonl

### claims.extra (252)

- `review-1016bd13` first car had 40 people
- `review-1016bd13` cold dishes were already laid out
- `review-1016bd13` couldn't serve more food
- `review-1016bd13` manager said one dish at a time
- `review-1016bd13` six arms and three heads
- `review-1016bd13` did not remember the other cold dish
- `review-1016bd13` would order extra drinks anyway
- `review-356e149a` answered no
- `review-356e149a` leaned against the counter
- `review-356e149a` is Arab
- `review-3f2a2713` the year is 2026
- `review-510fc086` the place is very cute
- `review-510fc086` living in Berlin has advantages
- `review-510fc086` living in Berlin has advantages
- `review-88fe4146` the reviewer and friend were about to sit down together
- `review-88fe4146` the reviewer ate alone
- `review-faa8e03c` the chicken feathers were visible in the photo
- `post-01239695` the person who rizzed Junhee up ate
- `post-01431335` the trip was worth saving
- `post-047130f4` the place serves pizza
- `post-0a8f804b` each flavor pays tribute to people they love and the communities they belong to
- `post-0a8f804b` seeing the grumps smile makes Marieke see the world more brightly
- `post-0bf8447d` the place is best viewed from above
- `post-0d484513` this part has no additional claims
- `post-0fa29641` this is a Berlin guide for Kreuzberg
- `post-0fa29641` the creator invites suggestions for more places to add
- `post-0fa29641` everything is tagged
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-1a2cebf2` the event is in Berlin
- `post-1c0d4023` Nobelhart & Schmutzig is in Kreuzberg
- `post-1c0d4023` Nobelhart & Schmutzig serves German food
- `post-1c0d4023` Rutz Restaurant is in Mitte
- `post-1c0d4023` Rutz Restaurant is a bar
- `post-1c0d4023` Tulus Lotrek is in Kreuzberg
- `post-1c0d4023` Coda is in Neukoelln
- `post-1c0d4023` Coda is a bar
- `post-1c0d4023` Hallmann & Klee is in Neukoelln
- `post-1c25f2d1` the post is about a visit to the market
- `post-1ca1ffee` the steaks are grilled
- … 212 more in issues.jsonl

### claims.place (193)

- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: Magma ≠ Fuerst Wiacek
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is filled with spicy potato: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: Masalas ≠ Masala Dosa
- `post-217c8e79` Bún chả was tested: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the gegrillter Schweinebauch is delicious with grill aromas: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the grill aromas really come from the charcoal grill: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is the creator's favourite snack: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert traditionally has Kokosmilch and Eis in it: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert traditionally has Kokosmilch and Eis in it: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is eaten like a pudding, with Gele and rote Boh…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is eaten like a pudding, with Gele and rote Boh…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is eaten like a pudding, with Gele and rote Boh…: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is awesome: Dong Xuan Center ≠ El Kampinski
- `post-217c8e79` the dessert is super sweet but the creator loves it: Dong Xuan Center ≠ El Kampinski
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
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
- … 153 more in issues.jsonl

### change.false (57)

- `review-1798cc23` the Google listing is no longer accurate
- `review-1798cc23` the old listing including the reviews was continued
- `review-3486a0a9` Bun Society has become a new local favourite
- `review-4cd140a3` the service became worse over the evening
- `review-90e99b19` they brought a new döner afterwards
- `post-047130f4` the place is a new opening
- `post-1d0aeaca` its flavours change
- `post-1d0aeaca` Ube became a dynamic, creamy, thick and sweet ice cream
- `post-22c25ac1` the new owners are opening the manufactory
- `post-2a8e9606` the relationship between the museum and the neighborhood has grown noticeably
- `post-33308126` the batter stays the same and only the fish is different
- `post-388b4383` the quality has remained the same
- `post-3a0ad71a` YOU is a new concept replacing Heritage
- `post-3e56e67d` everything is finished now
- `post-45dafb41` Monti is newly opened
- `post-483d6cc6` the second location just opened in Mitte
- `post-58a16831` the concept convinced the landlord
- `post-5f073ec2` the food at Arirang was pretty delicious five years ago
- `post-6b4377f6` the restaurant returns to regional ingredients
- `post-6b4377f6` the restaurant focuses on craftsmanship in cooking
- `post-6b4377f6` the restaurant changes its menu weekly
- `post-6b4377f6` the menu changes weekly
- `post-6ddca88c` the Garibaldi became the signature drink right after opening
- `post-7516d1de` Bahadur is a renamed place now operating as Prince of Punjab at the same address
- `post-7516d1de` Bahadur avoided cliché golden elephants and kitsch peacock statues
- `post-7516d1de` Bahadur had slight Indian touches and memories from home
- `post-75c11d7c` the fish is turned into a spectacular bowl at lunch
- `post-812c90d9` the seafood version costs 3€ more
- `post-86502a88` a new sauce was added to the lobster sandwich
- `post-8e94e7ea` the meal started being too much to share
- `post-8e94e7ea` sharing was no longer an option
- `post-909ca5ee` Barlevain opened in spring
- `post-909ca5ee` the menu changes seasonally
- `post-93526d04` they missed getting the rice at Sangam
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-a7757925` the vegan bánh mì tastes different from the chicken one
- `post-b5e879f0` rising commercial rents changed the neighborhood
- `post-b5e879f0` the food stayed affordable despite rising costs
- `post-b5e879f0` India is now closed
- `post-b5e879f0` the small window nook table with the candle is no longer occupied
- … 17 more in issues.jsonl

### places.extra (49)

- `post-0fa29641` Five Elephant
- `post-0fa29641` Voostore
- `post-0fa29641` Antonia Lingemann
- `post-0fa29641` König Galerie
- `post-0fa29641` Westberlin
- `post-0fa29641` Barra Bar Berlin
- `post-0fa29641` Yummy Vintage Official
- `post-0fa29641` __Ingwer
- `post-0fa29641` Annelies Berlin
- `post-0fa29641` Original Feelings Studio
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c25f2d1` Wochenmarkt Karl-August-Platz
- `post-1c78d4ed` El Líbano Espresso
- `post-1e024518` Masala Dosa
- `post-217c8e79` El Kampinski
- `post-233389f4` an Indian restaurant
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-3b1b4cd6` Crispy's Chicken Berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-7516d1de` Bahadur – Tandoori Grill & Currys
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Suits
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-8901fb9b` Tacos
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Bohschatz
- `post-9f93c25b` Main
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-aa137bfa` Beef Grill Club
- `post-aa137bfa` Beef Grill Club
- `post-ad6a11c0` Korean place
- … 9 more in issues.jsonl

### parts.amount (46)

- `review-0ac47c59` waited in line a little over an hour: 60 minutes ≠ —
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: —  ≠ 19 minutes
- `review-1016bd13` arrived on time at 7 PM: —  ≠ 19 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` you wait 1.5 hours in the queue for your food: 90 minutes ≠ 1.5 minutes
- `review-46b7ca91` waited 1h for the main dish: 60 minutes ≠ 1 minutes
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-7483275e` waited in line for over two hours: 120 minutes ≠ —
- `review-75c84f72` the reviewers are used to marketplaces opening at 07.00 at …: —  ≠ 7 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-0d1e7abc` Isla has existed for 10 years: —  ≠ 10 money
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 money
- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ —
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 8.25 money
- `post-22c25ac1` 20 dumplings cost 30 euros: 30 money ≠ 16 money
- `post-22c25ac1` the prices are fairly calculated and worth every cent: —  ≠ 30 money
- `post-2927e673` 5% discount on the first GetYourGuide app booking with code…: —  ≠ 5 money
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-3a0ad71a` Rram costs 30–60 €: 60 money ≠ —
- `post-3a0ad71a` Kírkē Deli costs 15–30 €: 30 money ≠ —
- `post-45841578` the four spots are must-tries for eating cheap and tasty in…: 10 money ≠ —
- `post-45841578` Mezame Matcha really surprised the creator: —  ≠ 7.5 money
- `post-45dafb41` a whole head of lettuce as a starter costs 12 euros at Monti: 12 money ≠ —
- `post-48e30fa6` open 11:00 to 18:30 at Oranienburg: —  ≠ 18.5 minutes
- `post-52eb53af` Samosa Club rated 10 out of 10: —  ≠ 10 money
- `post-57ab8313` The Gringa de Birria is the authors' favourite: —  ≠ 12.9 money
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-57ab8313` Every Friday from 20:00 the Margaritas Social Club takes pl…: —  ≠ 20 money
- `post-606d88e9` took 3 different coffee cakes to go to try them: —  ≠ 3 money
- `post-606d88e9` Cafe Neue Liebe is 10 out of 10: —  ≠ 10 money
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-875be07a` entry to the Street Food Market at Markthalle Neun is free: —  ≠ 12 money
- `post-91544b0a` Rocoto Berlin's overall rating is 9.5/10: —  ≠ 9.5 money
- `post-a3178d9e` Come to The Bun Society before 17:00, then it is not too cr…: —  ≠ 17 minutes
- … 6 more in issues.jsonl

### places.missed (44)

- `post-1e024518` Masalas
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Common
- `post-3a0ad71a` Bertie
- `post-3a0ad71a` Goldies Smashburger
- `post-3a0ad71a` Ora
- `post-3a0ad71a` Estelle
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
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-5b5671fa` City Chicken
- `post-6b4377f6` Mraz & Sohn
- `post-6b4377f6` Nobelhart & Schmutzig
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Bonanza Coffee
- `post-8901fb9b` Papaya
- `post-8901fb9b` Special Sauce
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-b8d2bcf3` Otto
- `post-b8d2bcf3` Trio
- `post-b8d2bcf3` Pluto
- `post-c4e7c0a9` Bar Nonno
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO
- `post-f5a0f49f` Candela
- `post-fc96acff` Hallmann & Klee
- … 4 more in issues.jsonl

### match_isolated.brand (34)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-34212ac5` The Dawn Kudamm: The Dawn ≠ none (none)
- `post-388b4383` Curry & Chili: Curry und Chili ≠ none (none)
- `post-3a0ad71a` Estelle: Estelle Dining ≠ none (none)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-6577d6bd` Eiscafeteufelchen: Eisteufelchen ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
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
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.brand (28)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-388b4383` Konnopke’s Imbiß: Konnopke's Imbiss ≠ none (none)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Amo Café: none ≠ ama Café (llm)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ KoreYana (llm)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ L'Osteria (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Canal Bakery: CANAL ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-cb785d0b` Sagos: none ≠ Samos (llm)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ none (none)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)

### change.missed (16)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` the Döner was improved day by day since the start, from vegetables to bread
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)

### match.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2a8e9606` Michelberger Hotel: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Zur Bratpfanne: Zur Bratpfanne ≠ brand only
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only

### match_isolated.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - F-hain
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-5b5671fa` City Chicken: brand only ≠ Nhas City Chicken
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
