The main reason you are getting underwhelming results—and blowing through your token budget on Agent B—is **context severing between Agent A and Agent B**.

By having Agent A split a review into short sentences (`"it costs €8"`, `"the döner was too salty"`) and then calling Agent B **once per sentence in isolation**, you create three compounding problems:

1. **Orphaned Context (Why accuracy drops):** When Agent B sees `"it costs €8"` or `"it got worse"` by itself, it no longer sees the rest of the review. It doesn't know *what* costs €8 (the döner? the drink? parking?), nor whether €8 was praised as a bargain (*"huge portion for only €8!"*) or criticized as a rip-off (*"€8 for a tiny side of fries"*). So `mini` guesses `Sentiment: neutral`, `Foods: []`, and `Aspect: price`—making that data point useless for dish-level pricing charts.
2. **Repeated Prompt Overhead (Why Agent B eats all your tokens):** If one social post has 8 claims, Agent B runs **8 separate API calls**. Every call re-sends your system prompt, aspect definitions, and schema (typically 400–800 input tokens). Roughly **85% of Agent B's tokens are just repeating the instructions** for every single sentence.
3. **Blind Venue Matching (Why places and claims get mixed up):** Because the Matcher runs *after* Agent A extracts place names from the text, Agent A has to guess venue names in a vacuum—missing venues hidden in `@handles`, location tags, or local nicknames, and struggling to link claims to the right venue in "Top 5 spots" posts.

---

## The Fix: Merge A + B into One Call and Move Matching First

If you merge Agent A and Agent B into a **Single-Pass Atomic Extractor**, `gpt-5.4` is *already* reading the review once. Asking it to output the labels (`aspect`, `sentiment`, `foods`, `kind`, `amount`) inside the same JSON array as the `claim` adds **zero extra input tokens** and only ~25 output tokens per claim.

### The Token Math (Per 100 Posts, Avg. 6 Claims/Post)

| Architecture | API Calls | Est. Input Tokens | Est. Output Tokens | Model Tier |
| --- | --- | --- | --- | --- |
| **Current:** Agent A (1x/post) + Agent B (6x/post) | **700 calls** | ~420,000 tokens | ~65,000 tokens | A on `gpt-5.4`, B forced onto `mini` |
| **Merged:** Single-Pass A+B (1x/post) | **100 calls** | **~85,000 tokens** | ~45,000 tokens | **Both A & B run on `gpt-5.4**` |

By merging A and B, your total token usage drops by **~75%**, allowing you to run the entire extraction and labeling step on `gpt-5.4` within your free token allowance while eliminating `mini`'s labeling mistakes.

---

## A Better 3-Stage Pipeline

### Stage 1: The Pre-Matcher (Code + Trigram Search, 0 LLM Tokens)

Move **The Matcher** to the very beginning of the pipeline *before* calling the LLM:

* **For Maps Reviews:** You already have the exact `venue_id` from the scrape.
* **For IG, TikTok, and Reddit:** Run a fast database lookup (Postgres `pg_trgm` fuzzy match + `@handle` lookup + location tag match) against the raw caption/title to pull the **top 3–5 candidate venues** from your database.
* Pass those candidates (e.g., `[ven_102: "Bahadur Tandoori (Wilmersdorf)", ven_409: "Bahaadur Shawarma (Neukölln)"]`) into the Stage 2 prompt. Now `gpt-5.4` selects the exact `venue_id` while reading the post instead of guessing a string for a matcher to clean up later.

### Stage 2: The Unified Extractor (Replaces Agent A + Agent B on `gpt-5.4`)

Run **once per review/post** (or batch 5 short Google Maps reviews into a single call to save even more system-prompt tokens). Instead of outputting isolated sentences first, instruct `gpt-5.4` to output **self-contained atoms** using OpenAI's **Structured Outputs (`strict: true`)**:

* **Rule 1 (No pronouns in claims):** Never output `"it costs €8"`. Resolve pronouns using the full review so every claim is self-contained (`"The beef döner costs €8"`).
* **Rule 2 (Carry the food entity onto price/wait/portion claims):** If someone says *"The dürüm was €8 and took 20 minutes"*, emit two atoms—one for `price` (`amount: 8`, `foods: ["dürüm"]`) and one for `wait_time` (`foods: ["dürüm"]`).
* **Rule 3 (Distinguish Price Fact vs. Value Sentiment):** If a review just states a price (`"Döner is €8"`), `sentiment` is `neutral` and `kind` is `fact`. If they judge the price (`"€8 is a steal"` or `"overpriced at €8"`), `sentiment` is `positive`/`negative` and `kind` is `opinion`.

**Example Stage 2 JSON Output Schema:**

```json
{
  "is_ad_or_promo": false,
  "ad_signals": [],
  "atoms": [
    {
      "venue_id": "ven_102",
      "unmatched_venue_name": null,
      "claim": "The beef döner was too salty",
      "aspect": "taste",
      "sentiment": "negative",
      "kind": "opinion",
      "foods": ["beef döner"],
      "amount": null
    },
    {
      "venue_id": "ven_102",
      "unmatched_venue_name": null,
      "claim": "The beef döner costs €8, which is fair for the large portion",
      "aspect": "price_value",
      "sentiment": "positive",
      "kind": "opinion",
      "foods": ["beef döner"],
      "amount": { "value": 8.0, "currency": "EUR", "unit": "price" }
    }
  ]
}

```

### Stage 3: Cached 2-Level Filer (Upgrades Agent C)

Right now, if Agent C files `"Döner"`, `"Dürüm"`, and `"kebab"` under one flat topic, your charts can't answer *"Do people prefer our Dürüm wrap or our classic Döner in bread?"* Conversely, if it calls an LLM every time `"Döner"` appears, you waste tokens and risk the LLM filing it slightly differently each day.

1. **Put a Database Lookup Table in front of Agent C:** Normalize every extracted food string (`lowercase`, trim plurals/accents) and check a `food_dictionary` table in your database. After your first few thousand reviews, **90%+ of food mentions (`"döner"`, `"pommes"`, `"ayran"`) will match instantly in SQL for 0 tokens**.
2. **Batch Only *New* Words to Agent C:** Collect only the unseen food words (say, 50 new terms at a time) and send them to Agent C in **one single batch call**.
3. **Use a 2-Level Filing System instead of 1:** Have Agent C file every new term into two columns:
* **`category` (For high-level charts):** e.g., `Döner & Kebabs`, `Burgers`, `Sides`, `Drinks`
* **`canonical_dish` (For item-level drilldowns):** e.g., `"Döner im Brot"` vs. `"Dürüm"` vs. `"Halloumi Döner"`



---

## Side-by-Side: Why Your Results Will Immediately Improve

Take a real-world sentence like:

> *"Went to Bahadur last night—waited 25 mins in the rain, and while the garlic sauce is way thinner than last year, €7.50 for a massive lamb dürüm is still unbeatable."*

* **Your Old Pipeline:**
* **Agent A** splits it into: 1. `"waited 25 mins in the rain"`, 2. `"the garlic sauce is way thinner than last year"`, 3. `"it costs €7.50"`, 4. `"the lamb dürüm is massive and unbeatable"`.
* **Agent B (`mini`)** processes `"it costs €7.50"` alone → forgets it's about the lamb dürüm, marks sentiment as `neutral` instead of `positive`. Processes `"the garlic sauce is way thinner than last year"` → `mini` often misses that `"thinner"` for garlic sauce is `negative` + `kind: change`.


* **The Merged `gpt-5.4` Pipeline:**
* Reads the sentence once with full context, resolves `"Bahadur"` to `ven_102`, and outputs **4 rich, linked atoms** in one shot:
1. `wait_time` | `negative` | `fact` | `amount: 25 mins`
2. `taste` | `negative` | `change` | `foods: ["garlic sauce"]` (*"Garlic sauce became thinner than last year"*)
3. `portion_size` | `positive` | `opinion` | `foods: ["lamb dürüm"]`
4. `price_value` | `positive` | `opinion` | `foods: ["lamb dürüm"]` | `amount: €7.50`


