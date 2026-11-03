# Ingestion eval: mini-base

2026-11-02 09:20 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output) · 2 sources dropped by the agents (scored as nothing read)
Tokens: 1,198,833
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (368); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (88)

## Reviews

| Metric | mini-base | stored | one-v1 | one-v2 | mini-v6b |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% (935/978) | 93% +2 | 98% -2 | 98% -2 | 94% +1 |
| Claims that are real (of produced) | 99% (1220/1236) | 99% ±0 | 98% +1 | 98% ±0 | 99% ±0 |
| Sentiment | 91% (971/1063) | 88% +4 | 92% -1 | 93% -1 | 93% -1 |
| Aspect, exact | 77% (819/1063) | 71% +6 | 80% -3 | 82% -5 | 79% -2 |
| Aspect, right root | 87% (925/1063) | 81% +6 | 90% -3 | 91% -4 | 84% +3 |
| Kind | 88% (937/1063) | 67% +21 | 94% -6 | 95% -7 | 95% -7 |
| Kind given at all | 99% (1063/1069) | 4% +95 | 100% -1 | 100% -1 | 98% +1 |
| Changes that are changes | 52% (13/25) | 56% -4 | 58% -6 | 55% -3 | 75% -23 |
| Changes found | 81% (13/16) | 80% +1 | 75% +6 | 81% ±0 | 81% ±0 |
| Amount | 69% (29/42) | 41% +28 | 63% +6 | 73% -4 | 65% +4 |
| Foods named, precision | 71% (287/407) | 32% +38 | 75% -4 | 76% -5 | 78% -8 |
| Foods named, recall | 68% (260/384) | 23% +45 | 86% -18 | 86% -18 | 79% -11 |

## Posts and articles

| Metric | mini-base | stored | one-v1 | one-v2 | mini-v6b |
|---|---|---|---|---|---|
| Claims found (of the reference) | 75% (1564/2077) | 56% +20 | 86% -10 | 86% -11 | 85% -10 |
| Claims that are real (of produced) | 94% (2062/2203) | 95% -1 | 88% +5 | 86% +7 | 91% +3 |
| Sentiment | 88% (1678/1910) | 86% +2 | 90% -3 | 89% -1 | 89% -1 |
| Aspect, exact | 49% (934/1910) | 63% -14 | 65% -16 | 70% -21 | 72% -23 |
| Aspect, right root | 73% (1398/1910) | 78% -4 | 83% -10 | 86% -13 | 81% -8 |
| Kind | 86% (1643/1910) | 47% +39 | 87% -1 | 87% -1 | 85% +1 |
| Kind given at all | 100% (1910/1919) | 4% +96 | 100% ±0 | 100% ±0 | 98% +2 |
| Changes that are changes | 53% (23/43) | 46% +7 | 49% +5 | 41% +12 | 40% +13 |
| Changes found | 38% (12/32) | 38% ±0 | 63% -25 | 66% -28 | 59% -22 |
| Amount | 53% (64/121) | 46% +7 | 74% -21 | 71% -18 | 66% -13 |
| Foods named, precision | 74% (940/1265) | 46% +28 | 74% ±0 | 73% +1 | 80% -6 |
| Foods named, recall | 68% (877/1291) | 39% +29 | 82% -15 | 83% -15 | 75% -7 |
| Subject (place, city, none) | 84% (1873/2232) | 85% -1 | 91% -7 | 90% -7 | 86% -2 |
| Claim on the right place | 90% (1575/1743) | 85% +6 | 92% -1 | 92% -2 | 91% -1 |
| Places found | 81% (352/433) | 73% +8 | 87% -6 | 88% -7 | 90% -9 |
| Places that are places | 92% (352/383) | 85% +7 | 91% +1 | 91% +1 | 89% +3 |
| Match: brand (found places) | 92% (323/352) | 92% ±0 | 93% -1 | 91% ±0 | 93% -1 |
| Match: branch (right brand) | 96% (276/288) | 97% -1 | 96% ±0 | 94% +1 | 95% ±0 |
| Match on the reference's places: brand | 93% (393/422) | — | 93% ±0 | 92% +1 | 92% +1 |
| Match on the reference's places: branch | 96% (323/337) | — | 96% ±0 | 95% ±0 | 96% ±0 |
| Promotional flag | 79% (157/199) | 82% -3 | 78% +1 | 79% -1 | 80% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-base (train) | mini-base (test) | one-v1 (test) | one-v2 (test) | mini-v6b (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% | 97% (290/298) | 98% ±0 | 97% +1 | 94% +3 |
| Claims that are real (of produced) | 98% | 99% (375/378) | 99% ±0 | 99% ±0 | 100% -1 |
| Sentiment | 91% | 92% (306/332) | 91% +1 | 93% -1 | 94% -2 |
| Aspect, exact | 77% | 77% (255/332) | 78% -2 | 79% -3 | 77% ±0 |
| Aspect, right root | 87% | 87% (290/332) | 89% -1 | 88% ±0 | 82% +5 |
| Kind | 87% | 91% (301/332) | 95% -4 | 96% -5 | 98% -7 |
| Kind given at all | 99% | 100% (332/333) | 100% ±0 | 100% ±0 | 95% +5 |
| Changes that are changes | 55% | 40% (2/5) | 40% ±0 | 40% ±0 | 67% -27 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 62% | 81% (13/16) | 72% +9 | 82% -1 | 81% ±0 |
| Foods named, precision | 67% | 78% (93/119) | 76% +2 | 76% +2 | 78% ±0 |
| Foods named, recall | 67% | 70% (87/125) | 83% -13 | 82% -12 | 67% +3 |

### Posts and articles

| Metric | mini-base (train) | mini-base (test) | one-v1 (test) | one-v2 (test) | mini-v6b (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 77% | 72% (438/606) | 91% -18 | 90% -18 | 90% -17 |
| Claims that are real (of produced) | 93% | 96% (596/623) | 91% +5 | 85% +11 | 92% +3 |
| Sentiment | 86% | 92% (504/546) | 90% +2 | 89% +3 | 90% +3 |
| Aspect, exact | 48% | 51% (277/546) | 62% -12 | 67% -16 | 70% -19 |
| Aspect, right root | 72% | 76% (413/546) | 80% -5 | 82% -6 | 80% -4 |
| Kind | 85% | 89% (487/546) | 86% +3 | 86% +3 | 85% +4 |
| Kind given at all | 99% | 100% (546/547) | 100% ±0 | 100% ±0 | 97% +3 |
| Changes that are changes | 56% | 45% (5/11) | 50% -5 | 34% +11 | 41% +4 |
| Changes found | 41% | 30% (3/10) | 70% -40 | 70% -40 | 80% -50 |
| Amount | 46% | 69% (25/36) | 72% -2 | 64% +6 | 66% +4 |
| Foods named, precision | 73% | 78% (283/365) | 72% +6 | 72% +6 | 79% -1 |
| Foods named, recall | 68% | 67% (264/396) | 80% -13 | 85% -18 | 70% -3 |
| Subject (place, city, none) | 84% | 85% (527/622) | 91% -6 | 91% -6 | 89% -4 |
| Claim on the right place | 93% | 84% (413/490) | 88% -4 | 89% -5 | 90% -6 |
| Places found | 82% | 78% (87/111) | 84% -5 | 90% -12 | 85% -6 |
| Places that are places | 94% | 85% (87/102) | 88% -2 | 85% +1 | 84% +1 |
| Match: brand (found places) | 92% | 90% (78/87) | 90% -1 | 90% ±0 | 91% -2 |
| Match: branch (right brand) | 95% | 97% (66/68) | 99% -2 | 96% +1 | 99% -2 |
| Match on the reference's places: brand | 93% | 93% (103/111) | 93% ±0 | 91% +2 | 93% ±0 |
| Match on the reference's places: branch | 96% | 95% (80/84) | 96% -1 | 95% ±0 | 96% -1 |
| Promotional flag | 78% | 81% (47/58) | 79% +2 | 83% -2 | 79% +2 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 97% (377/389) | 99% (479/482) | 78% (334/430) | 93% (399/430) | — | — |
| hard | 85% (77/91) | 95% (102/107) | 60% (56/94) | 90% (85/94) | 100% (11/11) | 100% (11/11) |
| lang:de | 94% (338/359) | 99% (432/436) | 81% (302/371) | 91% (339/371) | — | — |
| lang:en | 98% (234/239) | 99% (305/307) | 75% (203/271) | 94% (255/271) | — | — |
| lang:other | 96% (299/313) | 98% (396/405) | 72% (244/341) | 89% (305/341) | — | — |
| lang:tr | 96% (64/67) | 99% (87/88) | 88% (70/80) | 90% (72/80) | — | — |
| length:long | 95% (279/294) | 98% (395/405) | 78% (258/330) | 89% (293/330) | — | — |
| length:medium | 96% (600/627) | 99% (765/771) | 76% (513/672) | 92% (619/672) | — | — |
| length:short | 98% (56/57) | 100% (60/60) | 79% (48/61) | 97% (59/61) | — | — |
| no-transcript | 89% (430/482) | 91% (594/655) | 56% (300/539) | 91% (493/539) | 94% (120/127) | 92% (110/120) |
| own | 91% (60/66) | 90% (105/117) | 64% (50/78) | 94% (73/78) | 100% (20/20) | 100% (20/20) |
| places:few | 71% (1061/1490) | 95% (1480/1562) | 54% (702/1290) | 91% (1175/1290) | 78% (146/186) | 92% (134/146) |
| places:many | 85% (494/578) | 91% (568/623) | 37% (223/609) | 81% (493/609) | 83% (204/245) | 92% (187/204) |
| places:none | 100% (9/9) | 78% (14/18) | 82% (9/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 66% (701/1067) | 95% (843/885) | 40% (330/824) | 84% (692/824) | 67% (134/199) | 96% (128/134) |
| platform:google | 96% (935/978) | 99% (1220/1236) | 77% (819/1063) | 91% (971/1063) | — | — |
| platform:instagram | 90% (291/325) | 91% (406/446) | 55% (201/364) | 91% (331/364) | 92% (65/71) | 91% (59/65) |
| platform:tiktok | 84% (572/685) | 93% (813/872) | 56% (403/722) | 91% (655/722) | 94% (153/163) | 89% (136/153) |
| size:large | 69% (697/1016) | 97% (886/917) | 43% (361/837) | 84% (701/837) | 68% (130/191) | 95% (123/130) |
| size:medium | 78% (595/767) | 95% (760/800) | 50% (352/706) | 91% (640/706) | 92% (130/142) | 89% (116/130) |
| size:small | 93% (272/294) | 86% (416/486) | 60% (221/367) | 92% (337/367) | 92% (92/100) | 91% (84/92) |
| stars:1 | 96% (155/161) | 98% (211/215) | 73% (133/183) | 91% (166/183) | — | — |
| stars:2 | 98% (159/162) | 97% (208/215) | 81% (143/176) | 89% (157/176) | — | — |
| stars:3 | 95% (209/219) | 100% (263/264) | 73% (175/239) | 90% (214/239) | — | — |
| stars:4 | 92% (188/204) | 99% (254/257) | 84% (178/212) | 92% (194/212) | — | — |
| stars:5 | 97% (224/232) | 100% (284/285) | 75% (190/253) | 95% (240/253) | — | — |
| transcript | 82% (433/528) | 94% (625/663) | 56% (304/547) | 90% (493/547) | 92% (98/107) | 87% (85/98) |

## Misses

### parts.aspect (1220)

- `review-019a8099` a very nice restaurant: none ≠ atmosphere
- `review-02556664` at the competition you eat exactly the same thing with limo…: none ≠ other
- `review-02d1586d` the staff were very good: service ≠ friendliness
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the pain was crispy: cooking ≠ taste
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: food ≠ taste
- `review-0ac47c59` the chicken meat was in the döner: food ≠ ingredient_quality
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: on_the_house ≠ none
- `review-1016bd13` large groups should avoid this place: occasion ≠ space
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: drinks ≠ none
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: reservation_handling ≠ none
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: reservation_handling ≠ none
- `review-1016bd13` the restaurant said the cold dishes were already set out: service ≠ food
- `review-1016bd13` the soup was served quickly on arrival: wait_for_food ≠ none
- `review-1016bd13` reserved 15 tables in total: reservation_handling ≠ none
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: pressure ≠ advice
- `review-13683c42` the chain has several locations in Berlin: other ≠ none
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: presentation ≠ portion_size
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: menu_variety ≠ order_accuracy
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-170f36a3` the atmosphere has vibes: atmosphere ≠ vibe
- `review-170f36a3` the food is high in calories: food ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: menu_variety ≠ other
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ none
- `review-196641fc` the male kebab experts at pickup are consistently arrogant,…: friendliness ≠ advice
- `review-19801259` the shakes were so good too: drink_quality ≠ taste
- `review-1eca7dfe` the restaurant is lovely: none ≠ atmosphere
- `review-1eca7dfe` you can specify the spice level: seasoning ≠ other
- `review-257f4791` we were a table of five French people: none ≠ other
- `review-266fe0b8` went in the store: none ≠ other
- `review-27722511` there are better kebabs in Berlin: none ≠ taste
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: food ≠ taste
- `review-2799bbfa` Burgermeister all over is amazing: none ≠ taste
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- `review-279b23c3` everything rated over 10: none ≠ other
- `review-28e4170f` Markthalle Neun was a great indoor market hall: none ≠ interior
- `review-28e4170f` the bike racks can fill up when biking there: accessibility ≠ other
- … 1180 more in issues.jsonl

### parts.foods (752)

- `review-0217fd90` the soup was really incredibly good: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was really incredibly good: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ [lime]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ [lime]
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [döner]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-037bbe20` the food was good: [] ≠ [Cibo]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato, potato, dürüm]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [potato, dürüm]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, marul, domates, soğandan oluşan salataları]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [soğandan oluşan salataları]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer, cola, orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [hot dishes]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: [] ≠ [hot dishes]
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: [] ≠ [hot dishes]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- `review-13f72d12` the taste of the kebsa was mediocre: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- … 712 more in issues.jsonl

### claims.missed (556)

- `review-0217fd90` very delicious
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab shop in Berlin on Google
- `review-0ac47c59` found nothing to praise about the place
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-69365171` had the Büffet from 12-15 Uhr for 16,50€
- `review-69365171` very good selection of food and desserts
- `review-69365171` value for money is ok
- `review-69365171` staff very friendly
- `review-69365171` we will come back
- `review-693fb047` the food was nothing special
- `review-693fb047` expected the best kebab but the kebab was only edible
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
- `review-937ea9e9` Sandos is simply outstanding
- `review-937ea9e9` you immediately feel at ease
- `review-99fbc478` the place is like an industrial factory
- `review-99fbc478` we will never come back here
- `review-af8dacaa` the place is super
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- `review-ec04d472` the place is an extreme rip-off
- … 516 more in issues.jsonl

### parts.kind (393)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` Rüyam Gemüse Kebab was their choice on their first day in B…: fact ≠ verdict
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: verdict ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-0ac47c59` the reviews were probably inflated: opinion ≠ fact
- `review-0ac47c59` orders deliberately not taken from the person at the front …: opinion ≠ fact
- `review-0ac47c59` asking a question in Turkish gets a 'no Turkish' answer: opinion ≠ fact
- `review-1016bd13` large groups should avoid this place: verdict ≠ opinion
- `review-1016bd13` none of the tables had a bottle opener: opinion ≠ fact
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: opinion ≠ fact
- `review-1016bd13` drinks are sold at exorbitant prices: opinion ≠ fact
- `review-16bdd5e0` they mixed up our sauces: opinion ≠ fact
- `review-16bdd5e0` my sauce was wrong: opinion ≠ fact
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: opinion ≠ fact
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: opinion ≠ fact
- `review-1798cc23` two things were disappointing: opinion ≠ fact
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-1798cc23` the Pommes were forgotten: opinion ≠ fact
- `review-1798cc23` no information was given about the Weinen: opinion ≠ fact
- `review-196641fc` ordering was with a friendly lady: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-21de844d` waited over half an hour before being served: opinion ≠ fact
- `review-2799bbfa` only this branch gave the reviewer a wrong takeaway order: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: opinion ≠ fact
- `review-2b737ce5` the price was affordable: opinion ≠ fact
- `review-2c7253a2` the burger joint is a unique local Berlin experience: opinion ≠ verdict
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-3486a0a9` would love to see gf buns on offer: opinion ≠ new_item
- `review-356e149a` the employee made me wait several more minutes before takin…: opinion ≠ fact
- `review-3639cae4` the kebab had loads of lemon: opinion ≠ fact
- `review-3639cae4` there were practically no sauces: opinion ≠ fact
- … 353 more in issues.jsonl

### claims.subject (359)

- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0d1e7abc` the author has been going to Isla for 10 years: place ≠ none
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant has an impressive ambience: none ≠ city
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: place ≠ city
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1ca1ffee` the creator would definitely come back: place ≠ none
- `post-1ca1ffee` the creator celebrates Doree 65 more than any steakhouse: place ≠ none
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1d0aeaca` Miriam considers a Club Mate flavor as the Berlin flavor: place ≠ none
- `post-1d0aeaca` a sauerkraut with lemon flavor actually doesn't sound too b…: place ≠ none
- `post-1d0aeaca` Miriam scrunched her nose at a cold doner flavor: place ≠ none
- `post-1d0aeaca` Miriam says the proper Berlin flavor is anything with beer: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-1e024518` orders can be placed directly at masalas.de: place ≠ none
- `post-217c8e79` Bún chả was tested: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` Fischsoße is very popular in Vietnam: none ≠ city
- … 319 more in issues.jsonl

### parts.sentiment (324)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab: positive ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-07871fa7` all in all pretty okay: positive ≠ neutral
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
- `review-21de844d` waited over half an hour before being served: negative ≠ neutral
- `review-27722511` there are better kebabs in Berlin: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ positive
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3bab8289` the food is nothing extraordinary: negative ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3e075e7e` doesn't know what people are raving about: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ neutral
- `review-41d8256f` the Pommes were sort of okay: mixed ≠ neutral
- `review-4a46a87d` the new location isn't the same as the old one: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` once seated they got the menus and the food quickly: positive ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-5cd39af6` especially the young man with short white/blond hair was fr…: positive ≠ neutral
- `review-5cd39af6` the young man with short blond hair is truly the best guy: positive ≠ neutral
- `review-5d173a89` the döner is not worth €7.90: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- … 284 more in issues.jsonl

### claims.place (168)

- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the butter is served with wheat sourdough bread from Albatr…: Magma ≠ Albatross Bäckerei
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: MoMo Station ≠ Jules B-Part
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` ten dumplings cost 16 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` 20 dumplings cost 30 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Manufaktur is open Wednesday to Sunday from 12 to 18: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2a8e9606` Otto is run by Zupke and Ursus: Otto ≠ Tulus Lotrek
- `post-2a8e9606` Pluto is run by Zupke and Ursus: Pluto ≠ Tulus Lotrek
- `post-2a8e9606` Trio is run by Zupke and Ursus: Trio ≠ Tulus Lotrek
- `post-2a8e9606` the Starbucks branch is geared only to speed and cadence: Starbucks ≠ Café Bravo
- `post-2a8e9606` Café Benjamine is one of the two most beautiful cultural ca…: Café Benjamine ≠ none
- `post-2a8e9606` tipBerlin is enthusiastic about Barlevain: Barlevain ≠ Haus am Waldsee
- `post-2a8e9606` Barlevain is a casual neighbourhood spot: Barlevain ≠ Haus am Waldsee
- `post-2a8e9606` File Asto serves great Greek food: File Asto ≠ Haus am Waldsee
- `post-2a8e9606` Sagma is wine bar, pub and Viennese Beisl at once: Sagma ≠ Haus am Waldsee
- `post-2a8e9606` Almi Bistro comes from Saint Petersburg to Berlin: Almi Bistro ≠ Haus am Waldsee
- `post-2a8e9606` Almi Bistro is a true discovery: Almi Bistro ≠ Haus am Waldsee
- `post-2a8e9606` Burma Bliss in Charlottenburg serves Burmese food: Burma Bliss ≠ Haus am Waldsee
- `post-2a8e9606` the Kartoffelpüree at Nobelhardt & Schmutzig can hardly be …: Nobelhardt & Schmutzig ≠ Haus am Waldsee
- `post-2a8e9606` Volk serves Seafood for lunch: Volk ≠ Haus am Waldsee
- `post-2a8e9606` lunch at Volk is like in Marseille: Volk ≠ Haus am Waldsee
- … 128 more in issues.jsonl

### claims.extra (157)

- `review-1016bd13` first bus had 40 people
- `review-1016bd13` each table was supposed to have 6 bottles of beer
- `review-1016bd13` the soup arrived quickly
- `review-1016bd13` cold dishes were already laid out
- `review-1016bd13` hot dishes started at 7:05 PM
- `review-1016bd13` serve dishes one at a time
- `review-356e149a` the reviewer replied no
- `review-356e149a` the reviewer leaned against the counter for a moment
- `review-356e149a` the reviewer said I am Arab
- `review-35fe7952` the Turkish black tea was free
- `review-3f2a2713` it's 2026
- `review-4cd140a3` shown to a table
- `review-6752188e` the trip was to Berlin
- `review-71868223` we decided we'd have to wait
- `review-88fe4146` the reviewer and friend were about to sit down together
- `review-f1e62446` the "wow" factor
- `post-01239695` someone ate
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` good morning and have a nice, successful day
- `post-0216fd1d` there are 6 food spots in Neukölln
- `post-0216fd1d` the guide is for Neukölln
- `post-047130f4` the place remains active in 2026
- `post-047130f4` the original review is from 2016
- `post-047130f4` Nudja is spicy soft chili salami meat
- `post-0dde5eb7` the dish did not need much to make them happy
- `post-0fa29641` this is a Berlin guide, Kreuzberg edition
- `post-0fa29641` the creator wants suggestions for more spots to add
- `post-0fa29641` everything is tagged so the post can be saved for later
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-1c0d4023` Restaurant Tim Raue is Asian
- `post-1c0d4023` Funky Fisch is seafood
- `post-1c0d4023` Mastan is French
- `post-1c0d4023` Gazzo Pizza is pizza
- `post-1c25f2d1` a greeting is asked to be passed on when you go
- `post-2161780e` the matcha is meant to be enjoyed consciously and calmly
- `post-2161780e` the matcha is for a small break in daily life
- `post-217c8e79` they want to compare whether it is better elsewhere in Berlin
- `post-233389f4` they ordered there
- … 117 more in issues.jsonl

### places.missed (81)

- `post-0bf8447d` Pastaia
- `post-1e024518` Masalas
- `post-22c25ac1` Yumcha Heroes Manufaktur
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-2a8e9606` Landmann
- `post-2a8e9606` Schwarzes Kamel
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
- … 41 more in issues.jsonl

### parts.amount (70)

- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 8 minutes
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 12 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-020c68fb` about ten different birre to taste, not bad: —  ≠ 10 money
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: —  ≠ 7 minutes
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: —  ≠ 20 minutes
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: —  ≠ 7 money
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Otto is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Cookies Cream is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Mastan is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Barra is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Sathutu is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Stoke is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Gazzo Pizza is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Michelberger Restaurant is recommended by 5 food editorial …: —  ≠ 5 money
- `post-2927e673` 5% discount on the first GetYourGuide app booking with code…: —  ≠ 5 money
- `post-2a8e9606` Ilona Scholl is the host at Tulus Lotrek: —  ≠ 45 minutes
- `post-2a8e9606` the family had a Melange and a Mehlspeise at the coffeehous…: —  ≠ 45 minutes
- `post-31344bc5` the best Ramen bars in Berlin have Google ratings above 4.5: —  ≠ 4.5 money
- … 30 more in issues.jsonl

### change.false (32)

- `review-4cd140a3` the service got worse
- `review-4cd140a3` the restaurant got fuller
- `review-4cd140a3` the restaurant got louder
- `review-70467fba` the whole experience was even longer
- `review-7593dfff` once he showed up, everything went faster
- `review-b8f6f582` the Agepan is delicious
- `review-b8f6f582` the Agepan is a bit difficult to eat
- `review-c5e1a090` had much fewer strawberries
- `review-c9cea664` a whole portion was missing from the packed-up leftovers
- `review-e0a6a0fe` made it with onions and parsley
- `review-e0a6a0fe` forgot to make another shawarma in the order
- `review-fa5b28b1` the döner was very different
- `post-388b4383` Konnopke’s Imbiß became a cult place after reunification
- `post-3e56e67d` their last video was still before the shop was ready
- `post-3e56e67d` everything is finished now
- `post-483d6cc6` the second location in Mitte just opened
- `post-6ddca88c` Breda is a new trattoria by the Pinci founders
- `post-6ddca88c` the Garibaldi became the signature drink after opening
- `post-75c11d7c` Nichi Getsu opened in June 2026
- `post-75c11d7c` at lunch the focus shifts to Bara Chirashi
- `post-909ca5ee` Barlevain opened in spring
- `post-909ca5ee` the menu changes seasonally
- `post-99e89441` the food feels different after seeing how it is made
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-ab252276` Haus des Döners is now there
- `post-b5e879f0` the food stayed affordable despite rising costs
- `post-baac3611` 44 CHKN is opening its third branch soon
- `post-cb785d0b` they improved everything from vegetables to bread
- `post-cb785d0b` they now bake their bread themselves
- `post-cb785d0b` the falafel are also made in-house
- `post-cb785d0b` their prep kitchen has changed a lot
- `post-fe3794c9` the SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin this year

### places.extra (31)

- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-1a2cebf2` Jules B-Part
- `post-233389f4` indisches Restaurant
- `post-40f86f07` Jan Burger Restaurant
- `post-483d6cc6` Love at First Bite Berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-4a742b09` RiskyLounge
- `post-4c3e2a10` Haftschaden
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-7e6e2acc` Magdalena
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Soehnes
- `post-8901fb9b` Mister Scott from Bonanza Coffee
- `post-8901fb9b` Boy Boy
- `post-93526d04` Baklava Laden
- `post-9f93c25b` Borschtsch
- `post-9f93c25b` Main
- `post-ad6a11c0` Korean restaurant
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt gegenüber des ehemaligen Restaurants
- `post-cb785d0b` sagros
- `post-cecea20e` Bikini Berlin
- `post-d232f1ca` BRLO Beer
- `post-f0fb51e5` Hackescher Markt
- `post-fc96acff` The Mandala Hotel
- `post-fe3794c9` SpreeWiesn

### match.brand (29)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3a0ad71a` Pavillon am Ufer: none ≠ BAU - BAR AM UFER (llm)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4a742b09` Village House: none ≠ Bantou Village (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ none (none)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ none (none)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)

### match_isolated.brand (29)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3a0ad71a` Estelle: Estelle Dining ≠ none (none)
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
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)

### change.missed (23)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-2a8e9606` Sören Zupke and Vadim Otto Ursus take over Café Bravo in the summer
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-7516d1de` Bahadur now operates as Prince of Punjab at the same address
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-b8d2bcf3` in July 2026 a new generation took over Bravo: Clemens Roesch, Eva Alken, Sören Zuppke an…
- `post-b8d2bcf3` the pavilion was refurnished with architects Studio Affin without changing its openness
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-e2a421e9` Butter Lindner was renamed to just Lindner
- `post-fc96acff` Facil has quietly gotten better

### match_isolated.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
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
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### match.branch (12)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Café, Breakfast Brunch
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-b2993d78` Mani in Pasta: Mani in Pasta - Markthalle ≠ brand only
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only
