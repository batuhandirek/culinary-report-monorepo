# Ingestion eval: second-gpt54

2026-11-01 15:23 UTC · 51 reviews, 58 posts, 0 wordings · 762 cases left out (no reference or no output)
Tokens: 753,810
Models: reference: openai/gpt-5.4 (109)

## Reviews

| Metric | second-gpt54 | stored | mini-base-2 | mini-base | mini-r3 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 98% (291/298) | 93% +4 | 96% +1 | 97% +1 | 96% +2 |
| Claims that are real (of produced) | 99% (351/356) | 99% -1 | 98% +1 | 98% ±0 | 99% ±0 |
| Sentiment | 99% (325/328) | 88% +12 | 91% +8 | 91% +8 | 93% +7 |
| Aspect, exact | 84% (276/328) | 71% +13 | 80% +5 | 82% +2 | 82% +2 |
| Aspect, right root | 87% (286/328) | 81% +7 | 85% +2 | 89% -2 | 90% -3 |
| Kind | 98% (323/328) | 67% +32 | 87% +11 | 87% +11 | 92% +7 |
| Kind given at all | 100% (328/328) | 4% +96 | 100% ±0 | 99% +1 | 98% +2 |
| Changes that are changes | 67% (2/3) | 56% +11 | 73% -7 | 52% +15 | 72% -6 |
| Changes found | 100% (2/2) | 80% +20 | 69% +31 | 81% +19 | 81% +19 |
| Amount | 87% (13/15) | 41% +45 | 65% +22 | 68% +18 | 76% +10 |
| Foods named, precision | 91% (107/118) | 32% +58 | 65% +25 | 70% +21 | 71% +20 |
| Foods named, recall | 86% (102/119) | 23% +63 | 64% +22 | 67% +18 | 67% +18 |

## Posts and articles

| Metric | second-gpt54 | stored | mini-base-2 | mini-base | mini-r3 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 85% (516/606) | 56% +30 | 76% +9 | 76% +9 | 85% ±0 |
| Claims that are real (of produced) | 96% (793/830) | 95% +1 | 91% +5 | 93% +3 | 88% +8 |
| Sentiment | 96% (626/652) | 86% +10 | 87% +9 | 87% +9 | 88% +8 |
| Aspect, exact | 79% (512/652) | 63% +15 | 64% +15 | 61% +18 | 63% +16 |
| Aspect, right root | 87% (564/652) | 78% +9 | 77% +10 | 74% +13 | 76% +10 |
| Kind | 93% (605/652) | 47% +46 | 80% +13 | 83% +9 | 84% +8 |
| Kind given at all | 100% (652/652) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Changes that are changes | 57% (8/14) | 46% +11 | 40% +18 | 56% +1 | 51% +6 |
| Changes found | 50% (5/10) | 38% +13 | 44% +6 | 50% ±0 | 66% -16 |
| Amount | 56% (22/39) | 46% +10 | 62% -6 | 55% +1 | 47% +9 |
| Foods named, precision | 86% (417/484) | 46% +40 | 77% +9 | 72% +14 | 75% +11 |
| Foods named, recall | 88% (355/404) | 39% +49 | 70% +18 | 66% +22 | 63% +25 |
| Subject (place, city, none) | 94% (755/804) | 85% +9 | 87% +7 | 85% +9 | 88% +6 |
| Claim on the right place | 97% (681/701) | 85% +13 | 90% +7 | 90% +8 | 91% +6 |
| Places found | 86% (96/111) | 73% +14 | 82% +4 | 81% +6 | 90% -4 |
| Places that are places | 94% (96/102) | 85% +9 | 92% +3 | 91% +3 | 92% +2 |
| Match: brand (found places) | 97% (93/96) | 92% +5 | 92% +5 | 92% +5 | 92% +5 |
| Match: branch (right brand) | 98% (79/81) | 97% ±0 | 94% +3 | 96% +2 | 96% +2 |
| Promotional flag | 69% (40/58) | 82% -13 | 79% -10 | 79% -10 | 78% -9 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | second-gpt54 (train) | second-gpt54 (test) | mini-base-2 (test) | mini-base (test) | mini-r3 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 98% (291/298) | 95% +2 | 97% ±0 | 96% +1 |
| Claims that are real (of produced) | — | 99% (351/356) | 99% -1 | 98% ±0 | 99% -1 |
| Sentiment | — | 99% (325/328) | 90% +9 | 92% +7 | 92% +7 |
| Aspect, exact | — | 84% (276/328) | 80% +4 | 81% +3 | 82% +2 |
| Aspect, right root | — | 87% (286/328) | 88% -1 | 89% -2 | 90% -3 |
| Kind | — | 98% (323/328) | 89% +10 | 90% +9 | 92% +6 |
| Kind given at all | — | 100% (328/328) | 100% ±0 | 100% ±0 | 95% +5 |
| Changes that are changes | — | 67% (2/3) | 100% -33 | 40% +27 | 100% -33 |
| Changes found | — | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | — | 87% (13/15) | 67% +20 | 71% +16 | 67% +20 |
| Foods named, precision | — | 91% (107/118) | 66% +25 | 78% +13 | 71% +20 |
| Foods named, recall | — | 86% (102/119) | 61% +25 | 69% +17 | 60% +26 |

### Posts and articles

| Metric | second-gpt54 (train) | second-gpt54 (test) | mini-base-2 (test) | mini-base (test) | mini-r3 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 85% (516/606) | 75% +11 | 73% +12 | 88% -3 |
| Claims that are real (of produced) | — | 96% (793/830) | 93% +2 | 96% ±0 | 86% +10 |
| Sentiment | — | 96% (626/652) | 89% +7 | 91% +5 | 88% +8 |
| Aspect, exact | — | 79% (512/652) | 65% +13 | 65% +14 | 61% +18 |
| Aspect, right root | — | 87% (564/652) | 79% +7 | 76% +11 | 75% +12 |
| Kind | — | 93% (605/652) | 83% +10 | 85% +8 | 84% +9 |
| Kind given at all | — | 100% (652/652) | 99% +1 | 100% ±0 | 100% ±0 |
| Changes that are changes | — | 57% (8/14) | 21% +36 | 45% +12 | 48% +10 |
| Changes found | — | 50% (5/10) | 30% +20 | 40% +10 | 80% -30 |
| Amount | — | 56% (22/39) | 80% -24 | 77% -21 | 67% -10 |
| Foods named, precision | — | 86% (417/484) | 83% +3 | 75% +11 | 75% +11 |
| Foods named, recall | — | 88% (355/404) | 71% +17 | 65% +23 | 60% +28 |
| Subject (place, city, none) | — | 94% (755/804) | 83% +11 | 86% +8 | 87% +7 |
| Claim on the right place | — | 97% (681/701) | 87% +10 | 83% +15 | 91% +6 |
| Places found | — | 86% (96/111) | 79% +7 | 77% +9 | 85% +2 |
| Places that are places | — | 94% (96/102) | 85% +9 | 84% +10 | 88% +6 |
| Match: brand (found places) | — | 97% (93/96) | 92% +5 | 91% +6 | 91% +5 |
| Match: branch (right brand) | — | 98% (79/81) | 96% +2 | 97% ±0 | 99% -1 |
| Promotional flag | — | 69% (40/58) | 83% -14 | 81% -12 | 79% -10 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 96% (135/140) | 99% (166/168) | 85% (128/150) | 99% (149/150) | — | — |
| hard | 83% (15/18) | 96% (24/25) | 65% (13/20) | 95% (19/20) | 100% (2/2) | 100% (2/2) |
| lang:de | 99% (86/87) | 99% (101/102) | 85% (80/94) | 100% (94/94) | — | — |
| lang:en | 96% (68/71) | 99% (79/80) | 83% (64/77) | 97% (75/77) | — | — |
| lang:other | 99% (95/96) | 98% (117/120) | 81% (87/108) | 99% (107/108) | — | — |
| lang:tr | 95% (42/44) | 100% (54/54) | 92% (45/49) | 100% (49/49) | — | — |
| length:long | 96% (77/80) | 99% (99/100) | 80% (72/90) | 100% (90/90) | — | — |
| length:medium | 98% (190/194) | 98% (227/231) | 86% (183/213) | 99% (210/213) | — | — |
| length:short | 100% (24/24) | 100% (25/25) | 84% (21/25) | 100% (25/25) | — | — |
| no-transcript | 93% (99/106) | 97% (147/151) | 78% (96/123) | 98% (120/123) | 92% (33/36) | 100% (33/33) |
| own | 89% (25/28) | 96% (50/52) | 74% (23/31) | 94% (29/31) | 100% (6/6) | 100% (6/6) |
| places:few | 87% (443/512) | 96% (701/733) | 80% (452/567) | 96% (542/567) | 89% (56/63) | 98% (55/56) |
| places:many | 76% (68/89) | 95% (87/92) | 71% (57/80) | 99% (79/80) | 83% (39/47) | 95% (37/39) |
| places:none | 100% (5/5) | 100% (5/5) | 60% (3/5) | 100% (5/5) | 100% (1/1) | 100% (1/1) |
| platform:blog | 86% (290/338) | 95% (466/488) | 80% (293/366) | 96% (350/366) | 94% (29/31) | 97% (28/29) |
| platform:google | 98% (291/298) | 99% (351/356) | 84% (276/328) | 99% (325/328) | — | — |
| platform:instagram | 95% (63/66) | 97% (89/92) | 80% (63/79) | 99% (78/79) | 81% (13/16) | 100% (13/13) |
| platform:tiktok | 81% (163/202) | 95% (238/250) | 75% (156/207) | 96% (198/207) | 84% (54/64) | 96% (52/54) |
| size:large | 82% (239/292) | 97% (387/399) | 81% (246/302) | 95% (287/302) | 78% (29/37) | 97% (28/29) |
| size:medium | 87% (222/255) | 94% (320/341) | 74% (209/281) | 97% (273/281) | 94% (50/53) | 96% (48/50) |
| size:small | 93% (55/59) | 96% (86/90) | 83% (57/69) | 96% (66/69) | 81% (17/21) | 100% (17/17) |
| stars:1 | 96% (47/49) | 100% (61/61) | 84% (46/55) | 100% (55/55) | — | — |
| stars:2 | 93% (25/27) | 97% (28/29) | 78% (21/27) | 100% (27/27) | — | — |
| stars:3 | 99% (84/85) | 97% (106/109) | 87% (85/98) | 99% (97/98) | — | — |
| stars:4 | 100% (54/54) | 100% (60/60) | 81% (46/57) | 96% (55/57) | — | — |
| stars:5 | 98% (81/83) | 99% (96/97) | 86% (78/91) | 100% (91/91) | — | — |
| transcript | 78% (127/162) | 94% (180/191) | 75% (123/163) | 96% (156/163) | 77% (34/44) | 94% (32/34) |

## Misses

### parts.aspect (192)

- `review-0541b749` the légumes were hard to digest: food ≠ other
- `review-070860ca` received the wrong order: order_accuracy ≠ delivery_platform
- `review-070860ca` received a refund: complaint_handling ≠ none
- `review-070860ca` had to reorder: order_accuracy ≠ delivery_platform
- `review-070860ca` not worth the hassle: none ≠ other
- `review-0ac47c59` a complete disappointment: none ≠ other
- `review-0ac47c59` definitely does not recommend it: none ≠ other
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue: none ≠ other
- `review-0c8b6a9b` the visit was a great experience: none ≠ vibe
- `review-13f72d12` doesn't understand the hype about this place: none ≠ vibe
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: food ≠ order_accuracy
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: food ≠ menu_variety
- `review-16bdd5e0` definitely not worth the time: none ≠ value_for_money
- `review-37016d87` everything was incredible: none ≠ other
- `review-37016d87` everything was great: none ≠ other
- `review-37016d87` would go back without hesitation: none ≠ other
- `review-37016d87` recommends it to those traveling in the area: none ≠ other
- `review-37016d87` it was a pleasure visiting: none ≠ other
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ friendliness
- `review-3e075e7e` doesn't know what people are raving about: none ≠ taste
- `review-4a46a87d` the new location isn't the same as the old one: none ≠ ownership
- `review-4a46a87d` it has become a fast-food restaurant: none ≠ menu_variety
- `review-5582d6b8` the table was terribly wobbly: outdoor_seating ≠ space
- `review-5582d6b8` the friend barely touched the table and the spoons fell: outdoor_seating ≠ space
- `review-58540992` Chén Chè is actually a very nice and good restaurant: none ≠ vibe
- `review-6217ec70` not sure they would repeat the experience: none ≠ wait
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: food ≠ menu_variety
- `review-6b4df664` the whole experience left a positive impression: none ≠ other
- `review-6b4df664` overall still a lovely visit: none ≠ vibe
- `review-6b4df664` definitely worth the experience: none ≠ other
- `review-70467fba` the place is a bit overrated: none ≠ other
- `review-70467fba` the kebab was not worth waiting forever for: queue ≠ value_for_money
- `review-70467fba` the hype and the extremely long queues make the place feel …: queue ≠ other
- `review-70467fba` the food is not worth spending a huge amount of time waitin…: queue ≠ value_for_money
- `review-7593dfff` the place is worth it if you have time to wait in line: none ≠ value_for_money
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-78c08c78` the food itself can be found in many places: food ≠ authenticity
- `review-7f69ec8d` it is definitely not worth it: none ≠ wait
- `review-866767df` the place was a pleasant surprise: none ≠ other
- `review-90e99b19` the place might be okay if passing nearby: none ≠ location
- … 152 more in issues.jsonl

### parts.foods (124)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [sandwich]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [sandwich]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [tavuk eti, tavuk eti]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, marul, domates, soğan]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [döneri]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi, halloumi]
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: [kebab] ≠ [sauces, kebab]
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: [gemuse kebaba, wrapa] ≠ []
- `review-3e075e7e` doesn't know what people are raving about: [] ≠ [gemuse kebaba]
- `review-3e075e7e` doesn't know what people are raving about: [] ≠ [wrapa]
- `review-3e075e7e` doesn't know what people are raving about: [] ≠ [kebsy]
- `review-4a46a87d` the oil tasted old: [الزيت] ≠ []
- `review-5582d6b8` the ramen was delicious: [Рамен] ≠ [shoyu, asari]
- `review-5582d6b8` the ramen was delicious: [Рамен] ≠ [shoyu]
- `review-5582d6b8` the ramen was delicious: [Рамен] ≠ [asari]
- `review-6217ec70` the kebab had plenty of meat and vegetables: [kebab, meat, vegetables] ≠ [kebab]
- `review-6217ec70` the kebab had a generous amount of sauce: [sauce] ≠ [kebab]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-6217ec70` the kebab had a generous amount of sauce: [sauce] ≠ [kebab]
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-c83e0a88` the döner tasted like classic German döner: [döner] ≠ []
- `review-c83e0a88` you get the same taste at any doner shop in Germany: [döner] ≠ []
- `review-dcd4db39` the meal was ready just 5-10 minutes after ordering: [] ≠ [Menü]
- `post-1b8b0789` Doree 65 is Berlin's hyped steak spot: [Steak] ≠ []
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: [Caturra, Colombia, Castillo, Tabi] ≠ [El Líbano]
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [El Líbano, espresso]
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: [Caturra, Colombia, Castillo, Tabi] ≠ [El Líbano]
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: [] ≠ [El Líbano]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [El Líbano]
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: [Sambar, Chutneys] ≠ [Masala Dosa, Sambar, Chutneys]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` five Dumplings cost only 8.25 euros: [Dumplings] ≠ []
- `post-22c25ac1` ten dumplings cost 16 euros: [Dumplings] ≠ []
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-4f942afd` the Zahra is a creamy baked cauliflower dish with onions, I…: [Zahra, cauliflower, onions, tahini] ≠ [Zahra, Zahra, cauliflower, tahini]
- `post-4f942afd` Akkawy is now Friedrichshain's hummus destination: [] ≠ [hummus]
- `post-4f942afd` the Shakshuka is a rich, lightly-spiced, almost smoky tomat…: [Shakshuka] ≠ [Shakshuka, egg]
- … 84 more in issues.jsonl

### claims.missed (97)

- `review-070860ca` the reviewer is not happy
- `review-070860ca` ordered on a Sunday night for delivery through Wolt
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab shop in Berlin on Google
- `review-0ac47c59` found nothing to praise about the place
- `review-5582d6b8` the shoyu and asari were both incredibly delicious
- `review-6217ec70` came on a Thursday evening
- `review-bf2322b7` keep up the great work
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen June, Bing Wu and Su Jun
- `post-22c25ac1` the new owners gave the three women a share of the profits
- `post-22c25ac1` families stop here after school, colleagues come for a quick lunch and friends chat over …
- `post-22c25ac1` the three women's food truly opens every heart
- `post-22c25ac1` 20 dumplings cost 30 euros
- `post-24601e6d` trying some German food in Berlin was super exciting
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-3d9147ff` bowls are one of the creator's favorite things to eat
- `post-3d9147ff` bowls can get a little boring sometimes
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and juicy
- `post-4c3e2a10` the owner is very proud of his kebab
- `post-4c3e2a10` at many kebab stores the spit just dries up
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab
- `post-4c3e2a10` the owner set out to make the best kebab in Germany
- `post-4c3e2a10` the owner comes from a catering family
- `post-4c3e2a10` the owner works with his brother, which goes quite well
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes do not turn liquid
- `post-4c3e2a10` the customers have remained faithful
- `post-4f942afd` Akkawy is a Friedrichshain classic
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no real destination for hummus
- `post-4f942afd` the author has been to Akkawy often and takes visiting friends there
- `post-4f942afd` owner Julian has worked in Acre's best and most prestigious hummus restaurants
- `post-57ab8313` The margaritas were developed by Enrico Römer from The Coral
- `post-57ab8313` The tender birria meat brings the taste of Mexico
- `post-57ab8313` The Wasabi-Yuzu-Margarita is a wonderful drink you must try
- `post-58a16831` Nyde is run by carpenter Antonia Wagner
- `post-58a16831` Nyde, with its self-built interior, is cosy
- `post-58a16831` Nyde is open Wednesday to Monday, 9 to 21
- `post-58a16831` you should come to Pêle-Mêle very hungry
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle
- `post-59699006` Café Amano's window is open at least over the summer
- `post-59699006` tipBerlin is enthusiastic about Barlevain
- … 57 more in issues.jsonl

### parts.kind (52)

- `review-0ac47c59` sales slowed down as the line shortened: fact ≠ opinion
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-a2c14088` wonders whether there are two teams of chefs: opinion ≠ fact
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: fact ≠ change
- `post-22c25ac1` Yumcha Heroes' success is owed to the three women who make …: opinion ≠ change
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: opinion ≠ fact
- `post-27fe4363` Horváth has two Michelin stars: fact ≠ opinion
- `post-4a742b09` the owners plate dishes they are proud of at Village House: opinion ≠ fact
- `post-4a742b09` invitation to make it a date this weekend at Village House: verdict ≠ event
- `post-524765b0` Kírkē is a dream come true for everyone who likes savoury f…: opinion ≠ fact
- `post-57ab8313` Taco & Gringo is located in the middle of Mitte: fact ≠ opinion
- `post-57ab8313` The margaritas are refreshing: opinion ≠ event
- `post-57ab8313` On the last Friday of every month there is an extra special: event ≠ new_item
- `post-57ab8313` Last week's special was the Wasabi-Yuzu-Margarita combining…: new_item ≠ opinion
- `post-60ff28c2` Matcha is generally best with Kokosmilch: opinion ≠ verdict
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-68b0cd44` the dumpling in chili oil had a remarkable price: opinion ≠ fact
- `post-6c0e92d2` Kroque is run by Lukas Rozsaffy: fact ≠ opinion
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger…: change ≠ fact
- `post-75c11d7c` Nichi Getsu's street, Rotherstraße in Friedrichshain, feels…: opinion ≠ verdict
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: verdict ≠ fact
- `post-8901fb9b` Romeo's bakes all its breads itself: fact ≠ opinion
- `post-8901fb9b` Tobias goes to Miss Saigon very regularly: fact ≠ verdict
- `post-909ca5ee` The white giant beans with Chili Crunch are a recommended s…: opinion ≠ fact
- `post-909ca5ee` The French classic Oeuf Mayo is a recommended starter: opinion ≠ fact
- `post-93526d04` the unnamed baklava shop has 4.8 stars: fact ≠ question
- `post-935c2fd2` restaurant revenue in Germany fell by 4 percent according t…: fact ≠ change
- `post-996efecb` Bonanza's slogan is "Unnecessary rules": fact ≠ opinion
- `post-9f93c25b` Big Window is number 9, one of his favourite meat restauran…: verdict ≠ opinion
- `post-9f93c25b` Mondapaz is number 8 and he likes going there at lunchtime: verdict ≠ opinion
- `post-9f93c25b` Kulachino is one of his favourite places: verdict ≠ opinion
- `post-9f93c25b` China Club is one of the best Chinese restaurants for him: verdict ≠ opinion
- `post-9f93c25b` Mine is number 2, one of his favourite restaurants: verdict ≠ opinion
- `post-9f93c25b` Mine is really top: verdict ≠ opinion
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: opinion ≠ fact
- `post-b5e879f0` queuing is the new black on Bergmannstraße: opinion ≠ fact
- `post-babe1142` Peggy Bee deserves a queue and will get one: verdict ≠ fact
- … 12 more in issues.jsonl

### claims.subject (49)

- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ city
- `post-14d4fc29` Markthalle Neun is in Kreuzberg: place ≠ city
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ city
- `post-4f942afd` eating too much of the hummus felt very heavy, like drowning: place ≠ none
- `post-4f942afd` eating too much of the hummus felt very heavy, like drowning: place ≠ none
- `post-4f942afd` the lemonades only just helped with digestion: place ≠ none
- `post-51a97d36` GIG Gastro is awesome: place ≠ none
- `post-51a97d36` after the meal you always get a Tiramisu: place ≠ none
- `post-51a97d36` the Tiramisu goes down comfortably: place ≠ none
- `post-51a97d36` after the meal you always get a Tiramisu: place ≠ none
- `post-524765b0` People looking for new restaurants, cafés and bakeries usua…: city ≠ place
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-57ab8313` Berlin should go to Taco & Gringo and learn: place ≠ city
- `post-60ff28c2` Matcha is generally best with Kokosmilch: none ≠ place
- `post-75c11d7c` the sushi rice is seasoned with Akazu, the red rice vinegar…: place ≠ none
- `post-816a40e7` there are not many shawarma and döner shops in this area: place ≠ city
- `post-935c2fd2` restaurant visits have become too expensive for Germans: none ≠ city
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ none
- `post-b5e879f0` the bakery next door also has coffee, though no Flat White: city ≠ none
- `post-b5e879f0` a Boulettenbrötchen at the bakery next door costs 2,50 Euro: city ≠ none
- `post-b5e879f0` the Boulettenbrötchen tastes fluffier than any oat milk foam: city ≠ none
- `post-babe1142` Peggy Bee has a welcoming atmosphere rarely felt in Berlin: place ≠ city
- `post-babe1142` the spiciness comes after a few seconds: place ≠ none
- `post-babe1142` the delayed tingling spiciness adds another layer to a trul…: place ≠ none
- `post-babe1142` the ice cream is dynamic: place ≠ none
- `post-babe1142` the richness is quite unique: place ≠ none
- `post-babe1142` the buffalo milk is more delicate than sheep's milk and str…: place ≠ none
- `post-babe1142` the buffalo milk is more delicate than sheep's milk and str…: place ≠ none
- `post-babe1142` Enrico won't make his recipes healthier or lower in sugar: place ≠ none
- `post-d232f1ca` ROY teamed up with BRLO again to bring back ROY Hops Kombuc…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha has all the floral, fruity character of A…: place ≠ none
- `post-d232f1ca` ROY Hops Kombucha is balanced by the kombucha's gentle swee…: place ≠ none
- … 9 more in issues.jsonl

### claims.extra (42)

- `review-13f72d12` the place has hype
- `review-3e075e7e` had the gemuse kebab
- `review-3e075e7e` had the wrap
- `review-52ef0f64` the vegane Ayran was had
- `review-70467fba` the reviewer enjoyed the kebab
- `post-1c78d4ed` El Líbano's varietals are Caturra, Colombia, Castillo and Tabi
- `post-1c78d4ed` El Líbano's process is Washed
- `post-1e024518` the Masala Dosa looks like this
- `post-22c25ac1` they got Mrs. Chens Blue Pearl
- `post-22c25ac1` they got Black Beef Dumplings
- `post-22c25ac1` the White-Chicken-, Pink-Lamb- and Orange-Prawns-Dumplings are handmade
- `post-4f942afd` Akkawy lets you feast with friends and break bread together
- `post-4f942afd` Akkawy lets you share dishes you’d normally not order for yourself
- `post-524765b0` much of the menu is oriented around the products themselves
- `post-524765b0` the meze with seafood and vegetables change depending on what is available at the counter
- `post-58a16831` Nyde has high old-building ceilings
- `post-60ff28c2` the Matcha with coconut milk is very good
- `post-674e7322` the best restaurants and bars come from people who know the scene best
- `post-68b0cd44` they had a feast at Panda Meister Berlin Kurfürstendamm
- `post-68b0cd44` they tried vegan Mapo tofu
- `post-73286ffe` Heitlinger Brasserie offers seasonal dishes
- `post-93526d04` they tested food spots in Berlin
- `post-93526d04` Sangam is in Schöneberg
- `post-93526d04` the Baklava shop was high on their list
- `post-93526d04` the döner at Sagros Gemüse Kebab is supposed to be the best döner in Berlin
- `post-b5e879f0` the author felt full there
- `post-b5e879f0` the author felt warm there
- `post-b5e879f0` Restaurant India had been open for over 31 years
- `post-b5e879f0` Restaurant India lived from its guests
- `post-b5e879f0` the author would have called Restaurant India a secret tip for Bergmannstraße
- `post-b5e879f0` Restaurant India had an understated name
- `post-b5e879f0` Restaurant India was a special place
- `post-d90ac864` the food was cute
- `post-d90ac864` the food was cute
- `post-db280ef6` who is coming by today
- `post-dfe2d586` Sage’s Lavender Assam Milk Tea is creamy
- `post-dfe2d586` The collaboration is interesting
- `post-e2a421e9` Lindner's logo is being slightly modified
- `post-e2a421e9` Lindner's updated logo will have a more swooping L and the Butter addition
- `post-e2a421e9` The updated logo will appear on all Lindner products and in all branches
- … 2 more in issues.jsonl

### parts.sentiment (29)

- `review-28e4170f` the market hall can get busy: negative ≠ mixed
- `review-28e4170f` the bike racks can fill up when biking there: negative ≠ mixed
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `post-1b8b0789` the creators found the owner decent, however controversial …: positive ≠ mixed
- `post-22c25ac1` Yumcha Heroes' success is owed to the three women who make …: positive ≠ neutral
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: positive ≠ neutral
- `post-4a742b09` the owners plate dishes they are proud of at Village House: positive ≠ neutral
- `post-4f942afd` they ordered hummus with a sweet aubergine puree: neutral ≠ positive
- `post-4f942afd` they ordered the classic Fatush salad: neutral ≠ positive
- `post-524765b0` Kírkē is a dream come true for everyone who likes savoury f…: positive ≠ neutral
- `post-57ab8313` The margaritas are refreshing: positive ≠ neutral
- `post-60ff28c2` Sandos opens today in Berlin: neutral ≠ positive
- `post-68b0cd44` the dumpling in chili oil had a remarkable price: positive ≠ neutral
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ neutral
- `post-6c0e92d2` Kroque is run by Lukas Rozsaffy: neutral ≠ positive
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: positive ≠ neutral
- `post-909ca5ee` The white giant beans with Chili Crunch are a recommended s…: positive ≠ neutral
- `post-909ca5ee` The French classic Oeuf Mayo is a recommended starter: positive ≠ neutral
- `post-996efecb` Bonanza's slogan is "Unnecessary rules": neutral ≠ positive
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: positive ≠ neutral
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: neutral ≠ positive
- `post-db280ef6` 572Pasta ends overpriced lunch: positive ≠ negative
- `post-e2a421e9` Butter Lindner is an indispensable part of Berlin: positive ≠ neutral
- `post-fc96acff` Berliners eat lunch quickly and without ceremony: neutral ≠ negative
- `post-fc96acff` Facil is set in a glass pavilion inside a bamboo courtyard …: neutral ≠ positive
- `post-fc96acff` Facil's choreographed service may feel suffocating to some …: mixed ≠ positive
- `post-fc96acff` German fine dining lacks creativity at times but its execut…: mixed ≠ positive
- `post-fc96acff` at lunch Facil also offers the more elaborate à la carte Go…: neutral ≠ positive
- `post-fc96acff` Berlin has too many small shared plates and neo-bistros cop…: negative ≠ positive

### claims.place (20)

- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-58a16831` Bäckerei Johann, a few streets away, supplies Nyde's Croiss…: Bäckerei Johann ≠ Nyde
- `post-816a40e7` for the opening, Shawarma costs 1 Euro on Friday: Kurmanche Restaurant ≠ kurmanche Restaurant
- `post-816a40e7` Shawarma costs 2 Euro on the second opening day: Kurmanche Restaurant ≠ kurmanche Restaurant
- `post-816a40e7` 50 percent discount on everything for 3 days: Kurmanche Restaurant ≠ kurmanche Restaurant
- `post-816a40e7` the restaurant opens at 13:00 on Friday: Kurmanche Restaurant ≠ kurmanche Restaurant
- `post-8901fb9b` Back and Break in Mitte is the best cocktail bar: Back and Break ≠ Pluto
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Tulus Lotrek
- `post-909ca5ee` Barlevain was opened in March 2026 by Anna Hernández Götz, …: Barlevain ≠ Barra
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: Johann Bäckerei ≠ Barlevain
- `post-d232f1ca` ROY teamed up with BRLO again to bring back ROY Hops Kombuc…: ROY Kombucha ≠ BRLO
- `post-e2a421e9` Don Santanaviboon impresses at Rram on Torstraße: Rram ≠ Lindner
- `post-e2a421e9` Rram's Don Santanaviboon is the The Duc Ngo of his generati…: Rram ≠ Lindner
- `post-e2a421e9` Rram's Don Santanaviboon is the The Duc Ngo of his generati…: Rram ≠ Lindner
- `post-fc96acff` Sarah Hallmann trained at Facil before opening Hallmann & K…: Hallmann & Klee ≠ Facil
- `post-fc96acff` Jonas Zörner, who came through Facil's kitchen, is now chef…: Lorenz Adlon Esszimmer ≠ Facil
- `post-fc96acff` Maximilian Kindel of Birds in the Kitchen came through Faci…: Birds in the Kitchen ≠ Facil
- `post-fc96acff` Ivano Pirolo of Cielo came through Facil's kitchen: Cielo ≠ Facil
- `post-fc96acff` Wenzel Pankratz, who came through Facil's kitchen, now runs…: Forsthaus Strelitz ≠ Facil

### parts.amount (19)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ 2 minutes
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `post-1b8b0789` they had 2 Grillplatte: —  ≠ 2 money
- `post-1b8b0789` each Grillplatte was meant for 2 people: —  ≠ 2 money
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ 16 money
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 30 money
- `post-4f942afd` Akkawy is currently open, verified August 2026: —  ≠ 2026
- `post-51a97d36` after the meal you always get a Tiramisu: —  ≠ 1 money
- `post-57ab8313` The Gringa de Birria is the authors' favourite: —  ≠ 12.9 money
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: —  ≠ 11.5 money
- `post-816a40e7` 50 percent discount on everything for 3 days: —  ≠ 50 money
- `post-babe1142` Peggy Bee is still operating in 2026: —  ≠ 2026
- `post-babe1142` Peggy Bee opened about four weeks before the 2021 review: —  ≠ 4
- `post-d90ac864` the food was rated 10 out of 10: —  ≠ 10 money
- `post-fc96acff` of Berlin's 19 Michelin-starred restaurants only one opens …: —  ≠ 19
- `post-fc96acff` Michael Kempf has been Facil's culinary director since 2003…: —  ≠ 2003
- `post-fc96acff` Joachim Gerner came to Facil in 2006 as sous-chef and has b…: —  ≠ 2006
- `post-fc96acff` Facil has not lost its glamour at 25: —  ≠ 25

### places.missed (15)

- `post-14d4fc29` Markthalle Neun
- `post-1e024518` Masalas
- `post-4c3e2a10` The Cell
- `post-51a97d36` GIG Gastro
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-8901fb9b` Back and Break
- `post-8901fb9b` Common
- `post-8901fb9b` Sophie
- `post-8901fb9b` Banh Mi Stable
- `post-8901fb9b` Papaya
- `post-8901fb9b` Gotcha
- `post-8901fb9b` Speicher Bowenhaus
- `post-8901fb9b` Special Sauce
- `post-d232f1ca` ROY Kombucha

### change.false (7)

- `review-e8770468` Burgermeister is now finally in Zehlendorf
- `post-935c2fd2` gastronomy revenue in Germany has fallen by 4 percent
- `post-e2a421e9` Lindner is returning to the Butter Lindner name after around 20 years
- `post-e2a421e9` Lindner's logo is being slightly modified
- `post-e2a421e9` Lindner's updated logo will have a more swooping L and the Butter addition
- `post-e2a421e9` Rogacki is back as a market hall stand
- `post-e2a421e9` Rogacki is back with iconic recipes in a cookbook

### places.extra (6)

- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-57ab8313` The Coral
- `post-816a40e7` kurmanche Restaurant
- `post-909ca5ee` Tulus Lotrek
- `post-909ca5ee` Barra

### change.missed (5)

- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-e2a421e9` After about 20 years Lindner is returning to its old name Butter Lindner

### match.brand (3)

- `post-59699006` Café Amano: AMANO Bar ≠ none
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none
- `post-93526d04` Kaffee Peri: none ≠ Kaffee Pia

### match.branch (2)

- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
