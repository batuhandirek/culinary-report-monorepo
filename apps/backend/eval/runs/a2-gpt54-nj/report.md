# Ingestion eval: a2-gpt54-nj

2026-11-05 19:56 UTC · 0 reviews, 58 posts, 0 wordings · 813 cases left out (no reference or no output)
Reading: reader split, claimsModel openai/gpt-5.4, labeller classifier
Tokens: 5,301,057 (315,264 input tokens from the prompt cache)
Spend: $0.168 (paid calls: classifiers)
Models: post-claims: openai/gpt-5.4 (58); claim-labels: typesafe-ai/jev-latest (57); venue-match: openai/gpt-5.4-mini (27)

## Posts and articles

| Metric | a2-gpt54-nj | stored | a2-nemotron | or-smoke | a2-haiku |
|---|---|---|---|---|---|
| Claims found (of the reference) | 85% (513/606) | 56% +29 | 59% +25 | 100% -15 | 88% -4 |
| Claims that are real (of produced) | 84% (925/1103) | 95% -11 | 80% +4 | 100% -16 | 90% -6 |
| Sentiment | 94% (632/675) | 86% +8 | 89% +5 | 100% -6 | 93% +1 |
| Aspect, exact | 83% (559/675) | 63% +20 | 74% +9 | 75% +8 | 81% +2 |
| Aspect, right root | 89% (604/675) | 78% +12 | 83% +7 | 100% -11 | 88% +2 |
| Kind | 91% (616/675) | 47% +44 | 84% +7 | 100% -9 | 89% +3 |
| Kind given at all | 100% (675/675) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 68% (457/675) | — | 66% +2 | 75% -7 | 63% +5 |
| Sentiment, among sure answers | 96% (441/457) | — | 92% +4 | 100% -4 | 96% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 37% (252/675) | — | 38% -1 | 75% -38 | 37% ±0 |
| Aspect, exact, among sure answers | 93% (235/252) | — | 88% +5 | 67% +27 | 94% ±0 |
| Kind: sure answers (p ≥ 0.9, of answered) | 62% (417/675) | — | 59% +3 | 75% -13 | 61% +1 |
| Kind, among sure answers | 96% (402/417) | — | 90% +6 | 100% -4 | 95% +2 |
| Changes that are changes | 63% (20/32) | 46% +16 | 47% +15 | — | 23% +39 |
| Changes found | 80% (8/10) | 38% +43 | 30% +50 | — | 70% +10 |
| Amount | 60% (24/40) | 46% +14 | 26% +34 | — | 80% -20 |
| Foods named, precision | 79% (460/582) | 46% +33 | 74% +5 | 100% -21 | 84% -5 |
| Foods named, recall | 84% (344/409) | 39% +45 | 75% +9 | 100% -16 | 83% +1 |
| Subject (place, city, none) | 94% (904/965) | 85% +9 | 90% +3 | 100% -6 | 92% +1 |
| Claim on the right place | 91% (750/827) | 85% +6 | 92% -2 | 100% -9 | 97% -6 |
| Places found | 90% (100/111) | 73% +17 | 71% +19 | 100% -10 | 89% +1 |
| Places that are places | 88% (100/113) | 85% +3 | 87% +2 | 100% -12 | 92% -3 |
| Match: brand (found places) | 99% (99/100) | 92% +7 | 96% +3 | 50% +49 | 91% +8 |
| Match: branch (right brand) | 96% (82/85) | 97% -1 | 100% -4 | 100% -4 | 96% ±0 |
| Match on the reference's places: brand | 93% (103/111) | — | 93% ±0 | 100% -7 | 91% +2 |
| Match on the reference's places: branch | 95% (81/85) | — | 99% -3 | 100% -5 | 96% -1 |
| Promotional flag | 100% (58/58) | 82% +18 | 96% +4 | 100% ±0 | 98% +2 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Posts and articles

| Metric | a2-gpt54-nj (train) | a2-gpt54-nj (test) | a2-nemotron (test) | or-smoke (test) | a2-haiku (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 85% (513/606) | 59% +25 | 100% -15 | 88% -4 |
| Claims that are real (of produced) | — | 84% (925/1103) | 80% +4 | 100% -16 | 90% -6 |
| Sentiment | — | 94% (632/675) | 89% +5 | 100% -6 | 93% +1 |
| Aspect, exact | — | 83% (559/675) | 74% +9 | 75% +8 | 81% +2 |
| Aspect, right root | — | 89% (604/675) | 83% +7 | 100% -11 | 88% +2 |
| Kind | — | 91% (616/675) | 84% +7 | 100% -9 | 89% +3 |
| Kind given at all | — | 100% (675/675) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 68% (457/675) | 66% +2 | 75% -7 | 63% +5 |
| Sentiment, among sure answers | — | 96% (441/457) | 92% +4 | 100% -4 | 96% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 37% (252/675) | 38% -1 | 75% -38 | 37% ±0 |
| Aspect, exact, among sure answers | — | 93% (235/252) | 88% +5 | 67% +27 | 94% ±0 |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 62% (417/675) | 59% +3 | 75% -13 | 61% +1 |
| Kind, among sure answers | — | 96% (402/417) | 90% +6 | 100% -4 | 95% +2 |
| Changes that are changes | — | 63% (20/32) | 47% +15 | — | 23% +39 |
| Changes found | — | 80% (8/10) | 30% +50 | — | 70% +10 |
| Amount | — | 60% (24/40) | 26% +34 | — | 80% -20 |
| Foods named, precision | — | 79% (460/582) | 74% +5 | 100% -21 | 84% -5 |
| Foods named, recall | — | 84% (344/409) | 75% +9 | 100% -16 | 83% +1 |
| Subject (place, city, none) | — | 94% (904/965) | 90% +3 | 100% -6 | 92% +1 |
| Claim on the right place | — | 91% (750/827) | 92% -2 | 100% -9 | 97% -6 |
| Places found | — | 90% (100/111) | 71% +19 | 100% -10 | 89% +1 |
| Places that are places | — | 88% (100/113) | 87% +2 | 100% -12 | 92% -3 |
| Match: brand (found places) | — | 99% (99/100) | 96% +3 | 50% +49 | 91% +8 |
| Match: branch (right brand) | — | 96% (82/85) | 100% -4 | 100% -4 | 96% ±0 |
| Match on the reference's places: brand | — | 93% (103/111) | 93% ±0 | 100% -7 | 91% +2 |
| Match on the reference's places: branch | — | 95% (81/85) | 99% -3 | 100% -5 | 96% -1 |
| Promotional flag | — | 100% (58/58) | 96% +4 | 100% ±0 | 98% +2 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| hard | 83% (15/18) | 95% (21/22) | 94% (17/18) | 100% (18/18) | 100% (2/2) | 100% (2/2) |
| no-transcript | 85% (90/106) | 92% (146/158) | 85% (95/112) | 96% (107/112) | 89% (32/36) | 97% (31/32) |
| own | 86% (24/28) | 95% (40/42) | 89% (24/27) | 96% (26/27) | 100% (6/6) | 100% (6/6) |
| places:few | 84% (431/512) | 85% (800/946) | 82% (463/567) | 94% (531/567) | 90% (57/63) | 98% (56/57) |
| places:many | 88% (78/89) | 79% (121/153) | 88% (92/104) | 93% (97/104) | 89% (42/47) | 100% (42/42) |
| places:none | 80% (4/5) | 100% (4/4) | 100% (4/4) | 100% (4/4) | 100% (1/1) | 100% (1/1) |
| platform:blog | 83% (282/338) | 81% (546/674) | 81% (299/371) | 92% (343/371) | 97% (30/31) | 100% (30/30) |
| platform:instagram | 94% (62/66) | 98% (99/101) | 84% (65/77) | 97% (75/77) | 81% (13/16) | 92% (12/13) |
| platform:tiktok | 84% (169/202) | 85% (280/328) | 86% (195/227) | 94% (214/227) | 89% (57/64) | 100% (57/57) |
| size:large | 84% (246/292) | 77% (461/595) | 82% (269/329) | 92% (302/329) | 92% (34/37) | 100% (34/34) |
| size:medium | 84% (214/255) | 92% (389/424) | 83% (233/281) | 96% (269/281) | 91% (48/53) | 100% (48/48) |
| size:small | 90% (53/59) | 89% (75/84) | 88% (57/65) | 94% (61/65) | 86% (18/21) | 94% (17/18) |
| transcript | 87% (141/162) | 86% (233/271) | 86% (165/192) | 95% (182/192) | 86% (38/44) | 100% (38/38) |

## Misses

### claims.extra (178)

- `post-22c25ac1` the principle is very simple
- `post-4a742b09` running a restaurant in your 30s hits different
- `post-4a742b09` some days at Village House test your patience
- `post-4c3e2a10` making kebab is a small science
- `post-4c3e2a10` the kebab should remain brown
- `post-4c3e2a10` the speaker wants to serve customers well
- `post-4c3e2a10` putting a plate in would make the whole tomato liquid
- `post-4c3e2a10` the hard part would no longer stay firm
- `post-4c3e2a10` the example item was already hard
- `post-4f942afd` Akkawy is still serving in 2026
- `post-4f942afd` Akkawy was verified open on 22 August 2026
- `post-4f942afd` Akkawy serves hummus
- `post-4f942afd` Akkawy serves Levantine-inspired dishes
- `post-4f942afd` Akkawy is at Kopernikusstraße 8
- `post-4f942afd` Akkawy is quickly becoming Friedrichshain’s favourite hummus place
- `post-4f942afd` Akkawy is one of the best hummus restaurants in the city
- `post-4f942afd` Akkawy was introduced to the writer early this year
- `post-4f942afd` Friedrichshain had Arabic Imbisses on tap but no real, solid, official destination for hu…
- `post-4f942afd` the writer neither loves nor hates hummus
- `post-4f942afd` Akkawy is good for sharing plates with friends
- `post-4f942afd` Akkawy is a place to break bread and pass things around
- `post-4f942afd` Akkawy lets people taste something new and move on
- `post-4f942afd` the writer has been to Akkawy often
- `post-4f942afd` the writer takes visiting friends to Akkawy
- `post-4f942afd` Akkawy serves hummus
- `post-4f942afd` Akkawy's owner is Julian
- `post-4f942afd` Julian is Palestinian
- `post-4f942afd` Akkawy means 'from Acre'
- `post-4f942afd` Julian worked in Acre's best hummus restaurants
- `post-4f942afd` Akkawy makes hummus in the style of Acre
- `post-4f942afd` the hummus is smoother
- `post-4f942afd` the hummus is heavier on tahini
- `post-4f942afd` the hummus highlights the subtle sweetness of the chickpeas against sesame bitterness
- `post-4f942afd` the hummus is not garlic-heavy
- `post-4f942afd` the hummus enhances the dishes it is served with instead of overpowering them
- `post-4f942afd` Julian says the hummus recipe is done, complete and unchangeable
- `post-4f942afd` Akkawy serves dishes where Julian gets to experiment
- `post-4f942afd` Akkawy uses Indian spices, seasonings and techniques
- `post-4f942afd` the mushroom-hummus dish is the best example of Akkawy's experimentation
- `post-4f942afd` the mushroom-hummus dish is the least traditional of Akkawy's dishes
- … 138 more in issues.jsonl

### parts.foods (134)

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
- `post-1e024518` the Masala Dosa is filled with spicy potato: [Masala Dosa, Kartoffel] ≠ [Kartoffel]
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: [Black Beef Dumplings, Blue Pearls] ≠ [Blue Pearls]
- `post-22c25ac1` ten dumplings cost 16 euros: [Dumplings] ≠ []
- `post-22c25ac1` 20 dumplings cost 30 euros: [Dumplings] ≠ []
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: [Mrs. Chens Blue Pearl] ≠ [Dumplings]
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satis…: [Mrs. Chens Blue Pearl] ≠ [Garnelen, Mrs. Chens Blue Pearl]
- `post-22c25ac1` the prices are fairly calculated and worth every cent: [] ≠ [Dumplings]
- `post-24601e6d` trying some German food in Berlin was super exciting: [] ≠ [German food]
- `post-4c3e2a10` at many kebab stores the spit just dries up: [kebab] ≠ []
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: [kebab] ≠ [juice, kebab]
- `post-57ab8313` Like mole, birria is simmered for hours and specially seaso…: [Birria, Mole] ≠ [Birria, Birria]
- `post-57ab8313` Three different chili varieties and some secret ingredients…: [Birria] ≠ [Chilisorten]
- `post-57ab8313` The birria result is great: [Birria] ≠ []
- `post-57ab8313` Taco & Gringo is a go-to spot for lovers of Mexican street …: [] ≠ [mexikanisches Streetfood]
- `post-57ab8313` At Taco & Gringo the broth is seasoned with cloves, coriand…: [Sud] ≠ [Sud, Nelken, Koriandersamen, Pfeffer, Zimt, Oregano, Lorbeerblatt, Kreuzkümmel]
- `post-57ab8313` Three different chili varieties and some secret ingredients…: [Birria] ≠ [Chilisorten]
- `post-57ab8313` The Tacos de Birria are juicy, with fresh ingredients, sauc…: [Tacos de Birria] ≠ [Tacos de Birria, Zutaten, Sauce, Dips]
- `post-57ab8313` The Quesabirrias with cheese cost 12 euros: [Quesabirrias] ≠ [Quesabirrias, Käse]
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: [Quesabirria Vegana] ≠ [Quesabirria Vegana, veganem Käse]
- `post-57ab8313` The Quesabirria Vegana costs 12 euros: [Quesabirria Vegana] ≠ [Quesabirria Vegana, veganem Käse]
- … 94 more in issues.jsonl

### parts.aspect (116)

- `post-1b8b0789` they had 2 Grillplatte: none ≠ portion_size
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: drink_quality ≠ none
- `post-1c78d4ed` The high-altitude, mineral-rich soils are perfect for coffee: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are washed-processed: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: drinks ≠ ingredient_quality
- `post-1c78d4ed` The El Líbano espresso is Arabica: drinks ≠ ingredient_quality
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: none ≠ opening_hours
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: atmosphere ≠ none
- `post-22c25ac1` the women cut, mix and season the Füllungen here in large q…: ingredient_quality ≠ seasoning
- `post-22c25ac1` word about the Manufaktur has already spread in Dunckerstra…: none ≠ location
- `post-22c25ac1` the three women's food truly opens every heart: taste ≠ friendliness
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: seasoning ≠ menu_variety
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: seasoning ≠ taste
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: food ≠ none
- `post-22c25ac1` the five Dumplings are delicious: taste ≠ price_level
- `post-24601e6d` the €48 ticket includes three drinks: price_level ≠ drinks
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: other ≠ amenities
- `post-24601e6d` you get 45 minutes in the ice area: pressure ≠ none
- `post-24601e6d` you get a little introduction video before the ice bar: other ≠ amenities
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: ownership ≠ none
- `post-27fe4363` at Horváth celery gets the fine-dining treatment: menu_variety ≠ presentation
- `post-3d2d364e` the smash veg'd from Veg'd Burger is pure plant-based perfe…: taste ≠ dietary
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: interior ≠ menu_variety
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: ownership ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: ingredient_quality ≠ cooking
- `post-51a97d36` after the meal you always get a Tiramisu: on_the_house ≠ menu_variety
- `post-51a97d36` the Tiramisu goes down comfortably: taste ≠ cooking
- `post-524765b0` People looking for new restaurants, cafés and bakeries usua…: location ≠ menu_variety
- `post-524765b0` Kírkē is a dream come true for everyone who likes savoury f…: menu_variety ≠ food
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: ownership ≠ none
- `post-524765b0` Kírkē is an intimate neighbourhood deli with a wine bar: atmosphere ≠ none
- `post-524765b0` They recommend the sandwich with mushrooms and truffles: taste ≠ advice
- `post-524765b0` Best come hungry, order more than planned and let someone e…: none ≠ pressure
- `post-57ab8313` The birria result is great: taste ≠ food
- `post-57ab8313` The margaritas were developed by Enrico Römer from The Coral: drinks ≠ drink_selection
- `post-57ab8313` The Gringa de Birria is the authors' favourite: taste ≠ menu_variety
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: dietary ≠ advice
- `post-57ab8313` Other specials such as a DJane or DJ are fun: atmosphere ≠ menu_variety
- `post-57ab8313` In Mexico people understand good food and drink: none ≠ food
- `post-58a16831` the landlords did not want a café but were convinced by Ant…: ownership ≠ none
- … 76 more in issues.jsonl

### claims.missed (93)

- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-1b8b0789` the creators were warmly received at Doree 65
- `post-22c25ac1` the new owners gave the three women a share of the profits
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great enjoyment potential
- `post-27fe4363` Horváth is a pick in this week's Key2 Berlin guide
- `post-4a742b09` invitation to make it a date this weekend at Village House
- `post-4c3e2a10` the owner is very proud of his kebab
- `post-4c3e2a10` the owner works with his brother, which goes quite well
- `post-4f942afd` Akkawy is a Friedrichshain classic
- `post-4f942afd` Akkawy is still serving its hummus and Levantine-inspired dishes at Kopernikusstraße 8
- `post-4f942afd` Akkawy is quickly becoming Friedrichshain's favourite hummus place
- `post-4f942afd` Friedrichshain has plenty of Arabic Imbisses but had no real destination for hummus
- `post-4f942afd` Akkawy does the shared-plates way of eating brilliantly
- `post-4f942afd` the author has been to Akkawy often and takes visiting friends there
- `post-4f942afd` owner Julian has worked in Acre's best and most prestigious hummus restaurants
- `post-4f942afd` Akkawy's hummus is the true hummus of Acre
- `post-4f942afd` the hummus is smoother
- `post-4f942afd` the hummus is heavier on tahini, highlighting the chickpeas' sweetness against the sesame…
- `post-4f942afd` the hummus is not garlic-heavy and enhances rather than overpowers the dishes it is serve…
- `post-4f942afd` Akkawy's dishes use Indian spices, seasonings and techniques
- `post-4f942afd` the mushroom-hummus dish is the least traditional of their dishes
- `post-4f942afd` the mushroom-hummus is their signature dish according to Julian
- `post-4f942afd` they ordered hummus with crisp pickled beetroot
- `post-4f942afd` they ordered hummus with a sweet aubergine puree
- `post-4f942afd` the Zahra is a creamy baked cauliflower dish with onions, Indian spices and lashings of t…
- `post-4f942afd` the Shakshuka is a rich, lightly-spiced, almost smoky tomato sauce baked with an egg
- `post-4f942afd` they ordered the classic Fatush salad
- `post-4f942afd` the chilli dipping sauce was refreshingly spicy, actually very hot
- `post-4f942afd` the spread of colours, smells, bowls and textures brings the cuisine to life
- `post-4f942afd` the bitter tahini taste ties all of Akkawy's dishes together
- `post-4f942afd` Akkawy uses Lebanese tahini, the best Julian has ever found
- `post-4f942afd` the tahini's bitterness is offset by fresh herbs and Za'atar
- `post-4f942afd` the tahini is never overpowering or overused
- `post-4f942afd` the pickled beetroot has a satisfyingly sour crunch
- `post-4f942afd` the fried flatbread has a crisp bite
- `post-4f942afd` the salad was perfect
- `post-4f942afd` eating too much of the hummus felt very heavy, like drowning
- `post-4f942afd` Julian brought over deliciously sweet and sour homemade tamarind and cane-sugar lemonades…
- `post-4f942afd` all in all the visit was worth it
- `post-524765b0` Kírkē is run by Tenia Dimakopoulou and Jannis Avramidis, two longtime friends who started…
- … 53 more in issues.jsonl

### claims.place (77)

- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-57ab8313` The margaritas were developed by Enrico Römer from The Coral: Taco & Gringo ≠ The Coral
- `post-58a16831` Bäckerei Johann, a few streets away, supplies Nyde's Croiss…: Bäckerei Johann ≠ Nyde
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano at Hotel Amano now opens its green window to ser…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves passers-by Kaffee and Aperol Spritz: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves Espresso uncomplicatedly through the wind…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano serves Espresso uncomplicatedly through the wind…: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's window is open at least over the summer: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz is unbeatably cheap: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz costs 5 euros: Café Amano ≠ Hotel Amano
- `post-59699006` Café Amano's Aperol Spritz costs 5 euros: Café Amano ≠ Hotel Amano
- `post-59699006` At Café Amano one can also sit relaxed in the hotel foyer a…: Café Amano ≠ Hotel Amano
- `post-59699006` At Café Amano one can also sit relaxed in the hotel foyer a…: Café Amano ≠ Hotel Amano
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: Mrs. Robinsons ≠ Ehli Kebap
- `post-674e7322` Mrs. Robinsons has since closed: Mrs. Robinsons ≠ Nobelhart und Schmutzig
- `post-674e7322` Café Frieda is one of the absolutely strongest casual fine …: Café Frieda ≠ Der Goldene Hahn
- `post-674e7322` Café Frieda has been a BFS favourite since its opening: Café Frieda ≠ Ming Dynastie
- `post-674e7322` Ita Bistro is the best restaurant on Helmholtzplatz: Ita Bistro ≠ Bardele
- `post-674e7322` Ehli Kebap has the best Döner: Ehli Kebap ≠ Papaya
- `post-674e7322` jaja is the best wine bar: jaja ≠ Nobelhart und Schmutzig
- `post-674e7322` Nobelhart und Schmutzig is the best secret wine bar: Nobelhart und Schmutzig ≠ Yeni Adana
- `post-674e7322` Der Goldene Hahn is the best date night restaurant: Der Goldene Hahn ≠ Jones ice cream
- `post-816a40e7` the restaurant is a new opening in Berlin: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` it is a Syrian-Kurdish restaurant in Charlottenburg: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant is at Wilmersdorfer Straße 104: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant serves Syrian-style food: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant serves Syrian-style food: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the opening is on Friday: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant has lots of delicious things: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant also has krüde: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the Fladenbrot is homemade: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` for the opening, Shawarma costs 1 Euro on Friday: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` Shawarma costs 2 Euro on the second opening day: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` 50 percent discount on everything for 3 days: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` the restaurant opens at 13:00 on Friday: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- `post-816a40e7` besides Shawarma and Döner they serve Crispy brostet Chicke…: Kurmanche Restaurant ≠ Surich kurdische Restaurant
- … 37 more in issues.jsonl

### claims.subject (61)

- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4a742b09` building a restaurant in Berlin is about resilience, commun…: place ≠ city
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ none
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the kebab here is not just kebab, it is art: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner got the idea in jail, dreaming of a kebab: place ≠ none
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: place ≠ none
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: place ≠ none
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the owner comes from a catering family: place ≠ none
- `post-4c3e2a10` the gas burner is kept minimal so the kebab only keeps warm…: place ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: place ≠ none
- `post-4c3e2a10` the owner keeps a soft tomato apart so the other tomatoes d…: place ≠ none
- `post-4c3e2a10` the customers have remained faithful: place ≠ none
- `post-57ab8313` The pulled beef develops an intense flavour while braising: none ≠ place
- `post-57ab8313` El Maestro de la Birria and the team put great effort into …: place ≠ none
- `post-57ab8313` Berlin should go to Taco & Gringo and learn: place ≠ city
- `post-650ede57` question whether oil belongs in pasta water: none ≠ place
- `post-75c11d7c` during the day Nichi Getsu focuses on something much more c…: place ≠ none
- `post-75c11d7c` the sushi rice is seasoned with Akazu, the red rice vinegar…: place ≠ none
- `post-75c11d7c` Berlin is full of restaurants vying for attention: city ≠ place
- `post-909ca5ee` By dessert at the latest, the trip to Barlevain in Schönebe…: place ≠ none
- `post-b5e879f0` queuing is the new black on Bergmannstraße: city ≠ none
- `post-b5e879f0` after the long wait the young man orders only a small Decaf…: city ≠ none
- … 21 more in issues.jsonl

### parts.kind (59)

- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ change
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: opinion ≠ fact
- `post-24601e6d` Ice Bar Berlin is 10/10: verdict ≠ opinion
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: opinion ≠ fact
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: fact ≠ opinion
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ verdict
- `post-524765b0` They recommend the sandwich with mushrooms and truffles: opinion ≠ verdict
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: opinion ≠ verdict
- `post-59699006` Café Amano's window is open at least over the summer: fact ≠ deal
- `post-60ff28c2` you must order the Matcha with Kokosmilch: opinion ≠ verdict
- `post-63b83025` a portion of creamy Zaziki: opinion ≠ fact
- `post-650ede57` question whether oil belongs in pasta water: question ≠ fact
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: fact ≠ verdict
- `post-674e7322` Mrs. Robinsons has since closed: change ≠ verdict
- `post-674e7322` Der Goldene Hahn is the best date night restaurant: verdict ≠ opinion
- `post-68b0cd44` never skip the dumplings at Panda Meister: opinion ≠ verdict
- `post-6c0e92d2` they had the Le Classique with homemade ham cuit au torchon…: fact ≠ opinion
- `post-6c0e92d2` the secret sauce on the Le Classique is dangerously good: opinion ≠ fact
- `post-6c0e92d2` they then had the Le Rostbif with roast beef, chive mayo, p…: fact ≠ opinion
- `post-6c0e92d2` Kroque also serves drinks: fact ≠ opinion
- `post-6c0e92d2` the raspberry daiquiri is just sweet enough and maybe a bit…: opinion ≠ fact
- `post-6c0e92d2` Kroque is already more than just a lunch spot: opinion ≠ event
- `post-6c0e92d2` Kroque has held evenings with guest DJs and special drinks,…: event ≠ fact
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: fact ≠ opinion
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: fact ≠ opinion
- `post-75c11d7c` come by Nichi Getsu at lunch and feel like you discovered a…: verdict ≠ opinion
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: verdict ≠ fact
- `post-8901fb9b` Ming Dynasty on Victoria Park is the best Chinese restaurant: verdict ≠ fact
- `post-8901fb9b` at Papaya he eats a classic red curry with duck: fact ≠ opinion
- `post-8901fb9b` Mustafa's is the most overrated place in Berlin: verdict ≠ opinion
- `post-909ca5ee` The white giant beans with Chili Crunch are a recommended s…: opinion ≠ fact
- `post-909ca5ee` The French classic Oeuf Mayo is a recommended starter: opinion ≠ fact
- `post-93526d04` the unnamed baklava shop has 4.8 stars: fact ≠ opinion
- `post-93526d04` they rate Kaffee Peri 7 out of 10: verdict ≠ opinion
- `post-935c2fd2` restaurant revenue in Germany fell by 4 percent according t…: fact ≠ change
- `post-9f93c25b` they are currently at Club Kitchen: fact ≠ opinion
- `post-9f93c25b` Big Window is number 9, one of his favourite meat restauran…: verdict ≠ opinion
- `post-9f93c25b` Mondapaz is number 8 and he likes going there at lunchtime: verdict ≠ opinion
- … 19 more in issues.jsonl

### parts.sentiment (43)

- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: positive ≠ neutral
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: positive ≠ neutral
- `post-24601e6d` you get a little passport at Ice Bar Berlin, which is dead …: positive ≠ neutral
- `post-27fe4363` Horváth is Sebastian Frank's restaurant: neutral ≠ positive
- `post-59699006` Café Amano's window is open at least over the summer: neutral ≠ positive
- `post-63b83025` a portion of creamy Zaziki: positive ≠ neutral
- `post-674e7322` Samina & Ben also owned Mrs. Robinsons: neutral ≠ positive
- `post-674e7322` Mrs. Robinsons has since closed: neutral ≠ positive
- `post-68b0cd44` the yu-xiang aubergine was the most unexpected dish: positive ≠ neutral
- `post-6c0e92d2` they had the Le Classique with homemade ham cuit au torchon…: neutral ≠ positive
- `post-6c0e92d2` the secret sauce on the Le Classique is dangerously good: positive ≠ neutral
- `post-6c0e92d2` they then had the Le Rostbif with roast beef, chive mayo, p…: neutral ≠ positive
- `post-6c0e92d2` the Mousse au Chocolat with lemon zest and a pinch of sea s…: positive ≠ neutral
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: positive ≠ neutral
- `post-6c0e92d2` Kroque also serves drinks: neutral ≠ mixed
- `post-6c0e92d2` the raspberry daiquiri is just sweet enough and maybe a bit…: positive ≠ neutral
- `post-6c0e92d2` Kroque is already more than just a lunch spot: positive ≠ neutral
- `post-73286ffe` the Heitlinger Brasserie promises special evenings in a new…: positive ≠ neutral
- `post-75c11d7c` a classic Chirashi bowl arranges neat, flawless slices of r…: neutral ≠ positive
- `post-75c11d7c` the fish used just lacks the perfect shape or look a flawle…: neutral ≠ negative
- `post-75c11d7c` Berlin is full of restaurants vying for attention: neutral ≠ positive
- `post-8901fb9b` the best burger is the Big Mac thing the Goldies boys do: positive ≠ neutral
- `post-8901fb9b` Ming Dynasty on Victoria Park is the best Chinese restaurant: positive ≠ neutral
- `post-8901fb9b` at Papaya he eats a classic red curry with duck: neutral ≠ positive
- `post-909ca5ee` The white giant beans with Chili Crunch are a recommended s…: positive ≠ neutral
- `post-909ca5ee` The French classic Oeuf Mayo is a recommended starter: positive ≠ neutral
- `post-93526d04` the unnamed baklava shop has 4.8 stars: neutral ≠ positive
- `post-9f93c25b` they are currently at Club Kitchen: neutral ≠ positive
- `post-ad7494e5` Calli nailed the branding, which is inspired by the owners'…: positive ≠ neutral
- `post-b5e879f0` on the last evening before closing the owner only reluctant…: positive ≠ negative
- `post-b5e879f0` "Gerne wie immer" was enough to order: positive ≠ neutral
- `post-babe1142` Enrico won't make his recipes healthier or lower in sugar: neutral ≠ positive
- `post-babe1142` during Berlin Ice Cream Week, 6 to 12 May 2021, 31 of the c…: neutral ≠ positive
- `post-c4e7c0a9` a beautiful blue wall colour, now called "Blau Zaal", was u…: positive ≠ neutral
- `post-db280ef6` 572Pasta ends overpriced lunch: positive ≠ negative
- `post-dfe2d586` The Alley's two special limited flavours belong on your foo…: positive ≠ neutral
- `post-dfe2d586` recommended to go to The Alley with friends, order both dri…: positive ≠ neutral
- `post-fc96acff` Berliners eat lunch quickly and without ceremony: neutral ≠ negative
- `post-fc96acff` Facil's choreographed service may feel suffocating to some …: mixed ≠ negative
- … 3 more in issues.jsonl

### parts.amount (16)

- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-3d9147ff` Schüsseldienst does bowls a little differently: —  ≠ 3 money
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: —  ≠ 3 money
- `post-3d9147ff` Fatoush does bowls a little differently: —  ≠ 3 money
- `post-524765b0` On Sundays there are five meze with tsipouro, a small Greek…: —  ≠ 5 money
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 2 minutes
- `post-93526d04` the unnamed baklava shop has 4.8 stars: —  ≠ 4.8 money
- `post-b5e879f0` Restaurant India has closed after 31 years: —  ≠ 31 minutes
- `post-babe1142` Peggy Bee is still operating in 2026: —  ≠ 2026 money
- `post-babe1142` lesser gelaterias in Berlin get fifty-person queues: —  ≠ 50 minutes
- `post-d90ac864` the food was rated 10 out of 10: —  ≠ 10 money
- `post-fc96acff` of Berlin's 19 Michelin-starred restaurants only one opens …: —  ≠ 19 money
- `post-fc96acff` Joachim Gerner came to Facil in 2006 as sous-chef and has b…: —  ≠ 2006 money
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money
- `post-fc96acff` Facil has not lost its glamour at 25: —  ≠ 25 minutes

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

### change.false (12)

- `post-22c25ac1` Yumcha Heroes Manufaktur now offers street sales
- `post-4c3e2a10` the hard part would no longer stay firm
- `post-524765b0` the Vorias & Helios Orange Assyrtiko later became a whole bottle at Kírkē Deli
- `post-59699006` Hotel Amano is opening its green window now
- `post-60ff28c2` Sandos is open Wednesday to Sunday
- `post-935c2fd2` turnover in the gastronomy sector in Germany has fallen by 4 percent
- `post-b5e879f0` the small table with the always-burning candle in the window niche at Restaurant India is…
- `post-babe1142` buffalo ice cream has been increasing in popularity in recent years in Italy
- `post-c4e7c0a9` seasonal dishes at Sabon change regularly
- `post-d232f1ca` ROY Hops Kombucha is back
- `post-fc96acff` Jonas Zörner is chef de cuisine at Lorenz Adlon Esszimmer
- `post-fc96acff` Wenzel Pankratz runs Forsthaus Strelitz

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

### match.branch (3)

- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burger - NK
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-dfe2d586` The Alley: brand only ≠ The Alley Tea House Berlin-Mitte

### change.missed (2)

- `post-73286ffe` the restaurant at Weingut Heitlinger becomes the Heitlinger Brasserie from 1 November
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room

### match.brand (1)

- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
