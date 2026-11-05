# Ingestion eval: a2-sonnet

2026-11-05 16:06 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, claimsModel anthropic/claude-sonnet-5-5, labeller classifier
Tokens: 6,231,896 (744,987 input tokens from the prompt cache)
Spend: $0.181 (paid calls: classifiers)
Models: review-claims: anthropic/claude-sonnet-5-5 (51); claim-labels: typesafe-ai/jev-latest (106); post-claims: anthropic/claude-sonnet-5-5 (58); venue-match: openai/gpt-5.4-mini (26)

## Reviews

| Metric | a2-sonnet | stored | a2-mini | labels-jev-k8 | sq-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 100% (297/298) | 93% +6 | 95% +5 | — | 100% ±0 |
| Claims that are real (of produced) | 100% (348/348) | 99% +1 | 100% ±0 | — | 100% ±0 |
| Sentiment | 97% (337/347) | 88% +10 | 95% +2 | 98% -1 | 97% ±0 |
| Aspect, exact | 89% (310/347) | 71% +19 | 88% +1 | 90% ±0 | 93% -4 |
| Aspect, right root | 95% (328/347) | 81% +14 | 93% +2 | 95% -1 | 96% -1 |
| Kind | 97% (337/347) | 67% +30 | 96% +1 | 98% -1 | 97% ±0 |
| Kind given at all | 100% (347/347) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 74% (256/347) | — | 73% +1 | 74% ±0 | — |
| Sentiment, among sure answers | 100% (256/256) | — | 99% +1 | 100% ±0 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 50% (175/347) | — | 46% +5 | 51% ±0 | — |
| Aspect, exact, among sure answers | 97% (169/175) | — | 97% -1 | 98% -2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 76% (265/347) | — | 76% ±0 | 74% +3 | — |
| Kind, among sure answers | 98% (261/265) | — | 99% -1 | 99% -1 | — |
| Changes that are changes | 67% (2/3) | 56% +11 | 67% ±0 | 72% -6 | 67% ±0 |
| Changes found | 100% (2/2) | 80% +20 | 100% ±0 | 81% +19 | 100% ±0 |
| Amount | 100% (14/14) | 41% +59 | 61% +39 | 73% +28 | 93% +7 |
| Foods named, precision | 89% (118/133) | 32% +56 | 91% -2 | — | 86% +2 |
| Foods named, recall | 90% (114/126) | 23% +68 | 94% -4 | — | 88% +2 |

## Posts and articles

| Metric | a2-sonnet | stored | a2-mini | labels-jev-k8 | sq-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 94% (567/606) | 56% +38 | 81% +12 | — | 93% +1 |
| Claims that are real (of produced) | 93% (785/846) | 95% -2 | 89% +3 | — | 94% -1 |
| Sentiment | 94% (716/759) | 86% +9 | 92% +3 | 97% -3 | 96% -1 |
| Aspect, exact | 80% (610/759) | 63% +17 | 78% +2 | 82% -1 | 86% -6 |
| Aspect, right root | 87% (661/759) | 78% +9 | 86% +1 | 91% -4 | 91% -4 |
| Kind | 89% (679/759) | 47% +43 | 88% +1 | 94% -5 | 94% -5 |
| Kind given at all | 100% (759/759) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 66% (500/759) | — | 62% +4 | 67% -1 | — |
| Sentiment, among sure answers | 97% (483/500) | — | 94% +2 | 100% -3 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 33% (249/759) | — | 38% -6 | 41% -9 | — |
| Aspect, exact, among sure answers | 96% (239/249) | — | 92% +4 | 94% +2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 58% (444/759) | — | 60% -2 | 61% -2 | — |
| Kind, among sure answers | 95% (421/444) | — | 93% +2 | 98% -3 | — |
| Changes that are changes | 40% (12/30) | 46% -6 | 39% +1 | 49% -9 | 68% -28 |
| Changes found | 80% (8/10) | 38% +43 | 90% -10 | 97% -17 | 90% -10 |
| Amount | 76% (19/25) | 46% +30 | 55% +21 | 86% -10 | 81% -5 |
| Foods named, precision | 80% (447/558) | 46% +34 | 71% +9 | — | 82% -2 |
| Foods named, recall | 94% (416/442) | 39% +55 | 85% +9 | — | 96% -2 |
| Subject (place, city, none) | 96% (807/839) | 85% +11 | 91% +5 | — | 97% -1 |
| Claim on the right place | 88% (664/758) | 85% +3 | 88% ±0 | — | 86% +2 |
| Places found | 91% (101/111) | 73% +18 | 86% +5 | — | 92% -1 |
| Places that are places | 88% (101/115) | 85% +3 | 83% +5 | — | 91% -3 |
| Match: brand (found places) | 93% (94/101) | 92% +1 | 94% -1 | — | 89% +4 |
| Match: branch (right brand) | 93% (74/80) | 97% -5 | 96% -3 | — | 96% -3 |
| Match on the reference's places: brand | 90% (100/111) | — | 92% -2 | — | 90% ±0 |
| Match on the reference's places: branch | 95% (80/84) | — | 95% ±0 | — | 99% -4 |
| Promotional flag | 100% (58/58) | 82% +18 | 90% +10 | — | 100% ±0 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-sonnet (train) | a2-sonnet (test) | a2-mini (test) | labels-jev-k8 (test) | sq-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 100% (297/298) | 95% +5 | — | 100% ±0 |
| Claims that are real (of produced) | — | 100% (348/348) | 100% ±0 | — | 100% ±0 |
| Sentiment | — | 97% (337/347) | 95% +2 | 98% -1 | 97% ±0 |
| Aspect, exact | — | 89% (310/347) | 88% +1 | 91% -1 | 93% -4 |
| Aspect, right root | — | 95% (328/347) | 93% +2 | 95% -1 | 96% -1 |
| Kind | — | 97% (337/347) | 96% +1 | 98% -1 | 97% ±0 |
| Kind given at all | — | 100% (347/347) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 74% (256/347) | 73% +1 | 72% +2 | — |
| Sentiment, among sure answers | — | 100% (256/256) | 99% +1 | 100% ±0 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 50% (175/347) | 46% +5 | 52% -2 | — |
| Aspect, exact, among sure answers | — | 97% (169/175) | 97% -1 | 98% -2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 76% (265/347) | 76% ±0 | 78% -2 | — |
| Kind, among sure answers | — | 98% (261/265) | 99% -1 | 99% ±0 | — |
| Changes that are changes | — | 67% (2/3) | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | — | 100% (14/14) | 61% +39 | 64% +36 | 93% +7 |
| Foods named, precision | — | 89% (118/133) | 91% -2 | — | 86% +2 |
| Foods named, recall | — | 90% (114/126) | 94% -4 | — | 88% +2 |

### Posts and articles

| Metric | a2-sonnet (train) | a2-sonnet (test) | a2-mini (test) | labels-jev-k8 (test) | sq-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 94% (567/606) | 81% +12 | — | 93% +1 |
| Claims that are real (of produced) | — | 93% (785/846) | 89% +3 | — | 94% -1 |
| Sentiment | — | 94% (716/759) | 92% +3 | 97% -3 | 96% -1 |
| Aspect, exact | — | 80% (610/759) | 78% +2 | 81% -1 | 86% -6 |
| Aspect, right root | — | 87% (661/759) | 86% +1 | 90% -3 | 91% -4 |
| Kind | — | 89% (679/759) | 88% +1 | 94% -4 | 94% -5 |
| Kind given at all | — | 100% (759/759) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 66% (500/759) | 62% +4 | 65% ±0 | — |
| Sentiment, among sure answers | — | 97% (483/500) | 94% +2 | 100% -3 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 33% (249/759) | 38% -6 | 37% -4 | — |
| Aspect, exact, among sure answers | — | 96% (239/249) | 92% +4 | 94% +2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 58% (444/759) | 60% -2 | 60% -2 | — |
| Kind, among sure answers | — | 95% (421/444) | 93% +2 | 97% -3 | — |
| Changes that are changes | — | 40% (12/30) | 39% +1 | 48% -8 | 68% -28 |
| Changes found | — | 80% (8/10) | 90% -10 | 100% -20 | 90% -10 |
| Amount | — | 76% (19/25) | 55% +21 | 82% -6 | 81% -5 |
| Foods named, precision | — | 80% (447/558) | 71% +9 | — | 82% -2 |
| Foods named, recall | — | 94% (416/442) | 85% +9 | — | 96% -2 |
| Subject (place, city, none) | — | 96% (807/839) | 91% +5 | — | 97% -1 |
| Claim on the right place | — | 88% (664/758) | 88% ±0 | — | 86% +2 |
| Places found | — | 91% (101/111) | 86% +5 | — | 92% -1 |
| Places that are places | — | 88% (101/115) | 83% +5 | — | 91% -3 |
| Match: brand (found places) | — | 93% (94/101) | 94% -1 | — | 89% +4 |
| Match: branch (right brand) | — | 93% (74/80) | 96% -3 | — | 96% -3 |
| Match on the reference's places: brand | — | 90% (100/111) | 92% -2 | — | 90% ±0 |
| Match on the reference's places: branch | — | 95% (80/84) | 95% ±0 | — | 99% -4 |
| Promotional flag | — | 100% (58/58) | 90% +10 | — | 100% ±0 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 100% (140/140) | 100% (158/158) | 89% (141/159) | 96% (153/159) | — | — |
| hard | 94% (17/18) | 100% (23/23) | 83% (19/23) | 100% (23/23) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 100% (98/98) | 89% (86/97) | 96% (93/97) | — | — |
| lang:en | 99% (70/71) | 100% (82/82) | 90% (72/80) | 100% (80/80) | — | — |
| lang:other | 100% (96/96) | 100% (114/114) | 88% (100/114) | 98% (112/114) | — | — |
| lang:tr | 100% (44/44) | 100% (54/54) | 93% (52/56) | 93% (52/56) | — | — |
| length:long | 99% (79/80) | 100% (95/95) | 90% (89/99) | 94% (93/99) | — | — |
| length:medium | 100% (194/194) | 100% (229/229) | 89% (198/223) | 98% (219/223) | — | — |
| length:short | 100% (24/24) | 100% (24/24) | 92% (23/25) | 100% (25/25) | — | — |
| no-transcript | 88% (93/106) | 99% (114/115) | 77% (94/122) | 93% (113/122) | 94% (34/36) | 91% (31/34) |
| own | 96% (27/28) | 100% (34/34) | 85% (29/34) | 97% (33/34) | 100% (6/6) | 100% (6/6) |
| places:few | 95% (484/512) | 93% (686/735) | 79% (522/658) | 94% (617/658) | 94% (59/63) | 95% (56/59) |
| places:many | 89% (79/89) | 89% (95/107) | 87% (84/97) | 98% (95/97) | 87% (41/47) | 90% (37/41) |
| places:none | 80% (4/5) | 100% (4/4) | 100% (4/4) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| platform:blog | 99% (333/338) | 92% (484/524) | 79% (358/453) | 94% (425/453) | 100% (31/31) | 100% (31/31) |
| platform:google | 100% (297/298) | 100% (348/348) | 89% (310/347) | 97% (337/347) | — | — |
| platform:instagram | 85% (56/66) | 100% (69/69) | 75% (56/75) | 93% (70/75) | 88% (14/16) | 86% (12/14) |
| platform:tiktok | 88% (178/202) | 92% (232/253) | 85% (196/231) | 96% (221/231) | 88% (56/64) | 91% (51/56) |
| size:large | 99% (288/292) | 91% (402/442) | 79% (306/385) | 94% (361/385) | 92% (34/37) | 94% (32/34) |
| size:medium | 88% (225/255) | 94% (315/335) | 81% (246/302) | 96% (291/302) | 92% (49/53) | 96% (47/49) |
| size:small | 92% (54/59) | 99% (68/69) | 81% (58/72) | 89% (64/72) | 86% (18/21) | 83% (15/18) |
| stars:1 | 100% (49/49) | 100% (57/57) | 92% (54/59) | 95% (56/59) | — | — |
| stars:2 | 100% (27/27) | 100% (30/30) | 90% (26/29) | 100% (29/29) | — | — |
| stars:3 | 99% (84/85) | 100% (103/103) | 86% (89/104) | 97% (101/104) | — | — |
| stars:4 | 100% (54/54) | 100% (64/64) | 92% (57/62) | 98% (61/62) | — | — |
| stars:5 | 100% (83/83) | 100% (94/94) | 90% (84/93) | 97% (90/93) | — | — |
| transcript | 87% (141/162) | 90% (187/207) | 86% (158/184) | 97% (178/184) | 82% (36/44) | 89% (32/36) |

## Misses

### parts.aspect (186)

- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the pain was quickly made, nothing special: food ≠ speed_of_service
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-0ac47c59` the chicken meat was in the döner: food ≠ taste
- `review-28e4170f` the market hall was really fun to look around: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-3f2a2713` you can use the ketchup provided for a vegan burger: dietary ≠ seasoning
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-52ef0f64` the Vöner Döner was quite good: taste ≠ food
- `review-5582d6b8` had the shoyu and asari: none ≠ food
- `review-5582d6b8` there were some issues too: none ≠ outdoor_seating
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-5582d6b8` had iced matcha latte: none ≠ drinks
- `review-5582d6b8` skip the matcha latte: drink_quality ≠ outdoor_seating
- `review-58540992` the service at the table was friendly: friendliness ≠ attentiveness
- `review-6217ec70` the kebab had a generous amount of sauce: portion_size ≠ cooking
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-70467fba` the kebab was not extraordinary: taste ≠ none
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: none ≠ location
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-7f69ec8d` it is definitely not worth it: none ≠ queue
- `review-90e99b19` the place might be okay if passing nearby: none ≠ location
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` except for one staff member, but everyone has a bad day: friendliness ≠ service
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ food_hygiene
- `review-bf2322b7` there were even different marinades for the chicken: menu_variety ≠ seasoning
- `review-bf2322b7` the Salat was fresh: freshness ≠ taste
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ location
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ location
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fb1415dc` the cleanliness and service issues are not that bad: none ≠ service
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: menu_variety ≠ authenticity
- `post-14d4fc29` Markthalle Neun is in Kreuzberg: location ≠ authenticity
- `post-165a9370` the Indian restaurant is in the heart of Berlin: location ≠ interior
- … 146 more in issues.jsonl

### parts.foods (142)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [viande poulet, sandwich]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan, salataları]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [köri sosu, tavuk eti]
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: [] ≠ [dönercisi]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan, salataları]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: [gemuse kebaba, wrapa] ≠ [gemuse kebaba, wrapa, kebabów]
- `review-3e075e7e` the whole "muala" thing is ridiculous: [] ≠ [muala]
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-70467fba` the kebab was not extraordinary: [kebab] ≠ []
- `review-70467fba` the kebab was not worth waiting forever for: [kebab] ≠ []
- `review-71868223` had doubts about going to Gemüse Kebab: [] ≠ [Gemüse kebab]
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneriydi]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ [dönerciye]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneriydi]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ [dönerciye]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fb1415dc` many burger combinations are possible: [] ≠ [Burger]
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ [meat]
- `post-1b8b0789` the creator and two colleagues found the Fleisch very tasty: [Fleisch] ≠ [meat]
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ [meat]
- `post-1c78d4ed` The El Líbano beans are washed-processed: [beans] ≠ [Caturra, Colombia, Castillo, Tabi]
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: [beans] ≠ []
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ []
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso, El Líbano]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [El Líbano Espresso, stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica, Espresso]
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: [Sambar, Chutneys] ≠ [Masala Dosa, Sambar, Chutneys]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: [] ≠ [Dumplings]
- … 102 more in issues.jsonl

### claims.place (94)

- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen Jun…: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the restaurant in Mitte has new owners: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the new owners gave the three women a share of the profits: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` through the tinted shop window you can watch the three wome…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the women are supported by only one man: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satis…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the three women's food truly opens every heart: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Manufaktur has a daily changing offering: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufakt…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- … 54 more in issues.jsonl

### parts.kind (90)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-0ac47c59` the chicken meat was in the döner: fact ≠ opinion
- `review-5582d6b8` don't get the matcha, it is undrinkable: opinion ≠ verdict
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-70467fba` the kebab was not worth waiting forever for: opinion ≠ verdict
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-14d4fc29` Markthalle Neun is in Kreuzberg: fact ≠ opinion
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ event
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ fact
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` they ordered the classic Fatush salad: fact ≠ opinion
- `post-4f942afd` the egg has a nice contrast of yolk and white: opinion ≠ fact
- `post-4f942afd` the meal offered many new flavours: opinion ≠ fact
- `post-524765b0` Kírkē is a place to linger over good food and a few glasses…: opinion ≠ verdict
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: opinion ≠ fact
- `post-57ab8313` Three different chili varieties and some secret ingredients…: fact ≠ opinion
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: opinion ≠ verdict
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: opinion ≠ fact
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: fact ≠ opinion
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle: opinion ≠ change
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: fact ≠ change
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: fact ≠ change
- `post-59699006` Café Amano serves Espresso uncomplicatedly through the wind…: fact ≠ deal
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ deal
- `post-59699006` Coffee houses are having a renaissance in Berlin: fact ≠ change
- `post-60ff28c2` Sandos is a Japanese sandwich and matcha spot: fact ≠ event
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- `post-60ff28c2` Matcha is generally best with Kokosmilch: opinion ≠ verdict
- `post-674e7322` Jones ice cream is the best cheat day treat: verdict ≠ opinion
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque: fact ≠ change
- `post-6c0e92d2` the freshly mixed raspberry daiquiri is worth trying with a…: opinion ≠ verdict
- `post-73286ffe` the Heitlinger Brasserie promises special evenings in a new…: opinion ≠ event
- … 50 more in issues.jsonl

### claims.extra (61)

- `post-4a742b09` running a restaurant in your 30s hits different
- `post-4c3e2a10` The Cell is a snack stand built like a jail
- `post-4c3e2a10` the owner is very proud of his kebab
- `post-4c3e2a10` many kebab stores let the spit dry up
- `post-4c3e2a10` the owner says his kebab is art, not just kebab
- `post-4c3e2a10` the owner dreamed of the kebab idea while in jail
- `post-4c3e2a10` the owner aims to make the best kebab in Germany
- `post-4c3e2a10` the owner comes from a catering family
- `post-4c3e2a10` the owner of The Cell wants to serve customers well and not lose them
- `post-4f942afd` hummus is better than guacamole or other hyped dippy-spready things
- `post-4f942afd` Julian experiments with the dishes Akkawy serves
- `post-4f942afd` the mushroom-hummus dish is the best example of Akkawy's experimentation
- `post-4f942afd` tahini is the thread that binds all of Akkawy's dishes
- `post-4f942afd` Za'atar is a middle-Eastern herb related to oregano
- `post-6c0e92d2` the Himbeer-Daiquiri was perhaps a bit too easy to drink for a lunch break
- `post-6c0e92d2` Kroque is open to everything for what comes next
- `post-8901fb9b` the best restaurant in Berlin is in Charlottenburg
- `post-8901fb9b` the best restaurant is a controversial pick
- `post-8901fb9b` the best restaurant is a very old place and a 10 out of 10 experience
- `post-8901fb9b` Sülze is a meat aspic served with pan fried potatoes and remoulade sauce
- `post-8901fb9b` the Sülze dish is good stuff
- `post-8901fb9b` Bonanza Coffee is in a backyard
- `post-8901fb9b` at Ming Dynasty it matters that you know what to order
- `post-8901fb9b` Boy is the best Thai restaurant with a modern approach
- `post-8901fb9b` the creator names tacos as the best döner
- `post-8901fb9b` the tacos are Persian, with dried mint, goat cheese and feta
- `post-8901fb9b` the creator likes the tacos
- `post-8901fb9b` Special Sauce is about curry versus curry powder
- `post-909ca5ee` Johann Bäckerei is located not far from Barlevain
- `post-b5e879f0` India restaurant has closed
- `post-b5e879f0` India had been open for over 30 years
- `post-b5e879f0` India was a relaxed constant in the changing Bergmannkiez
- `post-b5e879f0` India moved away from Bergmannstraße
- `post-b5e879f0` India was a relaxed regular neighbourhood restaurant, not exciting and not the talk of th…
- `post-b5e879f0` people have forgotten how nice a relaxed neighbourhood regular spot is
- `post-b5e879f0` India is now closed
- `post-b5e879f0` the author always left India with a full, warm feeling
- `post-b5e879f0` India's manager Virender Aurora said his contract was not renewed
- `post-b5e879f0` India thanked its guests for over 31 years in a farewell letter
- `post-b5e879f0` India's farewell letter said a restaurant lives from its guests and this one lived from t…
- … 21 more in issues.jsonl

### parts.sentiment (53)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-0ac47c59` the chicken meat was in the döner: neutral ≠ negative
- `review-5582d6b8` sit inside: positive ≠ negative
- `review-90e99b19` the place might be okay if passing nearby: mixed ≠ negative
- `review-b31c1e48` the robot cat couldn't reach the area by the step: negative ≠ neutral
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `post-14d4fc29` Markthalle Neun is in Kreuzberg: neutral ≠ positive
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4a742b09` the owners plate dishes they are proud of at Village House: positive ≠ mixed
- `post-4a742b09` some days Village House is packed: neutral ≠ mixed
- `post-4c3e2a10` it is very warm inside the stand: neutral ≠ positive
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: mixed ≠ positive
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: positive ≠ neutral
- `post-4f942afd` they ordered the classic Fatush salad: neutral ≠ positive
- `post-4f942afd` textures play an important role in Akkawy's cooking: positive ≠ neutral
- `post-4f942afd` the egg has a nice contrast of yolk and white: positive ≠ neutral
- `post-4f942afd` the meal offered many new flavours: positive ≠ neutral
- `post-4f942afd` the author neither loves nor hates hummus: mixed ≠ positive
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: positive ≠ neutral
- `post-57ab8313` Three different chili varieties and some secret ingredients…: neutral ≠ positive
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: positive ≠ neutral
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: neutral ≠ positive
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-816a40e7` there are not many shawarma and döner shops in this area: neutral ≠ negative
- `post-8901fb9b` shout out to Sophie's team: positive ≠ neutral
- `post-909ca5ee` Barlevain opened in spring: neutral ≠ positive
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: neutral ≠ positive
- `post-909ca5ee` The Oeuf Mayo is currently served with a Bärlauchmayonnaise: neutral ≠ positive
- `post-93526d04` the unnamed baklava shop has 4.8 stars: neutral ≠ positive
- `post-996efecb` Bonanza's slogan is "Unnecessary rules": neutral ≠ positive
- `post-996efecb` the staff explained the small volume was intentional: neutral ≠ mixed
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: positive ≠ neutral
- … 13 more in issues.jsonl

### claims.missed (40)

- `review-70467fba` the kebab is definitely worth trying
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-22c25ac1` 20 dumplings cost 30 euros
- `post-24601e6d` trying some German food in Berlin was super exciting
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-3d9147ff` bowls are one of the creator's favorite things to eat
- `post-3d9147ff` bowls can get a little boring sometimes
- `post-3d9147ff` Schüsseldienst does bowls a little differently
- `post-3d9147ff` Schüsseldienst is definitely worth trying
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently
- `post-3d9147ff` Kitchari Kitchen is definitely worth trying
- `post-3d9147ff` Fatoush does bowls a little differently
- `post-3d9147ff` Fatoush is definitely worth trying
- `post-4f942afd` Akkawy is a Friedrichshain classic
- `post-57ab8313` Berlin should go to Taco & Gringo and learn
- `post-58a16831` Nyde is on an extremely quiet bicycle street
- `post-60ff28c2` Sandos is at Scharnweber 26
- `post-650ede57` question whether oil belongs in pasta water
- `post-68b0cd44` Panda Meister is budget friendly
- `post-68b0cd44` Panda Meister is veggie friendly
- `post-68b0cd44` the creator started with a dumpling in homemade chili oil
- `post-68b0cd44` the creator had spicy bian bian hand pulled noodles
- `post-68b0cd44` the bian bian noodles had an impressive texture
- `post-68b0cd44` the bian bian noodles cost only 8.90
- `post-68b0cd44` the creator tried vegetable and glass noodle steamed buns
- `post-68b0cd44` Panda Meister also offers vegan Mapo tofu
- `post-68b0cd44` the Mapo tofu gave a tingling sensation
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish
- `post-68b0cd44` the chef encouraged the creator to order the aubergine dish
- `post-68b0cd44` the creator ordered Boba for dessert
- `post-816a40e7` the restaurant is a new opening in Berlin
- `post-816a40e7` it is a Syrian-Kurdish restaurant in Charlottenburg
- `post-816a40e7` the restaurant can't get any better
- `post-816a40e7` the restaurant has lots of delicious things
- `post-93526d04` they also visited Nastys
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants
- `post-a61ba144` asks which hyped food spots in Berlin people can recommend
- `post-b2993d78` Mani in Pasta offers real Italian pasta art
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the city's best ice cream parlours …
- `post-d90ac864` jalanche is offered to try

### claims.subject (32)

- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: city ≠ place
- `post-4f942afd` the author neither loves nor hates hummus: none ≠ place
- `post-524765b0` People looking for new restaurants, cafés and bakeries usua…: city ≠ place
- `post-60ff28c2` Matcha is generally best with Kokosmilch: none ≠ place
- `post-6c0e92d2` drinks get their due at Kroque: place ≠ none
- `post-75c11d7c` in Bara Chirashi the fish is cut into small bite-sized piec…: none ≠ place
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ none
- `post-8901fb9b` Common from Max has the best pizza: place ≠ none
- `post-8901fb9b` Max does a hell of a job with the baking at Common: place ≠ none
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ none
- `post-b5e879f0` a Boulettenbrötchen at the bakery next door costs 2,50 Euro: city ≠ none
- `post-b5e879f0` the Boulettenbrötchen tastes fluffier than any oat milk foam: city ≠ none
- `post-b5e879f0` Halwa is an Indian dessert of semolina, raisins, almonds an…: none ≠ place
- `post-d232f1ca` ROY teamed up with BRLO again to bring back ROY Hops Kombuc…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha has all the floral, fruity character of A…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is balanced by the kombucha's gentle swee…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is smooth, refreshing and just bitter eno…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is alcohol-free: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is never short on flavour: place ≠ none
- `post-db280ef6` 572Pasta ends overpriced lunch: place ≠ city
- `post-dfe2d586` bubble tea was a hype, then seemingly gone, and is now ever…: none ≠ city
- `post-e2a421e9` Berliners stay stubborn when it comes to traditional shops: city ≠ place
- `post-e2a421e9` Berliners stay stubborn when it comes to traditional shops: city ≠ place
- `post-fc96acff` of Berlin's 19 Michelin-starred restaurants only one opens …: city ≠ place
- `post-fc96acff` Berlin's big fine dining houses train and send out little t…: city ≠ place
- `post-fc96acff` German fine dining lacks creativity at times but its execut…: none ≠ place
- `post-fc96acff` the technique of German fine dining is always on the money: none ≠ place

### change.false (19)

- `review-7593dfff` everything went faster once the older gentleman appeared
- `post-58a16831` Pêle-Mêle ends the era of the avocado sandwich
- `post-59699006` Café Amano is opening its green window to serve passers-by with coffee and Aperol Spritz
- `post-59699006` Berlin is experiencing a renaissance of coffee houses
- `post-6c0e92d2` Kroque's partner Josue Kashala took over the bar when Lukas asked him
- `post-909ca5ee` the Cavatelli at Barlevain are currently served as Pasta alla Norma
- `post-935c2fd2` restaurant and hospitality revenue in Germany fell by 4 percent
- `post-b5e879f0` India restaurant has closed
- `post-b5e879f0` queuing is the new black on Bergmannstraße
- `post-b5e879f0` India moved away from Bergmannstraße
- `post-b5e879f0` India is now closed
- `post-b5e879f0` commercial rents on Bergmannstraße rose and competitive pressure crept into the neighborh…
- `post-b5e879f0` India closed down
- `post-babe1142` in Italy buffalo ice cream is more of a trend than a tradition and has been increasing in…
- `post-c4e7c0a9` a beautiful blue wall color appeared in Sabon's left area when the old wallpaper was remo…
- `post-d232f1ca` ROY Hops Kombucha is back as a collaboration with BRLO
- `post-e2a421e9` the Lindner deli chain is returning to its old name
- `post-fc96acff` Facil's cast has changed very little, which almost nobody knows
- `post-fc96acff` Facil had its anniversary lunch, which made clear the restaurant has quietly gotten better

### places.extra (14)

- `post-51a97d36` GIG
- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-57ab8313` The Coral
- `post-57ab8313` El Maestro de la Birria
- `post-816a40e7` Surich
- `post-8901fb9b` Buck and Breck
- `post-8901fb9b` Boy
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-93526d04` Nasty's Chicken
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-eddeb88d` Mikuna

### match_isolated.brand (11)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### places.missed (10)

- `post-51a97d36` GIG Gastro
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Back and Break
- `post-8901fb9b` Common
- `post-8901fb9b` Papaya
- `post-93526d04` Nastys
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO

### match.brand (7)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-4a742b09` Village House: none ≠ Bantou Village (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ zagros (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)

### parts.amount (6)

- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ 16 money
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 30 money
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —
- `post-babe1142` Peggy Bee's Berlin Ice Cream Week 2021 offering is a one-eu…: 1 money ≠ —
- `post-fc96acff` the set lunch menu is genuinely fantastic value for money: —  ≠ 88 money
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money

### match.branch (6)

- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Yumcha Heroes Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### match_isolated.branch (4)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### change.missed (2)

- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-fc96acff` Facil has quietly gotten better
