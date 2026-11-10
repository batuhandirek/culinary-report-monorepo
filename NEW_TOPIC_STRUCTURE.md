To design a state-of-the-art (SOTA) architecture for food-culture analytics, the most important mental shift is separating **how people write words** from **how concepts exist in the real world**, and separating **canonical concepts** from **ad-hoc combinations** in a review.

In companies that build large-scale food knowledge graphs (like Uber Eats, DoorDash, or Yelp), this is modeled as a **Three-Layer Architecture**:

1. **The Lexical Layer (Aliases):** Surface strings, typos, translations, and slang (`"Melemen"`, `"menemen"`, `"Pommes"`, `"Fritten"`).
2. **The Conceptual Layer (The Ontology Graph):** Real-world canonical entities (`Menemen`, `Fries`, `Turkish Cuisine`, `Breakfast`, `Vegan`, `Price`) connected by typed, directed edges.
3. **The Evidence Layer (Claims & Mentions):** What a reviewer actually said (`"the vegan döner was great but €15"`), linking the claim to concepts and modifiers.

---

## 1. Visual Overview: Old Model vs. State-of-the-Art

### Why the Old Model Breaks

In your current design, **strings carry the knowledge**. Because relationships (`kind_of`, `with`) are attached directly to the raw wording, every typo or translation has to duplicate the entire world's knowledge:

```text
OLD MODEL (Knowledge trapped on raw strings)
────────────────────────────────────────────
Wording: "menemen" ──(same)────► [Topic: Menemen] ──(parent)──► [Topic: Turkish]
                   ──(kind_of)─► [Topic: Breakfast]

Wording: "Melemen" ──(same)────► [Topic: Menemen] ──(parent)──► [Topic: Turkish]
  (Missing "kind_of -> Breakfast" unless someone manually adds it to the typo!)

```

### The SOTA Model

In a state-of-the-art Knowledge Graph, **strings are dumb pointers** (`Aliases`) that resolve to a single `Concept`. All domain knowledge lives once inside the **Concept Graph**:

```text
SOTA MODEL (Lexicon separated from Knowledge Graph)
───────────────────────────────────────────────────
LEXICAL LAYER             CONCEPTUAL LAYER (Ontology DAG)
(Raw Spellings)           (Canonical Nodes & Typed Edges)

"menemen" ──┐                                  ┌──(HAS_CUISINE)──► [Turkish]
"Melemen" ──┼─(alias_of)─► [Concept: Menemen] ─┼──(IS_A)─────────► [Egg Dish]
"मेनेमेन"   ──┘                                  └──(SERVED_AT)────► [Breakfast]

"Pommes"  ──┐
"Fritten" ──┼─(alias_of)─► [Concept: Fries]   ────(IS_A)─────────► [Side Dish]
"Chips"   ──┘                                 ────(MADE_OF)──────► [Potato]

```

Once `"Melemen"` is mapped as an alias of `[Concept: Menemen]`, it automatically inherits `Turkish`, `Egg Dish`, and `Breakfast` forever.

---

## 2. Solving the `"vegan döner"` Problem: Pre-Coordination vs. Composition

The hardest problem in food analytics is handling phrases like `"vegan döner"`, `"spicy chicken ramen"`, or `"iced oat matcha latte"`.

Why did 7,900 of your wordings lack an exact topic? Because **reviewers don't just name dishes; they combine a base dish with modifiers** (diets, ingredients, preparations). If you create a brand-new node in your ontology for every combination someone writes (`"extra spicy gluten-free chicken ramen"`), your graph explodes into tens of thousands of sparse nodes.

State-of-the-art food graphs solve this using **Compositional Mentions (Post-Coordination)** alongside **Canonical Concepts (Pre-Coordination)**:

### How It Works Visually

```text
EVIDENCE LAYER (The Review Claim)
Claim #402: "The vegan döner was great, though €15 is steep"
 ├── Sentiment: Positive (on Food), Negative (on Price)
 ├── Aspect Link: ──────────────────────────────► [Aspect: Price Level]
 └── Food Mention: raw_text = "vegan döner"
      ├── Head Concept: ────────────────────────► [Concept: Döner]
      └── Applied Modifiers: ───────────────────► [Concept: Vegan]

```

And if **`Vegan Döner`** becomes a massive cultural phenomenon in its own right (which you want to track on its own dedicated page, benchmark, and trend line), you **promote** it to a pre-coordinated `Concept` in the graph:

```text
PROMOTED CONCEPT IN THE GRAPH (When a combination is culturally significant)
"vegan döner"   ──┐
"veganer döner" ──┼─(alias_of)─► [Concept: Vegan Döner] ──(IS_A)─────► [Concept: Döner]
"vöner"         ──┘                                     ──(HAS_DIET)─► [Concept: Vegan]

```

**Why this dual capability is SOTA:**

* **Common/Cultural dishes** (`Vegan Döner`, `Margherita Pizza`, `Matcha Latte`) get their own `Concept` node in the graph.
* **Long-tail combinations** (`"lukewarm gluten-free garlic bread"`, `"spicy mango curry"`) don't pollute your ontology with thousands of junk nodes—the mention simply points to `Head: Garlic Bread` + `Modifier: Gluten-Free`, so **neither `Garlic Bread` nor `Gluten-Free` ever loses a single count.**

---

## 3. Concrete Entity Definitions (The SOTA Schema)

Here is how you structure the database tables cleanly from scratch.

### A. The Ontology Layer (`concepts` & `concept_edges`)

Instead of forcing everything into a single `parent_id` or vague `with` links, give nodes a `domain` and `kind`, and connect them with explicit semantic edge types.

```sql
-- 1. CONCEPTS: Every canonical thing in your universe
CREATE TYPE concept_domain AS ENUM ('food', 'experience');

CREATE TYPE concept_kind AS ENUM (
  -- Food domain:
  'cuisine',      -- Turkish, Japanese, Levantine
  'dish',         -- Menemen, Döner, Ramen, Fries
  'drink',        -- Ayran, Matcha Latte, Natural Wine
  'ingredient',   -- Chicken, Chickpea, Halloumi, Oat Milk
  'diet',         -- Vegan, Halal, Gluten-Free, Kosher
  'meal_period',  -- Breakfast, Lunch, Late Night, Brunch
  'Preparation',  -- Fried, Wood-Fired, Hand-Pulled, Iced
  'venue_format', -- Imbiss, Izakaya, Bakery, Fine Dining
  -- Experience domain (Aspects):
  'aspect_group', -- Taste, Price, Waiting, Service, Ambience (Roots)
  'aspect'        -- Queue, Portion Size, Value for Money, Friendly Staff
);

CREATE TABLE concepts (
  id          UUID PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,        -- e.g., 'menemen', 'doner-kebab', 'vegan'
  label       TEXT NOT NULL,               -- e.g., 'Menemen', 'Döner & Kebab', 'Vegan'
  domain      concept_domain NOT NULL,
  kind        concept_kind NOT NULL,
  description TEXT,                        -- Short definition used by LLM for disambiguation
  embedding   VECTOR(1536),                -- For semantic search / nearest-concept lookup
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

```

```sql
-- 2. CONCEPT EDGES: The Directed Acyclic Graph (DAG)
CREATE TYPE edge_type AS ENUM (
  'IS_A',          -- Taxonomic parent (Ramen -> Noodle Soup; Queue -> Waiting)
  'HAS_CUISINE',   -- Cultural origin (Menemen -> Turkish; Ramen -> Japanese)
  'SERVED_AT',     -- Meal occasion (Menemen -> Breakfast)
  'HAS_INGREDIENT',-- Core component (Menemen -> Egg; Falafel -> Chickpea)
  'HAS_DIET',      -- Inherent dietary property (Falafel -> Vegan; Vegan Döner -> Vegan)
  'PREPARED_AS'    -- Method (Pommes -> Deep Fried)
);

CREATE TABLE concept_edges (
  source_id   UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  target_id   UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  type        edge_type NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE, -- Marks the primary breadcrumb/display parent
  created_by  TEXT NOT NULL,                  -- 'seed', 'ai', 'admin'
  PRIMARY KEY (source_id, target_id, type)
);

```

### B. The Lexical Layer (`aliases`)

An alias has **zero** graph edges. It only maps a normalized string (optionally scoped by language or locale) to either a single `Concept` or a canonical decomposition (`head + modifiers`).

```sql
-- 3. ALIASES: Every surface wording / spelling people actually write
CREATE TYPE alias_status AS ENUM ('pending', 'mapped', 'ignored');

CREATE TABLE aliases (
  id              UUID PRIMARY KEY,
  raw_text        TEXT NOT NULL,               -- "Melemen", "Pommes", "vegan döner"
  normalized_text TEXT UNIQUE NOT NULL,        -- "melemen", "pommes", "vegan doner"
  status          alias_status NOT NULL DEFAULT 'pending',
  
  -- What this wording resolves to:
  concept_id      UUID REFERENCES concepts(id),-- Primary concept (e.g., Menemen, or Döner)
  modifier_ids    UUID[] DEFAULT '{}',         -- Optional modifier concepts (e.g., [Vegan] if not a standalone concept)
  
  decided_by      TEXT,                        -- 'exact_match', 'ai', 'admin'
  decided_at      TIMESTAMPTZ
);

```

*Look at what `modifier_ids` on `aliases` does for you:*

* For `"Melemen"`: `concept_id = Menemen`, `modifier_ids = []`.
* For `"vegan döner"` (if you haven't created a `Vegan Döner` node): `concept_id = Döner`, `modifier_ids = [Vegan]`.
* For `"vegan döner"` (if you **do** create a `Vegan Döner` node): `concept_id = Vegan Döner`, `modifier_ids = []` (because `Vegan Döner` already has a `HAS_DIET -> Vegan` edge in `concept_edges`).
* In **both** cases, you never lose the `Vegan` relationship, and if `"veganer döner"` comes in tomorrow, it resolves identically!

### C. The Evidence Layer (`claims` & `claim_mentions`)

```sql
-- 4. CLAIMS: Atomic statements extracted from reviews/posts
CREATE TABLE claims (
  id          UUID PRIMARY KEY,
  source_id   UUID NOT NULL,                   -- The review or social post
  venue_id    UUID NOT NULL,
  text        TEXT NOT NULL,                   -- "the döner was great but €15"
  sentiment    TEXT NOT NULL,                   -- 'positive', 'negative', 'neutral'
  aspect_id   UUID REFERENCES concepts(id),    -- Points to 'Taste', 'Price Level', 'Queue'
  created_at  TIMESTAMPTZ NOT NULL
);

-- 5. CLAIM MENTIONS: Links a claim to the food phrases mentioned inside it
CREATE TABLE claim_mentions (
  claim_id    UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  alias_id    UUID NOT NULL REFERENCES aliases(id),
  PRIMARY KEY (claim_id, alias_id)
);

```

---

## 4. Fast Graph Rollups: The Transitive Closure Table

Walking a graph recursively at query time (`WITH RECURSIVE`) can get slow and complex when you want to filter by edge types. The SOTA pattern is maintaining a precomputed **Transitive Closure Table** (`concept_closure`) that flattens every valid path in the graph. Because your ontology only has a few hundred to a few thousand `concepts`, rebuilding this table takes milliseconds.

```sql
CREATE TABLE concept_closure (
  descendant_id     UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  ancestor_id       UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  min_depth         INT NOT NULL,          -- 0 for self, 1 for direct edge, 2+ for transitive
  only_taxonomic    BOOLEAN NOT NULL,      -- TRUE if reachable purely via IS_A / HAS_CUISINE edges
  path_edge_types   edge_type[] NOT NULL,  -- e.g., '{IS_A, HAS_CUISINE}'
  PRIMARY KEY (descendant_id, ancestor_id)
);

```

### Example: What `concept_closure` stores for `[Concept: Menemen]`

| `descendant_id` | `ancestor_id` | `min_depth` | `only_taxonomic` | Why is this row here? |
| --- | --- | --- | --- | --- |
| `Menemen` | `Menemen` | 0 | `true` | Every node reaches itself at depth 0 |
| `Menemen` | `Egg Dish` | 1 | `true` | `Menemen --(IS_A)--> Egg Dish` |
| `Menemen` | `Turkish` | 1 | `true` | `Menemen --(HAS_CUISINE)--> Turkish` |
| `Menemen` | `Middle Eastern` | 2 | `true` | `Menemen -> Turkish --(IS_A)--> Middle Eastern` |
| `Menemen` | `Breakfast` | 1 | `false` | `Menemen --(SERVED_AT)--> Breakfast` |
| `Menemen` | `Egg` | 1 | `false` | `Menemen --(HAS_INGREDIENT)--> Egg` |

### How Counting Works Without Ever Double-Counting

Now watch how simple and exact your analytics queries become. Suppose a user asks: **"How many claims talked about `Turkish` food?"** (or `Breakfast`, or `Vegan`):

```sql
SELECT
  tc.ancestor_id AS topic_id,
  COUNT(DISTINCT c.id) AS claim_count,
  COUNT(DISTINCT c.source_id) AS review_count
FROM claims c
JOIN claim_mentions cm ON cm.claim_id = c.id
JOIN aliases a ON a.id = cm.alias_id
-- Unnest both the primary concept AND any modifier concepts on the alias:
CROSS JOIN LATERAL unnest(array_append(a.modifier_ids, a.concept_id)) AS resolved_concept_id
JOIN concept_closure tc ON tc.descendant_id = resolved_concept_id
WHERE tc.ancestor_id = :target_concept_id
GROUP BY tc.ancestor_id;

```

Look at why this is bulletproof:

1. **No typo misses:** Whether the review said `"menemen"` or `"Melemen"`, `a.concept_id` is `Menemen`, which rolls up via `concept_closure` to `Turkish`, `Breakfast`, and `Egg`.
2. **No lost modifiers on rare phrases:** If a review said `"gluten-free menemen"` (only mentioned once ever), `a.concept_id` is `Menemen` and `a.modifier_ids` is `[Gluten-Free]`. The `unnest` feeds *both* into `concept_closure`, so it counts for `Menemen`, `Turkish`, `Breakfast`, **and** `Gluten-Free`—without needing a `"Gluten-Free Menemen"` node in your ontology.
3. **Zero double counting:** Even if a claim mentions two Turkish dishes (`"We had menemen and sucuk"`) or reaches `Turkish` via two different paths in the DAG, `COUNT(DISTINCT c.id)` and the `(descendant_id, ancestor_id)` primary key on `concept_closure` guarantee the claim is counted **once** for `Turkish`.
4. **Strict vs. Broad toggle:** Want only true taxonomic children (excluding ingredients or diets)? Add `AND tc.only_taxonomic = TRUE`.

---

## 5. How the LLM Pipeline Operates in This SOTA Architecture

When a new batch of unknown strings (`"Melemen"`, `"veganer döner"`, `"super crispy lahmacun"`, `"fork"`) enters the `aliases` table with `status = 'pending'`, your AI pipeline runs a two-stage process:

```text
New Wording ("veganer döner")
       │
       ▼
┌───────────────────────────────────────────────────────────┐
│ STAGE 1: Lexical & Compositional Resolution (Fast LLM)    │
│ Retrieve top-K candidate Concepts via vector embedding    │
│ Ask LLM to classify the string into 1 of 4 buckets:       │
└───────────────────────────────────────────────────────────┘
       │
       ├── 1. NOISE ("fork", "plate", "food")
       │      └─► Set status = 'ignored'
       │
       ├── 2. EXACT ALIAS ("Melemen", "Pommes")
       │      └─► Set concept_id = [Menemen], modifier_ids = []
       │
       ├── 3. COMPOSITIONAL ("veganer döner", "iced matcha")
       │      └─► Head exists + Modifiers exist in graph!
       │          Set concept_id = [Döner], modifier_ids = [Vegan]
       │
       └── 4. NOVEL CONCEPT ("birria tacos" - when Birria isn't in graph yet)
              └─► Enters STAGE 2 (Ontology Expansion Queue)

```

### Stage 2: Ontology Expansion (When to create a new `Concept` node)

A new `Concept` node is added to the `concepts` table **only** in two situations:

1. **Truly Missing Base Concept:** The LLM sees `"birria"` or `"okonomiyaki"`, which cannot be represented as a combination of existing nodes, and exceeds a minimum mention threshold (e.g., $\ge 10$ mentions across $\ge 3$ venues). The LLM proposes the node (`Birria`, `kind: dish`) and its typed edges (`HAS_CUISINE -> Mexican`, `HAS_INGREDIENT -> Beef`).
2. **High-Volume Compositional Promotion:** A `concept_id + modifier_ids` pair (like `Döner + [Vegan]` or `Latte + [Matcha]`) appears so frequently across venues (e.g., $\ge 25$ mentions across $\ge 10$ venues) that it deserves its own dedicated analytics page. An automated job promotes `(Döner, [Vegan])` into `[Concept: Vegan Döner]` with edges `IS_A -> Döner` and `HAS_DIET -> Vegan`, and updates those aliases to point directly to `Vegan Döner`.

Would you like to explore how **Aspects (`Taste`, `Price`, `Queue`) interact with Food Concepts** on a claim (for example, when a review praises the döner's taste but complains about the döner's price), or dive deeper into how the **LLM prompt and vector retrieval** work for Stage 1?