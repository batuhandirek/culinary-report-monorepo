# Ingestion eval: labels-jev-k8

2026-11-05 15:42 UTC · 172 reviews, 199 posts, 0 wordings · 500 cases left out (no reference or no output)
Reading: reader split, labeller classifier, aspectShortlist 8, claims reference
Tokens: 8,019,729
Spend: $0.299 (paid calls: classifiers)

> The claims are the reference's own (`--claims reference`): only their labels were read, so only the parts are scored.
Models: claim-labels: typesafe-ai/jev-latest (369)

## Reviews

| Metric | labels-jev-k8 | stored | sq-sonnet | new-sonnet | labels-jev |
|---|---|---|---|---|---|
| Sentiment | 98% (1123/1146) | 88% +10 | 97% +1 | 97% +1 | 98% ±0 |
| Aspect, exact | 90% (1027/1146) | 71% +19 | 93% -3 | 91% -1 | 93% -3 |
| Aspect, right root | 95% (1094/1146) | 81% +15 | 96% -1 | 95% ±0 | 96% -1 |
| Aspect: the reference's among those offered (shortlist) | 98% (1122/1146) | — | — | — | — |
| Kind | 98% (1120/1146) | 67% +31 | 97% +1 | 97% +1 | 98% ±0 |
| Kind given at all | 100% (1146/1146) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 74% (850/1146) | — | — | 74% ±0 | 73% +1 |
| Sentiment, among sure answers | 100% (850/850) | — | — | 99% +1 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 51% (580/1146) | — | — | 50% +1 | 49% +2 |
| Aspect, exact, among sure answers | 98% (569/580) | — | — | 97% +1 | 99% -1 |
| Kind: sure answers (p ≥ 0.9, of answered) | 74% (846/1146) | — | — | 78% -4 | 73% ±0 |
| Kind, among sure answers | 99% (839/846) | — | — | 99% +1 | 99% ±0 |
| Changes that are changes | 72% (13/18) | 56% +16 | 67% +6 | 67% +6 | 76% -4 |
| Changes found | 81% (13/16) | 80% +1 | 100% -19 | 100% -19 | 81% ±0 |
| Amount | 73% (29/40) | 41% +31 | 93% -20 | 64% +8 | 73% ±0 |

## Posts and articles

| Metric | labels-jev-k8 | stored | sq-sonnet | new-sonnet | labels-jev |
|---|---|---|---|---|---|
| Sentiment | 97% (2782/2864) | 86% +12 | 96% +2 | 95% +2 | 97% ±0 |
| Aspect, exact | 82% (2340/2864) | 63% +18 | 86% -4 | 82% ±0 | 87% -5 |
| Aspect, right root | 91% (2599/2864) | 78% +13 | 91% ±0 | 88% +3 | 92% -2 |
| Aspect: the reference's among those offered (shortlist) | 95% (2721/2864) | — | — | — | — |
| Kind | 94% (2697/2864) | 47% +47 | 94% ±0 | 92% +2 | 94% ±0 |
| Kind given at all | 100% (2864/2864) | 4% +96 | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 67% (1921/2864) | — | — | 66% +1 | 67% ±0 |
| Sentiment, among sure answers | 100% (1914/1921) | — | — | 98% +2 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 41% (1186/2864) | — | — | 33% +8 | 40% +1 |
| Aspect, exact, among sure answers | 94% (1120/1186) | — | — | 96% -1 | 98% -4 |
| Kind: sure answers (p ≥ 0.9, of answered) | 61% (1740/2864) | — | — | 60% +1 | 60% +1 |
| Kind, among sure answers | 98% (1707/1740) | — | — | 98% ±0 | 98% ±0 |
| Changes that are changes | 49% (46/94) | 46% +3 | 68% -19 | 53% -4 | 50% -1 |
| Changes found | 97% (31/32) | 38% +59 | 90% +7 | 100% -3 | 94% +3 |
| Amount | 86% (65/76) | 46% +39 | 81% +5 | 79% +7 | 84% +1 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | labels-jev-k8 (train) | labels-jev-k8 (test) | sq-sonnet (test) | new-sonnet (test) | labels-jev (test) |
|---|---|---|---|---|---|
| Sentiment | 98% | 98% (342/349) | 97% +1 | 97% +1 | 98% ±0 |
| Aspect, exact | 89% | 91% (316/349) | 93% -3 | 91% -1 | 94% -4 |
| Aspect, right root | 96% | 95% (332/349) | 96% -1 | 95% ±0 | 97% -2 |
| Aspect: the reference's among those offered (shortlist) | 98% | 99% (344/349) | — | — | — |
| Kind | 98% | 98% (342/349) | 97% +1 | 97% +1 | 98% ±0 |
| Kind given at all | 100% | 100% (349/349) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 75% | 72% (250/349) | — | 74% -2 | 71% +1 |
| Sentiment, among sure answers | 100% | 100% (250/250) | — | 99% +1 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 50% | 52% (183/349) | — | 50% +3 | 50% +3 |
| Aspect, exact, among sure answers | 98% | 98% (180/183) | — | 97% +1 | 100% -2 |
| Kind: sure answers (p ≥ 0.9, of answered) | 72% | 78% (273/349) | — | 78% +1 | 78% +1 |
| Kind, among sure answers | 99% | 99% (270/273) | — | 99% ±0 | 99% ±0 |
| Changes that are changes | 73% | 67% (2/3) | 67% ±0 | 67% ±0 | 67% ±0 |
| Changes found | 79% | 100% (2/2) | 100% ±0 | 100% ±0 | 100% ±0 |
| Amount | 77% | 64% (9/14) | 93% -29 | 64% ±0 | 64% ±0 |

### Posts and articles

| Metric | labels-jev-k8 (train) | labels-jev-k8 (test) | sq-sonnet (test) | new-sonnet (test) | labels-jev (test) |
|---|---|---|---|---|---|
| Sentiment | 97% | 97% (847/874) | 96% +1 | 95% +2 | 97% ±0 |
| Aspect, exact | 82% | 81% (711/874) | 86% -5 | 82% ±0 | 86% -4 |
| Aspect, right root | 91% | 90% (785/874) | 91% -1 | 88% +2 | 92% -2 |
| Aspect: the reference's among those offered (shortlist) | 95% | 95% (834/874) | — | — | — |
| Kind | 94% | 94% (818/874) | 94% ±0 | 92% +1 | 93% ±0 |
| Kind given at all | 100% | 100% (874/874) | 100% ±0 | 100% ±0 | 100% ±0 |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 68% | 65% (572/874) | — | 66% -1 | 66% -1 |
| Sentiment, among sure answers | 100% | 100% (570/572) | — | 98% +2 | 100% ±0 |
| Aspect: sure answers (p ≥ 0.9, of answered) | 43% | 37% (325/874) | — | 33% +4 | 36% +1 |
| Aspect, exact, among sure answers | 95% | 94% (304/325) | — | 96% -2 | 99% -6 |
| Kind: sure answers (p ≥ 0.9, of answered) | 61% | 60% (527/874) | — | 60% +1 | 59% +1 |
| Kind, among sure answers | 98% | 97% (513/527) | — | 98% ±0 | 98% -1 |
| Changes that are changes | 49% | 48% (15/31) | 68% -20 | 53% -5 | 45% +3 |
| Changes found | 95% | 100% (10/10) | 90% +10 | 100% ±0 | 100% ±0 |
| Amount | 88% | 82% (23/28) | 81% +1 | 79% +4 | 82% ±0 |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | — | — | 92% (419/455) | 98% (447/455) | — | — |
| hard | — | — | 92% (111/121) | 98% (119/121) | — | — |
| lang:de | — | — | 89% (372/416) | 98% (406/416) | — | — |
| lang:en | — | — | 92% (255/277) | 99% (275/277) | — | — |
| lang:other | — | — | 87% (319/368) | 98% (360/368) | — | — |
| lang:tr | — | — | 95% (81/85) | 96% (82/85) | — | — |
| length:long | — | — | 89% (328/369) | 97% (359/369) | — | — |
| length:medium | — | — | 90% (644/715) | 98% (703/715) | — | — |
| length:short | — | — | 89% (55/62) | 98% (61/62) | — | — |
| no-transcript | — | — | 83% (554/665) | 99% (657/665) | — | — |
| own | — | — | 84% (84/100) | 99% (99/100) | — | — |
| places:few | — | — | 81% (1669/2060) | 97% (1996/2060) | — | — |
| places:many | — | — | 84% (664/793) | 98% (775/793) | — | — |
| places:none | — | — | 64% (7/11) | 100% (11/11) | — | — |
| platform:blog | — | — | 80% (1168/1461) | 96% (1409/1461) | — | — |
| platform:google | — | — | 90% (1027/1146) | 98% (1123/1146) | — | — |
| platform:instagram | — | — | 83% (376/451) | 99% (446/451) | — | — |
| platform:tiktok | — | — | 84% (796/952) | 97% (927/952) | — | — |
| size:large | — | — | 81% (1114/1378) | 97% (1331/1378) | — | — |
| size:medium | — | — | 82% (860/1053) | 97% (1023/1053) | — | — |
| size:small | — | — | 85% (366/433) | 99% (428/433) | — | — |
| stars:1 | — | — | 87% (172/198) | 98% (194/198) | — | — |
| stars:2 | — | — | 88% (164/186) | 97% (181/186) | — | — |
| stars:3 | — | — | 88% (229/260) | 97% (253/260) | — | — |
| stars:4 | — | — | 92% (214/233) | 99% (230/233) | — | — |
| stars:5 | — | — | 92% (248/269) | 99% (265/269) | — | — |
| transcript | — | — | 84% (618/738) | 97% (716/738) | — | — |

## Misses

### parts.aspect (643)

- `review-02556664` the reviewer did not get to eat: queue ≠ service
- `review-02556664` go to the competition instead: none ≠ queue
- `review-037bbe20` the venue is unique: vibe ≠ none
- `review-0541b749` the légumes were hard to digest: food ≠ cooking
- `review-070860ca` not worth the hassle: none ≠ service
- `review-08c67545` the ambiance was very nice and unique: atmosphere ≠ interior
- `review-08c67545` none of the starters or desserts appealed to the reviewer: menu_variety ≠ taste
- `review-0ac47c59` the chicken meat was in the döner: food ≠ ingredient_quality
- `review-1016bd13` the restaurant said the cold dishes were already set out: service ≠ wait_for_food
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling ≠ wait_for_food
- `review-1016bd13` asks whether serving hot dishes earlier would really mean f…: pressure ≠ speed_of_service
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: menu_variety ≠ food
- `review-170f36a3` the atmosphere has vibes: atmosphere ≠ vibe
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ none
- `review-1798cc23` no information was given about the Weinen: advice ≠ drink_selection
- `review-196641fc` the kebab experts ignore guests' questions: attentiveness ≠ service
- `review-196641fc` eating on site is possible: space ≠ dining_area
- `review-21c1bb10` young crowd: crowding ≠ occasion
- `review-257f4791` we were a table of five French people: none ≠ occasion
- `review-257f4791` perfect for the atmosphere: atmosphere ≠ vibe
- `review-279b23c3` Justin is the most important and gets a 13/10: service ≠ none
- `review-2d6d3829` the music inside is great: atmosphere ≠ noise
- `review-3486a0a9` would love to see gf buns on offer: dietary ≠ menu_variety
- `review-356e149a` we have always been satisfied until now: none ≠ service
- `review-356e149a` won't spend another cent at this place as long as this empl…: none ≠ service
- `review-356e149a` the first thing the employee said was asking if I was the d…: friendliness ≠ service
- `review-356e149a` the employee said she had never seen anyone lean like that: friendliness ≠ service
- `review-36f2fac8` it takes a really, really long time: queue ≠ wait_for_food
- `review-36f2fac8` the place is more of a tourist hype/trend: crowding ≠ none
- `review-37016d87` the atmosphere was typical: atmosphere ≠ vibe
- `review-37016d87` recommends it to those traveling in the area: none ≠ advice
- `review-373ef9af` a nice, fun evening out: atmosphere ≠ occasion
- `review-382cd7e9` the renovation reeks of greed: interior ≠ ownership
- `review-39bfa8dd` lovely brass band: atmosphere ≠ noise
- `review-3bab8289` two people went for lunch: none ≠ occasion
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: taste ≠ none
- `review-436b38b2` will not eat here again: none ≠ service
- `review-480994b6` the music selection was excellent: atmosphere ≠ noise
- … 603 more in issues.jsonl

### parts.kind (193)

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
- `review-83cf47fa` the 알밥 was served as a cold dish: opinion ≠ change
- `review-99fbc478` when paying they offered a consolation drink: opinion ≠ fact
- `review-a6b69e2b` the reviewer correctly provided address and phone number fo…: fact ≠ opinion
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-be1da4e0` a bottle of Wasser was put out unprompted and handed to eve…: fact ≠ opinion
- `review-beb397cd` the reviewer went in without expectations because they are …: fact ≠ opinion
- `review-c5e1a090` the reviewer politely pointed out the fewer Erdbeeren and l…: fact ≠ opinion
- `review-d77ecb53` had the crispy pork knuckle: opinion ≠ fact
- `review-dd166b0d` overall a lovely café: verdict ≠ opinion
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
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
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: opinion ≠ fact
- `post-2672e9fe` the Türkischer Mokka is traditional: opinion ≠ fact
- … 153 more in issues.jsonl

### shortlist.recall (167)

- `review-08c67545` none of the starters or desserts appealed to the reviewer: menu_variety not offered
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: complaint_handling not offered
- `review-1798cc23` the Google listing is no longer accurate: other not offered
- `review-1798cc23` the old listing including its reviews was simply continued: other not offered
- `review-1798cc23` no information was given about the Weinen: advice not offered
- `review-196641fc` eating on site is possible: space not offered
- `review-279b23c3` Justin is the most important and gets a 13/10: service not offered
- `review-3486a0a9` would love to see gf buns on offer: dietary not offered
- `review-356e149a` the first thing the employee said was asking if I was the d…: friendliness not offered
- `review-356e149a` the employee said she had never seen anyone lean like that: friendliness not offered
- `review-5582d6b8` the table was terribly wobbly: interior not offered
- `review-5582d6b8` the friend barely touched the table and the spoons fell: interior not offered
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste not offered
- `review-7f3142f7` the venue needs to update its website: other not offered
- `review-7f3142f7` the website says event tickets include 2 litres of beer per…: other not offered
- `review-7f3142f7` the website's ticket information is very misleading: other not offered
- `review-866767df` the meal was peaceful: noise not offered
- `review-99fbc478` cold mashed potatoes lay underneath: temperature not offered
- `review-a088b847` the man at the Korean place makes an excellent kimchi “rame…: taste not offered
- `review-be1da4e0` the high drink prices did not encourage them to stay longer: price_level not offered
- `review-bf2322b7` there were even different marinades for the chicken: menu_variety not offered
- `review-c5e1a090` the reviewer politely pointed out the fewer Erdbeeren and l…: complaint_handling not offered
- `review-feb41b4e` small mistakes were generously fixed: complaint_handling not offered
- `review-ff9ad17d` the mealy Pommes with the Cheesesauce were completely unacc…: cooking not offered
- `post-047130f4` Ben says the best pizza they sell is the plain old salami: taste not offered
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: taste not offered
- `post-047130f4` salmon on pizza just doesn't work: taste not offered
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: other not offered
- `post-0a8f804b` Flavours range from Gochujang-Karamell to silky tofu with p…: menu_variety not offered
- `post-0a8f804b` The Kaylin is a particular crowd favourite: taste not offered
- `post-0a8f804b` The Kaylin is a tamarind slushie with cedar-lime-leaf ice c…: menu_variety not offered
- `post-0d1e7abc` the author especially likes the Grilled Cheese mit Kimchi: taste not offered
- `post-0dde5eb7` the dish comes with tenderly melted Käse: cooking not offered
- `post-0dde5eb7` the dish comes with a dark, aromatic Soße: taste not offered
- `post-11f0057b` at the next table people talk about their last Berghain vis…: atmosphere not offered
- `post-1ca1ffee` elsewhere a steak ordered medium comes through or bloody an…: cooking not offered
- `post-1d0aeaca` Die Eismacher is still serving from Körtestraße 10, verifie…: location not offered
- `post-1d0aeaca` Miriam is Die Eismacher's ice cream maker: ownership not offered
- `post-1d0aeaca` Die Eismacher has a near-sorbet mixing pineapple and mint: menu_variety not offered
- `post-1d0aeaca` Die Eismacher has beetroot and orange ginger flavors: menu_variety not offered
- … 127 more in issues.jsonl

### parts.sentiment (105)

- `review-02556664` go to the competition instead: negative ≠ positive
- `review-07871fa7` the music was very loud: negative ≠ positive
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-503d63e2` would have loved to try the Acai: neutral ≠ positive
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-90e99b19` the atmosphere is ordinary: negative ≠ neutral
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
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `review-ffc5c8e8` the food is meat with meat with meat with meat with meat: neutral ≠ positive
- `post-047130f4` Berlin likes pizza even when it is bad: neutral ≠ positive
- `post-047130f4` Nudja, a spicy soft chili salami, is extremely hot on pizza: neutral ≠ positive
- `post-0a8f804b` The author will take his own cousin to Cousins: positive ≠ neutral
- `post-11f0057b` a date night at Magma is better without hearing about the l…: mixed ≠ positive
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: neutral ≠ negative
- `post-1b8b0789` the owner is the same in person as on the internet, no filt…: neutral ≠ negative
- `post-217c8e79` Fischsoße is very popular in Vietnam: neutral ≠ positive
- `post-22c25ac1` the dumplings are steamed fresh and served with sauces: positive ≠ neutral
- `post-2672e9fe` the Türkischer Mokka is traditional: positive ≠ neutral
- `post-2a8e9606` Hafenküche has no Kuchen: neutral ≠ negative
- `post-31344bc5` the biggest Berlin food trend of 2026 is casual fine dining: neutral ≠ positive
- `post-31344bc5` casual fine dining means a 7-course menu while wearing snea…: neutral ≠ positive
- `post-35092a94` come by and see for yourself: positive ≠ neutral
- `post-388b4383` they hope Ketch’up 35 expands to many neighbourhoods: positive ≠ neutral
- `post-388b4383` the cult snack bar under the U-Bahn has existed since 1960: neutral ≠ positive
- `post-388b4383` Stern magazine headlined 'When men cry over sausages' after…: neutral ≠ positive
- `post-388b4383` Frank Spieß and his team serve Chili-Variationen that cause…: neutral ≠ negative
- … 65 more in issues.jsonl

### change.false (53)

- `review-1798cc23` the Google listing is no longer accurate
- `review-356e149a` we have always been satisfied until now
- `review-4cd140a3` it got fuller and therefore louder
- `review-7593dfff` once the older gentleman showed up, everything went faster
- `review-83cf47fa` the 알밥 was served as a cold dish
- `post-11f0057b` at Magma such evenings are now possible all year round
- `post-1d0aeaca` Die Eismacher's flavours change and may differ from the original review
- `post-31344bc5` Berlin's gastro scene is reinventing itself
- `post-33308126` the batter stays the same, only the fish is different
- `post-388b4383` their son Matthias now runs Zur Bratpfanne and the third generation is already involved
- `post-388b4383` the quality at Jörgs Curry Container has remained
- `post-388b4383` Konnopke’s Imbiß is a popular photo motif again
- `post-3a0ad71a` etwas. kleines in Friedrichshain is now a place dedicated only to croissants
- `post-3a0ad71a` YOU replaces the former Heritage
- `post-45dafb41` in Berlin even ambitiously started pizza projects now see themselves more as fast-food pl…
- `post-524765b0` Kírkē now invites sommeliers and winemakers for guest appearances around Greek wine
- `post-58a16831` Pêle-Mêle ends the era of the Avocadostulle
- `post-59699006` Café Amano at Hotel Amano now opens its green window to serve passers-by
- `post-59699006` Coffee houses are having a renaissance in Berlin
- `post-5db3b46a` Pizza Hut probably no longer sells stuffed crust pizza
- `post-66f606db` the former car park now hosts culture instead of cars
- `post-674e7322` Mrs. Robinsons is closed
- `post-6b4377f6` Hier returns to cooking craft and regional ingredients
- `post-6b4377f6` Mraz & Sohn received its second star
- `post-6c0e92d2` Josue Kashala took over the bar at Kroque
- `post-6ddca88c` Breda is on the Landwehrkanal instead of the Gipsdreieck
- `post-6ddca88c` The Garibaldi seems to have become Breda's signature drink right after opening
- `post-7516d1de` Bahadur has no cliché golden elephants or kitsch peacock statues, only slight Indian touc…
- `post-7516d1de` Berlin is waking up to Indian food
- `post-8d8803aa` ORA is looking for a new Chef de Partie starting in November 2026
- `post-909ca5ee` The Cavatelli are currently served as Pasta alla Norma
- `post-93ac6d3b` Charlottenburg is experiencing a gastronomic revival
- `post-93ac6d3b` the area around Savignyplatz is regaining its old appeal, without the stuffiness of the e…
- `post-a3178d9e` The Bun Society changed the creator's opinion of smashburgers for the better
- `post-a8f0603a` Halloween-themed spooky vibes have taken over UMAMI Ku’damm
- `post-aa137bfa` the old DNA has not entirely disappeared
- `post-b5e879f0` commercial rents on Bergmannstraße increased
- `post-babe1142` in Italy buffalo ice cream is a trend growing in popularity
- `post-c0a7fdc2` Pêle-Mêle ends the era of the avocado bread
- `post-c4e7c0a9` seasonal dishes on the menu change regularly
- … 13 more in issues.jsonl

### parts.amount (22)

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
- `post-5db3b46a` Manello costs about 15 bucks: 15 money ≠ —
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-68b0cd44` the bian bian noodles cost only 8.90: 8.9 money ≠ —
- `post-6c0e92d2` the mousse au chocolat disappeared within minutes, actually…: 1 minutes ≠ —
- `post-baac3611` giveaway of a 50 € voucher for 44 CHKN: 50 money ≠ —
- `post-babe1142` Peggy Bee's Berlin Ice Cream Week 2021 offering is a one-eu…: 1 money ≠ —
- `post-cb785d0b` tomorrow the Döner costs only one cent: 0.01 money ≠ —
- `post-cb785d0b` for the 3 euro Döner you can choose Hähnchen, Falafel or Ha…: 3 money ≠ —
- `post-fc96acff` 100 euros for the Vosne-Romanée is close to theft: —  ≠ 100 money

### change.missed (4)

- `review-2b737ce5` before today the food was okay
- `review-382cd7e9` the renovation is a real shame
- `review-c117171d` the place is degrading
- `post-c0a7fdc2` water damage and renovation delayed the reopening until January
