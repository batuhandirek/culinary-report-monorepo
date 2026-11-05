# Ingestion eval: a2-haiku

2026-11-05 16:08 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, claimsModel anthropic/claude-haiku-5-5, labeller classifier
Tokens: 6,750,779 (752,283 input tokens from the prompt cache)
Spend: $0.192 (paid calls: classifiers)
Models: review-claims: anthropic/claude-haiku-5-5 (51); claim-labels: typesafe-ai/jev-latest (105); post-claims: anthropic/claude-haiku-5-5 (58); venue-match: openai/gpt-5.4-mini (26)

## Reviews

| Metric | a2-haiku | stored | a2-gpt54 | a2-sonnet | a2-mini |
|---|---|---|---|---|---|
| Claims found (of the reference) | 99% (296/298) | 93% +6 | 99% ±0 | 100% ±0 | 95% +4 |
| Claims that are real (of produced) | 100% (352/353) | 99% +1 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment | 97% (331/341) | 88% +10 | 97% ±0 | 97% ±0 | 95% +2 |
| Aspect, exact | 92% (313/341) | 71% +21 | 91% +1 | 89% +2 | 88% +4 |
| Aspect, right root | 96% (326/341) | 81% +15 | 95% ±0 | 95% +1 | 93% +3 |
| Kind | 97% (332/341) | 67% +31 | 97% ±0 | 97% ±0 | 96% +1 |
| Kind given at all | 100% (341/341) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 74% (252/341) | — | 73% +1 | 74% ±0 | 73% +1 |
| Sentiment, among sure answers | 100% (251/252) | — | 100% ±0 | 100% ±0 | 99% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 50% (170/341) | — | 48% +2 | 50% -1 | 46% +4 |
| Aspect, exact, among sure answers | 98% (167/170) | — | 98% +1 | 97% +2 | 97% +1 |
| Kind: sure answers (p ≥ 0.9, of answered) | 79% (271/341) | — | 78% +2 | 76% +3 | 76% +4 |
| Kind, among sure answers | 98% (266/271) | — | 98% ±0 | 98% ±0 | 99% -1 |
| Changes that are changes | 67% (2/3) | 56% +11 | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | 100% (2/2) | 80% +20 | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 75% (12/16) | 41% +34 | 88% -12 | 100% -25 | 61% +14 |
| Foods named, precision | 93% (117/126) | 32% +60 | 89% +4 | 89% +4 | 91% +2 |
| Foods named, recall | 91% (112/123) | 23% +68 | 91% ±0 | 90% +1 | 94% -3 |

## Posts and articles

| Metric | a2-haiku | stored | a2-gpt54 | a2-sonnet | a2-mini |
|---|---|---|---|---|---|
| Claims found (of the reference) | 88% (535/606) | 56% +33 | 92% -4 | 94% -5 | 81% +7 |
| Claims that are real (of produced) | 90% (840/932) | 95% -5 | 88% +2 | 93% -3 | 89% +1 |
| Sentiment | 93% (667/720) | 86% +7 | 92% ±0 | 94% -2 | 92% +1 |
| Aspect, exact | 81% (580/720) | 63% +17 | 83% -3 | 80% ±0 | 78% +3 |
| Aspect, right root | 88% (633/720) | 78% +10 | 90% -2 | 87% +1 | 86% +2 |
| Kind | 89% (638/720) | 47% +42 | 90% -1 | 89% -1 | 88% ±0 |
| Kind given at all | 100% (720/720) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 63% (450/720) | — | 65% -3 | 66% -3 | 62% +1 |
| Sentiment, among sure answers | 96% (433/450) | — | 96% ±0 | 97% ±0 | 94% +2 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 37% (267/720) | — | 39% -2 | 33% +4 | 38% -1 |
| Aspect, exact, among sure answers | 94% (250/267) | — | 94% ±0 | 96% -2 | 92% +1 |
| Kind: sure answers (p ≥ 0.9, of answered) | 61% (438/720) | — | 60% ±0 | 58% +2 | 60% +1 |
| Kind, among sure answers | 95% (415/438) | — | 96% -1 | 95% ±0 | 93% +2 |
| Changes that are changes | 23% (10/43) | 46% -23 | 41% -17 | 40% -17 | 39% -15 |
| Changes found | 70% (7/10) | 38% +32 | 60% +10 | 80% -10 | 90% -20 |
| Amount | 80% (16/20) | 46% +34 | 43% +37 | 76% +4 | 55% +25 |
| Foods named, precision | 84% (390/465) | 46% +38 | 81% +3 | 80% +4 | 71% +13 |
| Foods named, recall | 83% (346/415) | 39% +44 | 87% -4 | 94% -11 | 85% -2 |
| Subject (place, city, none) | 92% (813/879) | 85% +8 | 93% -1 | 96% -4 | 91% +1 |
| Claim on the right place | 97% (725/748) | 85% +12 | 93% +4 | 88% +9 | 88% +9 |
| Places found | 89% (99/111) | 73% +16 | 90% -1 | 91% -2 | 86% +4 |
| Places that are places | 92% (99/108) | 85% +7 | 88% +3 | 88% +4 | 83% +9 |
| Match: brand (found places) | 91% (90/99) | 92% -1 | 99% -8 | 93% -2 | 94% -3 |
| Match: branch (right brand) | 96% (74/77) | 97% -1 | 96% ±0 | 93% +4 | 96% ±0 |
| Match on the reference's places: brand | 91% (101/111) | — | 93% -2 | 90% +1 | 92% -1 |
| Match on the reference's places: branch | 96% (81/84) | — | 95% +1 | 95% +1 | 95% +1 |
| Promotional flag | 98% (57/58) | 82% +16 | 100% -2 | 100% -2 | 90% +9 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-haiku (train) | a2-haiku (test) | a2-gpt54 (test) | a2-sonnet (test) | a2-mini (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 99% (296/298) | 99% ±0 | 100% ±0 | 95% +4 |
| Claims that are real (of produced) | — | 100% (352/353) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment | — | 97% (331/341) | 97% ±0 | 97% ±0 | 95% +2 |
| Aspect, exact | — | 92% (313/341) | 91% +1 | 89% +2 | 88% +4 |
| Aspect, right root | — | 96% (326/341) | 95% ±0 | 95% +1 | 93% +3 |
| Kind | — | 97% (332/341) | 97% ±0 | 97% ±0 | 96% +1 |
| Kind given at all | — | 100% (341/341) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 74% (252/341) | 73% +1 | 74% ±0 | 73% +1 |
| Sentiment, among sure answers | — | 100% (251/252) | 100% ±0 | 100% ±0 | 99% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 50% (170/341) | 48% +2 | 50% -1 | 46% +4 |
| Aspect, exact, among sure answers | — | 98% (167/170) | 98% +1 | 97% +2 | 97% +1 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 79% (271/341) | 78% +2 | 76% +3 | 76% +4 |
| Kind, among sure answers | — | 98% (266/271) | 98% ±0 | 98% ±0 | 99% -1 |
| Changes that are changes | — | 67% (2/3) | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | — | 75% (12/16) | 88% -12 | 100% -25 | 61% +14 |
| Foods named, precision | — | 93% (117/126) | 89% +4 | 89% +4 | 91% +2 |
| Foods named, recall | — | 91% (112/123) | 91% ±0 | 90% +1 | 94% -3 |

### Posts and articles

| Metric | a2-haiku (train) | a2-haiku (test) | a2-gpt54 (test) | a2-sonnet (test) | a2-mini (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 88% (535/606) | 92% -4 | 94% -5 | 81% +7 |
| Claims that are real (of produced) | — | 90% (840/932) | 88% +2 | 93% -3 | 89% +1 |
| Sentiment | — | 93% (667/720) | 92% ±0 | 94% -2 | 92% +1 |
| Aspect, exact | — | 81% (580/720) | 83% -3 | 80% ±0 | 78% +3 |
| Aspect, right root | — | 88% (633/720) | 90% -2 | 87% +1 | 86% +2 |
| Kind | — | 89% (638/720) | 90% -1 | 89% -1 | 88% ±0 |
| Kind given at all | — | 100% (720/720) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 63% (450/720) | 65% -3 | 66% -3 | 62% +1 |
| Sentiment, among sure answers | — | 96% (433/450) | 96% ±0 | 97% ±0 | 94% +2 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 37% (267/720) | 39% -2 | 33% +4 | 38% -1 |
| Aspect, exact, among sure answers | — | 94% (250/267) | 94% ±0 | 96% -2 | 92% +1 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 61% (438/720) | 60% ±0 | 58% +2 | 60% +1 |
| Kind, among sure answers | — | 95% (415/438) | 96% -1 | 95% ±0 | 93% +2 |
| Changes that are changes | — | 23% (10/43) | 41% -17 | 40% -17 | 39% -15 |
| Changes found | — | 70% (7/10) | 60% +10 | 80% -10 | 90% -20 |
| Amount | — | 80% (16/20) | 43% +37 | 76% +4 | 55% +25 |
| Foods named, precision | — | 84% (390/465) | 81% +3 | 80% +4 | 71% +13 |
| Foods named, recall | — | 83% (346/415) | 87% -4 | 94% -11 | 85% -2 |
| Subject (place, city, none) | — | 92% (813/879) | 93% -1 | 96% -4 | 91% +1 |
| Claim on the right place | — | 97% (725/748) | 93% +4 | 88% +9 | 88% +9 |
| Places found | — | 89% (99/111) | 90% -1 | 91% -2 | 86% +4 |
| Places that are places | — | 92% (99/108) | 88% +3 | 88% +4 | 83% +9 |
| Match: brand (found places) | — | 91% (90/99) | 99% -8 | 93% -2 | 94% -3 |
| Match: branch (right brand) | — | 96% (74/77) | 96% ±0 | 93% +4 | 96% ±0 |
| Match on the reference's places: brand | — | 91% (101/111) | 93% -2 | 90% +1 | 92% -1 |
| Match on the reference's places: branch | — | 96% (81/84) | 95% +1 | 95% +1 | 95% +1 |
| Promotional flag | — | 98% (57/58) | 100% -2 | 100% -2 | 90% +9 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 99% (139/140) | 100% (163/163) | 95% (148/156) | 97% (151/156) | — | — |
| hard | 89% (16/18) | 100% (20/20) | 79% (15/19) | 100% (19/19) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 99% (94/95) | 91% (86/95) | 95% (90/95) | — | — |
| lang:en | 100% (71/71) | 100% (86/86) | 94% (76/81) | 100% (81/81) | — | — |
| lang:other | 99% (95/96) | 100% (113/113) | 91% (101/111) | 98% (109/111) | — | — |
| lang:tr | 98% (43/44) | 100% (59/59) | 93% (50/54) | 94% (51/54) | — | — |
| length:long | 99% (79/80) | 100% (99/99) | 91% (86/95) | 96% (91/95) | — | — |
| length:medium | 99% (193/194) | 100% (229/230) | 91% (202/221) | 97% (215/221) | — | — |
| length:short | 100% (24/24) | 100% (24/24) | 100% (25/25) | 100% (25/25) | — | — |
| no-transcript | 91% (96/106) | 97% (118/122) | 88% (99/112) | 96% (108/112) | 89% (32/36) | 91% (29/32) |
| own | 93% (26/28) | 100% (38/38) | 87% (26/30) | 97% (29/30) | 100% (6/6) | 100% (6/6) |
| places:few | 87% (447/512) | 91% (719/793) | 79% (478/603) | 93% (559/603) | 94% (59/63) | 93% (55/59) |
| places:many | 96% (85/89) | 87% (118/136) | 87% (99/114) | 92% (105/114) | 83% (39/47) | 87% (34/39) |
| places:none | 60% (3/5) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (1/1) | 100% (1/1) |
| platform:blog | 84% (285/338) | 89% (489/552) | 77% (306/397) | 91% (362/397) | 97% (30/31) | 97% (29/30) |
| platform:google | 99% (296/298) | 100% (352/353) | 92% (313/341) | 97% (331/341) | — | — |
| platform:instagram | 95% (63/66) | 96% (74/77) | 85% (62/73) | 99% (72/73) | 88% (14/16) | 86% (12/14) |
| platform:tiktok | 93% (187/202) | 91% (277/303) | 85% (212/250) | 93% (233/250) | 86% (55/64) | 89% (49/55) |
| size:large | 89% (259/292) | 87% (433/500) | 76% (275/360) | 91% (327/360) | 92% (34/37) | 91% (31/34) |
| size:medium | 87% (222/255) | 94% (340/363) | 83% (246/295) | 95% (279/295) | 89% (47/53) | 94% (44/47) |
| size:small | 92% (54/59) | 97% (67/69) | 91% (59/65) | 94% (61/65) | 86% (18/21) | 83% (15/18) |
| stars:1 | 98% (48/49) | 100% (62/62) | 91% (52/57) | 96% (55/57) | — | — |
| stars:2 | 100% (27/27) | 100% (32/32) | 100% (29/29) | 100% (29/29) | — | — |
| stars:3 | 100% (85/85) | 100% (105/105) | 91% (93/102) | 98% (100/102) | — | — |
| stars:4 | 98% (53/54) | 100% (61/61) | 88% (53/60) | 97% (58/60) | — | — |
| stars:5 | 100% (83/83) | 99% (92/93) | 92% (86/93) | 96% (89/93) | — | — |
| transcript | 95% (154/162) | 90% (233/258) | 83% (175/211) | 93% (197/211) | 84% (37/44) | 86% (32/37) |

## Misses

### parts.aspect (168)

- `review-28e4170f` the market hall was really fun to look around: atmosphere ≠ interior
- `review-37016d87` the food was delicious: taste ≠ food
- `review-37016d87` the atmosphere was typical: atmosphere ≠ crowding
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-5582d6b8` had the shoyu and asari: none ≠ food
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-6b4df664` the whole experience left a positive impression: none ≠ vibe
- `review-6b4df664` the staff could be more attentive: attentiveness ≠ friendliness
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-70467fba` the kebab is definitely worth trying: none ≠ food
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: none ≠ location
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-7f69ec8d` it is definitely not worth it: none ≠ queue
- `review-9a341bb6` the food was not good enough to overlook these shortcomings: taste ≠ value_for_money
- `review-b31c1e48` except for one staff member, but everyone has a bad day: friendliness ≠ service
- `review-b31c1e48` a few tiny drawbacks: none ≠ dining_area
- `review-b31c1e48` the floor in the buffet area was slippery in places from gr…: dining_area ≠ accessibility
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ accessibility
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the salad (salatası) was plentiful: portion_size ≠ freshness
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `review-fb1415dc` the cleanliness and service issues are not that bad: none ≠ service
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: menu_variety ≠ taste
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are washed-processed: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: drinks ≠ ingredient_quality
- `post-22c25ac1` Yumcha Heroes' success is owed to the three women who make …: food ≠ ownership
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: atmosphere ≠ none
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: ingredient_quality ≠ seasoning
- `post-22c25ac1` the women are supported by only one man: none ≠ ownership
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: none ≠ food
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: none ≠ location
- `post-22c25ac1` the three women's food truly opens every heart: taste ≠ occasion
- … 128 more in issues.jsonl

### parts.foods (135)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, viande, poulet]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan, salataları]
- `review-0ac47c59` waited in line a little over an hour: [] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan, salataları]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-16bdd5e0` my sauce was wrong: [sauce] ≠ []
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi, halloumi]
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: [gemuse kebaba, wrapa] ≠ [gemuse kebaba, wrapa, kebabów]
- `review-3e075e7e` the whole "muala" thing is ridiculous: [] ≠ [muala]
- `review-52ef0f64` the Vöner Döner was nothing outstanding: [Vöner Döner] ≠ []
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab had plenty of meat and vegetables: [kebab, meat, vegetables] ≠ [meat, vegetables]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-70467fba` the kebab is definitely worth trying: [kebab] ≠ []
- `review-70467fba` the kebab was not extraordinary: [kebab] ≠ []
- `review-70467fba` the kebab was not worth waiting forever for: [kebab] ≠ []
- `review-c83e0a88` the food gave us stomach ache: [] ≠ [döner]
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: [Streetfood] ≠ []
- `post-1b8b0789` Doree 65 is Berlin's hyped steak spot: [Steak] ≠ []
- `post-1b8b0789` the steak meat came with Bratkartoffeln and Gemüse: [steakfleisch, Bratkartoffeln, Gemüse] ≠ [Bratkartoffeln, Gemüse]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ []
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: [coffee] ≠ []
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ [espresso]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ [espresso]
- `post-1e024518` the Masala Dosa is filled with spicy potato: [Masala Dosa, Kartoffel] ≠ [Kartoffel]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` five Dumplings cost only 8.25 euros: [Dumplings] ≠ []
- `post-22c25ac1` ten dumplings cost 16 euros: [Dumplings] ≠ []
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-24601e6d` trying some German food in Berlin was super exciting: [] ≠ [German food]
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: [kebab] ≠ []
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: [kebab] ≠ [tomato]
- `post-4f942afd` the tahini's bitterness is offset by fresh herbs and Za'atar: [tahini, Za’atar] ≠ [fresh herbs, Za’atar]
- `post-4f942afd` the hummus is smoother: [hummus] ≠ [tahini]
- … 95 more in issues.jsonl

### claims.extra (93)

- `review-52ef0f64` Austrians should judge the Ayran's taste
- `post-4a742b09` running a restaurant in your 30s is intense
- `post-4c3e2a10` the juice stays with the kebab
- `post-4c3e2a10` the snack is called the cell
- `post-4c3e2a10` the hard parts are no longer soft
- `post-4c3e2a10` the creator likes their own kebab
- `post-4c3e2a10` the gas burner has just run out
- `post-4c3e2a10` the meat should stay brown and juicy
- `post-4c3e2a10` the creator does it very minimally
- `post-4f942afd` the city has best hummus restaurants
- `post-4f942afd` hummus is better than guacamole
- `post-4f942afd` hummus is not much better than decent mashed potato
- `post-4f942afd` the author neither loves nor hates hummus
- `post-4f942afd` Akkawy serves a hummus-tahini overload
- `post-4f942afd` Akkawy is open
- `post-4f942afd` the author writes blog posts about Akkawy
- `post-4f942afd` Julian claims he has perfected his hummus
- `post-4f942afd` Za’atar is a Middle Eastern herb related to oregano
- `post-4f942afd` the hummus is endlessly smooth
- `post-52881d60` the dog Fluffy wanted to order too
- `post-58a16831` Nyde is worth a visit in the evening too
- `post-58a16831` come to Nyde for the coffee
- `post-58a16831` Nyde's interior is a reason to come
- `post-6c0e92d2` Kroque is toasted
- `post-6c0e92d2` Kroque is homemade
- `post-6c0e92d2` Kroque uses a lot of cheese
- `post-6c0e92d2` the French are known to be fond of an aperitif at midday
- `post-6c0e92d2` Kroque is open to whatever comes next
- `post-8901fb9b` Tobias Beck is one of the most talented German chefs of the new generation
- `post-8901fb9b` the episode has industry people naming their favourite spots in Berlin
- `post-8901fb9b` Claerchens Ballhaus is a controversial pick for best restaurant in Berlin
- `post-8901fb9b` Claerchens Ballhaus is a very old place
- `post-8901fb9b` the Claerchens Ballhaus experience is a 10 out of 10
- `post-8901fb9b` the suits is a meat aspic with pan fried potatoes and remoulade sauce
- `post-8901fb9b` the suits is good stuff
- `post-8901fb9b` Bonanza Coffee is in the backyard in Koenigsberg
- `post-8901fb9b` everything at Romeo's is done perfectly
- `post-8901fb9b` knowing what to order at Ming Dynasty matters
- `post-8901fb9b` Jeff from Stoke is rude to the waiters at Ming Dynasty
- `post-8901fb9b` the tacos are Persian
- … 53 more in issues.jsonl

### parts.kind (91)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-3f2a2713` the venue should offer a vegan burger already: opinion ≠ new_item
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-b31c1e48` the floor in the buffet area was slippery in places from gr…: opinion ≠ fact
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ change
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ change
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-22c25ac1` the authors will take every chance to treat themselves to t…: verdict ≠ opinion
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: opinion ≠ change
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ fact
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` the egg has a nice contrast of yolk and white: opinion ≠ fact
- `post-4f942afd` the meal offered many new flavours: opinion ≠ fact
- `post-4f942afd` the name Akkawy means 'from Acre': fact ≠ opinion
- `post-524765b0` They started the meal with one of the sandwiches: fact ≠ opinion
- `post-524765b0` They recommend the sandwich with mushrooms and truffles: opinion ≠ verdict
- `post-524765b0` The sardines with Greek saffron and the cheese platter are …: opinion ≠ fact
- `post-524765b0` The seats outside are perfect for mild summer evenings: opinion ≠ fact
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: opinion ≠ fact
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: opinion ≠ fact
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle: opinion ≠ change
- `post-59699006` Coffee houses are having a renaissance in Berlin: fact ≠ change
- `post-60ff28c2` unsure whether the Chili sin carne is soy-based: fact ≠ question
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- `post-674e7322` Café Frieda is run by its owners Samina & Ben: fact ≠ verdict
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: fact ≠ verdict
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque: fact ≠ change
- `post-75c11d7c` during the day Nichi Getsu focuses on something much more c…: fact ≠ change
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: fact ≠ opinion
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: fact ≠ opinion
- `post-75c11d7c` the Futomaki is a generously filled, thick sushi roll wrapp…: opinion ≠ fact
- `post-816a40e7` Shawarma then costs 3 Euro on the third opening day: deal ≠ fact
- … 51 more in issues.jsonl

### claims.missed (73)

- `review-0ac47c59` found nothing to praise about the place
- `review-7593dfff` the overall vibe won't appeal to everyone
- `post-1b8b0789` the creators found the owner decent, however controversial he is
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spirit
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous guests
- `post-22c25ac1` 20 dumplings cost 30 euros
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-4a742b09` invitation to make it a date this weekend at Village House
- `post-4f942afd` Akkawy is a Friedrichshain classic
- `post-517e8710` pizza at 60 Seconds to Napoli
- `post-524765b0` The cheese platter comes with Greek honey, various nuts and a homemade mushroom jam
- `post-524765b0` Cheese, cured meats and preserves come from Greece
- `post-524765b0` The dishes are built around what is currently in stock in the shop
- `post-524765b0` The deli sandwiches are at the heart of the menu, with seafood and vegetable meze that ch…
- `post-524765b0` On Sundays there are five meze with tsipouro, a small Greek Sunday tradition
- `post-524765b0` The interior was designed by friend and architect Johann Muehlthaler
- `post-524765b0` The interior is reduced yet homely
- `post-524765b0` Inside it is just as warm and inviting
- `post-524765b0` Kírkē now invites sommeliers and winemakers for guest appearances around Greek wine
- `post-524765b0` Kírkē hosts pop-ups with other Berlin chefs
- `post-524765b0` Best come hungry, order more than planned and let someone else choose the wine
- `post-57ab8313` The Tacos de Birria are juicy, with fresh ingredients, sauce and dips
- `post-57ab8313` Three Tacos de Birria cost 11 euros
- `post-57ab8313` The Quesabirrias with cheese cost 12 euros
- `post-57ab8313` The Gringa de Birria is the authors' favourite
- `post-57ab8313` The Gringa de Birria costs 12.90 euros
- `post-57ab8313` The tender birria meat brings the taste of Mexico
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria Veganos for the meat originals
- `post-57ab8313` The Tacos de Birria Veganos cost 11.50 euros
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan cheese
- `post-57ab8313` The Quesabirria Vegana costs 12 euros
- `post-57ab8313` Every Friday from 20:00 the Margaritas Social Club takes place at Taco & Gringo
- `post-57ab8313` During the Margaritas Social Club all four margaritas on the menu cost only 5 euros
- `post-57ab8313` The margaritas are always made with real tequila such as 1800
- `post-57ab8313` On the last Friday of every month there is an extra special
- `post-57ab8313` Last week's special was the Wasabi-Yuzu-Margarita combining Japan and Mexico
- `post-57ab8313` The Wasabi-Yuzu-Margarita is a wonderful drink you must try
- `post-57ab8313` Other specials such as a DJane or DJ are fun
- `post-57ab8313` Berlin should go to Taco & Gringo and learn
- … 33 more in issues.jsonl

### claims.subject (66)

- `post-22c25ac1` the three women's food truly opens every heart: place ≠ none
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ place
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the owner is very proud of his kebab: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: place ≠ none
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: place ≠ none
- `post-4c3e2a10` the owner fetches onions: place ≠ none
- `post-4c3e2a10` the owner works with his brother, which goes quite well: place ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: place ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: place ≠ none
- `post-4c3e2a10` the customers have remained faithful: place ≠ none
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: city ≠ none
- `post-4f942afd` owner Julian is Palestinian from Acre: place ≠ none
- `post-4f942afd` owner Julian has worked in Acre's best and most prestigious…: place ≠ none
- `post-4f942afd` Akkawy does the shared-plates way of eating brilliantly: place ≠ none
- `post-4f942afd` the author neither loves nor hates hummus: none ≠ place
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-674e7322` Café Frieda is run by its owners Samina & Ben: place ≠ none
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: place ≠ none
- `post-75c11d7c` Nichi Getsu's street, Rotherstraße in Friedrichshain, feels…: place ≠ none
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-8901fb9b` Tobias loves Papaya: place ≠ none
- `post-8901fb9b` at Papaya he eats a classic red curry with duck: place ≠ none
- `post-8901fb9b` Gotcha is the most underrated spot in Berlin: place ≠ none
- `post-8901fb9b` Gotcha is the best place in Kreuzberg: place ≠ none
- `post-8901fb9b` Gotcha does fried pig ears: place ≠ none
- `post-8901fb9b` Gotcha does a paella served as a whole pan: place ≠ none
- `post-8901fb9b` Gotcha is a really, really cool spot: place ≠ none
- `post-8901fb9b` Tobias had Special Sauce just last week: place ≠ none
- `post-909ca5ee` Strolling up Vorbergstraße in Schöneberg feels like being i…: city ≠ place
- … 26 more in issues.jsonl

### parts.sentiment (63)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-7593dfff` the bread roll was average: negative ≠ neutral
- `review-90e99b19` the place might be okay if passing nearby: mixed ≠ negative
- `review-b31c1e48` the floor in the buffet area was slippery in places from gr…: negative ≠ neutral
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: negative ≠ positive
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4c3e2a10` the customers have remained faithful: positive ≠ neutral
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: positive ≠ neutral
- `post-4f942afd` the bitter tahini taste ties all of Akkawy's dishes together: positive ≠ negative
- `post-4f942afd` textures play an important role in Akkawy's cooking: positive ≠ neutral
- `post-4f942afd` the egg has a nice contrast of yolk and white: positive ≠ neutral
- `post-4f942afd` the meal offered many new flavours: positive ≠ neutral
- `post-4f942afd` the name Akkawy means 'from Acre': neutral ≠ positive
- `post-524765b0` They started the meal with one of the sandwiches: neutral ≠ positive
- `post-524765b0` The sardines with Greek saffron and the cheese platter are …: positive ≠ neutral
- `post-524765b0` The seats outside are perfect for mild summer evenings: positive ≠ neutral
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: positive ≠ neutral
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: positive ≠ neutral
- `post-674e7322` Café Frieda is run by its owners Samina & Ben: neutral ≠ positive
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: neutral ≠ positive
- `post-68b0cd44` the dumpling in chili oil had a remarkable price: positive ≠ neutral
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ neutral
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` the Futomaki is a generously filled, thick sushi roll wrapp…: positive ≠ neutral
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-816a40e7` there are not many shawarma and döner shops in this area: neutral ≠ negative
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: positive ≠ neutral
- `post-8901fb9b` Romeo's grilled cheese style sandwich has everything done p…: positive ≠ neutral
- `post-8901fb9b` at Ming Dynasty you can get special dishes if you pre-order…: neutral ≠ negative
- `post-8901fb9b` Tobias had Special Sauce just last week: neutral ≠ positive
- `post-909ca5ee` The white giant beans with Chili Crunch are a recommended s…: positive ≠ neutral
- `post-909ca5ee` The French classic Oeuf Mayo is a recommended starter: positive ≠ neutral
- … 23 more in issues.jsonl

### change.false (34)

- `review-7593dfff` service sped up once the older man showed up
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen open the Manufaktur
- `post-22c25ac1` the street sale offers a look behind the scenes
- `post-4c3e2a10` the tomato becomes liquid when a plate is put in
- `post-4c3e2a10` the hard parts are no longer soft
- `post-58a16831` Pêle-Mêle ends the era of avocado toast
- `post-59699006` coffee houses are having a renaissance in Berlin
- `post-6c0e92d2` Josue Kashala quickly agreed to take over Kroque's bar
- `post-75c11d7c` during the day the focus shifts to the more relaxed Bara Chirashi
- `post-909ca5ee` currently the Cavatelli are served as Pasta alla Norma
- `post-b5e879f0` waiting in line is the new black on Bergmannstraße
- `post-b5e879f0` a gradual change set in
- `post-b5e879f0` commercial rents rose
- `post-b5e879f0` competitive pressure increasingly crept into relaxed neighbourhood moments
- `post-b5e879f0` India is closed now that autumn has come
- `post-b5e879f0` the small table with the always-burning candle in the window niche is no longer occupied
- `post-b5e879f0` the tiles with Indian deity depictions hang in the dark
- `post-b5e879f0` the restaurant is closed this autumn
- `post-b5e879f0` the candle table in the window niche is no longer occupied
- `post-b5e879f0` the restaurant closed
- `post-b5e879f0` the restaurant has closed
- `post-babe1142` the neighborhood will soon rise again
- `post-babe1142` the spiciness has been mastered since the last visit
- `post-babe1142` buffalo ice cream has been growing in popularity in recent years
- `post-babe1142` buffalo ice cream has been increasing in popularity in recent years
- `post-c4e7c0a9` a beautiful blue wall colour appeared under the old wallpaper in the left area
- `post-c4e7c0a9` the seasonal dishes on the menu change regularly
- `post-db280ef6` overpriced lunch is over
- `post-dfe2d586` bubble tea has had several lives
- `post-dfe2d586` bubble tea was a hype, then seemed gone, and is now everywhere
- `post-e2a421e9` the Butter Lindner logo was changed to gold and blue
- `post-fc96acff` the cast has changed little
- `post-fc96acff` Jonas Zörner is now chef de cuisine at Lorenz Adlon Esszimmer
- `post-fc96acff` Wenzel Pankratz is now running Forsthaus Strelitz

### claims.place (23)

- `post-51a97d36` GIG Gastro is awesome: GIG Gastro ≠ GIG
- `post-51a97d36` after the meal you always get a Tiramisu: GIG Gastro ≠ GIG
- `post-51a97d36` the Tiramisu goes down comfortably: GIG Gastro ≠ GIG
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-58a16831` Bäckerei Johann, a few streets away, supplies Nyde's Croiss…: Bäckerei Johann ≠ Nyde
- `post-674e7322` Jones ice cream is the best cheat day treat: Jones ice cream ≠ Yeni Adana
- `post-68b0cd44` besides Charlottenburg, Panda Meister also has a kiosk else…: Panda Meister ≠ Panda Meister kioski Osborne
- `post-8901fb9b` Common from Max has the best pizza: Common ≠ Sophie
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Tulus Lotrek
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Barra
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: Johann Bäckerei ≠ Barlevain
- `post-9f93c25b` Borchardt is number 6 in his top 10: Borchardt ≠ Bohrschatz
- `post-9f93c25b` Borchardt has one of the most delicious Schnitzel in all of…: Borchardt ≠ Bohrschatz
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants: Mine ≠ Main
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants: Mine ≠ Main
- `post-9f93c25b` Mine is in a project they built back then: Mine ≠ Main
- `post-9f93c25b` Mine is really top: Mine ≠ Main
- `post-fc96acff` Sarah Hallmann trained at Facil before opening Hallmann & K…: Hallmann & Klee ≠ Facil
- `post-fc96acff` Jonas Zörner, who came through Facil's kitchen, is now chef…: Lorenz Adlon Esszimmer ≠ Facil
- `post-fc96acff` Maximilian Kindel of Birds in the Kitchen came through Faci…: Birds in the Kitchen ≠ Facil
- `post-fc96acff` Ivano Pirolo of Cielo came through Facil's kitchen: Cielo ≠ Facil
- `post-fc96acff` Wenzel Pankratz, who came through Facil's kitchen, now runs…: Forsthaus Strelitz ≠ Facil

### places.missed (12)

- `post-51a97d36` GIG Gastro
- `post-59699006` Barlevain
- `post-674e7322` Café Frieda
- `post-674e7322` Mrs. Robinsons
- `post-8901fb9b` Papaya
- `post-8901fb9b` Gotcha
- `post-8901fb9b` Special Sauce
- `post-93526d04` Manches
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO

### match_isolated.brand (10)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.brand (9)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-4a742b09` Village House: none ≠ Bantou Village (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-93526d04` Nastys: Nastys - TRY NOT TO COME AGAIN. ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### places.extra (9)

- `post-51a97d36` GIG
- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-57ab8313` The Coral
- `post-68b0cd44` Panda Meister kioski Osborne
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main

### parts.amount (8)

- `review-0ac47c59` the line didn't move: —  ≠ 60 minutes
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: 60 minutes ≠ —
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ 16 money
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 30 money
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —

### change.missed (3)

- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold

### match_isolated.branch (3)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### match.branch (3)

- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte
