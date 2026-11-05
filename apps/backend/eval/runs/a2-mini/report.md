# Ingestion eval: a2-mini

2026-11-05 16:04 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, labeller classifier
Tokens: 5,417,088 (408,960 input tokens from the prompt cache)
Spend: $0.168 (paid calls: classifiers)
Models: review-claims: openai/gpt-5.4-mini (51); claim-labels: typesafe-ai/jev-latest (107); post-claims: openai/gpt-5.4-mini (58); venue-match: openai/gpt-5.4-mini (29)

## Reviews

| Metric | a2-mini | stored | labels-jev-k8 | sq-sonnet | new-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% (283/298) | 93% +1 | — | 100% -5 | 100% -5 |
| Claims that are real (of produced) | 100% (343/343) | 99% +1 | — | 100% ±0 | 100% ±0 |
| Sentiment | 95% (308/324) | 88% +8 | 98% -3 | 97% -2 | 97% -2 |
| Aspect, exact | 88% (286/324) | 71% +18 | 90% -1 | 93% -5 | 91% -3 |
| Aspect, right root | 93% (301/324) | 81% +12 | 95% -3 | 96% -3 | 95% -2 |
| Kind | 96% (311/324) | 67% +29 | 98% -2 | 97% -1 | 97% -1 |
| Kind given at all | 100% (324/324) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 73% (237/324) | — | 74% -1 | — | 74% -1 |
| Sentiment, among sure answers | 99% (235/237) | — | 100% -1 | — | 99% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 46% (148/324) | — | 51% -5 | — | 50% -4 |
| Aspect, exact, among sure answers | 97% (144/148) | — | 98% -1 | — | 97% ±0 |
| Kind: sure answers (p ≥ 0.9, of answered) | 76% (246/324) | — | 74% +2 | — | 78% -2 |
| Kind, among sure answers | 99% (244/246) | — | 99% ±0 | — | 99% +1 |
| Changes that are changes | 67% (2/3) | 56% +11 | 72% -6 | 67% ±0 | 67% ±0 |
| Changes found | 100% (2/2) | 80% +20 | 81% +19 | 100% ±0 | 100% ±0 |
| Amount | 61% (11/18) | 41% +20 | 73% -11 | 93% -32 | 64% -3 |
| Foods named, precision | 91% (122/134) | 32% +59 | — | 86% +5 | 90% +1 |
| Foods named, recall | 94% (111/118) | 23% +71 | — | 88% +6 | 91% +3 |

## Posts and articles

| Metric | a2-mini | stored | labels-jev-k8 | sq-sonnet | new-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 81% (493/606) | 56% +26 | — | 93% -12 | 94% -13 |
| Claims that are real (of produced) | 89% (706/790) | 95% -5 | — | 94% -4 | 95% -5 |
| Sentiment | 92% (586/640) | 86% +6 | 97% -6 | 96% -4 | 95% -4 |
| Aspect, exact | 78% (499/640) | 63% +15 | 82% -4 | 86% -8 | 82% -4 |
| Aspect, right root | 86% (551/640) | 78% +8 | 91% -5 | 91% -5 | 88% -2 |
| Kind | 88% (566/640) | 47% +42 | 94% -6 | 94% -6 | 92% -4 |
| Kind given at all | 100% (640/640) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 62% (394/640) | — | 67% -6 | — | 66% -5 |
| Sentiment, among sure answers | 94% (372/394) | — | 100% -5 | — | 98% -3 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 38% (246/640) | — | 41% -3 | — | 33% +5 |
| Aspect, exact, among sure answers | 92% (227/246) | — | 94% -2 | — | 96% -3 |
| Kind: sure answers (p ≥ 0.9, of answered) | 60% (385/640) | — | 61% -1 | — | 60% +1 |
| Kind, among sure answers | 93% (357/385) | — | 98% -5 | — | 98% -5 |
| Changes that are changes | 39% (12/31) | 46% -8 | 49% -10 | 68% -29 | 53% -15 |
| Changes found | 90% (9/10) | 38% +53 | 97% -7 | 90% ±0 | 100% -10 |
| Amount | 55% (21/38) | 46% +9 | 86% -30 | 81% -25 | 79% -23 |
| Foods named, precision | 71% (396/555) | 46% +25 | — | 82% -11 | 80% -9 |
| Foods named, recall | 85% (355/417) | 39% +46 | — | 96% -11 | 94% -9 |
| Subject (place, city, none) | 91% (687/755) | 85% +6 | — | 97% -6 | 96% -5 |
| Claim on the right place | 88% (576/657) | 85% +3 | — | 86% +2 | 88% ±0 |
| Places found | 86% (95/111) | 73% +13 | — | 92% -6 | 92% -6 |
| Places that are places | 83% (95/115) | 85% -2 | — | 91% -8 | 92% -9 |
| Match: brand (found places) | 94% (89/95) | 92% +2 | — | 89% +4 | 91% +3 |
| Match: branch (right brand) | 96% (71/74) | 97% -1 | — | 96% ±0 | 96% ±0 |
| Match on the reference's places: brand | 92% (102/111) | — | — | 90% +2 | 90% +2 |
| Match on the reference's places: branch | 95% (81/85) | — | — | 99% -3 | 99% -3 |
| Promotional flag | 90% (52/58) | 82% +8 | — | 100% -10 | 100% -10 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-mini (train) | a2-mini (test) | labels-jev-k8 (test) | sq-sonnet (test) | new-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 95% (283/298) | — | 100% -5 | 100% -5 |
| Claims that are real (of produced) | — | 100% (343/343) | — | 100% ±0 | 100% ±0 |
| Sentiment | — | 95% (308/324) | 98% -3 | 97% -2 | 97% -2 |
| Aspect, exact | — | 88% (286/324) | 91% -2 | 93% -5 | 91% -3 |
| Aspect, right root | — | 93% (301/324) | 95% -2 | 96% -3 | 95% -2 |
| Kind | — | 96% (311/324) | 98% -2 | 97% -1 | 97% -1 |
| Kind given at all | — | 100% (324/324) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 73% (237/324) | 72% +2 | — | 74% -1 |
| Sentiment, among sure answers | — | 99% (235/237) | 100% -1 | — | 99% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 46% (148/324) | 52% -7 | — | 50% -4 |
| Aspect, exact, among sure answers | — | 97% (144/148) | 98% -1 | — | 97% ±0 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 76% (246/324) | 78% -2 | — | 78% -2 |
| Kind, among sure answers | — | 99% (244/246) | 99% ±0 | — | 99% +1 |
| Changes that are changes | — | 67% (2/3) | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | — | 61% (11/18) | 64% -3 | 93% -32 | 64% -3 |
| Foods named, precision | — | 91% (122/134) | — | 86% +5 | 90% +1 |
| Foods named, recall | — | 94% (111/118) | — | 88% +6 | 91% +3 |

### Posts and articles

| Metric | a2-mini (train) | a2-mini (test) | labels-jev-k8 (test) | sq-sonnet (test) | new-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 81% (493/606) | — | 93% -12 | 94% -13 |
| Claims that are real (of produced) | — | 89% (706/790) | — | 94% -4 | 95% -5 |
| Sentiment | — | 92% (586/640) | 97% -5 | 96% -4 | 95% -4 |
| Aspect, exact | — | 78% (499/640) | 81% -3 | 86% -8 | 82% -4 |
| Aspect, right root | — | 86% (551/640) | 90% -4 | 91% -5 | 88% -2 |
| Kind | — | 88% (566/640) | 94% -5 | 94% -6 | 92% -4 |
| Kind given at all | — | 100% (640/640) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 62% (394/640) | 65% -4 | — | 66% -5 |
| Sentiment, among sure answers | — | 94% (372/394) | 100% -5 | — | 98% -3 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 38% (246/640) | 37% +1 | — | 33% +5 |
| Aspect, exact, among sure answers | — | 92% (227/246) | 94% -1 | — | 96% -3 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 60% (385/640) | 60% ±0 | — | 60% +1 |
| Kind, among sure answers | — | 93% (357/385) | 97% -5 | — | 98% -5 |
| Changes that are changes | — | 39% (12/31) | 48% -10 | 68% -29 | 53% -15 |
| Changes found | — | 90% (9/10) | 100% -10 | 90% ±0 | 100% -10 |
| Amount | — | 55% (21/38) | 82% -27 | 81% -25 | 79% -23 |
| Foods named, precision | — | 71% (396/555) | — | 82% -11 | 80% -9 |
| Foods named, recall | — | 85% (355/417) | — | 96% -11 | 94% -9 |
| Subject (place, city, none) | — | 91% (687/755) | — | 97% -6 | 96% -5 |
| Claim on the right place | — | 88% (576/657) | — | 86% +2 | 88% ±0 |
| Places found | — | 86% (95/111) | — | 92% -6 | 92% -6 |
| Places that are places | — | 83% (95/115) | — | 91% -8 | 92% -9 |
| Match: brand (found places) | — | 94% (89/95) | — | 89% +4 | 91% +3 |
| Match: branch (right brand) | — | 96% (71/74) | — | 96% ±0 | 96% ±0 |
| Match on the reference's places: brand | — | 92% (102/111) | — | 90% +2 | 90% +2 |
| Match on the reference's places: branch | — | 95% (81/85) | — | 99% -3 | 99% -3 |
| Promotional flag | — | 90% (52/58) | — | 100% -10 | 100% -10 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 96% (135/140) | 100% (162/162) | 89% (134/151) | 94% (142/151) | — | — |
| hard | 89% (16/18) | 88% (21/24) | 89% (17/19) | 100% (19/19) | 100% (2/2) | 100% (2/2) |
| lang:de | 94% (82/87) | 100% (92/92) | 84% (75/89) | 93% (83/89) | — | — |
| lang:en | 93% (66/71) | 100% (82/82) | 92% (70/76) | 99% (75/76) | — | — |
| lang:other | 95% (91/96) | 100% (114/114) | 88% (91/104) | 95% (99/104) | — | — |
| lang:tr | 100% (44/44) | 100% (55/55) | 91% (50/55) | 93% (51/55) | — | — |
| length:long | 93% (74/80) | 100% (91/91) | 91% (80/88) | 94% (83/88) | — | — |
| length:medium | 95% (185/194) | 100% (229/229) | 87% (184/211) | 95% (200/211) | — | — |
| length:short | 100% (24/24) | 100% (23/23) | 88% (22/25) | 100% (25/25) | — | — |
| no-transcript | 84% (89/106) | 96% (105/109) | 81% (87/108) | 95% (103/108) | 94% (34/36) | 97% (33/34) |
| own | 79% (22/28) | 97% (34/35) | 88% (22/25) | 100% (25/25) | 100% (6/6) | 100% (6/6) |
| places:few | 82% (419/512) | 92% (618/675) | 77% (421/546) | 91% (498/546) | 81% (51/63) | 96% (49/51) |
| places:many | 79% (70/89) | 76% (84/111) | 82% (74/90) | 93% (84/90) | 91% (43/47) | 91% (39/43) |
| places:none | 80% (4/5) | 100% (4/4) | 100% (4/4) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| platform:blog | 81% (275/338) | 92% (412/446) | 76% (272/359) | 89% (320/359) | 74% (23/31) | 96% (22/23) |
| platform:google | 95% (283/298) | 100% (343/343) | 88% (286/324) | 95% (308/324) | — | — |
| platform:instagram | 88% (58/66) | 100% (64/64) | 76% (53/70) | 96% (67/70) | 88% (14/16) | 93% (13/14) |
| platform:tiktok | 79% (160/202) | 82% (230/280) | 82% (174/211) | 94% (199/211) | 91% (58/64) | 93% (54/58) |
| size:large | 82% (238/292) | 88% (360/411) | 75% (236/316) | 89% (280/316) | 81% (30/37) | 90% (27/30) |
| size:medium | 80% (203/255) | 91% (276/303) | 82% (211/258) | 95% (244/258) | 87% (46/53) | 96% (44/46) |
| size:small | 88% (52/59) | 92% (70/76) | 79% (52/66) | 94% (62/66) | 90% (19/21) | 95% (18/19) |
| stars:1 | 98% (48/49) | 100% (59/59) | 95% (53/56) | 93% (52/56) | — | — |
| stars:2 | 96% (26/27) | 100% (32/32) | 93% (26/28) | 93% (26/28) | — | — |
| stars:3 | 94% (80/85) | 100% (103/103) | 89% (85/95) | 97% (92/95) | — | — |
| stars:4 | 96% (52/54) | 100% (61/61) | 83% (49/59) | 92% (54/59) | — | — |
| stars:5 | 93% (77/83) | 100% (88/88) | 85% (73/86) | 98% (84/86) | — | — |
| transcript | 80% (129/162) | 80% (189/235) | 81% (140/173) | 94% (163/173) | 86% (38/44) | 89% (34/38) |

## Misses

### parts.foods (194)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [viande, poulet, sandwich]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- `review-37016d87` the food was delicious: [] ≠ [comida]
- `review-52ef0f64` the Vöner Döner was nothing outstanding: [Vöner Döner] ≠ []
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab had plenty of meat and vegetables: [kebab, meat, vegetables] ≠ [meat, vegetables]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-6b4df664` the Königsberger Klopse were nicely presented: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-9a341bb6` the food style was awkwardly between fusion and traditional: [] ≠ [fusion, tradition]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `post-079d7302` Egyptian food in Berlin: [] ≠ [Egyptian]
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: [] ≠ [dinner]
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: [Bratkartoffeln, Gemüse] ≠ []
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ []
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [Espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ []
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [Espresso]
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: [Caturra, Colombia, Castillo, Tabi] ≠ [beans]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: [] ≠ [beans]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` The El Líbano beans are washed-processed: [beans] ≠ [Washed]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [Espresso]
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: [Masala Dosa] ≠ []
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` the wait at the Manufaktur is worth it: [] ≠ [Dumplings]
- `post-22c25ac1` the Manufaktur has a daily changing offering: [] ≠ [Mrs. Chens Blue Pearl]
- `post-24601e6d` you get a cocktail and two drinks in the ice bar: [cocktail] ≠ [cocktail, drinks]
- `post-24601e6d` you choose two drinks inside the ice bar and one outside: [] ≠ [drinks]
- `post-24601e6d` trying some German food in Berlin was super exciting: [] ≠ [German food]
- `post-4c3e2a10` the owner fetches onions: [onions] ≠ []
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: [] ≠ [snack]
- … 154 more in issues.jsonl

### parts.aspect (179)

- `review-0541b749` the pain was quickly made, nothing special: food ≠ wait_for_food
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-37016d87` the food was delicious: taste ≠ food
- `review-3e075e7e` the place has a street style: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-52ef0f64` the Vöner Döner was nothing outstanding: taste ≠ none
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-5582d6b8` the friend barely touched the table and the spoons fell: interior ≠ dining_area
- `review-6217ec70` waited in line for about an hour: queue ≠ wait_for_food
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: queue ≠ wait_for_food
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: menu_variety ≠ taste
- `review-6b4df664` the staff could be more attentive: attentiveness ≠ friendliness
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-71868223` glad they waited in the queue: queue ≠ wait
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` the reviewers were there at 09.30: none ≠ crowding
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-866767df` the meal was peaceful: noise ≠ taste
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` except for one staff member, but everyone has a bad day: friendliness ≠ service
- `review-b31c1e48` a few tiny drawbacks: none ≠ dining_area
- `review-b31c1e48` the robot cat occasionally stopped with the food in other s…: service ≠ food_hygiene
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ food_hygiene
- `review-bf2322b7` we were treated to the meal by the owner: on_the_house ≠ ownership
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e12f5f74` the salad (salatası) was plentiful: portion_size ≠ freshness
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ food
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ food
- `review-f1e62446` the reviewer expected something better from the place: none ≠ food
- `review-f1e62446` the reviewer doesn't see the "wow" factor of the place: none ≠ food
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `review-fb1415dc` staff should spend less time on their phones: attentiveness ≠ none
- `review-fb1415dc` the service issues are only individual staff members: service ≠ none
- `post-165a9370` the Indian restaurant is in the heart of Berlin: location ≠ atmosphere
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- … 139 more in issues.jsonl

### claims.missed (128)

- `review-070860ca` the reviewer is not happy
- `review-37016d87` everything was incredible
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-58540992` they were told they were supposedly late
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-6e97260b` never seen such terrible attitude towards a customer
- `review-7593dfff` the place is worth it if you have time to wait in line
- `review-7593dfff` the overall vibe won't appeal to everyone
- `review-75c84f72` Markthalle Neun is a nice place
- `review-bf2322b7` keep up the great work
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-dcd4db39` keep up the good work, dear team
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-165a9370` the Indian restaurant has colorful lights
- `post-1b8b0789` the creators were warmly received at Doree 65
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spirit
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic
- `post-22c25ac1` through the tinted shop window you can watch the three women shape the Dumplings with car…
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous guests
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numerous guests
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great enjoyment potential
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satisfied with anything else
- `post-22c25ac1` families stop here after school, colleagues come for a quick lunch and friends chat over …
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling Dumplings
- `post-22c25ac1` the three women's food truly opens every heart
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufaktur is customer-friendly in pri…
- `post-22c25ac1` the five Dumplings are delicious
- `post-22c25ac1` the authors will take every chance to treat themselves to the Dumplings
- `post-24601e6d` Ice Bar Berlin is 10/10
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-4a742b09` invitation to make it a date this weekend at Village House
- `post-4f942afd` owner Julian has worked in Acre's best and most prestigious hummus restaurants
- `post-4f942afd` Akkawy's hummus is the true hummus of Acre
- `post-4f942afd` the spread of colours, smells, bowls and textures brings the cuisine to life
- `post-524765b0` Kírkē is a dream come true for everyone who likes savoury food
- `post-524765b0` Kírkē is run by Tenia Dimakopoulou and Jannis Avramidis, two longtime friends who started…
- `post-524765b0` They sat outside in the last rays of sun
- … 88 more in issues.jsonl

### parts.kind (87)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: opinion ≠ fact
- `review-37016d87` went for dinner at the end of a 25th wedding anniversary tr…: fact ≠ event
- `review-3f2a2713` the venue should offer a vegan burger already: opinion ≠ new_item
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-5582d6b8` sit inside: opinion ≠ fact
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: fact ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-75c84f72` the reviewers were there at 09.30: fact ≠ opinion
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `review-fd35af1d` it is sad to see the place empty: opinion ≠ fact
- `post-165a9370` the Indian restaurant has an impressive ambience: opinion ≠ fact
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ change
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: opinion ≠ fact
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-22c25ac1` the Manufaktur is a gain for everyone who loves good food a…: verdict ≠ fact
- `post-24601e6d` trying some German food in Berlin was super exciting: opinion ≠ fact
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-3d9147ff` Schüsseldienst does bowls a little differently: opinion ≠ verdict
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: opinion ≠ verdict
- `post-3d9147ff` Fatoush does bowls a little differently: opinion ≠ verdict
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: opinion ≠ change
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` the egg has a nice contrast of yolk and white: opinion ≠ fact
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ event
- `post-524765b0` Kírkē is a place to linger over good food and a few glasses…: opinion ≠ verdict
- `post-524765b0` They recommend the sandwich with mushrooms and truffles: opinion ≠ verdict
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: opinion ≠ fact
- `post-57ab8313` El Maestro de la Birria and the team put great effort into …: opinion ≠ event
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: opinion ≠ fact
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: opinion ≠ fact
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: opinion ≠ fact
- `post-58a16831` the trained carpenter built out Nyde's spacious rooms herse…: opinion ≠ fact
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle: opinion ≠ verdict
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: opinion ≠ fact
- `post-60ff28c2` Sandos is a Japanese sandwich and matcha spot: fact ≠ event
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- … 47 more in issues.jsonl

### claims.extra (84)

- `post-1b8b0789` the place was honest with no filter
- `post-4a742b09` running a restaurant in your 30s feels different
- `post-4a742b09` the owner chases invoices
- `post-4a742b09` some days test patience
- `post-4a742b09` the owner shows up again every day
- `post-4c3e2a10` the idea came from jail
- `post-4c3e2a10` the kebab was created
- `post-4c3e2a10` the juice remains with the kebab
- `post-4c3e2a10` the speaker dreamed of a kebab
- `post-4c3e2a10` the speaker will make the best kebab in Germany
- `post-4c3e2a10` the kebab should stay brown
- `post-4f942afd` Akkawy serves hummus
- `post-4f942afd` Akkawy serves Levantine-inspired dishes
- `post-524765b0` Kírkē is on Böckhstraße
- `post-524765b0` the menu is built around the products themselves
- `post-58a16831` the wine list is small and fine
- `post-58a16831` the wine list is small and fine
- `post-60ff28c2` the Cherry Matcha tasted amazing
- `post-68b0cd44` the feast was from Panda Meister Dumpling
- `post-68b0cd44` the place is budget friendly
- `post-68b0cd44` the place is veggie friendly
- `post-68b0cd44` the vegetable and glass noodle steamed buns had a cross section
- `post-68b0cd44` the Mapo tofu was tried
- `post-68b0cd44` the venue is called Panda Mia
- `post-6c0e92d2` the place is almost interactive
- `post-75c11d7c` Nichi Getsu is on Rotherstraße in Friedrichshain
- `post-75c11d7c` Bara Chirashi means "gestreute Sushi"
- `post-75c11d7c` the place is especially quiet
- `post-816a40e7` Döner and Shawarma are only 1 euro in Berlin
- `post-8901fb9b` Suits is in Charlottenburg
- `post-8901fb9b` Suits is a very old place
- `post-8901fb9b` Suits is a 10 out of 10 experience
- `post-8901fb9b` Suits serves suits with a meat aspic, pan fried potatoes and remoulade sauce
- `post-8901fb9b` the suits are good stuff
- `post-8901fb9b` Mister Scott is from Bonanza Coffee
- `post-8901fb9b` Mister Scott is in the backyard in Koenigsberg
- `post-8901fb9b` Suits is in Charlottenburg
- `post-8901fb9b` Suits is a very old place
- `post-8901fb9b` Suits is a 10 out of 10 experience
- `post-8901fb9b` Suits serves meat aspic with pan fried potatoes and remoulade sauce
- … 44 more in issues.jsonl

### claims.place (81)

- `post-1e024518` the Masala Dosa is paper-thin and golden brown: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is filled with spicy potato: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: Masalas ≠ Masala Dosa
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Manufaktur has a daily changing offering: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Mrs. Chens Blue Pearl
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: The Cell ≠ Haftschaden
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: The Cell ≠ Haftschaden
- `post-4c3e2a10` it is very warm inside the stand: The Cell ≠ Haftschaden
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: The Cell ≠ Haftschaden
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: The Cell ≠ Haftschaden
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner is very proud of his kebab: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner is very proud of his kebab: The Cell ≠ Haftschaden
- `post-4c3e2a10` the kebab here is not just kebab, it is art: The Cell ≠ Haftschaden
- `post-4c3e2a10` the kebab here is not just kebab, it is art: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner comes from a catering family: The Cell ≠ Haftschaden
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: The Cell ≠ Haftschaden
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner fetches onions: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner works with his brother, which goes quite well: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner works with his brother, which goes quite well: The Cell ≠ Haftschaden
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: The Cell ≠ Haftschaden
- `post-57ab8313` Every Friday from 20:00 the Margaritas Social Club takes pl…: Taco & Gringo ≠ Margaritas Social Club
- `post-57ab8313` During the Margaritas Social Club all four margaritas on th…: Taco & Gringo ≠ Margaritas Social Club
- … 41 more in issues.jsonl

### parts.sentiment (70)

- `review-0541b749` the frites were frozen: negative ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ positive
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-5582d6b8` sit inside: positive ≠ neutral
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: neutral ≠ positive
- `review-7593dfff` the bread roll was average: negative ≠ neutral
- `review-75c84f72` the reviewers were there at 09.30: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` many burger combinations are possible: positive ≠ neutral
- `review-fb1415dc` staff should spend less time on their phones: negative ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `review-fd35af1d` it is sad to see the place empty: negative ≠ neutral
- `post-165a9370` the Indian restaurant has an impressive ambience: positive ≠ neutral
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: positive ≠ neutral
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: negative ≠ neutral
- `post-22c25ac1` the Manufaktur is a gain for everyone who loves good food a…: positive ≠ neutral
- `post-24601e6d` trying some German food in Berlin was super exciting: positive ≠ neutral
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4c3e2a10` the customers have remained faithful: positive ≠ neutral
- `post-4f942afd` Akkawy is now Friedrichshain's hummus destination: positive ≠ negative
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: neutral ≠ positive
- `post-4f942afd` the bitter tahini taste ties all of Akkawy's dishes together: positive ≠ negative
- `post-4f942afd` the egg has a nice contrast of yolk and white: positive ≠ neutral
- `post-4f942afd` the author neither loves nor hates hummus: mixed ≠ positive
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: positive ≠ neutral
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: positive ≠ neutral
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: positive ≠ neutral
- `post-58a16831` Nyde is in a beautiful corner space on Belziger Straße: positive ≠ neutral
- `post-58a16831` the trained carpenter built out Nyde's spacious rooms herse…: positive ≠ neutral
- `post-58a16831` Nyde, with its self-built interior, is cosy: positive ≠ neutral
- `post-58a16831` people come to Nyde for the coffee and the interior: positive ≠ neutral
- `post-58a16831` Nyde's dark wood wall cabinets with glass doors reaching th…: positive ≠ neutral
- `post-58a16831` Nyde's cabinets hold beautiful vases, glasses and matryoshk…: positive ≠ neutral
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: positive ≠ neutral
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ negative
- … 30 more in issues.jsonl

### claims.subject (68)

- `post-165a9370` the Indian restaurant has an impressive ambience: none ≠ city
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-27fe4363` at Horváth celery gets the fine-dining treatment: place ≠ none
- `post-3d9147ff` Schüsseldienst does bowls a little differently: place ≠ city
- `post-3d9147ff` Schüsseldienst is definitely worth trying: place ≠ city
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: place ≠ city
- `post-3d9147ff` Kitchari Kitchen is definitely worth trying: place ≠ city
- `post-3d9147ff` Fatoush does bowls a little differently: place ≠ city
- `post-3d9147ff` Fatoush is definitely worth trying: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` at many kebab stores the spit just dries up: none ≠ place
- `post-4c3e2a10` at many kebab stores the spit just dries up: none ≠ place
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the customers have remained faithful: place ≠ none
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-4f942afd` Akkawy is now Friedrichshain's hummus destination: place ≠ city
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: place ≠ none
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: place ≠ none
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: place ≠ none
- `post-4f942afd` the meal offered many new flavours: place ≠ none
- `post-4f942afd` the author neither loves nor hates hummus: none ≠ place
- `post-524765b0` People looking for new restaurants, cafés and bakeries usua…: city ≠ place
- `post-57ab8313` Like mole, birria is simmered for hours and specially seaso…: none ≠ place
- `post-57ab8313` Like mole, birria is simmered for hours and specially seaso…: none ≠ place
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-60ff28c2` Sandos opens today in Berlin: place ≠ city
- `post-60ff28c2` Sandos is a Japanese sandwich and matcha spot: place ≠ city
- `post-650ede57` question whether oil belongs in pasta water: none ≠ place
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-8901fb9b` Speicher Bowenhaus is a super, super amazing place: place ≠ none
- `post-8901fb9b` Tobias loves Papaya: place ≠ none
- `post-93526d04` the unnamed baklava shop has 4.8 stars: none ≠ place
- `post-93526d04` the Süd Baklava tasted really good: none ≠ place
- `post-93526d04` the Baklava was not too sweet, you could eat a lot of it: none ≠ place
- … 28 more in issues.jsonl

### parts.amount (24)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ 2 money
- `review-0ac47c59` the line didn't move: —  ≠ 60 minutes
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: —  ≠ 1 money
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 1 minutes
- `review-75c84f72` the reviewers are used to marketplaces opening at 07.00 at …: —  ≠ 7 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-c83e0a88` waited in line for 1.5 hours: 90 minutes ≠ 1.5 minutes
- `post-57ab8313` The Gringa de Birria is the authors' favourite: —  ≠ 12.9 money
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: —  ≠ 11.5 money
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-57ab8313` Every Friday from 20:00 the Margaritas Social Club takes pl…: —  ≠ 20 money
- `post-58a16831` a year passed between the start of construction and Nyde's …: —  ≠ 12 minutes
- `post-73286ffe` the Heitlinger Brasserie opens on 1 November from 12:00: —  ≠ 12 money
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 2 money
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-816a40e7` the restaurant opens at 13:00 on Friday: —  ≠ 13 money
- `post-93526d04` the unnamed baklava shop has 4.8 stars: —  ≠ 4.8 money
- `post-93526d04` they rate Kaffee Peri 7 out of 10: —  ≠ 7 money
- `post-935c2fd2` restaurant revenue in Germany fell by 4 percent according t…: —  ≠ 4 money
- `post-b5e879f0` Restaurant India has closed after 31 years: —  ≠ 31 money
- `post-b5e879f0` owner Virender Aurora has friendly, soft features: —  ≠ 31 money
- `post-babe1142` lesser gelaterias in Berlin get fifty-person queues: —  ≠ 50 money
- `post-db280ef6` 572Pasta is at the corner of Bleibtreustraße: —  ≠ 10 money
- `post-fc96acff` the author had an extraordinary lunch at Facil this summer …: —  ≠ 25 money

### change.false (20)

- `review-7593dfff` everything went faster once he showed up
- `post-22c25ac1` the manufactory offers a street-side sale
- `post-4c3e2a10` the kebab is through
- `post-524765b0` the Vorias & Helios Orange Assyrtiko later became a whole bottle
- `post-60ff28c2` Sandos Berlin is open Wednesday to Sunday from 14 to 20 o'clock
- `post-75c11d7c` Nichi Getsu shifts to a more relaxed lunch focus by day
- `post-935c2fd2` the gastronomy revenue in Germany fell by 4 percent
- `post-b5e879f0` Restaurant India has closed
- `post-b5e879f0` Restaurant India is no longer in Bergmannstraße
- `post-b5e879f0` India is closed now
- `post-b5e879f0` the candle-lit table in the window niche is no longer occupied
- `post-babe1142` buffalo ice cream has been increasing in popularity in recent years
- `post-c4e7c0a9` the old wallpaper revealed a beautiful blue wall colour
- `post-c4e7c0a9` the seasonal dishes change regularly
- `post-c4e7c0a9` the menu stays in motion
- `post-d232f1ca` ROY Hops Kombucha is back
- `post-e2a421e9` Butter Lindner is returning to its old name
- `post-e2a421e9` everything will be as before again
- `post-fc96acff` Facil has had little staff turnover
- `post-fc96acff` the restaurant has quietly gotten better

### places.extra (20)

- `post-1c78d4ed` Col-Spirit
- `post-1e024518` Masala Dosa
- `post-22c25ac1` Mrs. Chens Blue Pearl
- `post-4c3e2a10` Haftschaden
- `post-57ab8313` Margaritas Social Club
- `post-57ab8313` The Coral
- `post-68b0cd44` Panda Meister Berlin Kurfürstendamm
- `post-816a40e7` Surich Kurdische Restaurant
- `post-8901fb9b` Suits
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-93526d04` Baklava Laden
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-b5e879f0` Bäcker nebenan
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt gegenüber
- `post-dfe2d586` VALORANT Champions Shanghai
- `post-e2a421e9` Lindner
- `post-eddeb88d` MIKUNA

### places.missed (16)

- `post-1e024518` Masalas
- `post-4c3e2a10` The Cell
- `post-58a16831` Bäckerei Johann
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Bonanza Coffee
- `post-8901fb9b` Papaya
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-d232f1ca` ROY Kombucha
- `post-fc96acff` Hallmann & Klee
- `post-fc96acff` Lorenz Adlon Esszimmer
- `post-fc96acff` Birds in the Kitchen
- `post-fc96acff` Cielo
- `post-fc96acff` Forsthaus Strelitz

### match_isolated.brand (9)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### match.brand (6)

- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### match_isolated.branch (4)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### match.branch (3)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-b2993d78` Mani in Pasta: Mani in Pasta - Markthalle ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### change.missed (1)

- `post-fc96acff` Facil has quietly gotten better
