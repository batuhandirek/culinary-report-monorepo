# Ingestion eval: sq-sonnet

2026-11-05 14:54 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Reading: reader split, model anthropic/claude-sonnet-5-5
Tokens: 7,368,003 (6,491,319 input tokens from the prompt cache)
Models: review-claims: anthropic/claude-sonnet-5-5 (51); claim-parts: anthropic/claude-sonnet-5-5 (103); post-claims: anthropic/claude-sonnet-5-5 (58); venue-match: anthropic/claude-haiku-5-5 (27)

## Reviews

| Metric | sq-sonnet | stored | new-sonnet | labels-jev | terms-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 100% (298/298) | 93% +7 | 100% ±0 | — | — |
| Claims that are real (of produced) | 100% (350/351) | 99% +1 | 100% ±0 | — | — |
| Sentiment | 97% (336/347) | 88% +9 | 97% ±0 | 98% -1 | — |
| Aspect, exact | 93% (323/347) | 71% +22 | 91% +2 | 93% ±0 | — |
| Aspect, right root | 96% (333/347) | 81% +15 | 95% +1 | 96% ±0 | — |
| Kind | 97% (336/347) | 67% +30 | 97% ±0 | 98% -1 | — |
| Kind given at all | 100% (347/347) | 4% +96 | 100% ±0 | 100% ±0 | — |
| Changes that are changes | 67% (2/3) | 56% +11 | 67% ±0 | 76% -10 | — |
| Changes found | 100% (2/2) | 80% +20 | 100% ±0 | 81% +19 | — |
| Amount | 93% (13/14) | 41% +52 | 64% +29 | 73% +20 | — |
| Foods named, precision | 86% (115/133) | 32% +54 | 90% -3 | — | — |
| Foods named, recall | 88% (111/126) | 23% +65 | 91% -3 | — | — |

## Posts and articles

| Metric | sq-sonnet | stored | new-sonnet | labels-jev | terms-sonnet |
|---|---|---|---|---|---|
| Claims found (of the reference) | 93% (563/606) | 56% +37 | 94% -1 | — | — |
| Claims that are real (of produced) | 94% (765/817) | 95% -1 | 95% -1 | — | — |
| Sentiment | 96% (726/760) | 86% +10 | 95% ±0 | 97% -1 | — |
| Aspect, exact | 86% (653/760) | 63% +23 | 82% +4 | 87% -1 | — |
| Aspect, right root | 91% (690/760) | 78% +13 | 88% +3 | 92% -2 | — |
| Kind | 94% (715/760) | 47% +47 | 92% +2 | 94% ±0 | — |
| Kind given at all | 100% (760/760) | 4% +96 | 100% ±0 | 100% ±0 | — |
| Changes that are changes | 68% (15/22) | 46% +22 | 53% +15 | 50% +18 | — |
| Changes found | 90% (9/10) | 38% +53 | 100% -10 | 94% -4 | — |
| Amount | 81% (25/31) | 46% +34 | 79% +2 | 84% -4 | — |
| Foods named, precision | 82% (449/547) | 46% +36 | 80% +2 | — | — |
| Foods named, recall | 96% (433/451) | 39% +57 | 94% +2 | — | — |
| Subject (place, city, none) | 97% (824/847) | 85% +12 | 96% +2 | — | — |
| Claim on the right place | 86% (679/789) | 85% +1 | 88% -2 | — | — |
| Places found | 92% (102/111) | 73% +19 | 92% ±0 | — | — |
| Places that are places | 91% (102/112) | 85% +6 | 92% -1 | — | — |
| Match: brand (found places) | 89% (91/102) | 92% -3 | 91% -2 | — | — |
| Match: branch (right brand) | 96% (72/75) | 97% -1 | 96% ±0 | — | — |
| Match on the reference's places: brand | 90% (100/111) | — | 90% ±0 | — | — |
| Match on the reference's places: branch | 99% (81/82) | — | 99% ±0 | — | — |
| Promotional flag | 100% (58/58) | 82% +18 | 100% ±0 | — | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | sq-sonnet (train) | sq-sonnet (test) | new-sonnet (test) | labels-jev (test) | terms-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 100% (298/298) | 100% ±0 | — | — |
| Claims that are real (of produced) | — | 100% (350/351) | 100% ±0 | — | — |
| Sentiment | — | 97% (336/347) | 97% ±0 | 98% -1 | — |
| Aspect, exact | — | 93% (323/347) | 91% +2 | 94% -1 | — |
| Aspect, right root | — | 96% (333/347) | 95% +1 | 97% -1 | — |
| Kind | — | 97% (336/347) | 97% ±0 | 98% -1 | — |
| Kind given at all | — | 100% (347/347) | 100% ±0 | 100% ±0 | — |
| Changes that are changes | — | 67% (2/3) | 67% ±0 | 67% ±0 | — |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | — |
| Amount | — | 93% (13/14) | 64% +29 | 64% +29 | — |
| Foods named, precision | — | 86% (115/133) | 90% -3 | — | — |
| Foods named, recall | — | 88% (111/126) | 91% -3 | — | — |

### Posts and articles

| Metric | sq-sonnet (train) | sq-sonnet (test) | new-sonnet (test) | labels-jev (test) | terms-sonnet (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 93% (563/606) | 94% -1 | — | — |
| Claims that are real (of produced) | — | 94% (765/817) | 95% -1 | — | — |
| Sentiment | — | 96% (726/760) | 95% ±0 | 97% -1 | — |
| Aspect, exact | — | 86% (653/760) | 82% +4 | 86% ±0 | — |
| Aspect, right root | — | 91% (690/760) | 88% +3 | 92% -1 | — |
| Kind | — | 94% (715/760) | 92% +2 | 93% +1 | — |
| Kind given at all | — | 100% (760/760) | 100% ±0 | 100% ±0 | — |
| Changes that are changes | — | 68% (15/22) | 53% +15 | 45% +23 | — |
| Changes found | — | 90% (9/10) | 100% -10 | 100% -10 | — |
| Amount | — | 81% (25/31) | 79% +2 | 82% -1 | — |
| Foods named, precision | — | 82% (449/547) | 80% +2 | — | — |
| Foods named, recall | — | 96% (433/451) | 94% +2 | — | — |
| Subject (place, city, none) | — | 97% (824/847) | 96% +2 | — | — |
| Claim on the right place | — | 86% (679/789) | 88% -2 | — | — |
| Places found | — | 92% (102/111) | 92% ±0 | — | — |
| Places that are places | — | 91% (102/112) | 92% -1 | — | — |
| Match: brand (found places) | — | 89% (91/102) | 91% -2 | — | — |
| Match: branch (right brand) | — | 96% (72/75) | 96% ±0 | — | — |
| Match on the reference's places: brand | — | 90% (100/111) | 90% ±0 | — | — |
| Match on the reference's places: branch | — | 99% (81/82) | 99% ±0 | — | — |
| Promotional flag | — | 100% (58/58) | 100% ±0 | — | — |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 100% (140/140) | 100% (159/159) | 94% (149/158) | 96% (151/158) | — | — |
| hard | 94% (17/18) | 100% (22/22) | 91% (21/23) | 100% (23/23) | 100% (2/2) | 100% (2/2) |
| lang:de | 100% (87/87) | 100% (102/102) | 94% (90/96) | 97% (93/96) | — | — |
| lang:en | 100% (71/71) | 100% (83/83) | 90% (73/81) | 99% (80/81) | — | — |
| lang:other | 100% (96/96) | 100% (112/112) | 93% (106/114) | 96% (110/114) | — | — |
| lang:tr | 100% (44/44) | 98% (53/54) | 96% (54/56) | 95% (53/56) | — | — |
| length:long | 100% (80/80) | 100% (92/92) | 88% (88/100) | 94% (94/100) | — | — |
| length:medium | 100% (194/194) | 100% (233/234) | 95% (210/222) | 98% (217/222) | — | — |
| length:short | 100% (24/24) | 100% (25/25) | 100% (25/25) | 100% (25/25) | — | — |
| no-transcript | 75% (80/106) | 96% (98/102) | 85% (88/103) | 91% (94/103) | 97% (35/36) | 91% (32/35) |
| own | 96% (27/28) | 100% (35/35) | 91% (32/35) | 97% (34/35) | 100% (6/6) | 83% (5/6) |
| places:few | 95% (484/512) | 94% (669/710) | 86% (563/656) | 95% (623/656) | 95% (60/63) | 93% (56/60) |
| places:many | 85% (76/89) | 89% (93/104) | 86% (87/101) | 99% (100/101) | 87% (41/47) | 83% (34/41) |
| places:none | 60% (3/5) | 100% (3/3) | 100% (3/3) | 100% (3/3) | 100% (1/1) | 100% (1/1) |
| platform:blog | 98% (330/338) | 93% (469/505) | 86% (388/450) | 95% (429/450) | 100% (31/31) | 97% (30/31) |
| platform:google | 100% (298/298) | 100% (350/351) | 93% (323/347) | 97% (336/347) | — | — |
| platform:instagram | 76% (50/66) | 98% (57/58) | 84% (52/62) | 90% (56/62) | 94% (15/16) | 87% (13/15) |
| platform:tiktok | 91% (183/202) | 94% (239/254) | 86% (213/248) | 97% (241/248) | 88% (56/64) | 86% (48/56) |
| size:large | 97% (284/292) | 92% (392/427) | 86% (331/384) | 95% (365/384) | 89% (33/37) | 88% (29/33) |
| size:medium | 91% (231/255) | 95% (309/325) | 86% (268/312) | 97% (303/312) | 92% (49/53) | 92% (45/49) |
| size:small | 81% (48/59) | 98% (64/65) | 84% (54/64) | 91% (58/64) | 95% (20/21) | 85% (17/20) |
| stars:1 | 100% (49/49) | 100% (54/54) | 95% (56/59) | 95% (56/59) | — | — |
| stars:2 | 100% (27/27) | 100% (30/30) | 86% (25/29) | 100% (29/29) | — | — |
| stars:3 | 100% (85/85) | 100% (102/102) | 90% (94/105) | 96% (101/105) | — | — |
| stars:4 | 100% (54/54) | 98% (65/66) | 97% (60/62) | 98% (61/62) | — | — |
| stars:5 | 100% (83/83) | 100% (99/99) | 96% (88/92) | 97% (89/92) | — | — |
| transcript | 94% (153/162) | 94% (198/210) | 86% (177/207) | 98% (203/207) | 82% (36/44) | 81% (29/36) |

## Misses

### parts.aspect (131)

- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-070860ca` ordered on a Sunday night for delivery through Wolt: delivery_platform ≠ none
- `review-070860ca` received the wrong order: order_accuracy ≠ delivery_platform
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-0ac47c59` the chicken meat was in the döner: food ≠ authenticity
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: presentation ≠ food
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-5582d6b8` they were given menus: service ≠ none
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ none
- `review-5582d6b8` the friend barely touched the table and the spoons fell: interior ≠ dining_area
- `review-5582d6b8` the tables outside are very wobbly: outdoor_seating ≠ dining_area
- `review-5582d6b8` sit inside: outdoor_seating ≠ drink_quality
- `review-58540992` the service at the table was attentive: attentiveness ≠ friendliness
- `review-58540992` the table service is the reason for giving any stars at all: service ≠ friendliness
- `review-6217ec70` the kebab had a generous amount of sauce: portion_size ≠ cooking
- `review-70467fba` the kebab was not extraordinary: taste ≠ none
- `review-75c84f72` Markthalle Neun is a nice place: none ≠ interior
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` the robot cat couldn't reach the area by the step: service ≠ speed_of_service
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ none
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: service ≠ space
- `review-e12f5f74` the staff were not Turkish: service ≠ authenticity
- `review-fb1415dc` the cleanliness and service issues are not that bad: none ≠ service
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: menu_variety ≠ authenticity
- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1e024518` the Masala Dosa is filled with spicy potato: seasoning ≠ taste
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: taste ≠ authenticity
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: ingredient_quality ≠ food
- `post-22c25ac1` this small kitchen amazingly produces all the Dumplings for…: none ≠ food
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: location ≠ atmosphere
- `post-22c25ac1` you order digitally at a counter: service ≠ none
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: seasoning ≠ taste
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: food ≠ none
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: taste ≠ food
- `post-24601e6d` you get 45 minutes in the ice area: pressure ≠ none
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: ownership ≠ none
- `post-3b1b4cd6` Crispy's Chicken has locations in Schöneberg, Friedrichshai…: location ≠ none
- `post-4a742b09` the owners plate dishes they are proud of at Village House: presentation ≠ ownership
- `post-4a742b09` some days Village House is packed: crowding ≠ consistency
- … 91 more in issues.jsonl

### parts.foods (129)

- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich, poulet]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich, chicken]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-0ac47c59` the chicken meat was in the döner: [tavuk eti, döner] ≠ [köri sosu, tavuk eti]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [döneri]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ [kebab]
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: [kebab] ≠ [sauce, kebab]
- `review-3e075e7e` ate 2 kebsy there, both average: [kebsy] ≠ [kebab]
- `review-3f2a2713` you can use the ketchup provided for a vegan burger: [ketchup] ≠ [ketchup, burger]
- `review-4a46a87d` the chicken was burnt: [الجاج] ≠ [chicken]
- `review-4a46a87d` the chicken seemed fried days ago: [الجاج] ≠ [chicken]
- `review-4a46a87d` the sandwich was empty: [السندويشة] ≠ [سندويشة]
- `review-4a46a87d` the sandwich was dry: [السندويشة] ≠ [sandwich]
- `review-4a46a87d` the chicken was burnt: [الجاج] ≠ [chicken]
- `review-4a46a87d` the chicken seemed fried days ago: [الجاج] ≠ [chicken]
- `review-4a46a87d` the sandwich was empty: [السندويشة] ≠ [سندويشة]
- `review-4a46a87d` the sandwich was dry: [السندويشة] ≠ [sandwich]
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-70467fba` the kebab was not extraordinary: [kebab] ≠ []
- `review-70467fba` the kebab was not worth waiting forever for: [kebab] ≠ []
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `post-1b8b0789` Doree 65 is Berlin's hyped steak spot: [Steak] ≠ []
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ [meat]
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: [Fleisch] ≠ [meat]
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: [Sambar, Chutneys] ≠ [Masala Dosa, Sambar, Chutneys]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` ten dumplings cost 16 euros: [Dumplings] ≠ [Stück]
- `post-22c25ac1` 20 dumplings cost 30 euros: [Dumplings] ≠ [Stück]
- … 89 more in issues.jsonl

### claims.place (110)

- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen Jun…: Yumcha Heroes ≠ Yumcha Heroes
- `post-22c25ac1` Yumcha Heroes' success is owed to the three women who make …: Yumcha Heroes ≠ Yumcha Heroes
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
- `post-22c25ac1` the Manufaktur has a daily changing offering: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` unlike many other hotspots in Prenzlauer Berg, the Manufakt…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` five Dumplings cost only 8.25 euros: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` the five Dumplings are delicious: Yumcha Heroes Manufaktur ≠ Yumcha Heroes Manufaktur
- … 70 more in issues.jsonl

### parts.kind (56)

- `review-0ac47c59` everyone working there is Turkish: fact ≠ opinion
- `review-0ac47c59` the kebab shop's name is Turkish: fact ≠ opinion
- `review-0ac47c59` the chicken meat was in the döner: fact ≠ opinion
- `review-0ac47c59` the reviews read were completely different from what was fo…: opinion ≠ verdict
- `review-6217ec70` not sure they would repeat the experience: verdict ≠ opinion
- `review-70467fba` the kebab was not extraordinary: opinion ≠ verdict
- `review-90e99b19` a foreign object was found in a kebab at the table opposite…: opinion ≠ event
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-dcd4db39` drove several hundred kilometers to try Nhas' Chicken: fact ≠ verdict
- `review-f1e62446` everyone was raving about the place: fact ≠ verdict
- `review-f84d2292` the experience was welcoming: opinion ≠ change
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: fact ≠ opinion
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ verdict
- `post-27fe4363` Horváth has two Michelin stars: fact ≠ verdict
- `post-4a742b09` the owners plate dishes they are proud of at Village House: opinion ≠ fact
- `post-4c3e2a10` the customers have remained faithful: fact ≠ verdict
- `post-4f942afd` the hummus is smoother: opinion ≠ fact
- `post-52881d60` they tested the Schnitzel at Scheers Schnitzel: fact ≠ event
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: fact ≠ opinion
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ opinion
- `post-59699006` Barlevain is a laid-back neighbourhood spot in Schöneberg: opinion ≠ verdict
- `post-674e7322` Mrs. Robinsons is closed: fact ≠ change
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque: fact ≠ change
- `post-6c0e92d2` Lukas's partner Josue Kashala has worked in gastronomy sinc…: fact ≠ change
- `post-6c0e92d2` Kroque is a place for good Kroques, wine and cocktails: opinion ≠ verdict
- `post-6c0e92d2` Kroque also serves drinks: fact ≠ opinion
- `post-6c0e92d2` Kroque has a wooden floor found under the old linoleum: fact ≠ change
- `post-75c11d7c` every detail of the interior shows a commitment to quality: opinion ≠ verdict
- `post-75c11d7c` Berlin is full of restaurants vying for attention: fact ≠ verdict
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: verdict ≠ opinion
- `post-8901fb9b` Tobias goes to Miss Saigon very regularly: fact ≠ verdict
- `post-909ca5ee` Barlevain is on a beautiful corner: opinion ≠ fact
- `post-909ca5ee` The owners see Barlevain as a modern Wirtshaus: fact ≠ opinion
- `post-909ca5ee` The Oeuf Mayo is currently served with a Bärlauchmayonnaise: fact ≠ opinion
- `post-996efecb` Bonanza's slogan is "Unnecessary rules": fact ≠ opinion
- `post-996efecb` the barista gave a thumbs up when the author said they unde…: opinion ≠ event
- `post-9f93c25b` Kulachino is in City West: fact ≠ verdict
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: opinion ≠ fact
- `post-b5e879f0` Restaurant India is at Bergmannstraße 100: fact ≠ event
- … 16 more in issues.jsonl

### claims.extra (53)

- `review-71868223` decided they had to wait in the queue
- `post-22c25ac1` the principle is very simple
- `post-22c25ac1` there is no frills around the dumplings
- `post-24601e6d` the creators spotted Ice Bar Berlin and wanted to experience it
- `post-24601e6d` the creators came to Berlin for the dad's 50th birthday
- `post-4a742b09` running a restaurant in your 30s feels different
- `post-4c3e2a10` the owner wants to keep his customers happy and not lose them
- `post-4f942afd` Akkawy is located at Kopernikusstraße 8, 10245 Berlin-Friedrichshain
- `post-4f942afd` Akkawy was first reviewed in 2020
- `post-4f942afd` Akkawy was introduced to the author by Israeli colleagues as one of the best hummus resta…
- `post-4f942afd` hummus is not the author's absolute favourite dish
- `post-4f942afd` hummus is better than guacamole or other hyped dippy-spready things
- `post-4f942afd` the author writes blog posts about Akkawy
- `post-4f942afd` Julian experiments with the dishes Akkawy serves
- `post-4f942afd` the mushroom-hummus dish is the best example of Akkawy's experimentation
- `post-4f942afd` Za'atar is a middle-Eastern herb related to oregano
- `post-524765b0` Kírkē Deli is on Böckhstraße in the Graefekiez
- `post-674e7322` Mrs. Robinsons was one of the absolutely strongest casual fine dining addresses in the ci…
- `post-674e7322` Mrs. Robinsons has been a favourite of BFS since its opening
- `post-6c0e92d2` Lukas says the choice of sides and dips is almost interactive
- `post-8901fb9b` Claerchens Ballhaus is the best restaurant in Berlin, a controversial pick
- `post-8901fb9b` Claerchens Ballhaus is a very old place
- `post-8901fb9b` Claerchens Ballhaus is a 10 out of 10 experience
- `post-8901fb9b` Claerchens Ballhaus serves a meat aspic with pan fried potatoes and remoulade sauce
- `post-8901fb9b` the meat aspic with pan fried potatoes and remoulade sauce is good stuff
- `post-8901fb9b` Pluto is run by friends of the speaker
- `post-8901fb9b` the tacos are Persian, with dried mint, goat cheese and feta
- `post-8901fb9b` the chef likes the tacos
- `post-8901fb9b` it is curry versus curry powder
- `post-996efecb` the creator could not visit the main Bonanza store because of time
- `post-b5e879f0` Restaurant India had been open for over 30 years
- `post-b5e879f0` Restaurant India was on Bergmannstraße until it closed
- `post-b5e879f0` Restaurant India opened at a time when Bergmannstraße was not yet a commercialised shoppi…
- `post-b5e879f0` Aurora said he would first go on vacation
- `post-b5e879f0` the farewell was visibly hard for Aurora at times
- `post-b5e879f0` Restaurant India was open for over 31 years
- `post-b5e879f0` the team wrote in a farewell letter that a restaurant lives from its guests and this one …
- `post-b5e879f0` the author's most formative memory is of Restaurant India
- `post-b5e879f0` Restaurant India has an unassuming name
- `post-b5e879f0` Restaurant India was a special place
- … 13 more in issues.jsonl

### parts.sentiment (45)

- `review-0ac47c59` everyone working there is Turkish: neutral ≠ negative
- `review-0ac47c59` the kebab shop's name is Turkish: neutral ≠ negative
- `review-0ac47c59` the chicken meat was in the döner: neutral ≠ negative
- `review-28e4170f` the market hall can get busy: negative ≠ mixed
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ neutral
- `review-5582d6b8` sit inside: positive ≠ negative
- `review-90e99b19` the atmosphere is ordinary: negative ≠ neutral
- `review-90e99b19` the service is not particularly bad but not good either: mixed ≠ neutral
- `review-90e99b19` the place is not worth more than 15 minutes of travel: negative ≠ mixed
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-dcd4db39` drove several hundred kilometers to try Nhas' Chicken: neutral ≠ positive
- `post-1b8b0789` the owner is the same in person as on the internet, no filt…: neutral ≠ mixed
- `post-1b8b0789` the creators found the owner decent, however controversial …: positive ≠ mixed
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: neutral ≠ positive
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: negative ≠ positive
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-4a742b09` the owners plate dishes they are proud of at Village House: positive ≠ neutral
- `post-4a742b09` some days Village House is packed: neutral ≠ mixed
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no rea…: mixed ≠ positive
- `post-4f942afd` the hummus is smoother: positive ≠ neutral
- `post-58a16831` Nyde is run by carpenter Antonia Wagner: neutral ≠ positive
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-6c0e92d2` Lukas refuses to use industrially processed meat full of ad…: positive ≠ negative
- `post-6c0e92d2` Kroque also serves drinks: neutral ≠ positive
- `post-6c0e92d2` the raspberry daiquiri may be a bit too easy to drink for l…: mixed ≠ positive
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-909ca5ee` Barlevain is on a beautiful corner: positive ≠ neutral
- `post-909ca5ee` The owners see Barlevain as a modern Wirtshaus: neutral ≠ positive
- `post-909ca5ee` The Oeuf Mayo is currently served with a Bärlauchmayonnaise: neutral ≠ positive
- `post-996efecb` Bonanza's slogan is "Unnecessary rules": neutral ≠ positive
- `post-996efecb` the staff explained the small volume was intentional: neutral ≠ mixed
- `post-9f93c25b` Kulachino is in City West: neutral ≠ positive
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: positive ≠ neutral
- `post-b5e879f0` Restaurant India is at Bergmannstraße 100: neutral ≠ negative
- `post-b5e879f0` Restaurant India has a North Indian menu: neutral ≠ positive
- `post-babe1142` lesser gelaterias in Berlin get fifty-person queues: neutral ≠ mixed
- `post-babe1142` the spiciness comes after a few seconds: neutral ≠ positive
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: neutral ≠ positive
- `post-d232f1ca` ROY Hops Kombucha is alcohol-free: neutral ≠ positive
- `post-db280ef6` 572Pasta ends overpriced lunch: positive ≠ negative
- … 5 more in issues.jsonl

### claims.missed (43)

- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-165a9370` the Indian restaurant has colorful lights
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang out
- `post-165a9370` the Indian restaurant is the perfect place for a date night or dinner with friends
- `post-165a9370` the Indian restaurant is in the heart of Berlin
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its current range
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera Central
- `post-1c78d4ed` The El Líbano beans are washed-processed
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varieties: Caturra, Colombia, Casti…
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and cocoa
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spirit
- `post-1c78d4ed` The El Líbano beans are available through the roaster's webshop and select resellers thro…
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
- `post-51a97d36` after the meal you always get a Tiramisu
- `post-57ab8313` Berlin should go to Taco & Gringo and learn
- `post-60ff28c2` Sandos is at Scharnweber 26
- `post-650ede57` question whether oil belongs in pasta water
- `post-674e7322` Café Frieda is one of the absolutely strongest casual fine dining addresses in the city
- `post-674e7322` Café Frieda has been a BFS favourite since its opening
- `post-6c0e92d2` Kroque is already more than just a lunch spot
- `post-75c11d7c` Nichi Getsu's street, Rotherstraße in Friedrichshain, feels surprisingly far from Berlin,…
- `post-75c11d7c` bring your sushi-loving friends to Nichi Getsu
- `post-816a40e7` it is a Syrian-Kurdish restaurant in Charlottenburg
- `post-816a40e7` the restaurant can't get any better
- `post-816a40e7` the restaurant has lots of delicious things
- `post-8901fb9b` Common from Max has the best pizza
- `post-93526d04` they had Süd Baklava with ice cream at the baklava shop
- `post-93526d04` the Süd Baklava tasted really good
- `post-a61ba144` asks which hyped food spots in Berlin people can recommend
- `post-babe1142` Peggy Bee is a hidden gem
- … 3 more in issues.jsonl

### claims.subject (23)

- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` at many kebab stores the spit just dries up: none ≠ place
- `post-4c3e2a10` the kebab becomes liquid if everything is mixed together: none ≠ place
- `post-60ff28c2` Matcha is generally best with Kokosmilch: none ≠ place
- `post-75c11d7c` Bara Chirashi is less formal and more generous, and every b…: none ≠ place
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-8901fb9b` Tobias loves Papaya: place ≠ none
- `post-8901fb9b` at Papaya he eats a classic red curry with duck: place ≠ none
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ none
- `post-b5e879f0` a Boulettenbrötchen at the bakery next door costs 2,50 Euro: city ≠ none
- `post-b5e879f0` the Boulettenbrötchen tastes fluffier than any oat milk foam: city ≠ none
- `post-b5e879f0` the new international deli supermarket opposite sells Halwa…: city ≠ none
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: city ≠ place
- `post-db280ef6` 572Pasta ends overpriced lunch: place ≠ none
- `post-e2a421e9` Berliners stay stubborn when it comes to traditional shops: city ≠ place

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

### match.brand (11)

- `post-3b1b4cd6` Crispy's Chicken Berlin (Schöneberg): Crispy's Chicken Berlin (Schöneberg) ≠ none (none)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-93526d04` Nastys: Nastys - TRY NOT TO COME AGAIN. ≠ none (none)
- `post-9f93c25b` Mondapaz: Mondo Pazzo ≠ none (none)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-d232f1ca` ROY Kombucha: none ≠ ROY Kombucha (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### places.extra (10)

- `post-4c3e2a10` Die Zelle
- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-816a40e7` Surich
- `post-8901fb9b` Buck and Breck
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra
- `post-9f93c25b` Bohrschatz
- `post-9f93c25b` Main
- `post-eddeb88d` Mikuna para EL ALMA

### places.missed (9)

- `post-1e024518` Masalas
- `post-4c3e2a10` The Cell
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Back and Break
- `post-8901fb9b` Common
- `post-8901fb9b` Sophie
- `post-8901fb9b` Papaya
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine

### change.false (8)

- `review-f84d2292` the place was more welcoming
- `post-6c0e92d2` Josue Kashala is Lukas's partner at Kroque and took over the bar
- `post-6c0e92d2` Kroque's wooden floor was discovered under the old linoleum
- `post-b5e879f0` commercial rents on Bergmannstraße rose and competitive pressure crept in
- `post-c4e7c0a9` removing the old wallpaper revealed a beautiful blue wall colour on the left, now called …
- `post-e2a421e9` the return to the name Butter Lindner is not a step backwards or retro posturing
- `post-e2a421e9` the return to the name is a bow to Butter Lindner's long-standing customers
- `post-fc96acff` Wenzel Pankratz now runs Forsthaus Strelitz

### parts.amount (7)

- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: —  ≠ 5 money
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-fc96acff` the set lunch menu is genuinely fantastic value for money: —  ≠ 88 money
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money

### match.branch (3)

- `post-22c25ac1` Yumcha Heroes: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-22c25ac1` Yumcha Heroes Manufaktur: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only

### match_isolated.branch (1)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK

### change.missed (1)

- `post-b5e879f0` Restaurant India has closed after 31 years
