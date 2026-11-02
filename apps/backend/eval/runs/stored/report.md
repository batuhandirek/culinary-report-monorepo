# Ingestion eval: stored

2026-11-01 12:14 UTC · 149 reviews, 150 posts, 32 wordings · 468 cases left out (no reference or no output)

## Reviews

| Metric | stored | baseline |
|---|---|---|
| Claims found (of the reference) | 93% (788/843) | 98% -4 |
| Claims that are real (of produced) | 99% (1032/1041) | 87% +12 |
| Sentiment | 88% (929/1061) | 97% -9 |
| Aspect, exact | 71% (750/1061) | 93% -23 |
| Aspect, right root | 81% (856/1061) | 96% -15 |
| Kind | 67% (28/42) | 97% -30 |
| Kind given at all | 4% (42/1061) | — |
| Changes that are changes | 56% (14/25) | 82% -26 |
| Changes found | 80% (12/15) | 93% -13 |
| Amount | 41% (26/63) | 84% -43 |
| Foods named, precision | 32% (124/382) | 75% -42 |
| Foods named, recall | 23% (124/541) | 66% -44 |

## Posts and articles

| Metric | stored | baseline |
|---|---|---|
| Claims found (of the reference) | 56% (895/1611) | — |
| Claims that are real (of produced) | 95% (1077/1137) | — |
| Sentiment | 86% (1030/1204) | — |
| Aspect, exact | 63% (761/1204) | — |
| Aspect, right root | 78% (935/1204) | — |
| Kind | 47% (22/47) | — |
| Kind given at all | 4% (47/1204) | — |
| Changes that are changes | 46% (19/41) | — |
| Changes found | 38% (9/24) | — |
| Amount | 46% (38/82) | — |
| Foods named, precision | 46% (315/681) | — |
| Foods named, recall | 39% (315/808) | — |
| Subject (place, city, none) | 85% (1023/1204) | — |
| Claim on the right place | 85% (827/978) | — |
| Places found | 73% (256/351) | — |
| Places that are places | 85% (256/301) | — |
| Match: brand (found places) | 92% (235/256) | — |
| Match: branch (right brand) | 97% (207/213) | — |
| Promotional flag | 82% (123/150) | — |

## Wordings

| Metric | stored | baseline |
|---|---|---|
| Wording: topics exactly right | 100% (32/32) | 95% +5 |
| Wording: topics right (of produced) | 100% (32/32) | 99% +1 |
| Wording: topics found | 100% (32/32) | 97% +3 |
| Wording: first topic | 100% (32/32) | 97% +3 |
| Wording: relation | 100% (32/32) | 95% +5 |
| Wording: linked when it should be | 100% (32/32) | 97% +3 |

_Other runs show their share and the points this run is above (+) or below (−) it._

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 93% (313/338) | 100% (415/416) | 71% (306/431) | 90% (387/431) | — | — |
| hard | 83% (34/41) | 97% (67/69) | 62% (43/69) | 93% (64/69) | 100% (4/4) | 100% (4/4) |
| lang:de | 93% (287/309) | 99% (368/371) | 73% (277/379) | 88% (332/379) | — | — |
| lang:en | 94% (195/207) | 100% (244/245) | 79% (197/249) | 93% (232/249) | — | — |
| lang:other | 94% (251/267) | 99% (346/351) | 62% (223/357) | 86% (306/357) | — | — |
| lang:tr | 92% (55/60) | 100% (74/74) | 70% (53/76) | 78% (59/76) | — | — |
| length:long | 92% (228/248) | 98% (333/339) | 63% (215/340) | 82% (279/340) | — | — |
| length:medium | 94% (508/543) | 100% (641/644) | 74% (489/662) | 89% (592/662) | — | — |
| length:short | 100% (52/52) | 100% (58/58) | 78% (46/59) | 98% (58/59) | — | — |
| no-transcript | 73% (269/367) | 95% (324/341) | 64% (228/359) | 86% (310/359) | 85% (75/88) | 88% (66/75) |
| own | 82% (36/44) | 95% (71/75) | 57% (45/79) | 90% (71/79) | 80% (12/15) | 100% (12/12) |
| places:few | 55% (605/1095) | 95% (714/752) | 65% (530/813) | 88% (719/813) | 66% (93/141) | 91% (85/93) |
| places:many | 56% (284/510) | 94% (355/376) | 59% (225/383) | 79% (303/383) | 78% (163/210) | 92% (150/163) |
| places:none | 100% (6/6) | 89% (8/9) | 75% (6/8) | 100% (8/8) | — | — |
| platform:blog | 37% (296/810) | 97% (319/328) | 60% (227/377) | 77% (291/377) | 61% (110/181) | 96% (106/110) |
| platform:google | 93% (788/843) | 99% (1032/1041) | 71% (750/1061) | 88% (929/1061) | — | — |
| platform:instagram | 69% (172/251) | 96% (199/208) | 65% (148/228) | 85% (194/228) | 81% (44/54) | 82% (36/44) |
| platform:tiktok | 78% (427/550) | 93% (559/601) | 64% (386/599) | 91% (545/599) | 88% (102/116) | 91% (93/102) |
| stars:1 | 94% (133/142) | 99% (187/189) | 71% (136/191) | 87% (167/191) | — | — |
| stars:2 | 92% (145/158) | 98% (198/203) | 63% (130/205) | 84% (173/205) | — | — |
| stars:3 | 96% (173/181) | 100% (213/213) | 69% (154/223) | 84% (187/223) | — | — |
| stars:4 | 94% (163/174) | 100% (217/217) | 77% (169/219) | 90% (197/219) | — | — |
| stars:5 | 93% (174/188) | 99% (217/219) | 72% (161/223) | 92% (205/223) | — | — |
| transcript | 76% (330/434) | 93% (434/468) | 65% (306/468) | 92% (429/468) | 87% (71/82) | 89% (63/71) |

## Misses

### claims.missed (771)

- `review-019a8099` a very nice restaurant
- `review-019a8099` can really recommend the restaurant
- `review-02d1586d` glad they came to Rüyam Gemüse Kebab
- `review-070860ca` the reviewer is not happy
- `review-07871fa7` all in all pretty okay
- `review-0ac47c59` a complete disappointment
- `review-0ac47c59` found nothing to praise about the place
- `review-0ac47c59` definitely does not recommend it
- `review-1798cc23` the Google listing is no longer accurate
- `review-1798cc23` the service did not match the price
- `review-196641fc` food pickup is an anonymous moving along
- `review-2d6d3829` still highly recommended
- `review-3639cae4` doesn't understand the enthusiasm for this kebab
- `review-39166eb1` check your food if you still go there
- `review-41d8256f` the reviewer does not understand the hype
- `review-4a46a87d` will never order from them again
- `review-4cd140a3` there was no feeling of comfort
- `review-5582d6b8` the shoyu and asari were both incredibly delicious
- `review-5582d6b8` don't eat outside
- `review-5604a426` they were sorely disappointed by the broodje gemuse kebab
- `review-5cd39af6` recommends the place to everyone
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab
- `review-6752188e` the reviewer can't wait to go back
- `review-6752188e` the reviewer rates the market 10000/10
- `review-6e8b098b` the reviewer can highly recommend it
- `review-7483275e` the long wait was due to the service, not the queue itself
- `review-7483275e` first-time kebap eaters can find a much better kebap elsewhere
- `review-7a1ba6d7` the kebabs were a little salty for them, but they expected it
- `review-7a1ba6d7` the reviewer recommends the place
- `review-7d7ef8ca` you need to allow some time, even on weekdays
- `review-83cf47fa` possibly localized, the food did not suit our Korean palates
- `review-83cf47fa` the 물회 was more like a salad than 물회
- `review-937ea9e9` Sandos is simply outstanding
- `review-937ea9e9` you immediately feel at ease
- `review-b31c1e48` overall it was a lovely experience
- `review-b9d9100a` the taste is fantastic
- `review-beb397cd` the food is not bad but really not the reviewer's taste
- `review-beb397cd` the burger was very well-done
- … 731 more in issues.jsonl

### parts.aspect (754)

- `review-02556664` the reviewer did not get to eat: queue ≠ food
- `review-02556664` the staff were just messing around with the queue: service ≠ crowding
- `review-02556664` go to the competition instead: none ≠ other
- `review-02556664` at the competition you eat exactly the same thing with limo…: food ≠ other
- `review-02d1586d` everything was very good: none ≠ food
- `review-02d1586d` the waiter was friendly: friendliness ≠ attentiveness
- `review-037bbe20` the venue is unique: vibe ≠ location
- `review-0541b749` the frites were frozen: ingredient_quality ≠ seasoning
- `review-0541b749` the meat in the sandwich was chicken only: menu_variety ≠ taste
- `review-0541b749` the pain was quickly made, nothing special: food ≠ speed_of_service
- `review-0541b749` the légumes were hard to digest: food ≠ other
- `review-070860ca` ordered on a Sunday night for delivery through Wolt: delivery_platform ≠ wait
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: food ≠ other
- `review-07871fa7` the loud music fits the vibe they want to create: atmosphere ≠ vibe
- `review-07871fa7` the loud music fits the vibe they want to create: atmosphere ≠ other
- `review-07871fa7` next time the reviewer will go somewhere else for the döner: none ≠ taste
- `review-0789c2e6` for visitors to Berlin the place is definitely worth a visit: none ≠ value_for_money
- `review-08c67545` the portion was quite small for almost 30€: value_for_money ≠ price
- `review-08c67545` it was nice: none ≠ vibe
- `review-0ac47c59` waited in line a little over an hour: queue ≠ wait
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ order_accuracy
- `review-0ac47c59` the kebab shop's name is Turkish: none ≠ authenticity
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: authenticity ≠ ingredient_quality
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ food
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: freshness ≠ food
- `review-0c8b6a9b` always happy to come back to Sphere Tim Raue: none ≠ vibe
- `review-0c8b6a9b` the visit was a great experience: none ≠ vibe
- `review-0f14e04b` definitely a must-try: none ≠ other
- `review-1016bd13` large groups should avoid this place: none ≠ other
- `review-1016bd13` the group was 120 people: none ≠ other
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ other
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ food
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ food
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: none ≠ food
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ drinks
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: none ≠ other
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: none ≠ wait
- … 714 more in issues.jsonl

### parts.foods (734)

- `review-0217fd90` the soup was really incredibly good: [Suppe] ≠ [soup]
- `review-0217fd90` the soup was full of flavour: [Suppe] ≠ [soup]
- `review-02556664` at the competition you eat exactly the same thing with limo…: [limonką] ≠ []
- `review-02d1586d` especially the döner was very good: [döneri] ≠ [doner kebab]
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: [carni] ≠ []
- `review-037bbe20` the beer is a strong point: [birra] ≠ [beer]
- `review-0541b749` the frites were frozen: [frites] ≠ [fries]
- `review-0541b749` the frites were too salty: [frites] ≠ [fries]
- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [chicken]
- `review-0541b749` the poulet in the sandwich was flavourless: [poulet, sandwich] ≠ [chicken]
- `review-0541b749` the pain was crispy: [pain] ≠ [bread]
- `review-0541b749` the pain was quickly made, nothing special: [pain] ≠ [bread]
- `review-0541b749` the fresh légumes were good: [légumes] ≠ [vegetables]
- `review-0541b749` the légumes were hard to digest: [légumes] ≠ [vegetables]
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ []
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: [aardappel] ≠ []
- `review-08c67545` none of the starters or desserts appealed to the reviewer: [] ≠ [appetizers]
- `review-08c67545` none of the starters or desserts appealed to the reviewer: [] ≠ [desserts]
- `review-0ac47c59` after ordering, waited as long again with an order number t…: [döner] ≠ [kebab]
- `review-0ac47c59` the kebab shop's name is Turkish: [] ≠ [kebab]
- `review-0ac47c59` the döner tasted nothing like Turkish döner: [döner] ≠ [kebab]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [kebab, chicken, curry sauce]
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: [köri sosu, tavuk eti] ≠ [kebab]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salad, lettuce]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salad, lettuce]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salad, tomatoes]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [salad, onion]
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: [çay] ≠ [tea]
- `review-0f14e04b` great food: [] ≠ [food]
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ []
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: [汤] ≠ [soup]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [Cola]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [orange juice]
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: [啤酒, 可乐, 橙汁] ≠ [beer]
- `review-1016bd13` the soup was served quickly on arrival: [汤] ≠ [soup]
- `review-1016bd13` none of the tables had a bottle opener: [] ≠ [bottle openers]
- `review-1016bd13` had to find waiters to open the bottles, chaotic with over …: [] ≠ [bottles]
- … 694 more in issues.jsonl

### parts.sentiment (306)

- `review-019a8099` sitting outside can be annoying because the restaurant is a…: negative ≠ neutral
- `review-0217fd90` we will gladly come back: positive ≠ neutral
- `review-02556664` go to the competition instead: negative ≠ neutral
- `review-037bbe20` the menu based on meat or similar satisfies almost all pala…: positive ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ positive
- `review-07871fa7` they add some kind of potato to the dürüm as standard, whic…: negative ≠ neutral
- `review-08c67545` the portion was quite small for almost 30€: negative ≠ neutral
- `review-0ac47c59` waited in line a little over an hour: negative ≠ neutral
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: negative ≠ neutral
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: negative ≠ neutral
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: negative ≠ neutral
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ neutral
- `review-1016bd13` large groups should avoid this place: negative ≠ neutral
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ positive
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: negative ≠ neutral
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: negative ≠ neutral
- `review-1016bd13` repeatedly urged the manager and runners but was only told …: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asked the manager to serve each dish as ready but got no ef…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ positive
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: negative ≠ neutral
- `review-1016bd13` waiters kept pushing drinks on guests while they waited, wh…: negative ≠ neutral
- `review-13f72d12` has had better kebsa elsewhere in Berlin: negative ≠ neutral
- `review-16bdd5e0` the halloumi was described as "grilled cheese", which was m…: negative ≠ neutral
- `review-1798cc23` one of the three Bier bottles looked different: negative ≠ neutral
- `review-196641fc` the total wait of 50 minutes was too long: negative ≠ neutral
- `review-196641fc` few eat on site today because of the crowding and queue: negative ≠ neutral
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ neutral
- `review-27722511` the kebab is an ordinary kebab with phenomenal status: mixed ≠ positive
- `review-279b23c3` Justin is the most important and gets a 13/10: positive ≠ neutral
- `review-2c7253a2` overall the burger joint was decent: mixed ≠ positive
- `review-2c7253a2` the burger joint was less amazing than expected: negative ≠ neutral
- `review-2c7253a2` arrived around 5 PM: neutral ≠ positive
- `review-2d6d3829` hoped the vegetarian options included a meat substitute bes…: negative ≠ positive
- `review-3486a0a9` try the Bangkok Burger for something rich and spicy: positive ≠ neutral
- `review-3486a0a9` hopes they will add a vegetarian option for their chicken b…: neutral ≠ positive
- … 266 more in issues.jsonl

### claims.subject (181)

- `post-01f172dd` the KATSU-SANDO has panko-crusted soy steak, pickled red on…: none ≠ place
- `post-01f172dd` the shokupan is soft like a pillow: none ≠ place
- `post-01f172dd` all bread is made in-house: none ≠ place
- `post-0216fd1d` the Neukölln food guide ranges from Tacos and Pasta to vega…: city ≠ none
- `post-0216fd1d` the Neukölln spots include tasty veggie options: city ≠ none
- `post-0216fd1d` Ringbar is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Asia Farmhouse is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` La Bolognina is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Plus Acht Zwo (+82) is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Sfera is one of 6 cool food spots in Neukölln: place ≠ none
- `post-0216fd1d` Café Pilz is one of 6 cool food spots in Neukölln: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The 1 euro Steak Döner is a limited offer for one week only…: place ≠ none
- `post-088e18e6` The flash deal is redeemed in the NeoTaste app and shown wh…: place ≠ none
- `post-088e18e6` Only a limited number of deals are available per day and lo…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0bf8447d` Pastaia's tip for Thursday evening: come as three, order ev…: place ≠ none
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-0d484513` the four concepts share a return to traditional methods and…: city ≠ place
- `post-165a9370` the Indian restaurant has colorful lights: none ≠ place
- `post-165a9370` the Indian restaurant is a cozy and aesthetic place to hang…: none ≠ place
- `post-165a9370` the Indian restaurant is the perfect place for a date night…: none ≠ place
- `post-165a9370` the Indian restaurant has an impressive ambience: none ≠ place
- `post-165a9370` the Indian restaurant is in the heart of Berlin: none ≠ place
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1a2cebf2` The Diwali event with MoMo Station is at Jules B-Part Am Gl…: place ≠ none
- `post-1d0aeaca` Ube is a Philippine sweet potato: none ≠ place
- `post-1d0aeaca` Miriam considers a Club Mate flavor as the Berlin flavor: place ≠ none
- `post-1d0aeaca` a sauerkraut with lemon flavor actually doesn't sound too b…: place ≠ none
- `post-1d0aeaca` Miriam scrunched her nose at a cold doner flavor: place ≠ none
- `post-1d0aeaca` Miriam says the proper Berlin flavor is anything with beer: place ≠ none
- `post-1e024518` the Masala Dosa is filled with spicy potato: place ≠ none
- `post-1e024518` the Masala Dosa comes with Sambar and Chutneys: place ≠ none
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: place ≠ city
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the Bún chả comes with gegrillten Schweinebauch, schweinebu…: place ≠ none
- `post-217c8e79` the meat is grilled over charcoal: place ≠ none
- `post-217c8e79` the gegrillter Schweinebauch is delicious with grill aromas: place ≠ none
- … 141 more in issues.jsonl

### claims.place (151)

- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: Fatih Servet ≠ Fatih Servet
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: Fatih Servet ≠ Fatih Servet
- `post-088e18e6` Fatih Servet has locations at Warschauer Str., Mall of Berl…: Fatih Servet ≠ Fatih Servet
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: Fatih Servet ≠ Fatih Servet
- `post-0dde5eb7` the dish has a good piece of Fleisch: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish comes with tenderly melted Käse: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish comes with a dark, aromatic Soße: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` at Bocca Felice the food can be something special: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish is beautifully plated with attention to detail: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish is beautifully plated with attention to detail: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish has lots of flavour: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-0dde5eb7` the dish is for everyone who appreciates good Fleisch and l…: Ristorante Bocca Felice Berlin-Mitte ≠ Ristorante Bocca Felice
- `post-106450e8` Amato has fun drinks: Amato ≠ Amato Berlin
- `post-106450e8` the Coconut Pandan Cloud is so good: Amato ≠ Amato Berlin
- `post-1b8b0789` Doree 65 is Berlin's hyped steak spot: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` Doree 65 is currently very hyped: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the creators ate at Doree 65 today: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the creators were warmly received at Doree 65: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the owner of Doree 65 is a bit crazy: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the owner is the same in person as on the internet, no filt…: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` they had 2 Grillplatte: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` each Grillplatte was meant for 2 people: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the Grillplatte looked very juicy: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the Grillplatte tasted very juicy: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the steak meat came with Bratkartoffeln and Gemüse: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the Bratkartoffeln and Gemüse were super well seasoned: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` the creator and two colleagues found the Fleisch very tasty: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` one colleague found he had to chew the Fleisch too much: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1b8b0789` they all agreed they would definitely come back and eat it …: Doree 65 ≠ DOREE 65 Argentinian Restaurant
- `post-1e024518` the Masala Dosa is freshly made in Berlin-Köpenick: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is paper-thin and golden brown: Masalas ≠ Masala Dosa
- `post-1e024518` the Masala Dosa is filled with spicy potato: Masalas ≠ Masala Dosa
- `post-22c25ac1` the Dumplings are made by hand from old recipes by Chen Jun…: Yumcha Heroes ≠ Yumcha Heroes Manufaktur
- `post-28ea0f18` Werners Kräutergarten is at Markthalle Neun: Werners Kräutergarten ≠ Markthalle Neun
- `post-2e688d3d` the creator had a quiet moment at Naa Cafe: Naa Cafe ≠ naa.cafe.berlin
- `post-2e688d3d` the creator took a little break at Naa Cafe in Berlin: Naa Cafe ≠ naa.cafe.berlin
- `post-2f9fab74` Lezziz is located at Residenzstr. 43/44 in Berlin Reinicken…: Lezziz Nuts&Sweets ≠ Lezziz
- `post-31344bc5` Cookies Cream has a relaxed ease that makes the evening an …: Cookies Cream ≠ Stoke
- `post-388b4383` the family business Schmidt's Imbiss has stood for the best…: Schmidt’s Imbiss ≠ Zur Bratpfanne
- `post-388b4383` many guests have come to Jörgs Curry Container for more tha…: Zur Bratpfanne ≠ Jörgs Curry Container
- … 111 more in issues.jsonl

### places.missed (95)

- `post-0d484513` Yumcha Heroes
- `post-106450e8` Amato
- `post-1b8b0789` Doree 65
- `post-1e024518` Masalas
- `post-22c25ac1` Yumcha Heroes
- `post-22c25ac1` Long March Canteen
- `post-28ea0f18` Werners Kräutergarten
- `post-2a8e9606` Otto
- `post-2a8e9606` Pluto
- `post-2a8e9606` Trio
- `post-2a8e9606` Starbucks
- `post-2a8e9606` Landmann
- `post-2a8e9606` Schwarzes Kamel
- `post-2a8e9606` Barlevain
- `post-2a8e9606` File Asto
- `post-2a8e9606` Sagma
- `post-2a8e9606` Almi Bistro
- `post-2a8e9606` Burma Bliss
- `post-2a8e9606` Nobelhardt & Schmutzig
- `post-2a8e9606` Volk
- `post-2a8e9606` Luzii
- `post-2a8e9606` Daia
- `post-2a8e9606` Kōji
- `post-2a8e9606` Goldies Bar
- `post-2a8e9606` Bar Matrëshka
- `post-2e688d3d` Naa Cafe
- `post-2f9fab74` Lezziz Nuts&Sweets
- `post-3a0ad71a` FACIL
- `post-3a0ad71a` etwas. kleines
- `post-3a0ad71a` Common
- `post-3a0ad71a` Bertie
- `post-3a0ad71a` Goldies Smashburger
- `post-3a0ad71a` Ora
- `post-3a0ad71a` Estelle
- `post-3a0ad71a` Grace Restaurant Bar
- `post-3a0ad71a` Kírkē Deli
- `post-3a0ad71a` Coffee Circle
- `post-3a0ad71a` Rogacki (Markthalle Neun)
- `post-3a0ad71a` YOU.Berlin
- `post-3a0ad71a` File Asto Taverna
- … 55 more in issues.jsonl

### parts.amount (81)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ 2 minutes
- `review-08c67545` the portion was quite small for almost 30€: 30 money ≠ —
- `review-0ac47c59` after ordering, waited as long again with an order number t…: —  ≠ 60 minutes
- `review-1016bd13` the group was 120 people: —  ≠ 120 money
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: —  ≠ 4 money
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: —  ≠ 8 money
- `review-1016bd13` pre-ordered a menu of 4 cold dishes, 8 hot dishes and one s…: —  ≠ 1 money
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 6 money
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 1 money
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 1 money
- `review-1016bd13` reserved 6 bottles of beer, 1 large bottle of cola and 1 la…: —  ≠ 6 money
- `review-1016bd13` arranged a 7 PM time with the restaurant in advance: —  ≠ 19 minutes
- `review-1016bd13` arrived on time at 7 PM: —  ≠ 19 minutes
- `review-1016bd13` reserved 15 tables in total: —  ≠ 15 money
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 5 minutes
- `review-1016bd13` all hot dishes (15 plates each for 15 tables) came within j…: —  ≠ 15 money
- `review-1016bd13` for a full 20 minutes the guests only had 4 cold dishes and…: 20 minutes ≠ —
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 5 minutes
- `review-1016bd13` asks why, if staff served dishes one at a time, all 8 hot d…: —  ≠ 8 money
- `review-1016bd13` at a 16-person round table the waiter said all dishes come …: —  ≠ 16 money
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: —  ≠ 4 money
- `review-1016bd13` the 16-person table got 4 plates of 土豆丝 instead of 2 and 4 …: —  ≠ 4 money
- `review-196641fc` the total wait of 50 minutes was too long: 50 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-356e149a` stood at the counter for about five minutes without being g…: 5 minutes ≠ —
- `review-36f2fac8` the queue is 8 meters long: —  ≠ 90 minutes
- `review-5582d6b8` the iced matcha latte cost a whopping €8: 8 money ≠ —
- `review-69365171` had the Büffet from 12-15 Uhr for 16,50€: 16.5 money ≠ —
- `review-75c84f72` the reviewers were there at 09.30: —  ≠ 30 minutes
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-b9d9100a` waited almost 90 minutes in a not very long line of about 2…: 90 minutes ≠ —
- `review-b9d9100a` waited almost 90 minutes in a not very long line of about 2…: 90 minutes ≠ 20 minutes
- `review-b9d9100a` in such a famous place only 2 people do all the work, inclu…: —  ≠ 2 money
- `review-be1da4e0` the bottle of Wasser was charged at 7,50 € for 0.75l on the…: 7.5 money ≠ 0.75 money
- `review-c5e1a090` the reviewer's bowl had far fewer Erdbeeren, exactly two, a…: —  ≠ 2 money
- `review-d77ecb53` had a liter of beer: —  ≠ 1 money
- `review-ff9ad17d` the Pommes for almost 6 euros were money thrown away: 6 money ≠ —
- `post-020c68fb` about ten different birre to taste, not bad: —  ≠ 10 money
- `post-088e18e6` Fatih Servet offers a Steak Döner for 1 euro at four Berlin…: 1 money ≠ —
- `post-1c0d4023` Nobelhart & Schmutzig is recommended by 8 food editorial te…: —  ≠ 8 money
- … 41 more in issues.jsonl

### claims.extra (69)

- `review-1016bd13` would arrive in 20 minutes
- `review-1016bd13` the first bus would have 40 people
- `review-1016bd13` the rest would arrive shortly after
- `review-1016bd13` the soup started serving from 7:05 PM
- `review-170f36a3` care about calories
- `review-356e149a` I'm Arab
- `review-510fc086` the place was loved
- `review-83cf47fa` the mulhoe was unclear
- `review-fb792b39` "You will be seated!"
- `post-01f172dd` katsu-sando
- `post-14d4fc29` the place is in Berlin
- `post-1c0d4023` the selection is based on the number of independent editorial recommendations
- `post-1c0d4023` the selection is as of May 2026
- `post-1c25f2d1` say hi from me when you go
- `post-1e024518` masala dosa
- `post-2161780e` the Healthy Matcha offers a little break in everyday life
- `post-233389f4` they ordered anyway
- `post-24601e6d` they were in Berlin
- `post-24601e6d` they came to Berlin for the dad's 50th
- `post-2927e673` the post is an ad
- `post-2927e673` after the meal you can go up to the dome
- `post-2a8e9606` in the Kunst-Werke on Auguststraße
- `post-2a8e9606` open from early morning to early evening
- `post-2a8e9606` a low-threshold place for city society
- `post-31344bc5` top creator recommendation
- `post-31344bc5` top creator recommendation
- `post-31344bc5` top creator recommendation
- `post-388b4383` good Currywurst
- `post-4a742b09` running a restaurant in your 30s hits different
- `post-4a742b09` chasing invoices
- `post-4a742b09` some days test your patience
- `post-4a742b09` every day you show up again
- `post-4c3e2a10` he wants his customers to be well
- `post-51a97d36` the place is in Berlin
- `post-5bdc34a6` the post is an ad
- `post-5db3b46a` the creator has been in Berlin for over 10 years
- `post-68b0cd44` thanks for the feast
- `post-68b0cd44` the place is called Panda Mia
- `post-78e0e15a` ate my way through Berlin
- `post-78e0e15a` 13 spots
- … 29 more in issues.jsonl

### places.extra (45)

- `post-01f172dd` KATSU-SANDO
- `post-079d7302` Ägyptisches Essen in Berlin
- `post-088e18e6` Fatih Servet
- `post-088e18e6` Fatih Servet
- `post-088e18e6` Fatih Servet
- `post-0dde5eb7` Ristorante Bocca Felice
- `post-106450e8` Amato Berlin
- `post-165a9370` unnamed Indian Restaurant
- `post-1b8b0789` DOREE 65 Argentinian Restaurant
- `post-1c25f2d1` Wochenmarkt Karl-August-Platz
- `post-1e024518` Masala Dosa
- `post-233389f4` indisches Restaurant
- `post-2e688d3d` naa.cafe.berlin
- `post-2f9fab74` Lezziz
- `post-3a0ad71a` YOU
- `post-3d9147ff` Fatoush Berlin
- `post-40f86f07` Amo Cafe Berlin
- `post-40f86f07` Jan Burger Restaurant
- `post-483d6cc6` LoveatfirstbiteBerlin
- `post-48e30fa6` Gauchos del Gusto
- `post-4c3e2a10` Haftschaden
- `post-4c6ccf3b` Streetfood aus dem Gefängnis
- `post-85b04bf2` Berlin
- `post-875be07a` KOMPLEX Berlin
- `post-875be07a` Arena Berlin
- `post-8901fb9b` Ember Berlin
- `post-8901fb9b` Otto
- `post-8901fb9b` Trio
- `post-8901fb9b` Carmen
- `post-8901fb9b` Tacos
- `post-8af29e70` PHO Mitte
- `post-93526d04` Süd Baklava
- `post-9a608e09` Streetfood & feine Buffets
- `post-a6ac0a36` KAYA Brunch
- `post-a7757925` HOM
- `post-a92f9a04` Café KannVa
- `post-ae8f76f1` Velvet Coffee Berlin
- `post-baac3611` 44 CHKN
- `post-bca0fe02` Stoke Berlin
- `post-cecea20e` Bikini Berlin
- … 5 more in issues.jsonl

### parts.kind (39)

- `review-13f72d12` has had better kebsa elsewhere in Berlin: opinion ≠ change
- `review-356e149a` won't spend another cent at this place as long as this empl…: verdict ≠ fact
- `review-36f2fac8` the place is more of a tourist hype/trend: opinion ≠ change
- `review-36f2fac8` not a place where you will have a good döner experience: verdict ≠ change
- `review-7483275e` only two people were working inside the shop: fact ≠ change
- `review-9accbc5b` a celebrity chef lending his name to this makes it even wor…: opinion ≠ change
- `review-a2c14088` sometimes the food is delicious, sometimes not: opinion ≠ change
- `review-a2c14088` sometimes the food is delicious, sometimes not: opinion ≠ change
- `review-aeae47d0` we have been coming here once a week since it opened: fact ≠ change
- `review-b9d9100a` in such a famous place only 2 people do all the work, inclu…: opinion ≠ change
- `review-b9d9100a` with a little more staff everything could run wonderfully: opinion ≠ change
- `review-e8770468` the Burgermeister in Zehlendorf is good: verdict ≠ change
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: fact ≠ change
- `review-ffc5c8e8` the waiter was very strong, with big muscles: opinion ≠ change
- `post-22c25ac1` Mirsad Mujanovic and Anjelo Nguyen now open the Manufaktur: fact ≠ change
- `post-31344bc5` Elotl offers authentic Mexican fine dining, far from burrit…: opinion ≠ change
- `post-388b4383` the family business Schmidt's Imbiss has stood for the best…: opinion ≠ change
- `post-388b4383` the quality at Jörgs Curry Container has remained: opinion ≠ change
- `post-3a0ad71a` YOU opens in Hotel Luc in Mitte as a new concept of restaur…: fact ≠ change
- `post-4590c8ff` The meal at Mao Master is different every time you visit: opinion ≠ change
- `post-483d6cc6` Love at First Bite just opened a second location in Mitte: fact ≠ change
- `post-4c3e2a10` the owner set out to make the best kebab in Germany: fact ≠ change
- `post-5bdc34a6` Frederick and Annika Lau are behind the concept: fact ≠ change
- `post-816a40e7` the restaurant is a new opening in Berlin: fact ≠ change
- `post-816a40e7` for the opening, Shawarma costs 1 Euro on Friday: deal ≠ change
- `post-816a40e7` Shawarma costs 2 Euro on the second opening day: deal ≠ change
- `post-816a40e7` Shawarma then costs 3 Euro on the third opening day: deal ≠ change
- `post-8e94e7ea` With the Pommes, Grill, Brot and Salat, sharing is suddenly…: opinion ≠ change
- `post-93ac6d3b` Birds in the Kitchen shows American cuisine can be much mor…: opinion ≠ change
- `post-93ac6d3b` artisan bakeries have become rare in Berlin: fact ≠ change
- `post-a3178d9e` The Bun Society changed the creator's opinion of smashburge…: opinion ≠ change
- `post-ab190d78` the quality is noticeable immediately: opinion ≠ change
- `post-ab252276` Haus des Döners is open from now on at Torstraße 117, 10119…: fact ≠ change
- `post-ab252276` today is the opening of Haus des Döners in Berlin: event ≠ change
- `post-ab252276` today is the opening of Haus des Döners in Berlin: event ≠ change
- `post-cb785d0b` the falafel is made completely in-house: fact ≠ change
- `post-d057d8ef` the Italian family really goes all out: opinion ≠ change
- `post-fc96acff` Facil's team has changed very little over the years: fact ≠ change
- `post-fc96acff` the continuity of Facil's team is almost unheard of in the …: opinion ≠ change

### change.false (33)

- `review-13f72d12` I've had better in Berlin
- `review-36f2fac8` this is more of a tourist hype/trend than a place where you will have a good döner experi…
- `review-7483275e` there were only two people working inside the shop
- `review-9accbc5b` that makes it even worse
- `review-a2c14088` sometimes the food is great
- `review-a2c14088` sometimes it's not
- `review-aeae47d0` we've been coming here once a week
- `review-b9d9100a` only 2 people doing all the work inside
- `review-b9d9100a` with a little more staff, everything could run wonderfully
- `review-e8770468` a good mayor has finally arrived in Zehlendorf
- `review-ffc5c8e8` the waiter was very strong aka big muscles
- `post-22c25ac1` the manufactory is now open
- `post-31344bc5` far from burrito chains
- `post-388b4383` quality has stayed strong over time
- `post-388b4383` quality has remained the same
- `post-3a0ad71a` new concept replacing Heritage
- `post-4590c8ff` the meal is different every time you visit
- `post-483d6cc6` they just opened a second location in Mitte
- `post-4c3e2a10` he wanted to make the best kebab in Germany
- `post-5bdc34a6` Frederick and Annika Lau are behind the concept
- `post-816a40e7` new opening
- `post-816a40e7` shawarma costs 1 euro on opening day, 2 euros on the second day, and 3 euros on the third…
- `post-8e94e7ea` sharing was no longer an option
- `post-93ac6d3b` called a cut above usual burger joints
- `post-93ac6d3b` described as a rare artisanal bakery
- `post-a3178d9e` smash burgers changed the creator's opinion for the better
- `post-ab190d78` the quality is immediately noticeable
- `post-ab252276` Haus des Döners opened in Berlin
- `post-ab252276` it is a new opening
- `post-cb785d0b` the döner is sold at the same price as back then
- `post-cb785d0b` the falafel are made completely by themselves
- `post-d057d8ef` an Italian family is running things with real energy
- `post-fc96acff` long continuity of key kitchen and wine staff

### match.brand (21)

- `post-0216fd1d` Asia Farmhouse: Asia Farmhouse ≠ Asia Imbiss (llm)
- `post-0bf8447d` Pastaia: none ≠ Pizza Pasta Gatow (llm)
- `post-2672e9fe` Delicia: none ≠ Cafe Delicias (llm)
- `post-3d2d364e` Veg'd Burger: VEG'D ≠ none (none)
- `post-5a876136` Ormado Kaffeehaus: none ≠ Ormado Kaffeehaus (exact)
- `post-5b5671fa` City Chicken: Nhas City Chicken ≠ City Chicken (llm)
- `post-5db3b46a` Manello: none ≠ Pizzeria Monello (llm)
- `post-63b83025` Restaurant Athen: Griechisches Restaurant Athen ≠ none (none)
- `post-78e0e15a` Zacharias Tagesbar: Zacharias.Kaffeebar ≠ Tagesbar (llm)
- `post-78e0e15a` Niko Izakaya: Niko Izakaya ≠ Izakaya Yancha (llm)
- `post-8901fb9b` Back and Break: none ≠ Break Lounge Bar (llm)
- `post-8901fb9b` Sophie: SOFI ≠ none (none)
- `post-8901fb9b` Banh Mi Stable: Banh Mi Stable ≠ Banh mi and more (llm)
- `post-93526d04` Sagros Gemüse Kebab: none ≠ Mustafa Can's Gemüse Kebab (llm)
- `post-93526d04` Kaffee Peri: none ≠ Kaffee Büro (llm)
- `post-93ac6d3b` Kírkē Deli: Kírkē ≠ Kirk Bar (llm)
- `post-93ac6d3b` 100 GRAMM Lounge: none ≠ 100 GRAMM Bar (llm)
- `post-93ac6d3b` Augusta am Savignyplatz: none ≠ Café Augusta (llm)
- `post-d220e97c` Goldies Bar: none ≠ goldies (exact)
- `post-e2a421e9` Butter Lindner: LINDNER Esskultur ≠ none (none)
- `post-fb121f9c` Hackescher Hof: none ≠ Hackescher Markt (llm)

### change.missed (18)

- `review-2b737ce5` before today the food was okay
- `review-382cd7e9` the renovation is a real shame
- `review-c117171d` the place is degrading
- `post-22c25ac1` the restaurant in Mitte has new owners
- `post-2a8e9606` Sören Zupke and Vadim Otto Ursus take over Café Bravo in the summer
- `post-388b4383` Konnopke’s Imbiß needed a new building in 2011 because of U-Bahn renovation works
- `post-7516d1de` Bahadur now operates as Prince of Punjab at the same address
- `post-aa137bfa` the restaurant was completely rebuilt and reconceived at the start of the year
- `post-aa137bfa` instead of rustic steakhouse flair, black gloss surfaces, dark wood, mirrors, red leather…
- `post-b8d2bcf3` Bravo has just reopened with a new operator team
- `post-b8d2bcf3` in July 2026 a new generation took over Bravo: Clemens Roesch, Eva Alken, Sören Zuppke an…
- `post-b8d2bcf3` the pavilion was refurnished with architects Studio Affin without changing its openness
- `post-c4e7c0a9` on taking over, Luca removed the dividing wall and opened up the room
- `post-cb785d0b` after the renovation there is much more space
- `post-d1ab7367` Andy King hands the Kreuzberg premises over to new owners Santiago Cornejo and Josepha Ni…
- `post-d1ab7367` The shop has been renamed Vinos (Naturales)
- `post-e2a421e9` In the 1990s Lindner changed its colours from red and blue to blue and gold
- `post-e62d3c39` the operators of Otto, Trio and Pluto took over the day café Bravo in the KW Institute fo…

### match.branch (6)

- `post-1c0d4023` Michelberger Restaurant: brand only ≠ Michelberger Café & Bar
- `post-2a8e9606` Michelberger Hotel: brand only ≠ Michelberger Café & Bar
- `post-2b231637` Tribeca Ice Cream: brand only ≠ Tribeca Ice Cream Kreuzberg
- `post-66f606db` Dufte: Dufte ≠ brand only
- `post-8901fb9b` Bonanza Coffee: Bonanza Coffee Roasters ≠ brand only
- `post-8c6bd842` Nahs City Chicken: brand only ≠ Nhas City Chicken
