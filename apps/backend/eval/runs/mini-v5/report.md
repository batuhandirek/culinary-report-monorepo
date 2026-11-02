# Ingestion eval: mini-v5

2026-11-01 15:37 UTC · 0 reviews, 199 posts, 0 wordings · 672 cases left out (no reference or no output)
Tokens: 1,448,320
Models: post-claims: openai/gpt-5.4-mini (199); claim-parts: openai/gpt-5.4-mini (197); venue-match: openai/gpt-5.4-mini (88)

## Posts and articles

| Metric | mini-v5 | stored | mini-v4 | second-gpt54 | mini-base-2 |
|---|---|---|---|---|---|
| Claims found (of the reference) | 83% (1719/2077) | 56% +27 | 81% +1 | 85% -2 | 76% +7 |
| Claims that are real (of produced) | 87% (2351/2712) | 95% -8 | 89% -2 | 96% -9 | 91% -4 |
| Sentiment | 88% (1928/2197) | 86% +2 | 89% -1 | 96% -8 | 87% ±0 |
| Aspect, exact | 72% (1581/2197) | 63% +9 | 73% -1 | 79% -7 | 64% +8 |
| Aspect, right root | 81% (1779/2197) | 78% +3 | 85% -4 | 87% -6 | 77% +4 |
| Kind | 83% (1827/2197) | 47% +36 | 85% -2 | 93% -10 | 80% +3 |
| Kind given at all | 99% (2197/2218) | 4% +95 | 98% +1 | 100% -1 | 100% -1 |
| Changes that are changes | 47% (34/72) | 46% +1 | 48% ±0 | 57% -10 | 40% +8 |
| Changes found | 59% (19/32) | 38% +22 | 56% +3 | 50% +9 | 44% +16 |
| Amount | 54% (61/112) | 46% +8 | 54% ±0 | 56% -2 | 62% -8 |
| Foods named, precision | 77% (1132/1470) | 46% +31 | 75% +2 | 86% -9 | 77% ±0 |
| Foods named, recall | 78% (1062/1365) | 39% +39 | 73% +4 | 88% -10 | 70% +8 |
| Subject (place, city, none) | 87% (2226/2567) | 85% +2 | 85% +1 | 94% -7 | 87% ±0 |
| Claim on the right place | 89% (1875/2110) | 85% +4 | 92% -3 | 97% -8 | 90% -1 |
| Places found | 88% (381/433) | 73% +15 | 87% +1 | 86% +2 | 82% +6 |
| Places that are places | 89% (381/430) | 85% +4 | 86% +2 | 94% -6 | 92% -3 |
| Match: brand (found places) | 93% (356/381) | 92% +2 | 89% +5 | 97% -3 | 92% +1 |
| Match: branch (right brand) | 95% (292/307) | 97% -2 | 97% -1 | 98% -2 | 94% +1 |
| Match on the reference's places: brand | 94% (405/433) | — | 93% +1 | — | 93% ±0 |
| Match on the reference's places: branch | 97% (332/343) | — | 96% +1 | — | 96% +1 |
| Promotional flag | 78% (155/199) | 82% -4 | 78% -1 | 69% +9 | 79% -1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Posts and articles

| Metric | mini-v5 (train) | mini-v5 (test) | mini-v4 (test) | second-gpt54 (test) | mini-base-2 (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | 82% | 86% (519/606) | 86% ±0 | 85% ±0 | 75% +11 |
| Claims that are real (of produced) | 87% | 86% (725/844) | 89% -3 | 96% -10 | 93% -7 |
| Sentiment | 87% | 90% (623/689) | 89% +2 | 96% -6 | 89% +2 |
| Aspect, exact | 74% | 67% (461/689) | 71% -5 | 79% -12 | 65% +2 |
| Aspect, right root | 83% | 76% (522/689) | 81% -5 | 87% -11 | 79% -4 |
| Kind | 82% | 87% (597/689) | 84% +2 | 93% -6 | 83% +4 |
| Kind given at all | 99% | 100% (689/689) | 96% +4 | 100% ±0 | 99% +1 |
| Changes that are changes | 46% | 50% (9/18) | 56% -6 | 57% -7 | 21% +29 |
| Changes found | 59% | 60% (6/10) | 70% -10 | 50% +10 | 30% +30 |
| Amount | 48% | 72% (23/32) | 60% +12 | 56% +15 | 80% -8 |
| Foods named, precision | 78% | 76% (359/473) | 70% +6 | 86% -10 | 83% -7 |
| Foods named, recall | 78% | 77% (335/434) | 67% +11 | 88% -11 | 71% +7 |
| Subject (place, city, none) | 86% | 87% (686/785) | 86% +1 | 94% -7 | 83% +4 |
| Claim on the right place | 90% | 86% (569/661) | 94% -8 | 97% -11 | 87% -1 |
| Places found | 90% | 82% (91/111) | 88% -6 | 86% -5 | 79% +3 |
| Places that are places | 90% | 86% (91/106) | 88% -2 | 94% -8 | 85% ±0 |
| Match: brand (found places) | 93% | 96% (87/91) | 88% +8 | 97% -1 | 92% +4 |
| Match: branch (right brand) | 94% | 97% (72/74) | 100% -3 | 98% ±0 | 96% +2 |
| Match on the reference's places: brand | 94% | 93% (103/111) | 91% +2 | — | 90% +3 |
| Match on the reference's places: branch | 97% | 98% (83/85) | 96% +1 | — | 98% ±0 |
| Promotional flag | 78% | 78% (45/58) | 78% ±0 | 69% +9 | 83% -5 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| hard | 84% (61/73) | 94% (72/77) | 75% (56/75) | 93% (70/75) | 100% (11/11) | 100% (11/11) |
| no-transcript | 89% (431/482) | 88% (555/633) | 75% (390/522) | 90% (469/522) | 94% (119/127) | 95% (113/119) |
| own | 92% (61/66) | 90% (92/102) | 73% (58/80) | 91% (73/80) | 100% (20/20) | 100% (20/20) |
| places:few | 86% (1285/1490) | 87% (1817/2082) | 71% (1150/1624) | 89% (1443/1624) | 86% (160/186) | 94% (151/160) |
| places:many | 74% (425/578) | 85% (522/615) | 75% (423/562) | 85% (475/562) | 89% (219/245) | 93% (203/219) |
| places:none | 100% (9/9) | 80% (12/15) | 73% (8/11) | 91% (10/11) | 100% (2/2) | 100% (2/2) |
| platform:blog | 78% (829/1067) | 87% (1207/1383) | 71% (764/1078) | 86% (929/1078) | 81% (162/199) | 97% (157/162) |
| platform:instagram | 88% (287/325) | 89% (372/416) | 74% (260/352) | 89% (314/352) | 92% (65/71) | 97% (63/65) |
| platform:tiktok | 88% (603/685) | 85% (772/913) | 73% (557/767) | 89% (685/767) | 94% (154/163) | 88% (136/154) |
| size:large | 79% (800/1016) | 88% (1135/1294) | 72% (751/1041) | 87% (905/1041) | 84% (160/191) | 94% (150/160) |
| size:medium | 84% (648/767) | 87% (834/959) | 69% (558/808) | 88% (711/808) | 89% (127/142) | 93% (118/127) |
| size:small | 92% (271/294) | 83% (382/459) | 78% (272/348) | 90% (312/348) | 94% (94/100) | 94% (88/94) |
| transcript | 87% (459/528) | 85% (589/696) | 72% (427/597) | 89% (530/597) | 93% (100/107) | 86% (86/100) |

## Misses

### parts.aspect (616)

- `post-01f172dd` the KATSU-SANDO is served on sliced, toasted shokupan: food ≠ presentation
- `post-0216fd1d` Neukölln has places to eat well and cheaply: price_level ≠ location
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026: none ≠ menu_variety
- `post-047130f4` Salami Social Club is the tasty new kid on the Friedrichsha…: taste ≠ none
- `post-047130f4` Salami Social Club was founded by Jacob and Ben: ownership ≠ none
- `post-047130f4` Salami Social Club plays with cool pizza combinations: menu_variety ≠ vibe
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: none ≠ crowding
- `post-047130f4` Salami Social Club serves quality Berlin brews and beers fr…: drink_selection ≠ drinks
- `post-047130f4` Nudja on pizza is absolutely delicious: taste ≠ seasoning
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: none ≠ taste
- `post-079d7302` Egyptian food in Berlin: none ≠ food
- `post-0a8f804b` Cousins' spirit is about sharing the space with friends, fa…: atmosphere ≠ space
- `post-0a8f804b` Flavours range from Gochujang-Karamell to silky tofu with p…: menu_variety ≠ food
- `post-0a8f804b` None of Cousins' flavours is boring: menu_variety ≠ food
- `post-0a8f804b` At Cousins there is room for everyone: atmosphere ≠ space
- `post-0d1e7abc` Isla has unbelievably good Kaffee: drink_quality ≠ none
- `post-0d1e7abc` Isla sells Kaffeebohnen for home: menu_variety ≠ none
- `post-0d1e7abc` Isla has really good food: food ≠ none
- `post-0d1e7abc` the author loves the Kuchen and the Gebäck: taste ≠ none
- `post-0d1e7abc` the warm dishes are tasty: taste ≠ none
- `post-0d1e7abc` there are very many vegan options: menu_variety ≠ none
- `post-0d1e7abc` all the dishes are super tasty: taste ≠ none
- `post-0d1e7abc` the author especially likes the Grilled Cheese mit Kimchi: food ≠ none
- `post-0d1e7abc` the back courtyard is a good place to chill: outdoor_seating ≠ none
- `post-0d1e7abc` in the courtyard you notice nothing of the bustling Hermann…: noise ≠ none
- `post-0d1e7abc` the prices are appropriate for the quality: value_for_money ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: ingredient_quality ≠ none
- `post-0d484513` Smooches makes gourmet sandwiches with artisanal quality: food ≠ none
- `post-0d484513` India Club Restaurant impresses with North Indian tandoor c…: food ≠ none
- `post-0d484513` Smooches' sandwiches have clean ingredient combinations: ingredient_quality ≠ food
- `post-0d484513` at India Club Restaurant traditional preparation methods me…: ingredient_quality ≠ none
- `post-0d484513` Café Ploetz serves hand-laminated Croissants: food ≠ none
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: food ≠ none
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: none ≠ food
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: none ≠ food
- `post-0dde5eb7` the dish has a good piece of Fleisch: ingredient_quality ≠ none
- `post-0dde5eb7` the dish comes with tenderly melted Käse: cooking ≠ none
- `post-0dde5eb7` the dish comes with a dark, aromatic Soße: taste ≠ none
- `post-0dde5eb7` the dish is beautifully plated with attention to detail: presentation ≠ none
- `post-0dde5eb7` the dish has lots of flavour: taste ≠ none
- … 576 more in issues.jsonl

### parts.foods (515)

- `post-01f172dd` they serve hot, stuffed sandwiches: [SANDWICHES] ≠ []
- `post-01f172dd` the shokupan is soft like a pillow: [] ≠ [shokupan]
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: [pasta fresca, pizza, dolci] ≠ [pasta, pizza]
- `post-020c68fb` Markthalle Neun has an excellent craft brewery: [] ≠ [birre]
- `post-047130f4` Salami Social Club serves a black dough pizza with blutwurs…: [black dough, blutwurst, bacon] ≠ [blutwurst, bacon]
- `post-047130f4` the craft beer scene is one of the most exciting things in …: [craft beer] ≠ []
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: [craft beer] ≠ []
- `post-047130f4` Salami Social Club is still serving in Berlin in 2026: [] ≠ [pizza]
- `post-047130f4` Salami Social Club wants a great atmosphere to grab a slice: [] ≠ [slice, beer]
- `post-0a8f804b` The slushies tickle the taste buds: [Slushies] ≠ [Kaylin, Kaylin]
- `post-0a8f804b` Each flavour brings together dishes and ingredients from ar…: [] ≠ [dishes, ingredients]
- `post-0a8f804b` None of Cousins' flavours is boring: [] ≠ [Tamarinden-Slushie, Zeder-Limettenblatt-Eis]
- `post-0a8f804b` The slushies tickle the taste buds: [Slushies] ≠ [Kaylin]
- `post-0a8f804b` The slushies tickle the taste buds: [Slushies] ≠ [Kaylin]
- `post-0d1e7abc` Isla has really good food: [] ≠ [Essen]
- `post-0d1e7abc` the warm dishes are tasty: [] ≠ [Gerichte]
- `post-0d1e7abc` the dishes are seasonal and low waste: [] ≠ [Speisen]
- `post-0d1e7abc` the dishes are seasonal and low waste: [] ≠ [Speisen]
- `post-0d484513` Café Ploetz serves hand-laminated Croissants: [Croissants] ≠ []
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: [] ≠ [Nudeln, Sushi, Cocktails]
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: [] ≠ [Teigtaschen]
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: [alkoholfreies Helles] ≠ []
- `post-11f0057b` sharing a few small plates with the drinks is definitely wo…: [] ≠ [Teller]
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: [Tomato Tonnato, Fleischtomaten, Thunfischsoße, Tomato Tonnato] ≠ [Tomato Tonnato, Kalbsfleisch, Fleischtomaten, Thunfischsoße]
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: [Tomato Tonnato, Fleischtomaten, Thunfischsoße] ≠ [Kalbsfleisch, Fleischtomaten]
- `post-14d4fc29` today home tastes like Streetfood at Markthalle Neun: [Streetfood] ≠ []
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ [coffee]
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: [Caturra, Colombia, Castillo, Tabi] ≠ [coffee]
- `post-1c78d4ed` The El Líbano espresso is Arabica: [EL LÍBANO Espresso] ≠ []
- `post-1c78d4ed` El Líbano is the roaster's favourite espresso in its curren…: [El Líbano] ≠ [espresso]
- `post-1c78d4ed` El Líbano is responsibly sourced from Colombia's Cordillera…: [El Líbano] ≠ [coffee]
- `post-1c78d4ed` The El Líbano beans are a single-origin blend of four varie…: [Caturra, Colombia, Castillo, Tabi] ≠ [coffee]
- `post-1c78d4ed` the roast is Espresso: [] ≠ [roast]
- `post-1ca1ffee` the Achoschare mother grill costs 30 euros: [Achoschare mother grills] ≠ [steaks]
- `post-1ca1ffee` the Achoschare mother grill costs 30 euros: [Achoschare mother grills] ≠ [steaks]
- `post-1ca1ffee` the medium steak was really good: [] ≠ [steak]
- `post-1ca1ffee` the steak was especially good with the Chimichurri: [Chimichurri] ≠ [steak, chimichurri]
- `post-1d0aeaca` Ube is a Philippine sweet potato: [Ube, sweet potato] ≠ [Ube, Ube]
- `post-1d0aeaca` Die Eismacher has a near-sorbet mixing pineapple and mint: [sorbet, pineapple, mint] ≠ [pineapple, mint]
- … 475 more in issues.jsonl

### parts.kind (370)

- `post-01f172dd` they will be at their next pop-up: event ≠ fact
- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: opinion ≠ fact
- `post-020c68fb` about ten different birre to taste, not bad: opinion ≠ fact
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: verdict ≠ fact
- `post-0216fd1d` Neukölln has places to eat well and cheaply: opinion ≠ fact
- `post-0216fd1d` the Neukölln spots include tasty veggie options: opinion ≠ fact
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: fact ≠ opinion
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: deal ≠ fact
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: deal ≠ fact
- `post-0a8f804b` Kavita and Marieke opened Cousins: fact ≠ opinion
- `post-0a8f804b` A visit to Cousins evokes childhood memories for some: opinion ≠ verdict
- `post-0a8f804b` None of Cousins' flavours is boring: opinion ≠ fact
- `post-0a8f804b` The author will take his own cousin to Cousins: verdict ≠ opinion
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: verdict ≠ fact
- `post-0d1e7abc` in the courtyard you notice nothing of the bustling Hermann…: opinion ≠ fact
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: fact ≠ new_item
- `post-0d484513` CeeCee's review of Café Ploetz is enthusiastic: verdict ≠ fact
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: fact ≠ opinion
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: opinion ≠ fact
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: fact ≠ opinion
- `post-11f0057b` the Hauswein is a Greek orange wine: fact ≠ opinion
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: opinion ≠ fact
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: fact ≠ opinion
- `post-11f0057b` a date night at Magma is better without hearing about the l…: opinion ≠ fact
- `post-1c0d4023` Coda is recommended by 6 food editorial teams: verdict ≠ opinion
- `post-1c78d4ed` The El Líbano beans are sourced in partnership with Col-Spi…: fact ≠ opinion
- `post-1ca1ffee` the creator celebrates Doree 65 more than any steakhouse: verdict ≠ opinion
- `post-1ca1ffee` if you want to experience Wedding, drop by Doree 65: verdict ≠ fact
- `post-1d0aeaca` Die Eismacher is Berlin's most exotic ice creamery: verdict ≠ fact
- `post-1d0aeaca` the author first reviewed Die Eismacher in 2017: fact ≠ opinion
- `post-1d0aeaca` Miriam is a sweet-toothed, bright-eyed, impassioned ice cre…: opinion ≠ fact
- `post-1d0aeaca` the Ube flavor is a bestseller: fact ≠ opinion
- `post-1d0aeaca` Die Eismacher has a near-sorbet mixing pineapple and mint: fact ≠ opinion
- `post-1d0aeaca` salted caramel is one of the top-selling flavors: fact ≠ opinion
- `post-1d0aeaca` the salted caramel uses caramel Miriam makes in the kitchen: fact ≠ opinion
- … 330 more in issues.jsonl

### claims.extra (361)

- `post-01239695` the girl did very well
- `post-01431335` the trip is worth saving for
- `post-019b903e` the weather is bad
- `post-019b903e` there is no bad weather, only wrong clothing
- `post-019b903e` the creator greets viewers and wishes them a successful day
- `post-047130f4` the founders met while applying for the same job at a French restaurant in Berlin
- `post-047130f4` the place used to have an old pizza oven from when it was an Italian restaurant
- `post-047130f4` the concept was built before they looked for a location
- `post-0a8f804b` the weekly secret flavor lets visitors guess both the ingredients and the dish it was ins…
- `post-0a8f804b` the author plans to take their visiting cousin there later
- `post-0fa29641` the post is a Berlin guide, Kreuzberg edition
- `post-0fa29641` the post invites followers to add other spots
- `post-0fa29641` everything is tagged so the post can be saved for later
- `post-1ca1ffee` the place was great
- `post-1e024518` the venue serves Masala Dosa
- `post-2161780e` the venue offers Healthy Matcha
- `post-2161780e` the matcha is for a small break in everyday life
- `post-217c8e79` they were curious whether the food is better elsewhere in Berlin
- `post-217c8e79` the dish includes pork meatballs
- `post-217c8e79` the dish includes fish sauce
- `post-217c8e79` the dessert contains ice cream
- `post-217c8e79` the dessert also has jelly and red beans
- `post-22c25ac1` the location has charm
- `post-22c25ac1` the writers will definitely use the place whenever they can
- `post-233389f4` they ordered anyway
- `post-2927e673` the post is an ad
- `post-2927e673` after the meal you can go up to the dome and enjoy the view
- `post-2a8e9606` she likes to drink coffee in peace
- `post-2a8e9606` people sit half reading the newspaper and half talking with the person opposite
- `post-2a8e9606` people talk about activities at the cultural venue
- `post-2a8e9606` people talk about life in the neighborhood
- `post-2a8e9606` people discuss politics and society
- `post-2a8e9606` the relationship between the museum and the neighborhood has grown noticeably
- `post-2a8e9606` they had no experience with hospitality and gastronomy at first
- `post-2a8e9606` the improvised café-bars gave them strength
- `post-2a8e9606` they inhaled the spirit of new beginnings
- `post-2a8e9606` they felt empowered to do it themselves
- `post-2a8e9606` it was important not to take yourself too seriously
- `post-2a8e9606` the article is a food roundup
- `post-2b231637` the article collected ice cream shops repeatedly recommended by Berlin food editors
- … 321 more in issues.jsonl

### claims.missed (358)

- `post-019b903e` Boddensee is in Birkenwerder near Berlin
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say you really know today's Berlin
- `post-020c68fb` Markthalle Neun is open Monday to Saturday 9:00–20:00
- `post-047130f4` only a small handful of places in Berlin serve good pizza
- `post-0a8f804b` Cousins serves generous scoops
- `post-0a8f804b` Going elsewhere instead of waiting for Cousins is foolish
- `post-0a8f804b` The Kaylin is a particular crowd favourite
- `post-0a8f804b` The Kaylin is a tamarind slushie with cedar-lime-leaf ice cream
- `post-0a8f804b` The Kaylin delivers an invigorating, paradoxical combination of acidity and velvety sweet…
- `post-0a8f804b` Every week Kavita and Marieke create a secret flavour whose ingredients and inspiring dis…
- `post-0d1e7abc` Isla has existed for 10 years
- `post-0d484513` Kissabo brings authentic Japanese tea culture to Berlin
- `post-0d484513` Kissabo serves traditionally prepared Matcha
- `post-0d484513` Kissabo serves handmade Mochi
- `post-0d484513` Paule’s Metal Eck offers heavy music
- `post-0d484513` Paule’s Metal Eck serves cold beer
- `post-0d484513` Paule’s Metal Eck has old-school rock bar chaos under red lights
- `post-0d484513` NOUMI Sushi Lounge is a stylish Asian spot to go this summer
- `post-0d484513` NOUMI Sushi Lounge serves colorful noodles, sushi and cocktails
- `post-0d484513` NOUMI Sushi Lounge has a chic, elegant lounge atmosphere
- `post-0d484513` Yumcha Heroes dumpling manufactory is praised for its handmade dumplings
- `post-11f0057b` Magma is hot, but in a cool way
- `post-11f0057b` Reichenberger Straße in Kreuzberg has legendary status for mild summer evenings
- `post-11f0057b` Magma is open Wed+Thu 10–0, Fri+Sat 10–1, Sun 10–21
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-165a9370` the Indian restaurant has colorful lights
- `post-1c0d4023` Hallmann & Klee is recommended by 6 food editorial teams
- `post-1c0d4023` Otto is recommended by 6 food editorial teams
- `post-1c0d4023` Restaurant Tim Raue is recommended by 6 food editorial teams
- `post-1c0d4023` Funky Fisch is recommended by 6 food editorial teams
- `post-1c0d4023` Horváth is recommended by 6 food editorial teams
- `post-1c0d4023` Bandol sur mer is recommended by 5 food editorial teams
- `post-1c0d4023` FACIL is recommended by 5 food editorial teams
- `post-1c0d4023` Loumi is recommended by 5 food editorial teams
- `post-1c0d4023` Matthias is recommended by 5 food editorial teams
- `post-1c0d4023` Cookies Cream is recommended by 5 food editorial teams
- `post-1c0d4023` Mastan is recommended by 5 food editorial teams
- `post-1c0d4023` Barra is recommended by 5 food editorial teams
- `post-1c0d4023` Sathutu is recommended by 5 food editorial teams
- `post-1c0d4023` Stoke is recommended by 5 food editorial teams
- … 318 more in issues.jsonl

### claims.subject (341)

- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ city
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ city
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: city ≠ place
- `post-047130f4` Berlin's craft beer community has been very welcoming of Sa…: city ≠ place
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: place ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-079d7302` Egyptian food in Berlin: city ≠ place
- `post-079d7302` Egyptian food in Berlin: city ≠ place
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-0fa29641` the author genuinely loves and keeps coming back to these s…: city ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` the Tomato Tonnato uses large slices of aromatic Fleischtom…: place ≠ none
- `post-11f0057b` the Tomato Tonnato is a very good idea: place ≠ none
- `post-11f0057b` whipped butter always works: place ≠ none
- `post-11f0057b` the whipped butter is refined with Maldon salt: place ≠ none
- `post-11f0057b` Bistro Spumante shows that summer evenings on the Reichenbe…: place ≠ city
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: place ≠ city
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ city
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by …: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1b8b0789` they had 2 Grillplatte: place ≠ none
- `post-1b8b0789` each Grillplatte was meant for 2 people: place ≠ none
- `post-1b8b0789` the Grillplatte looked very juicy: place ≠ none
- `post-1b8b0789` the Grillplatte tasted very juicy: place ≠ none
- `post-1b8b0789` the steak meat came with Bratkartoffeln and Gemüse: place ≠ none
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: place ≠ none
- `post-1b8b0789` the creator and two colleagues found the Fleisch very tasty: place ≠ none
- … 301 more in issues.jsonl

### parts.sentiment (269)

- `post-020c68fb` as an Italian, the author has a soft spot for the stands of…: positive ≠ neutral
- `post-020c68fb` about ten different birre to taste, not bad: positive ≠ neutral
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: positive ≠ neutral
- `post-0216fd1d` Neukölln has places to eat well and cheaply: positive ≠ neutral
- `post-0216fd1d` the Neukölln spots include tasty veggie options: positive ≠ neutral
- `post-047130f4` Nudja on pizza is absolutely delicious: positive ≠ mixed
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salam…: neutral ≠ positive
- `post-0a8f804b` Kavita and Marieke opened Cousins: neutral ≠ positive
- `post-0a8f804b` None of Cousins' flavours is boring: positive ≠ neutral
- `post-0d1e7abc` in the courtyard you notice nothing of the bustling Hermann…: positive ≠ neutral
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: neutral ≠ positive
- `post-0d484513` CeeCee's review of Café Ploetz is enthusiastic: positive ≠ neutral
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: neutral ≠ positive
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: positive ≠ neutral
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: neutral ≠ positive
- `post-11f0057b` the terrace is fully occupied: neutral ≠ negative
- `post-11f0057b` the Hauswein is a Greek orange wine: neutral ≠ positive
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: positive ≠ neutral
- `post-11f0057b` Bistro Spumante is diagonally opposite Magma: neutral ≠ positive
- `post-11f0057b` a date night at Magma is better without hearing about the l…: mixed ≠ neutral
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: positive ≠ neutral
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: positive ≠ neutral
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: positive ≠ neutral
- `post-1ca1ffee` the prices are not just Bundesliga but Champions League: positive ≠ negative
- `post-1ca1ffee` if you want to experience Wedding, drop by Doree 65: positive ≠ neutral
- `post-1d0aeaca` Die Eismacher is Berlin's most exotic ice creamery: positive ≠ neutral
- `post-1d0aeaca` the author first reviewed Die Eismacher in 2017: neutral ≠ positive
- `post-1d0aeaca` Miriam is a sweet-toothed, bright-eyed, impassioned ice cre…: positive ≠ neutral
- `post-1d0aeaca` the Ube flavor is insanely weird: positive ≠ negative
- `post-1d0aeaca` Die Eismacher has a near-sorbet mixing pineapple and mint: neutral ≠ positive
- `post-2161780e` tables can be reserved online at goodmorningvietnamvegan.de: neutral ≠ positive
- `post-217c8e79` Is the Dong Xuan Center still worth it?: neutral ≠ positive
- `post-217c8e79` the dessert is super sweet but the creator loves it: positive ≠ negative
- `post-22c25ac1` Yumcha Heroes' success is owed to the three women who make …: positive ≠ neutral
- … 229 more in issues.jsonl

### claims.place (235)

- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: Pastaia ≠ Pastaia Pizzeria Spandau
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: Pastaia ≠ Pastaia Pizzeria Spandau
- `post-0d484513` Smooches' sandwiches have clean ingredient combinations: Smooches ≠ India Club Restaurant
- `post-0d484513` CeeCee's review of India Club Restaurant is enthusiastic: India Club Restaurant ≠ Café Ploetz
- `post-0d484513` Café Ploetz serves hand-laminated Croissants: Café Ploetz ≠ Dufte
- `post-0d484513` Café Ploetz serves Levantine-inspired cuisine: Café Ploetz ≠ Dufte
- `post-0d484513` CeeCee's review of Café Ploetz is enthusiastic: Café Ploetz ≠ Paule’s Metal Eck
- `post-0d484513` Dufte, a new culinary culture house in the Kantgarage, open…: Dufte ≠ Paule’s Metal Eck
- `post-0d484513` tip Berlin congratulates Dufte on its opening and is excite…: Dufte ≠ NOUMI Sushi Lounge
- `post-0d484513` Paule’s Metal Eck has existed in Friedrichshain since 1996: Paule’s Metal Eck ≠ Yumcha Heroes
- `post-11f0057b` they serve an alcohol-free Helles from Berlin brewery Fuers…: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the alcohol-free Helles pleasingly comes in a can: Magma ≠ Fuerst Wiacek
- `post-11f0057b` the butter is served with wheat sourdough bread from Albatr…: Magma ≠ Albatross Bäckerei
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: Masalas ≠ Mirch Masala
- `post-1e024518` the Masala Dosa is filled with spicy potato: Masalas ≠ Mirch Masala
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: Masalas ≠ Mirch Masala
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: Masalas ≠ Mirch Masala
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous g…: Yumcha Heroes ≠ Long March Canteen
- `post-22c25ac1` the Dumplings at Long March Canteen are celebrated by numer…: Long March Canteen ≠ Yumcha Heroes
- `post-22c25ac1` Mrs. Chens Blue Pearl are filled with Garnelen and coloured…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Mrs. Chens Blue Pearl dumplings are next level: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three tables in front of the street sale are constantly…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` families stop here after school, colleagues come for a quic…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` even long-time locals can't resist the deliciously smelling…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the three women's food truly opens every heart: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the wait at the Manufaktur is worth it: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you can also walk with the Dumplings to the next park bench: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` you order digitally at a counter: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` guests are served by the women themselves: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the factory sale brings high quality fresh to the table: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shanghai Dumplings have pleasantly spicy Schweinefleisch: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings combine varied spiciness with tend…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Black Beef Dumplings are at least as famous as the Blue…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Shou Mai with Schweinefleisch, Wasserkastanie, Shiitake…: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- `post-22c25ac1` the Dumplings are freshly steamed and served with Saucen: Yumcha Heroes Manufaktur ≠ Yumcha Heroes
- … 195 more in issues.jsonl

### places.missed (52)

- `post-0bf8447d` Pastaia
- `post-1e024518` Masalas
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Common
- `post-3a0ad71a` Bertie
- `post-3a0ad71a` Goldies Smashburger
- `post-3a0ad71a` Ora
- `post-3a0ad71a` Estelle
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
- `post-40f86f07` Jan Burgerrestaurant
- `post-48e30fa6` Gauchos del Gusto
- `post-4c3e2a10` The Cell
- `post-5476133a` KaDeWe
- `post-58a16831` Pêle-Mêle
- `post-59699006` Barlevain
- `post-63b83025` Restaurant Athen
- `post-66f606db` Café Dufte
- `post-674e7322` Mrs. Robinsons
- `post-6b4377f6` Mraz & Sohn
- `post-6b4377f6` Nobelhart & Schmutzig
- `post-7e6e2acc` Markthalle food hall
- `post-816a40e7` Kurmanche Restaurant
- `post-8901fb9b` Papaya
- `post-8901fb9b` Special Sauce
- `post-9f93c25b` Borchardt
- `post-9f93c25b` Mine
- `post-b8d2bcf3` Otto
- … 12 more in issues.jsonl

### parts.amount (51)

- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: —  ≠ 1 minutes
- `post-0d1e7abc` the author has been going to Isla for 10 years: —  ≠ 10 minutes
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: —  ≠ 8 money
- `post-1c0d4023` Rutz Restaurant is recommended by 7 food editorial teams: —  ≠ 7 money
- `post-1c0d4023` Tulus Lotrek is recommended by 6 food editorial teams: —  ≠ 6 money
- `post-22c25ac1` the five Dumplings are delicious: —  ≠ 8.25 money
- `post-22c25ac1` five Dumplings cost only 8.25 euros: 8.25 money ≠ 16 money
- `post-22c25ac1` ten dumplings cost 16 euros: 16 money ≠ 30 money
- `post-2927e673` 5% discount on the first GetYourGuide app booking with code…: —  ≠ 5 money
- `post-388b4383` Zur Bratpfanne began in 1949 with Günter Mosgraber, who bui…: —  ≠ 1949 money
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: —  ≠ 50 minutes
- `post-388b4383` Ketch’up 35 is a fairly young business, in the Currywurst t…: —  ≠ 2013 money
- `post-388b4383` Konnopke’s Imbiß is a tourist attraction: —  ≠ 1930 money
- `post-388b4383` the family behind Konnopke’s Imbiß has been in business sin…: —  ≠ 1960 money
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U…: —  ≠ 2011 money
- `post-388b4383` the first guests get a Currywurst at Langes Imbiss at 5:30 …: —  ≠ 5.5 minutes
- `post-388b4383` the sauce creations at Curry & Chili come in ten heat levels: —  ≠ 10 money
- `post-388b4383` Curry & Chili has existed for over twenty years: —  ≠ 20 minutes
- `post-388b4383` Reina Lehmann is still as down-to-earth as at the start of …: —  ≠ 40 minutes
- `post-388b4383` the family business Schmidt's Imbiss has stood for the best…: —  ≠ 50 minutes
- `post-388b4383` Schmidt's Imbiss moved around Lichterfelde and Lankwitz unt…: —  ≠ 2005 money
- `post-45841578` the beef noodle soup is really good: —  ≠ 9.9 money
- `post-52eb53af` the samosa cost only 2 euros: 2 money ≠ —
- `post-52eb53af` Samosa Club rated 10 out of 10: —  ≠ 10 money
- `post-52eb53af` Börk's Deli rated 8 out of 10: —  ≠ 8 money
- `post-52eb53af` Ippai no Ramen rated 9 out of 10: —  ≠ 9 money
- `post-52eb53af` the Döner was tasty: —  ≠ 8 money
- `post-52eb53af` Mubis Cookies sells Softeis with hot Keksteig: —  ≠ 6 money
- `post-57ab8313` In a blind tasting many guests mistook the Tacos de Birria …: —  ≠ 11.5 money
- `post-57ab8313` The authors recommend the Quesabirria Vegana with vegan che…: —  ≠ 12 money
- `post-5db3b46a` Manello's pizza is legit decent and fucking good: —  ≠ 15 money
- `post-5db3b46a` Manello's price is not too bad: —  ≠ 15 money
- `post-606d88e9` took 3 different coffee cakes to go to try them: —  ≠ 3 money
- `post-75c11d7c` evening reservations at Nichi Getsu sometimes have to be pl…: —  ≠ 60 minutes
- `post-875be07a` entry to the Street Food Market at Markthalle Neun is free: —  ≠ 5 money
- `post-9223f335` Gercek Chicken's 30-year anniversary celebration continues …: —  ≠ 30 money
- `post-93ac6d3b` 100 GRAMM Lounge scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Beavis Bar also scores 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` Augusta am Savignyplatz has 4.9 stars: —  ≠ 4.9 money
- `post-93ac6d3b` customers at La Miche apparently get more than reheated dou…: —  ≠ 4.9 money
- … 11 more in issues.jsonl

### places.extra (49)

- `post-079d7302` Kemet Oriental Lounge
- `post-0bf8447d` Pastaia Pizzeria Spandau
- `post-0fa29641` Five Elephant
- `post-0fa29641` Voo Store
- `post-0fa29641` Barravabar Berlin
- `post-0fa29641` Annelies Berlin
- `post-11f0057b` Fuerst Wiacek
- `post-11f0057b` Albatross Bäckerei
- `post-1c78d4ed` weroastcoffeeberlin
- `post-1e024518` Mirch Masala
- `post-217c8e79` El Kampinski
- `post-233389f4` indisches Restaurant
- `post-3a0ad71a` Rogacki
- `post-3a0ad71a` Ital. Eis Lanzano (la piccola gelateria)
- `post-40f86f07` Jan Burger Restaurant
- `post-483d6cc6` Love at First Bite Berlin
- `post-48e30fa6` Kaufland Oranienburg
- `post-4c3e2a10` Haftschaden
- `post-5476133a` KaDeWe Kaufhaus des Westens Berlin
- `post-5f073ec2` Atomic Bar
- `post-5f073ec2` Nha Trang
- `post-63b83025` Restaurant Athen Adlershof
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-7516d1de` Prince of Punjab
- `post-7516d1de` Bahadur – Tandoori Grill & Currys
- `post-7e6e2acc` Magdalena
- `post-816a40e7` surich kurdische Restaurant
- `post-875be07a` KOMPLEX Berlin
- `post-8901fb9b` Mister Scott
- `post-8901fb9b` Boy Boy
- `post-93526d04` Baklava Laden
- `post-9f93c25b` Borschtsch
- `post-9f93c25b` Main
- `post-aa137bfa` TITANIC Gendarmenmarkt Berlin
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-aa137bfa` Beef Grill Club
- `post-aa137bfa` Beef Grill Club
- `post-ad6a11c0` Korean restaurant
- … 9 more in issues.jsonl

### change.false (38)

- `post-22c25ac1` the manufactory is now open
- `post-2a8e9606` the relationship between the museum and the neighborhood has grown noticeably
- `post-2b231637` Tribeca Ice Cream has a second branch in Graefekiez
- `post-31344bc5` Berlin is reinventing its food scene
- `post-388b4383` the quality has stayed the same
- `post-3a0ad71a` YOU opens as a new concept of restaurant, bar and meeting place in Hotel Luc in Mitte
- `post-45dafb41` Monti is newly opened
- `post-483d6cc6` they opened a second location in Mitte
- `post-56bff2cf` the place feels well coordinated after only a few weeks since opening
- `post-6b4377f6` the menu changes weekly
- `post-6b4377f6` the restaurant returns to craft cooking
- `post-6b4377f6` the menu changes weekly
- `post-6ddca88c` the founders moved to the other side of the Spree
- `post-6ddca88c` Pinci moved to the other side of the Spree
- `post-6ddca88c` the Garibaldi became a signature drink soon after opening
- `post-6ddca88c` Breda is the new trattoria from the Pinci founders
- `post-7516d1de` Bahadur is now called Prince of Punjab
- `post-7516d1de` the decor avoids cliché golden elephants and kitsch peacock statues
- `post-7516d1de` the decor has slight Indian touches and memories from home
- `post-909ca5ee` the menu changes seasonally
- `post-935c2fd2` restaurant visits in Germany have become too expensive
- `post-93ac6d3b` Charlottenburg is experiencing a gastronomic revival
- `post-93ac6d3b` Augusta am Savignyplatz is part of the renaissance
- `post-93ac6d3b` Augusta am Savignyplatz shows the area around Savignyplatz is regaining its old appeal
- `post-996efecb` the extraction was a bit small
- `post-a3178d9e` smashburgers changed the creator's opinion for the better
- `post-b8d2bcf3` the lunch menu changes weekly
- `post-baac3611` 44 CHKN will soon open its third branch
- `post-babe1142` Peggy Bee opened about four weeks before the original review
- `post-babe1142` the spiced chocolate was melted down and sprinkled with cayenne pepper
- `post-c0a7fdc2` it switched from interpreting to Msabaha
- `post-c4e7c0a9` the menu changes seasonally
- `post-cb785d0b` the döner is sold at the same price as before
- `post-d1ab7367` Josepha wants to add more female winemakers to the selection
- `post-e2a421e9` the company is now returning to its old name
- `post-e2a421e9` then everything will be as before
- `post-fe3794c9` SpreeWiesn moved this year to the upper floor of Hofbräu München – Wirtshaus Berlin in Mi…
- `post-fe3794c9` the move to the upper floor made it more weatherproof and logistically optimized

### match_isolated.brand (28)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-1c0d4023` Michelberger Restaurant: Michelberger Café & Bar ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-388b4383` Curry & Chili: Curry und Chili ≠ none (none)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5476133a` KaDeWe: none ≠ KaDeWe - Die Sechste (exact)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-6577d6bd` Eiscafeteufelchen: Eisteufelchen ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ Tagesbar (llm)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-fc96acff` Cielo: none ≠ Cielo Weinbar (llm)

### match.brand (25)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-388b4383` Konnopke’s Imbiß: Konnopke's Imbiss ≠ none (none)
- `post-41f16ad4` Aroma: none ≠ Aroma Warschauer Str. (llm)
- `post-483d6cc6` Love at First Bite: Love at first bite ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5f073ec2` Arirang: none ≠ Arirang Restaurant (exact)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-92d82657` Kin Za: Kin Za Georgian Restaurant Bar ≠ none (none)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ L'Osteria (llm)
- `post-9f93c25b` Kulachino: Culaccino ≠ none (none)
- `post-a7757925` HOMì: HOMÌ. ≠ none (none)
- `post-ad6a11c0` Muschelbar: MUSCHELBAR ≠ none (none)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-ea13e9d3` Binarai Forum: Bijou Bar ≠ none (none)
- `post-ea13e9d3` Market Prince: Arminiusmarkthalle ≠ Prince (llm)
- `post-ea13e9d3` Clerics: Clärchens Ballroom ≠ none (none)
- `post-f0003e83` Hot Chicks: Hot Chick‘s Grill ≠ none (none)
- `post-f17dfe96` Jemenitisches Restaurant: Jemenitisches Restaurant المطعم اليمني ≠ Jemenitisches Restaurant (llm)

### match.branch (15)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ Café Dufte
- `post-1c0d4023` Michelberger Restaurant: brand only ≠ Michelberger Café & Bar
- `post-2a8e9606` Michelberger Hotel: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-388b4383` Zur Bratpfanne: Zur Bratpfanne ≠ brand only
- `post-388b4383` Curry Wolf: Curry Wolf - Currywurst am Ku'damm ≠ Curry Wolf Brandenburger Tor
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - Schöneberg
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
- `post-e62d3c39` The Barn: THE BARN Café Mitte ≠ brand only

### change.missed (13)

- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-6c0e92d2` Kroque started as a small food bike at various markets and now has a permanent home on Se…
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-6ddca88c` Pinci's service is not always as convincing as in its first wild weeks
- `post-73286ffe` the Heitlinger Brasserie has been modernised
- `post-b5e879f0` Restaurant India has closed after 31 years
- `post-cb785d0b` the place now has almost 60 seats
- `post-cb785d0b` at first bread was delivered, now they bake their own Brot every day
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e62d3c39` the operators of Otto, Trio and Pluto took over the day café Bravo in the KW Institute fo…

### match_isolated.branch (11)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3d2d364e` Veg'd Burger: brand only ≠ VEG'D - Vegan Burgers - F-hain
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-5b5671fa` City Chicken: brand only ≠ Nhas City Chicken
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only
