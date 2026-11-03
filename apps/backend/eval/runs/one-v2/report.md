# Ingestion eval: one-v2

2026-11-02 15:59 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output)
Tokens: 16,085,890 (12,307,200 input tokens from the prompt cache)
Models: review-claims: openai/gpt-5.4-mini (172); claim-parts: openai/gpt-5.4-mini (369); post-claims: openai/gpt-5.4-mini (199); venue-match: openai/gpt-5.4-mini (98)

## Reviews

| Metric | one-v2 | stored | mini-v6b | mini-v6 | mini-base-2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 98% (956/978) | 93% +4 | 94% +3 | 95% +3 | 95% +3 |
| Claims that are real (of produced) | 98% (1265/1285) | 99% -1 | 99% ±0 | 99% -1 | 99% ±0 |
| Sentiment | 93% (1024/1103) | 88% +5 | 93% ±0 | 92% +1 | 92% +1 |
| Aspect, exact | 82% (909/1103) | 71% +12 | 75% +8 | 79% +3 | 76% +7 |
| Aspect, right root | 91% (1005/1103) | 81% +10 | 82% +9 | 88% +3 | 84% +7 |
| Kind | 95% (1049/1103) | 67% +28 | 95% ±0 | 95% ±0 | 89% +6 |
| Kind given at all | 100% (1103/1103) | 4% +96 | 98% +2 | 100% ±0 | 100% ±0 |
| Changes that are changes | 55% (16/29) | 56% -1 | 75% -20 | 63% -7 | 73% -18 |
| Changes found | 81% (13/16) | 80% +1 | 81% ±0 | 81% ±0 | 69% +13 |
| Amount | 73% (35/48) | 41% +32 | 65% +8 | 63% +10 | 64% +8 |
| Foods named, precision | 76% (359/475) | 32% +43 | 78% -3 | 81% -5 | 66% +9 |
| Foods named, recall | 86% (331/386) | 23% +63 | 79% +7 | 79% +6 | 66% +20 |

## Posts and articles

| Metric | one-v2 | stored | mini-v6b | mini-v6 | mini-base-2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 86% (1788/2077) | 56% +31 | 85% +1 | 83% +3 | 74% +12 |
| Claims that are real (of produced) | 86% (2642/3056) | 95% -8 | 91% -5 | 88% -1 | 91% -5 |
| Sentiment | 89% (2030/2275) | 86% +4 | 89% ±0 | 89% +1 | 89% ±0 |
| Aspect, exact | 70% (1586/2275) | 63% +7 | 61% +8 | 64% +6 | 51% +19 |
| Aspect, right root | 86% (1952/2275) | 78% +8 | 78% +7 | 84% +2 | 77% +8 |
| Kind | 87% (1990/2275) | 47% +41 | 85% +2 | 87% ±0 | 85% +3 |
| Kind given at all | 100% (2275/2275) | 4% +96 | 98% +2 | 99% +1 | 100% ±0 |
| Changes that are changes | 41% (37/90) | 46% -5 | 40% +1 | 44% -3 | 40% +1 |
| Changes found | 66% (21/32) | 38% +28 | 59% +6 | 56% +9 | 41% +25 |
| Amount | 71% (62/87) | 46% +25 | 66% +5 | 61% +10 | 65% +6 |
| Foods named, precision | 73% (1287/1767) | 46% +27 | 80% -7 | 78% -6 | 78% -5 |
| Foods named, recall | 83% (1173/1415) | 39% +44 | 75% +8 | 77% +6 | 72% +11 |
| Subject (place, city, none) | 90% (2521/2787) | 85% +5 | 86% +4 | 87% +3 | 87% +4 |
| Claim on the right place | 92% (2208/2399) | 85% +7 | 91% +1 | 89% +3 | 91% +2 |
| Places found | 88% (382/433) | 73% +15 | 90% -2 | 91% -3 | 83% +6 |
| Places that are places | 91% (382/419) | 85% +6 | 89% +2 | 89% +2 | 92% -1 |
| Match: brand (found places) | 91% (349/382) | 92% ±0 | 93% -1 | 92% -1 | 92% -1 |
| Match: branch (right brand) | 94% (287/304) | 97% -3 | 95% -1 | 95% -1 | 94% ±0 |
| Match on the reference's places: brand | 92% (398/433) | — | 92% ±0 | 92% ±0 | 93% -2 |
| Match on the reference's places: branch | 95% (328/344) | — | 96% -1 | 96% -1 | 96% -1 |
| Promotional flag | 79% (157/199) | 82% -3 | 80% -1 | 77% +2 | 79% ±0 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | one-v2 (train) | one-v2 (test) | mini-v6b (test) | mini-v6 (test) | mini-base-2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 98% | 97% (288/298) | 94% +3 | 95% +2 | 94% +2 |
| Claims that are real (of produced) | 98% | 99% (366/368) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment | 93% | 93% (307/330) | 94% -1 | 91% +2 | 92% +1 |
| Aspect, exact | 84% | 79% (262/330) | 72% +8 | 79% ±0 | 76% +3 |
| Aspect, right root | 93% | 88% (289/330) | 80% +8 | 89% -1 | 86% +2 |
| Kind | 95% | 96% (317/330) | 98% -2 | 95% +1 | 91% +5 |
| Kind given at all | 100% | 100% (330/330) | 95% +5 | 100% ±0 | 100% ±0 |
| Changes that are changes | 58% | 40% (2/5) | 67% -27 | 40% ±0 | 100% -60 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 68% | 82% (14/17) | 81% +1 | 72% +10 | 73% +9 |
| Foods named, precision | 75% | 76% (102/134) | 78% -2 | 84% -8 | 67% +9 |
| Foods named, recall | 88% | 82% (100/122) | 67% +15 | 84% -2 | 62% +20 |

### Posts and articles

| Metric | one-v2 (train) | one-v2 (test) | mini-v6b (test) | mini-v6 (test) | mini-base-2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 84% | 90% (548/606) | 90% +1 | 86% +4 | 72% +18 |
| Claims that are real (of produced) | 87% | 85% (806/950) | 92% -8 | 89% -4 | 95% -11 |
| Sentiment | 89% | 89% (642/720) | 90% ±0 | 89% ±0 | 91% -2 |
| Aspect, exact | 71% | 67% (484/720) | 59% +8 | 61% +6 | 51% +16 |
| Aspect, right root | 88% | 82% (590/720) | 77% +5 | 79% +3 | 77% +5 |
| Kind | 88% | 86% (619/720) | 85% +1 | 87% -1 | 87% -1 |
| Kind given at all | 100% | 100% (720/720) | 97% +3 | 100% ±0 | 99% +1 |
| Changes that are changes | 45% | 34% (12/35) | 41% -7 | 54% -19 | 21% +13 |
| Changes found | 64% | 70% (7/10) | 80% -10 | 70% ±0 | 30% +40 |
| Amount | 76% | 64% (21/33) | 66% -2 | 65% -1 | 80% -16 |
| Foods named, precision | 73% | 72% (404/561) | 79% -7 | 80% -8 | 82% -10 |
| Foods named, recall | 82% | 85% (371/438) | 70% +15 | 79% +6 | 73% +12 |
| Subject (place, city, none) | 90% | 91% (780/856) | 89% +2 | 86% +5 | 83% +8 |
| Claim on the right place | 93% | 89% (667/746) | 90% -1 | 91% -2 | 88% +1 |
| Places found | 88% | 90% (100/111) | 85% +5 | 86% +4 | 80% +10 |
| Places that are places | 94% | 85% (100/118) | 84% +1 | 90% -5 | 86% -2 |
| Match: brand (found places) | 92% | 90% (90/100) | 91% -1 | 91% -1 | 91% -1 |
| Match: branch (right brand) | 94% | 96% (73/76) | 99% -3 | 99% -3 | 96% ±0 |
| Match on the reference's places: brand | 92% | 91% (101/111) | 93% -2 | 92% -1 | 90% +1 |
| Match on the reference's places: branch | 95% | 95% (80/84) | 96% -1 | 98% -2 | 98% -3 |
| Promotional flag | 79% | 79% (46/58) | 79% ±0 | 78% +2 | 83% -3 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 97% (378/389) | 99% (498/502) | 84% (365/436) | 94% (411/436) | — | — |
| hard | 89% (81/91) | 96% (118/123) | 79% (81/103) | 92% (95/103) | 100% (11/11) | 100% (11/11) |
| lang:de | 98% (353/359) | 98% (456/464) | 84% (337/402) | 92% (371/402) | — | — |
| lang:en | 97% (231/239) | 100% (299/300) | 81% (214/265) | 96% (255/265) | — | — |
| lang:other | 98% (306/313) | 98% (420/430) | 82% (289/354) | 91% (322/354) | — | — |
| lang:tr | 99% (66/67) | 99% (90/91) | 84% (69/82) | 93% (76/82) | — | — |
| length:long | 97% (286/294) | 96% (439/456) | 81% (283/348) | 89% (309/348) | — | — |
| length:medium | 98% (614/627) | 100% (763/766) | 83% (573/694) | 95% (656/694) | — | — |
| length:short | 98% (56/57) | 100% (63/63) | 87% (53/61) | 97% (59/61) | — | — |
| no-transcript | 92% (442/482) | 89% (593/665) | 76% (413/547) | 93% (509/547) | 95% (121/127) | 90% (109/121) |
| own | 89% (59/66) | 91% (107/118) | 81% (63/78) | 94% (73/78) | 100% (20/20) | 100% (20/20) |
| places:few | 89% (1324/1490) | 87% (2025/2315) | 69% (1165/1696) | 89% (1516/1696) | 90% (168/186) | 90% (152/168) |
| places:many | 79% (455/578) | 83% (604/727) | 72% (411/568) | 89% (505/568) | 87% (212/245) | 92% (195/212) |
| places:none | 100% (9/9) | 93% (13/14) | 91% (10/11) | 82% (9/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 81% (869/1067) | 88% (1355/1543) | 64% (702/1102) | 86% (950/1102) | 80% (160/199) | 94% (150/160) |
| platform:google | 98% (956/978) | 98% (1265/1285) | 82% (909/1103) | 93% (1024/1103) | — | — |
| platform:instagram | 92% (298/325) | 91% (395/434) | 72% (264/366) | 94% (343/366) | 94% (67/71) | 87% (58/67) |
| platform:tiktok | 91% (621/685) | 83% (892/1079) | 77% (620/807) | 91% (737/807) | 95% (155/163) | 91% (141/155) |
| size:large | 82% (835/1016) | 85% (1263/1491) | 67% (703/1047) | 87% (907/1047) | 82% (156/191) | 94% (146/156) |
| size:medium | 88% (676/767) | 90% (962/1068) | 68% (584/855) | 91% (778/855) | 94% (134/142) | 90% (121/134) |
| size:small | 94% (277/294) | 84% (417/497) | 80% (299/373) | 92% (345/373) | 92% (92/100) | 89% (82/92) |
| stars:1 | 99% (159/161) | 98% (216/221) | 83% (161/193) | 94% (181/193) | — | — |
| stars:2 | 98% (159/162) | 96% (228/237) | 82% (150/182) | 85% (155/182) | — | — |
| stars:3 | 97% (213/219) | 100% (276/277) | 76% (185/243) | 94% (228/243) | — | — |
| stars:4 | 99% (202/204) | 99% (260/262) | 89% (204/229) | 94% (216/229) | — | — |
| stars:5 | 96% (223/232) | 99% (285/288) | 82% (209/256) | 95% (244/256) | — | — |
| transcript | 90% (477/528) | 82% (694/848) | 75% (471/626) | 91% (571/626) | 94% (101/107) | 89% (90/101) |

## Misses

### parts.aspect (883)

- `review-02556664` go to the competition instead: none ≠ menu_variety
- `review-02d1586d` everything was very good: none ≠ vibe
- `review-037bbe20` the venue is unique: vibe ≠ none
- `review-070860ca` received a refund: complaint_handling ≠ billing
- `review-070860ca` the correct order arrived 2 hours late: delivery_platform ≠ takeaway_handling
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` the loud music fits the vibe they want to create: atmosphere ≠ vibe
- `review-07871fa7` all in all pretty okay: none ≠ vibe
- `review-07871fa7` next time the reviewer will go somewhere else for the döner: none ≠ food
- `review-08c67545` it was nice: none ≠ atmosphere
- `review-0ac47c59` the reviews read were completely different from what was fo…: none ≠ consistency
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: drinks ≠ menu_variety
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: reservation_handling ≠ none
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: reservation_handling ≠ none
- `review-1016bd13` reserved 15 tables in total: reservation_handling ≠ none
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: complaint_handling ≠ speed_of_service
- `review-13683c42` the chain has several locations in Berlin: other ≠ none
- `review-13683c42` the seating is quite uncomfortable: interior ≠ space
- `review-13f72d12` doesn't understand the hype about this place: none ≠ vibe
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: presentation ≠ portion_size
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: menu_variety ≠ food
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-170f36a3` the atmosphere has vibes: atmosphere ≠ vibe
- `review-170f36a3` the food is high in calories: food ≠ taste
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: menu_variety ≠ food
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ ownership
- `review-1798cc23` one of the three Bier bottles looked different: drinks ≠ presentation
- `review-1798cc23` no information was given about the Weinen: advice ≠ drinks
- `review-196641fc` the Gemüse Kebab is perhaps the best so far: taste ≠ none
- `review-196641fc` cool stickers from all over the (football) world as the des…: interior ≠ vibe
- `review-196641fc` eating on site is possible: space ≠ none
- `review-19801259` the shakes were so good too: drink_quality ≠ taste
- `review-1eca7dfe` the food is delicious: taste ≠ food
- `review-1eca7dfe` you can specify the spice level: seasoning ≠ advice
- `review-1eca7dfe` the atmosphere is nice: atmosphere ≠ vibe
- `review-21de844d` waited over half an hour before being served: speed_of_service ≠ wait_for_table
- `review-27722511` don't expect an exceptional atmosphere inside: atmosphere ≠ vibe
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: food ≠ taste
- `review-2799bbfa` finding out about the wrong order at home was super disappo…: order_accuracy ≠ complaint_handling
- … 843 more in issues.jsonl

### parts.foods (744)

- `review-019a8099` the food is really delicious: [] ≠ [Essen]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-0541b749` the frites were too salty: [frites] ≠ [fries]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread, bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-0541b749` the frites were too salty: [frites] ≠ [fries]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm, aardappel]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ [dürüm]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, köri sosu, döner]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [tavuk eti]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan, lettuce, tomatoes, onions]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, köri sosu]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [lettuce, tomatoes, onions]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ [冷 dishes, hot dishes, soup]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ [冷 dishes, hot dishes, soup]
- `review-1016bd13` planned to order more drinks on site as needed: [] ≠ [酒水]
- `review-1016bd13` the restaurant said the cold dishes were already set out: [] ≠ [凉菜]
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: [啤酒] ≠ [4个凉菜, 啤酒]
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ [shredded potatoes]
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ [凉菜]
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: [] ≠ [酒水]
- `review-1016bd13` drinks are sold at exorbitant prices: [] ≠ [酒水]
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: [] ≠ [酒水]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-1104925b` Kebab No. 1 is super tasty: [1번 케밥] ≠ [케밥]
- `review-13683c42` the price is similar to McDonald's: [] ≠ [hamburguesas, McDonald's]
- … 704 more in issues.jsonl

### claims.extra (434)

- `review-0ac47c59` sales slowed down as the line shortened
- `review-1016bd13` the orange juice was just for table decoration
- `review-1016bd13` the first bus had 40 people
- `review-1016bd13` the rest would arrive later
- `review-1016bd13` the restaurant could prepare hot dishes
- `review-1016bd13` the manager and waiters said they would serve one dish at a time
- `review-1016bd13` the chefs served food very fast
- `review-1016bd13` the chefs had three heads and six arms
- `review-1016bd13` the group would order extra drinks
- `review-1016bd13` making the situation look bad was unnecessary
- `review-196641fc` the male kebab experts were likely Arab
- `review-356e149a` he answered no
- `review-356e149a` leaned against the counter for a moment
- `review-356e149a` he answered he is Arab
- `review-35fe7952` the Turkish black tea is free
- `review-3f2a2713` the year is 2026
- `review-510fc086` the place was very cute
- `review-510fc086` the staff were super kind
- `review-8aa327ab` came at eight in the morning
- `review-937ea9e9` the reviewer must definitely stop by
- `post-01239695` the unknown girl ate
- `post-047130f4` Salami Social Club was reviewed in 2016
- `post-047130f4` Salami Social Club remains active in 2026
- `post-047130f4` the original review is preserved as a record of the visit
- `post-047130f4` Salami Social Club is open
- `post-047130f4` Salami Social Club was verified on 22 August 2026
- `post-047130f4` the reviewer dreams about shoving a hot slice in their face
- `post-047130f4` Ben says pizza is for mayonnaise
- `post-047130f4` Jacob says pizza is for breakfast, lunch and dinner
- `post-047130f4` the reviewer loves pizza
- `post-047130f4` the reviewer will eat pizza almost any time of day or night
- `post-047130f4` Nudja is absolutely delicious
- `post-0a8f804b` a visit to Cousins can create completely new memories for other people
- `post-0d484513` the article is based on Instagram posts and new reviews from Berlin food magazines
- `post-0d484513` the article is machine summarized and editorially curated
- `post-0d484513` the article first appeared on taste & stories
- `post-0fa29641` the post is a Berlin guide, Kreuzberg edition
- `post-0fa29641` the creator already mentioned magma.berlin last time
- `post-0fa29641` the creator already mentioned lamaisonberlin last time
- `post-11f0057b` the venue has marble tables
- … 394 more in issues.jsonl

### parts.kind (339)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02556664` go to the competition instead: verdict ≠ fact
- `review-037bbe20` the venue is unique: opinion ≠ fact
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: opinion ≠ fact
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: opinion ≠ fact
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-1798cc23` the old listing including its reviews was simply continued: opinion ≠ change
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-1798cc23` no information was given about the Weinen: opinion ≠ fact
- `review-196641fc` food pickup is an anonymous moving along: opinion ≠ fact
- `review-279b23c3` Justin is the most important and gets a 13/10: opinion ≠ verdict
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: opinion ≠ fact
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: opinion ≠ new_item
- `review-37daa9e9` had heard a lot of positive feedback about this place: fact ≠ verdict
- `review-4cd140a3` the service got worse and worse as the evening went on: opinion ≠ change
- `review-4cd140a3` the restaurant became packed: opinion ≠ fact
- `review-4cd140a3` it got fuller and therefore louder: opinion ≠ change
- `review-503d63e2` one day the Acai machine was broken: opinion ≠ change
- `review-5cd39af6` especially the young man with short white/blond hair was fr…: opinion ≠ fact
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-6b917d41` the burger was amazing: opinion ≠ fact
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` next time someone mentions Mustafa, remind them of Alibabà: verdict ≠ fact
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-90e99b19` the restaurant is fairly spacious: opinion ≠ fact
- `review-90e99b19` the atmosphere is ordinary: opinion ≠ fact
- `review-90e99b19` staff clearing the reviewer's table left the dishcloth on t…: opinion ≠ fact
- `review-90e99b19` the place is not worth more than 15 minutes of travel: verdict ≠ opinion
- `review-937ea9e9` anyone who loves delicious Desserts absolutely has to stop …: verdict ≠ opinion
- `review-99fbc478` the place is like an industrial factory: opinion ≠ fact
- `review-99fbc478` the staff did open gigantic umbrellas: opinion ≠ fact
- `review-99fbc478` you had to search for a single caper under the giant flap: opinion ≠ fact
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: opinion ≠ fact
- `review-b8f6f582` the Agepan is still delicious: opinion ≠ change
- `review-beb397cd` the place was recommended to the reviewer multiple times: fact ≠ verdict
- … 299 more in issues.jsonl

### parts.sentiment (324)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02556664` go to the competition instead: negative ≠ neutral
- `review-037bbe20` the venue is unique: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ neutral
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: negative ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: negative ≠ neutral
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: negative ≠ neutral
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ mixed
- `review-170f36a3` the food is high in calories: mixed ≠ positive
- `review-1798cc23` the Google listing is no longer accurate: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-1798cc23` no information was given about the Weinen: negative ≠ neutral
- `review-196641fc` the wait is probably due to the social media and Maps hype: neutral ≠ mixed
- `review-196641fc` food pickup is an anonymous moving along: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ mixed
- `review-21de844d` there are far better cafés in Berlin than this one: negative ≠ positive
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: negative ≠ neutral
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- `review-3486a0a9` would love to see gf buns on offer: neutral ≠ positive
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` the kebab had loads of lemon: negative ≠ mixed
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-3bab8289` the service from the staff could have been better: negative ≠ mixed
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` doesn't know what people are raving about: negative ≠ positive
- `review-3f2a2713` the venue should offer a vegan burger already: negative ≠ mixed
- `review-4cd140a3` the restaurant became packed: negative ≠ neutral
- `review-4cd140a3` they had hoped for a nice date and a pleasant evening: negative ≠ positive
- `review-4cd140a3` the price/performance ratio is okay: positive ≠ mixed
- `review-503d63e2` never got to eat the Acai: negative ≠ neutral
- `review-5cd39af6` especially the young man with short white/blond hair was fr…: positive ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-6b4df664` the staff could be somewhat friendlier: negative ≠ mixed
- … 284 more in issues.jsonl

### claims.missed (311)

- `review-0217fd90` very delicious
- `review-070860ca` the reviewer is not happy
- `review-0ac47c59` found nothing to praise about the place
- `review-164fbfea` ordered by app
- `review-170f36a3` everything is awesome
- `review-2b737ce5` before today the food was okay
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-36f2fac8` go to another authentic spot instead
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-5582d6b8` sit inside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-7593dfff` the place is worth it if you have time to wait in line
- `review-80d9a747` loved the visit
- `review-bf2322b7` keep up the great work
- `review-c117171d` the place is degrading
- `review-d77ecb53` had the crispy pork knuckle
- `review-d77ecb53` prices are a bit pricey
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-dcd4db39` keep up the good work, dear team
- `review-dd166b0d` the café has a great atmosphere
- `review-feb41b4e` the reviewer has to agree with some of the criticism
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-020c68fb` Markthalle Neun is open Monday to Saturday 9:00–20:00
- `post-047130f4` salmon on pizza just doesn't work
- `post-047130f4` tuna fish should not be eaten on pizza
- `post-0a8f804b` Cousins serves generous scoops
- `post-0a8f804b` None of Cousins' flavours is boring
- `post-0a8f804b` The Kaylin is a particular crowd favourite
- `post-0d1e7abc` Isla has existed for 10 years
- `post-0d484513` NOUMI Sushi Lounge is a stylish Asian spot to go this summer
- `post-0d484513` Yumcha Heroes dumpling manufactory is praised for its handmade dumplings
- `post-11f0057b` Reichenberger Straße in Kreuzberg has legendary status for mild summer evenings
- `post-11f0057b` Magma is open Wed+Thu 10–0, Fri+Sat 10–1, Sun 10–21
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by @wedesi.de
- `post-1c0d4023` Otto is recommended by 6 food editorial teams
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams
- … 271 more in issues.jsonl

### claims.subject (266)

- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-019b903e` Boddensee is in Birkenwerder near Berlin: place ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` Berlin likes pizza even when it is bad: city ≠ none
- `post-047130f4` the Hawaiian is actually really good: place ≠ none
- `post-047130f4` the Hawaiian is actually really good: place ≠ none
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: none ≠ place
- `post-047130f4` Nudja on pizza is absolutely delicious: none ≠ place
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: place ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` Fatih Servet has locations at Warschauer Str., Mall of Berl…: place ≠ city
- `post-088e18e6` Fatih Servet has locations at Warschauer Str., Mall of Berl…: place ≠ city
- `post-0a8f804b` Even the grumpiest customers leave Cousins satisfied: place ≠ none
- `post-0a8f804b` The author will take his own cousin to Cousins: place ≠ none
- `post-0d1e7abc` Isla is not new but still hot: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: place ≠ city
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant has colorful lights: none ≠ place
- `post-165a9370` the Indian restaurant has an impressive ambience: none ≠ place
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ place
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- … 226 more in issues.jsonl

### claims.place (191)

- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the three women's food truly opens every heart: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-2a8e9606` Otto is run by Zupke and Ursus: Otto ≠ Café Bravo
- `post-2a8e9606` Trio is run by Zupke and Ursus: Trio ≠ Café Bravo
- `post-2a8e9606` Otto is a restaurant people treat themselves to once a mont…: Otto ≠ Café Bravo
- `post-2a8e9606` Trio is a restaurant people treat themselves to once a mont…: Trio ≠ Café Bravo
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: Schwarzes Kamel ≠ Landmann
- `post-2a8e9606` Almi Bistro comes from Saint Petersburg to Berlin: Almi Bistro ≠ Michelberger Hotel
- `post-2a8e9606` Almi Bistro is a true discovery: Almi Bistro ≠ Michelberger Hotel
- `post-2a8e9606` Daia serves Georgian wines: Daia ≠ Café Bravo
- `post-2a8e9606` Daia serves authentic plates: Daia ≠ Café Bravo
- `post-2a8e9606` at Kōji the Hand Rolls are picked up with the Nori-Blatt: Kōji ≠ Café Bravo
- `post-2a8e9606` Bar Matrëshka fuses Slavic drinking culture with modern mix…: Bar Matrëshka ≠ Hafenküche
- `post-2b231637` Tribeca Ice Cream is a CeeCee tip: Tribeca Ice Cream ≠ Chipi Chipi Bombón
- `post-31344bc5` Common is rated 4.6 stars: Common ≠ Cookies Cream
- `post-31344bc5` Common has 5 creator recommendations: Common ≠ Ming Dynastie
- `post-31344bc5` Common has 5 creator recommendations: Common ≠ Ming Dynastie
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-388b4383` Jörgs Curry Container is off the tourist paths: Jörgs Curry Container ≠ Ketch’up 35
- `post-388b4383` Jörgs Curry Container is the gentian among Currywurst stands: Jörgs Curry Container ≠ Ketch’up 35
- `post-388b4383` Curry Wolf's special sauce is called Opium: Curry Wolf ≠ Schmidt’s Imbiss
- `post-388b4383` the secret sauce recipe came to the Curry Wolf boss on holi…: Curry Wolf ≠ Schmidt’s Imbiss
- `post-388b4383` Curry Wolf's sweet and spicy Soße tastes of sun, beach and …: Curry Wolf ≠ Schmidt’s Imbiss
- … 151 more in issues.jsonl

### change.false (66)

- `review-1798cc23` the Google listing no longer matches
- `review-1798cc23` the old listing, including the reviews, was simply continued
- `review-4cd140a3` the service got worse as the evening went on
- `review-4cd140a3` the restaurant became increasingly full
- `review-4cd140a3` the restaurant became increasingly loud
- `review-503d63e2` the Acai machine was broken one day
- `review-7593dfff` everything went faster when the older gentleman serving showed up
- `review-b8f6f582` the Agepan was still delicious
- `review-c5e1a090` the reviewer had much fewer strawberries
- `review-c5e1a090` customer service looks different
- `review-e39b92f3` some dishes were described as milder and less oily
- `review-f84d2292` was more welcoming
- `review-fa5b28b1` the döner was very different
- `post-0d1e7abc` the visit is not new but still hot
- `post-11f0057b` Magma is now possible year-round
- `post-11f0057b` the large corner venue was stylishly done up
- `post-2a8e9606` a proper coffeehouse no longer makes coffee a hectic wake-up drink
- `post-2a8e9606` the relationship between the museum and the neighbourhood has grown noticeably
- `post-2a8e9606` the coffee house is now what the neighbourhood pub used to be
- `post-33308126` the batter stays the same and only the fish changes
- `post-388b4383` Matthias now runs the family business
- `post-388b4383` the quality has stayed the same
- `post-388b4383` Konnopke’s became a cult place after reunification
- `post-3a0ad71a` YOU is a new concept replacing Heritage
- `post-56bff2cf` the version at Dro is more restrained
- `post-57ab8313` Birria is now on the menu
- `post-5f073ec2` the food at Arirang was pretty delicious five years ago
- `post-6b4377f6` the menu changes weekly
- `post-6ddca88c` the founders moved to the other side of the Spree
- `post-7516d1de` Bahadur is now Prince of Punjab
- `post-78e0e15a` Gate Kebab served a smaller-sized döner
- `post-7e6e2acc` the dumplings in the bowl at Wen Cheng were not as good as back home
- `post-85b04bf2` the creator now pays special attention to the first moments
- `post-86502a88` the lobster sandwich got a new sauce
- `post-8e94e7ea` sharing is no longer an option
- `post-909ca5ee` Anna Hernández Götz and Max Hühnergarth opened Barlevain
- `post-909ca5ee` Barlevain changes its menu seasonally
- `post-93526d04` the chocolate box was much more intense and very chocolatey
- `post-935c2fd2` restaurant visits have become too expensive for Germans
- `post-a3178d9e` the smashburger opinion changed for the positive
- … 26 more in issues.jsonl

### places.missed (51)

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
- `post-4c3e2a10` The Cell
- `post-51a97d36` GIG Gastro
- `post-58a16831` Bäckerei Johann
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-5b5671fa` City Chicken
- `post-6b4377f6` Mraz & Sohn
- … 11 more in issues.jsonl

### parts.amount (38)

- `review-02556664` the reviewer did not get to eat: —  ≠ 30 minutes
- `review-02556664` the staff were just messing around with the queue: —  ≠ 30 minutes
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 6 money
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 20 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-5d173a89` only five people were ahead in line: —  ≠ 5 minutes
- `review-75c84f72` the reviewers are used to marketplaces opening at 07.00 at …: —  ≠ 7 minutes
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: —  ≠ 2 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-be1da4e0` charging for the Wasser is outrageous: —  ≠ 7.5 money
- `review-d77ecb53` had a liter of beer: —  ≠ 1 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-2a8e9606` Landmann serves a glass of Sekt or a Pfiff, a small Bier, f…: —  ≠ 15 minutes
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: —  ≠ 15 minutes
- `post-31344bc5` 350 of 632 Berlin restaurants on the map offer vegetarian o…: —  ≠ 350 money
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 5.5 minutes
- `post-45841578` the four spots are must-tries for eating cheap and tasty in…: 10 money ≠ —
- `post-52eb53af` the samosa cost only 2 euros: 2 money ≠ 12 money
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ 12 money
- `post-57ab8313` The Gringa de Birria is the authors' favourite: —  ≠ 12.9 money
- `post-57ab8313` The Tacos de Birria Veganos cost 11.50 euros: 11.5 money ≠ 12 money
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-57ab8313` The Quesabirria Vegana costs 12 euros: 12 money ≠ —
- `post-57ab8313` Every Friday from 20:00 the Margaritas Social Club takes pl…: —  ≠ 5 money
- `post-57ab8313` During the Margaritas Social Club all four margaritas on th…: 5 money ≠ —
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-816a40e7` the restaurant opens at 13:00 on Friday: —  ≠ 13 minutes
- `post-8901fb9b` Tobias eats at Miss Saigon twice a week: —  ≠ 2 minutes
- `post-ae8f76f1` Followers can win a brunch for 2 at Velvet Coffee: —  ≠ 1 money
- `post-cb785d0b` the place now has almost 60 seats: —  ≠ 60 minutes
- `post-cb785d0b` the renovation took 8 months: —  ≠ 8 minutes
- `post-cecea20e` the food event at Bikini Berlin ran for two days with 40+ p…: —  ≠ 2 minutes
- `post-e1c05dce` Café Yohaku gets 9 out of 10: —  ≠ 9 money
- `post-fc96acff` Michael Kempf has been Facil's culinary director since 2003…: —  ≠ 23 money
- `post-fc96acff` the 2015 Vosne-Romanée from Domaine Confuron Cotétidot was …: —  ≠ 100 money
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money
- `post-fe3794c9` 20 years of SpreeWiesn is a remarkable milestone for a temp…: —  ≠ 20 money

### places.extra (37)

- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-165a9370` Indian Restaurant
- `post-22c25ac1` Mrs. Chens Blue Pearl
- `post-233389f4` indisches Restaurant
- `post-48e30fa6` Kaufland Oranienburg
- `post-4c3e2a10` Haftschaden
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-68b0cd44` Panda Meister Berlin Kurfürstendamm
- `post-7516d1de` Prince of Punjab
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Charlottenburg
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-8901fb9b` Tacos
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Main
- `post-a92f9a04` Café KannVa
- `post-aa137bfa` TITANIC Gendarmenmarkt
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-aa137bfa` Beef Grill Club
- `post-aa137bfa` Beef Grill Club
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt gegenüber des ehemaligen Restaurants
- `post-b8d2bcf3` KW Institute for Contemporary Art
- `post-cecea20e` Bikini Berlin
- `post-d1ab7367` Natural Selection
- `post-dfe2d586` VALORANT Champions Shanghai 2026
- `post-dfe2d586` VALORANT Champions
- `post-e2a421e9` Lindner
- `post-e62d3c39` KW – Institute for Contemporary Art
- `post-f0fb51e5` Hackescher Markt
- `post-fc96acff` The Mandala Hotel
- `post-fe3794c9` SpreeWiesn

### match_isolated.brand (35)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Starbucks: none ≠ Starbucks (exact)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (llm)
- `post-34212ac5` The Dawn Kudamm: The Dawn ≠ none (none)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Amo Café: none ≠ ama Café (llm)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Augusta am Savignyplatz Käse und Weinladen (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ad6a11c0` Canal Bakery: CANAL ≠ none (none)
- `post-cb785d0b` Sagos: none ≠ Samos (llm)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.brand (33)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (llm)
- `post-3a0ad71a` Mr. Minsch: Mr. Minsch ≠ none (other_city)
- `post-3a0ad71a` Le Faubourg: Le Faubourg ≠ none (other_city)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-45dafb41` Standard: Standard Serious Pizza ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ Domberger Brot-Werk - Gleisdreieck (llm)
- `post-7adcadc8` ZEITLOS Berlin: none ≠ Cocktailbar Zeitlos (llm)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Kaffee Peri: none ≠ Kaffee Pia (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Augusta am Savignyplatz Käse und Weinladen (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-f17dfe96` Jemenitisches Restaurant: Jemenitisches Restaurant المطعم اليمني ≠ Jemenitisches Restaurant (llm)
- `post-fb121f9c` Hackescher Hof: none ≠ HeimWerk Hackescher Markt (llm)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.branch (17)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Zur Bratpfanne: Zur Bratpfanne ≠ brand only
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ Zacharias - Tagesbar
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-a73d3378` Rüyam Gemüse Kebab: brand only ≠ Rüyam Gemüse Kebab
- `post-b2993d78` Mani in Pasta: Mani in Pasta - Markthalle ≠ brand only
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only

### match_isolated.branch (16)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ Veg'd - Vegan Burgers - P-Berg
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-5b5671fa` City Chicken: brand only ≠ Nhas City Chicken
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ Zacharias - Tagesbar
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### change.missed (14)

- `review-2b737ce5` before today the food was okay
- `review-382cd7e9` the renovation is a real shame
- `review-c117171d` the place is degrading
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-cb785d0b` the renovation is finished, celebrated with the 1-cent promotion
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e62d3c39` the operators of Otto, Trio and Pluto took over the day café Bravo in the KW Institute fo…
