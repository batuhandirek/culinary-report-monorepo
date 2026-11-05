# Ingestion eval: new-sonnet

2026-11-05 14:48 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, claimsModel anthropic/claude-sonnet-5-5, labeller classifier
Tokens: 6,253,271 (826,967 input tokens from the prompt cache)
Spend: $0.182 (paid calls: classifiers)
Models: review-claims: anthropic/claude-sonnet-5-5 (51); claim-labels: typesafe-ai/jev-latest (105); post-claims: anthropic/claude-sonnet-5-5 (58); venue-match: anthropic/claude-haiku-5-5 (27)

## Reviews

| Metric | new-sonnet | stored | sq-sonnet | labels-jev | terms-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 100% (298/298) | 93% +7 | — | — | — |
| Claims that are real (of produced) | 100% (356/356) | 99% +1 | — | — | — |
| Sentiment | 97% (336/347) | 88% +9 | — | 98% -1 | — |
| Aspect, exact | 91% (316/347) | 71% +20 | — | 93% -2 | — |
| Aspect, right root | 95% (330/347) | 81% +14 | — | 96% -1 | — |
| Kind | 97% (336/347) | 67% +30 | — | 98% -1 | — |
| Kind given at all | 100% (347/347) | 4% +96 | — | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 74% (256/347) | — | — | 73% ±0 | — |
| Sentiment, among sure answers | 99% (254/256) | — | — | 100% -1 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 50% (172/347) | — | — | 49% +1 | — |
| Aspect, exact, among sure answers | 97% (167/172) | — | — | 99% -2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 78% (269/347) | — | — | 73% +4 | — |
| Kind, among sure answers | 99% (265/269) | — | — | 99% -1 | — |
| Changes that are changes | 67% (2/3) | 56% +11 | — | 76% -10 | — |
| Changes found | 100% (2/2) | 80% +20 | — | 81% +19 | — |
| Amount | 64% (9/14) | 41% +23 | — | 73% -8 | — |
| Foods named, precision | 90% (124/138) | 32% +57 | — | — | — |
| Foods named, recall | 91% (116/127) | 23% +68 | — | — | — |

## Posts and articles

| Metric | new-sonnet | stored | sq-sonnet | labels-jev | terms-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 94% (571/606) | 56% +39 | 100% -6 | — | — |
| Claims that are real (of produced) | 95% (798/844) | 95% ±0 | 100% -5 | — | — |
| Sentiment | 95% (736/773) | 86% +10 | 100% -5 | 97% -2 | — |
| Aspect, exact | 82% (632/773) | 63% +19 | 100% -18 | 87% -5 | — |
| Aspect, right root | 88% (680/773) | 78% +10 | 100% -12 | 92% -4 | — |
| Kind | 92% (712/773) | 47% +45 | 100% -8 | 94% -2 | — |
| Kind given at all | 100% (773/773) | 4% +96 | 100% ±0 | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 66% (511/773) | — | — | 67% -1 | — |
| Sentiment, among sure answers | 98% (499/511) | — | — | 100% -2 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 33% (256/773) | — | — | 40% -7 | — |
| Aspect, exact, among sure answers | 96% (245/256) | — | — | 98% -2 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 60% (461/773) | — | — | 60% ±0 | — |
| Kind, among sure answers | 98% (451/461) | — | — | 98% -1 | — |
| Changes that are changes | 53% (16/30) | 46% +7 | — | 50% +3 | — |
| Changes found | 100% (10/10) | 38% +63 | — | 94% +6 | — |
| Amount | 79% (22/28) | 46% +32 | — | 84% -6 | — |
| Foods named, precision | 80% (458/569) | 46% +34 | 100% -20 | — | — |
| Foods named, recall | 94% (440/467) | 39% +55 | 100% -6 | — | — |
| Subject (place, city, none) | 96% (845/883) | 85% +11 | 100% -4 | — | — |
| Claim on the right place | 88% (697/792) | 85% +3 | — | — | — |
| Places found | 92% (102/111) | 73% +19 | — | — | — |
| Places that are places | 92% (102/111) | 85% +7 | — | — | — |
| Match: brand (found places) | 91% (93/102) | 92% -1 | — | — | — |
| Match: branch (right brand) | 96% (72/75) | 97% -1 | — | — | — |
| Match on the reference's places: brand | 90% (100/111) | — | — | — | — |
| Match on the reference's places: branch | 99% (81/82) | — | — | — | — |
| Promotional flag | 100% (58/58) | 82% +18 | 100% ±0 | — | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | new-sonnet (train) | new-sonnet (test) | sq-sonnet (test) | labels-jev (test) | terms-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 100% (298/298) | — | — | — |
| Claims that are real (of produced) | — | 100% (356/356) | — | — | — |
| Sentiment | — | 97% (336/347) | — | 98% -1 | — |
| Aspect, exact | — | 91% (316/347) | — | 94% -3 | — |
| Aspect, right root | — | 95% (330/347) | — | 97% -2 | — |
| Kind | — | 97% (336/347) | — | 98% -1 | — |
| Kind given at all | — | 100% (347/347) | — | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 74% (256/347) | — | 71% +3 | — |
| Sentiment, among sure answers | — | 99% (254/256) | — | 100% -1 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 50% (172/347) | — | 50% ±0 | — |
| Aspect, exact, among sure answers | — | 97% (167/172) | — | 100% -3 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 78% (269/347) | — | 78% ±0 | — |
| Kind, among sure answers | — | 99% (265/269) | — | 99% ±0 | — |
| Changes that are changes | — | 67% (2/3) | — | 67% ±0 | — |
| Changes found | — | 100% (2/2) | — | 100% ±0 | — |
| Amount | — | 64% (9/14) | — | 64% ±0 | — |
| Foods named, precision | — | 90% (124/138) | — | — | — |
| Foods named, recall | — | 91% (116/127) | — | — | — |

### Posts and articles

| Metric | new-sonnet (train) | new-sonnet (test) | sq-sonnet (test) | labels-jev (test) | terms-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 94% (571/606) | 100% -6 | — | — |
| Claims that are real (of produced) | — | 95% (798/844) | 100% -5 | — | — |
| Sentiment | — | 95% (736/773) | 100% -5 | 97% -2 | — |
| Aspect, exact | — | 82% (632/773) | 100% -18 | 86% -4 | — |
| Aspect, right root | — | 88% (680/773) | 100% -12 | 92% -4 | — |
| Kind | — | 92% (712/773) | 100% -8 | 93% -1 | — |
| Kind given at all | — | 100% (773/773) | 100% ±0 | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 66% (511/773) | — | 66% ±0 | — |
| Sentiment, among sure answers | — | 98% (499/511) | — | 100% -2 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 33% (256/773) | — | 36% -3 | — |
| Aspect, exact, among sure answers | — | 96% (245/256) | — | 99% -3 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 60% (461/773) | — | 59% +1 | — |
| Kind, among sure answers | — | 98% (451/461) | — | 98% ±0 | — |
| Changes that are changes | — | 53% (16/30) | — | 45% +8 | — |
| Changes found | — | 100% (10/10) | — | 100% ±0 | — |
| Amount | — | 79% (22/28) | — | 82% -4 | — |
| Foods named, precision | — | 80% (458/569) | 100% -20 | — | — |
| Foods named, recall | — | 94% (440/467) | 100% -6 | — | — |
| Subject (place, city, none) | — | 96% (845/883) | 100% -4 | — | — |
| Claim on the right place | — | 88% (697/792) | — | — | — |
| Places found | — | 92% (102/111) | — | — | — |
| Places that are places | — | 92% (102/111) | — | — | — |
| Match: brand (found places) | — | 91% (93/102) | — | — | — |
| Match: branch (right brand) | — | 96% (72/75) | — | — | — |
| Match on the reference's places: brand | — | 90% (100/111) | — | — | — |
| Match on the reference's places: branch | — | 99% (81/82) | — | — | — |
| Promotional flag | — | 100% (58/58) | 100% ±0 | — | — |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 100% (140/140) | 100% (161/161) | 91% (143/158) | 96% (152/158) | — | — |
| hard | 100% (18/18) | 100% (25/25) | 83% (20/24) | 100% (24/24) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 100% (102/102) | 90% (87/97) | 96% (93/97) | — | — |
| lang:en | 100% (71/71) | 100% (83/83) | 91% (74/81) | 100% (81/81) | — | — |
| lang:other | 100% (96/96) | 100% (116/116) | 89% (102/114) | 98% (112/114) | — | — |
| lang:tr | 100% (44/44) | 100% (55/55) | 96% (53/55) | 91% (50/55) | — | — |
| length:long | 100% (80/80) | 100% (95/95) | 93% (92/99) | 93% (92/99) | — | — |
| length:medium | 100% (194/194) | 100% (236/236) | 90% (201/223) | 98% (219/223) | — | — |
| length:short | 100% (24/24) | 100% (25/25) | 92% (23/25) | 100% (25/25) | — | — |
| no-transcript | 85% (90/106) | 97% (111/114) | 83% (97/117) | 96% (112/117) | 92% (33/36) | 94% (31/33) |
| own | 100% (28/28) | 100% (39/39) | 89% (32/36) | 97% (35/36) | 100% (6/6) | 83% (5/6) |
| places:few | 97% (495/512) | 96% (699/729) | 81% (542/670) | 95% (636/670) | 94% (59/63) | 95% (56/59) |
| places:many | 82% (73/89) | 86% (96/112) | 87% (87/100) | 97% (97/100) | 89% (42/47) | 86% (36/42) |
| places:none | 60% (3/5) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (1/1) | 100% (1/1) |
| platform:blog | 98% (330/338) | 95% (487/515) | 80% (364/454) | 95% (430/454) | 100% (31/31) | 97% (30/31) |
| platform:google | 100% (298/298) | 100% (356/356) | 91% (316/347) | 97% (336/347) | — | — |
| platform:instagram | 86% (57/66) | 100% (66/66) | 78% (56/72) | 96% (69/72) | 81% (13/16) | 92% (12/13) |
| platform:tiktok | 91% (184/202) | 93% (245/263) | 86% (212/247) | 96% (237/247) | 91% (58/64) | 88% (51/58) |
| size:large | 97% (282/292) | 92% (412/446) | 81% (316/392) | 94% (369/392) | 92% (34/37) | 91% (31/34) |
| size:medium | 93% (236/255) | 97% (319/330) | 83% (259/312) | 97% (303/312) | 94% (50/53) | 92% (46/50) |
| size:small | 90% (53/59) | 99% (67/68) | 83% (57/69) | 93% (64/69) | 86% (18/21) | 89% (16/18) |
| stars:1 | 100% (49/49) | 100% (56/56) | 95% (55/58) | 93% (54/58) | — | — |
| stars:2 | 100% (27/27) | 100% (30/30) | 90% (26/29) | 100% (29/29) | — | — |
| stars:3 | 100% (85/85) | 100% (104/104) | 89% (93/105) | 97% (102/105) | — | — |
| stars:4 | 100% (54/54) | 100% (66/66) | 92% (57/62) | 100% (62/62) | — | — |
| stars:5 | 100% (83/83) | 100% (100/100) | 91% (85/93) | 96% (89/93) | — | — |
| transcript | 93% (151/162) | 93% (200/215) | 85% (171/202) | 96% (194/202) | 86% (38/44) | 84% (32/38) |

## Misses

### parts.aspect (172)

- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the pain was quickly made, nothing special: food ≠ cooking
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-28e4170f` the market hall was really fun to look around: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-52ef0f64` the Vöner Döner was quite good: taste ≠ food
- `review-5582d6b8` there were some issues too: none ≠ outdoor_seating
- `review-5582d6b8` skip the matcha latte: drink_quality ≠ outdoor_seating
- `review-5582d6b8` had iced matcha latte: none ≠ drinks
- `review-58540992` the service at the table was friendly: friendliness ≠ attentiveness
- `review-6217ec70` the kebab had a generous amount of sauce: portion_size ≠ cooking
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-70467fba` the kebab was not extraordinary: taste ≠ none
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: none ≠ location
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-90e99b19` the place might be okay if passing nearby: none ≠ location
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` except for one staff member, but everyone has a bad day: friendliness ≠ service
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ food_hygiene
- `review-bf2322b7` the Salat was fresh: freshness ≠ taste
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ food
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ location
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `review-fb1415dc` the cleanliness and service issues are not that bad: none ≠ service
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: menu_variety ≠ authenticity
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: drink_quality ≠ none
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are washed-processed: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: drinks ≠ ingredient_quality
- `post-1e024518` the Masala Dosa is filled with spicy potato: seasoning ≠ food
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: atmosphere ≠ none
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: ingredient_quality ≠ seasoning
- … 132 more in issues.jsonl

### parts.foods (141)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [viande poulet, sandwich]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [köri sosu]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [tavuk eti]
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: [] ≠ [döner]
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: [kebab] ≠ [kebab, sauce]
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: [gemuse kebaba, wrapa] ≠ [gemuse kebaba, wrapa, kebabów]
- `review-3e075e7e` the whole "muala" thing is ridiculous: [] ≠ [muala]
- `review-3f2a2713` you can use the ketchup provided for a vegan burger: [ketchup] ≠ [burger, ketchup]
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-70467fba` the kebab is definitely worth trying: [kebab] ≠ []
- `review-70467fba` the kebab was not extraordinary: [kebab] ≠ []
- `review-70467fba` the kebab was not worth waiting forever for: [kebab] ≠ []
- `review-71868223` had doubts about going to Gemüse Kebab: [] ≠ [Gemüse kebab]
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneriydi]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ [dönerciye]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ [döneriydi]
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ [dönerciye]
- `review-ec04d472` the reviewer wishes they could un-eat the tabla de entrantes: [tabla de entrantes] ≠ []
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` The El Líbano beans are washed-processed: [beans] ≠ [Caturra, Colombia, Castillo, Tabi]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: [beans] ≠ []
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: [beans] ≠ []
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: [EL LÍBANO Espresso] ≠ [stone fruits, vanilla, cocoa]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ [Arabica, espresso]
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: [Sambar, Chutneys] ≠ [Masala Dosa, Sambar, Chutneys]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satis…: [Mrs. Chens Blue Pearl] ≠ [Mrs. Chens Blue Pearl, Garnelen]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-3b1b4cd6` the chicken is incredibly crispy: [chicken] ≠ []
- … 101 more in issues.jsonl

### claims.place (95)

- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen Jun…: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the new owners gave the three women a share of the profits: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the restaurant in Mitte has new owners: Yumcha Heroes ≠ Yumcha Heroes
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
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufakt…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` ten dumplings cost 16 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- … 55 more in issues.jsonl

### parts.kind (72)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-0ac47c59` everyone working there is Turkish: fact ≠ opinion
- `review-0ac47c59` the kebab shop's name is Turkish: fact ≠ opinion
- `review-5582d6b8` don't get the matcha, it is undrinkable: opinion ≠ verdict
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-70467fba` the kebab was not worth waiting forever for: opinion ≠ verdict
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ change
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ change
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: fact ≠ opinion
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: opinion ≠ fact
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: verdict ≠ fact
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their …: fact ≠ opinion
- `post-4f942afd` the egg has a nice contrast of yolk and white: opinion ≠ fact
- `post-57ab8313` El Maestro de la Birria and the team put great effort into …: opinion ≠ event
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: opinion ≠ event
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: opinion ≠ verdict
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle: opinion ≠ change
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: fact ≠ change
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: fact ≠ change
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ opinion
- `post-59699006` Coffee houses are having a renaissance in Berlin: fact ≠ change
- `post-60ff28c2` Sandos is a Japanese sandwich and matcha spot: fact ≠ event
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- `post-60ff28c2` Matcha is generally best with Kokosmilch: opinion ≠ verdict
- `post-674e7322` Mrs. Robinsons is closed: fact ≠ change
- `post-674e7322` Jones ice cream is the best cheat day treat: verdict ≠ opinion
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` Kroque also serves drinks: fact ≠ opinion
- `post-6c0e92d2` the freshly mixed raspberry daiquiri is worth trying with a…: opinion ≠ verdict
- `post-73286ffe` the Heitlinger Brasserie promises special evenings in a new…: opinion ≠ event
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: fact ≠ opinion
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: fact ≠ opinion
- … 32 more in issues.jsonl

### parts.sentiment (48)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` everyone working there is Turkish: neutral ≠ negative
- `review-0ac47c59` the kebab shop's name is Turkish: neutral ≠ negative
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-5582d6b8` sit inside: positive ≠ negative
- `review-90e99b19` the place might be okay if passing nearby: mixed ≠ negative
- `review-b31c1e48` the robot cat couldn't reach the area by the step: negative ≠ neutral
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-1b8b0789` the owner is the same in person as on the internet, no filt…: neutral ≠ negative
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: neutral ≠ positive
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: positive ≠ neutral
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: negative ≠ positive
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4a742b09` some days Village House is packed: neutral ≠ mixed
- `post-4f942afd` the author neither loves nor hates hummus: mixed ≠ positive
- `post-4f942afd` the author has been to Akkawy often and takes visiting frie…: positive ≠ neutral
- `post-4f942afd` the egg has a nice contrast of yolk and white: positive ≠ neutral
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ neutral
- `post-6c0e92d2` the La Dindz has fresh lemon notes, feta and marinated anti…: positive ≠ neutral
- `post-6c0e92d2` Kroque also serves drinks: neutral ≠ positive
- `post-75c11d7c` Nichi Getsu's street, Rotherstraße in Friedrichshain, feels…: positive ≠ negative
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-816a40e7` there are not many shawarma and döner shops in this area: neutral ≠ negative
- `post-8901fb9b` Tobias loves Papaya: positive ≠ neutral
- `post-8901fb9b` Back and Break is in Mitte: neutral ≠ positive
- `post-909ca5ee` Barlevain opened in spring: neutral ≠ positive
- `post-909ca5ee` The Oeuf Mayo is currently served with a Bärlauchmayonnaise: neutral ≠ positive
- `post-93526d04` the unnamed baklava shop has 4.8 stars: neutral ≠ positive
- `post-996efecb` the staff explained the small volume was intentional: neutral ≠ mixed
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: positive ≠ neutral
- `post-b5e879f0` on the last evening before closing the owner only reluctant…: positive ≠ negative
- `post-babe1142` the owner Enrico is Roman-born: neutral ≠ positive
- `post-d232f1ca` ROY Hops Kombucha is alcohol-free: neutral ≠ positive
- … 8 more in issues.jsonl

### claims.extra (46)

- `post-22c25ac1` there is no frills around the dumplings
- `post-4a742b09` running a restaurant in your 30s feels different
- `post-4c3e2a10` the owner wants his customers to be served well and not lose them
- `post-4f942afd` Akkawy is located at Kopernikusstraße 8, 10245 Berlin-Friedrichshain
- `post-4f942afd` the author says hummus is not his absolute favourite dish
- `post-4f942afd` hummus is better than guacamole or other hyped dippy-spready things
- `post-4f942afd` Julian experiments with the dishes Akkawy serves
- `post-4f942afd` the mushroom-hummus dish is the best example of Akkawy's experimentation
- `post-4f942afd` Za'atar is a middle-Eastern herb related to oregano
- `post-4f942afd` the textures are the main counterpoint to the endlessly smooth hummus at Akkawy
- `post-4f942afd` the writer is perhaps coming around to the idea of hummus after the Akkawy visit
- `post-524765b0` Kírkē Deli is on Böckhstraße in the Graefekiez
- `post-58a16831` Nyde is a café in Schöneberg
- `post-674e7322` Mrs. Robinsons was one of the strongest casual fine dining addresses in the city
- `post-674e7322` Mrs. Robinsons has been a BFS favorite since opening
- `post-6c0e92d2` Lukas says the combining of sides and dips at Kroque is almost interactive
- `post-6c0e92d2` Kroque is open to anything for the future
- `post-8901fb9b` a very old restaurant in Charlottenburg is a controversial pick for best restaurant in Be…
- `post-8901fb9b` the old restaurant in Charlottenburg is a 10 out of 10 experience
- `post-8901fb9b` the Sülze is a meat aspic with pan fried potatoes and remoulade sauce
- `post-8901fb9b` the meat aspic is good stuff
- `post-8901fb9b` the best restaurant in Berlin is a controversial pick in Charlottenburg
- `post-8901fb9b` the Charlottenburg restaurant is a very old place and a 10 out of 10 experience
- `post-8901fb9b` the meat aspic comes with pan fried potatoes and remoulade sauce
- `post-8901fb9b` the meat aspic with pan fried potatoes and remoulade sauce is good
- `post-8901fb9b` Bonanza Coffee is in a backyard
- `post-8901fb9b` the tacos are Persian, with dried mint, goat cheese and feta
- `post-8901fb9b` he likes the tacos
- `post-8901fb9b` Special Sauce is about curry versus curry powder
- `post-93526d04` Sangam: they tested the Chicken biryani, Butter Chicken and Chicken Tiger
- `post-93526d04` whether the döner at Sagros Gemüse Kebab deserves its hype will be covered in an extra vi…
- `post-b5e879f0` India moved away from Bergmannstraße
- `post-b5e879f0` India opened when Bergmannstraße was not yet a heavily commercialised shopping strip
- `post-b5e879f0` India's team thanked guests for over 31 years
- `post-b5e879f0` India's owner wrote that a restaurant lives from its guests and India lived from them
- `post-b5e879f0` India's farewell letter was stuck on the window
- `post-b5e879f0` the author only learned the name of the restaurant India when it closed
- `post-b5e879f0` India is an unassuming, special place on Bergmannstraße, the author's insider tip
- `post-babe1142` Peggy Bee was first visited in 2021
- `post-babe1142` Eis cravings become problematic in Germany once the sun shines
- … 6 more in issues.jsonl

### claims.subject (38)

- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-60ff28c2` Matcha is generally best with Kokosmilch: none ≠ place
- `post-75c11d7c` Nichi Getsu's street, Rotherstraße in Friedrichshain, feels…: place ≠ none
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` the sushi rice is seasoned with Akazu, the red rice vinegar…: place ≠ none
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-8901fb9b` the pizza at Common is amazing: place ≠ none
- `post-8901fb9b` Max does a hell of a job with the baking at Common: place ≠ none
- `post-8901fb9b` Tobias loves Papaya: place ≠ none
- `post-8901fb9b` at Papaya he eats a classic red curry with duck: place ≠ none
- `post-8901fb9b` Gotcha does fried pig ears: place ≠ none
- `post-8901fb9b` Gotcha does a paella served as a whole pan: place ≠ none
- `post-8901fb9b` Common's pizza is amazing: place ≠ none
- `post-8901fb9b` Common does a hell of a job with baking and stuff: place ≠ none
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ place
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ place
- `post-b5e879f0` a Boulettenbrötchen at the bakery next door costs 2,50 Euro: city ≠ place
- `post-b5e879f0` the Boulettenbrötchen tastes fluffier than any oat milk foam: city ≠ place
- `post-b5e879f0` the new international deli supermarket opposite sells Halwa…: city ≠ none
- `post-d232f1ca` ROY teamed up with BRLO again to bring back ROY Hops Kombuc…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha has all the floral, fruity character of A…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is balanced by the kombucha's gentle swee…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is smooth, refreshing and just bitter eno…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is alcohol-free: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is never short on flavour: place ≠ none
- `post-db280ef6` 572Pasta ends overpriced lunch: place ≠ city
- `post-e2a421e9` Berliners stay stubborn when it comes to traditional shops: city ≠ place
- `post-fc96acff` Berlin's big fine dining houses train and send out little t…: city ≠ place
- `post-fc96acff` the technique of German fine dining is always on the money: none ≠ place

### claims.missed (35)

- `post-165a9370` the Indian restaurant is a gem of a spot
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
- `post-517e8710` pizza at 60 Seconds to Napoli
- `post-57ab8313` Berlin should go to Taco & Gringo and learn
- `post-58a16831` Nyde is run by carpenter Antonia Wagner
- `post-650ede57` question whether oil belongs in pasta water
- `post-674e7322` Café Frieda is run by its owners Samina & Ben
- `post-674e7322` Café Frieda is one of the absolutely strongest casual fine dining addresses in the city
- `post-674e7322` Café Frieda has been a BFS favourite since its opening
- `post-68b0cd44` Panda Meister is budget friendly
- `post-68b0cd44` Panda Meister is veggie friendly
- `post-75c11d7c` Nichi Getsu's concept has a clever sustainability story
- `post-75c11d7c` bring your sushi-loving friends to Nichi Getsu
- `post-816a40e7` the restaurant can't get any better
- `post-816a40e7` the restaurant has lots of delicious things
- `post-8901fb9b` Common from Max has the best pizza
- `post-8901fb9b` Gotcha is the most underrated spot in Berlin
- `post-8901fb9b` Gotcha is a really, really cool spot
- `post-93526d04` they tried the Chicken biryani, Butter Chicken and Chicken Tiger at Sangam
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants
- `post-a61ba144` asks which hyped food spots in Berlin people can recommend
- `post-b5e879f0` commercial rents on Bergmannstraße increased
- `post-babe1142` Peggy Bee is a hidden gem
- `post-babe1142` Peggy Bee deserves a queue and will get one
- `post-d90ac864` a Russian tries Arabic food at Restaurant Al Rabuah

### change.false (15)

- `review-7593dfff` once the older gentleman appeared, everything went faster
- `post-22c25ac1` the Manufaktur is now opening, with Mirsad Mujanovic and Anjelo Nguyen as owners
- `post-22c25ac1` the Manufaktur offers a charming street sale from now on
- `post-58a16831` Pêle-Mêle in Neukölln ends the era of the avocado sandwich
- `post-59699006` Café Amano opens its green window to serve passers-by coffee and Aperol Spritz
- `post-59699006` coffee houses are experiencing a renaissance in Berlin
- `post-b5e879f0` queuing is the new black on Bergmannstraße
- `post-b5e879f0` India moved away from Bergmannstraße
- `post-b5e879f0` India has ceramic tiles with colourful depictions of Indian deities, now in the dark
- `post-babe1142` in Italy buffalo ice cream is more a trend than a tradition and has been growing in popul…
- `post-c4e7c0a9` a beautiful blue wall colour appeared in the left area when the old wallpaper was removed…
- `post-c4e7c0a9` seasonal dishes change regularly at Sabon
- `post-d232f1ca` ROY Hops Kombucha is brought back in a collaboration with BRLO
- `post-e2a421e9` the return to the name is a bow to long-standing customers who patiently kept the name fo…
- `post-fc96acff` Facil's kitchen team has changed very little

### parts.amount (11)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ —
- `review-21de844d` waited over half an hour before being served: 30 minutes ≠ —
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: 60 minutes ≠ —
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-e12f5f74` waited in line for at least twenty minutes: 20 minutes ≠ —
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —
- `post-68b0cd44` the bian bian noodles cost only 8.90: 8.9 money ≠ —
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-babe1142` Peggy Bee's Berlin Ice Cream Week 2021 offering is a one-eu…: 1 money ≠ —
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: 1 money ≠ —
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money

### match_isolated.brand (11)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### places.missed (9)

- `post-1e024518` Masalas
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Common
- `post-8901fb9b` Papaya
- `post-8901fb9b` Gotcha
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO

### match.brand (9)

- `post-3b1b4cd6` Crispy's Chicken Berlin (Schöneberg): Crispy's Chicken Berlin (Schöneberg) ≠ none (none)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-93526d04` Nastys: Nastys - TRY NOT TO COME AGAIN. ≠ none (none)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### places.extra (9)

- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-57ab8313` El Maestro de la Birria
- `post-816a40e7` Surich
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-b5e879f0` Bäcker nebenan

### match.branch (3)

- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Yumcha Heroes Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only

### match_isolated.branch (1)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
