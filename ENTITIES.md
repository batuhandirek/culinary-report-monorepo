# Entities and how they connect

A snapshot of the MikroORM entities in `apps/backend/src/modules/*/entities/` (50 tables), drawn by area.

- **Solid line**: a foreign key (`@ManyToOne` / `@OneToOne` / `@ManyToMany`).
- **Dotted line**: a soft link. The row only holds text or ids in jsonb, and code resolves it on read. The database doesn't enforce it, and you can't join on it directly.
- Crow's feet: `||` exactly one, `o|` zero or one, `}o` zero or many. Labels are the field names.

## 1. The product core: venues, posts, reviews, reports

```mermaid
erDiagram
    City ||--o{ Venue : "city"
    Brand ||--o{ Venue : "brand (a branch)"
    City ||--o{ SocialPost : "city"
    City ||--o{ SocialAccount : "city (found by)"

    Creator ||--o{ SocialAccount : "creator"
    Brand |o--o{ SocialAccount : "brand (own account)"
    Venue |o--o{ SocialAccount : "branch (own account)"
    Brand |o--o{ SocialAccount : "suggestedBrand"
    SocialAccount ||--o{ SocialAccountSnapshot : "account"
    SocialAccount |o--o{ SocialPost : "account"

    SocialPost ||--o{ Mention : "post"
    SocialPost ||--o{ PostComment : "post"
    Brand |o--o{ Mention : "brand (matched)"
    Venue |o--o{ Mention : "venue (matched branch)"

    Venue ||--o{ Review : "venue"

    Brand ||--o{ Report : "brand"
    City |o--o{ Report : "city (null = all cities)"
    Report ||--o{ ReportShare : "report"
    User |o--o{ ReportShare : "createdBy"

    Brand ||--o{ BrandCompetitor : "brand"
    Venue |o--o{ BrandCompetitor : "branch"
    Venue |o--o{ BrandCompetitor : "venue (rival place)"
    Brand |o--o{ BrandCompetitor : "rival (rival brand)"

    FoodTopic |o--o{ FoodTopic : "parent"
    Venue ||--o{ VenueFoodTopic : "venue"
    FoodTopic ||--o{ VenueFoodTopic : "topic (admin tag/exclusion)"

    Mention }o..o{ FoodTopic : "cuisine + dishes[].name (text, matched on read)"
    Review }o..o{ FoodTopic : "dishes[].name (text, matched on read)"
    Venue }o..o{ FoodTopic : "category, categories (text, matched on read)"
    Mention }o..o| City : "city (text the LLM read)"
    Brand }o..o{ Venue : "excludedVenueIds (jsonb)"
    SocialAccount }o..o{ Brand : "rejectedBrandIds (jsonb)"

    Mention {
        text venueName
        text cuisine "free text"
        jsonb dishes "FeedbackDish[]: name, sentiment"
        jsonb praise
        jsonb complaints
        text sentiment
    }
    Review {
        text text
        int stars
        jsonb dishes "FeedbackDish[]"
        jsonb praise
        jsonb complaints
    }
    Venue {
        text placeId "Google Maps"
        text category
        jsonb categories
    }
    FoodTopic {
        text key "e.g. burgers"
        text label
        enum kind "cuisine|dish|drink|diet|format|meal"
        jsonb aliases
    }
    Report {
        text month "YYYY-MM"
        jsonb data "ReportData"
    }
```

## 2. Data hanging off a venue

```mermaid
erDiagram
    Venue ||--o{ VenueSnapshot : "venue"
    Venue ||--o{ VenueStatusChange : "venue"
    Venue ||--o{ VenueSearchRank : "venue"
    Venue ||--o{ VenueBusyness : "venue"
    Venue ||--o{ VenueReservationSample : "venue"
    Venue ||--o{ WebMention : "venue"
    Venue ||--o{ VenueDeliveryListing : "venue"
    VenueDeliveryListing ||--o{ MenuItem : "listing"
    Venue |o--o{ OsmPlace : "venue (matched)"
    City ||--o{ OsmPlace : "city"
    City ||--o{ VenueLookup : "city"
    Image |o--o{ Venue : "favicon"

    MenuItem }o..o{ FoodTopic : "name, category (text, matched on read)"
```

## 3. City-level: pipeline, trends, published pages

```mermaid
erDiagram
    City ||--o{ CitySource : "city"
    City ||--o{ CityDay : "city"
    City ||--o{ CityEvent : "city"
    City ||--o{ PipelineRun : "city"
    City ||--o{ CityHighlight : "city (monthly public page)"
    City ||--o{ FoodTrendsReport : "city (quarterly public page)"

    City ||--o{ TrendSearchInterest : "city"
    FoodTopic |o--o{ TrendSearchInterest : "topic"
    Brand |o--o{ TrendSearchInterest : "brand"
    City ||--o{ TrendRelatedQuery : "city"
    FoodTopic |o--o{ TrendRelatedQuery : "topic"
    Brand |o--o{ TrendRelatedQuery : "brand"

    PipelineRun |o..o{ ApifyRun : "pipelineRunId (plain id)"
```

## 4. Accounts, sales, blog

```mermaid
erDiagram
    User ||--o{ UserSession : "user"
    User |o--o{ CredentialVerificationRequest : "user"
    User ||--o{ NotificationPreference : "user"
    User ||--o{ Notification : "user"
    User |o--o| Image : "profileImage"

    User ||--o{ BrandMember : "user"
    Brand ||--o{ BrandMember : "brand (portal access)"
    User |o--o{ BrandMember : "invitedBy"

    Brand ||--o| Prospect : "brand (one-to-one)"
    Prospect ||--o{ OutreachTouch : "prospect"

    User |o--o{ BlogEntry : "author"
    Image |o--o{ BlogEntry : "coverImage"
    BlogEntry }o--o{ BlogTag : "tags"
```

## Standalone tables (no foreign keys)

| Entity | What it is | Soft links |
|---|---|---|
| `ApifyRun` | One paid Apify actor run and its cost | `pipelineRunId`, `stepKey` (plain text) |
| `BrandDismissal` | An admin's "not one brand" on a brand suggestion | `key` is a `brandKey` |
| `FoodTopicIgnoredWord` | A cuisine word that maps to no topic ("supermarket") | `key` is a `normalizeCuisine` key |
| `Embedding` | A cached embedding vector for an input string | none |
| `FsmStateChange` | Audit row for the state-machine engine | `ownerType` + `ownerId` (polymorphic; no machine uses it today) |
| `Image` | An uploaded or remote image/video | referenced by `User`, `Venue`, `BlogEntry` |

## Notes

- **Brand vs Venue**: a `Brand` is the business, a `Venue` is one of its branches (a Google Maps place). Reports, outreach, competitors and portal access are per brand. Reviews and most venue data are per branch.
- **Food topics**: only `VenueFoodTopic` (admin tags) and the two trends tables have a foreign key to `FoodTopic`. Posts, reviews, menus and Google categories reach topics only through text matching at read time (`FoodTopicIndex` in `modules/food-topics/util/food-topics.ts`).
- **jsonb snapshots**: `Report.data`, `CityHighlight.data` and `FoodTrendsReport.data` are built documents. They copy names and numbers from the tables above and don't reference them.
