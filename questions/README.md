# Questions

Things only someone outside the repo can answer — a provider, a vendor, a lawyer, production data — kept the way `tasks/` keeps work: readable by people and by Claude, one file per party, the file is the record.

- One file per party (`brevo.md`, `apify.md`, …). The file says how the party is reached and lists the questions.
- A question is a `###` block with a stable kebab-case slug, the question in the words it was (or will be) asked, a **Why** line (what in the code or the money depends on it), and once answered an **Answer** line with the date and a **Follow-up** line naming the task slugs or skill statements it produced.
- Lifecycle: *open* → *answered* (answer recorded, follow-up tasks written in `tasks/todo/`) → folded (the durable fact is in the matching `.claude/skills/*/SKILL.md`, the block is deleted; git history keeps it). A `tasks/` `research` task is for the work of *getting* answers (a call to arrange, data to pull); the questions themselves live here so they outlive it.
- Asking is the user's job. A Claude session adds questions it cannot answer from the code, records answers the user pastes, and writes the follow-ups.
