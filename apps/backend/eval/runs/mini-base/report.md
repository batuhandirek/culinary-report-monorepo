# Ingestion eval: mini-base

2026-11-01 15:22 UTC · 170 reviews, 199 posts, 0 wordings · 502 cases left out (no reference or no output)
Tokens: 1,197,382
Models: review-claims: openai/gpt-5.4-mini (170); claim-parts: openai/gpt-5.4-mini (368); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (88)

## Reviews

| Metric | mini-base | stored | mini-r3 | second-gpt54 | mini-v3 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 97% (934/966) | 93% +3 | 96% +1 | 98% -1 | — |
| Claims that are real (of produced) | 98% (1217/1236) | 99% -1 | 99% ±0 | 99% ±0 | — |
| Sentiment | 91% (972/1065) | 88% +4 | 93% -1 | 98% -6 | — |
| Aspect, exact | 82% (877/1065) | 71% +12 | 82% ±0 | 84% -2 | — |
| Aspect, right root | 89% (945/1065) | 81% +8 | 90% -1 | 88% +1 | — |
| Kind | 87% (931/1065) | 67% +21 | 92% -4 | 97% -10 | — |
| Kind given at all | 99% (1065/1071) | 4% +95 | 98% +1 | 100% -1 | — |
| Changes that are changes | 52% (13/25) | 56% -4 | 72% -20 | 67% -15 | — |
| Changes found | 81% (13/16) | 80% +1 | 81% ±0 | 100% -19 | — |
| Amount | 68% (28/41) | 41% +27 | 76% -8 | 87% -18 | — |
| Foods named, precision | 70% (285/407) | 32% +38 | 71% -1 | 88% -18 | — |
| Foods named, recall | 67% (259/385) | 23% +44 | 67% ±0 | 80% -12 | — |

## Posts and articles

| Metric | mini-base | stored | mini-r3 | second-gpt54 | mini-v3 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 76% (1573/2077) | 56% +20 | 85% -10 | 85% -10 | 82% -7 |
| Claims that are real (of produced) | 93% (2038/2203) | 95% -2 | 88% +5 | 92% ±0 | 87% +6 |
| Sentiment | 87% (1680/1923) | 86% +2 | 88% -1 | 91% -4 | 87% +1 |
| Aspect, exact | 61% (1166/1923) | 63% -3 | 63% -2 | 71% -11 | 60% ±0 |
| Aspect, right root | 74% (1420/1923) | 78% -4 | 76% -2 | 83% -9 | 75% -1 |
| Kind | 83% (1605/1923) | 47% +37 | 84% -1 | 88% -4 | 83% +1 |
| Kind given at all | 100% (1923/1932) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 56% (24/43) | 46% +9 | 51% +5 | 79% -23 | 51% +5 |
| Changes found | 50% (16/32) | 38% +13 | 66% -16 | 60% -10 | 59% -9 |
| Amount | 55% (63/114) | 46% +9 | 47% +8 | 40% +15 | 43% +12 |
| Foods named, precision | 72% (892/1239) | 46% +26 | 75% -3 | 73% -1 | 66% +6 |
| Foods named, recall | 66% (848/1283) | 39% +27 | 63% +4 | 68% -2 | 54% +12 |
| Subject (place, city, none) | 85% (1877/2217) | 85% ±0 | 88% -4 | 94% -9 | 89% -4 |
| Claim on the right place | 90% (1565/1746) | 85% +5 | 91% -2 | 97% -7 | 89% ±0 |
| Places found | 81% (350/433) | 73% +8 | 90% -9 | 86% -6 | 89% -8 |
| Places that are places | 91% (350/383) | 85% +6 | 92% -1 | 94% -3 | 91% ±0 |
| Match: brand (found places) | 92% (322/350) | 92% ±0 | 92% ±0 | 97% -5 | 93% -1 |
| Match: branch (right brand) | 96% (276/288) | 97% -1 | 96% ±0 | 98% -2 | 96% ±0 |
| Match on the reference's places: brand | 93% (393/422) | — | 92% +1 | — | 92% +1 |
| Match on the reference's places: branch | 96% (323/337) | — | 96% ±0 | — | 96% ±0 |
| Promotional flag | 79% (157/199) | 82% -3 | 78% +1 | 69% +10 | 78% +1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-base (train) | mini-base (test) | mini-r3 (test) | second-gpt54 (test) | mini-v3 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 96% | 97% (290/298) | 96% +1 | 98% ±0 | — |
| Claims that are real (of produced) | 98% | 98% (372/378) | 99% -1 | 99% ±0 | — |
| Sentiment | 91% | 92% (305/332) | 92% ±0 | 98% -6 | — |
| Aspect, exact | 83% | 81% (270/332) | 82% -1 | 84% -3 | — |
| Aspect, right root | 89% | 89% (296/332) | 90% -1 | 88% +1 | — |
| Kind | 86% | 90% (298/332) | 92% -2 | 97% -8 | — |
| Kind given at all | 99% | 100% (332/333) | 95% +4 | 100% ±0 | — |
| Changes that are changes | 55% | 40% (2/5) | 100% -60 | 67% -27 | — |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | — |
| Amount | 67% | 71% (12/17) | 67% +4 | 87% -16 | — |
| Foods named, precision | 67% | 78% (92/118) | 71% +7 | 88% -10 | — |
| Foods named, recall | 67% | 69% (86/125) | 60% +9 | 80% -11 | — |

### Posts and articles

| Metric | mini-base (train) | mini-base (test) | mini-r3 (test) | second-gpt54 (test) | mini-v3 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 77% | 73% (445/606) | 88% -15 | 85% -12 | 84% -10 |
| Claims that are real (of produced) | 91% | 96% (595/623) | 86% +10 | 92% +3 | 87% +9 |
| Sentiment | 86% | 91% (514/566) | 88% +3 | 91% ±0 | 87% +3 |
| Aspect, exact | 59% | 65% (367/566) | 61% +4 | 71% -6 | 60% +5 |
| Aspect, right root | 73% | 76% (428/566) | 75% +1 | 83% -7 | 75% +1 |
| Kind | 83% | 85% (481/566) | 84% +1 | 88% -3 | 83% +2 |
| Kind given at all | 99% | 100% (566/567) | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 59% | 45% (5/11) | 48% -2 | 79% -33 | 48% -2 |
| Changes found | 55% | 40% (4/10) | 80% -40 | 60% -20 | 70% -30 |
| Amount | 47% | 77% (24/31) | 67% +11 | 40% +37 | 69% +8 |
| Foods named, precision | 71% | 75% (277/367) | 75% ±0 | 73% +2 | 73% +3 |
| Foods named, recall | 67% | 65% (257/396) | 60% +5 | 68% -3 | 54% +10 |
| Subject (place, city, none) | 84% | 86% (548/638) | 87% -1 | 94% -8 | 88% -2 |
| Claim on the right place | 93% | 83% (421/510) | 91% -8 | 97% -14 | 91% -8 |
| Places found | 82% | 77% (86/111) | 85% -7 | 86% -9 | 84% -6 |
| Places that are places | 94% | 84% (86/102) | 88% -4 | 94% -10 | 87% -3 |
| Match: brand (found places) | 92% | 91% (78/86) | 91% -1 | 97% -6 | 92% -2 |
| Match: branch (right brand) | 95% | 97% (66/68) | 99% -2 | 98% ±0 | 99% -2 |
| Match on the reference's places: brand | 93% | 93% (103/111) | 92% +1 | — | 92% +1 |
| Match on the reference's places: branch | 96% | 95% (80/84) | 96% -1 | — | 96% -1 |
| Promotional flag | 78% | 81% (47/58) | 79% +2 | 69% +12 | 79% +2 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 97% (376/389) | 99% (477/482) | 81% (350/430) | 93% (400/430) | — | — |
| hard | 86% (78/91) | 95% (102/107) | 76% (72/95) | 89% (85/95) | 100% (11/11) | 100% (11/11) |
| lang:de | 97% (336/347) | 98% (428/436) | 85% (317/372) | 91% (339/372) | — | — |
| lang:en | 98% (234/239) | 99% (304/307) | 82% (222/270) | 94% (255/270) | — | — |
| lang:other | 96% (302/313) | 99% (400/405) | 78% (268/345) | 89% (308/345) | — | — |
| lang:tr | 93% (62/67) | 97% (85/88) | 90% (70/78) | 90% (70/78) | — | — |
| length:long | 94% (277/294) | 98% (396/405) | 82% (271/332) | 88% (293/332) | — | — |
| length:medium | 98% (601/615) | 99% (761/771) | 82% (554/672) | 92% (620/672) | — | — |
| length:short | 98% (56/57) | 100% (60/60) | 85% (52/61) | 97% (59/61) | — | — |
| no-transcript | 90% (433/482) | 91% (594/655) | 67% (361/538) | 91% (489/538) | 94% (119/127) | 92% (110/119) |
| own | 89% (59/66) | 90% (105/117) | 78% (60/77) | 94% (72/77) | 100% (20/20) | 100% (20/20) |
| places:few | 73% (1090/1490) | 93% (1452/1562) | 66% (869/1318) | 90% (1190/1318) | 78% (145/186) | 92% (134/145) |
| places:many | 82% (474/578) | 92% (572/623) | 48% (287/594) | 81% (480/594) | 83% (203/245) | 92% (186/203) |
| places:none | 100% (9/9) | 78% (14/18) | 91% (10/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 65% (693/1067) | 94% (830/885) | 51% (415/815) | 84% (684/815) | 67% (133/199) | 95% (127/133) |
| platform:google | 97% (934/966) | 98% (1217/1236) | 82% (877/1065) | 91% (972/1065) | — | — |
| platform:instagram | 90% (293/325) | 91% (405/446) | 66% (240/366) | 90% (329/366) | 90% (64/71) | 92% (59/64) |
| platform:tiktok | 86% (587/685) | 92% (803/872) | 69% (511/742) | 90% (667/742) | 94% (153/163) | 89% (136/153) |
| size:large | 69% (697/1016) | 94% (862/917) | 55% (460/834) | 85% (708/834) | 68% (129/191) | 95% (122/129) |
| size:medium | 79% (606/767) | 95% (760/800) | 62% (449/729) | 88% (642/729) | 92% (130/142) | 89% (116/130) |
| size:small | 92% (270/294) | 86% (416/486) | 71% (257/360) | 92% (330/360) | 91% (91/100) | 92% (84/91) |
| stars:1 | 98% (157/161) | 98% (211/215) | 79% (148/187) | 90% (168/187) | — | — |
| stars:2 | 98% (159/162) | 98% (211/215) | 84% (149/177) | 89% (158/177) | — | — |
| stars:3 | 95% (207/219) | 100% (263/264) | 80% (190/237) | 90% (213/237) | — | — |
| stars:4 | 97% (187/192) | 98% (252/257) | 89% (187/211) | 91% (193/211) | — | — |
| stars:5 | 97% (224/232) | 98% (280/285) | 80% (203/253) | 95% (240/253) | — | — |
| transcript | 85% (447/528) | 93% (614/663) | 68% (390/570) | 89% (507/570) | 92% (98/107) | 87% (85/98) |

## Misses

### parts.aspect (945)

- `review-02556664` at the competition you eat exactly the same thing with limo…: food ≠ other
- `review-02d1586d` they thank the waiter as well: service ≠ none
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the meat in the sandwich was chicken only: menu_variety ≠ ingredient_quality
- `review-0541b749` the pain was crispy: cooking ≠ taste
- `review-0541b749` the légumes were hard to digest: food ≠ food_hygiene
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ none
- `review-1016bd13` large groups should avoid this place: none ≠ space
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ food
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ service
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ service
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: speed_of_service ≠ wait_for_food
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-164fbfea` ordered by app: takeaway_handling ≠ other
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: food ≠ order_accuracy
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-170f36a3` the atmosphere has vibes: atmosphere ≠ vibe
- `review-170f36a3` the food is high in calories: food ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: food ≠ other
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ none
- `review-196641fc` the male kebab experts at pickup are consistently arrogant,…: friendliness ≠ advice
- `review-196641fc` eating on site is possible: space ≠ other
- `review-1eca7dfe` you can specify the spice level: seasoning ≠ other
- `review-257f4791` we were a table of five French people: none ≠ other
- `review-266fe0b8` went in the store: none ≠ other
- `review-2799bbfa` Burgermeister all over is amazing: none ≠ taste
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- `review-279b23c3` everything rated over 10: none ≠ other
- `review-28e4170f` the bike racks can fill up when biking there: accessibility ≠ other
- `review-2b737ce5` the reviewer came here from time to time: none ≠ other
- `review-2b737ce5` the reviewer will not come back anymore: none ≠ other
- `review-2c7253a2` first time trying this renowned Berlin burger joint: none ≠ other
- `review-2c7253a2` overall the burger joint was decent: none ≠ taste
- `review-2c7253a2` the burger joint was less amazing than expected: none ≠ taste
- `review-2c7253a2` the burger joint is a unique local Berlin experience: atmosphere ≠ location
- `review-2c7253a2` the burger joint is converted from a public restroom: interior ≠ other
- `review-2c7253a2` the burger joint is definitely worth a try: none ≠ other
- `review-2c7253a2` arrived around 5 PM: none ≠ other
- … 905 more in issues.jsonl

### parts.foods (791)

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
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer, cola, orange juice, beer]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup, soup]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [hot dishes]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [cold dishes, beer]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [hot dishes]
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: [] ≠ [hot dishes]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- `review-13683c42` the hamburguesas are decent: [hamburguesas] ≠ [burgers]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [burgers]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [fries]
- … 751 more in issues.jsonl

### claims.missed (536)

- `review-0217fd90` very delicious
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab shop in Berlin on Google
- `review-0ac47c59` found nothing to praise about the place
- `review-196641fc` the crowd is a big mix of almost only under-30 tourists, business(wo)men from Asia or Eas…
- `review-196641fc` visited on a late Saturday midday
- `review-196641fc` the kebab experts ignore guests' questions
- `review-36f2fac8` go to another authentic spot instead
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-5cd39af6` the ambience is very cool
- `review-5d173a89` the döner is not worth €7.90
- `review-693fb047` the food was nothing special
- `review-693fb047` expected the best kebab but the kebab was only edible
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7f3142f7` the website's ticket information is very misleading
- `review-80d9a747` loved the visit
- `review-80d9a747` would highly recommend the place
- `review-937ea9e9` Sandos is simply outstanding
- `review-937ea9e9` you immediately feel at ease
- `review-af8dacaa` the place is super
- `review-b9d9100a` the vegetables add a distinct flavour
- `review-b9d9100a` the prices are extremely good and very reasonable
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-c117171d` the place is degrading
- `review-ec04d472` the place is an extreme rip-off
- `review-f51e95e9` everything was great
- `review-fa5b28b1` the understaffing is a big failing of the shop owner
- `review-feb41b4e` the reviewer has to agree with some of the criticism
- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-047130f4` Salami Social Club is the tasty new kid on the Friedrichshain block
- `post-047130f4` Salami Social Club was founded by Jacob and Ben
- `post-047130f4` Salami Social Club's concept is good pizza, beer and music
- `post-047130f4` Salami Social Club wants a great atmosphere to grab a slice
- `post-047130f4` the craft beer scene is one of the most exciting things in Berlin
- `post-047130f4` Salami Social Club serves its beers at the best price they can
- … 496 more in issues.jsonl

### parts.kind (452)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02556664` at the competition you eat exactly the same thing with limo…: opinion ≠ fact
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
- `review-170f36a3` the food is high in calories: opinion ≠ fact
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
- … 412 more in issues.jsonl

### claims.subject (340)

- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-047130f4` only a small handful of places in Berlin serve good pizza: city ≠ place
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: place ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0d1e7abc` the author has been going to Isla for 10 years: place ≠ none
- `post-0dde5eb7` at Bocca Felice the food can be something special: place ≠ none
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1c0d4023` Nobelhart & Schmutzig has a Google rating of 4.4 stars: place ≠ none
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
- … 300 more in issues.jsonl

### parts.sentiment (336)

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
- `review-356e149a` that is no way to treat guests: negative ≠ positive
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
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-6b4df664` a small deduction for the service: negative ≠ mixed
- … 296 more in issues.jsonl

### claims.extra (184)

- `review-1016bd13` first bus had 40 people
- `review-1016bd13` hot dishes started at 7:05 PM
- `review-356e149a` the reviewer replied no
- `review-356e149a` the reviewer said I am Arab
- `review-35fe7952` the Turkish black tea was free
- `review-3f2a2713` it's 2026
- `review-4cd140a3` shown to a table
- `review-510fc086` the place was very cute
- `review-510fc086` the staff were super kind
- `review-510fc086` living in Berlin has advantages
- `review-6752188e` the trip was to Berlin
- `review-71868223` we were very hungry
- `review-71868223` we decided we'd have to wait
- `review-71868223` a delicious döner place
- `review-83cf47fa` the raw fish amount was too small
- `review-8aa327ab` Morgens um acht
- `review-8c6d84ed` they get good ratings
- `review-dcd4db39` the hype is absolut berechtigt
- `review-f1e62446` the "wow" factor
- `post-01239695` someone ate
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` good morning and have a nice, successful day
- `post-047130f4` the original review is from 2016
- `post-0fa29641` this is a Berlin guide, Kreuzberg edition
- `post-0fa29641` the creator wants suggestions for more spots to add
- `post-0fa29641` everything is tagged so the post can be saved for later
- `post-11f0057b` Magma has been stylishly renovated
- `post-1c0d4023` the article aggregates Berlin food editorial recommendations
- `post-1c0d4023` the recommendations are from Berlin's leading food editors
- `post-1c0d4023` more independent editors make a recommendation more reliable
- `post-1c0d4023` 20 restaurants are recommended by at least 5 editors each
- `post-1c0d4023` Restaurant Tim Raue is Asian
- `post-1c0d4023` Funky Fisch is seafood
- `post-1c0d4023` Mastan is French
- `post-1c0d4023` Gazzo Pizza is pizza
- `post-1c25f2d1` a greeting is asked to be passed on when you go
- `post-2161780e` the matcha is meant to be enjoyed consciously and calmly
- `post-2161780e` the matcha is for a small break in daily life
- `post-217c8e79` they want to compare whether it is better elsewhere in Berlin
- … 144 more in issues.jsonl

### claims.place (181)

- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the butter is served with wheat sourdough bread from Albatr…: Magma ≠ Albatross Bäckerei
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: MoMo Station ≠ Jules B-Part
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` through the tinted shop window you can watch the three wome…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
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
- `post-2a8e9606` the Starbucks branch is geared only to speed and cadence: Starbucks ≠ Café Bravo
- `post-2a8e9606` Mahla and Hein were involved in conceiving the new Kulturca…: Kulturcafé im Dussmann Kulturkaufhaus ≠ none
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-388b4383` the Curry XL at Cult Curry Mitte, with three Currywürste, P…: Cult Curry Mitte ≠ Curry & Chili
- `post-388b4383` the Curry XL at Cult Curry Mitte, with three Currywürste, P…: Cult Curry Mitte ≠ Curry & Chili
- `post-388b4383` the Curry XL at Cult Curry Mitte, with three Currywürste, P…: Cult Curry Mitte ≠ Curry & Chili
- `post-388b4383` Reina Lehmann cares only about the sausage, not which celeb…: Curry Baude ≠ Curry Wolf
- `post-388b4383` the family business Schmidt's Imbiss has stood for the best…: Schmidt’s Imbiss ≠ Curry Wolf
- `post-3a0ad71a` FACIL is listed by editors and guides: FACIL ≠ Rram
- `post-3a0ad71a` FACIL is among the restaurants selected by Michael Kempf & …: FACIL ≠ Rram
- `post-3a0ad71a` Max Lemke is the owner and baker of Common: Common ≠ Mr Minsch
- `post-3a0ad71a` Common's owner Max Lemke is known for his exceptional dough…: Common ≠ Mr Minsch
- … 141 more in issues.jsonl

### places.missed (83)

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
- … 43 more in issues.jsonl

### parts.amount (64)

- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 8 minutes
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 12 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-90e99b19` the place might be okay if passing nearby: —  ≠ 15 minutes
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-020c68fb` about ten different birre to taste, not bad: —  ≠ 10 money
- `post-0216fd1d` Neukölln has places to eat well and cheaply: —  ≠ 6 money
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: —  ≠ 8 money
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
- `post-2a8e9606` the family had a Melange and a Mehlspeise at the coffeehous…: —  ≠ 45 minutes
- `post-31344bc5` the best Ramen bars in Berlin have Google ratings above 4.5: —  ≠ 4.5 money
- `post-31344bc5` 350 of 632 Berlin restaurants on the map offer vegetarian o…: —  ≠ 350 money
- … 24 more in issues.jsonl

### places.extra (33)

- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-1a2cebf2` Jules B-Part
- `post-233389f4` indisches Restaurant
- `post-3a0ad71a` Rogacki
- `post-40f86f07` Jan Burger Restaurant
- `post-483d6cc6` Love at First Bite Berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-4a742b09` RiskyLounge
- `post-4c3e2a10` Haftschaden
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-63b83025` Restaurant Athen Adlershof
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

### change.false (31)

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
- `post-11f0057b` Magma has been stylishly renovated
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
- `post-cb785d0b` the falafel are also made in-house
- `post-d1ab7367` the shop adds wines reflecting South America
- `post-fe3794c9` the SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin this year

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

### match.brand (28)

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

### change.missed (19)

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
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
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
