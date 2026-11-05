# Ingestion eval: a2-gpt54

2026-11-05 16:07 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, claimsModel openai/gpt-5.4, labeller classifier
Tokens: 7,001,456 (315,264 input tokens from the prompt cache)
Spend: $0.225 (paid calls: classifiers)
Models: review-claims: openai/gpt-5.4 (51); claim-labels: typesafe-ai/jev-latest (108); post-claims: openai/gpt-5.4 (58); venue-match: openai/gpt-5.4-mini (27)

## Reviews

| Metric | a2-gpt54 | stored | a2-sonnet | a2-mini | labels-jev-k8 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 99% (296/298) | 93% +6 | 100% ±0 | 95% +4 | — |
| Claims that are real (of produced) | 100% (385/385) | 99% +1 | 100% ±0 | 100% ±0 | — |
| Sentiment | 97% (332/343) | 88% +9 | 97% ±0 | 95% +2 | 98% -1 |
| Aspect, exact | 91% (312/343) | 71% +20 | 89% +2 | 88% +3 | 90% +1 |
| Aspect, right root | 95% (327/343) | 81% +15 | 95% +1 | 93% +2 | 95% ±0 |
| Kind | 97% (334/343) | 67% +31 | 97% ±0 | 96% +1 | 98% ±0 |
| Kind given at all | 100% (343/343) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 73% (251/343) | — | 74% -1 | 73% ±0 | 74% -1 |
| Sentiment, among sure answers | 100% (251/251) | — | 100% ±0 | 99% +1 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 48% (163/343) | — | 50% -3 | 46% +2 | 51% -3 |
| Aspect, exact, among sure answers | 98% (159/163) | — | 97% +1 | 97% ±0 | 98% -1 |
| Kind: sure answers (p ≥ 0.9, of answered) | 78% (266/343) | — | 76% +1 | 76% +2 | 74% +4 |
| Kind, among sure answers | 98% (262/266) | — | 98% ±0 | 99% -1 | 99% -1 |
| Changes that are changes | 67% (2/3) | 56% +11 | 67% ±0 | 67% ±0 | 72% -6 |
| Changes found | 100% (2/2) | 80% +20 | 100% ±0 | 100% ±0 | 81% +19 |
| Amount | 88% (14/16) | 41% +46 | 100% -12 | 61% +26 | 73% +15 |
| Foods named, precision | 89% (133/149) | 32% +57 | 89% +1 | 91% -2 | — |
| Foods named, recall | 91% (114/125) | 23% +68 | 90% +1 | 94% -3 | — |

## Posts and articles

| Metric | a2-gpt54 | stored | a2-sonnet | a2-mini | labels-jev-k8 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 92% (560/606) | 56% +37 | 94% -1 | 81% +11 | — |
| Claims that are real (of produced) | 88% (972/1103) | 95% -7 | 93% -5 | 89% -1 | — |
| Sentiment | 92% (679/736) | 86% +7 | 94% -2 | 92% +1 | 97% -5 |
| Aspect, exact | 83% (612/736) | 63% +20 | 80% +3 | 78% +5 | 82% +1 |
| Aspect, right root | 90% (659/736) | 78% +12 | 87% +2 | 86% +3 | 91% -1 |
| Kind | 90% (662/736) | 47% +43 | 89% ±0 | 88% +2 | 94% -4 |
| Kind given at all | 100% (736/736) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 65% (479/736) | — | 66% -1 | 62% +4 | 67% -2 |
| Sentiment, among sure answers | 96% (460/479) | — | 97% -1 | 94% +2 | 100% -4 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 39% (284/736) | — | 33% +6 | 38% ±0 | 41% -3 |
| Aspect, exact, among sure answers | 94% (266/284) | — | 96% -2 | 92% +1 | 94% -1 |
| Kind: sure answers (p ≥ 0.9, of answered) | 60% (445/736) | — | 58% +2 | 60% ±0 | 61% ±0 |
| Kind, among sure answers | 96% (425/445) | — | 95% +1 | 93% +3 | 98% -3 |
| Changes that are changes | 41% (13/32) | 46% -6 | 40% +1 | 39% +2 | 49% -8 |
| Changes found | 60% (6/10) | 38% +22 | 80% -20 | 90% -30 | 97% -37 |
| Amount | 43% (20/46) | 46% -3 | 76% -33 | 55% -12 | 86% -42 |
| Foods named, precision | 81% (501/620) | 46% +35 | 80% +1 | 71% +9 | — |
| Foods named, recall | 87% (383/440) | 39% +48 | 94% -7 | 85% +2 | — |
| Subject (place, city, none) | 93% (935/1003) | 85% +8 | 96% -3 | 91% +2 | — |
| Claim on the right place | 93% (795/856) | 85% +8 | 88% +5 | 88% +5 | — |
| Places found | 90% (100/111) | 73% +17 | 91% -1 | 86% +5 | — |
| Places that are places | 88% (100/113) | 85% +3 | 88% +1 | 83% +6 | — |
| Match: brand (found places) | 99% (99/100) | 92% +7 | 93% +6 | 94% +5 | — |
| Match: branch (right brand) | 96% (82/85) | 97% -1 | 93% +4 | 96% +1 | — |
| Match on the reference's places: brand | 93% (103/111) | — | 90% +3 | 92% +1 | — |
| Match on the reference's places: branch | 95% (81/85) | — | 95% ±0 | 95% ±0 | — |
| Promotional flag | 100% (58/58) | 82% +18 | 100% ±0 | 90% +10 | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-gpt54 (train) | a2-gpt54 (test) | a2-sonnet (test) | a2-mini (test) | labels-jev-k8 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 99% (296/298) | 100% ±0 | 95% +4 | — |
| Claims that are real (of produced) | — | 100% (385/385) | 100% ±0 | 100% ±0 | — |
| Sentiment | — | 97% (332/343) | 97% ±0 | 95% +2 | 98% -1 |
| Aspect, exact | — | 91% (312/343) | 89% +2 | 88% +3 | 91% ±0 |
| Aspect, right root | — | 95% (327/343) | 95% +1 | 93% +2 | 95% ±0 |
| Kind | — | 97% (334/343) | 97% ±0 | 96% +1 | 98% -1 |
| Kind given at all | — | 100% (343/343) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 73% (251/343) | 74% -1 | 73% ±0 | 72% +2 |
| Sentiment, among sure answers | — | 100% (251/251) | 100% ±0 | 99% +1 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 48% (163/343) | 50% -3 | 46% +2 | 52% -5 |
| Aspect, exact, among sure answers | — | 98% (159/163) | 97% +1 | 97% ±0 | 98% -1 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 78% (266/343) | 76% +1 | 76% +2 | 78% -1 |
| Kind, among sure answers | — | 98% (262/266) | 98% ±0 | 99% -1 | 99% ±0 |
| Changes that are changes | — | 67% (2/3) | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | — | 88% (14/16) | 100% -12 | 61% +26 | 64% +23 |
| Foods named, precision | — | 89% (133/149) | 89% +1 | 91% -2 | — |
| Foods named, recall | — | 91% (114/125) | 90% +1 | 94% -3 | — |

### Posts and articles

| Metric | a2-gpt54 (train) | a2-gpt54 (test) | a2-sonnet (test) | a2-mini (test) | labels-jev-k8 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 92% (560/606) | 94% -1 | 81% +11 | — |
| Claims that are real (of produced) | — | 88% (972/1103) | 93% -5 | 89% -1 | — |
| Sentiment | — | 92% (679/736) | 94% -2 | 92% +1 | 97% -5 |
| Aspect, exact | — | 83% (612/736) | 80% +3 | 78% +5 | 81% +2 |
| Aspect, right root | — | 90% (659/736) | 87% +2 | 86% +3 | 90% ±0 |
| Kind | — | 90% (662/736) | 89% ±0 | 88% +2 | 94% -4 |
| Kind given at all | — | 100% (736/736) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 65% (479/736) | 66% -1 | 62% +4 | 65% ±0 |
| Sentiment, among sure answers | — | 96% (460/479) | 97% -1 | 94% +2 | 100% -4 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 39% (284/736) | 33% +6 | 38% ±0 | 37% +1 |
| Aspect, exact, among sure answers | — | 94% (266/284) | 96% -2 | 92% +1 | 94% ±0 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 60% (445/736) | 58% +2 | 60% ±0 | 60% ±0 |
| Kind, among sure answers | — | 96% (425/445) | 95% +1 | 93% +3 | 97% -2 |
| Changes that are changes | — | 41% (13/32) | 40% +1 | 39% +2 | 48% -8 |
| Changes found | — | 60% (6/10) | 80% -20 | 90% -30 | 100% -40 |
| Amount | — | 43% (20/46) | 76% -33 | 55% -12 | 82% -39 |
| Foods named, precision | — | 81% (501/620) | 80% +1 | 71% +9 | — |
| Foods named, recall | — | 87% (383/440) | 94% -7 | 85% +2 | — |
| Subject (place, city, none) | — | 93% (935/1003) | 96% -3 | 91% +2 | — |
| Claim on the right place | — | 93% (795/856) | 88% +5 | 88% +5 | — |
| Places found | — | 90% (100/111) | 91% -1 | 86% +5 | — |
| Places that are places | — | 88% (100/113) | 88% +1 | 83% +6 | — |
| Match: brand (found places) | — | 99% (99/100) | 93% +6 | 94% +5 | — |
| Match: branch (right brand) | — | 96% (82/85) | 93% +4 | 96% +1 | — |
| Match on the reference's places: brand | — | 93% (103/111) | 90% +3 | 92% +1 | — |
| Match on the reference's places: branch | — | 95% (81/85) | 95% ±0 | 95% ±0 | — |
| Promotional flag | — | 100% (58/58) | 100% ±0 | 90% +10 | — |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 99% (138/140) | 100% (183/183) | 91% (142/156) | 96% (150/156) | — | — |
| hard | 83% (15/18) | 91% (20/22) | 94% (17/18) | 100% (18/18) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 100% (111/111) | 91% (87/96) | 95% (91/96) | — | — |
| lang:en | 99% (70/71) | 100% (85/85) | 93% (74/80) | 100% (80/80) | — | — |
| lang:other | 100% (96/96) | 100% (126/126) | 88% (100/113) | 97% (110/113) | — | — |
| lang:tr | 98% (43/44) | 100% (63/63) | 94% (51/54) | 94% (51/54) | — | — |
| length:long | 100% (80/80) | 100% (113/113) | 95% (92/97) | 96% (93/97) | — | — |
| length:medium | 99% (192/194) | 100% (248/248) | 90% (198/221) | 97% (214/221) | — | — |
| length:short | 100% (24/24) | 100% (24/24) | 88% (22/25) | 100% (25/25) | — | — |
| no-transcript | 89% (94/106) | 94% (148/158) | 88% (100/114) | 96% (110/114) | 89% (32/36) | 97% (31/32) |
| own | 86% (24/28) | 93% (39/42) | 89% (24/27) | 96% (26/27) | 100% (6/6) | 100% (6/6) |
| places:few | 92% (470/512) | 90% (852/946) | 83% (510/617) | 92% (570/617) | 90% (57/63) | 98% (56/57) |
| places:many | 97% (86/89) | 76% (116/153) | 85% (98/115) | 91% (105/115) | 89% (42/47) | 100% (42/42) |
| places:none | 80% (4/5) | 100% (4/4) | 100% (4/4) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| platform:blog | 95% (320/338) | 89% (599/674) | 82% (346/422) | 91% (385/422) | 97% (30/31) | 100% (30/30) |
| platform:google | 99% (296/298) | 100% (385/385) | 91% (312/343) | 97% (332/343) | — | — |
| platform:instagram | 94% (62/66) | 97% (98/101) | 87% (65/75) | 97% (73/75) | 81% (13/16) | 92% (12/13) |
| platform:tiktok | 88% (178/202) | 84% (275/328) | 84% (201/239) | 92% (221/239) | 89% (57/64) | 100% (57/57) |
| size:large | 97% (282/292) | 84% (498/595) | 84% (308/368) | 91% (336/368) | 92% (34/37) | 100% (34/34) |
| size:medium | 88% (225/255) | 94% (400/424) | 81% (245/302) | 93% (282/302) | 91% (48/53) | 100% (48/48) |
| size:small | 90% (53/59) | 88% (74/84) | 89% (59/66) | 92% (61/66) | 86% (18/21) | 94% (17/18) |
| stars:1 | 100% (49/49) | 100% (67/67) | 95% (55/58) | 97% (56/58) | — | — |
| stars:2 | 96% (26/27) | 100% (32/32) | 96% (27/28) | 96% (27/28) | — | — |
| stars:3 | 100% (85/85) | 100% (116/116) | 90% (93/103) | 96% (99/103) | — | — |
| stars:4 | 100% (54/54) | 100% (64/64) | 90% (55/61) | 98% (60/61) | — | — |
| stars:5 | 99% (82/83) | 100% (106/106) | 88% (82/93) | 97% (90/93) | — | — |
| transcript | 90% (146/162) | 83% (225/271) | 83% (166/200) | 92% (184/200) | 86% (38/44) | 100% (38/38) |

## Misses

### parts.foods (166)

- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [poulet]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri, türk döneri]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan, marul, marul]
- `review-0ac47c59` orders deliberately not taken from the person at the front …: [] ≠ [dönerin]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri, türk döneri]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [vegane Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab had plenty of meat and vegetables: [kebab, meat, vegetables] ≠ [meat, vegetables]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-6b4df664` the Königsberger Klopse were really successful in taste: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-6b4df664` the Königsberger Klopse were nicely presented: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-71868223` had doubts about going to Gemüse Kebab: [] ≠ [Gemüse kebab]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-bf2322b7` thank you for the great food: [] ≠ [Essen]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ []
- `review-dcd4db39` the meal was ready just 5-10 minutes after ordering: [] ≠ [Menü]
- `review-ec04d472` the reviewer wishes they could un-eat the tabla de entrantes: [tabla de entrantes] ≠ []
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: [Bratkartoffeln, Gemüse] ≠ [steakfleisch]
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: [Bratkartoffeln, Gemüse] ≠ [steakfleisch]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa, Steinobst, Vanille, Kakao]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica, Arabica]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso, El Líbano]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [Lieblingsespresso, El Líbano]
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: [coffee] ≠ [Kaffee]
- `post-1c78d4ed` The El Líbano beans are washed-processed: [beans] ≠ [Bohnen]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [Steinobst, Vanille, Kakao]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: [beans] ≠ [Bohnen]
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ [Bohnen]
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ [Bohnen]
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: [] ≠ [El Líbano]
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: [] ≠ [El Líbano]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [Espresso]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [Espresso]
- … 126 more in issues.jsonl

### parts.aspect (155)

- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-28e4170f` the market hall was really fun to look around: atmosphere ≠ none
- `review-37016d87` the food was delicious: taste ≠ food
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-52ef0f64` the Vöner Döner was quite good: taste ≠ food
- `review-5582d6b8` had the shoyu and asari: none ≠ food
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-5582d6b8` had iced matcha latte: none ≠ drinks
- `review-6217ec70` the kebab had a generous amount of sauce: portion_size ≠ seasoning
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` Markthalle Neun is a nice place: none ≠ vibe
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-866767df` the meal was peaceful: noise ≠ taste
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` the live cooking with the island was beautifully done: presentation ≠ cooking
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ accessibility
- `review-bf2322b7` we were treated to the meal by the owner: on_the_house ≠ ownership
- `review-bf2322b7` the Salat was fresh: freshness ≠ taste
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ food
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ location
- `review-f1e62446` the reviewer expected something better from the place: none ≠ food
- `review-f1e62446` the reviewer doesn't see the "wow" factor of the place: none ≠ food
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: drink_quality ≠ none
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are washed-processed: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano espresso is Arabica: drinks ≠ ingredient_quality
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: none ≠ opening_hours
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: atmosphere ≠ none
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: ingredient_quality ≠ seasoning
- … 115 more in issues.jsonl

### claims.extra (131)

- `post-22c25ac1` the Gemüse-Dumplings are convincing
- `post-4a742b09` running a restaurant in your 30s hits different
- `post-4a742b09` some days at Village House test your patience
- `post-4c3e2a10` the kebab should remain brown
- `post-4c3e2a10` the speaker wants to serve customers well
- `post-4c3e2a10` the hard part would no longer stay firm
- `post-4c3e2a10` the example item was already hard
- `post-4f942afd` Akkawy is one of the best hummus restaurants in the city
- `post-4f942afd` Akkawy was introduced to the writer early this year
- `post-4f942afd` Akkawy serves hummus
- `post-4f942afd` Akkawy's owner is Julian
- `post-4f942afd` Akkawy serves dishes where Julian gets to experiment
- `post-4f942afd` the mushroom-hummus dish is the best example of Akkawy's experimentation
- `post-4f942afd` Akkawy served Zahra
- `post-4f942afd` Akkawy served Shakshuka
- `post-4f942afd` the Fatush salad was classic
- `post-4f942afd` Akkawy served a refreshingly spicy chilli dipping sauce
- `post-4f942afd` the Lebanese tahini is something Julian prizes over all those tahinis available in Palest…
- `post-4f942afd` Za’atar is a middle-Eastern herb related to oregano
- `post-4f942afd` The visit to Akkawy let the writer share dishes they would not normally order
- `post-524765b0` Kírkē Deli is on Böckhstraße
- `post-524765b0` Kírkē Deli is a deli
- `post-524765b0` Kírkē Deli serves sardines with Greek saffron
- `post-524765b0` Kírkē Deli serves a cheese plate
- `post-524765b0` the place is shared in the Graefekiez
- `post-57ab8313` Taco & Gringo is launching two new offerings
- `post-58a16831` Nyde is a café
- `post-58a16831` the dream of Nyde as a café was at the same time a last carpentry project for now
- `post-58a16831` Nyde is also worth visiting in the evening
- `post-60ff28c2` the Cherry Matcha with Kokosmilch was very tasty
- `post-63b83025` Restaurant Athen serves Grillteller
- `post-650ede57` allPasta serves pasta
- `post-68b0cd44` the creator was thanked for a feast by Panda Meister Dumpling
- `post-6c0e92d2` The Kroque experience is almost interactive
- `post-6c0e92d2` Kroque is open to everything next
- `post-75c11d7c` Bara Chirashi is "scattered sushi"
- `post-8901fb9b` Pauly Saal is the best restaurant in Berlin
- `post-8901fb9b` Pauly Saal is in Charlottenburg
- `post-8901fb9b` Pauly Saal is a very old place
- `post-8901fb9b` Pauly Saal is a 10 out of 10 experience
- … 91 more in issues.jsonl

### parts.kind (83)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-58540992` the reviewer does not want to be told off because someone e…: opinion ≠ fact
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7593dfff` the place is worth it if you have time to wait in line: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` the Manufaktur puts a deserved spotlight on the women of th…: opinion ≠ change
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ change
- `post-22c25ac1` the Manufaktur has a daily changing offering: fact ≠ opinion
- `post-22c25ac1` 20 dumplings cost 30 euros: fact ≠ opinion
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: opinion ≠ fact
- `post-24601e6d` Ice Bar Berlin is 10/10: verdict ≠ opinion
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: opinion ≠ fact
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-4f942afd` Akkawy is a Friedrichshain classic: verdict ≠ fact
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ fact
- `post-4f942afd` Julian's hummus recipe is fixed and unchangeable: fact ≠ opinion
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` they ordered hummus with a sweet aubergine puree: fact ≠ opinion
- `post-4f942afd` they ordered the classic Fatush salad: fact ≠ opinion
- `post-4f942afd` the fried flatbread has a crisp bite: opinion ≠ fact
- `post-524765b0` Kírkē is run by Tenia Dimakopoulou and Jannis Avramidis, tw…: fact ≠ opinion
- `post-524765b0` They started the meal with one of the sandwiches: fact ≠ verdict
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: opinion ≠ verdict
- `post-57ab8313` On the last Friday of every month there is an extra special: event ≠ fact
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: fact ≠ opinion
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: opinion ≠ fact
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ deal
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- `post-63b83025` a portion of creamy Zaziki: opinion ≠ fact
- `post-674e7322` Jones ice cream is the best cheat day treat: verdict ≠ opinion
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` drinks get their due at Kroque: opinion ≠ fact
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: fact ≠ opinion
- … 43 more in issues.jsonl

### parts.sentiment (68)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-13f72d12` doesn't understand the hype about this place: negative ≠ positive
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-58540992` the reviewer does not want to be told off because someone e…: negative ≠ neutral
- `review-90e99b19` the atmosphere is ordinary: negative ≠ neutral
- `review-90e99b19` the place might be okay if passing nearby: mixed ≠ negative
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-22c25ac1` the Manufaktur puts a deserved spotlight on the women of th…: positive ≠ neutral
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: positive ≠ neutral
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: negative ≠ positive
- `post-22c25ac1` 20 dumplings cost 30 euros: neutral ≠ positive
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: positive ≠ neutral
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: positive ≠ neutral
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4c3e2a10` it is very warm inside the stand: neutral ≠ positive
- `post-4f942afd` Akkawy is a Friedrichshain classic: positive ≠ neutral
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: mixed ≠ positive
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: positive ≠ neutral
- `post-4f942afd` they ordered hummus with a sweet aubergine puree: neutral ≠ positive
- `post-4f942afd` they ordered the classic Fatush salad: neutral ≠ positive
- `post-4f942afd` the fried flatbread has a crisp bite: positive ≠ neutral
- `post-524765b0` Kírkē is run by Tenia Dimakopoulou and Jannis Avramidis, tw…: neutral ≠ positive
- `post-524765b0` They started the meal with one of the sandwiches: neutral ≠ positive
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: neutral ≠ positive
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: positive ≠ neutral
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-63b83025` a portion of creamy Zaziki: positive ≠ neutral
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ neutral
- `post-6c0e92d2` drinks get their due at Kroque: positive ≠ neutral
- `post-73286ffe` the Heitlinger Brasserie promises special evenings in a new…: positive ≠ neutral
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: positive ≠ neutral
- `post-8901fb9b` Romeo's has the best sandwich: positive ≠ neutral
- … 28 more in issues.jsonl

### claims.subject (68)

- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ none
- `post-4c3e2a10` it is very warm inside the stand: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: place ≠ none
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: place ≠ none
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: place ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: place ≠ none
- `post-4c3e2a10` the customers have remained faithful: place ≠ none
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: city ≠ place
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-57ab8313` El Maestro de la Birria and the team put great effort into …: place ≠ none
- `post-57ab8313` Berlin should go to Taco & Gringo and learn: place ≠ city
- `post-75c11d7c` the sushi rice is seasoned with Akazu, the red rice vinegar…: place ≠ none
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-909ca5ee` By dessert at the latest, the trip to Barlevain in Schönebe…: place ≠ none
- `post-93526d04` Sagros Gemüse Kebab is said to be the best Döner in Berlin: place ≠ city
- … 28 more in issues.jsonl

### claims.place (61)

- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-57ab8313` The margaritas were developed by Enrico Römer from The Coral: Taco & Gringo ≠ The Coral
- `post-58a16831` Bäckerei Johann, a few streets away, supplies Nyde's Croiss…: Bäckerei Johann ≠ Nyde
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves Espresso uncomplicatedly through the wind…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's window is open at least over the summer: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz costs 5 euros: Café Amano ≠ Hotel Amano
- `post-59699006` At Café Amano one can also sit relaxed in the hotel foyer a…: Café Amano ≠ Hotel Amano
- `post-59699006` At Café Amano one can also sit relaxed in the hotel foyer a…: Café Amano ≠ Hotel Amano
- `post-816a40e7` the restaurant is a new opening in Berlin: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` it is a Syrian-Kurdish restaurant in Charlottenburg: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant is at Wilmersdorfer Straße 104: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant serves Syrian-style food: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant has lots of delicious things: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant serves Syrian-style food: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant also has krüde: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the Fladenbrot is homemade: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` for the opening, Shawarma costs 1 Euro on Friday: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` Shawarma costs 2 Euro on the second opening day: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` 50 percent discount on everything for 3 days: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant opens at 13:00 on Friday: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` besides Shawarma and Döner they serve Crispy brostet Chicke…: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` besides Shawarma and Döner they serve Crispy brostet Chicke…: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` besides Shawarma and Döner they serve Crispy brostet Chicke…: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` besides Shawarma and Döner they serve Crispy brostet Chicke…: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` there is simply everything, including Salat: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` everything is healthy, nice and made with love: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the Schawarma and Dönerbrot bread is baked in-house: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-8901fb9b` Common from Max has the best pizza: Common ≠ Sofi
- `post-8901fb9b` the pizza at Common is amazing: Common ≠ Gazzo
- `post-8901fb9b` Max does a hell of a job with the baking at Common: Common ≠ Gazzo
- `post-8901fb9b` Gotcha is the most underrated spot in Berlin: Gotcha ≠ Gatza
- `post-8901fb9b` Gotcha is the best place in Kreuzberg: Gotcha ≠ Gatza
- `post-8901fb9b` Gotcha does fried pig ears: Gotcha ≠ Gatza
- `post-8901fb9b` Gotcha does a paella served as a whole pan: Gotcha ≠ Gatza
- … 21 more in issues.jsonl

### claims.missed (48)

- `review-070860ca` the reviewer is not happy
- `review-eacefe43` came late at night
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-1b8b0789` the creators were warmly received at Doree 65
- `post-22c25ac1` the new owners gave the three women a share of the profits
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great enjoyment potential
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-4a742b09` invitation to make it a date this weekend at Village House
- `post-4c3e2a10` the owner is very proud of his kebab
- `post-4c3e2a10` the owner works with his brother, which goes quite well
- `post-524765b0` They sat outside in the last rays of sun
- `post-524765b0` They recommend the sandwich with mushrooms and truffles
- `post-58a16831` you should come to Pêle-Mêle very hungry
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle
- `post-59699006` tipBerlin is enthusiastic about Barlevain
- `post-60ff28c2` there is something for everyone at Sandos
- `post-60ff28c2` they ordered the Cherry Matcha with Kokosmilch and the Chili sin carne
- `post-650ede57` question whether oil belongs in pasta water
- `post-674e7322` Café Frieda is run by its owners Samina & Ben
- `post-674e7322` Café Frieda has been a BFS favourite since its opening
- `post-68b0cd44` Panda Meister is budget friendly
- `post-68b0cd44` Panda Meister is veggie friendly
- `post-68b0cd44` the bian bian noodles cost only 8.90
- `post-6c0e92d2` Kroque is run by Lukas Rozsaffy
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-75c11d7c` Nichi Getsu's concept has a clever sustainability story
- `post-75c11d7c` bring your sushi-loving friends to Nichi Getsu
- `post-816a40e7` Döner and Schawarma for 1€ on 2.10.2026
- `post-816a40e7` the restaurant can't get any better
- `post-816a40e7` there are not many shawarma and döner shops in this area
- `post-816a40e7` Shawarma then costs 3 Euro on the third opening day
- `post-93526d04` the author has had much better breakfasts than at Kaffee Peri
- `post-996efecb` the café is on the ground floor of the building right next to the author's hotel
- `post-996efecb` Bonanza's co-founder is Korean
- `post-a61ba144` asks which hyped food spots in Berlin people can recommend
- `post-b2993d78` Mani in Pasta is perfect for a tasty snack in between
- `post-b41bb2f8` Buffet Sunday is already looking like a full house
- `post-b41bb2f8` The buffet is on Sunday, March 22 in three sessions: 1:30pm–3:00pm, 3:30pm–5:00pm and 5:3…
- `post-b5e879f0` Virender Aurora opened Restaurant India in early summer 1995
- … 8 more in issues.jsonl

### parts.amount (28)

- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-7593dfff` the place is worth it if you have time to wait in line: —  ≠ 60 minutes
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ 16 money
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 30 money
- `post-22c25ac1` 20 dumplings cost 30 euros: 30 money ≠ —
- `post-3d9147ff` Schüsseldienst does bowls a little differently: —  ≠ 3 money
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: —  ≠ 3 money
- `post-3d9147ff` Fatoush does bowls a little differently: —  ≠ 3 money
- `post-4f942afd` Akkawy is a Friedrichshain classic: —  ≠ 2026 money
- `post-524765b0` On Sundays there are five meze with tsipouro, a small Greek…: —  ≠ 5 money
- `post-68b0cd44` the creator had spicy bian bian hand pulled noodles: —  ≠ 8.9 money
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 2 minutes
- `post-93526d04` the unnamed baklava shop has 4.8 stars: —  ≠ 4.8 money
- `post-9f93c25b` Club Kitchen is number 10 in his top 10 Berlin restaurants: —  ≠ 10 money
- `post-9f93c25b` Borchardt is number 6 in his top 10: —  ≠ 10 money
- `post-9f93c25b` they are going to Borchardt today with the Circle: —  ≠ 10 money
- `post-9f93c25b` Grill Royal is number 4 in his top 10: —  ≠ 10 money
- `post-9f93c25b` China Club is number 3 in his top 10: —  ≠ 10 money
- `post-b5e879f0` Restaurant India has closed after 31 years: —  ≠ 31 minutes
- `post-babe1142` Peggy Bee is still operating in 2026: —  ≠ 2026 money
- `post-babe1142` lesser gelaterias in Berlin get fifty-person queues: —  ≠ 50 minutes
- `post-d90ac864` the food was rated 10 out of 10: —  ≠ 10 money
- `post-e2a421e9` After about 20 years Lindner is returning to its old name B…: —  ≠ 20 minutes
- `post-fc96acff` of Berlin's 19 Michelin-starred restaurants only one opens …: —  ≠ 19 money
- `post-fc96acff` Joachim Gerner came to Facil in 2006 as sous-chef and has b…: —  ≠ 2006 money
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money
- `post-fc96acff` Facil has not lost its glamour at 25: —  ≠ 25 minutes

### change.false (20)

- `review-7593dfff` everything went faster once the older gentleman from the service appeared
- `post-22c25ac1` Yumcha Heroes Manufaktur now offers street sales
- `post-4c3e2a10` the hard part would no longer stay firm
- `post-524765b0` the Vorias & Helios Orange Assyrtiko later became a whole bottle at Kírkē Deli
- `post-59699006` Hotel Amano is opening its green window now
- `post-60ff28c2` Sandos is open Wednesday to Sunday
- `post-935c2fd2` turnover in the gastronomy sector in Germany has fallen by 4 percent
- `post-b5e879f0` Restaurant India is now closed
- `post-b5e879f0` Restaurant India closed after more than 30 years
- `post-b5e879f0` Restaurant India was not able to stay on Bergmannstraße
- `post-b5e879f0` Restaurant India is closed
- `post-b5e879f0` the small table with the always-burning candle in the window niche at Restaurant India is…
- `post-b5e879f0` Restaurant India is closed
- `post-babe1142` buffalo ice cream has been increasing in popularity in recent years in Italy
- `post-c4e7c0a9` seasonal dishes at Sabon change regularly
- `post-d232f1ca` ROY Hops Kombucha is back
- `post-e2a421e9` Lindner is returning to its old name
- `post-fc96acff` Jonas Zörner is chef de cuisine at Lorenz Adlon Esszimmer
- `post-fc96acff` Wenzel Pankratz runs Forsthaus Strelitz
- `post-fc96acff` the restaurant has quietly gotten better

### places.extra (13)

- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-57ab8313` The Coral
- `post-59699006` Hotel Amano
- `post-816a40e7` Surich kurdische Restaurant
- `post-8901fb9b` Pauly Saal
- `post-8901fb9b` Gazzo
- `post-8901fb9b` Tadim
- `post-8901fb9b` Gatza
- `post-8901fb9b` Speicher Bülowhaus
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-93526d04` Munchies

### places.missed (11)

- `post-1e024518` Masalas
- `post-4c3e2a10` The Cell
- `post-59699006` Barlevain
- `post-674e7322` Mrs. Robinsons
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Common
- `post-8901fb9b` Gotcha
- `post-8901fb9b` Speicher Bowenhaus
- `post-93526d04` Manches
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO

### match_isolated.brand (8)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### match_isolated.branch (4)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### change.missed (4)

- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-fc96acff` Facil has quietly gotten better

### match.branch (3)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### match.brand (1)

- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
