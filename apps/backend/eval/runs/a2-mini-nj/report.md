# Ingestion eval: a2-mini-nj

2026-11-05 19:59 UTC · 51 reviews, 0 posts, 0 wordings · 820 cases left out (no reference or no output)
Reading: reader split, labeller classifier
Tokens: 1,515,238 (67,584 input tokens from the prompt cache)
Spend: $0.050 (paid calls: classifiers)
Models: review-claims: openai/gpt-5.4-mini (51); claim-labels: typesafe-ai/jev-latest (51)

## Reviews

| Metric | a2-mini-nj | stored | a2-gpt54-nj | a2-nemotron | or-smoke |
|---|---|---|---|---|---|
| Claims found (of the reference) | 95% (283/298) | 93% +1 | — | 94% +1 | — |
| Claims that are real (of produced) | 99% (341/343) | 99% ±0 | — | 99% +1 | — |
| Sentiment | 95% (305/321) | 88% +7 | — | 98% -3 | — |
| Aspect, exact | 88% (283/321) | 71% +17 | — | 90% -2 | — |
| Aspect, right root | 93% (299/321) | 81% +12 | — | 95% -2 | — |
| Kind | 96% (308/321) | 67% +29 | — | 97% -1 | — |
| Kind given at all | 100% (321/321) | 4% +96 | — | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | 74% (236/321) | — | — | 73% +1 | — |
| Sentiment, among sure answers | 99% (234/236) | — | — | 100% -1 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | 45% (145/321) | — | — | 46% ±0 | — |
| Aspect, exact, among sure answers | 98% (142/145) | — | — | 98% ±0 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | 77% (246/321) | — | — | 77% -1 | — |
| Kind, among sure answers | 99% (244/246) | — | — | 99% ±0 | — |
| Changes that are changes | 67% (2/3) | 56% +11 | — | 0% +67 | — |
| Changes found | 100% (2/2) | 80% +20 | — | 0% +100 | — |
| Amount | 65% (11/17) | 41% +23 | — | 81% -17 | — |
| Foods named, precision | 91% (122/134) | 32% +59 | — | 85% +6 | — |
| Foods named, recall | 94% (112/119) | 23% +71 | — | 90% +4 | — |

_Other runs show their share and the points this run is above (+) or below (−) it._

## Held-back cases

_Only the test side: cases never read while tuning. A change counts when it moves these by more than the noise between two runs of the same prompts._

### Reviews

| Metric | a2-mini-nj (train) | a2-mini-nj (test) | a2-gpt54-nj (test) | a2-nemotron (test) | or-smoke (test) |
|---|---|---|---|---|---|
| Claims found (of the reference) | — | 95% (283/298) | — | 94% +1 | — |
| Claims that are real (of produced) | — | 99% (341/343) | — | 99% +1 | — |
| Sentiment | — | 95% (305/321) | — | 98% -3 | — |
| Aspect, exact | — | 88% (283/321) | — | 90% -2 | — |
| Aspect, right root | — | 93% (299/321) | — | 95% -2 | — |
| Kind | — | 96% (308/321) | — | 97% -1 | — |
| Kind given at all | — | 100% (321/321) | — | 100% ±0 | — |
| Sentiment: sure answers (p ≥ 0.9, of answered) | — | 74% (236/321) | — | 73% +1 | — |
| Sentiment, among sure answers | — | 99% (234/236) | — | 100% -1 | — |
| Aspect: sure answers (p ≥ 0.9, of answered) | — | 45% (145/321) | — | 46% ±0 | — |
| Aspect, exact, among sure answers | — | 98% (142/145) | — | 98% ±0 | — |
| Kind: sure answers (p ≥ 0.9, of answered) | — | 77% (246/321) | — | 77% -1 | — |
| Kind, among sure answers | — | 99% (244/246) | — | 99% ±0 | — |
| Changes that are changes | — | 67% (2/3) | — | 0% +67 | — |
| Changes found | — | 100% (2/2) | — | 0% +100 | — |
| Amount | — | 65% (11/17) | — | 81% -17 | — |
| Foods named, precision | — | 91% (122/134) | — | 85% +6 | — |
| Foods named, recall | — | 94% (112/119) | — | 90% +4 | — |

## By case tag

| Tag | Claims found (of the reference) | Claims that are real (of produced) | Aspect, exact | Sentiment | Places found | Match: brand (found places) |
|---|---|---|---|---|---|---|
| chain | 96% (135/140) | 99% (161/162) | 87% (131/150) | 94% (141/150) | — | — |
| lang:de | 94% (82/87) | 100% (92/92) | 84% (75/89) | 93% (83/89) | — | — |
| lang:en | 93% (66/71) | 100% (82/82) | 92% (70/76) | 99% (75/76) | — | — |
| lang:other | 95% (91/96) | 100% (114/114) | 88% (91/104) | 95% (99/104) | — | — |
| lang:tr | 100% (44/44) | 96% (53/55) | 90% (47/52) | 92% (48/52) | — | — |
| length:long | 93% (74/80) | 99% (90/91) | 91% (77/85) | 94% (80/85) | — | — |
| length:medium | 95% (185/194) | 100% (228/229) | 87% (184/211) | 95% (200/211) | — | — |
| length:short | 100% (24/24) | 100% (23/23) | 88% (22/25) | 100% (25/25) | — | — |
| platform:google | 95% (283/298) | 99% (341/343) | 88% (283/321) | 95% (305/321) | — | — |
| stars:1 | 98% (48/49) | 98% (58/59) | 93% (50/54) | 93% (50/54) | — | — |
| stars:2 | 96% (26/27) | 100% (32/32) | 93% (26/28) | 93% (26/28) | — | — |
| stars:3 | 94% (80/85) | 100% (103/103) | 89% (85/95) | 97% (92/95) | — | — |
| stars:4 | 96% (52/54) | 98% (60/61) | 84% (49/58) | 91% (53/58) | — | — |
| stars:5 | 93% (77/83) | 100% (88/88) | 85% (73/86) | 98% (84/86) | — | — |

## Misses

### parts.aspect (38)

- `review-0541b749` the pain was quickly made, nothing special: food ≠ wait_for_food
- `review-070860ca` not worth the hassle: none ≠ value_for_money
- `review-0ac47c59` orders deliberately not taken from the person at the front …: queue ≠ attentiveness
- `review-37016d87` the food was delicious: taste ≠ food
- `review-3e075e7e` the place has a street style: atmosphere ≠ none
- `review-3e075e7e` the music playing in the place is cool too: atmosphere ≠ noise
- `review-4a46a87d` the new location isn't the same as the old one: food ≠ location
- `review-4a46a87d` it has become a fast-food restaurant: menu_variety ≠ none
- `review-52ef0f64` the Vöner Döner was nothing outstanding: taste ≠ none
- `review-5582d6b8` staff placed the spoons on the edge of the table: service ≠ dining_area
- `review-5582d6b8` the friend barely touched the table and the spoons fell: interior ≠ dining_area
- `review-6217ec70` waited in line for about an hour: queue ≠ wait_for_food
- `review-6217ec70` probably wouldn't wait another hour in line for the kebab: queue ≠ wait_for_food
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: menu_variety ≠ taste
- `review-6b4df664` the staff could be more attentive: attentiveness ≠ friendliness
- `review-6e97260b` the coca-cola sent in the delivery was warm: takeaway_handling ≠ temperature
- `review-703f425d` the burger has never arrived bad: consistency ≠ taste
- `review-7593dfff` there were few locals in the line, mostly tourists: crowding ≠ queue
- `review-75c84f72` the reviewers were there at 09.30: none ≠ crowding
- `review-78c08c78` the potato salad is definitely a highlight and worth trying: taste ≠ food
- `review-866767df` the meal was peaceful: noise ≠ taste
- `review-a2c14088` sometimes the food is delicious, sometimes not: consistency ≠ taste
- `review-b31c1e48` except for one staff member, but everyone has a bad day: friendliness ≠ service
- `review-b31c1e48` the robot cat occasionally stopped with the food in other s…: service ≠ food_hygiene
- `review-b31c1e48` guests had to watch when the robot cat was at their area so…: service ≠ food_hygiene
- `review-bf2322b7` we were treated to the meal by the owner: on_the_house ≠ ownership
- `review-bf2322b7` the Salat was fresh: freshness ≠ taste
- `review-c513f76e` the ambiance is great because of the revolving tower: atmosphere ≠ interior
- `review-e12f5f74` the Tavuk döner was good: taste ≠ food
- `review-e12f5f74` the salad (salatası) was plentiful: portion_size ≠ freshness
- `review-e8770468` the Burgermeister in Zehlendorf is good: none ≠ food
- `review-e8770468` Burgermeister has now finally opened in Zehlendorf: none ≠ food
- `review-f1e62446` the reviewer expected something better from the place: none ≠ food
- `review-f1e62446` the reviewer doesn't see the "wow" factor of the place: none ≠ food
- `review-fa5b28b1` waited a full 74 minutes to get the döner: queue ≠ wait_for_food
- `review-fa5b28b1` the understaffing is a big failing of the shop owner: service ≠ ownership
- `review-fb1415dc` staff should spend less time on their phones: attentiveness ≠ none
- `review-fb1415dc` the service issues are only individual staff members: service ≠ none

### parts.sentiment (16)

- `review-0541b749` the frites were frozen: negative ≠ neutral
- `review-0541b749` the pain was quickly made, nothing special: negative ≠ positive
- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: neutral ≠ positive
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: negative ≠ neutral
- `review-0ac47c59` complimentary tea is offered, the only thing earning 1 point: positive ≠ negative
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: positive ≠ negative
- `review-5582d6b8` sit inside: positive ≠ neutral
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: neutral ≠ positive
- `review-7593dfff` the bread roll was average: negative ≠ neutral
- `review-75c84f72` the reviewers were there at 09.30: neutral ≠ negative
- `review-bf2322b7` there were even different marinades for the chicken: positive ≠ neutral
- `review-fa5b28b1` the döner was very different: positive ≠ neutral
- `review-fb1415dc` many burger combinations are possible: positive ≠ neutral
- `review-fb1415dc` staff should spend less time on their phones: negative ≠ neutral
- `review-fb1415dc` the cleanliness and service issues are not that bad: mixed ≠ positive
- `review-fd35af1d` it is sad to see the place empty: negative ≠ neutral

### parts.foods (15)

- `review-0541b749` the meat in the sandwich was chicken only: [poulet] ≠ [viande, poulet, sandwich]
- `review-0ac47c59` the salad of lettuce, tomato and onion was wilted and soggy: [marul, domates, soğan, salata] ≠ [marul, domates, soğan]
- `review-13f72d12` has had better kebsa elsewhere in Berlin: [kebsa] ≠ []
- `review-37016d87` the food was delicious: [] ≠ [comida]
- `review-52ef0f64` the Vöner Döner was nothing outstanding: [Vöner Döner] ≠ []
- `review-52ef0f64` the vegan Ayran tastes like Carinthian cheese noodles (Kärn…: [Ayran] ≠ [Ayran, Kärntner Kaßnudeln]
- `review-6217ec70` the kebab had plenty of meat and vegetables: [kebab, meat, vegetables] ≠ [meat, vegetables]
- `review-6217ec70` the kebab portion was big: [kebab] ≠ []
- `review-6b4df664` the Königsberger Klopse were nicely presented: [Königsberger Klopse] ≠ [Königsberger Klopse, Kalb, Roter Bete, Kartoffelpüree]
- `review-70467fba` the taste of the kebab was good: [kebab] ≠ []
- `review-71868223` a nice döner place whose taste still lingers in the mouth: [] ≠ [döner]
- `review-75c84f72` the reviewers had breakfast at a cafe next to Markthalle Ne…: [] ≠ [breakfast]
- `review-9a341bb6` the food style was awkwardly between fusion and traditional: [] ≠ [fusion, tradition]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]
- `review-fa5b28b1` waited a full 74 minutes to get the döner: [döner] ≠ [dönerimi]

### claims.missed (15)

- `review-070860ca` the reviewer is not happy
- `review-37016d87` everything was incredible
- `review-5582d6b8` don't eat outside
- `review-5582d6b8` skip the matcha latte
- `review-58540992` they were told they were supposedly late
- `review-58540992` the reviewer does not want to be told off because someone else did not show up
- `review-6217ec70` not sure they would repeat the experience
- `review-6217ec70` would definitely get the kebab again if passing by and the line was short
- `review-6e97260b` never seen such terrible attitude towards a customer
- `review-7593dfff` the place is worth it if you have time to wait in line
- `review-7593dfff` the overall vibe won't appeal to everyone
- `review-75c84f72` Markthalle Neun is a nice place
- `review-bf2322b7` keep up the great work
- `review-dcd4db39` the queue nonetheless moved relatively quickly
- `review-dcd4db39` keep up the good work, dear team

### parts.kind (13)

- `review-0ac47c59` came because it was the most reviewed, highly rated kebab s…: fact ≠ opinion
- `review-0ac47c59` the chicken meat was covered in lots of curry sauce, tastin…: opinion ≠ fact
- `review-37016d87` went for dinner at the end of a 25th wedding anniversary tr…: fact ≠ event
- `review-3f2a2713` the venue should offer a vegan burger already: opinion ≠ new_item
- `review-5582d6b8` sit inside: opinion ≠ fact
- `review-5582d6b8` the place is really great: verdict ≠ opinion
- `review-6b4df664` had the Königsberger Klopse vom Kalb with Roter Bete and Ka…: fact ≠ opinion
- `review-6b4df664` overall still a lovely visit: verdict ≠ opinion
- `review-7593dfff` once the older gentleman showed up, everything went faster: opinion ≠ change
- `review-75c84f72` the reviewers were there at 09.30: fact ≠ opinion
- `review-b31c1e48` the robot cat sang for the birthday: fact ≠ event
- `review-ec04d472` never order the tabla de entrantes: opinion ≠ verdict
- `review-fd35af1d` it is sad to see the place empty: opinion ≠ fact

### parts.amount (6)

- `review-070860ca` the correct order arrived 2 hours late: 120 minutes ≠ 2 money
- `review-16bdd5e0` my sauce was only on 1/3 of the kebab: —  ≠ 1 money
- `review-7593dfff` with about 12 people in line, the wait was about an hour: 60 minutes ≠ 1 minutes
- `review-75c84f72` the reviewers are used to marketplaces opening at 07.00 at …: —  ≠ 7 money
- `review-a2c14088` once ordered a 0.4L water: —  ≠ 0.4 money
- `review-c83e0a88` waited in line for 1.5 hours: 90 minutes ≠ 1.5 minutes

### claims.extra (2)

- `review-0ac47c59` the line was a sales tactic
- `review-71868223` had to wait

### change.false (1)

- `review-7593dfff` everything went faster once he showed up
