# Ingestion eval: mini-v6

2026-11-01 22:19 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output) · 3 sources dropped by the agents (scored as nothing read)
Tokens: 1,708,839
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (367); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (86)

## Reviews

| Metric | mini-v6 | stored | one-v1 | mini-v6b | mini-v5 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% (930/978) | 93% +2 | 98% -3 | 97% -1 | — |
| Claims that are real (of produced) | 99% (1225/1238) | 99% ±0 | 98% +1 | 98% +1 | — |
| Sentiment | 92% (985/1069) | 88% +5 | 92% ±0 | 93% ±0 | — |
| Aspect, exact | 84% (902/1069) | 71% +14 | 86% -1 | 79% +6 | — |
| Aspect, right root | 90% (964/1069) | 81% +9 | 92% -2 | 84% +6 | — |
| Kind | 95% (1014/1069) | 67% +28 | 94% ±0 | 95% ±0 | — |
| Kind given at all | 100% (1069/1069) | 4% +96 | 100% ±0 | 98% +2 | — |
| Changes that are changes | 63% (15/24) | 56% +6 | 58% +4 | 75% -12 | — |
| Changes found | 81% (13/16) | 80% +1 | 75% +6 | 81% ±0 | — |
| Amount | 64% (29/45) | 41% +23 | 67% -2 | 65% -1 | — |
| Foods named, precision | 81% (334/413) | 32% +48 | 75% +6 | 78% +3 | — |
| Foods named, recall | 79% (306/386) | 23% +56 | 86% -7 | 78% +2 | — |

## Posts and articles

| Metric | mini-v6 | stored | one-v1 | mini-v6b | mini-v5 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 83% (1729/2077) | 56% +28 | 86% -2 | 87% -3 | 83% ±0 |
| Claims that are real (of produced) | 88% (2374/2711) | 95% -7 | 88% -1 | 90% -3 | 87% +1 |
| Sentiment | 89% (1947/2195) | 86% +3 | 91% -2 | 87% +2 | 88% +1 |
| Aspect, exact | 76% (1667/2195) | 63% +13 | 76% ±0 | 69% +7 | 72% +4 |
| Aspect, right root | 87% (1899/2195) | 78% +9 | 86% +1 | 79% +7 | 81% +6 |
| Kind | 87% (1919/2195) | 47% +41 | 87% ±0 | 83% +5 | 83% +4 |
| Kind given at all | 99% (2195/2211) | 4% +95 | 100% -1 | 98% +1 | 99% ±0 |
| Changes that are changes | 44% (35/80) | 46% -3 | 49% -5 | 40% +4 | 47% -3 |
| Changes found | 56% (18/32) | 38% +19 | 63% -6 | 59% -3 | 59% -3 |
| Amount | 62% (61/99) | 46% +15 | 74% -13 | 63% -1 | 54% +7 |
| Foods named, precision | 78% (1117/1423) | 46% +32 | 74% +4 | 77% +1 | 77% +1 |
| Foods named, recall | 77% (1066/1381) | 39% +38 | 82% -5 | 73% +4 | 78% -1 |
| Subject (place, city, none) | 87% (2256/2591) | 85% +2 | 91% -4 | 87% ±0 | 87% ±0 |
| Claim on the right place | 89% (1908/2140) | 85% +5 | 92% -3 | 89% ±0 | 89% ±0 |
| Places found | 91% (394/433) | 73% +18 | 87% +4 | 90% +1 | 88% +3 |
| Places that are places | 89% (394/441) | 85% +4 | 91% -1 | 89% +1 | 89% +1 |
| Match: brand (found places) | 92% (363/394) | 92% ±0 | 93% ±0 | 93% -1 | 93% -1 |
| Match: branch (right brand) | 95% (294/308) | 97% -2 | 96% -1 | 95% ±0 | 95% ±0 |
| Match on the reference's places: brand | 92% (399/433) | — | 93% -1 | 92% ±0 | 94% -1 |
| Match on the reference's places: branch | 96% (325/338) | — | 96% ±0 | 96% ±0 | 97% -1 |
| Promotional flag | 77% (153/199) | 82% -5 | 78% -1 | 80% -3 | 78% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | mini-v6 (train) | mini-v6 (test) | one-v1 (test) | mini-v6b (test) | mini-v5 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% | 95% (282/298) | 98% -3 | 95% -1 | — |
| Claims that are real (of produced) | 99% | 100% (348/349) | 99% ±0 | 99% ±0 | — |
| Sentiment | 92% | 91% (298/326) | 91% +1 | 94% -2 | — |
| Aspect, exact | 84% | 85% (276/326) | 87% -2 | 77% +8 | — |
| Aspect, right root | 90% | 91% (298/326) | 91% ±0 | 83% +9 | — |
| Kind | 95% | 95% (309/326) | 95% ±0 | 98% -3 | — |
| Kind given at all | 100% | 100% (326/326) | 100% ±0 | 95% +5 | — |
| Changes that are changes | 68% | 40% (2/5) | 40% ±0 | 67% -27 | — |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | — |
| Amount | 59% | 72% (13/18) | 72% ±0 | 81% -9 | — |
| Foods named, precision | 79% | 84% (110/131) | 76% +8 | 78% +6 | — |
| Foods named, recall | 77% | 84% (106/126) | 83% +2 | 65% +19 | — |

### Posts and articles

| Metric | mini-v6 (train) | mini-v6 (test) | one-v1 (test) | mini-v6b (test) | mini-v5 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 82% | 86% (523/606) | 91% -4 | 89% -2 | 86% +1 |
| Claims that are real (of produced) | 87% | 89% (740/836) | 91% -3 | 92% -3 | 86% +3 |
| Sentiment | 88% | 89% (607/680) | 91% -1 | 88% +1 | 90% -1 |
| Aspect, exact | 77% | 74% (505/680) | 75% -1 | 69% +5 | 67% +7 |
| Aspect, right root | 88% | 83% (567/680) | 85% -1 | 78% +5 | 76% +8 |
| Kind | 88% | 87% (592/680) | 86% +1 | 84% +3 | 87% ±0 |
| Kind given at all | 99% | 100% (680/680) | 100% ±0 | 97% +3 | 100% ±0 |
| Changes that are changes | 38% | 54% (15/28) | 50% +4 | 41% +12 | 50% +4 |
| Changes found | 50% | 70% (7/10) | 70% ±0 | 80% -10 | 60% +10 |
| Amount | 59% | 67% (24/36) | 72% -5 | 66% +1 | 72% -5 |
| Foods named, precision | 78% | 80% (360/448) | 72% +8 | 79% +1 | 76% +4 |
| Foods named, recall | 76% | 79% (339/430) | 80% -1 | 70% +9 | 77% +2 |
| Subject (place, city, none) | 88% | 86% (690/803) | 91% -5 | 88% -2 | 87% -1 |
| Claim on the right place | 88% | 91% (601/657) | 88% +4 | 90% +1 | 86% +5 |
| Places found | 93% | 86% (96/111) | 84% +3 | 85% +2 | 82% +5 |
| Places that are places | 89% | 90% (96/107) | 88% +2 | 84% +6 | 86% +4 |
| Match: brand (found places) | 93% | 91% (87/96) | 90% ±0 | 91% -1 | 96% -5 |
| Match: branch (right brand) | 95% | 99% (70/71) | 99% ±0 | 99% ±0 | 97% +1 |
| Match on the reference's places: brand | 92% | 92% (102/111) | 93% -1 | 93% -1 | 93% -1 |
| Match on the reference's places: branch | 96% | 98% (82/84) | 96% +1 | 96% +1 | 98% ±0 |
| Promotional flag | 77% | 78% (45/58) | 79% -2 | 79% -2 | 78% ±0 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 93% (363/389) | 99% (458/462) | 86% (357/416) | 94% (392/416) | — | — |
| hard | 93% (85/91) | 95% (108/114) | 80% (82/102) | 91% (93/102) | 100% (11/11) | 100% (11/11) |
| lang:de | 95% (341/359) | 98% (438/447) | 87% (336/386) | 92% (354/386) | — | — |
| lang:en | 93% (223/239) | 100% (284/285) | 86% (222/257) | 95% (243/257) | — | — |
| lang:other | 96% (301/313) | 100% (414/416) | 81% (278/344) | 91% (313/344) | — | — |
| lang:tr | 97% (65/67) | 99% (89/90) | 80% (66/82) | 91% (75/82) | — | — |
| length:long | 97% (285/294) | 98% (421/428) | 81% (277/343) | 89% (306/343) | — | — |
| length:medium | 94% (591/627) | 99% (745/751) | 85% (568/667) | 93% (622/667) | — | — |
| length:short | 95% (54/57) | 100% (59/59) | 97% (57/59) | 97% (57/59) | — | — |
| no-transcript | 89% (429/482) | 89% (572/644) | 81% (432/534) | 92% (490/534) | 97% (123/127) | 93% (114/123) |
| own | 89% (59/66) | 88% (96/109) | 87% (68/78) | 91% (71/78) | 100% (20/20) | 100% (20/20) |
| places:few | 85% (1265/1490) | 88% (1798/2037) | 75% (1208/1611) | 90% (1442/1611) | 91% (170/186) | 92% (157/170) |
| places:many | 79% (455/578) | 86% (564/659) | 79% (452/573) | 86% (495/573) | 91% (222/245) | 92% (204/222) |
| places:none | 100% (9/9) | 80% (12/15) | 64% (7/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 79% (840/1067) | 88% (1190/1349) | 72% (780/1081) | 86% (927/1081) | 85% (169/199) | 95% (161/169) |
| platform:google | 95% (930/978) | 99% (1225/1238) | 84% (902/1069) | 92% (985/1069) | — | — |
| platform:instagram | 90% (293/325) | 91% (388/425) | 81% (294/364) | 92% (336/364) | 96% (68/71) | 91% (62/68) |
| platform:tiktok | 87% (596/685) | 85% (796/937) | 79% (593/750) | 91% (684/750) | 96% (157/163) | 89% (140/157) |
| size:large | 79% (805/1016) | 87% (1110/1271) | 73% (752/1024) | 86% (884/1024) | 85% (162/191) | 93% (150/162) |
| size:medium | 85% (649/767) | 90% (864/958) | 77% (620/806) | 90% (729/806) | 96% (136/142) | 92% (125/136) |
| size:small | 94% (275/294) | 83% (400/482) | 81% (295/365) | 92% (334/365) | 96% (96/100) | 92% (88/96) |
| stars:1 | 99% (159/161) | 97% (217/224) | 82% (156/191) | 93% (177/191) | — | — |
| stars:2 | 93% (150/162) | 100% (208/208) | 86% (144/168) | 88% (148/168) | — | — |
| stars:3 | 97% (212/219) | 100% (274/274) | 79% (194/245) | 89% (219/245) | — | — |
| stars:4 | 94% (191/204) | 99% (254/256) | 89% (193/216) | 94% (204/216) | — | — |
| stars:5 | 94% (218/232) | 99% (272/276) | 86% (215/249) | 95% (237/249) | — | — |
| transcript | 87% (460/528) | 85% (612/718) | 78% (455/580) | 91% (530/580) | 95% (102/107) | 86% (88/102) |

## Misses

### parts.aspect (695)

- `review-02d1586d` everything was very good: none ≠ atmosphere
- `review-02d1586d` they thank the waiter as well: service ≠ none
- `review-037bbe20` the venue is unique: vibe ≠ none
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ order_accuracy
- `review-0ac47c59` the chicken meat was in the döner: ingredient_quality ≠ menu_variety
- `review-0ac47c59` sales slowed down as the line shortened: queue ≠ price_level
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ menu_variety
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ availability
- `review-1016bd13` planned to order more drinks on site as needed: none ≠ drink_selection
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: none ≠ wait
- `review-1016bd13` the restaurant said the cold dishes were already set out: none ≠ availability
- `review-1016bd13` reserved 15 tables in total: none ≠ wait_for_table
- `review-1016bd13` none of the tables had a bottle opener: service ≠ amenities
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ service
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ service
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: speed_of_service ≠ wait_for_food
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: speed_of_service ≠ wait_for_food
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-170f36a3` everything is awesome: none ≠ taste
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ none
- `review-1798cc23` dishes cost around 20 € each: price_level ≠ price
- `review-196641fc` ordering was with a friendly lady: friendliness ≠ service
- `review-196641fc` the male kebab experts at pickup are consistently arrogant,…: friendliness ≠ advice
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ none
- `review-1eca7dfe` you can specify the spice level: seasoning ≠ none
- `review-257f4791` we were a table of five French people: none ≠ crowding
- `review-257f4791` there were live musicians: atmosphere ≠ noise
- `review-2799bbfa` ordered 2 extra fleisch pattys for a single hamburger, 3 in…: order_accuracy ≠ portion_size
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- `review-279b23c3` Justin is the most important and gets a 13/10: service ≠ none
- `review-2d6d3829` the meat options are really excellent: taste ≠ ingredient_quality
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: taste ≠ menu_variety
- `review-356e149a` we usually love eating here: none ≠ food
- `review-356e149a` we have always been satisfied until now: none ≠ food
- `review-356e149a` won't spend another cent at this place as long as this empl…: service ≠ value_for_money
- `review-356e149a` the first thing the employee said was asking if I was the d…: friendliness ≠ none
- `review-356e149a` the employee made me wait several more minutes before takin…: attentiveness ≠ wait
- … 655 more in issues.jsonl

### parts.foods (644)

- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ []
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-037bbe20` the beer is a strong point: [birra] ≠ [beer]
- `review-037bbe20` the beer is a strong point: [birra] ≠ [beer]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` the music was very loud: [] ≠ [music]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, döner]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [tavuk eti]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salataları, marul, domates, soğan]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salataları, marul, domates, soğan]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` the restaurant said the cold dishes were already set out: [] ≠ [凉菜]
- `review-1016bd13` none of the tables had a bottle opener: [] ≠ [开瓶器]
- `review-1016bd13` the restaurant said the cold dishes were already set out: [] ≠ [凉菜]
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: [] ≠ [汤]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [凉菜, 啤酒]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [热菜]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-1104925b` the food is so, so delicious: [] ≠ [kebab]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-13683c42` the price is similar to McDonald's: [] ≠ [burgers]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi, halloumi]
- `review-1798cc23` Bier was only available by the bottle: [Bier] ≠ [beer]
- `review-1798cc23` one of the three Bier bottles looked different: [Bier] ≠ [bottles]
- `review-1798cc23` no information was given about the Weinen: [Weinen] ≠ [wines]
- `review-1798cc23` Bier was only available by the bottle: [Bier] ≠ [beer]
- `review-1798cc23` one of the three Bier bottles looked different: [Bier] ≠ [bottles]
- `review-1798cc23` no information was given about the Weinen: [Weinen] ≠ [wines]
- `review-196641fc` the male kebab experts at pickup are consistently arrogant,…: [] ≠ [kebab]
- `review-2b737ce5` before today the food was okay: [] ≠ [beef noodle soup]
- `review-2b737ce5` the price was affordable: [] ≠ [beef noodle soup]
- `review-2d6d3829` the meat options are really excellent: [carne] ≠ []
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: [sostituto della carne, falafel, formaggio] ≠ [falafel, formaggio]
- `review-3486a0a9` the veggie patty replacement is excellent: [veggie patty] ≠ []
- … 604 more in issues.jsonl

### claims.missed (396)

- `review-0217fd90` very delicious
- `review-02556664` go to the competition instead
- `review-070860ca` the reviewer is not happy
- `review-070860ca` ordered on a Sunday night for delivery through Wolt
- `review-070860ca` received the wrong order
- `review-070860ca` a very unhelpful and very angry man hung up on the reviewer
- `review-070860ca` received a refund
- `review-070860ca` the correct order arrived 2 hours late
- `review-070860ca` the food was mid, nothing to write home about
- `review-070860ca` not worth the hassle
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue
- `review-196641fc` visited on a late Saturday midday
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-37daa9e9` the food has the perfect level of spice
- `review-3e075e7e` doesn't know what people are raving about
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-5cd39af6` recommends the place to everyone
- `review-5d173a89` the döner is not worth €7.90
- `review-6752188e` the reviewer rates the market 10000/10
- `review-693fb047` the food was nothing special
- `review-693fb047` expected the best kebab but the kebab was only edible
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7a1ba6d7` the reviewer recommends the place
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
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- … 356 more in issues.jsonl

### claims.extra (350)

- `review-0ac47c59` the long line was because of the döner being prepared
- `review-356e149a` said no
- `review-356e149a` asked where he came from
- `review-356e149a` said he was Arab
- `review-356e149a` asked why
- `review-35fe7952` the Turkish black tea was free
- `review-510fc086` living in Berlin has advantages
- `review-510fc086` living in Berlin has advantages
- `review-55fd7176` ordered Menü 3
- `review-6752188e` the food market was so good
- `review-88fe4146` the reviewer and friend were about to sit down together
- `review-96daa0a9` the young man had a beautiful beard
- `review-faa8e03c` the chicken feathers were visible in the photo
- `post-01239695` the creator says the girl who flirted with Junhee ate
- `post-047130f4` the place was reviewed in 2016
- `post-047130f4` the original review is preserved as a record of the visit
- `post-047130f4` the place is open
- `post-0a8f804b` the shop was still closed during setup
- `post-0a8f804b` each flavor is a tribute to the people they love and their communities
- `post-0a8f804b` skepticism from grumblers and purists gives way to joy
- `post-0a8f804b` seeing grumblers smile makes Marieke feel better about the world
- `post-0fa29641` this is a Berlin guide for Kreuzberg
- `post-0fa29641` the tagged spots are saved for later
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-11f0057b` it is perfect for date nights
- `post-11f0057b` the venue serves house wine
- `post-11f0057b` the venue is associated with Berghain
- `post-14d4fc29` the post is about Berlin
- `post-14d4fc29` the post mentions slow food
- `post-14d4fc29` the author feels hometown love and wanderlust
- `post-165a9370` the restaurant is an Indian restaurant
- `post-1a2cebf2` the post is about celebrating Diwali in Berlin
- `post-1c0d4023` Nobelhart & Schmutzig is in Kreuzberg
- `post-1c0d4023` Nobelhart & Schmutzig serves German food
- `post-1c0d4023` Rutz Restaurant is in Mitte
- `post-1c0d4023` Rutz Restaurant is a bar
- `post-1c0d4023` Tulus Lotrek is in Kreuzberg
- `post-1c0d4023` Coda is in Neukoelln
- `post-1c0d4023` Coda is a bar
- … 310 more in issues.jsonl

### claims.subject (335)

- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` only a small handful of places in Berlin serve good pizza: city ≠ place
- `post-047130f4` the craft beer scene is one of the most exciting things in …: city ≠ place
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: city ≠ place
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: place ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0d1e7abc` in the courtyard you notice nothing of the bustling Hermann…: place ≠ city
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-0fa29641` the author genuinely loves and keeps coming back to these s…: city ≠ none
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ none
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are washed-processed: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: none ≠ place
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: none ≠ place
- `post-1c78d4ed` The El Líbano espresso is Arabica: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are washed-processed: none ≠ place
- `post-1c78d4ed` the roast is Espresso: none ≠ place
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1d0aeaca` Miriam says the proper Berlin flavor is anything with beer: place ≠ city
- … 295 more in issues.jsonl

### parts.sentiment (332)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-07871fa7` all in all pretty okay: positive ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: negative ≠ positive
- `review-13683c42` the hamburguesas are not as industrial as McDonald's: positive ≠ mixed
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ positive
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-21de844d` waited over half an hour before being served: negative ≠ neutral
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-27722511` there are better kebabs in Berlin: negative ≠ positive
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ neutral
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: positive ≠ neutral
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: negative ≠ neutral
- `review-356e149a` the employee said she had never seen anyone lean like that: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` the kebab had loads of lemon: negative ≠ neutral
- `review-3bab8289` the place is huge: neutral ≠ positive
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ neutral
- `review-41d8256f` the Pommes were sort of okay: mixed ≠ neutral
- `review-436b38b2` staff were on the phone constantly during the visit: negative ≠ neutral
- `review-4a46a87d` it has become a fast-food restaurant: negative ≠ neutral
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-52ef0f64` the Vöner Döner was nothing outstanding: mixed ≠ neutral
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: negative ≠ neutral
- `review-5582d6b8` sit inside: positive ≠ neutral
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: negative ≠ mixed
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-693fb047` the Kebab was so-so: negative ≠ neutral
- `review-6b917d41` the burger was amazing: positive ≠ neutral
- … 292 more in issues.jsonl

### parts.kind (331)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-08c67545` the reviewer would not do it again for the price: verdict ≠ opinion
- `review-0ac47c59` sales slowed down as the line shortened: fact ≠ change
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-21de844d` waited over half an hour before being served: opinion ≠ fact
- `review-279b23c3` the best Döner in Berlin: verdict ≠ opinion
- `review-3486a0a9` Bun Society has become a new local favourite: verdict ≠ change
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: opinion ≠ fact
- `review-3639cae4` the kebab had loads of lemon: opinion ≠ fact
- `review-37016d87` went for dinner at the end of a 25th wedding anniversary tr…: fact ≠ event
- `review-3f2a2713` the venue should offer a vegan burger already: opinion ≠ new_item
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-4cd140a3` they had hoped for a nice date and a pleasant evening: opinion ≠ verdict
- `review-4cd140a3` it got fuller and therefore louder: opinion ≠ change
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: opinion ≠ fact
- `review-5582d6b8` sit inside: opinion ≠ fact
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6217ec70` would definitely get the kebab again if passing by and the …: verdict ≠ opinion
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-6b917d41` the burger was amazing: opinion ≠ fact
- `review-70467fba` the kebab was not worth waiting forever for: opinion ≠ verdict
- `review-70467fba` the slow staff made the whole experience even longer: opinion ≠ change
- `review-71868223` walked a very long way and were very hungry: fact ≠ opinion
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` first-time kebap eaters can find a much better kebap elsewh…: verdict ≠ opinion
- `review-7483275e` experienced kebap eaters can also find a better kebap elsew…: verdict ≠ opinion
- `review-7483275e` for Romans: the kebab is like any unpretentious kebab in Ro…: opinion ≠ fact
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà: verdict ≠ fact
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-7f3142f7` the venue needs to update its website: opinion ≠ fact
- `review-8c6d84ed` Burgermeister Konstanzer is the worst shop: verdict ≠ opinion
- `review-90e99b19` the place is not worth more than 15 minutes of travel: verdict ≠ opinion
- `review-937ea9e9` Sandos is definitely one of the best dessert shops ever: verdict ≠ opinion
- `review-937ea9e9` a clear 5 out of 5 stars, would give more if possible: verdict ≠ fact
- `review-97751870` the Fries and Sauce were completely forgotten from the order: opinion ≠ change
- … 291 more in issues.jsonl

### claims.place (232)

- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: Magma ≠ Fuerst Wiacek
- `post-11f0057b` Magma is partly responsible for the street's legendary summ…: Magma ≠ Bistro Spumante
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: Nobelhart & Schmutzig ≠ Cookies Cream
- `post-1c0d4023` Nobelhart & Schmutzig has a Google rating of 4.4 stars: Nobelhart & Schmutzig ≠ Cookies Cream
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: Rutz Restaurant ≠ Cookies Cream
- `post-1c0d4023` Rutz Restaurant has a Google rating of 4.6 stars: Rutz Restaurant ≠ Cookies Cream
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: Tulus Lotrek ≠ Cookies Cream
- `post-1c0d4023` Tulus Lotrek has a Google rating of 4.8 stars: Tulus Lotrek ≠ Cookies Cream
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: Coda ≠ Cookies Cream
- `post-1c0d4023` Coda has a Google rating of 4.7 stars: Coda ≠ Cookies Cream
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: Hallmann & Klee ≠ Cookies Cream
- `post-1c0d4023` Hallmann & Klee has a Google rating of 4.6 stars: Hallmann & Klee ≠ Cookies Cream
- `post-1c0d4023` Otto is recommended by 6 food editorial teams: Otto ≠ Cookies Cream
- `post-1c0d4023` Otto has a Google rating of 4.6 stars: Otto ≠ Cookies Cream
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams: Restaurant Tim Raue ≠ Cookies Cream
- `post-1c0d4023` Restaurant Tim Raue has a Google rating of 4.6 stars: Restaurant Tim Raue ≠ Cookies Cream
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams: Funky Fisch ≠ Cookies Cream
- `post-1c0d4023` Funky Fisch has a Google rating of 4.5 stars: Funky Fisch ≠ Cookies Cream
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams: Horváth ≠ Cookies Cream
- `post-1c0d4023` Horváth has a Google rating of 4.5 stars: Horváth ≠ Cookies Cream
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams: Bandol sur mer ≠ Cookies Cream
- `post-1c0d4023` Bandol sur mer has a Google rating of 4.9 stars: Bandol sur mer ≠ Cookies Cream
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams: FACIL ≠ Cookies Cream
- `post-1c0d4023` FACIL has a Google rating of 4.8 stars: FACIL ≠ Cookies Cream
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams: Loumi ≠ Cookies Cream
- `post-1c0d4023` Loumi has a Google rating of 4.8 stars: Loumi ≠ Cookies Cream
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams: Matthias ≠ Cookies Cream
- `post-1c0d4023` Matthias has a Google rating of 4.8 stars: Matthias ≠ Cookies Cream
- `post-1c0d4023` Mastan is recommended by 5 food editorial teams: Mastan ≠ Cookies Cream
- `post-1c0d4023` Mastan has a Google rating of 4.7 stars: Mastan ≠ Cookies Cream
- `post-1c0d4023` Barra is recommended by 5 food editorial teams: Barra ≠ Cookies Cream
- `post-1c0d4023` Barra has a Google rating of 4.5 stars: Barra ≠ Cookies Cream
- `post-1c0d4023` Sathutu is recommended by 5 food editorial teams: Sathutu ≠ Cookies Cream
- `post-1c0d4023` Sathutu has a Google rating of 4.5 stars: Sathutu ≠ Cookies Cream
- `post-1c0d4023` Stoke is recommended by 5 food editorial teams: Stoke ≠ Cookies Cream
- `post-1c0d4023` Stoke has a Google rating of 4.5 stars: Stoke ≠ Cookies Cream
- `post-1c0d4023` Gazzo Pizza is recommended by 5 food editorial teams: Gazzo Pizza ≠ Cookies Cream
- `post-1c0d4023` Gazzo Pizza has a Google rating of 4.4 stars: Gazzo Pizza ≠ Cookies Cream
- `post-1c0d4023` Michelberger Restaurant is recommended by 5 food editorial …: Michelberger Restaurant ≠ Cookies Cream
- … 192 more in issues.jsonl

### parts.amount (54)

- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-2799bbfa` ordered 2 extra fleisch pattys for a single hamburger, 3 in…: —  ≠ 2 money
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 8 minutes
- `review-36f2fac8` you wait 1.5 hours in the queue for your food: 90 minutes ≠ 1.5 minutes
- `review-6217ec70` would definitely get the kebab again if passing by and the …: —  ≠ 60 minutes
- `review-7483275e` started queuing at 20:10: —  ≠ 20.1 minutes
- `review-75c84f72` the reviewers were there at 09.30: —  ≠ 9.3 minutes
- `review-75c84f72` the reviewers are used to marketplaces opening at 07.00 at …: —  ≠ 7 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-937ea9e9` a clear 5 out of 5 stars, would give more if possible: —  ≠ 5 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: —  ≠ 3 money
- `post-0d1e7abc` Isla has existed for 10 years: —  ≠ 10 minutes
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-24601e6d` the €48 ticket includes three drinks: —  ≠ 3 minutes
- `post-24601e6d` you get a cocktail and two drinks in the ice bar: —  ≠ 3 minutes
- `post-33308126` Rogacki is trying out Seelachs for 1 week: —  ≠ 1 minutes
- `post-388b4383` the family business Schmidt's Imbiss has stood for the best…: —  ≠ 50 minutes
- `post-45841578` the four spots are must-tries for eating cheap and tasty in…: 10 money ≠ —
- `post-45841578` frozen yogurt at Drei starts from 6 euros: 6 money ≠ 9.9 money
- `post-45dafb41` the pizza with Burrata, Mortadella, roasted pine nuts and l…: 17 money ≠ —
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ 12 money
- `post-57ab8313` The Tacos de Birria are juicy, with fresh ingredients, sauc…: —  ≠ 11 money
- `post-57ab8313` The Gringa de Birria is the authors' favourite: —  ≠ 12.9 money
- `post-57ab8313` El Maestro de la Birria and the team put great effort into …: —  ≠ 11.5 money
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: —  ≠ 11.5 money
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-7516d1de` they ordered two more Kingfisher beers: —  ≠ 2 money
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 2 minutes
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-875be07a` food at the Street Food Market at Markthalle Neun costs 5–1…: 12 money ≠ 5 money
- `post-93ac6d3b` 100 GRAMM Lounge scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Beavis Bar also scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Augusta am Savignyplatz has 4.9 stars: —  ≠ 4.9 money
- … 14 more in issues.jsonl

### change.false (54)

- `review-0ac47c59` sales slowed down as the line shortened
- `review-3486a0a9` Bun Society has become a new local favourite
- `review-4cd140a3` service got worse over the evening
- `review-4cd140a3` it got more crowded
- `review-4cd140a3` it got louder
- `review-70467fba` the whole experience was even longer
- `review-7593dfff` once he appeared everything went faster
- `review-97751870` the fries and sauce were forgotten
- `review-c5e1a090` I had fewer strawberries, exactly two
- `post-0a8f804b` Cousins was opened to celebrate the diversity of their friends
- `post-1d0aeaca` its flavours may differ from those in the original review
- `post-2a8e9606` the relationship between the museum and the neighborhood has noticeably grown
- `post-31344bc5` Berlin's gastro scene is reinventing itself
- `post-33308126` the batter stays the same and only the fish changes
- `post-3a0ad71a` YOU replaces Heritage
- `post-3a0ad71a` the summer is over only when no more ice cream is produced there
- `post-45dafb41` Monti has recently opened
- `post-483d6cc6` they just opened a second location in Mitte
- `post-4f942afd` the author is coming around to the idea of hummus
- `post-524765b0` the glass later turned into a whole bottle
- `post-6b4377f6` the restaurant returns to regional ingredients and handcrafted cooking
- `post-6b4377f6` the menu changes weekly
- `post-6b4377f6` the menu changes weekly
- `post-7516d1de` Bahadur is now Prince of Punjab
- `post-7516d1de` Bahadur was renamed
- `post-7516d1de` Bahadur did not have cliché golden elephants or kitsch peacock statues
- `post-7516d1de` Bahadur had slight Indian touches and memories from home
- `post-75c11d7c` during the day the focus shifts to Bara Chirashi
- `post-812c90d9` the seafood version costs 3€ more
- `post-816a40e7` the venue is a new opening
- `post-8901fb9b` Boy has a modern approach
- `post-8c6bd842` they forgot the salad
- `post-8e94e7ea` sharing is no longer an option
- `post-909ca5ee` the menu changes seasonally
- `post-909ca5ee` the cavatelli are currently served as Pasta alla Norma
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-aa137bfa` the Main is meant to function more as the brand's flagship
- `post-b5e879f0` the table by the window with the candle is no longer occupied
- `post-c0a7fdc2` the venue changed management
- `post-c0a7fdc2` a water leak delayed the reopening until January
- … 14 more in issues.jsonl

### places.extra (47)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-0fa29641` Five Elephant
- `post-0fa29641` voostore
- `post-0fa29641` Antonia Lingemann
- `post-0fa29641` König Galerie
- `post-0fa29641` Westberlin
- `post-0fa29641` Barrava Berlin
- `post-0fa29641` Yummy Vintage
- `post-0fa29641` Ingwer
- `post-0fa29641` Annelies Berlin
- `post-0fa29641` Original Feelings Studio
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c78d4ed` Col-Spirit
- `post-217c8e79` El Kampinski
- `post-233389f4` an Indian restaurant
- `post-483d6cc6` Love at First Bite Berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-6b4377f6` Remi
- `post-6b4377f6` Lode & Stijn
- `post-7516d1de` Prince of Punjab
- `post-7516d1de` Bahadur – Tandoori Grill & Currys
- `post-78a4ab9e` 01
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-ad6a11c0` Korean restaurant
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt gegenüber des ehemaligen Restaurants
- … 7 more in issues.jsonl

### places.missed (39)

- `post-0bf8447d` Pastaia
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
- `post-45dafb41` Standard
- `post-45dafb41` Malafemmena
- `post-48e30fa6` Gauchos del Gusto
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-66f606db` Café Dufte
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Bonanza Coffee
- `post-8901fb9b` Papaya
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-c4e7c0a9` Bar Nonno
- `post-d232f1ca` ROY Kombucha
- `post-fc96acff` Hallmann & Klee
- `post-fc96acff` Lorenz Adlon Esszimmer
- `post-fc96acff` Birds in the Kitchen
- `post-fc96acff` Cielo
- `post-fc96acff` Forsthaus Strelitz

### match_isolated.brand (34)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
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
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ab190d78` Al Abdallah Chicken: Al Abdalla ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.brand (31)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-2927e673` Käfer: Käfer ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-388b4383` Konnopke’s Imbiß: Konnopke's Imbiss ≠ none (none)
- `post-3a0ad71a` Dufte Charlottenburg: none ≠ Mitte Meer (llm)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-3d9147ff` Schüsseldienst: Schüsseldienst - iss keine gewöhnliche Bowl! ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-483d6cc6` Love at First Bite: Love at first bite ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-56bff2cf` Dro: dro ≠ none (none)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ Domberger Brot-Werk - Moabit (llm)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ Tagesbar (llm)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### change.missed (17)

- `review-2b737ce5` before today the food was okay
- `review-c117171d` the place is degrading
- `review-c117171d` they no longer offer to take napkins, they give only one
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-b8d2bcf3` in July 2026 a new generation took over Bravo: Clemens Roesch, Eva Alken, Sören Zuppke an…
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-fc96acff` Facil has quietly gotten better

### match.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2a8e9606` Michelberger Hotel: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Zur Bratpfanne: Zur Bratpfanne ≠ brand only
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-5b5671fa` City Chicken: brand only ≠ Nhas City Chicken
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only

### match_isolated.branch (13)

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
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
