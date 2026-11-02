# Ingestion eval: one-v1

2026-11-01 22:18 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output)
Tokens: 13,868,704
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (369); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (92)

## Reviews

| Metric | one-v1 | stored | mini-v6b | mini-v6 | mini-v5 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 98% (959/978) | 93% +5 | 97% +2 | 97% +1 | — |
| Claims that are real (of produced) | 98% (1275/1301) | 99% -1 | 98% ±0 | 98% ±0 | — |
| Sentiment | 92% (1018/1102) | 88% +5 | 93% ±0 | 92% +1 | — |
| Aspect, exact | 86% (943/1102) | 71% +15 | 79% +7 | 83% +2 | — |
| Aspect, right root | 92% (1018/1102) | 81% +12 | 84% +8 | 89% +3 | — |
| Kind | 94% (1040/1102) | 67% +28 | 95% -1 | 95% ±0 | — |
| Kind given at all | 100% (1102/1102) | 4% +96 | 98% +2 | 100% ±0 | — |
| Changes that are changes | 58% (14/24) | 56% +2 | 75% -17 | 63% -4 | — |
| Changes found | 75% (12/16) | 80% -5 | 81% -6 | 81% -6 | — |
| Amount | 67% (34/51) | 41% +25 | 65% +2 | 60% +7 | — |
| Foods named, precision | 75% (358/479) | 32% +42 | 78% -4 | 80% -5 | — |
| Foods named, recall | 86% (331/384) | 23% +63 | 78% +9 | 78% +9 | — |

## Posts and articles

| Metric | one-v1 | stored | mini-v6b | mini-v6 | mini-v5 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 86% (1777/2077) | 56% +30 | 87% -1 | 84% +2 | 83% +3 |
| Claims that are real (of produced) | 88% (2573/2912) | 95% -6 | 90% -2 | 88% +1 | 87% +2 |
| Sentiment | 91% (2028/2239) | 86% +5 | 87% +3 | 88% +3 | 88% +3 |
| Aspect, exact | 76% (1700/2239) | 63% +13 | 69% +7 | 74% +2 | 72% +4 |
| Aspect, right root | 86% (1922/2239) | 78% +8 | 79% +7 | 85% +1 | 81% +5 |
| Kind | 87% (1954/2239) | 47% +40 | 83% +4 | 86% +1 | 83% +4 |
| Kind given at all | 100% (2239/2239) | 4% +96 | 98% +2 | 99% +1 | 99% +1 |
| Changes that are changes | 49% (42/86) | 46% +2 | 40% +9 | 38% +11 | 47% +2 |
| Changes found | 63% (20/32) | 38% +25 | 59% +3 | 53% +9 | 59% +3 |
| Amount | 74% (63/85) | 46% +28 | 63% +12 | 55% +19 | 54% +20 |
| Foods named, precision | 74% (1293/1740) | 46% +28 | 77% -3 | 78% -4 | 77% -3 |
| Foods named, recall | 82% (1164/1411) | 39% +44 | 73% +9 | 75% +7 | 78% +5 |
| Subject (place, city, none) | 91% (2473/2706) | 85% +6 | 87% +4 | 87% +4 | 87% +5 |
| Claim on the right place | 92% (2132/2324) | 85% +7 | 89% +2 | 91% +1 | 89% +3 |
| Places found | 87% (378/433) | 73% +14 | 90% -3 | 91% -4 | 88% -1 |
| Places that are places | 91% (378/417) | 85% +6 | 89% +2 | 89% +1 | 89% +2 |
| Match: brand (found places) | 93% (350/378) | 92% +1 | 93% ±0 | 92% ±0 | 93% -1 |
| Match: branch (right brand) | 96% (294/306) | 97% -1 | 95% +1 | 95% +1 | 95% +1 |
| Match on the reference's places: brand | 93% (402/433) | — | 92% +1 | 92% +1 | 94% -1 |
| Match on the reference's places: branch | 96% (330/344) | — | 96% ±0 | 96% ±0 | 97% -1 |
| Promotional flag | 78% (155/199) | 82% -4 | 80% -2 | 77% +1 | 78% ±0 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | one-v1 (train) | one-v1 (test) | mini-v6b (test) | mini-v6 (test) | mini-v5 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 98% | 98% (291/298) | 95% +2 | 96% +1 | — |
| Claims that are real (of produced) | 97% | 99% (373/375) | 99% ±0 | 100% ±0 | — |
| Sentiment | 93% | 91% (302/333) | 94% -3 | 91% ±0 | — |
| Aspect, exact | 85% | 87% (290/333) | 77% +11 | 84% +3 | — |
| Aspect, right root | 93% | 91% (304/333) | 83% +9 | 91% ±0 | — |
| Kind | 94% | 95% (315/333) | 98% -3 | 95% ±0 | — |
| Kind given at all | 100% | 100% (333/333) | 95% +5 | 100% ±0 | — |
| Changes that are changes | 63% | 40% (2/5) | 67% -27 | 40% ±0 | — |
| Changes found | 71% | 100% (2/2) | 100% ±0 | 100% ±0 | — |
| Amount | 64% | 72% (13/18) | 81% -9 | 67% +6 | — |
| Foods named, precision | 74% | 76% (103/136) | 78% -2 | 84% -8 | — |
| Foods named, recall | 88% | 83% (99/120) | 65% +17 | 83% ±0 | — |

### Posts and articles

| Metric | one-v1 (train) | one-v1 (test) | mini-v6b (test) | mini-v6 (test) | mini-v5 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 83% | 91% (549/606) | 89% +2 | 88% +3 | 86% +5 |
| Claims that are real (of produced) | 87% | 91% (838/920) | 92% -1 | 88% +3 | 86% +5 |
| Sentiment | 91% | 91% (656/724) | 88% +2 | 88% +2 | 90% ±0 |
| Aspect, exact | 76% | 75% (546/724) | 69% +6 | 72% +4 | 67% +9 |
| Aspect, right root | 86% | 85% (612/724) | 78% +6 | 82% +3 | 76% +9 |
| Kind | 88% | 86% (626/724) | 84% +2 | 85% +1 | 87% ±0 |
| Kind given at all | 100% | 100% (724/724) | 97% +3 | 100% ±0 | 100% ±0 |
| Changes that are changes | 48% | 50% (16/32) | 41% +9 | 36% +14 | 50% ±0 |
| Changes found | 59% | 70% (7/10) | 80% -10 | 60% +10 | 60% +10 |
| Amount | 75% | 72% (23/32) | 66% +6 | 54% +18 | 72% ±0 |
| Foods named, precision | 75% | 72% (403/560) | 79% -7 | 78% -6 | 76% -4 |
| Foods named, recall | 84% | 80% (361/454) | 70% +10 | 75% +4 | 77% +2 |
| Subject (place, city, none) | 92% | 91% (802/884) | 88% +3 | 85% +5 | 87% +3 |
| Claim on the right place | 94% | 88% (657/747) | 90% -2 | 92% -4 | 86% +2 |
| Places found | 89% | 84% (93/111) | 85% -1 | 86% -3 | 82% +2 |
| Places that are places | 92% | 88% (93/106) | 84% +4 | 90% -2 | 86% +2 |
| Match: brand (found places) | 93% | 90% (84/93) | 91% -1 | 91% ±0 | 96% -5 |
| Match: branch (right brand) | 95% | 99% (71/72) | 99% ±0 | 99% ±0 | 97% +1 |
| Match on the reference's places: brand | 93% | 93% (103/111) | 93% ±0 | 92% +1 | 93% ±0 |
| Match on the reference's places: branch | 96% | 96% (82/85) | 96% ±0 | 98% -1 | 98% -1 |
| Promotional flag | 77% | 79% (46/58) | 79% ±0 | 78% +2 | 78% +2 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 98% (381/389) | 99% (502/508) | 87% (380/439) | 94% (412/439) | — | — |
| hard | 93% (85/91) | 97% (111/115) | 76% (80/105) | 94% (99/105) | 100% (11/11) | 100% (11/11) |
| lang:de | 98% (353/359) | 99% (468/475) | 86% (343/400) | 92% (366/400) | — | — |
| lang:en | 97% (232/239) | 99% (297/300) | 88% (232/265) | 95% (253/265) | — | — |
| lang:other | 98% (308/313) | 97% (421/436) | 84% (298/354) | 91% (322/354) | — | — |
| lang:tr | 99% (66/67) | 99% (89/90) | 84% (70/83) | 93% (77/83) | — | — |
| length:long | 98% (289/294) | 96% (427/446) | 80% (280/348) | 89% (310/348) | — | — |
| length:medium | 98% (613/627) | 99% (786/792) | 87% (605/692) | 94% (648/692) | — | — |
| length:short | 100% (57/57) | 98% (62/63) | 94% (58/62) | 97% (60/62) | — | — |
| no-transcript | 90% (435/482) | 87% (560/647) | 78% (412/530) | 93% (494/530) | 95% (121/127) | 92% (111/121) |
| own | 91% (60/66) | 86% (87/101) | 79% (65/82) | 91% (75/82) | 100% (20/20) | 100% (20/20) |
| places:few | 89% (1322/1490) | 88% (1925/2176) | 76% (1258/1666) | 91% (1509/1666) | 88% (163/186) | 93% (151/163) |
| places:many | 77% (446/578) | 88% (635/720) | 77% (434/562) | 91% (509/562) | 87% (213/245) | 92% (197/213) |
| places:none | 100% (9/9) | 81% (13/16) | 73% (8/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 80% (857/1067) | 92% (1306/1424) | 73% (790/1076) | 88% (947/1076) | 80% (159/199) | 96% (152/159) |
| platform:google | 98% (959/978) | 98% (1275/1301) | 86% (943/1102) | 92% (1018/1102) | — | — |
| platform:instagram | 90% (294/325) | 88% (377/427) | 76% (272/357) | 92% (329/357) | 96% (68/71) | 90% (61/68) |
| platform:tiktok | 91% (626/685) | 84% (890/1061) | 79% (638/806) | 93% (752/806) | 93% (151/163) | 91% (137/151) |
| size:large | 82% (834/1016) | 89% (1279/1437) | 74% (780/1054) | 88% (924/1054) | 80% (152/191) | 94% (143/152) |
| size:medium | 87% (665/767) | 91% (913/998) | 76% (628/821) | 93% (767/821) | 94% (134/142) | 92% (123/134) |
| size:small | 95% (278/294) | 80% (381/477) | 80% (292/364) | 93% (337/364) | 92% (92/100) | 91% (84/92) |
| stars:1 | 98% (158/161) | 97% (219/226) | 87% (164/189) | 91% (172/189) | — | — |
| stars:2 | 98% (159/162) | 95% (218/230) | 85% (154/182) | 88% (161/182) | — | — |
| stars:3 | 99% (216/219) | 100% (277/278) | 81% (199/247) | 92% (227/247) | — | — |
| stars:4 | 99% (202/204) | 99% (269/271) | 87% (199/228) | 93% (211/228) | — | — |
| stars:5 | 97% (224/232) | 99% (292/296) | 89% (227/256) | 96% (247/256) | — | — |
| transcript | 92% (485/528) | 84% (707/841) | 79% (498/633) | 93% (587/633) | 92% (98/107) | 89% (87/98) |

## Misses

### parts.foods (726)

- `review-019a8099` the food is really delicious: [] ≠ [Essen]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-0541b749` the frites were too salty: [frites] ≠ [fries]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread, bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [fresh vegetables]
- `review-0541b749` the frites were too salty: [frites] ≠ [fries]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [fresh vegetables]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, potato]
- `review-08c67545` the food was tasty: [] ≠ [Essen]
- `review-08c67545` none of the starters or desserts appealed to the reviewer: [] ≠ [vor- und Nachspeisen]
- `review-08c67545` none of the starters or desserts appealed to the reviewer: [] ≠ [vor- und Nachspeisen]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salataları, marul, domates, soğan]
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: [] ≠ [dönercisi]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salataları, marul, domates, soğan]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ [冷, 热, 汤]
- `review-1016bd13` the restaurant said the cold dishes were already set out: [] ≠ [凉菜]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [凉菜, 啤酒]
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ [shredded potatoes]
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ [凉菜]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [drinks]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [热菜]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-13683c42` the price is similar to McDonald's: [] ≠ [McDonald's]
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: [hamburguesas] ≠ [hamburguesas, McDonald's]
- `review-13683c42` the patatas fritas are tastier than McDonald's: [patatas fritas] ≠ [patatas fritas, McDonald's]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-1798cc23` one of the three Bier bottles looked different: [Bier] ≠ [beer bottles]
- … 686 more in issues.jsonl

### parts.aspect (698)

- `review-019a8099` inside everything is great: vibe ≠ interior
- `review-02d1586d` everything was very good: none ≠ vibe
- `review-037bbe20` the venue is unique: vibe ≠ none
- `review-0541b749` the pain was crispy: cooking ≠ none
- `review-070860ca` received a refund: complaint_handling ≠ payment
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` the loud music fits the vibe they want to create: atmosphere ≠ vibe
- `review-08c67545` the food was tasty: taste ≠ none
- `review-08c67545` none of the starters or desserts appealed to the reviewer: menu_variety ≠ taste
- `review-08c67545` the elevator ride was expensive on top: extra_charges ≠ price
- `review-08c67545` it was nice: none ≠ vibe
- `review-0ac47c59` waited in line a little over an hour: queue ≠ wait
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ service
- `review-0ac47c59` sales slowed down as the line shortened: queue ≠ none
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ drink_quality
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ menu_variety
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ food
- `review-1016bd13` none of the tables had a bottle opener: service ≠ none
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: wait_for_food ≠ wait
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ speed_of_service
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: speed_of_service ≠ wait_for_food
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: service ≠ attentiveness
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: speed_of_service ≠ service
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-170f36a3` everything is awesome: none ≠ vibe
- `review-170f36a3` the atmosphere has vibes: atmosphere ≠ vibe
- `review-170f36a3` the food is high in calories: food ≠ none
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: food ≠ none
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ price
- `review-1798cc23` one of the three Bier bottles looked different: drink_quality ≠ none
- `review-1798cc23` no information was given about the Weinen: advice ≠ drink_selection
- `review-196641fc` guests take bags etc. themselves at pickup: takeaway_handling ≠ service
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ none
- `review-1eca7dfe` you can specify the spice level: seasoning ≠ food
- `review-257f4791` the service was attentive: attentiveness ≠ speed_of_service
- `review-2799bbfa` Burgermeister all over is amazing: none ≠ food
- `review-2799bbfa` ordered 2 extra fleisch pattys for a single hamburger, 3 in…: order_accuracy ≠ portion_size
- `review-2c7253a2` the burger joint was less amazing than expected: none ≠ taste
- … 658 more in issues.jsonl

### claims.extra (365)

- `review-0ac47c59` the long line was not because of döner preparation
- `review-1016bd13` the drink reservations were just for table decoration
- `review-1016bd13` the first bus had 40 people
- `review-1016bd13` the rest arrived later
- `review-1016bd13` the restaurant could prepare the hot dishes
- `review-1016bd13` each table was supposed to have 6 bottles of beer
- `review-1016bd13` the soup came quickly after the guests were seated
- `review-1016bd13` the cold dishes were already laid out
- `review-1016bd13` the hot dishes were served from 7:05 PM to 7:30 PM
- `review-1016bd13` the reviewer did not remember what the other cold dish was
- `review-1016bd13` the service was described as generous
- `review-1016bd13` they were not unwilling to order extra drinks
- `review-1016bd13` making it look so bad was unnecessary
- `review-196641fc` the male kebab expert was presumably Arab
- `review-356e149a` said he was not the delivery person
- `review-356e149a` leaned against the counter for a moment
- `review-356e149a` said he was Arab
- `review-35fe7952` the Turkish black tea is free
- `review-3f2a2713` the year is 2026
- `review-510fc086` living in Berlin has these advantages
- `review-510fc086` living in Berlin has these advantages
- `review-6752188e` the trip was to Berlin
- `review-6b917d41` had a burger
- `review-88fe4146` the server knew the reviewer and friend were about to sit down together
- `review-88fe4146` the reviewer refused the seating
- `review-faa8e03c` the chicken feathers were visible in the photo
- `post-01239695` the girl was impressive
- `post-019b903e` the post is not advertising
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` the author wishes a good, successful day
- `post-047130f4` the place serves pizza
- `post-047130f4` pizza is the main focus
- `post-047130f4` the place is in Friedrichshain
- `post-047130f4` the place is still serving Berlin
- `post-047130f4` the place was verified in August 2026
- `post-047130f4` the article first reviewed the place in 2016
- `post-047130f4` the original review is from 2016
- `post-047130f4` the place is open
- `post-047130f4` the place is on Frankfurter Allee 43
- … 325 more in issues.jsonl

### parts.kind (347)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02556664` go to the competition instead: verdict ≠ fact
- `review-07871fa7` all in all pretty okay: verdict ≠ fact
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ verdict
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: opinion ≠ fact
- `review-13f72d12` has had better kebsa elsewhere in Berlin: opinion ≠ verdict
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-1798cc23` the old listing including its reviews was simply continued: opinion ≠ change
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-1798cc23` no information was given about the Weinen: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-279b23c3` the food rated 12/10: opinion ≠ verdict
- `review-2c7253a2` the burger joint is a unique local Berlin experience: opinion ≠ verdict
- `review-35fe7952` the kebab shop is very popular: opinion ≠ verdict
- `review-3639cae4` ate at the other branch two years ago and the kebab there w…: opinion ≠ verdict
- `review-37daa9e9` had heard a lot of positive feedback about this place: fact ≠ verdict
- `review-382cd7e9` there is no longer access to the restroom: change ≠ opinion
- `review-382cd7e9` the restaurant chain already has plenty of money but still …: opinion ≠ fact
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: opinion ≠ verdict
- `review-480994b6` the music sometimes could not be heard properly: opinion ≠ fact
- `review-4cd140a3` once seated they got the menus and the food quickly: opinion ≠ fact
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-5d173a89` the döner is not worth €7.90: opinion ≠ fact
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` for Romans: the kebab is like any unpretentious kebab in Ro…: opinion ≠ fact
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà: verdict ≠ fact
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-75c84f72` the reviewers were there at 09.30: fact ≠ opinion
- `review-866767df` the meal was peaceful: opinion ≠ fact
- `review-88fe4146` the server let the customer queuing behind the reviewer pay…: opinion ≠ fact
- `review-90e99b19` the restaurant is fairly spacious: opinion ≠ fact
- `review-90e99b19` the atmosphere is ordinary: opinion ≠ fact
- `review-96daa0a9` the trip up the TV tower was an experience: opinion ≠ verdict
- `review-99fbc478` the staff did open gigantic umbrellas: opinion ≠ fact
- … 307 more in issues.jsonl

### claims.missed (319)

- `review-0217fd90` very delicious
- `review-070860ca` the reviewer is not happy
- `review-0ac47c59` found nothing to praise about the place
- `review-2b737ce5` before today the food was okay
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-382cd7e9` the message is that they don't care about people, only their money
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-7593dfff` the overall vibe won't appeal to everyone
- `review-80d9a747` loved the visit
- `review-937ea9e9` Sandos is simply outstanding
- `review-b31c1e48` great experience
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- `review-dd166b0d` overall a lovely café
- `review-feb41b4e` the reviewer has to agree with some of the criticism
- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-020c68fb` Markthalle Neun is open Monday to Saturday 9:00–20:00
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026
- `post-047130f4` Salami Social Club was founded by Jacob and Ben
- `post-047130f4` only a small handful of places in Berlin serve good pizza
- `post-047130f4` Salami Social Club serves its beers at the best price they can
- `post-0a8f804b` Going elsewhere instead of waiting for Cousins is foolish
- `post-0a8f804b` The author will take his own cousin to Cousins
- `post-0d1e7abc` in the courtyard you notice nothing of the bustling Hermannstrasse
- `post-11f0057b` Magma is hot, but in a cool way
- `post-11f0057b` Magma is open Wed+Thu 10–0, Fri+Sat 10–1, Sun 10–21
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-1c0d4023` Otto is recommended by 6 food editorial teams
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams
- … 279 more in issues.jsonl

### parts.sentiment (295)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02556664` go to the competition instead: negative ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-07871fa7` all in all pretty okay: positive ≠ neutral
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: negative ≠ mixed
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: negative ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: negative ≠ neutral
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: negative ≠ mixed
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-1798cc23` no information was given about the Weinen: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ mixed
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` stood at the counter for about five minutes without being g…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-382cd7e9` the restaurant chain already has plenty of money but still …: negative ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` doesn't know what people are raving about: negative ≠ positive
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ mixed
- `review-41d8256f` the Burger does not taste much better than at Burger King: negative ≠ mixed
- `review-480994b6` the music sometimes could not be heard properly: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` once seated they got the menus and the food quickly: positive ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-503d63e2` the other day there was no Acai: negative ≠ neutral
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-5582d6b8` the friend barely touched the table and the spoons fell: negative ≠ neutral
- `review-5582d6b8` sit inside: positive ≠ negative
- `review-5d173a89` the döner is not worth €7.90: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-6b4df664` the staff could be more attentive: negative ≠ mixed
- `review-703f425d` the burger has never arrived bad: positive ≠ negative
- … 255 more in issues.jsonl

### claims.subject (233)

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
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: city ≠ place
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: none ≠ place
- `post-047130f4` Nudja on pizza is absolutely delicious: none ≠ place
- `post-047130f4` salmon on pizza just doesn't work: none ≠ place
- `post-047130f4` tuna fish should not be eaten on pizza: none ≠ place
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ none
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant has colorful lights: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ place
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1ca1ffee` elsewhere a steak ordered medium comes through or bloody an…: none ≠ place
- `post-1ca1ffee` elsewhere a steak ordered medium comes through or bloody an…: none ≠ place
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-217c8e79` Is the Dong Xuan Center still worth it?: place ≠ city
- `post-217c8e79` Bún chả is the creator's absolute favourite food: none ≠ place
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-233389f4` they wanted to eat something authentic at the Indian restau…: none ≠ city
- `post-233389f4` the Indian restaurant in Mitte was empty when they came in: none ≠ city
- … 193 more in issues.jsonl

### claims.place (192)

- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
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
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufakt…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-2a8e9606` Otto is run by Zupke and Ursus: Otto ≠ Café Benjamine
- `post-2a8e9606` Pluto is run by Zupke and Ursus: Pluto ≠ Café Benjamine
- `post-2a8e9606` Trio is run by Zupke and Ursus: Trio ≠ Café Benjamine
- `post-2a8e9606` Otto is a restaurant people treat themselves to once a mont…: Otto ≠ Tulus Lotrek
- `post-2a8e9606` Trio is a restaurant people treat themselves to once a mont…: Trio ≠ Tulus Lotrek
- `post-2a8e9606` Ilona Scholl is the host at Tulus Lotrek: Tulus Lotrek ≠ Café Benjamine
- `post-2a8e9606` Ilona Scholl is the host at Tulus Lotrek: Tulus Lotrek ≠ Café im Haus am Waldsee
- `post-2a8e9606` the Starbucks branch is geared only to speed and cadence: Starbucks ≠ Café Bravo
- `post-2a8e9606` Mathias Brandweiner and Frederik Grieb run Hafenküche: Hafenküche ≠ Michelberger Hotel
- `post-2a8e9606` at the Café im Haus am Waldsee guests stay longer with the …: Café im Haus am Waldsee ≠ Café Benjamine
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-388b4383` the scharfen Zwiebeln and Pommes with Trüffelmayo go well w…: Cult Curry Mitte ≠ Curry Baude
- `post-388b4383` the scharfen Zwiebeln and Pommes with Trüffelmayo go well w…: Cult Curry Mitte ≠ Curry Baude
- `post-388b4383` the scharfen Zwiebeln and Pommes with Trüffelmayo go well w…: Cult Curry Mitte ≠ Curry Baude
- `post-388b4383` the Curry XL at Cult Curry Mitte, with three Currywürste, P…: Cult Curry Mitte ≠ Curry Baude
- `post-388b4383` Frank Spieß and his team serve Chili-Variationen that cause…: Curry & Chili ≠ Curry Baude
- `post-388b4383` Curry & Chili also has tasty options for self-confessed wim…: Curry & Chili ≠ Curry Baude
- `post-388b4383` whoever withstands all chili variations at Curry & Chili ca…: Curry & Chili ≠ Curry Baude
- … 152 more in issues.jsonl

### places.missed (55)

- `post-1e024518` Masalas
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
- `post-3a0ad71a` Coffee Circle
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
- `post-4a742b09` Village House
- `post-4c3e2a10` The Cell
- `post-51a97d36` GIG Gastro
- `post-56bff2cf` 8000 Vintages
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-5b5671fa` City Chicken
- `post-5f073ec2` Arirang
- `post-66f606db` Café Dufte
- `post-6b4377f6` Mraz & Sohn
- `post-6b4377f6` Nobelhart & Schmutzig
- `post-816a40e7` Kurmanche Restaurant
- … 15 more in issues.jsonl

### change.false (54)

- `review-1798cc23` the Google listing is no longer accurate
- `review-1798cc23` the old listing including the reviews was continued
- `review-4cd140a3` the service got worse as the evening went on
- `review-7593dfff` everything went faster once the older gentleman showed up
- `review-b8f6f582` the Agepan was still delicious
- `review-c5e1a090` the reviewer had fewer strawberries in the bowl
- `review-c5e1a090` the customer service was different
- `review-e39b92f3` dishes were described to be milder and less oily
- `review-f84d2292` place was more welcoming
- `review-fa5b28b1` the döner was very different
- `post-22c25ac1` the new owners opened the manufactory
- `post-2a8e9606` the relationship between the museum and the neighborhood has grown noticeably
- `post-31344bc5` vegan is no longer a niche topic but a basic requirement
- `post-33308126` the batter stays the same and only the fish changes
- `post-388b4383` Matthias now runs the family business
- `post-388b4383` the quality has stayed the same
- `post-388b4383` Konnopke’s Imbiß became cult after reunification
- `post-3a0ad71a` YOU is a new concept replacing Heritage at Hotel Luc
- `post-3a0ad71a` YOU replaced the previous Heritage
- `post-3e56e67d` everything is finished now
- `post-524765b0` the meze with seafood and vegetables change depending on the counter selection
- `post-57ab8313` the menu now includes birria
- `post-5f073ec2` Arirang was pretty delicious before
- `post-66f606db` the atmosphere is made cozier
- `post-6b4377f6` the weekly menu changes
- `post-6ddca88c` Pinci serves a few more dishes in the evening
- `post-73286ffe` it keeps familiar classics from Hotel Kreuzberghof and Restaurant Albatros
- `post-7516d1de` Bahadur is now Prince of Punjab
- `post-7516d1de` the décor lacks cliché golden elephants or kitsch peacock statues
- `post-78e0e15a` the döner was smaller sized
- `post-7e6e2acc` the dumplings in the bowl at Wen Cheng were not as good as back home
- `post-8e94e7ea` sharing was no longer an option
- `post-93526d04` the chocolate box was much more intense and very chocolaty
- `post-93526d04` they had eaten breakfast better before
- `post-93ac6d3b` the area around Savignyplatz is regaining its old appeal
- `post-a3178d9e` the visit changed their opinion of smashburgers for the better
- `post-a7757925` the vegan bánh mì tastes different from the chicken one
- `post-b5e879f0` the area has become more hype-driven
- `post-b5e879f0` the restaurant closed after 31 years
- `post-b5e879f0` a gradual change had already begun
- … 14 more in issues.jsonl

### parts.amount (39)

- `review-02556664` the reviewer did not get to eat: —  ≠ 30 minutes
- `review-02556664` the staff were just messing around with the queue: —  ≠ 30 minutes
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 6 money
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: —  ≠ 2 money
- `review-1798cc23` the service did not match the price: —  ≠ 20 money
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 8 minutes
- `review-5d173a89` only five people were ahead in line: —  ≠ 5 minutes
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-75c84f72` the reviewers were there at 09.30: —  ≠ 9.3 minutes
- `review-75c84f72` the market was deserted at 09.30: —  ≠ 9.3 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-c83e0a88` waited in line for 1.5 hours: 90 minutes ≠ 1.5 minutes
- `review-c83e0a88` didn't understand why we waited in such a long line: —  ≠ 90 minutes
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-2927e673` 5% discount on the first GetYourGuide app booking with code…: —  ≠ 5 money
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 5.5 minutes
- `post-421f8a5b` the sandos are available from tomorrow at 14:00 at Scharnwe…: —  ≠ 14 minutes
- `post-45841578` frozen yogurt at Drei starts from 6 euros: 6 money ≠ 9.9 money
- `post-45841578` the beef noodle soup is really good: —  ≠ 9.9 money
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 2 minutes
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-816a40e7` the restaurant opens at 13:00 on Friday: —  ≠ 13 minutes
- `post-935c2fd2` restaurant revenue in Germany fell by 4 percent according t…: —  ≠ 4 money
- `post-b5e879f0` Restaurant India is at Bergmannstraße 100: —  ≠ 31 money
- `post-b5e879f0` Restaurant India is a small, cosy restaurant: —  ≠ 31 money
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: 1 money ≠ —
- `post-c0a7fdc2` Pêle-Mêle has a brunch buffet on Sundays and public holidays: —  ≠ 18.5 money
- `post-cb785d0b` the place now has almost 60 seats: —  ≠ 60 money
- `post-cb785d0b` the renovation took 8 months: —  ≠ 8 minutes
- `post-cb785d0b` Sagos opened exactly 2 years ago: —  ≠ 2 money
- `post-cb785d0b` for the 3 euro Döner you can choose Hähnchen, Falafel or Ha…: 3 money ≠ —
- `post-cecea20e` the food event at Bikini Berlin ran for two days with 40+ p…: —  ≠ 2 minutes
- `post-db280ef6` 572Pasta serves homemade pasta: —  ≠ 10 money
- `post-e1c05dce` the Strawberry Matcha sando gets 10 out of 10: —  ≠ 10 money
- `post-e1c05dce` the cream brulee sando gets 8 out of 10: —  ≠ 8 money
- `post-fc96acff` the 2015 Vosne-Romanée from Domaine Confuron Cotétidot was …: —  ≠ 100 money

### places.extra (39)

- `post-0fa29641` Five Elephant
- `post-0fa29641` Voostore
- `post-0fa29641` Antonia Lingemann
- `post-0fa29641` König Galerie
- `post-0fa29641` Westberlin
- `post-0fa29641` Barra Val Berlin
- `post-0fa29641` Yummy Vintage Official
- `post-0fa29641` Ingwer
- `post-0fa29641` Annelies Berlin
- `post-0fa29641` Original Feelings Studio
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-1c25f2d1` Wochenmarkt Karl-August-Platz seit 1894
- `post-483d6cc6` Love at first bite
- `post-48e30fa6` Kaufland Oranienburg
- `post-4a742b09` RiskyLounge
- `post-4c3e2a10` Haftschaden
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-7516d1de` Prince of Punjab
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Otto and Trio
- `post-8901fb9b` Mister Scott from Bonanza Coffee
- `post-8901fb9b` Boy
- `post-9f93c25b` Main
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-aa137bfa` Beef Grill Club
- `post-ad6a11c0` Korean place
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt gegenüber des ehemaligen Restaurants
- `post-b8d2bcf3` KW Institute for Contemporary Art
- `post-d1ab7367` Natural Selection
- `post-e2a421e9` Lindner
- `post-fc96acff` The Mandala Hotel
- `post-fe3794c9` SpreeWiesn

### match_isolated.brand (31)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (llm)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-cb785d0b` Sagos: none ≠ Samos (llm)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### match.brand (28)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (llm)
- `post-3a0ad71a` Le Faubourg: Le Faubourg ≠ none (other_city)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Amo Café: none ≠ ama Café (llm)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### change.missed (16)

- `review-2b737ce5` before today the food was okay
- `review-382cd7e9` there is no longer access to the restroom
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-7516d1de` Bahadur now operates as Prince of Punjab at the same address
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
- `post-cb785d0b` the renovation is finished, celebrated with the 1-cent promotion
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` much has changed at Sagos's prep kitchen

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

### match.branch (12)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Café, Breakfast Brunch
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ Mani in Pasta - Markthalle
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-b2993d78` Mani in Pasta: Mani in Pasta - Markthalle ≠ brand only
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only
