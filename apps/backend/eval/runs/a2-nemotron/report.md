# Ingestion eval: a2-nemotron

2026-11-05 20:18 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: model openrouter/nvidia/nemotron-3.5-super-vl:free
Tokens: 6,169,862
Spend: $0.161 (paid calls: classifiers)
Models: review-claims: openrouter/nvidia/nemotron-3.5-super-vl:free (51); claim-labels: typesafe-ai/jev-latest (103); post-claims: openrouter/nvidia/nemotron-3.5-super-vl:free (58); venue-match: openrouter/nvidia/nemotron-3.5-super-vl:free (28)

## Reviews

| Metric | a2-nemotron | stored | a2-mini-nj | a2-gpt54-nj | or-smoke |
|---|---|---|---|---|---|
| Claims found (of the reference) | 97% (288/298) | 93% +3 | 95% +2 | — | — |
| Claims that are real (of produced) | 99% (341/346) | 99% -1 | 99% -1 | — | — |
| Sentiment | 98% (326/334) | 88% +10 | 95% +3 | — | — |
| Aspect, exact | 90% (300/334) | 71% +19 | 88% +2 | — | — |
| Aspect, right root | 95% (317/334) | 81% +14 | 93% +2 | — | — |
| Kind | 97% (325/334) | 67% +31 | 96% +1 | — | — |
| Kind given at all | 100% (334/334) | 4% +96 | 100% ±0 | — | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 73% (244/334) | — | 74% ±0 | — | — |
| Sentiment, among sure answers | 100% (244/244) | — | 99% +1 | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 46% (153/334) | — | 45% +1 | — | — |
| Aspect, exact, among sure answers | 97% (149/153) | — | 98% -1 | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 78% (260/334) | — | 77% +1 | — | — |
| Kind, among sure answers | 99% (258/260) | — | 99% ±0 | — | — |
| Changes that are changes | 0% (0/1) | 56% -56 | 67% -67 | — | — |
| Changes found | 0% (0/2) | 80% -80 | 100% -100 | — | — |
| Amount | 81% (13/16) | 41% +40 | 65% +17 | — | — |
| Foods named, precision | 86% (106/123) | 32% +54 | 91% -5 | — | — |
| Foods named, recall | 90% (105/117) | 23% +67 | 94% -4 | — | — |

## Posts and articles

| Metric | a2-nemotron | stored | a2-mini-nj | a2-gpt54-nj | or-smoke |
|---|---|---|---|---|---|
| Claims found (of the reference) | 73% (440/606) | 56% +17 | — | 85% -12 | 100% -27 |
| Claims that are real (of produced) | 86% (630/730) | 95% -8 | — | 84% +2 | 100% -14 |
| Sentiment | 89% (543/609) | 86% +4 | — | 94% -4 | 100% -11 |
| Aspect, exact | 74% (450/609) | 63% +11 | — | 83% -9 | 75% -1 |
| Aspect, right root | 83% (507/609) | 78% +6 | — | 89% -6 | 100% -17 |
| Kind | 85% (518/609) | 47% +38 | — | 91% -6 | 100% -15 |
| Kind given at all | 100% (609/609) | 4% +96 | — | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 66% (403/609) | — | — | 68% -2 | 75% -9 |
| Sentiment, among sure answers | 93% (373/403) | — | — | 96% -4 | 100% -7 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 37% (224/609) | — | — | 37% -1 | 75% -38 |
| Aspect, exact, among sure answers | 88% (197/224) | — | — | 93% -5 | 67% +21 |
| Kind: sure answers (p ≥ 0.9, of answered) | 58% (353/609) | — | — | 62% -4 | 75% -17 |
| Kind, among sure answers | 91% (322/353) | — | — | 96% -5 | 100% -9 |
| Changes that are changes | 47% (9/19) | 46% +1 | — | 63% -15 | — |
| Changes found | 40% (4/10) | 38% +3 | — | 80% -40 | — |
| Amount | 26% (7/27) | 46% -20 | — | 60% -34 | — |
| Foods named, precision | 72% (288/401) | 46% +26 | — | 79% -7 | 100% -28 |
| Foods named, recall | 74% (264/358) | 39% +35 | — | 84% -10 | 100% -26 |
| Subject (place, city, none) | 92% (645/703) | 85% +7 | — | 94% -2 | 100% -8 |
| Claim on the right place | 94% (571/610) | 85% +9 | — | 91% +3 | 100% -6 |
| Places found | 90% (100/111) | 73% +17 | — | 90% ±0 | 100% -10 |
| Places that are places | 88% (100/113) | 85% +3 | — | 88% ±0 | 100% -12 |
| Match: brand (found places) | 93% (93/100) | 92% +1 | — | 99% -6 | 50% +43 |
| Match: branch (right brand) | 99% (75/76) | 97% +2 | — | 96% +2 | 100% -1 |
| Match on the reference's places: brand | 91% (101/111) | — | — | 93% -2 | 100% -9 |
| Match on the reference's places: branch | 98% (82/84) | — | — | 95% +2 | 100% -2 |
| Promotional flag | 97% (56/58) | 82% +15 | — | 100% -3 | 100% -3 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-nemotron (train) | a2-nemotron (test) | a2-mini-nj (test) | a2-gpt54-nj (test) | or-smoke (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 97% (288/298) | 95% +2 | — | — |
| Claims that are real (of produced) | — | 99% (341/346) | 99% -1 | — | — |
| Sentiment | — | 98% (326/334) | 95% +3 | — | — |
| Aspect, exact | — | 90% (300/334) | 88% +2 | — | — |
| Aspect, right root | — | 95% (317/334) | 93% +2 | — | — |
| Kind | — | 97% (325/334) | 96% +1 | — | — |
| Kind given at all | — | 100% (334/334) | 100% ±0 | — | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 73% (244/334) | 74% ±0 | — | — |
| Sentiment, among sure answers | — | 100% (244/244) | 99% +1 | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 46% (153/334) | 45% +1 | — | — |
| Aspect, exact, among sure answers | — | 97% (149/153) | 98% -1 | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 78% (260/334) | 77% +1 | — | — |
| Kind, among sure answers | — | 99% (258/260) | 99% ±0 | — | — |
| Changes that are changes | — | 0% (0/1) | 67% -67 | — | — |
| Changes found | — | 0% (0/2) | 100% -100 | — | — |
| Amount | — | 81% (13/16) | 65% +17 | — | — |
| Foods named, precision | — | 86% (106/123) | 91% -5 | — | — |
| Foods named, recall | — | 90% (105/117) | 94% -4 | — | — |

### Posts and articles

| Metric | a2-nemotron (train) | a2-nemotron (test) | a2-mini-nj (test) | a2-gpt54-nj (test) | or-smoke (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 73% (440/606) | — | 85% -12 | 100% -27 |
| Claims that are real (of produced) | — | 86% (630/730) | — | 84% +2 | 100% -14 |
| Sentiment | — | 89% (543/609) | — | 94% -4 | 100% -11 |
| Aspect, exact | — | 74% (450/609) | — | 83% -9 | 75% -1 |
| Aspect, right root | — | 83% (507/609) | — | 89% -6 | 100% -17 |
| Kind | — | 85% (518/609) | — | 91% -6 | 100% -15 |
| Kind given at all | — | 100% (609/609) | — | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 66% (403/609) | — | 68% -2 | 75% -9 |
| Sentiment, among sure answers | — | 93% (373/403) | — | 96% -4 | 100% -7 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 37% (224/609) | — | 37% -1 | 75% -38 |
| Aspect, exact, among sure answers | — | 88% (197/224) | — | 93% -5 | 67% +21 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 58% (353/609) | — | 62% -4 | 75% -17 |
| Kind, among sure answers | — | 91% (322/353) | — | 96% -5 | 100% -9 |
| Changes that are changes | — | 47% (9/19) | — | 63% -15 | — |
| Changes found | — | 40% (4/10) | — | 80% -40 | — |
| Amount | — | 26% (7/27) | — | 60% -34 | — |
| Foods named, precision | — | 72% (288/401) | — | 79% -7 | 100% -28 |
| Foods named, recall | — | 74% (264/358) | — | 84% -10 | 100% -26 |
| Subject (place, city, none) | — | 92% (645/703) | — | 94% -2 | 100% -8 |
| Claim on the right place | — | 94% (571/610) | — | 91% +3 | 100% -6 |
| Places found | — | 90% (100/111) | — | 90% ±0 | 100% -10 |
| Places that are places | — | 88% (100/113) | — | 88% ±0 | 100% -12 |
| Match: brand (found places) | — | 93% (93/100) | — | 99% -6 | 50% +43 |
| Match: branch (right brand) | — | 99% (75/76) | — | 96% +2 | 100% -1 |
| Match on the reference's places: brand | — | 91% (101/111) | — | 93% -2 | 100% -9 |
| Match on the reference's places: branch | — | 98% (82/84) | — | 95% +2 | 100% -2 |
| Promotional flag | — | 97% (56/58) | — | 100% -3 | 100% -3 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 93% (130/140) | 98% (151/154) | 88% (128/146) | 96% (140/146) | — | — |
| hard | 100% (18/18) | 96% (24/25) | 83% (19/23) | 96% (22/23) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 100% (100/100) | 87% (84/97) | 96% (93/97) | — | — |
| lang:en | 100% (71/71) | 99% (83/84) | 94% (76/81) | 100% (81/81) | — | — |
| lang:other | 90% (86/96) | 98% (105/107) | 88% (90/102) | 98% (100/102) | — | — |
| lang:tr | 100% (44/44) | 96% (53/55) | 93% (50/54) | 96% (52/54) | — | — |
| length:long | 100% (80/80) | 99% (98/99) | 93% (90/97) | 97% (94/97) | — | — |
| length:medium | 95% (184/194) | 98% (218/222) | 88% (187/212) | 98% (207/212) | — | — |
| length:short | 100% (24/24) | 100% (25/25) | 92% (23/25) | 100% (25/25) | — | — |
| no-transcript | 81% (86/106) | 89% (124/139) | 89% (99/111) | 97% (108/111) | 83% (30/36) | 97% (29/30) |
| own | 96% (27/28) | 92% (34/37) | 78% (25/32) | 94% (30/32) | 100% (6/6) | 100% (6/6) |
| places:few | 73% (372/512) | 86% (537/621) | 71% (366/513) | 88% (450/513) | 94% (59/63) | 97% (57/59) |
| places:many | 73% (65/89) | 85% (90/106) | 87% (81/93) | 97% (90/93) | 87% (41/47) | 88% (36/41) |
| places:none | 60% (3/5) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 0% (0/1) | — |
| platform:blog | 70% (237/338) | 85% (321/376) | 64% (211/328) | 83% (273/328) | 100% (31/31) | 97% (30/31) |
| platform:google | 97% (288/298) | 99% (341/346) | 90% (300/334) | 98% (326/334) | — | — |
| platform:instagram | 89% (59/66) | 91% (84/92) | 85% (63/74) | 97% (72/74) | 81% (13/16) | 92% (12/13) |
| platform:tiktok | 71% (144/202) | 86% (225/262) | 85% (176/207) | 96% (198/207) | 88% (56/64) | 91% (51/56) |
| size:large | 70% (203/292) | 84% (275/329) | 61% (175/286) | 81% (232/286) | 92% (34/37) | 88% (30/34) |
| size:medium | 76% (193/255) | 88% (296/336) | 85% (227/266) | 97% (258/266) | 94% (50/53) | 96% (48/50) |
| size:small | 75% (44/59) | 91% (59/65) | 84% (48/57) | 93% (53/57) | 76% (16/21) | 94% (15/16) |
| stars:1 | 80% (39/49) | 94% (47/50) | 98% (46/47) | 96% (45/47) | — | — |
| stars:2 | 100% (27/27) | 100% (30/30) | 90% (26/29) | 100% (29/29) | — | — |
| stars:3 | 100% (85/85) | 99% (106/107) | 88% (91/103) | 98% (101/103) | — | — |
| stars:4 | 100% (54/54) | 98% (59/60) | 85% (52/61) | 98% (60/61) | — | — |
| stars:5 | 100% (83/83) | 100% (99/99) | 90% (85/94) | 97% (91/94) | — | — |
| transcript | 72% (117/162) | 86% (185/215) | 82% (140/170) | 95% (162/170) | 89% (39/44) | 87% (34/39) |

## Misses

### parts.aspect (193)

- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the pain was quickly made, nothing special: food ≠ speed_of_service
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-37016d87` the atmosphere was typical: atmosphere ≠ crowding
- `review-3e075e7e` the place has a street style: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3f2a2713` you can use the ketchup provided for a vegan burger: dietary ≠ seasoning
- `review-52ef0f64` the Vöner Döner was quite good: taste ≠ food
- `review-5582d6b8` there were some issues too: none ≠ outdoor_seating
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-58540992` the service at the table was friendly: friendliness ≠ attentiveness
- `review-6b4df664` the whole experience left a positive impression: none ≠ vibe
- `review-6b4df664` the staff could be more attentive: attentiveness ≠ friendliness
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-7593dfff` the relaxed, unhurried approach of the young staff won't ap…: speed_of_service ≠ vibe
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` Markthalle Neun is a nice place: none ≠ vibe
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ freshness
- `review-bf2322b7` there were even different marinades for the chicken: menu_variety ≠ seasoning
- `review-bf2322b7` the Salat was fresh: freshness ≠ menu_variety
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-dcd4db39` the queue nonetheless moved relatively quickly: queue ≠ speed_of_service
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e12f5f74` the salad (salatası) was plentiful: portion_size ≠ freshness
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ food
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ location
- `review-f1e62446` the reviewer expected something better from the place: none ≠ food
- `review-f1e62446` the reviewer doesn't see the "wow" factor of the place: none ≠ food
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `review-fb1415dc` the cleanliness and service issues are not that bad: none ≠ service
- `post-1b8b0789` the creators ate at Doree 65 today: none ≠ food
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are washed-processed: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano espresso is Arabica: drinks ≠ ingredient_quality
- … 153 more in issues.jsonl

### claims.missed (176)

- `review-4a46a87d` the sandwich was very bad
- `review-4a46a87d` the chicken tasted strange
- `review-4a46a87d` the chicken was burnt
- `review-4a46a87d` the chicken seemed fried days ago
- `review-4a46a87d` the oil tasted old
- `review-4a46a87d` the sandwich was empty
- `review-4a46a87d` the sandwich was dry
- `review-4a46a87d` will never order from them again
- `review-4a46a87d` the new location isn't the same as the old one
- `review-4a46a87d` it has become a fast-food restaurant
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-165a9370` the Indian restaurant has colorful lights
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang out
- `post-165a9370` the Indian restaurant is the perfect place for a date night or dinner with friends
- `post-165a9370` the Indian restaurant is in the heart of Berlin
- `post-1b8b0789` the owner of Doree 65 is a bit crazy
- `post-1b8b0789` the creators found the owner decent, however controversial he is
- `post-1c78d4ed` The El Líbano beans are available through the roaster's webshop and select resellers thro…
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satisfied with anything else
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level
- `post-22c25ac1` the three tables in front of the street sale are constantly occupied
- `post-22c25ac1` families stop here after school, colleagues come for a quick lunch and friends chat over …
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling Dumplings
- `post-22c25ac1` the three women's food truly opens every heart
- `post-22c25ac1` the wait at the Manufaktur is worth it
- `post-22c25ac1` you order digitally at a counter
- `post-22c25ac1` guests are served by the women themselves
- `post-22c25ac1` the factory sale brings high quality fresh to the table
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tender Beef
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue Pearls
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake-Pilzen and Lachskaviar and th…
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufaktur is customer-friendly in pri…
- `post-22c25ac1` the five Dumplings are delicious
- `post-22c25ac1` five Dumplings cost only 8.25 euros
- `post-22c25ac1` ten dumplings cost 16 euros
- `post-22c25ac1` 20 dumplings cost 30 euros
- `post-22c25ac1` the prices are fairly calculated and worth every cent
- … 136 more in issues.jsonl

### parts.foods (164)

- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan, salataları]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner, köri sosu, tavuk eti]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [döner]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğandan, salataları]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- `review-16bdd5e0` my sauce was wrong: [sauce] ≠ [kebab]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi]
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: [gemuse kebaba, wrapa] ≠ [gemuse kebaba, wrapa, kebabów]
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: [iced matcha latte] ≠ []
- `review-6217ec70` the kebab had a generous amount of sauce: [sauce] ≠ [kebab, sauce]
- `review-6b4df664` the Königsberger Klopse were really successful in taste: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-6b4df664` the Königsberger Klopse were nicely presented: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-70467fba` the food is not worth spending a huge amount of time waitin…: [] ≠ [kebab]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneri]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ []
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneri]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ []
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: [Bratkartoffeln, Gemüse] ≠ []
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ []
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso, El Líbano]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica]
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: [] ≠ [El Líbano]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [Espresso]
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: [Sambar, Chutneys] ≠ [Masala Dosa, Sambar, Chutneys]
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: [Füllungen] ≠ []
- `post-3b1b4cd6` the chicken is incredibly crispy: [chicken] ≠ []
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: [mushroom-hummus] ≠ []
- `post-4f942afd` they ordered hummus with crisp pickled beetroot: [hummus, pickled beetroot] ≠ [hummus, aubergine puree]
- `post-4f942afd` they ordered hummus with a sweet aubergine puree: [hummus, aubergine puree] ≠ [Zahra, cauliflower, onions, Indian spices, tahini]
- `post-4f942afd` the Zahra is a creamy baked cauliflower dish with onions, I…: [Zahra, cauliflower, onions, tahini] ≠ [Shakshuka, tomato-based sauce, egg]
- `post-4f942afd` the Shakshuka is a rich, lightly-spiced, almost smoky tomat…: [Shakshuka] ≠ [Fatush salad]
- … 124 more in issues.jsonl

### claims.extra (105)

- `review-0ac47c59` we thought the long line was because the döner was being prepared
- `review-3f2a2713` the year is 2026
- `review-4a46a87d` claim
- `review-71868223` decided to wait
- `review-fd35af1d` the place was empty
- `post-1b8b0789` achlaschermuterplatte ordered to go
- `post-1b8b0789` they thought they would try the whole thing out
- `post-1b8b0789` they are here because of the food
- `post-3d9147ff` Berlin has spots that do bowls differently
- `post-4a742b09` running a restaurant in your 30s hits different
- `post-4a742b09` the restaurant sometimes tests patience
- `post-4a742b09` the restaurant is a Berlin restaurant
- `post-4c3e2a10` the kebab is through
- `post-4c3e2a10` the juice remains with the kebab
- `post-4c3e2a10` the idea came from a dream
- `post-4c3e2a10` the cell has a hatch
- `post-4c3e2a10` the cell gives people food
- `post-4c3e2a10` the kebab is through
- `post-4c3e2a10` the kebab temperature is set
- `post-4c3e2a10` the juice remains with the kebab
- `post-4c3e2a10` the kebab temperature must be exact
- `post-4c3e2a10` the gas burner has run out
- `post-4c3e2a10` the kebab should remain brown
- `post-4c3e2a10` the whole tomato becomes liquid
- `post-4f942afd` hummus is better than guacamole
- `post-4f942afd` the dishes Akkawy serves are where Julian gets to experiment.
- `post-4f942afd` The mushroom-hummus dish is the best example of this experimentation
- `post-4f942afd` Julian considers the mushroom-hummus dish their signature dish
- `post-4f942afd` Julian prizes the tahini over tahinis available in Palestine
- `post-4f942afd` the textures are the main counterpoint to the endlessly-smooth hummus.
- `post-4f942afd` the hummus felt like cement.
- `post-4f942afd` the tahini waterboard adventure leaves you stationary, stoic and regretful.
- `post-4f942afd` bread is broken together.
- `post-4f942afd` the author is coming around to the idea of hummus.
- `post-51a97d36` the Tiramisu goes into the stomach on the left or right side
- `post-57ab8313` Taco & Gringo opened fresh possibilities to experience Mexico with two coups.
- `post-57ab8313` Taco & Gringo offers Mexican joy of life.
- `post-58a16831` everyone who enters Nyde understands why the landlords were convinced
- `post-60ff28c2` the creator wants the Chili sin Carne and the Cherry Matcha with coconut milk
- `post-674e7322` Berlin has the really best restaurants.
- … 65 more in issues.jsonl

### parts.kind (100)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue: verdict ≠ opinion
- `review-37016d87` went for dinner at the end of a 25th wedding anniversary tr…: fact ≠ event
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-bf2322b7` the Salat was fresh: opinion ≠ fact
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-1b8b0789` the creators ate at Doree 65 today: fact ≠ opinion
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` the Manufaktur puts a deserved spotlight on the women of th…: opinion ≠ event
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ event
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-27fe4363` Horváth is on Paul-Lincke-Ufer in Kreuzberg: fact ≠ opinion
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-4f942afd` Akkawy is currently open, verified August 2026: fact ≠ opinion
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ fact
- `post-4f942afd` Julian's hummus recipe is fixed and unchangeable: fact ≠ opinion
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` the Shakshuka is a rich, lightly-spiced, almost smoky tomat…: opinion ≠ fact
- `post-4f942afd` they ordered the classic Fatush salad: fact ≠ opinion
- `post-4f942afd` the fried flatbread has a crisp bite: opinion ≠ fact
- `post-524765b0` Kírkē is a place to linger over good food and a few glasses…: opinion ≠ verdict
- `post-524765b0` They recommend the sandwich with mushrooms and truffles: opinion ≠ verdict
- `post-57ab8313` Taco & Gringo is bright pink with a memorable logo and two …: opinion ≠ fact
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle: opinion ≠ change
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: fact ≠ new_item
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: fact ≠ new_item
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ opinion
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ fact
- `post-674e7322` Mrs. Robinsons is closed: fact ≠ change
- `post-674e7322` Jones ice cream is the best cheat day treat: verdict ≠ opinion
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque: fact ≠ change
- `post-6c0e92d2` they had the Le Classique with homemade ham cuit au torchon…: fact ≠ opinion
- `post-6c0e92d2` the secret sauce on the Le Classique is dangerously good: opinion ≠ fact
- `post-6c0e92d2` they then had the Le Rostbif with roast beef, chive mayo, p…: fact ≠ opinion
- `post-6c0e92d2` the Le Rostbif was hearty, cheesy and just the right amount…: opinion ≠ fact
- `post-6c0e92d2` drinks get their due at Kroque: opinion ≠ verdict
- … 60 more in issues.jsonl

### parts.sentiment (74)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-90e99b19` the atmosphere is ordinary: negative ≠ neutral
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-bf2322b7` the Salat was fresh: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `post-1b8b0789` the creators ate at Doree 65 today: neutral ≠ positive
- `post-22c25ac1` the restaurant in Mitte has new owners: neutral ≠ positive
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: neutral ≠ positive
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-27fe4363` Horváth is on Paul-Lincke-Ufer in Kreuzberg: neutral ≠ positive
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: negative ≠ positive
- `post-4f942afd` Akkawy is currently open, verified August 2026: neutral ≠ positive
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: positive ≠ neutral
- `post-4f942afd` Julian's hummus recipe is fixed and unchangeable: neutral ≠ positive
- `post-4f942afd` the Shakshuka is a rich, lightly-spiced, almost smoky tomat…: positive ≠ neutral
- `post-4f942afd` they ordered the classic Fatush salad: neutral ≠ positive
- `post-4f942afd` the fried flatbread has a crisp bite: positive ≠ neutral
- `post-4f942afd` the hummus is so smooth you don't need teeth to eat it: positive ≠ negative
- `post-4f942afd` eating too much of the hummus felt very heavy, like drowning: negative ≠ positive
- `post-57ab8313` Taco & Gringo is bright pink with a memorable logo and two …: positive ≠ neutral
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-60ff28c2` you must order the Matcha with Kokosmilch: positive ≠ neutral
- `post-6c0e92d2` they had the Le Classique with homemade ham cuit au torchon…: neutral ≠ positive
- `post-6c0e92d2` the secret sauce on the Le Classique is dangerously good: positive ≠ neutral
- `post-6c0e92d2` they then had the Le Rostbif with roast beef, chive mayo, p…: neutral ≠ positive
- `post-6c0e92d2` the Le Rostbif was hearty, cheesy and just the right amount…: positive ≠ neutral
- `post-6c0e92d2` the freshly mixed raspberry daiquiri is worth trying with a…: positive ≠ mixed
- `post-6c0e92d2` the raspberry daiquiri is just sweet enough and maybe a bit…: positive ≠ neutral
- `post-6c0e92d2` Kroque is already more than just a lunch spot: positive ≠ neutral
- `post-6c0e92d2` Kroque also serves drinks: neutral ≠ mixed
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` the Futomaki is a generously filled, thick sushi roll wrapp…: positive ≠ neutral
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-816a40e7` there are not many shawarma and döner shops in this area: neutral ≠ negative
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: neutral ≠ positive
- `post-909ca5ee` The Oeuf Mayo is currently served with a Bärlauchmayonnaise: neutral ≠ positive
- … 34 more in issues.jsonl

### claims.subject (58)

- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-3d9147ff` Schüsseldienst does bowls a little differently: place ≠ none
- `post-3d9147ff` Schüsseldienst is definitely worth trying: place ≠ none
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: place ≠ none
- `post-3d9147ff` Kitchari Kitchen is definitely worth trying: place ≠ none
- `post-3d9147ff` Fatoush does bowls a little differently: place ≠ none
- `post-3d9147ff` Fatoush is definitely worth trying: place ≠ none
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: city ≠ place
- `post-57ab8313` Like mole, birria is simmered for hours and specially seaso…: none ≠ place
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-75c11d7c` in Bara Chirashi the fish is cut into small bite-sized piec…: none ≠ place
- `post-75c11d7c` in Bara Chirashi the fish is cut into small bite-sized piec…: none ≠ place
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-909ca5ee` Strolling up Vorbergstraße in Schöneberg feels like being i…: city ≠ place
- `post-93526d04` the unnamed baklava shop has 4.8 stars: none ≠ place
- `post-93526d04` they had Süd Baklava with ice cream at the baklava shop: none ≠ place
- `post-93526d04` they had Süd Baklava with ice cream at the baklava shop: none ≠ place
- `post-93526d04` the Süd Baklava tasted really good: none ≠ place
- `post-93526d04` the Baklava was not too sweet, you could eat a lot of it: none ≠ place
- `post-93526d04` the Baklava was one of the best they have ever eaten: none ≠ place
- `post-93526d04` the Schokobox was much more intense and really chocolatey: none ≠ place
- `post-93526d04` the warm kinderfer were the perfect mix of sweet and salty: none ≠ place
- `post-93526d04` the warm kinderfer were the perfect mix of sweet and salty: none ≠ place
- `post-b2993d78` Mani in Pasta offers real Italian pasta art: place ≠ city
- `post-b5e879f0` the new international deli supermarket opposite sells Halwa…: city ≠ none
- `post-babe1142` Peggy Bee has a welcoming atmosphere rarely felt in Berlin: place ≠ city
- `post-d232f1ca` ROY Hops Kombucha has all the floral, fruity character of A…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is balanced by the kombucha's gentle swee…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is smooth, refreshing and just bitter eno…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is smooth, refreshing and just bitter eno…: place ≠ none
- … 18 more in issues.jsonl

### claims.place (39)

- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes Manufaktur
- `post-4a742b09` Village House is a Nigerian restaurant: Village House ≠ RiskyLounge (Village House)
- `post-4a742b09` the owners plate dishes they are proud of at Village House: Village House ≠ RiskyLounge (Village House)
- `post-4a742b09` some days Village House is packed: Village House ≠ RiskyLounge (Village House)
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-6c0e92d2` Kroque makes Croque Monsieurs with as many homemade ingredi…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` the ham, roast beef and halal turkey ham are all made in-ho…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` Lukas refuses to use industrially processed meat full of ad…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` every Kroque has homemade cold cuts, a mix of three cheeses…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` the Kroques are packed between two slices of Pain de Mie an…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` they had the Le Classique with homemade ham cuit au torchon…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` the secret sauce on the Le Classique is dangerously good: Kroque ≠ François at La Buvette
- `post-6c0e92d2` they then had the Le Rostbif with roast beef, chive mayo, p…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` the Le Rostbif was hearty, cheesy and just the right amount…: Kroque ≠ François at La Buvette
- `post-6c0e92d2` they will try the La Dindz next time: Kroque ≠ François at La Buvette
- `post-6c0e92d2` the La Dindz is a Mediterranean-inspired Kroque with fresh …: Kroque ≠ François at La Buvette
- `post-6c0e92d2` Kroque is a bit sandwich shop, a bit cocktail bar, a bit in…: Kroque ≠ François at La Buvette
- `post-73286ffe` the Heitlinger Brasserie menu keeps familiar classics from …: Heitlinger Brasserie ≠ Restaurant Albatros
- `post-73286ffe` the Heitlinger Brasserie menu keeps familiar classics from …: Heitlinger Brasserie ≠ Hotel Kreuzberghof
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Tulus Lotrek
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Barra
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: Johann Bäckerei ≠ Barlevain
- `post-9f93c25b` Borchardt is number 6 in his top 10: Borchardt ≠ Bohrschatz
- `post-9f93c25b` Borchardt has one of the most delicious Schnitzel in all of…: Borchardt ≠ Bohrschatz
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants: Mine ≠ Main
- `post-9f93c25b` Mine is at Meinekestraße 10 in Berlin: Mine ≠ Main
- `post-9f93c25b` Mine is really top: Mine ≠ Main
- `post-d232f1ca` ROY teamed up with BRLO again to bring back ROY Hops Kombuc…: ROY Kombucha ≠ BRLO
- `post-fc96acff` Facil is classic German fine dining with polished glass and…: Facil ≠ Hallmann & Klee
- `post-fc96acff` Facil's choreographed service may feel suffocating to some …: Facil ≠ Lorenz Adlon Esszimmer
- `post-fc96acff` Chef Pâtissier Thomas Yoshida has been at Facil since the v…: Facil ≠ Birds in the Kitchen
- `post-fc96acff` Joachim Gerner came to Facil in 2006 as sous-chef and has b…: Facil ≠ Forsthaus Strelitz
- `post-fc96acff` Felix Voges has curated Facil's wine list since opening: Facil ≠ Forsthaus Strelitz
- `post-fc96acff` the continuity of Facil's team is almost unheard of in the …: Facil ≠ Forsthaus Strelitz
- `post-fc96acff` the team's continuity explains a great deal about how Facil…: Facil ≠ Forsthaus Strelitz
- `post-fc96acff` Sarah Hallmann trained at Facil before opening Hallmann & K…: Hallmann & Klee ≠ Facil
- `post-fc96acff` Wenzel Pankratz, who came through Facil's kitchen, now runs…: Forsthaus Strelitz ≠ Cielo

### parts.amount (23)

- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-a2c14088` wonders whether there are two teams of chefs: —  ≠ 2 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-816a40e7` Döner and Schawarma for 1€ on 2.10.2026: 1 money ≠ 1 minutes
- `post-816a40e7` for the opening, Shawarma costs 1 Euro on Friday: 1 money ≠ 1 minutes
- `post-816a40e7` Shawarma costs 2 Euro on the second opening day: 2 money ≠ 2 minutes
- `post-816a40e7` Shawarma then costs 3 Euro on the third opening day: 3 money ≠ 3 minutes
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 minutes
- `post-816a40e7` the restaurant opens at 13:00 on Friday: —  ≠ 13 minutes
- `post-909ca5ee` Barlevain has nine tables that can be reserved in advance: —  ≠ 9 money
- `post-996efecb` the author ordered two hand brews: —  ≠ 2 minutes
- `post-b5e879f0` Restaurant India is at Bergmannstraße 100: —  ≠ 30 money
- `post-b5e879f0` Restaurant India has closed after 31 years: —  ≠ 31 money
- `post-babe1142` Peggy Bee opened about four weeks before the 2021 review: —  ≠ 4 minutes
- `post-babe1142` Peggy Bee's Berlin Ice Cream Week 2021 offering is a one-eu…: 1 money ≠ —
- `post-db280ef6` 572Pasta serves homemade pasta: —  ≠ 10 money
- `post-db280ef6` 572Pasta is at the corner of Bleibtreustraße: —  ≠ 10 money
- `post-fc96acff` the set lunch menu at Facil costs 88 EUR: 88 money ≠ —
- `post-fc96acff` the 2015 Vosne-Romanée cost 100 euros: 100 money ≠ —
- `post-fc96acff` Yoshida's Zen Garden plate showcases incredible technique: —  ≠ 88 money
- `post-fc96acff` Facil is cooking as well as it ever has, arguably better th…: —  ≠ 100 money
- `post-fc96acff` Berlin has too many small shared plates and neo-bistros cop…: —  ≠ 100 money

### places.extra (13)

- `post-3d9147ff` fatoushberlin
- `post-4a742b09` RiskyLounge (Village House)
- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-73286ffe` Restaurant Albatros
- `post-73286ffe` Hotel Kreuzberghof
- `post-8901fb9b` Otto and trio
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-93526d04` Süd Baklava
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-b2993d78` Markthalle Neun

### change.false (11)

- `review-7593dfff` the service went faster once the older gentleman showed up
- `post-4c3e2a10` the whole tomato becomes liquid
- `post-58a16831` Pêle-Mêle ends the era of avocado toast
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque.
- `post-935c2fd2` German gastronomy revenue fell by 4 percent
- `post-babe1142` buffalo ice cream has been increasing in popularity in recent years in Italy
- `post-d232f1ca` ROY Hops Kombucha is brought back in a collaboration with BRLO
- `post-fc96acff` The staff cast has changed little
- `post-fc96acff` Jonas Zörner is chef de cuisine at Lorenz Adlon Esszimmer
- `post-fc96acff` the restaurant has quietly gotten better
- `post-fc96acff` Facil has not lost its glamour at 25

### places.missed (11)

- `post-1e024518` Masalas
- `post-3d9147ff` Fatoush
- `post-4a742b09` Village House
- `post-517e8710` 60 Seconds to Napoli
- `post-8901fb9b` Papaya
- `post-8901fb9b` Gotcha
- `post-8901fb9b` Special Sauce
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-d232f1ca` ROY Kombucha
- `post-ea8d1506` Verōnika

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
- `post-fc96acff` Cielo: none ≠ Cielo Di Berlino (llm)

### change.missed (8)

- `review-4a46a87d` the new location isn't the same as the old one
- `review-4a46a87d` it has become a fast-food restaurant
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-e2a421e9` Butter Lindner was renamed to just Lindner
- `post-e2a421e9` After about 20 years Lindner is returning to its old name Butter Lindner
- `post-fc96acff` Facil has quietly gotten better

### match.brand (7)

- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Romeo's: Romeo's Sandwiches ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### match_isolated.branch (2)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only

### match.branch (1)

- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
