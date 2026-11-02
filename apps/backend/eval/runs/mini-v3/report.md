# Ingestion eval: mini-v3

2026-11-01 15:11 UTC · 0 reviews, 199 posts, 0 wordings · 672 cases left out (no reference or no output)
Tokens: 1,443,693
Models: post-claims: openai/gpt-5.4-mini (199); claim-parts: openai/gpt-5.4-mini (198); venue-match: openai/gpt-5.4-mini (91)

## Posts and articles

| Metric | mini-v3 | stored | mini-v2 | mini-v1 | mini-base-2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 82% (1710/2077) | 56% +27 | 81% +1 | 72% +10 | 74% +8 |
| Claims that are real (of produced) | 87% (2370/2728) | 95% -8 | 81% +5 | 87% ±0 | 89% -2 |
| Sentiment | 87% (2162/2497) | 86% +1 | 87% ±0 | 88% -1 | 87% ±0 |
| Aspect, exact | 60% (1514/2507) | 63% -3 | 62% -1 | 63% -3 | 62% -2 |
| Aspect, right root | 75% (1887/2507) | 78% -2 | 76% -1 | 79% -3 | 76% -1 |
| Kind | 83% (2070/2497) | 47% +36 | 82% +1 | 81% +1 | 80% +3 |
| Kind given at all | 100% (2497/2507) | 4% +96 | 98% +2 | 100% ±0 | 100% ±0 |
| Changes that are changes | 51% (33/65) | 46% +4 | 54% -3 | 48% +3 | 42% +9 |
| Changes found | 59% (19/32) | 38% +22 | 66% -6 | 41% +19 | 38% +22 |
| Amount | 43% (63/146) | 46% -3 | 59% -15 | 58% -15 | 59% -15 |
| Foods named, precision | 66% (798/1206) | 46% +20 | 63% +3 | 63% +4 | 68% -2 |
| Foods named, recall | 54% (734/1368) | 39% +15 | 54% -1 | 53% +1 | 63% -9 |
| Subject (place, city, none) | 89% (2221/2507) | 85% +4 | 81% +7 | 87% +2 | 87% +2 |
| Claim on the right place | 89% (1893/2121) | 85% +5 | 89% +1 | 88% +2 | 89% ±0 |
| Places found | 89% (386/433) | 73% +16 | 87% +3 | 82% +7 | 81% +8 |
| Places that are places | 91% (386/424) | 85% +6 | 90% +1 | 90% +1 | 90% +1 |
| Match: brand (found places) | 93% (360/386) | 92% +1 | 93% ±0 | 93% +1 | 93% ±0 |
| Match: branch (right brand) | 96% (301/314) | 97% -1 | 95% +1 | 96% ±0 | 94% +1 |
| Match on the reference's places: brand | 92% (400/433) | — | 93% -1 | 92% ±0 | 93% -1 |
| Match on the reference's places: branch | 96% (328/342) | — | 97% -1 | 96% ±0 | 96% ±0 |
| Promotional flag | 78% (156/199) | 82% -4 | 78% +1 | 78% +1 | 79% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Posts and articles

| Metric | mini-v3 (train) | mini-v3 (test) | mini-v2 (test) | mini-v1 (test) | mini-base-2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 82% | 84% (507/606) | 88% -4 | 69% +15 | 69% +15 |
| Claims that are real (of produced) | 87% | 87% (739/853) | 84% +2 | 83% +4 | 91% -5 |
| Sentiment | 86% | 87% (670/766) | 86% +1 | 91% -4 | 90% -2 |
| Aspect, exact | 61% | 60% (461/768) | 62% -2 | 65% -5 | 64% -4 |
| Aspect, right root | 76% | 75% (574/768) | 75% ±0 | 78% -3 | 78% -3 |
| Kind | 83% | 83% (639/766) | 83% +1 | 85% -2 | 84% ±0 |
| Kind given at all | 100% | 100% (766/768) | 99% +1 | 99% ±0 | 99% ±0 |
| Changes that are changes | 52% | 48% (10/21) | 50% -2 | 47% +1 | 29% +19 |
| Changes found | 55% | 70% (7/10) | 80% -10 | 40% +30 | 20% +50 |
| Amount | 35% | 69% (25/36) | 53% +17 | 73% -4 | 71% -1 |
| Foods named, precision | 63% | 73% (267/368) | 64% +9 | 68% +5 | 72% +1 |
| Foods named, recall | 53% | 54% (237/435) | 50% +4 | 55% ±0 | 66% -12 |
| Subject (place, city, none) | 89% | 88% (676/768) | 81% +7 | 87% +1 | 83% +5 |
| Claim on the right place | 89% | 91% (582/641) | 86% +5 | 80% +11 | 85% +5 |
| Places found | 91% | 84% (93/111) | 86% -2 | 82% +2 | 79% +5 |
| Places that are places | 92% | 87% (93/107) | 88% -1 | 88% -1 | 85% +1 |
| Match: brand (found places) | 94% | 92% (86/93) | 92% +1 | 92% ±0 | 92% ±0 |
| Match: branch (right brand) | 95% | 99% (71/72) | 97% +1 | 96% +3 | 96% +3 |
| Match on the reference's places: brand | 93% | 92% (102/111) | 94% -2 | 89% +3 | 90% +2 |
| Match on the reference's places: branch | 96% | 96% (81/84) | 98% -1 | 96% +1 | 98% -2 |
| Promotional flag | 78% | 79% (46/58) | 79% ±0 | 78% +2 | 83% -3 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| hard | 79% (58/73) | 93% (74/80) | 73% (58/79) | 92% (73/79) | 100% (11/11) | 100% (11/11) |
| no-transcript | 88% (426/482) | 91% (588/644) | 69% (420/610) | 90% (549/610) | 92% (117/127) | 94% (110/117) |
| own | 89% (59/66) | 90% (106/118) | 74% (78/106) | 92% (98/106) | 100% (20/20) | 100% (20/20) |
| places:few | 84% (1247/1490) | 88% (1802/2049) | 65% (1208/1869) | 88% (1634/1864) | 84% (156/186) | 94% (147/156) |
| places:many | 79% (454/578) | 84% (557/664) | 48% (298/627) | 83% (518/622) | 93% (228/245) | 93% (211/228) |
| places:none | 100% (9/9) | 73% (11/15) | 73% (8/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 79% (844/1067) | 85% (1171/1385) | 52% (661/1263) | 83% (1045/1253) | 83% (166/199) | 96% (160/166) |
| platform:instagram | 89% (288/325) | 93% (402/432) | 71% (296/415) | 89% (368/415) | 89% (63/71) | 94% (59/63) |
| platform:tiktok | 84% (578/685) | 87% (797/911) | 67% (557/829) | 90% (749/829) | 96% (157/163) | 90% (141/157) |
| size:large | 81% (826/1016) | 84% (1134/1343) | 54% (662/1230) | 83% (1014/1222) | 85% (162/191) | 95% (154/162) |
| size:medium | 81% (625/767) | 91% (849/930) | 64% (564/878) | 89% (783/876) | 93% (132/142) | 92% (121/132) |
| size:small | 88% (259/294) | 85% (387/455) | 72% (288/399) | 91% (365/399) | 92% (92/100) | 92% (85/92) |
| transcript | 83% (440/528) | 87% (611/699) | 68% (433/634) | 90% (568/634) | 96% (103/107) | 87% (90/103) |

## Misses

### parts.aspect (993)

- `post-020c68fb` the brewery brews its birre in the market's cellars: drinks ≠ food
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: none ≠ menu_variety
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: menu_variety ≠ location
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026: none ≠ menu_variety
- `post-047130f4` Salami Social Club is the tasty new kid on the Friedrichsha…: taste ≠ none
- `post-047130f4` Salami Social Club plays with cool pizza combinations: menu_variety ≠ vibe
- `post-047130f4` Salami Social Club wants a great atmosphere to grab a slice: atmosphere ≠ vibe
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: seasoning ≠ taste
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: none ≠ food
- `post-079d7302` Egyptian food in Berlin: none ≠ food
- `post-088e18e6` Fatih Servet has locations at Warschauer Str., Mall of Berl…: location ≠ ownership
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: none ≠ other
- `post-0a8f804b` People come by Cousins even before opening time: queue ≠ opening_hours
- `post-0a8f804b` Cousins' spirit is about sharing the space with friends, fa…: atmosphere ≠ space
- `post-0a8f804b` Cousins' spirit is about sharing the space with friends, fa…: atmosphere ≠ vibe
- `post-0a8f804b` A visit to Cousins evokes childhood memories for some: authenticity ≠ vibe
- `post-0a8f804b` The Kaylin is a tamarind slushie with cedar-lime-leaf ice c…: food ≠ drinks
- `post-0a8f804b` The Kaylin delivers an invigorating, paradoxical combinatio…: taste ≠ drink_quality
- `post-0a8f804b` Every week Kavita and Marieke create a secret flavour whose…: menu_variety ≠ food
- `post-0a8f804b` Every week Kavita and Marieke create a secret flavour whose…: menu_variety ≠ food
- `post-0a8f804b` At Cousins there is room for everyone: atmosphere ≠ family_pets
- `post-0a8f804b` Even the grumpiest customers leave Cousins satisfied: none ≠ taste
- `post-0d1e7abc` Isla sells Kaffeebohnen for home: menu_variety ≠ food
- `post-0d1e7abc` the prices are appropriate for the quality: value_for_money ≠ price_level
- `post-0d484513` Kissabo serves traditionally prepared Matcha: authenticity ≠ cooking
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: none ≠ other
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: none ≠ other
- `post-0d484513` Paule’s Metal Eck offers heavy music: atmosphere ≠ none
- `post-0d484513` Paule’s Metal Eck has old-school rock bar chaos under red l…: atmosphere ≠ vibe
- `post-0d484513` Paule’s Metal Eck is a loud, unpolished rock bar: noise ≠ interior
- `post-0d484513` NOUMI Sushi Lounge is a stylish Asian spot to go this summer: none ≠ food
- `post-0d484513` NOUMI Sushi Lounge has a chic, elegant lounge atmosphere: atmosphere ≠ drinks
- `post-0d484513` Yumcha Heroes dumpling manufactory is praised for its handm…: food ≠ atmosphere
- `post-0dde5eb7` the dish is beautifully plated with attention to detail: presentation ≠ food
- `post-0dde5eb7` the dish is for everyone who appreciates good Fleisch and l…: ingredient_quality ≠ value_for_money
- `post-0dfaed46` ACID is easily one of the creator's favorite spots in Berlin: none ≠ vibe
- `post-0dfaed46` ACID is a favorite for its design: interior ≠ vibe
- `post-11f0057b` Magma is a day bar, wine bar and scene hangout at once: none ≠ other
- `post-11f0057b` the Hauswein is a Greek orange wine: drinks ≠ drink_quality
- `post-11f0057b` sharing a few small plates with the drinks is definitely wo…: food ≠ value_for_money
- … 953 more in issues.jsonl

### parts.foods (791)

- `post-01f172dd` the KATSU-SANDO has panko-crusted soy steak, pickled red on…: [KATSU-SANDO, panko-crusted soy steak, pickled red onion, shaved fresh apple, tonkatsu mayo] ≠ [katsu-sando]
- `post-01f172dd` the KATSU-SANDO is served on sliced, toasted shokupan: [shokupan] ≠ [katsu-sando, shokupan]
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: [pasta fresca, pizza, dolci] ≠ [pasta, pizza]
- `post-020c68fb` the brewery brews its birre in the market's cellars: [birre] ≠ []
- `post-020c68fb` about ten different birre to taste, not bad: [birre] ≠ []
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: [pasta fresca, pizza, dolci] ≠ [pasta]
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: [Tacos, Pasta, veganem Brunch] ≠ [tacos, pasta, vegan brunch]
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: [Tacos, Pasta, veganem Brunch] ≠ [tacos, pasta, vegan brunch]
- `post-047130f4` Salami Social Club serves a black dough pizza with blutwurs…: [black dough, blutwurst, bacon] ≠ []
- `post-047130f4` Salami Social Club just put a Hawaiian on the menu: [Hawaiian] ≠ [pizza]
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: [Nudja] ≠ [Nduja]
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026: [] ≠ [pizza]
- `post-047130f4` Salami Social Club plays with cool pizza combinations: [pizza] ≠ [pizza, beer]
- `post-047130f4` Salami Social Club wants a great atmosphere to grab a slice: [] ≠ [pizza, beer]
- `post-047130f4` Ben says the best pizza they sell is the plain old salami: [salami] ≠ [pizza, salami]
- `post-047130f4` Salami Social Club just put a Hawaiian on the menu: [Hawaiian] ≠ [pizza]
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: [Nudja] ≠ [Nduja]
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: [Steak Döner] ≠ [Döner]
- `post-0a8f804b` Flavours range from Gochujang-Karamell to silky tofu with p…: [Gochujang-Karamell, seidigem Tofu mit Erdnusskrokant und frischem Koriander] ≠ []
- `post-0a8f804b` The Kaylin is a tamarind slushie with cedar-lime-leaf ice c…: [Kaylin, Tamarinden-Slushie, Zeder-Limettenblatt-Eis] ≠ [Kaylin]
- `post-0a8f804b` Every week Kavita and Marieke create a secret flavour whose…: [Geheimsorte] ≠ []
- `post-0a8f804b` The ice cream at Cousins is so good even vanilla can feel b…: [Eis] ≠ [Vanille]
- `post-0a8f804b` None of Cousins' flavours is boring: [] ≠ [ice cream]
- `post-0d1e7abc` Isla has unbelievably good Kaffee: [Kaffee] ≠ [coffee]
- `post-0d1e7abc` Isla sells Kaffeebohnen for home: [Kaffeebohnen] ≠ [coffee beans]
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: [Kuchen, Gebäck] ≠ [cakes, pastries]
- `post-0d1e7abc` the author especially likes the Grilled Cheese mit Kimchi: [Grilled Cheese mit Kimchi] ≠ [Grilled Cheese, Kimchi]
- `post-0d1e7abc` Isla has unbelievably good Kaffee: [Kaffee] ≠ [coffee]
- `post-0d1e7abc` Isla sells Kaffeebohnen for home: [Kaffeebohnen] ≠ [coffee beans]
- `post-0d1e7abc` Isla has really good food: [] ≠ [food]
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: [Kuchen, Gebäck] ≠ [cakes]
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: [Kuchen, Gebäck] ≠ [pastries]
- `post-0d1e7abc` the author especially likes the Grilled Cheese mit Kimchi: [Grilled Cheese mit Kimchi] ≠ [Grilled Cheese, Kimchi]
- `post-0d484513` NOUMI Sushi Lounge serves colorful noodles, sushi and cockt…: [Nudeln, Sushi, Cocktails] ≠ [Sushi]
- `post-0d484513` Yumcha Heroes dumpling manufactory is praised for its handm…: [Teigtaschen] ≠ []
- `post-0d484513` NOUMI Sushi Lounge is a stylish Asian spot to go this summer: [] ≠ [Nudeln]
- `post-0d484513` NOUMI Sushi Lounge has a chic, elegant lounge atmosphere: [] ≠ [Cocktails]
- `post-0dde5eb7` the dish has a good piece of Fleisch: [Fleisch] ≠ []
- `post-0dde5eb7` the dish comes with tenderly melted Käse: [Käse] ≠ []
- `post-0dde5eb7` the dish comes with a dark, aromatic Soße: [Soße] ≠ []
- … 751 more in issues.jsonl

### parts.kind (427)

- `post-01f172dd` they will be at their next pop-up: event ≠ fact
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: opinion ≠ fact
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: opinion ≠ fact
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: opinion ≠ fact
- `post-020c68fb` about ten different birre to taste, not bad: opinion ≠ fact
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` the Neukölln spots include tasty veggie options: opinion ≠ fact
- `post-047130f4` Salami Social Club just put a Hawaiian on the menu: new_item ≠ change
- `post-0a8f804b` The author will take his own cousin to Cousins: verdict ≠ fact
- `post-0d1e7abc` there are very many vegan options: opinion ≠ fact
- `post-0d484513` India Club Restaurant impresses with North Indian tandoor c…: opinion ≠ fact
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: fact ≠ opinion
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: fact ≠ verdict
- `post-0dde5eb7` at Bocca Felice the food can be something special: opinion ≠ fact
- `post-11f0057b` new guests are noticed immediately despite the full terrace: opinion ≠ fact
- `post-11f0057b` the Hauswein is a Greek orange wine: fact ≠ opinion
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: opinion ≠ fact
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: opinion ≠ fact
- `post-11f0057b` at Magma such evenings are now possible all year round: opinion ≠ fact
- `post-11f0057b` the large corner venue was stylishly fitted out: opinion ≠ fact
- `post-1ca1ffee` Doree 65 is at Torfstraße 9, Berlin: fact ≠ opinion
- `post-1ca1ffee` the creator celebrates Doree 65 more than any steakhouse: verdict ≠ opinion
- `post-1ca1ffee` if you want to experience Wedding, drop by Doree 65: verdict ≠ opinion
- `post-1d0aeaca` Miriam is a sweet-toothed, bright-eyed, impassioned ice cre…: opinion ≠ fact
- `post-1d0aeaca` Die Eismacher's other flavors are also strange: opinion ≠ fact
- `post-1d0aeaca` Miriam scrunched her nose at a cold doner flavor: opinion ≠ fact
- `post-1d0aeaca` the vegan chocolate is delightful: opinion ≠ fact
- `post-1d0aeaca` a sauerkraut with lemon flavor actually doesn't sound too b…: opinion ≠ fact
- `post-2161780e` the Healthy Matcha is just right for everyone who loves the…: opinion ≠ new_item
- `post-217c8e79` the dessert is awesome: opinion ≠ fact
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: opinion ≠ change
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen Jun…: fact ≠ opinion
- `post-22c25ac1` the Manufaktur puts a deserved spotlight on the women of th…: opinion ≠ change
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ fact
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ fact
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: opinion ≠ fact
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: opinion ≠ fact
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: opinion ≠ fact
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: opinion ≠ fact
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: opinion ≠ fact
- … 387 more in issues.jsonl

### claims.missed (367)

- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- `post-01f172dd` the shokupan is soft like a pillow
- `post-01f172dd` they serve hot, stuffed sandwiches
- `post-0216fd1d` Neukölln has places to eat well and cheaply
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln
- `post-047130f4` only a small handful of places in Berlin serve good pizza
- `post-047130f4` Salami Social Club serves some of the best beer they can get
- `post-047130f4` the craft beer scene is one of the most exciting things in Berlin
- `post-047130f4` Salami Social Club serves quality Berlin brews and beers from further afield
- `post-047130f4` Salami Social Club serves its beers at the best price they can
- `post-047130f4` Nudja on pizza is absolutely delicious
- `post-0a8f804b` Cousins serves generous scoops
- `post-0a8f804b` Going elsewhere instead of waiting for Cousins is foolish
- `post-0a8f804b` Kavita and Marieke opened Cousins
- `post-0a8f804b` The Kaylin is a particular crowd favourite
- `post-0d1e7abc` Isla has existed for 10 years
- `post-11f0057b` Reichenberger Straße in Kreuzberg has legendary status for mild summer evenings
- `post-11f0057b` the Hauswein is super quaffable
- `post-11f0057b` Magma has a lighting concept worthy of the name
- `post-11f0057b` Magma is open Wed+Thu 10–0, Fri+Sat 10–1, Sun 10–21
- `post-165a9370` the Indian restaurant has colorful lights
- `post-1b8b0789` they had 2 Grillplatte
- `post-1c0d4023` Cookies Cream is recommended by 5 food editorial teams
- `post-1c0d4023` Mastan is recommended by 5 food editorial teams
- `post-1c0d4023` Barra is recommended by 5 food editorial teams
- `post-1c0d4023` Sathutu is recommended by 5 food editorial teams
- `post-1c0d4023` Stoke is recommended by 5 food editorial teams
- `post-1c0d4023` Gazzo Pizza is recommended by 5 food editorial teams
- `post-1c0d4023` Michelberger Restaurant is recommended by 5 food editorial teams
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spirit
- `post-1ca1ffee` the creator loves the owner's character
- `post-1ca1ffee` the best Achos charmutas in all of Germany
- `post-1ca1ffee` you will not find these prices and this quality anywhere else
- `post-1ca1ffee` the steak was top and really juicy
- `post-1ca1ffee` if you come as a pair, treat yourself to the Achoschare mother grill plate
- `post-1d0aeaca` Die Eismacher has a near-sorbet mixing pineapple and mint
- … 327 more in issues.jsonl

### claims.extra (358)

- `post-01239695` the unidentified girl "ATE"
- `post-01431335` the trip is worth saving
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` a good, successful day
- `post-0a8f804b` the flavors bring dishes and ingredients from around the world together in a unique way
- `post-0a8f804b` the Kaylin feels both bold and subtle
- `post-0a8f804b` even the grumpiest customers leave satisfied
- `post-0a8f804b` Marieke says seeing the grumps smile gives her a brighter view of the world
- `post-0d484513` the article says Café Ploetz is a review highlight
- `post-0d484513` Yumcha Heroes makes handmade dumplings
- `post-0fa29641` the post is a Berlin guide for Kreuzberg
- `post-0fa29641` the spots are tagged so the post can be saved for later
- `post-0fa29641` the first photo is from Magma Berlin
- `post-0fa29641` the last photo is from La Maison Berlin
- `post-11f0057b` the dish is garnished with a creamy tuna sauce
- `post-14d4fc29` Heimatliebe trifft Fernweh
- `post-1c0d4023` Nobelhart & Schmutzig is in Kreuzberg
- `post-1c0d4023` Nobelhart & Schmutzig serves German food
- `post-1c0d4023` Rutz Restaurant is in Mitte
- `post-1c0d4023` Rutz Restaurant is a bar
- `post-1c0d4023` Tulus Lotrek is in Kreuzberg
- `post-1c0d4023` Coda is in Neukoelln
- `post-1c0d4023` Coda is a bar
- `post-1c0d4023` Restaurant Tim Raue serves Asian food
- `post-1c0d4023` Funky Fisch serves seafood
- `post-1c0d4023` the ranking is based on the number of independent editorial recommendations
- `post-1c0d4023` the recommendations are aggregated automatically from publicly available sources
- `post-1c0d4023` the information comes without guarantee
- `post-1c25f2d1` the post is about a market
- `post-1ca1ffee` the place is cool
- `post-1d0aeaca` Die Eismacher is an ice cream shop
- `post-1d0aeaca` Miriam takes inspiration from the world around her
- `post-1d0aeaca` Ube is grown from the ground
- `post-1d0aeaca` sauerkraut with lemon could be the Berlin flavor
- `post-1d0aeaca` cold doner is suggested as the Berlin flavor
- `post-1d0aeaca` Miriam dislikes the cold doner idea
- `post-1d0aeaca` anything with beer fits Berliners
- `post-2161780e` the matcha is meant to be enjoyed consciously and calmly
- `post-217c8e79` the dessert has a jelly texture and red beans
- … 318 more in issues.jsonl

### parts.sentiment (335)

- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: positive ≠ neutral
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: positive ≠ neutral
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: positive ≠ neutral
- `post-020c68fb` about ten different birre to taste, not bad: positive ≠ neutral
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` the Neukölln spots include tasty veggie options: positive ≠ neutral
- `post-0a8f804b` The ice cream at Cousins is so good even vanilla can feel b…: positive ≠ negative
- `post-0a8f804b` The author will take his own cousin to Cousins: positive ≠ neutral
- `post-0d484513` India Club Restaurant impresses with North Indian tandoor c…: positive ≠ neutral
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: neutral ≠ positive
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: neutral ≠ positive
- `post-0dde5eb7` at Bocca Felice the food can be something special: positive ≠ neutral
- `post-11f0057b` new guests are noticed immediately despite the full terrace: positive ≠ neutral
- `post-11f0057b` the Hauswein is a Greek orange wine: neutral ≠ positive
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: positive ≠ neutral
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: positive ≠ neutral
- `post-11f0057b` at Magma such evenings are now possible all year round: positive ≠ neutral
- `post-11f0057b` a date night at Magma is better without hearing about the l…: mixed ≠ positive
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams: positive ≠ neutral
- `post-1ca1ffee` the prices are not just Bundesliga but Champions League: positive ≠ negative
- `post-1d0aeaca` Die Eismacher's flavours change and may differ from the ori…: neutral ≠ positive
- `post-1d0aeaca` Miriam is a sweet-toothed, bright-eyed, impassioned ice cre…: positive ≠ neutral
- `post-1d0aeaca` the Ube flavor is insanely weird: positive ≠ negative
- `post-1d0aeaca` Miriam scrunched her nose at a cold doner flavor: negative ≠ positive
- `post-217c8e79` Fischsoße is very popular in Vietnam: neutral ≠ positive
- `post-217c8e79` the dessert is awesome: positive ≠ neutral
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: positive ≠ neutral
- `post-22c25ac1` the Manufaktur puts a deserved spotlight on the women of th…: positive ≠ neutral
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: positive ≠ neutral
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: positive ≠ neutral
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: positive ≠ neutral
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: positive ≠ neutral
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: positive ≠ neutral
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: positive ≠ neutral
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: positive ≠ neutral
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: positive ≠ neutral
- `post-22c25ac1` the homemade Eistee is not too sweet and goes wonderfully w…: positive ≠ neutral
- `post-22c25ac1` you can take fresh Dumplings home or stock up on a frozen a…: neutral ≠ positive
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: neutral ≠ positive
- `post-22c25ac1` the Manufaktur is a gain for everyone who loves good food a…: positive ≠ neutral
- … 295 more in issues.jsonl

### claims.subject (286)

- `post-020c68fb` if you have never been to Markthalle Neun you cannot say yo…: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: none ≠ place
- `post-047130f4` salmon on pizza just doesn't work: none ≠ place
- `post-047130f4` tuna fish should not be eaten on pizza: none ≠ place
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-0fa29641` Magma deserves a spot in the author's Kreuzberg top places: place ≠ city
- `post-0fa29641` La Maison deserves a spot in the author's Kreuzberg top pla…: place ≠ city
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` whipped butter always works: place ≠ none
- `post-11f0057b` the whipped butter is refined with Maldon salt: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ none
- `post-11f0057b` at the next table people talk about their last Berghain vis…: place ≠ none
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: place ≠ none
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ city
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: none ≠ place
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are washed-processed: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano espresso tastes of stone fruits, vanilla and …: none ≠ place
- `post-1c78d4ed` El Líbano originates from El Líbano, Tolima, Colombia: none ≠ place
- `post-1c78d4ed` The El Líbano espresso is Arabica: none ≠ place
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: none ≠ place
- `post-1c78d4ed` The El Líbano beans are available through the roaster's web…: none ≠ city
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the meat is grilled over charcoal: place ≠ none
- `post-217c8e79` the gegrillter Schweinebauch is delicious with grill aromas: place ≠ none
- `post-217c8e79` the dessert is the creator's favourite snack: place ≠ none
- … 246 more in issues.jsonl

### claims.place (228)

- `post-0d484513` Yumcha Heroes dumpling manufactory is praised for its handm…: Yumcha Heroes ≠ NOUMI Sushi Lounge Berlin
- `post-106450e8` Amato has fun drinks: Amato ≠ Amato Berlin
- `post-106450e8` the Coconut Pandan Cloud is so good: Amato ≠ Amato Berlin
- `post-11f0057b` the butter is served with wheat sourdough bread from Albatr…: Magma ≠ Albatross Bäckerei
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great en…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2a8e9606` Ilona Scholl is the host at Tulus Lotrek: Tulus Lotrek ≠ none
- `post-2a8e9606` Tulus Lotrek is perhaps the most vibrant restaurant in the …: Tulus Lotrek ≠ none
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: Schwarzes Kamel ≠ Landmann
- `post-2a8e9606` Markus Mahla and Jasmin Hein run the Café im Haus am Waldsee: Café im Haus am Waldsee ≠ Café Benjamine
- `post-2a8e9606` Barlevain is a casual neighbourhood spot: Barlevain ≠ File Asto
- `post-2a8e9606` File Asto serves great Greek food: File Asto ≠ Sagma
- `post-2a8e9606` Sagma is wine bar, pub and Viennese Beisl at once: Sagma ≠ Almi Bistro
- `post-2a8e9606` Almi Bistro comes from Saint Petersburg to Berlin: Almi Bistro ≠ Burma Bliss
- `post-2a8e9606` Almi Bistro is a true discovery: Almi Bistro ≠ Nobelhardt & Schmutzig
- `post-2a8e9606` Burma Bliss in Charlottenburg serves Burmese food: Burma Bliss ≠ Volk
- `post-2a8e9606` the Kartoffelpüree at Nobelhardt & Schmutzig can hardly be …: Nobelhardt & Schmutzig ≠ Luzii
- `post-2a8e9606` Volk serves Seafood for lunch: Volk ≠ Daia
- `post-2a8e9606` lunch at Volk is like in Marseille: Volk ≠ Daia
- `post-31344bc5` Common is a clear favourite of Berlin food creators, ranked…: Common ≠ Cookies Cream
- `post-31344bc5` Common is rated 4.6 stars: Common ≠ Cookies Cream
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-388b4383` Ketch’up 35 is regularly voted the city's best Currywurst s…: Ketch'up 35 ≠ Jörgs Curry Container
- `post-388b4383` shift workers, partygoers and early risers, the neighbourho…: Langes Imbiss ≠ Cult Curry Mitte
- … 188 more in issues.jsonl

### parts.amount (83)

- `post-0a8f804b` Early visitors are told to come back in an hour: 60 minutes ≠ —
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: —  ≠ 7 money
- `post-1c0d4023` Rutz Restaurant has a Google rating of 4.6 stars: —  ≠ 4.6 money
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Tulus Lotrek has a Google rating of 4.8 stars: —  ≠ 4.8 money
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Coda has a Google rating of 4.7 stars: —  ≠ 4.7 money
- `post-1c0d4023` Hallmann & Klee has a Google rating of 4.6 stars: —  ≠ 4.6 money
- `post-1c0d4023` Otto is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Otto has a Google rating of 4.6 stars: —  ≠ 6 money
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Restaurant Tim Raue has a Google rating of 4.6 stars: —  ≠ 6 money
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Funky Fisch has a Google rating of 4.5 stars: —  ≠ 6 money
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-1c0d4023` Horváth has a Google rating of 4.5 stars: —  ≠ 6 money
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Bandol sur mer has a Google rating of 4.9 stars: —  ≠ 5 money
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` FACIL has a Google rating of 4.8 stars: —  ≠ 5 money
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Loumi has a Google rating of 4.8 stars: —  ≠ 5 money
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams: —  ≠ 5 money
- `post-1c0d4023` Matthias has a Google rating of 4.8 stars: —  ≠ 5 money
- `post-24601e6d` the €48 ticket includes three drinks: —  ≠ 3 money
- `post-24601e6d` you choose two drinks inside the ice bar and one outside: —  ≠ 3 money
- `post-2a8e9606` Landmann serves a glass of Sekt or a Pfiff, a small Bier, f…: —  ≠ 15 minutes
- `post-2a8e9606` Schwarzes Kamel serves a glass of Sekt or a Pfiff, a small …: —  ≠ 15 minutes
- `post-2a8e9606` the Michelberger Hotel started in 2009: —  ≠ 2009 minutes
- `post-31344bc5` Cookies Cream has 5 creator recommendations: —  ≠ 5 money
- `post-31344bc5` Cookies Cream is rated 4.7 stars: —  ≠ 4.7 money
- `post-31344bc5` Stoke has 5 creator recommendations: —  ≠ 5 money
- `post-31344bc5` Stoke is rated 4.5 stars: —  ≠ 4.5 money
- `post-31344bc5` Common is a clear favourite of Berlin food creators, ranked…: —  ≠ 4.6 money
- `post-31344bc5` Common is a clear favourite of Berlin food creators, ranked…: —  ≠ 5 money
- `post-31344bc5` Common is rated 4.6 stars: —  ≠ 4.7 money
- `post-31344bc5` Common has 5 creator recommendations: —  ≠ 4.6 money
- `post-31344bc5` Common is trending: —  ≠ 4.6 money
- `post-31344bc5` Cookies Cream is trending among creator picks: —  ≠ 5 money
- … 43 more in issues.jsonl

### places.missed (47)

- `post-106450e8` Amato
- `post-1e024518` Masalas
- `post-2a8e9606` Pluto
- `post-2a8e9606` Starbucks
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Rogacki (Markthalle Neun)
- `post-3a0ad71a` File Asto Taverna
- `post-3a0ad71a` Ploetz
- `post-3a0ad71a` Zur letzten Instanz
- `post-3a0ad71a` Figl
- `post-3a0ad71a` Terese
- `post-3a0ad71a` Gut Kerkow Biometzgerei
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei
- `post-3a0ad71a` Nanum
- `post-3a0ad71a` Kissabo
- `post-3d9147ff` Schüsseldienst
- `post-40f86f07` Amo Café
- `post-45dafb41` Jolesch
- `post-48e30fa6` Gauchos del Gusto
- `post-5476133a` KaDeWe
- `post-56bff2cf` 8000 Vintages
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-63b83025` Restaurant Athen
- `post-6b4377f6` Mraz & Sohn
- `post-6b4377f6` Nobelhart & Schmutzig
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Bonanza Coffee
- `post-8901fb9b` Papaya
- `post-9f93c25b` Mine
- `post-b8d2bcf3` Otto
- `post-b8d2bcf3` Trio
- `post-b8d2bcf3` Pluto
- `post-d232f1ca` ROY Kombucha
- `post-d232f1ca` BRLO
- `post-e2a421e9` Rogacki
- `post-e2a421e9` Rram
- `post-e62d3c39` Otto
- `post-e62d3c39` Trio
- `post-e62d3c39` Pluto
- … 7 more in issues.jsonl

### places.extra (38)

- `post-0dde5eb7` Ristorante Bocca Felice
- `post-106450e8` Amato Berlin
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c78d4ed` Col-Spirit
- `post-233389f4` an Indian restaurant
- `post-3a0ad71a` Rogacki
- `post-3d9147ff` Schuesseldienst Berlin
- `post-40f86f07` amo cafe berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-5476133a` KaDeWe Berlin
- `post-5f073ec2` Atomic Balance
- `post-5f073ec2` Nha Trang
- `post-63b83025` Restaurant Athen Adlershof
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-7516d1de` Bahadur – Tandoori Grill & Currys
- `post-816a40e7` Surich Kurdish Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy
- `post-8901fb9b` Tacos
- `post-93526d04` Süd Baklava
- `post-93526d04` Baklava Laden
- `post-9f93c25b` Main
- `post-aa137bfa` TITANIC Gendarmenmarkt Berlin
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-ad6a11c0` Korean restaurant
- `post-b5e879f0` Urban-Krankenhaus
- `post-b5e879f0` internationaler Feinkostsupermarkt
- `post-b5e879f0` Bäcker nebenan
- `post-cecea20e` Bikini Berlin
- `post-d1ab7367` Natural Selection
- `post-d232f1ca` BRLO Beer
- `post-f0fb51e5` Hackescher Markt
- `post-f5a0f49f` Candela Berlin
- `post-fe3794c9` SpreeWiesn

### match_isolated.brand (33)

- `post-106450e8` Amato: amatō ≠ Amato Café (llm)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Duo Sicilian Ice Cream: Duo Sicilian Ice Cream ≠ Duo Sicilian Ice Cream (llm)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ LOTTA Tagesbar (llm)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### change.false (32)

- `post-047130f4` they put Hawaiian pizza on the menu
- `post-22c25ac1` new owners now run the restaurant
- `post-22c25ac1` the manufactory is now open
- `post-2a8e9606` the museum and the neighborhood relationship has clearly grown
- `post-2b231637` Tribeca Ice Cream has a second branch in Graefekiez
- `post-3a0ad71a` YOU is a new concept with restaurant, bar and meeting place instead of Heritage
- `post-3e56e67d` everything is finished now
- `post-674e7322` Mrs. Robinsons is closed
- `post-75c11d7c` Nichi Getsu opened in June 2026
- `post-75c11d7c` during the day the focus shifts to bara chirashi
- `post-816a40e7` the venue is a new opening
- `post-8d8803aa` ORA is hiring a new Chef de Partie starting in November 2026
- `post-8e94e7ea` a small snack turned into a full meal
- `post-8e94e7ea` sharing is no longer an option
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-b8d2bcf3` the café serves a weekly changing lunch
- `post-baac3611` 44 CHKN is opening its third branch soon
- `post-babe1142` Enrico is developing the gelato
- `post-babe1142` the spiciness of the gelato is being adjusted
- `post-babe1142` the owner will not change the recipes for a health-conscious crowd
- `post-bd0eaaca` they changed everything
- `post-c4e7c0a9` seasonal dishes change regularly
- `post-cb785d0b` customers can sit inside again
- `post-cb785d0b` tomorrow they will only offer döner with chicken or homemade falafel
- `post-cb785d0b` there will be no dürüm
- `post-d1ab7367` Vinos (Naturales) keeps the Eastern European focus of the shop
- `post-d1ab7367` the identity should be expanded with wines from Argentina and Chile
- `post-d1ab7367` Josepha wants to add more female winemakers to the assortment
- `post-fc96acff` Facil has not lost its glamour at 25
- `post-fe3794c9` this year SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin in Mi…
- `post-fe3794c9` SpreeWiesn got its own area for the season
- `post-fe3794c9` the move to the upper floor made it more weatherproof and logistically optimized

### match.brand (26)

- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Clärchens Ballhaus: Clärchens Ballroom ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Best gemüse kebab (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)

### match_isolated.branch (14)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-1c0d4023` Michelberger Restaurant: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - Schöneberg
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only

### match.branch (13)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Prenzlauer Berg
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-6c0e92d2` François at La Buvette: brand only ≠ La Buvette - GRILL FRANÇAIS
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only

### change.missed (13)

- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-5f073ec2` this time Arirang was not as good as it used to be
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` the Döner was improved day by day since the start, from vegetables to bread
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-e62d3c39` the operators of Otto, Trio and Pluto took over the day café Bravo in the KW Institute fo…
