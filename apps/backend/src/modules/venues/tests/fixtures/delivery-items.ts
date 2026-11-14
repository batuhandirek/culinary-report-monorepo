// Items as the actors returned them on 2026-11-14 (Free plan), cut to the fields we read and
// their descriptions to 60 characters: the pages of The Bun Society (Adalbertstraße 23, Berlin) on
// Uber Eats and Lieferando, a Wolt restaurant's page, and Google's result pages for the searches
// that find a brand's delivery pages.

import type { GoogleSearchPage } from 'src/modules/apify/actors/google-search.actor.js';
import type { LieferandoItem } from 'src/modules/apify/actors/lieferando.actor.js';
import type { UberEatsItem } from 'src/modules/apify/actors/uber-eats.actor.js';
import type { WoltItem } from 'src/modules/apify/actors/wolt-menu.actor.js';

/** `borderline/uber-eats-scraper-ppr`, read by the store's URL */
export const UBER_EATS_BUN_SOCIETY: UberEatsItem = {
	"uuid": "6923dbf3-30ba-526a-ab64-c822e47cc51b",
	"slug": "the-bun-society",
	"url": "https://ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw",
	"title": "The Bun Society ",
	"cuisineList": [
		"Burger"
	],
	"currencyCode": "EUR",
	"storeAvailablityStatus": "STORE_CLOSED",
	"isLost": false,
	"location": {
		"streetAddress": "Adalbertstraße 23",
		"city": "Berlin",
		"postalCode": "10997",
		"latitude": 52.50311876838245,
		"longitude": 13.42074758259409
	},
	"rating": {
		"ratingValue": 4.3,
		"ratingCount": "170+"
	},
	"etaMinutes": {
		"min": 24,
		"max": 41
	},
	"menu": [
		{
			"catalogName": "Empfohlene Artikel",
			"catalogItems": [
				{
					"uuid": "e593124f-0743-4c27-a40f-f76772e8784e",
					"title": "Skinny Fries",
					"itemDescription": "",
					"price": 450,
					"isSoldOut": false
				},
				{
					"uuid": "3ea5865b-ffaa-4131-8f70-b508c9253db0",
					"title": "The Classic Smash",
					"itemDescription": "with diced pickles , diced white onions , chicago fry sauce ",
					"price": 800,
					"isSoldOut": false
				},
				{
					"uuid": "754a1d50-7e56-40d3-96fe-8e2eed3f521d",
					"title": "Banging Bangkok 🌶️🌶️",
					"itemDescription": "with thai laab , garlic mayo and american cheese",
					"price": 1050,
					"isSoldOut": false
				},
				{
					"uuid": "3c1ff5aa-3af9-40ed-866d-b8edfca4cbd8",
					"title": "Bussin Bulgogi",
					"itemDescription": "with kimchi , bulgogi mayo , garlic mayo , spring onion and ",
					"price": 1050,
					"isSoldOut": false,
					"rating": "92%",
					"numRatings": 14
				},
				{
					"uuid": "d912e764-2b10-49ba-b723-3826137b9558",
					"title": "Sumac Slap",
					"itemDescription": "with tomato butter , yoghurt , sumac onions , cabbage and am",
					"price": 1050,
					"isSoldOut": false,
					"rating": "90%",
					"numRatings": 10
				},
				{
					"uuid": "d1610d7f-a20e-42b6-a9bf-3cc94cda4662",
					"title": "The Classic Chicken",
					"itemDescription": "fried chicken thigh*, with lettuce , fresh tomato , garlic m",
					"price": 1200,
					"isSoldOut": false,
					"rating": "85%",
					"numRatings": 20
				},
				{
					"uuid": "6064ad4d-4258-4e9d-b4e7-39751f325474",
					"title": "Midnight Sando",
					"itemDescription": "fried chicken thigh*, with egg salad, fresh cabbage, teriyak",
					"price": 1300,
					"isSoldOut": false
				},
				{
					"uuid": "d7d28f1e-e957-4599-a7bd-39cbcdc92cc1",
					"title": "Platain Wahala",
					"itemDescription": "fried chicken thigh*, with fried plantains, peanut sauce, fr",
					"price": 1300,
					"isSoldOut": false,
					"rating": "66%",
					"numRatings": 3
				},
				{
					"uuid": "121719d5-f694-4708-a0eb-28d95042eee3",
					"title": "Gochu Chick",
					"itemDescription": "fried chicken thigh*, with kimchi , garlic mayo , gochujang ",
					"price": 1300,
					"isSoldOut": false,
					"rating": "70%",
					"numRatings": 10
				},
				{
					"uuid": "471a33ad-1155-4a03-af03-4cf153108802",
					"title": "The Classic Smash Veggie",
					"itemDescription": "with diced pickles , diced white onions , chicago fry sauce ",
					"price": 950,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 3
				},
				{
					"uuid": "9c6e4248-0e2a-4d31-b127-17cb6ea62e76",
					"title": "Cheese Sauce",
					"itemDescription": "",
					"price": 400,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 7
				},
				{
					"uuid": "27905fbd-d596-46be-a449-d4b463cf6ebe",
					"title": "Bussin Bulgogi Veggie",
					"itemDescription": "with kimchi , bulgogi mayo , garlic mayo , spring onion and ",
					"price": 1150,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 5
				},
				{
					"uuid": "981fc80d-0174-4eca-ad0c-a37133be1cc3",
					"title": "Sumac Slap Veggie",
					"itemDescription": "with tomato butter , yoghurt , sumac onions , cabbage and am",
					"price": 1150,
					"isSoldOut": false
				},
				{
					"uuid": "85b67a42-1730-4c2c-8fe2-524348a56bab",
					"title": "Cucumber Salad",
					"itemDescription": "rice vinegar, soy, chili oil, sesame oil",
					"price": 450,
					"isSoldOut": false,
					"rating": "80%",
					"numRatings": 5
				},
				{
					"uuid": "113b1b8c-6190-4bb2-a389-7214f650207e",
					"title": "Fritz Kola 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "cba9799c-1a96-4c74-9152-577f777030e6",
					"title": "Fritz Orange 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 3
				}
			]
		},
		{
			"catalogName": "Smashed Beef Burger",
			"catalogItems": [
				{
					"uuid": "3ea5865b-ffaa-4131-8f70-b508c9253db0",
					"title": "The Classic Smash",
					"itemDescription": "with diced pickles , diced white onions , chicago fry sauce ",
					"price": 800,
					"isSoldOut": false,
					"rating": "91%",
					"numRatings": 23
				},
				{
					"uuid": "754a1d50-7e56-40d3-96fe-8e2eed3f521d",
					"title": "Banging Bangkok 🌶️🌶️",
					"itemDescription": "with thai laab , garlic mayo and american cheese",
					"price": 1050,
					"isSoldOut": false,
					"rating": "96%",
					"numRatings": 27
				},
				{
					"uuid": "d912e764-2b10-49ba-b723-3826137b9558",
					"title": "Sumac Slap",
					"itemDescription": "with tomato butter , yoghurt , sumac onions , cabbage and am",
					"price": 1050,
					"isSoldOut": false,
					"rating": "90%",
					"numRatings": 10
				},
				{
					"uuid": "3c1ff5aa-3af9-40ed-866d-b8edfca4cbd8",
					"title": "Bussin Bulgogi",
					"itemDescription": "with kimchi , bulgogi mayo , garlic mayo , spring onion and ",
					"price": 1050,
					"isSoldOut": false,
					"rating": "92%",
					"numRatings": 14
				},
				{
					"uuid": "34ebb4c4-5360-4ff8-8fac-3f820c486697",
					"title": "2x  Bussin Bulgogi",
					"itemDescription": "2x Bussin Bulgogi Burger with kimchi , bulgogi mayo , garlic",
					"price": 1850,
					"isSoldOut": false
				}
			]
		},
		{
			"catalogName": "Smashed Veggie Burger",
			"catalogItems": [
				{
					"uuid": "471a33ad-1155-4a03-af03-4cf153108802",
					"title": "The Classic Smash Veggie",
					"itemDescription": "with diced pickles , diced white onions , chicago fry sauce ",
					"price": 950,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 3
				},
				{
					"uuid": "fcc88856-1921-428b-83f2-50b76cf0b866",
					"title": "Banging Bangkok Veggie 🌶️🌶️",
					"itemDescription": "with thai laab (sliced red onions, thai basil, mint, lime, t",
					"price": 1150,
					"isSoldOut": false,
					"rating": "66%",
					"numRatings": 3
				},
				{
					"uuid": "981fc80d-0174-4eca-ad0c-a37133be1cc3",
					"title": "Sumac Slap Veggie",
					"itemDescription": "with tomato butter , yoghurt , sumac onions , cabbage and am",
					"price": 1150,
					"isSoldOut": false
				},
				{
					"uuid": "27905fbd-d596-46be-a449-d4b463cf6ebe",
					"title": "Bussin Bulgogi Veggie",
					"itemDescription": "with kimchi , bulgogi mayo , garlic mayo , spring onion and ",
					"price": 1150,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 5
				}
			]
		},
		{
			"catalogName": "Fried Chicken Burger",
			"catalogItems": [
				{
					"uuid": "d1610d7f-a20e-42b6-a9bf-3cc94cda4662",
					"title": "The Classic Chicken",
					"itemDescription": "fried chicken thigh*, with lettuce , fresh tomato , garlic m",
					"price": 1200,
					"isSoldOut": false,
					"rating": "85%",
					"numRatings": 20
				},
				{
					"uuid": "6064ad4d-4258-4e9d-b4e7-39751f325474",
					"title": "Midnight Sando",
					"itemDescription": "fried chicken thigh*, with egg salad, fresh cabbage, teriyak",
					"price": 1300,
					"isSoldOut": false
				},
				{
					"uuid": "121719d5-f694-4708-a0eb-28d95042eee3",
					"title": "Gochu Chick",
					"itemDescription": "fried chicken thigh*, with kimchi , garlic mayo , gochujang ",
					"price": 1300,
					"isSoldOut": false,
					"rating": "70%",
					"numRatings": 10
				},
				{
					"uuid": "d7d28f1e-e957-4599-a7bd-39cbcdc92cc1",
					"title": "Platain Wahala",
					"itemDescription": "fried chicken thigh*, with fried plantains, peanut sauce, fr",
					"price": 1300,
					"isSoldOut": false,
					"rating": "66%",
					"numRatings": 3
				}
			]
		},
		{
			"catalogName": "Sides",
			"catalogItems": [
				{
					"uuid": "85b67a42-1730-4c2c-8fe2-524348a56bab",
					"title": "Cucumber Salad",
					"itemDescription": "rice vinegar, soy, chili oil, sesame oil",
					"price": 450,
					"isSoldOut": false,
					"rating": "80%",
					"numRatings": 5
				},
				{
					"uuid": "bb2cc958-a650-44e1-87c4-ef09bf871e29",
					"title": "Kimchi",
					"itemDescription": "",
					"price": 450,
					"isSoldOut": false
				},
				{
					"uuid": "e593124f-0743-4c27-a40f-f76772e8784e",
					"title": "Skinny Fries",
					"itemDescription": "",
					"price": 450,
					"isSoldOut": false,
					"rating": "76%",
					"numRatings": 46
				},
				{
					"uuid": "6c1fa831-b94e-45e8-9850-5f9cc2305115",
					"title": "Fried Chicken Thigh 1 pcs",
					"itemDescription": "",
					"price": 500,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 5
				}
			]
		},
		{
			"catalogName": "Sauce",
			"catalogItems": [
				{
					"uuid": "652f5422-96e3-420b-afc4-260ec4004e4a",
					"title": "Ketchup",
					"itemDescription": "",
					"price": 80,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 5
				},
				{
					"uuid": "74bc7988-621a-414d-94de-a261b70eb2bd",
					"title": "Mayo",
					"itemDescription": "",
					"price": 80,
					"isSoldOut": false,
					"rating": "87%",
					"numRatings": 8
				},
				{
					"uuid": "b499e00c-bb2b-44b8-8b09-0b544642d6bf",
					"title": "Gochujang Ketchup",
					"itemDescription": "",
					"price": 200,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 9
				},
				{
					"uuid": "53e9c927-58ab-4c4f-9bf6-5daf2d8166dd",
					"title": "Thai Basil Mayo",
					"itemDescription": "",
					"price": 200,
					"isSoldOut": false,
					"rating": "90%",
					"numRatings": 11
				},
				{
					"uuid": "63317f2a-b49b-4c42-8783-a67b62da2ed3",
					"title": "Bulgogi Mayo",
					"itemDescription": "",
					"price": 200,
					"isSoldOut": false,
					"rating": "90%",
					"numRatings": 11
				},
				{
					"uuid": "9c6e4248-0e2a-4d31-b127-17cb6ea62e76",
					"title": "Cheese Sauce",
					"itemDescription": "",
					"price": 400,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 7
				}
			]
		},
		{
			"catalogName": "Drinks",
			"catalogItems": [
				{
					"uuid": "113b1b8c-6190-4bb2-a389-7214f650207e",
					"title": "Fritz Kola 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "eeb5884d-e5eb-4206-93c9-9c226a72bbcf",
					"title": "Fritz-Kola Superzero 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "cba9799c-1a96-4c74-9152-577f777030e6",
					"title": "Fritz Orange 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false,
					"rating": "100%",
					"numRatings": 3
				},
				{
					"uuid": "56844e49-9802-486e-a7ac-6d204e2a5bf5",
					"title": "Viva con Aqua 0,33 l still",
					"itemDescription": "",
					"price": 300,
					"isSoldOut": false
				},
				{
					"uuid": "6a9db3e1-1764-4382-a357-86051e466d51",
					"title": "Viva con Aqua 0,33 l sparkling",
					"itemDescription": "",
					"price": 300,
					"isSoldOut": false
				},
				{
					"uuid": "8dc06b07-6ad1-43b6-8bfb-42b57c5983ce",
					"title": "Fritz Misch Masch",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "5b5b6a57-be88-4600-8932-2f18e00987bd",
					"title": "Fritz Bio-Apfelschorle",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "3bec2245-f1fc-417d-9ff3-6831dc1bddd5",
					"title": "Field No. 7 Ice Tea Peach  0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "8edb0310-8458-4357-bbe7-03d00a7a4212",
					"title": "Field No. 7 Ice Tea Pineapple Mango",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "94d93b60-4101-4dae-9cce-21d6ca58a79e",
					"title": "Field No. 7 Ice Tea Lychee  0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				},
				{
					"uuid": "5ac6a4fe-d691-4e54-8b54-c7f7411a3f3f",
					"title": "Field No. 7 Ice Tea Lemon 0,33 l",
					"itemDescription": "",
					"price": 350,
					"isSoldOut": false
				}
			]
		}
	]
};

/** `lukass/just-eat-takeaway-scraper`, read by the restaurant's page */
export const LIEFERANDO_BUN_SOCIETY: LieferandoItem = {
	"restaurantId": "13033013",
	"name": "The Bun Society",
	"seoName": "the-bun-society",
	"url": "https://www.lieferando.de/speisekarte/the-bun-society",
	"cuisines": [
		"Hühnchen",
		"Burger",
		"100% Halal"
	],
	"rating": 3.7,
	"ratingCount": 1,
	"address": "Adalbertstraße 23",
	"postcode": "10997",
	"city": "Berlin",
	"latitude": 52.503014,
	"longitude": 13.420723,
	"currency": "EUR",
	"isTemporarilyOffline": false,
	"deliveryTimeMin": 20,
	"deliveryTimeMax": 40,
	"deliveryFee": 0.79,
	"minimumOrder": 10,
	"menuItems": [
		{
			"itemId": "0ecf9f0f-05f3-4fdf-9552-f6f2a261cc85",
			"name": "Midnight Sando",
			"description": "Weißkohl, Teriyaki-Soße, Takuan-Rettich, Eiersalat, American",
			"category": "Fried Chicken Burger",
			"price": 13,
			"isAvailable": true
		},
		{
			"itemId": "0faa2b8b-124d-4e6b-bf7b-5a5c9564a88d",
			"name": "Field No. 7 Iced Tea Peach 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "ec90749e-b037-42bf-a484-180ed488e5d3",
			"name": "Bussin' Bulgogi Veggie",
			"description": "Kimchi, bulgogi mayo, knoblauch mayo, American Cheese, frühl",
			"category": "Veggie Burger",
			"price": 11.5,
			"isAvailable": false
		},
		{
			"itemId": "a3354d69-35fe-4c6c-84c0-f411bd52eeb6",
			"name": "Aktion Gochu Chick",
			"description": "Kimchi, Weißkohl, Knoblauch-Mayo, Gochujang-Ketchup, America",
			"category": "Fried Chicken Burger",
			"price": 16,
			"isAvailable": true
		},
		{
			"itemId": "9e7d5efd-691c-49b7-84d3-b30ae567db5e",
			"name": "Aktion Sumac Slap",
			"description": "Tomatenbutter, Joghurt, sumach zwiebeln, weiß kohl, American",
			"category": "Smashed Beef Burger",
			"price": 13.5,
			"isAvailable": true
		},
		{
			"itemId": "f492fb38-5949-45e0-8259-cedb370ca71f",
			"name": "Gochujang Ketchup",
			"category": "Beilagen - Saucen",
			"price": 2,
			"isAvailable": true
		},
		{
			"itemId": "d23e21e5-dafa-4674-880c-d405cf74cec2",
			"name": "Aktion The Classic Smash",
			"description": "Gewürfelte Gewürzgurken, gewürfelte weiße Zwiebeln, Chicago-",
			"category": "Smashed Beef Burger",
			"price": 11,
			"isAvailable": true
		},
		{
			"itemId": "2fb23a7e-427e-4756-9bf8-47106dcad119",
			"name": "Field No. 7 Iced Tea Lychee 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": false
		},
		{
			"itemId": "fd18dec1-65ca-4b5c-a758-979476d3d9bb",
			"name": "Kimchi",
			"description": "Traditionell fermentiertes koreanisches Kimchi – würzig, sch",
			"category": "Beilagen - Saucen",
			"price": 4.5,
			"isAvailable": true
		},
		{
			"itemId": "155d027d-b2de-4ea8-8e13-17edbc900735",
			"name": "Viva con Agua prickelnd 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3,
			"isAvailable": true
		},
		{
			"itemId": "90fb5b8f-d302-4e48-8cb2-1e22c68cdf4c",
			"name": "Fritz Orange 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "037842a8-2c59-4647-8aae-723f9835357f",
			"name": "Skinny Fries",
			"description": "Hauchdünne, extra knusprige Pommes",
			"category": "Beilagen - Saucen",
			"price": 4.5,
			"isAvailable": true
		},
		{
			"itemId": "2028734b-9347-4d84-b323-fb6c3c74caeb",
			"name": "Aktion The Classic Smash Veggie",
			"description": "Gewürfelte Gewürzgurken, gewürfelte, weiße Zwiebeln, Chicago",
			"category": "Veggie Burger",
			"price": 12.5,
			"isAvailable": true
		},
		{
			"itemId": "3f818aa2-219e-400a-81bf-4de549ffa2f2",
			"name": "Mayonnaise",
			"category": "Beilagen - Saucen",
			"price": 0.8,
			"isAvailable": true
		},
		{
			"itemId": "55705154-eead-4b8b-b5cc-d6a1a2415609",
			"name": "Knoblauch Mayo",
			"category": "Beilagen - Saucen",
			"price": 2,
			"isAvailable": true
		},
		{
			"itemId": "b07cdc96-3c0f-494a-950e-dc64606ba280",
			"name": "Aktion Bussin' Bulgogi Veggie",
			"description": "Kimchi, bulgogi mayo, knoblauch mayo, American Cheese, frühl",
			"category": "Veggie Burger",
			"price": 14.5,
			"isAvailable": true
		},
		{
			"itemId": "beca75e4-76c1-481d-8f90-05119a3143f2",
			"name": "Aktion Banging Bangkok Veggie",
			"description": "Thai laab (Thai basilikum, minze, koriander, chilis, zwiebel",
			"category": "Veggie Burger",
			"price": 14.5,
			"isAvailable": false
		},
		{
			"itemId": "3834e674-e3be-4240-b6b0-e5fe8c62db8a",
			"name": "Fritz Honeydew Melon 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "fa2a65a7-2b2e-4a8f-a254-77fefce25e77",
			"name": "Viva con Agua still 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3,
			"isAvailable": true
		},
		{
			"itemId": "a4da00d9-ac6b-4778-8b45-46fb3ad25749",
			"name": "Fritz Kola 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "ed884d9e-d396-4fa5-869a-341312cc0046",
			"name": "Cheese-Sauce",
			"category": "Beilagen - Saucen",
			"price": 4,
			"isAvailable": true
		},
		{
			"itemId": "c5a719e2-d85c-4825-89e9-ca6f45b99ce4",
			"name": "Bulgogi Mayo",
			"category": "Beilagen - Saucen",
			"price": 2,
			"isAvailable": true
		},
		{
			"itemId": "069ffb30-334e-4270-a45a-f2db9efb6985",
			"name": "Gochu Chick",
			"description": "Kimchi, Weißkohl, Knoblauch-Mayo, Gochujang-Ketchup, America",
			"category": "Fried Chicken Burger",
			"price": 13,
			"isAvailable": true
		},
		{
			"itemId": "c25eecb6-6441-4c47-88e7-d36c8ea3f5ce",
			"name": "Fritz Superzero 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "e64a4c49-4e88-4f23-8e0d-be8efba4c83a",
			"name": "Aktion Sumac Slap Veggie",
			"description": "Tomatenbutter, Joghurt, sumach zwiebeln, weiß kohl, American",
			"category": "Veggie Burger",
			"price": 14.5,
			"isAvailable": true
		},
		{
			"itemId": "58be35b1-a66f-48c8-a632-1b1a262ca7bb",
			"name": "Fried Chicken Thigh",
			"description": "Saftiger, marinierter, gepresster, frittierter Hähnchenschen",
			"category": "Beilagen - Saucen",
			"price": 5,
			"isAvailable": true
		},
		{
			"itemId": "820efd2f-69ed-4536-ac68-68476e34fd7d",
			"name": "Fritz Mischmasch 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "09b31359-813f-4ada-bd85-7e1f713bc47f",
			"name": "Sumac Slap",
			"description": "Tomatenbutter, Joghurt, sumach zwiebeln, weiß kohl, American",
			"category": "Smashed Beef Burger",
			"price": 10.5,
			"isAvailable": true
		},
		{
			"itemId": "ec88cee9-e5fc-4fc4-8247-140bfdc40a11",
			"name": "Field No. 7 Iced Tea Sparkeing Lemon 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": false
		},
		{
			"itemId": "670b8f10-db4a-4703-8b47-fb0110f696ab",
			"name": "Aktion Midnight Sando",
			"description": "Weißkohl, Teriyaki-Soße, Takuan-Rettich, Eiersalat, American",
			"category": "Fried Chicken Burger",
			"price": 16,
			"isAvailable": true
		},
		{
			"itemId": "5c0f3776-4fe9-4fb5-b3c0-923f8d520094",
			"name": "Aktion Fries",
			"description": "Hauchdünne, extra knusprige Pommes",
			"category": "Beilagen - Saucen",
			"price": 6,
			"isAvailable": true
		},
		{
			"itemId": "d38b1b59-a600-4ff9-a1b6-a69d18791bb1",
			"name": "Ketchup",
			"category": "Beilagen - Saucen",
			"price": 0.8,
			"isAvailable": true
		},
		{
			"itemId": "4fa07302-f566-46b1-b66b-949f317eda2b",
			"name": "Aktion The Classic Chicken",
			"description": "Frischer Salat, Tomate, Knoblauch-Mayo, American Cheese",
			"category": "Fried Chicken Burger",
			"price": 15,
			"isAvailable": true
		},
		{
			"itemId": "49190913-82ec-4b74-8c7e-21eed552dd77",
			"name": "Bussin' Bulgogi",
			"description": "Kimchi, Bulgogi-Mayo, Knoblauch-Mayo, American Cheese, Frühl",
			"category": "Smashed Beef Burger",
			"price": 10.5,
			"isAvailable": true
		},
		{
			"itemId": "e863268a-4719-45ca-b842-81347f00de24",
			"name": "Field No. 7 Iced Tea Cherry 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "3e7fa64e-ca1b-446b-b66b-7d34d416a431",
			"name": "Aktion Bussin' Bulgogi",
			"description": "Kimchi, Bulgogi-Mayo, Knoblauch-Mayo, American Cheese, Frühl",
			"category": "Smashed Beef Burger",
			"price": 13.5,
			"isAvailable": true
		},
		{
			"itemId": "20f18440-2d60-45da-b85f-8227c81da496",
			"name": "Field No. 7 Iced Tea Lemon 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "7c0f81fa-a689-4ec7-86cd-c40582c7951d",
			"name": "Cucumber Salad",
			"description": "Knackiger, herzhafter und scharfer chinesischer Gurkensalat",
			"category": "Beilagen - Saucen",
			"price": 4.5,
			"isAvailable": true
		},
		{
			"itemId": "29817ad9-c263-4e61-9cb4-5a5517a4e678",
			"name": "Sumac Slap Veggie",
			"description": "Tomatenbutter, Joghurt, sumach zwiebeln, weiß kohl, American",
			"category": "Veggie Burger",
			"price": 11.5,
			"isAvailable": false
		},
		{
			"itemId": "191807de-6096-4f6b-b3fe-d8643a0f07b2",
			"name": "Plantain Wahala",
			"description": "Gebratene Kochbanane, Erdnusssoße, Scotch-Bonnet-Chili, fris",
			"category": "Fried Chicken Burger",
			"price": 13,
			"isAvailable": false
		},
		{
			"itemId": "fd717797-85ee-4560-a9ba-2ca058ce656d",
			"name": "The Classic Chicken",
			"description": "Frischer Salat, Tomate, Knoblauch-Mayo, American Cheese",
			"category": "Fried Chicken Burger",
			"price": 12,
			"isAvailable": true
		},
		{
			"itemId": "837972b4-e655-4f88-807a-3f2bd1c06bee",
			"name": "Field No. 7 Iced Tea Mango-Pineapple 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "398e1d59-af74-4f11-9dc9-839b5e4967c2",
			"name": "Thai Basil Mayo",
			"category": "Beilagen - Saucen",
			"price": 2,
			"isAvailable": true
		},
		{
			"itemId": "59397789-0817-4f8f-8419-5fc7089f532c",
			"name": "Banging Bangkok Veggie",
			"description": "Thai laab (Thai basilikum, minze, koriander, chilis, zwiebel",
			"category": "Veggie Burger",
			"price": 11.5,
			"isAvailable": false
		},
		{
			"itemId": "4ea073e0-086e-45d0-a97e-9c6832a65880",
			"name": "Aktion Banging Bangkok",
			"description": "Thai laab (Thai basilikum, minze, koriander, chilis, zwiebel",
			"category": "Smashed Beef Burger",
			"price": 13.5,
			"isAvailable": false
		},
		{
			"itemId": "41fe1663-4600-4019-b901-5c20998e9c0b",
			"name": "Aktion Plantain Wahala",
			"description": "Gebratene Kochbanane, Erdnusssoße, Scotch-Bonnet-Chili, fris",
			"category": "Fried Chicken Burger",
			"price": 16,
			"isAvailable": true
		},
		{
			"itemId": "91c6314f-4e53-4fd2-8ee5-07c2bfbcdcbb",
			"name": "Banging Bangkok",
			"description": "Thai laab (Thai basilikum, minze, koriander, chilis, zwiebel",
			"category": "Smashed Beef Burger",
			"price": 10.5,
			"isAvailable": false
		},
		{
			"itemId": "a59768b1-cdcc-4f97-ae17-073358f78075",
			"name": "Fritz Apple 0,33l",
			"category": "Alkoholfreie Getränke",
			"price": 3.5,
			"isAvailable": true
		},
		{
			"itemId": "44b35c6e-d545-42df-bf6e-747a7a35c851",
			"name": "The Classic Smash Veggie",
			"description": "Gewürfelte Gewürzgurken, gewürfelte, weiße Zwiebeln, Chicago",
			"category": "Veggie Burger",
			"price": 9.5,
			"isAvailable": false
		},
		{
			"itemId": "f7ec6dde-c4a0-43b4-b0a9-ef69e8b35b07",
			"name": "The Classic Smash",
			"description": "Gewürfelte Gewürzgurken, gewürfelte weiße Zwiebeln, Chicago-",
			"category": "Smashed Beef Burger",
			"price": 8,
			"isAvailable": true
		}
	]
};

/** `needy_hammock/wolt-restaurant-menu-scraper`, read by the restaurant's URL */
export const WOLT_SLICE_SOCIETY: WoltItem = {
	"id": "687503e64f5b9ea7e869d926",
	"name": "Slice Society",
	"url": "https://wolt.com/en/deu/berlin/restaurant/slice-society173",
	"address": "Torstraße 173",
	"postCode": "10115",
	"rating": 3,
	"ratingScore": 8.6,
	"reviewCount": 200,
	"currency": "EUR",
	"tags": [],
	"estimateMinutes": null,
	"deliveryBasePriceInCents": 99,
	"menuItems": [
		{
			"id": "0033ec4665397acb871181b5",
			"name": "Mini Vodka Pizza",
			"description": "mit Vodkasoße, Fior di Latte, Mozzarella, Grana Padano, Basi",
			"priceInCents": 1600,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "0cf81e1829973f2869f70de4",
			"name": "Ranch",
			"description": "hausgemachte Ranch mit Buttermilch, Dill und Schnittlauch - ",
			"priceInCents": 250,
			"category": "DIPS 🌶"
		},
		{
			"id": "255387d98c865883083eb87d",
			"name": "Heineken 0,25 l",
			"description": "Lagerbier",
			"priceInCents": 300,
			"category": "ALKOHOLISCHE GETRÄNKE 🍺🍷\r"
		},
		{
			"id": "3be63baa43969e2730b32630",
			"name": "Half & Half Pizza",
			"description": "mit 2x Hälften deiner Wahl",
			"priceInCents": 2800,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "3ea1a128effa3619f569d16f",
			"name": "Vodka-Roni Pizza",
			"description": "mit Vodkasoße, Pepperoni vom Rind und Schwein, Fior di Latte",
			"priceInCents": 4000,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "3ed868c7b7e86f9c7a43afdd",
			"name": "Mini Tomato Garlic Pizza",
			"description": "mit Tomatensoße, Knoblauch-Butterbrösel, Chiliöl und Olivenö",
			"priceInCents": 1400,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "4ac960c91974ec19483c99cc",
			"name": "La Vigne D'Albert 0,75 l",
			"description": "Rotwein",
			"priceInCents": 2800,
			"category": "ALKOHOLISCHE GETRÄNKE 🍺🍷\r"
		},
		{
			"id": "6b6dbd7c274a8a0448f5d3f3",
			"name": "Coca-Cola® 0,2 l",
			"description": "Koffeinhaltiges Erfrischungsgetränk mit Pflanzenextrakten, Z",
			"priceInCents": 300,
			"category": "ALKOHOLFREIE GETRÄNKE 🥤"
		},
		{
			"id": "6daa978d833c3830e2712b16",
			"name": "Pepperoni Pizza",
			"description": "mit Tomatensoße, Fior di Latte, Mozzarella, Pepperoni vom Ri",
			"priceInCents": 3600,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "7b39ff77f5160f96fe2fa9c7",
			"name": "Iced Tea 0,35 l",
			"description": "hausgemachter Eistee",
			"priceInCents": 400,
			"category": "ALKOHOLFREIE GETRÄNKE 🥤"
		},
		{
			"id": "7ba855c6eab1ecfe9896ef2c",
			"name": "White Pizza",
			"description": "mit Ricotta, Taleggio, Mozzarella, Fior di Latte und Zitrone",
			"priceInCents": 3200,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "809ad04b544dc4001ab4264b",
			"name": "Spicy Tuna Pizza",
			"description": "mit Thunfisch, kalabrischer Chili, Mozzarella, Fior di Latte",
			"priceInCents": 4000,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "936b38118bfe82e276c606fb",
			"name": "Cheese Pizza",
			"description": "mit Tomatensoße, Fior di Latte, Mozzarella, Grana Padano und",
			"priceInCents": 2800,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "93c6ae28574225661a8ae098",
			"name": "Mini Cheese Pizza",
			"description": "mit Tomatensoße, Fior di Latte, Mozzarella, Grana Padano und",
			"priceInCents": 1400,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "a19dacac77e60549c2855d5d",
			"name": "Vodka Pizza",
			"description": "mit Vodkasoße, Fior di Latte, Mozzarella, Grana Padano, Basi",
			"priceInCents": 3200,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "afa51eb3013f1050218dbf4d",
			"name": "Chateau de Roquefort Petit Sale 0,75 l",
			"description": "Weißwein",
			"priceInCents": 2800,
			"category": "ALKOHOLISCHE GETRÄNKE 🍺🍷\r"
		},
		{
			"id": "be9c0b2e2115960623ddb4e4",
			"name": "Mini Vodka-Roni Pizza",
			"description": "mit Vodkasoße, Pepperoni vom Rind und Schwein, Fior di Latte",
			"priceInCents": 1900,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "c4c563d2a5999c355e9dfa4c",
			"name": "San Pellegrino 0,25 l",
			"description": "Natürliches Mineralwasser mit Kohlensäure",
			"priceInCents": 250,
			"category": "ALKOHOLFREIE GETRÄNKE 🥤"
		},
		{
			"id": "c5095755bb57a3e526716390",
			"name": "Acqua Panna 0,25 l",
			"description": "Natürliches Mineralwasser ohne Kohlensäure",
			"priceInCents": 250,
			"category": "ALKOHOLFREIE GETRÄNKE 🥤"
		},
		{
			"id": "cb6f928f5f5d90fdc437fd84",
			"name": "Coca-Cola® Zero 0,2 l",
			"description": "Kalorienfreies, koffeinhaltiges Erfrischungsgetränk mit Pfla",
			"priceInCents": 300,
			"category": "ALKOHOLFREIE GETRÄNKE 🥤"
		},
		{
			"id": "d004eb47f2286aad1682f6b8",
			"name": "Tomato Garlic Pizza",
			"description": "mit Tomatensoße, Knoblauch-Butterbrösel, Chiliöl und Olivenö",
			"priceInCents": 2800,
			"category": "NEW YORK PIZZEN ca. Ø 45 cm 🍕"
		},
		{
			"id": "d26d455dbaa640c445d4cd2b",
			"name": "Mini White Pizza",
			"description": "mit Ricotta, Taleggio, Fior di Latte und Zitrone",
			"priceInCents": 1600,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "e0c87bc01ccacc8bc1c54b9d",
			"name": "Mini Spicy Tuna Pizza",
			"description": "mit Thunfisch, kalabrischer Chili, Mozzarella, Fior di Latte",
			"priceInCents": 1900,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		},
		{
			"id": "eba9dc6858731b6443658d28",
			"name": "Chateau de Roquefort Corail 0,75 l",
			"description": "Roséwein",
			"priceInCents": 2800,
			"category": "ALKOHOLISCHE GETRÄNKE 🍺🍷\r"
		},
		{
			"id": "f4da1eedf979a5d86550486a",
			"name": "Mini Pepperoni Pizza",
			"description": "mit Tomatensoße, Fior di Latte, Mozzarella, Pepperoni vom Ri",
			"priceInCents": 1700,
			"category": "MINI NEW YORK PIZZEN ca. Ø 30 cm 🍕"
		}
	]
};

/**
 * `apify/google-search-scraper`: a chain's search on all three sites and on Wolt's alone, and a
 * one-venue brand's search (its Uber Eats and Lieferando pages; it is not on Wolt)
 */
export const GOOGLE_DELIVERY_PAGES: GoogleSearchPage[] = [
	{
		"searchQuery": {
			"term": "\"Burgermeister\" Berlin site:lieferando.de OR site:wolt.com OR site:ubereats.com",
			"page": 1
		},
		"organicResults": [
			{
				"url": "https://www.ubereats.com/de/store/burgermeister-alexanderplatz/QgHqqxYRUFyKOrihACmOfA?srsltid=AYCX9vLGx9xDy4B4gOXY8-5g91A28I2vyENzQmbZXJ8DrNM6iOmJUfF7",
				"title": "Geschäft: Burgermeister Alexanderplatz - Uber Eats"
			},
			{
				"url": "https://www.lieferando.de/lieferdienst/ketten/burgermeister",
				"title": "Burgermeister-Lieferung & Takeaway"
			},
			{
				"url": "https://www.ubereats.com/de/brand-city/berlin-be/burgermeister?srsltid=AYCX9vKSZ1Vxe_KLsw1-Xo145JFFJk4AclLXUUajBQ7JrDSA-ChjQrnn",
				"title": "Burgermeister Bestellen Online - Angebote, Menü & Preise"
			},
			{
				"url": "https://wolt.com/de/deu/berlin/district/schoneweide/brand/burgermeister?srsltid=AYCX9vKKd8Lwgr2gyNVSGeCV5k8EAGQqe2pPm5R_Q9To7PVAXHxWqx6b",
				"title": "Burgermeister | Berlin | Schöneweide | Online bestellen"
			},
			{
				"url": "https://www.lieferando.de/speisekarte/burgermeister-zehlendorf-eiche",
				"title": "Burgermeister Zehlendorf Eiche Berlin - Essen Bestellen"
			},
			{
				"url": "https://press.wolt.com/de-DE/266894-fan-favorite-neu-interpretiert-burgermeister-und-wolt-prasentieren-den-neuen-woltmeister-zum-fussballsommer/",
				"title": "Fan-Favorite neu interpretiert: Burgermeister und ..."
			},
			{
				"url": "https://press.wolt.com/de-DE/238033-burgermeister-setzt-bei-expansion-fur-ausweitung-des-liefergeschafts-wieder-auf-wolt/",
				"title": "Burgermeister setzt bei Expansion für Ausweitung des ..."
			},
			{
				"url": "https://press.wolt.com/de-DE/257421-wolt-und-burgermeister-starten-mit-dem-woltmeister-in-die-nachste-wachstumsphase/",
				"title": "Wolt und Burgermeister starten mit dem „Woltmeister“ in ..."
			},
			{
				"url": "https://wolt.com/en/deu/berlin/brand/burgermeister?srsltid=AYCX9vIbbwpUbqwS0iLuz3eFI2jRuePKKryeNjILU2W-L5dDGTGqhU_D",
				"title": "Burgermeister | Berlin | Order online"
			},
			{
				"url": "https://wolt.com/de/deu/berlin/restaurant/burgermeister-mehringdamm?srsltid=AYCX9vInt5vBuNUKA0-MfmqquF1WTKc1Dkz4pqmDiUN8yObX1qT0ATeM",
				"title": "Burgermeister Mehringdamm - Berlin"
			}
		]
	},
	{
		"searchQuery": {
			"term": "\"Burgermeister\" Berlin site:wolt.com",
			"page": 1
		},
		"organicResults": [
			{
				"url": "https://wolt.com/de/deu/berlin/district/schoneweide/brand/burgermeister?srsltid=AYCX9vLOgiZYB6F_0y97-YRvSGWHMeejun43EvrgQwQnQoqplKXePIER",
				"title": "Burgermeister | Berlin | Schöneweide | Online bestellen"
			},
			{
				"url": "https://wolt.com/de/deu/berlin/restaurant/burgermeister-schlostrae?srsltid=AYCX9vKGMEeCJ0pgiIzNfI3RVNj9c_yFv59uuXbcw5EiMsZGw5HiI70X",
				"title": "Burgermeister Schloßstraße | Wolt | Lieferservice | Berlin"
			},
			{
				"url": "https://wolt.com/en/deu/berlin/brand/burgermeister?srsltid=AYCX9vIec_HqVI71B7YtjzbzInYN85PBIpodQVb96t3y0pR-cRXfhA7D",
				"title": "Burgermeister | Berlin | Order online"
			},
			{
				"url": "https://wolt.com/de/deu/berlin/restaurant/burgermeister-hermannplatz?srsltid=AYCX9vJXig0sTPD6EkRnH-KUHSiouvwT-5RRS0Xzmw56jIzt0YTTWuEc",
				"title": "Burgermeister Hermannplatz - Berlin"
			},
			{
				"url": "https://wolt.com/de/deu/berlin/restaurant/burgermeister-alexanderplatz?srsltid=AYCX9vJnCF9zshxMC-ZJeYRrczEAvzu7SC6o0nTQJAt-AcpVUF4FAgp5",
				"title": "Burgermeister Alexanderplatz - Berlin"
			},
			{
				"url": "https://press.wolt.com/de-DE/266894-fan-favorite-neu-interpretiert-burgermeister-und-wolt-prasentieren-den-neuen-woltmeister-zum-fussballsommer/",
				"title": "Fan-Favorite neu interpretiert: Burgermeister und ..."
			},
			{
				"url": "https://wolt.com/de/deu/berlin/district/tempelhof/brand/burgermeister?srsltid=AYCX9vJrNnCkXin-p_213EBe0EopEQ8L7RoTee0vy95sccsORyv8Q2QO",
				"title": "Burgermeister | Berlin | Tempelhof | Online bestellen"
			},
			{
				"url": "https://press.wolt.com/de-DE/238033-burgermeister-setzt-bei-expansion-fur-ausweitung-des-liefergeschafts-wieder-auf-wolt/",
				"title": "Burgermeister setzt bei Expansion für Ausweitung des ..."
			},
			{
				"url": "https://wolt.com/de/deu/berlin/deu_burgermeister_nov25?srsltid=AYCX9vLQ-V8XnTvnqFNm8FFbuxTSjQcNBPJEf4ckOIQCmx8NKtj9xPT-",
				"title": "Burgermeister | Berlin | 30 Min. Lieferung"
			},
			{
				"url": "https://press.wolt.com/de-DE/257421-wolt-und-burgermeister-starten-mit-dem-woltmeister-in-die-nachste-wachstumsphase/",
				"title": "Wolt und Burgermeister starten mit dem „Woltmeister“ in ..."
			}
		]
	},
	{
		"searchQuery": {
			"term": "\"The Bun Society\" Berlin site:lieferando.de OR site:wolt.com OR site:ubereats.com",
			"page": 1
		},
		"organicResults": [
			{
				"url": "https://www.ubereats.com/de/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw?srsltid=AYCX9vIRZP_jdxbJPGqQ2T6vb5wOX2ofDt2Dxh_o2raIi9dIbuHylz2O",
				"title": "Lieferungen von The Bun Society | Speisekarte & Preise"
			},
			{
				"url": "https://www.ubereats.com/de-en/store/the-bun-society/aSPb8zC6UmqrZMgi5HzFGw?srsltid=AYCX9vIgMkta6-3BVaUZBWvUjUJXuNTQNU7SaPMIVRQDk6qGbXHrBjq4",
				"title": "The Bun Society Delivery | Menu & Prices | Berlin"
			},
			{
				"url": "https://www.lieferando.de/speisekarte/the-bun-society",
				"title": "The Bun Society Berlin - Essen Bestellen"
			},
			{
				"url": "https://www.ubereats.com/de/dish/berlin-be/fried-calamari?srsltid=AYCX9vLi1ddA0MAWUbJM9zSPCgX8CAzqDkvAScGIGNA3AjptRPdH-iMb",
				"title": "Uber Eats"
			},
			{
				"url": "https://www.ubereats.com/de/dish/berlin-be/mongolian-beef?srsltid=AYCX9vKWab38EuK8AC63wjlgK8lRlal7gOB2oSaSXYYWWTKoKkdK_eML",
				"title": "Uber Eats"
			},
			{
				"url": "https://www.ubereats.com/de/dish/berlin-be/veggie-wrap?srsltid=AYCX9vJVGJVP52tImHwEhYO37IxPUjPG_EepK_mklLs_aUGynYiqUAUw",
				"title": "Uber Eats"
			},
			{
				"url": "https://www.ubereats.com/de/dish/berlin-be/french-fries?srsltid=AYCX9vKNs3-B1oB_oH_lt3QnGWl7fEzRNS9tSf8v2XxRYcZrrSuxhdDB",
				"title": "Uber Eats"
			},
			{
				"url": "https://www.lieferando.de/lieferservice/burger/berlin-10179",
				"title": "Burger bestellen in 10179 Berlin Mitte"
			},
			{
				"url": "https://www.ubereats.com/de/dish/ahrensfelde-bb/roast-chicken?srsltid=AYCX9vID3s43cIuS6ka4A8FrelvItOXiTy06vQ1Pc2bcwNI7PCGRuIb5",
				"title": "Uber Eats"
			},
			{
				"url": "https://www.ubereats.com/de-en/category/berlin-be/burger?page=2&srsltid=AYCX9vKj3Y0umRX8lkMxrrw7BD3EbmPXuEdJE6bz9d-2VGpNeoe0SAIS",
				"title": "THE 10 BEST Burgers Delivery in Berlin 2023"
			}
		]
	}
];
