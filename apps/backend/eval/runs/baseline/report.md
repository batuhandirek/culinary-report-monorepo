# Ingestion eval: baseline

2026-11-01 12:19 UTC · 149 reviews, 150 posts, 500 wordings
Tokens: 2,529,739
Models: review-claims: anthropic/claude-haiku-5-5 (149); claim-parts: anthropic/claude-haiku-5-5 (290); post-claims: anthropic/claude-haiku-5-5 (150); venue-match: anthropic/claude-haiku-5-5 (66); term-topic: anthropic/claude-opus-5-5 (500)

## Reviews

| Metric | baseline | stored |
|---|---|---|
| Claims found (of the reference) | 99% (836/843) | 93% +6 |
| Claims that are real (of produced) | 98% (1077/1095) | 99% -1 |
| Sentiment | 94% (1037/1106) | 88% +6 |
| Aspect, exact | 90% (992/1106) | 71% +19 |
| Aspect, right root | 93% (1034/1106) | 81% +13 |
| Kind | 95% (1046/1106) | 67% +28 |
| Kind given at all | 100% (1106/1106) | 4% +96 |
| Changes that are changes | 88% (15/17) | 56% +32 |
| Changes found | 93% (14/15) | 80% +13 |
| Amount | 74% (29/39) | 41% +33 |
| Foods named, precision | 73% (268/366) | 32% +41 |
| Foods named, recall | 59% (268/453) | 23% +36 |

## Posts and articles

| Metric | baseline | stored |
|---|---|---|
| Claims found (of the reference) | 84% (1347/1611) | 56% +28 |
| Claims that are real (of produced) | 96% (1663/1730) | 95% +1 |
| Sentiment | 92% (1635/1778) | 86% +6 |
| Aspect, exact | 80% (1416/1778) | 63% +16 |
| Aspect, right root | 85% (1504/1778) | 78% +7 |
| Kind | 91% (1612/1778) | 47% +44 |
| Kind given at all | 100% (1778/1778) | 4% +96 |
| Changes that are changes | 73% (24/33) | 46% +26 |
| Changes found | 67% (16/24) | 38% +29 |
| Amount | 83% (50/60) | 46% +37 |
| Foods named, precision | 72% (775/1072) | 46% +26 |
| Foods named, recall | 59% (775/1308) | 39% +20 |
| Subject (place, city, none) | 94% (1672/1778) | 85% +9 |
| Claim on the right place | 94% (1451/1547) | 85% +9 |
| Places found | 92% (324/351) | 73% +19 |
| Places that are places | 93% (324/349) | 85% +8 |
| Match: brand (found places) | 91% (296/324) | 92% ±0 |
| Match: branch (right brand) | 97% (247/255) | 97% ±0 |
| Match on the reference's places: brand | 91% (321/351) | — |
| Match on the reference's places: branch | 96% (262/272) | — |
| Promotional flag | 80% (120/150) | 82% -2 |

## Wordings

| Metric | baseline | stored |
|---|---|---|
| Wording: topics exactly right | 95% (312/328) | 100% -5 |
| Wording: topics right (of produced) | 99% (397/400) | 100% -1 |
| Wording: topics found | 97% (369/382) | 100% -3 |
| Wording: first topic | 97% (318/328) | 100% -3 |
| Wording: relation | 95% (350/369) | 100% -5 |
| Wording: none when none | 90% (154/172) | — |
| Wording: linked when it should be | 97% (318/328) | 100% -3 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 99% (335/338) | 98% (433/443) | 91% (404/444) | 94% (416/444) | — | — |
| hard | 95% (39/41) | 97% (61/63) | 82% (51/62) | 98% (61/62) | 100% (4/4) | 100% (4/4) |
| lang:de | 99% (307/309) | 99% (387/392) | 90% (355/396) | 94% (371/396) | — | — |
| lang:en | 100% (207/207) | 98% (257/261) | 92% (242/263) | 97% (254/263) | — | — |
| lang:other | 99% (263/267) | 98% (351/358) | 88% (320/363) | 93% (338/363) | — | — |
| lang:tr | 98% (59/60) | 98% (82/84) | 89% (75/84) | 88% (74/84) | — | — |
| length:long | 98% (244/248) | 97% (352/362) | 88% (319/362) | 92% (332/362) | — | — |
| length:medium | 99% (540/543) | 99% (671/678) | 90% (620/687) | 95% (650/687) | — | — |
| length:short | 100% (52/52) | 98% (54/55) | 93% (53/57) | 96% (55/57) | — | — |
| no-transcript | 93% (340/367) | 98% (436/444) | 80% (367/459) | 96% (442/459) | 89% (78/88) | 88% (69/78) |
| own | 93% (41/44) | 92% (76/83) | 74% (56/76) | 97% (74/76) | 100% (15/15) | 100% (15/15) |
| places:few | 83% (907/1095) | 96% (1149/1194) | 77% (937/1216) | 93% (1135/1216) | 90% (127/141) | 90% (114/127) |
| places:many | 85% (435/510) | 96% (506/528) | 85% (473/554) | 89% (492/554) | 94% (197/210) | 92% (182/197) |
| places:none | 83% (5/6) | 100% (8/8) | 75% (6/8) | 100% (8/8) | — | — |
| platform:blog | 80% (645/810) | 95% (771/811) | 80% (668/840) | 89% (746/840) | 96% (174/181) | 94% (164/174) |
| platform:google | 99% (836/843) | 98% (1077/1095) | 90% (992/1106) | 94% (1037/1106) | — | — |
| platform:instagram | 94% (235/251) | 98% (291/298) | 77% (241/312) | 96% (300/312) | 85% (46/54) | 87% (40/46) |
| platform:tiktok | 85% (467/550) | 97% (601/621) | 81% (507/626) | 94% (589/626) | 90% (104/116) | 88% (92/104) |
| stars:1 | 100% (142/142) | 96% (196/204) | 93% (183/197) | 91% (180/197) | — | — |
| stars:2 | 99% (156/158) | 98% (208/212) | 89% (187/210) | 95% (199/210) | — | — |
| stars:3 | 99% (179/181) | 99% (236/239) | 90% (216/241) | 93% (223/241) | — | — |
| stars:4 | 100% (174/174) | 100% (212/212) | 90% (200/221) | 95% (210/221) | — | — |
| stars:5 | 98% (185/188) | 99% (225/228) | 87% (206/237) | 95% (225/237) | — | — |
| transcript | 83% (362/434) | 96% (456/475) | 80% (381/479) | 93% (447/479) | 88% (72/82) | 88% (63/72) |

## Misses

### parts.foods (596)

- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ [kebsa]
- `review-02d1586d` the staff were very good: [] ≠ [döneri]
- `review-02d1586d` the atmosphere was very good: [] ≠ [döneri]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-0541b749` the frites were frozen: [frites] ≠ [frites surgelées]
- `review-0541b749` the frites were too salty: [frites] ≠ [frites surgelées]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [türk döneri]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [köri sosu]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [tavuk eti]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ []
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [啤酒]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [可乐]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [橙汁]
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: [] ≠ [beer]
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ []
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: [土豆丝] ≠ []
- `review-16bdd5e0` my sauce was wrong: [] ≠ [kebab]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi]
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: [halloumi, grilled cheese] ≠ [halloumi]
- `review-1798cc23` the cuisine is now Afghan instead of Persian: [] ≠ [persisch, afghanisch]
- `review-1798cc23` one of the three Bier bottles looked different: [Bier] ≠ [beers]
- `review-196641fc` the Gemüse Kebab is perhaps the best so far: [Gemüse Kebab] ≠ []
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: [beef noodle soup] ≠ [MSG]
- `review-2d6d3829` the meat options are really excellent: [carne] ≠ [meat]
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: [sostituto della carne, falafel, formaggio] ≠ [meat substitute]
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: [sostituto della carne, falafel, formaggio] ≠ [falafel, cheese]
- `review-3486a0a9` the best burger (or veggie burger at least) currently in th…: [burger, veggie burger] ≠ [burger]
- `review-3486a0a9` the best burger (or veggie burger at least) currently in th…: [burger, veggie burger] ≠ [veggie burger]
- `review-3486a0a9` the veggie patty replacement is excellent: [veggie patty] ≠ [veggie patty replacement]
- `review-3486a0a9` would love to see gf buns on offer: [gf buns] ≠ [gluten-free buns]
- `review-3639cae4` doesn't understand the enthusiasm for this kebab: [kebabem] ≠ [kebab]
- `review-3639cae4` the kebab had loads of lemon: [kebabie, cytryny] ≠ [kebab, lemon]
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: [sera] ≠ [kebab, cheese]
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: [sera] ≠ [kebab, cheese]
- `review-3639cae4` there were practically no sauces: [Sosów] ≠ [sauce]
- `review-3639cae4` the bun was bitter: [Bułka] ≠ [bun]
- `review-3639cae4` the meat was dry: [mięso] ≠ [meat]
- … 556 more in issues.jsonl

### parts.aspect (476)

- `review-02556664` the staff were just messing around with the queue: service ≠ friendliness
- `review-02d1586d` the staff were very good: service ≠ food
- `review-02d1586d` the atmosphere was very good: atmosphere ≠ food
- `review-02d1586d` they thank the waiter as well: service ≠ none
- `review-037bbe20` the venue is unique: vibe ≠ location
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: menu_variety ≠ none
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: food ≠ none
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ drink_selection
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: drinks ≠ none
- `review-1016bd13` none of the tables had a bottle opener: service ≠ amenities
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: attentiveness ≠ other
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: attentiveness ≠ crowding
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: speed_of_service ≠ portion_size
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ complaint_handling
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: speed_of_service ≠ wait_for_food
- `review-1016bd13` suspects the hot dishes were deliberately held in the kitch…: speed_of_service ≠ wait_for_food
- `review-1016bd13` at a 16-person round table the waiter said all dishes come …: portion_size ≠ space
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: food ≠ order_accuracy
- `review-170f36a3` the food is high in calories: food ≠ taste
- `review-1798cc23` the Google listing is no longer accurate: other ≠ none
- `review-1798cc23` the menu, prices and cuisine differ from those in the listi…: menu_variety ≠ none
- `review-1798cc23` the cuisine is now Afghan instead of Persian: food ≠ none
- `review-1798cc23` the old listing including its reviews was simply continued: other ≠ none
- `review-1798cc23` Bier was only available by the bottle: drink_selection ≠ drinks
- `review-1798cc23` one of the three Bier bottles looked different: drink_quality ≠ presentation
- `review-27722511` don't expect exceptional service: service ≠ atmosphere
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: seasoning ≠ none
- `review-2c7253a2` no queue when arriving around 5 PM: queue ≠ none
- `review-2d6d3829` the meat options are really excellent: taste ≠ menu_variety
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: taste ≠ food
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: friendliness ≠ none
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: order_accuracy ≠ none
- `review-37016d87` everything was great: none ≠ service
- `review-37016d87` the atmosphere was typical: atmosphere ≠ vibe
- `review-37016d87` the atmosphere was very lively: crowding ≠ vibe
- `review-382cd7e9` how awful: none ≠ interior
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: attentiveness ≠ friendliness
- `review-39bfa8dd` you have to stay in your seat, otherwise you won't get any …: attentiveness ≠ other
- `review-3bab8289` the place was a bit empty when they were there: crowding ≠ atmosphere
- … 436 more in issues.jsonl

### claims.missed (271)

- `review-0541b749` the meat in the sandwich was chicken only
- `review-37016d87` the service was phenomenal
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-937ea9e9` Sandos is simply outstanding
- `review-937ea9e9` anyone who loves delicious Desserts absolutely has to stop by
- `review-b9d9100a` the taste is fantastic
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `post-01f172dd` they will be at their next pop-up
- `post-0216fd1d` Neukölln has places to eat well and cheaply
- `post-047130f4` Salami Social Club is the tasty new kid on the Friedrichshain block
- `post-047130f4` Salami Social Club was founded by Jacob and Ben
- `post-047130f4` the black pudding/blutwurst pizza was the first pizza Salami Social Club made
- `post-0a8f804b` Cousins serves generous scoops
- `post-0a8f804b` Kavita and Marieke opened Cousins
- `post-0a8f804b` The author will take his own cousin to Cousins
- `post-0d484513` Smooches' sandwiches have clean ingredient combinations
- `post-0d484513` Paule’s Metal Eck offers heavy music
- `post-0d484513` NOUMI Sushi Lounge is a stylish Asian spot to go this summer
- `post-165a9370` the Indian restaurant is a gem of a spot
- `post-1a2cebf2` MoMo Station is taking part in Diwali in Berlin, hosted by @wedesi.de
- `post-1b8b0789` the creators were warmly received at Doree 65
- `post-1ca1ffee` the creator loves the owner's character
- `post-1ca1ffee` the creator celebrates Doree 65 more than any steakhouse
- `post-1d0aeaca` Die Eismacher is Berlin's most exotic ice creamery
- `post-1d0aeaca` Die Eismacher pushes the limits of flavor like never before
- `post-1d0aeaca` Miriam is a sweet-toothed, bright-eyed, impassioned ice cream maker
- `post-1d0aeaca` the Ube flavor is insanely weird
- `post-1d0aeaca` the Ube ice cream is dynamic, creamy, thick and sweet
- `post-1d0aeaca` the Ube ice cream is one you have to try
- `post-1d0aeaca` Die Eismacher's other flavors are also strange
- `post-1d0aeaca` Die Eismacher has the ultimate neighborhood feel
- `post-1d0aeaca` Die Eismacher is revolutionizing the way we think about ice cream flavors and pairings
- `post-1d0aeaca` don't miss Die Eismacher
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur
- `post-22c25ac1` the Dumplings at Yumcha Heroes are celebrated by numerous guests
- `post-22c25ac1` the Manufaktur is a simple spot on the street with great enjoyment potential
- `post-22c25ac1` whoever has eaten Mrs. Chens Blue Pearl will never be satisfied with anything else
- `post-22c25ac1` the three women's food truly opens every heart
- `post-22c25ac1` the wait at the Manufaktur is worth it
- `post-22c25ac1` the factory sale brings high quality fresh to the table
- … 231 more in issues.jsonl

### parts.kind (226)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: opinion ≠ fact
- `review-02d1586d` they thank the waiter as well: opinion ≠ fact
- `review-037bbe20` the venue is unique: opinion ≠ fact
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: opinion ≠ fact
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: opinion ≠ fact
- `review-07871fa7` the loud music fits the vibe they want to create: opinion ≠ fact
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: opinion ≠ verdict
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: opinion ≠ fact
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: opinion ≠ fact
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: opinion ≠ fact
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: question ≠ fact
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: opinion ≠ fact
- `review-1798cc23` the Google listing is no longer accurate: opinion ≠ change
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: opinion ≠ fact
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: opinion ≠ fact
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: opinion ≠ verdict
- `review-3e075e7e` ate 2 kebsy there, both average: opinion ≠ fact
- `review-503d63e2` the savoury dish they ate instead was really very tasty: opinion ≠ fact
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: opinion ≠ fact
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-5604a426` came yesterday expecting to enjoy a tasty broodje gemuse ke…: fact ≠ opinion
- `review-5cd39af6` especially the young man with short white/blond hair was fr…: opinion ≠ fact
- `review-5fb8c319` time is money, so the place is a no-go: verdict ≠ opinion
- `review-6217ec70` not sure they would repeat the experience: verdict ≠ opinion
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: verdict ≠ fact
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7483275e` the place was highly recommended by friends and strangers: fact ≠ verdict
- `review-7483275e` the meat is a classic, basic chicken kebap: opinion ≠ fact
- `review-7483275e` first-time kebap eaters can find a much better kebap elsewh…: verdict ≠ opinion
- `review-7483275e` experienced kebap eaters can also find a better kebap elsew…: verdict ≠ opinion
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected …: opinion ≠ fact
- `review-83cf47fa` the 알밥 was served as a cold dish: opinion ≠ question
- `review-83cf47fa` the 물회 and the 알밥 had a strange 고수-like taste, maybe 시소: opinion ≠ question
- `review-88fe4146` after being refused, the server made excuses not to take th…: opinion ≠ fact
- `review-97751870` sarcastically: 'great, it was a complicated order too': opinion ≠ fact
- `review-9accbc5b` a celebrity chef lending his name to this makes it even wor…: opinion ≠ fact
- `review-a6b69e2b` the reviewer tried contacting Burgermaister but got no resp…: opinion ≠ fact
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-b9d9100a` waiting in a line that moves is acceptable, as the establis…: opinion ≠ fact
- `review-b9d9100a` in such a famous place only 2 people do all the work, inclu…: opinion ≠ fact
- … 186 more in issues.jsonl

### parts.sentiment (212)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: negative ≠ neutral
- `review-02d1586d` they thank the waiter as well: positive ≠ neutral
- `review-037bbe20` the venue is unique: positive ≠ neutral
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: positive ≠ neutral
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: negative ≠ neutral
- `review-0ac47c59` waited in line a little over an hour: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-27722511` the kebab is very tasty: positive ≠ mixed
- `review-2b737ce5` the beef noodle soup had today contained lots of MSG: negative ≠ neutral
- `review-2b737ce5` before today the food was okay: positive ≠ neutral
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: negative ≠ neutral
- `review-356e149a` the employee suddenly asked where I'm from when I leaned on…: negative ≠ neutral
- `review-356e149a` friendly and respectful treatment of customers matters just…: negative ≠ positive
- `review-3639cae4` asked for the kebab without cheese but got it with cheese: negative ≠ neutral
- `review-3639cae4` ate at the other branch two years ago and the kebab there w…: positive ≠ neutral
- `review-39166eb1` this is the reviewer's favorite restaurant: positive ≠ negative
- `review-3e075e7e` doubts the gemuse kebab and wrap are really one of the best…: negative ≠ positive
- `review-3e075e7e` ate 2 kebsy there, both average: negative ≠ neutral
- `review-41d8256f` the Pommes were sort of okay: mixed ≠ neutral
- `review-503d63e2` the savoury dish they ate instead was really very tasty: positive ≠ neutral
- `review-5582d6b8` only managed a couple of sips of the iced matcha latte: negative ≠ neutral
- `review-5582d6b8` sit inside: positive ≠ negative
- `review-5604a426` came yesterday expecting to enjoy a tasty broodje gemuse ke…: neutral ≠ negative
- `review-5cd39af6` especially the young man with short white/blond hair was fr…: positive ≠ neutral
- `review-5d173a89` it took around 30 minutes to prepare a single döner: negative ≠ neutral
- `review-6752188e` the market was so good the reviewer went back a 2nd time on…: positive ≠ neutral
- `review-6e8b098b` the plates were ice cold instead of pre-warmed: negative ≠ positive
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected …: negative ≠ neutral
- `review-83cf47fa` the 알밥 was served as a cold dish: negative ≠ neutral
- `review-83cf47fa` the 물회 and the 알밥 had a strange 고수-like taste, maybe 시소: negative ≠ neutral
- `review-88fe4146` after being refused, the server made excuses not to take th…: negative ≠ neutral
- `review-88fe4146` sarcastically: it was just great: negative ≠ positive
- `review-97751870` sarcastically: 'great, it was a complicated order too': negative ≠ neutral
- … 172 more in issues.jsonl

### claims.subject (106)

- `post-020c68fb` if you have never been to Markthalle Neun you cannot say yo…: place ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-047130f4` the black pudding/blutwurst pizza is still an absolute game…: place ≠ none
- `post-0a8f804b` Going elsewhere instead of waiting for Cousins is foolish: place ≠ none
- `post-0bf8447d` Pastaia serves Pizza, Pasta and Caprese, three classics on …: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ none
- `post-1c0d4023` these 20 restaurants are the greatest consensus of Berlin f…: city ≠ none
- `post-1ca1ffee` food like this in such a price category is very rare in Ger…: place ≠ none
- `post-1d0aeaca` Germans queue in long lines around the block for ice cream …: none ≠ city
- `post-217c8e79` Bún chả is the creator's absolute favourite food: none ≠ place
- `post-22c25ac1` many hotspots in Prenzlauer Berg are not customer-friendly …: city ≠ place
- `post-24601e6d` trying some German food in Berlin was super exciting: city ≠ none
- `post-2a8e9606` at Café Benjamine guests stay longer with the quality of th…: place ≠ none
- `post-2a8e9606` at the Café im Haus am Waldsee guests stay longer with the …: place ≠ none
- `post-2a8e9606` the Kartoffelpüree at Nobelhardt & Schmutzig can hardly be …: place ≠ none
- `post-2a8e9606` it was hard to find good coffee in Berlin cultural institut…: city ≠ none
- `post-2b231637` when Berlin sweats there is no way around a good Kugel of i…: city ≠ none
- `post-31344bc5` the biggest Berlin food trend of 2026 is casual fine dining: city ≠ none
- `post-31344bc5` new openings Nouri, Kohle & Salz, Elotl and Fukagawa create…: city ≠ none
- `post-31344bc5` Common is a clear favourite of Berlin food creators, ranked…: place ≠ none
- `post-31344bc5` Ming Dynastie is a favourite of Berlin food creators: place ≠ none
- `post-31344bc5` Pots is a favourite of Berlin food creators: place ≠ none
- `post-31344bc5` vegan is no longer niche in Berlin but a basic requirement: city ≠ none
- `post-3d9147ff` Schüsseldienst does bowls a little differently: place ≠ city
- `post-3d9147ff` Kitchari Kitchen does bowls a little differently: place ≠ city
- `post-3d9147ff` Fatoush does bowls a little differently: place ≠ city
- `post-45dafb41` Standard brought the modern pizza style with sourdough and …: place ≠ none
- `post-45dafb41` Malafemmena brought the modern pizza style with sourdough a…: place ≠ none
- `post-45dafb41` in Berlin even ambitiously started pizza projects now see t…: city ≠ none
- `post-4a742b09` the owners plate dishes they are proud of at Village House: place ≠ none
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ city
- `post-4c3e2a10` the snack stand is called the cell, built like a jail: place ≠ none
- `post-4c3e2a10` the kebab is kept at a temperature so it stays nice and jui…: place ≠ none
- … 66 more in issues.jsonl

### claims.place (96)

- `post-106450e8` Amato has fun drinks: Amato ≠ Amato Berlin
- `post-106450e8` the Coconut Pandan Cloud is so good: Amato ≠ Amato Berlin
- `post-22c25ac1` Yumcha Heroes' Dumplings are fantastic: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-2e688d3d` the creator had a quiet moment at Naa Cafe: Naa Cafe ≠ Naa Cafe Berlin
- `post-2e688d3d` the creator took a little break at Naa Cafe in Berlin: Naa Cafe ≠ Naa Cafe Berlin
- `post-388b4383` Curry Wolf's double-fried Pommes are crispy and golden: Curry Wolf ≠ Zur Bratpfanne
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- `post-3a0ad71a` CeeCee's entry on Coffee Circle is positive to enthusiastic: Coffee Circle ≠ Magma
- `post-3a0ad71a` CeeCee's entry on Magma is positive to enthusiastic: Magma ≠ Coffee Circle
- `post-3a0ad71a` Bertie is one of the Berlin restaurants selected by Max Lem…: Bertie ≠ Common
- `post-3a0ad71a` Goldies Smashburger is one of the Berlin restaurants select…: Goldies Smashburger ≠ Common
- `post-3a0ad71a` Ora is one of the Berlin restaurants selected by Max Lemke: Ora ≠ Common
- `post-3a0ad71a` Estelle is one of the Berlin restaurants selected by Max Le…: Estelle ≠ Common
- `post-3d9147ff` Schüsseldienst is definitely worth trying: Schüsseldienst ≠ Schuesseldienst Berlin
- `post-3d9147ff` Kitchari Kitchen is definitely worth trying: Kitchari Kitchen ≠ Kitcharikitchen Berlin
- `post-3d9147ff` Fatoush is definitely worth trying: Fatoush ≠ Fatoush Berlin
- `post-40f86f07` the coffee at Amo Café was great: Amo Café ≠ Amo Café Berlin
- `post-40f86f07` enjoyed cookies at Amo Café: Amo Café ≠ Amo Café Berlin
- `post-40f86f07` Amo Café is a beautiful little neighborhood coffee shop: Amo Café ≠ Amo Café Berlin
- `post-51a97d36` GIG Gastro is awesome: GIG Gastro ≠ GIG
- `post-51a97d36` after the meal you always get a Tiramisu: GIG Gastro ≠ GIG
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Primitiv
- `post-524765b0` Tenia was bar chief at Primitiv and Jannis grill master at …: Kírkē Deli ≠ Torbar
- `post-66f606db` Café Dufte is open from the morning: Café Dufte ≠ Dufte
- `post-66f606db` Café Dufte serves the finest Sauerteigbrot from Domberger B…: Domberger Brot-Werk ≠ Dufte
- `post-6b4377f6` Jan Wichert, former head chef at Remi, cooks at Hier: Hier ≠ Remi
- `post-7e6e2acc` the Markthalle had the most incredible kesserschmettla: Markthalle food hall ≠ Magdalena
- `post-8901fb9b` Tobias Beck founded the Ember concept: Ember ≠ Ember Berlin
- `post-909ca5ee` The Sauerteigbrot comes from the nearby Johann Bäckerei: Johann Bäckerei ≠ Barlevain
- `post-93526d04` they also visited Nastys: Nastys ≠ Nastys Chicken
- `post-a7757925` HOMì is a new spot in Berlin: HOMì ≠ HOM
- `post-a7757925` HOMì is a Vietnamese café in the middle of Berlin: HOMì ≠ HOM
- `post-a7757925` the café is visually very coolly designed: HOMì ≠ HOM
- `post-a7757925` the café has grey walls and chrome-coloured accessories: HOMì ≠ HOM
- `post-a7757925` HOMì is a cool spot for cold days where you like to stay lo…: HOMì ≠ HOM
- `post-a7757925` the lunch menu gives a bermi and a drink for 12 euros: HOMì ≠ HOM
- `post-a7757925` the Brot is both crispy and soft: HOMì ≠ HOM
- `post-a7757925` the vegan bermi tastes different from the one with Hähnchen…: HOMì ≠ HOM
- `post-a7757925` the vegan bermi has fresh Kräuter: HOMì ≠ HOM
- `post-a7757925` the other bermi had a bit more sweetness from the Soße: HOMì ≠ HOM
- … 56 more in issues.jsonl

### claims.extra (85)

- `review-0ac47c59` sales slow down as the line shortens
- `review-0ac47c59` had thought the long line was due to the döner being prepared
- `review-1016bd13` the first vehicle carried 40 people
- `review-1016bd13` the soup started being served at 19:05
- `review-164fbfea` the review ends with a train emoji
- `review-2799bbfa` the reviewer considers the points made sufficient
- `review-356e149a` the reviewer answered no
- `review-356e149a` the reviewer said they are Arab
- `review-37daa9e9` gave 5 stars
- `review-3f2a2713` it is 2026
- `review-503d63e2` were seated at the table
- `review-5604a426` came home from a cold kermis
- `review-88fe4146` the reviewer and a friend were about to sit down together
- `review-88fe4146` the reviewer ended with two 🫶 emojis
- `review-937ea9e9` the desserts are delicious
- `review-beb397cd` the reviewer did not intend to trash the restaurant
- `review-beb397cd` the restaurant does not make its products to the reviewer's taste
- `review-faa8e03c` a photo shows the feathers clearly
- `post-047130f4` pizza associated with mayonnaise
- `post-047130f4` pizza fits breakfast, lunch and dinner
- `post-047130f4` the French restaurant they worked at had an old pizza oven from a former Italian
- `post-0a8f804b` ice cream lifts the mood more than anything
- `post-0a8f804b` Cousins was opened to celebrate the diversity of the founders' friends
- `post-0a8f804b` each flavour honours the people and communities behind it
- `post-0dde5eb7` the meat, cheese and sauce make people happy
- `post-2161780e` the place offers a Healthy Matcha
- `post-217c8e79` the meatball is dipped into the fish sauce
- `post-22c25ac1` Prenzlauer Berg has many food hotspots
- `post-233389f4` they ordered anyway
- `post-2a8e9606` Café Bravo is open from early morning to early evening
- `post-2b231637` the list is compiled from Berlin food editors' recommendations
- `post-2b231637` all addresses are also on the article's map
- `post-2b231637` opening hours should be checked in advance
- `post-31344bc5` no starched tablecloths and no stiff service
- `post-31344bc5` the article tracks 180 restaurants with creator recommendations
- `post-388b4383` the Berlin currywurst scene is crowded
- `post-45dafb41` Standard is a Neapolitan pizzeria
- `post-45dafb41` Malafemmena is a Neapolitan pizzeria
- `post-52eb53af` everything was bought by the creator themselves
- `post-52eb53af` Berlin is known as the second most beautiful city in Berlin
- … 45 more in issues.jsonl

### match_isolated.brand (30)

- `post-106450e8` Amato: amatō ≠ none (none)
- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Michelberger Hotel: Michelberger Café & Bar ≠ none (none)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Marina macht Eis: Marina macht Eis ≠ none (none)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-34212ac5` The Dawn Kudamm: The Dawn ≠ none (none)
- `post-3a0ad71a` Coffee Circle: Coffee Circle ≠ none (none)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-45dafb41` Standard: Standard Serious Pizza ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ none (none)
- `post-5db3b46a` Burger Am: none ≠ BURGER JAM (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-6577d6bd` Eiscafeteufelchen: Eisteufelchen ≠ none (none)
- `post-66f606db` Domberger Brot-Werk: Domberger Brot-Werk – Kantgarage ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-7e6e2acc` Markthalle food hall: Markthalle Neun ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Gotcha: Gotxa ≠ Gotcha (exact)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-8c6bd842` Nahs City Chicken: Nhas City Chicken ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)

### match.brand (28)

- `post-1e024518` Masalas: none ≠ Masala (llm)
- `post-2a8e9606` Goldies Bar: none ≠ goldies (exact)
- `post-2b231637` Duo Sicilian Ice Cream: Duo Sicilian Ice Cream ≠ none (none)
- `post-2b231637` Marina macht Eis: Marina macht Eis ≠ none (none)
- `post-2b231637` Hokey Pokey: Eispatisserie Hokey Pokey ≠ Hokey Pokey (exact)
- `post-34212ac5` The Dawn Kudamm: The Dawn ≠ none (none)
- `post-3a0ad71a` Rogacki (Markthalle Neun): none ≠ Markthalle Neun (llm)
- `post-3a0ad71a` Figl: Gasthaus Figl ≠ none (none)
- `post-3a0ad71a` Wiener Brot Holzofenbäckerei: Wiener Brot Wood Oven Bakery ≠ none (none)
- `post-40f86f07` Jan Burgerrestaurant: Jan ≠ none (none)
- `post-45dafb41` Standard: Standard Serious Pizza ≠ none (none)
- `post-4c59c1c1` Little Little Restaurant: Little Little Chinese Dumpling ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ none (none)
- `post-5db3b46a` Manello: none ≠ Pizzeria Monello (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-6577d6bd` Eiscafeteufelchen: Eisteufelchen ≠ none (none)
- `post-66f606db` Abuya: Abuya Hummus Culture @Dufte ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ none (none)
- `post-7e6e2acc` Markthalle food hall: Markthalle Neun ≠ none (none)
- `post-8901fb9b` Common: none ≠ Common Café & Restaurant (exact)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Ming Dynasty: Ming Dynastie ≠ none (none)
- `post-8901fb9b` Mustafa's: Mustafa's Gemüse Kebap ≠ none (none)
- `post-8c6bd842` Nahs City Chicken: Nhas City Chicken ≠ none (none)
- `post-ae8f76f1` Velvet Coffee: none ≠ Velvet (exact)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e62d3c39` The Barn: THE BARN Café ≠ none (none)

### places.missed (27)

- `post-106450e8` Amato
- `post-2a8e9606` Starbucks
- `post-2a8e9606` Michelberger Hotel
- `post-2e688d3d` Naa Cafe
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` FúFú Bistro
- `post-3d9147ff` Schüsseldienst
- `post-3d9147ff` Kitchari Kitchen
- `post-3d9147ff` Fatoush
- `post-40f86f07` Amo Café
- `post-4c3e2a10` The Cell
- `post-51a97d36` GIG Gastro
- `post-66f606db` Café Dufte
- `post-66f606db` Domberger Brot-Werk
- `post-8901fb9b` Ember
- `post-8901fb9b` Papaya
- `post-8901fb9b` Gotcha
- `post-8901fb9b` Special Sauce
- `post-93526d04` Manches
- `post-93526d04` Nastys
- `post-a3178d9e` The Bun Society
- `post-a7757925` HOMì
- `post-baac3611` 44 CHKN - Korean Fried Chicken
- `post-bca0fe02` Stoke
- `post-e2a421e9` Butter Lindner
- `post-f17dfe96` Jemenitisches Restaurant
- `post-f5a0f49f` Candela

### places.extra (25)

- `post-106450e8` Amato Berlin
- `post-2e688d3d` Naa Cafe Berlin
- `post-3d9147ff` Schuesseldienst Berlin
- `post-3d9147ff` Kitcharikitchen Berlin
- `post-3d9147ff` Fatoush Berlin
- `post-40f86f07` Amo Café Berlin
- `post-51a97d36` GIG
- `post-524765b0` Primitiv
- `post-524765b0` Torbar
- `post-66f606db` Markthalle Neun
- `post-66f606db` Kalle Halle
- `post-66f606db` Kerb
- `post-66f606db` Manifesto
- `post-6b4377f6` Remi
- `post-6b4377f6` Lode & Stijn
- `post-7e6e2acc` Magdalena
- `post-8901fb9b` Ember Berlin
- `post-93526d04` Nastys Chicken
- `post-a7757925` HOM
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-aa137bfa` Beef Grill Club by Hasir
- `post-baac3611` 44 CHKN
- `post-bca0fe02` Stoke Berlin
- `post-d1ab7367` Natural Selection
- `post-e2a421e9` Lindner

### parts.amount (20)

- `review-02556664` after 30 minutes the reviewer had moved only 3 metres in th…: 30 minutes ≠ —
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-5582d6b8` the iced matcha latte cost a whopping €8: 8 money ≠ —
- `review-5d173a89` the döner is not worth €7.90: —  ≠ 7.9 money
- `review-6217ec70` came on a Thursday evening: —  ≠ 60 minutes
- `review-69365171` had the Büffet from 12-15 Uhr for 16,50€: 16.5 money ≠ —
- `review-b9d9100a` waited almost 90 minutes in a not very long line of about 2…: 90 minutes ≠ —
- `review-b9d9100a` waited almost 90 minutes in a not very long line of about 2…: 90 minutes ≠ —
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: 1 money ≠ —
- `post-1ca1ffee` the Achoschare mother grill costs 30 euros: 30 money ≠ —
- `post-24601e6d` you get 45 minutes in the ice area: 45 minutes ≠ —
- `post-45dafb41` the pizza with Burrata, Mortadella, roasted pine nuts and l…: 17 money ≠ —
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-67af1ad6` Waffle with fruits for 1€ this week Friday and Saturday fro…: 1 money ≠ —
- `post-78e0e15a` €5.60 for a mound of fries: 5.6 money ≠ 60 money
- `post-816a40e7` Döner and Schawarma for 1€ on 2.10.2026: 1 money ≠ —
- `post-babe1142` Peggy Bee is part of Berlin Ice Cream Week 2021: —  ≠ 1 money
- `post-cb785d0b` for the 3 euro Döner you can choose Hähnchen, Falafel or Ha…: 3 money ≠ —

### terms.none (18)

- `term-1091` Martinsgans: none ≠ german
- `term-15238` wafers: none ≠ dessert
- `term-15637` tamago egg: none ≠ japanese
- `term-17247` sambal dummer: none ≠ kebab
- `term-2306` cút lộn xào me: none ≠ vietnamese
- `term-2543` foul with olive oil: none ≠ egyptian
- `term-4138` tataki with choy choi: none ≠ japanese
- `term-4934` dish with layers of tender dough, juicy minced meat and creamy garlic yogurt: none ≠ turkish
- `term-510` Buletten: none ≠ german
- `term-5723` vegan Thanksgiving plate: none ≠ vegan
- `term-7411` Zucchiniblüten mit Ricotta und Provola: none ≠ italian
- `term-7594` stalls: none ≠ market
- `term-7696` music: none ≠ atmosphere
- `term-785` lollipops: none ≠ dessert
- `term-79` sweets: none ≠ dessert
- `term-7989` dancing: none ≠ nightclub
- `term-7993` deposit: none ≠ extra_charges
- `term-8527` snails: none ≠ pastry

### terms.topics (16)

- `term-10329` meat alternative: [vegetarian:with] ≠ [none]
- `term-1146` meat substitute: [vegetarian:with] ≠ [none]
- `term-16455` kıymalı pide: [turkish:kind_of] ≠ [none]
- `term-16968` Moksal: [korean barbecue:kind_of] ≠ [none]
- `term-20759` malaycofter: [curry:kind_of] ≠ [none]
- `term-21181` honeydew melon ice cream: [ice cream:kind_of] ≠ [ice cream:kind_of, dessert:kind_of]
- `term-22168` unique food experiences: [food:kind_of] ≠ [none]
- `term-2567` Diätbratwurst: [sausages:kind_of] ≠ [sausages:kind_of, german:kind_of]
- `term-3167` Indian favourites: [indian:same] ≠ [none]
- `term-35404` butter squishies: [dessert:kind_of] ≠ [none]
- `term-373` cheesecake with berry sauce: [cake:kind_of] ≠ [cake:kind_of, dessert:kind_of]
- `term-4377` Vietnamese-Asian specialties: [vietnamese:same, asian:same] ≠ [vietnamese:kind_of]
- `term-449` chicken fries: [fried chicken:kind_of] ≠ [chicken:kind_of]
- `term-541` ayran: [turkish:kind_of] ≠ [none]
- `term-602` broth: [soups:kind_of] ≠ [none]
- `term-920` Taramas: [greek:kind_of, seafood:with] ≠ [greek:with]

### change.false (11)

- `review-1798cc23` the Google listing no longer matches the restaurant
- `review-f84d2292` the experience was more welcoming
- `post-31344bc5` Korean cuisine has 9 entries on the map and is growing quietly but steadily
- `post-3a0ad71a` new concept replacing Heritage
- `post-5db3b46a` Pizza Hut no longer sells stuffed crust pizza
- `post-d057d8ef` more and more people come in
- `post-d220e97c` the steakhouse burger was on offer
- `post-e62d3c39` Bravo is now a day café
- `post-e62d3c39` Bravo was formerly Café Bravo
- `post-fc96acff` Wenzel Pankratz now runs Forsthaus Strelitz
- `post-fe3794c9` SpreeWiesn moved to the upper floor of Hofbräu München – Wirtshaus Berlin this year

### match_isolated.branch (10)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ brand only
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Gut Kerkow Biometzgerei: Gut Kerkow Bio-Metzgerei ≠ brand only
- `post-483d6cc6` Love at First Bite: brand only ≠ Love at first bite - Breakfast & Brunch (In Circus Hotel)
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Café Dufte: Café Dufte ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-baac3611` 44 CHKN - Korean Fried Chicken: 44 CHKN - Korean Fried Chicken ≠ brand only

### change.missed (9)

- `review-2b737ce5` before today the food was okay
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b8d2bcf3` the pavilion was refurnished with architects Studio Affin without changing its openness
- `post-cb785d0b` the renovation is finished, celebrated with the 1-cent promotion
- `post-cb785d0b` after the renovation there is much more space
- `post-cb785d0b` the Döner was improved day by day since the start, from vegetables to bread
- `post-cb785d0b` much has changed at Sagos's prep kitchen
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)

### match.branch (8)

- `post-088e18e6` Fatih Servet: brand only ≠ Fatih Servet
- `post-0d484513` Dufte: Dufte ≠ brand only
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-3a0ad71a` Goldies Smashburger: brand only ≠ goldies smashburger
- `post-3a0ad71a` Coffee Circle: Coffee Circle Wedding ≠ brand only
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-66f606db` Mani in Pasta: Mani in Pasta - Kanstrasse ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
