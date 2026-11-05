# Ingestion eval: labels-jev

2026-11-05 13:47 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output)
Reading: reader split, labeller classifier, claims reference
Tokens: 16,877,348
Spend: $0.599 (paid calls: classifiers)

> The claims are the reference's own (`--claims reference`): only their labels were read, so only the parts are scored.
Models: claim-labels: typesafe-ai/jev-latest (369)

## Reviews

| Metric | labels-jev | stored | terms-sonnet | terms-haiku | one-v2 |
|---|---|---|---|---|---|
| Sentiment | 98% (1122/1146) | 88% +10 | — | — | 93% +5 |
| Aspect, exact | 93% (1062/1146) | 71% +22 | — | — | 82% +10 |
| Aspect, right root | 96% (1102/1146) | 81% +15 | — | — | 91% +5 |
| Kind | 98% (1119/1146) | 67% +31 | — | — | 95% +3 |
| Kind given at all | 100% (1146/1146) | 4% +96 | — | — | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 73% (842/1146) | — | — | — | — |
| Sentiment, among sure answers | 100% (842/842) | — | — | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 49% (561/1146) | — | — | — | — |
| Aspect, exact, among sure answers | 99% (558/561) | — | — | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 73% (842/1146) | — | — | — | — |
| Kind, among sure answers | 99% (834/842) | — | — | — | — |
| Changes that are changes | 76% (13/17) | 56% +20 | — | — | 55% +21 |
| Changes found | 81% (13/16) | 80% +1 | — | — | 81% ±0 |
| Amount | 73% (29/40) | 41% +31 | — | — | 73% ±0 |

## Posts and articles

| Metric | labels-jev | stored | terms-sonnet | terms-haiku | one-v2 |
|---|---|---|---|---|---|
| Sentiment | 97% (2775/2864) | 86% +11 | — | — | 89% +8 |
| Aspect, exact | 87% (2487/2864) | 63% +24 | — | — | 70% +17 |
| Aspect, right root | 92% (2645/2864) | 78% +15 | — | — | 86% +7 |
| Kind | 94% (2694/2864) | 47% +47 | — | — | 87% +7 |
| Kind given at all | 100% (2864/2864) | 4% +96 | — | — | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 67% (1932/2864) | — | — | — | — |
| Sentiment, among sure answers | 100% (1925/1932) | — | — | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 40% (1144/2864) | — | — | — | — |
| Aspect, exact, among sure answers | 98% (1123/1144) | — | — | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 60% (1720/2864) | — | — | — | — |
| Kind, among sure answers | 98% (1692/1720) | — | — | — | — |
| Changes that are changes | 50% (47/94) | 46% +4 | — | — | 41% +9 |
| Changes found | 94% (30/32) | 38% +56 | — | — | 66% +28 |
| Amount | 84% (64/76) | 46% +38 | — | — | 71% +13 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | labels-jev (train) | labels-jev (test) | terms-sonnet (test) | terms-haiku (test) | one-v2 (test) |
|---|---|---|---|---|---|
| Sentiment | 98% | 98% (341/349) | — | — | 93% +5 |
| Aspect, exact | 92% | 94% (329/349) | — | — | 79% +15 |
| Aspect, right root | 96% | 97% (338/349) | — | — | 88% +9 |
| Kind | 98% | 98% (341/349) | — | — | 96% +2 |
| Kind given at all | 100% | 100% (349/349) | — | — | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 75% | 71% (248/349) | — | — | — |
| Sentiment, among sure answers | 100% | 100% (248/248) | — | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 49% | 50% (173/349) | — | — | — |
| Aspect, exact, among sure answers | 99% | 100% (173/173) | — | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 72% | 78% (271/349) | — | — | — |
| Kind, among sure answers | 99% | 99% (267/271) | — | — | — |
| Changes that are changes | 79% | 67% (2/3) | — | — | 40% +27 |
| Changes found | 79% | 100% (2/2) | — | — | 100% ±0 |
| Amount | 77% | 64% (9/14) | — | — | 82% -18 |

### Posts and articles

| Metric | labels-jev (train) | labels-jev (test) | terms-sonnet (test) | terms-haiku (test) | one-v2 (test) |
|---|---|---|---|---|---|
| Sentiment | 97% | 97% (848/874) | — | — | 89% +8 |
| Aspect, exact | 87% | 86% (750/874) | — | — | 67% +19 |
| Aspect, right root | 93% | 92% (800/874) | — | — | 82% +10 |
| Kind | 94% | 93% (814/874) | — | — | 86% +7 |
| Kind given at all | 100% | 100% (874/874) | — | — | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 68% | 66% (579/874) | — | — | — |
| Sentiment, among sure answers | 100% | 100% (577/579) | — | — | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 42% | 36% (312/874) | — | — | — |
| Aspect, exact, among sure answers | 98% | 99% (309/312) | — | — | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 61% | 59% (516/874) | — | — | — |
| Kind, among sure answers | 99% | 98% (506/516) | — | — | — |
| Changes that are changes | 52% | 45% (15/33) | — | — | 34% +11 |
| Changes found | 91% | 100% (10/10) | — | — | 70% +30 |
| Amount | 85% | 82% (23/28) | — | — | 64% +19 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | — | — | 93% (425/455) | 98% (447/455) | — | — |
| hard | — | — | 93% (113/121) | 98% (119/121) | — | — |
| lang:de | — | — | 94% (389/416) | 97% (403/416) | — | — |
| lang:en | — | — | 94% (261/277) | 99% (275/277) | — | — |
| lang:other | — | — | 89% (329/368) | 98% (362/368) | — | — |
| lang:tr | — | — | 98% (83/85) | 96% (82/85) | — | — |
| length:long | — | — | 94% (347/369) | 97% (357/369) | — | — |
| length:medium | — | — | 92% (657/715) | 98% (704/715) | — | — |
| length:short | — | — | 94% (58/62) | 98% (61/62) | — | — |
| no-transcript | — | — | 90% (600/665) | 99% (656/665) | — | — |
| own | — | — | 92% (92/100) | 99% (99/100) | — | — |
| places:few | — | — | 86% (1774/2060) | 97% (1993/2060) | — | — |
| places:many | — | — | 89% (703/793) | 97% (771/793) | — | — |
| places:none | — | — | 91% (10/11) | 100% (11/11) | — | — |
| platform:blog | — | — | 84% (1232/1461) | 96% (1406/1461) | — | — |
| platform:google | — | — | 93% (1062/1146) | 98% (1122/1146) | — | — |
| platform:instagram | — | — | 89% (402/451) | 99% (446/451) | — | — |
| platform:tiktok | — | — | 90% (853/952) | 97% (923/952) | — | — |
| size:large | — | — | 86% (1179/1378) | 96% (1324/1378) | — | — |
| size:medium | — | — | 86% (910/1053) | 97% (1023/1053) | — | — |
| size:small | — | — | 92% (398/433) | 99% (428/433) | — | — |
| stars:1 | — | — | 90% (178/198) | 98% (194/198) | — | — |
| stars:2 | — | — | 93% (173/186) | 97% (181/186) | — | — |
| stars:3 | — | — | 93% (241/260) | 97% (253/260) | — | — |
| stars:4 | — | — | 92% (215/233) | 99% (230/233) | — | — |
| stars:5 | — | — | 95% (255/269) | 98% (264/269) | — | — |
| transcript | — | — | 89% (655/738) | 97% (713/738) | — | — |

## Misses

### parts.aspect (461)

- `review-02556664` go to the competition instead: none ≠ queue
- `review-037bbe20` the venue is unique: vibe ≠ none
- `review-0541b749` the pain was quickly made, nothing special: food ≠ speed_of_service
- `review-0541b749` the légumes were hard to digest: food ≠ cooking
- `review-08c67545` the ambiance was very nice and unique: atmosphere ≠ interior
- `review-08c67545` none of the starters or desserts appealed to the reviewer: menu_variety ≠ taste
- `review-1016bd13` planned to order more drinks on site as needed: drinks ≠ drink_selection
- `review-1016bd13` the restaurant said the cold dishes were already set out: service ≠ speed_of_service
- `review-1016bd13` the soup was served quickly on arrival: wait_for_food ≠ speed_of_service
- `review-1016bd13` none of the tables had a bottle opener: service ≠ amenities
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ none
- `review-1eca7dfe` the restaurant is lovely: none ≠ atmosphere
- `review-21c1bb10` young crowd: crowding ≠ occasion
- `review-27722511` there are better kebabs in Berlin: none ≠ taste
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: food ≠ taste
- `review-2d6d3829` the music inside is great: atmosphere ≠ noise
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: taste ≠ advice
- `review-36f2fac8` the place is more of a tourist hype/trend: crowding ≠ authenticity
- `review-373ef9af` a nice, fun evening out: atmosphere ≠ occasion
- `review-382cd7e9` the message is that they don't care about people, only thei…: none ≠ attentiveness
- `review-382cd7e9` the renovation reeks of greed: interior ≠ ownership
- `review-382cd7e9` how awful: none ≠ space
- `review-39bfa8dd` lovely brass band: atmosphere ≠ noise
- `review-3e075e7e` the place has a street style: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-436b38b2` will not eat here again: none ≠ service
- `review-480994b6` came as two people: none ≠ occasion
- `review-480994b6` the music selection was excellent: atmosphere ≠ noise
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-503d63e2` really wanted to try the Acai: none ≠ food
- `review-52ef0f64` the Vöner Döner was quite good: taste ≠ food
- `review-5582d6b8` there were some issues too: none ≠ outdoor_seating
- `review-5582d6b8` had iced matcha latte: none ≠ drinks
- `review-55fd7176` ordered Menü 3 with Baguette: none ≠ menu_variety
- `review-5604a426` the kebab was swimming in a sea of sauce: seasoning ≠ presentation
- `review-6752188e` Markthalle Neun is an excellent food market: none ≠ food
- `review-6752188e` the prices are amazing: price_level ≠ price
- … 421 more in issues.jsonl

### parts.kind (197)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-1798cc23` one of the three Bier bottles looked different: opinion ≠ fact
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: opinion ≠ verdict
- `review-356e149a` we have always been satisfied until now: opinion ≠ change
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: opinion ≠ question
- `review-4cd140a3` it got fuller and therefore louder: opinion ≠ change
- `review-503d63e2` really wanted to try the Acai: fact ≠ opinion
- `review-5582d6b8` skip the matcha latte: opinion ≠ verdict
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6752188e` the reviewer rates the market 10000/10: verdict ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` first-time kebap eaters can find a much better kebap elsewh…: verdict ≠ opinion
- `review-7483275e` experienced kebap eaters can also find a better kebap elsew…: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-83cf47fa` the 알밥 was served as a cold dish: opinion ≠ question
- `review-99fbc478` when paying they offered a consolation drink: opinion ≠ fact
- `review-a6b69e2b` the reviewer correctly provided address and phone number fo…: fact ≠ opinion
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-be1da4e0` a bottle of Wasser was put out unprompted and handed to eve…: fact ≠ opinion
- `review-beb397cd` the reviewer went in without expectations because they are …: fact ≠ opinion
- `review-c5e1a090` the reviewer politely pointed out the fewer Erdbeeren and l…: fact ≠ opinion
- `review-d77ecb53` had the crispy pork knuckle: opinion ≠ fact
- `review-dcd4db39` drove several hundred kilometers to try Nhas' Chicken: fact ≠ opinion
- `review-dd166b0d` overall a lovely café: verdict ≠ opinion
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `post-020c68fb` if you have never been to Markthalle Neun you cannot say yo…: verdict ≠ opinion
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: deal ≠ fact
- `post-0a8f804b` The author will take his own cousin to Cousins: verdict ≠ fact
- `post-0d484513` Berlin shows its artisanal side this week: opinion ≠ event
- `post-11f0057b` at Magma such evenings are now possible all year round: opinion ≠ change
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: fact ≠ verdict
- `post-1ca1ffee` the creator celebrates Doree 65 more than any steakhouse: verdict ≠ opinion
- `post-1d0aeaca` Die Eismacher's flavours change and may differ from the ori…: fact ≠ change
- `post-1d0aeaca` Miriam considers a Club Mate flavor as the Berlin flavor: fact ≠ opinion
- `post-217c8e79` Fischsoße is very popular in Vietnam: fact ≠ opinion
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ event
- `post-22c25ac1` a charming street sale now offers a look behind the scenes: opinion ≠ event
- `post-22c25ac1` the frozen range adds White-Chicken, Pink-Lamb and Orange-P…: fact ≠ new_item
- … 157 more in issues.jsonl

### parts.sentiment (113)

- `review-02556664` go to the competition instead: negative ≠ positive
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-503d63e2` really wanted to try the Acai: neutral ≠ positive
- `review-503d63e2` would have loved to try the Acai: neutral ≠ positive
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-90e99b19` the place might be okay if passing nearby: mixed ≠ negative
- `review-99fbc478` when paying they offered a consolation drink: positive ≠ neutral
- `review-a6b69e2b` the reviewer correctly provided address and phone number fo…: neutral ≠ positive
- `review-af8dacaa` the reviewer would like more locations throughout Germany: positive ≠ negative
- `review-b31c1e48` the robot cat issue can't really be changed because of the …: neutral ≠ negative
- `review-b9d9100a` waiting in a line that moves is acceptable, as the establis…: neutral ≠ positive
- `review-be1da4e0` a bottle of Wasser was put out unprompted and handed to eve…: neutral ≠ positive
- `review-beb397cd` the reviewer went in without expectations because they are …: neutral ≠ negative
- `review-c5e1a090` the reviewer politely pointed out the fewer Erdbeeren and l…: neutral ≠ positive
- `review-c9cea664` they would rather go to the restaurant at Orankesee: negative ≠ positive
- `review-d77ecb53` had the crispy pork knuckle: positive ≠ neutral
- `review-dcd4db39` drove several hundred kilometers to try Nhas' Chicken: neutral ≠ positive
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` many burger combinations are possible: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `review-ffc5c8e8` the food is meat with meat with meat with meat with meat: neutral ≠ positive
- `post-047130f4` Berlin likes pizza even when it is bad: neutral ≠ positive
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: neutral ≠ positive
- `post-0a8f804b` The author will take his own cousin to Cousins: positive ≠ neutral
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-1b8b0789` the owner is the same in person as on the internet, no filt…: neutral ≠ negative
- `post-217c8e79` Fischsoße is very popular in Vietnam: neutral ≠ positive
- `post-2672e9fe` the Türkischer Mokka is traditional: positive ≠ neutral
- `post-2a8e9606` Hafenküche has no Kuchen: neutral ≠ negative
- `post-31344bc5` the biggest Berlin food trend of 2026 is casual fine dining: neutral ≠ positive
- `post-31344bc5` casual fine dining means a 7-course menu while wearing snea…: neutral ≠ positive
- `post-35092a94` come by and see for yourself: positive ≠ neutral
- `post-388b4383` they hope Ketch’up 35 expands to many neighbourhoods: positive ≠ neutral
- `post-388b4383` the cult snack bar under the U-Bahn has existed since 1960: neutral ≠ positive
- `post-388b4383` Stern magazine headlined 'When men cry over sausages' after…: neutral ≠ positive
- `post-388b4383` Frank Spieß and his team serve Chili-Variationen that cause…: neutral ≠ negative
- `post-388b4383` whoever withstands all chili variations at Curry & Chili ca…: neutral ≠ positive
- … 73 more in issues.jsonl

### change.false (51)

- `review-1798cc23` the Google listing is no longer accurate
- `review-356e149a` we have always been satisfied until now
- `review-4cd140a3` it got fuller and therefore louder
- `review-7593dfff` once the older gentleman showed up, everything went faster
- `post-11f0057b` at Magma such evenings are now possible all year round
- `post-1d0aeaca` Die Eismacher's flavours change and may differ from the original review
- `post-31344bc5` Berlin's gastro scene is reinventing itself
- `post-33308126` the batter stays the same, only the fish is different
- `post-388b4383` their son Matthias now runs Zur Bratpfanne and the third generation is already involved
- `post-388b4383` the quality at Jörgs Curry Container has remained
- `post-3a0ad71a` YOU replaces the former Heritage
- `post-45dafb41` in Berlin even ambitiously started pizza projects now see themselves more as fast-food pl…
- `post-524765b0` Kírkē now invites sommeliers and winemakers for guest appearances around Greek wine
- `post-56bff2cf` Sommelier Giorgi Silagadze followed Gugushvili from 8000 Vintages to Dro
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle
- `post-59699006` Café Amano at Hotel Amano now opens its green window to serve passers-by
- `post-59699006` Coffee houses are having a renaissance in Berlin
- `post-5db3b46a` Pizza Hut probably no longer sells stuffed crust pizza
- `post-66f606db` the former car park now hosts culture instead of cars
- `post-674e7322` Mrs. Robinsons is closed
- `post-6b4377f6` Hier returns to cooking craft and regional ingredients
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque
- `post-6ddca88c` Breda is on the Landwehrkanal instead of the Gipsdreieck
- `post-7516d1de` Bahadur has no cliché golden elephants or kitsch peacock statues, only slight Indian touc…
- `post-7516d1de` Berlin is waking up to Indian food
- `post-8d8803aa` ORA is looking for a new Chef de Partie starting in November 2026
- `post-909ca5ee` Barlevain's menu changes seasonally
- `post-909ca5ee` The Cavatelli are currently served as Pasta alla Norma
- `post-93ac6d3b` Charlottenburg is experiencing a gastronomic revival
- `post-93ac6d3b` the area around Savignyplatz is regaining its old appeal, without the stuffiness of the e…
- `post-a3178d9e` The Bun Society changed the creator's opinion of smashburgers for the better
- `post-a8f0603a` Halloween-themed spooky vibes have taken over UMAMI Ku’damm
- `post-aa137bfa` the old DNA has not entirely disappeared
- `post-b5e879f0` queuing is the new black on Bergmannstraße
- `post-b5e879f0` commercial rents on Bergmannstraße increased
- `post-babe1142` in Italy buffalo ice cream is a trend growing in popularity
- `post-c0a7fdc2` Pêle-Mêle ends the era of the avocado bread
- `post-c4e7c0a9` seasonal dishes on the menu change regularly
- `post-d1ab7367` The new owners keep the shop's Eastern European focus
- `post-d1ab7367` Josepha wants to bring more women winemakers into the range
- … 11 more in issues.jsonl

### parts.amount (23)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ —
- `review-1016bd13` called the lobby manager 20 minutes ahead so hot dishes cou…: —  ≠ 20 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-21de844d` waited over half an hour before being served: 30 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-503d63e2` waited at the table at least 30 minutes until the order was…: 30 minutes ≠ —
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: 60 minutes ≠ —
- `review-90e99b19` the place is not worth more than 15 minutes of travel: 15 minutes ≠ —
- `review-e12f5f74` waited in line for at least twenty minutes: 20 minutes ≠ —
- `post-0a8f804b` Early visitors are told to come back in an hour: 60 minutes ≠ —
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —
- `post-52eb53af` Wolt app code GTX: pay only 6€ instead of 18€ (minimum orde…: 6 money ≠ —
- `post-5db3b46a` Manello costs about 15 bucks: 15 money ≠ —
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-68b0cd44` the bian bian noodles cost only 8.90: 8.9 money ≠ —
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-baac3611` giveaway of a 50 € voucher for 44 CHKN: 50 money ≠ —
- `post-babe1142` Peggy Bee's Berlin Ice Cream Week 2021 offering is a one-eu…: 1 money ≠ —
- `post-cb785d0b` tomorrow the Döner costs only one cent: 0.01 money ≠ —
- `post-cb785d0b` for the 3 euro Döner you can choose Hähnchen, Falafel or Ha…: 3 money ≠ —
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money

### change.missed (5)

- `review-2b737ce5` before today the food was okay
- `review-382cd7e9` the renovation is a real shame
- `review-c117171d` the place is degrading
- `post-6ddca88c` Pinci's kitchen is not always as convincing as in its first wild weeks
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
