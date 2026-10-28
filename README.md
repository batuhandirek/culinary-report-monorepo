# Munchwerk

Monthly social media reports for restaurants, bars and cafés. NestJS backend + SvelteKit frontend in one npm workspace (Turborepo). Conventions for people and agents: `CLAUDE.md`.

This is a new app: it has never been deployed, and there is no production database. The local dev database is the only data.

## First run

```sh
nvm use                                         # Node 24
npm install && npm run typia:setup              # typia needs the patched TypeScript
cp env/server/.env.example env/server/.env.local   # then set DB_PASSWORD and JWT_SECRET
cp env/web/.env.example env/web/.env
npm run db:up                                   # Postgres (pgvector) on :5441
npm run migration:up:dev
npm run start:dev                               # API :3015, web :5011
```

In development email, SMS, Telegram and OTP are disabled: every verification code is `VERIFICATION_DEFAULT_CODE` (`111111`).

To make an account an admin, set its roles in the database:

```sh
docker exec culinary-report-dev-db psql -U postgres -d culinary_report \
  -c "update users set roles = '{user,admin}' where email = 'you@example.com'"
```

## Data

The admin panel (`/admin`) has Venues, Posts, Reports and Pipeline. The pipeline scrapes through Apify (`APIFY_TOKEN`) and analyses with OpenAI (`OPENAI_API_KEYS`, one key per account, rotated); a monthly run starts by itself on the 2nd of each month for the month before, and any step can be started from `/admin/pipeline`.

Data collected by the earlier scripts repo was imported once with `python3 bin/import-culinary-sqlite.py <path to culinary.db>`.

## Everyday commands

- `npm run backend:test` — unit and PGlite suites.
- `npm run create:client` — regenerate the API client after an endpoint or DTO change.
- `npm run migration:create:dev` / `npm run migration:up:dev` — after an entity change.



- "Drei Berlin" news search is useless

FUTURE:
- "https://console.apify.com/actors/nrQeUJPbeJLVVsXPH/info/readme?build=latest"


IDEAS:
- We need 'report scheduling' - maybe twice a month, weekly etc.


UI:
- Put instagram/tiktok logos in the admin in Creators
- Venue and Brand page details should 


DATA:
- Facebook
- https://tasteandstories.de/neue-restaurants-berlin/ -> Has new openings
- https://www.yelp.com/biz/schnitzelei-mitte-berlin?osq=Dinner#reviews 
- https://www.tripadvisor.com
- https://www.opentable.de/ (For reviews?)


Question:
- Why admin/posts/a1f0729b-c690-484a-b46a-0993f2c7c617 does not have Samurai Berlin tagged?
	- There is an address on the post, cant we match with it?
	- There is an handle there, can't we use that?
- Should we do user/creator profiling?
	- Tends to leave X kind of reviews
	- Better suggestion of who can I invite to the venue
	- Who are local, who are not
- 'Ayran' is not a thing currently? Also, "ginger beer" is under "beer" - does it make sense?
	- I think we need 

Report sections:
- Upcoming "New Year's / Halloween etc." - what can be done kind of suggestion?
 
