---
title: <imperative, one line>
skills: [<skill names to load before starting>]
created: YYYY-MM-DD
source: <where this came from: a review pass, a user note, a bug seen in prod, a conversation>
---

<!-- Filename: <priority>.<type>.<slug>.md, e.g. p0.bug.block-or-report-freezes-live-order.md.
     priority: p0 blocks a release or loses money · p1 planned · p2 nice to have
     type: bug | feature | chore | decision | research
     The slug is the stable id; it never changes. Priority or type changes are a git mv. -->

# <title>

## Goal
What is true when this is done, in two or three sentences.

## Why
The user-visible or operational reason. Enough that whoever picks it up can make trade-offs.

## Scope
- In: …
- Out: … (what a careful colleague might assume is included but is not)

## Pointers
Files, services, endpoints and tests that are the starting point. Paths, not prose.

## Acceptance
- [ ] Observable checks: an endpoint answers X, a screen shows Y, a PGlite test covers Z.

## Open questions
Decisions only the user can make. State the assumption you will proceed under if unanswered.

## Log
Append dated notes while in progress: what was decided, what moved, what is left.
