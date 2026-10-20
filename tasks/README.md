# Tasks

Work queue for the repo, readable by people and by Claude. One markdown file per task; the folder is the status:

- `todo/` — ready to pick up.
- `in-progress/` — someone (or a Claude session) is on it. The file's `## Log` says where it stands.
- `done/` — finished, waiting for its learnings to be folded into the matching skill under `.claude/skills/`. Deleted after that; git history keeps the record.

## Filename: `<priority>.<type>.<slug>.md`

`ls` then sorts the urgent work first, and `ls todo/p0.*` or `ls todo/*.bug.*` is the whole query language.

- **priority**: `p0` blocks a release or loses money · `p1` planned · `p2` nice to have.
- **type**:
  - `bug` — something behaves wrongly today; acceptance is a test that fails before and passes after.
  - `feature` — new behaviour or endpoint.
  - `chore` — cleanup, refactor, tooling, dead code; no user-visible change.
  - `decision` — blocked on a choice only the user can make; ends when the choice is recorded, follow-up work becomes its own task.
  - `research` — the *work* of getting answers from outside the repo (arranging a call, pulling production data); the questions themselves live in `questions/` (one file per party) so they outlive the task. Ends when the answers are recorded there and follow-up tasks exist.
- **slug**: kebab-case, never numbered, never changes. **Refer to a task by its slug** (in another task, a commit message, a skill), not its full filename, so a re-prioritisation (`git mv p1.feature.x.md p0.feature.x.md`) breaks nothing.

Priority and type live only in the filename; the frontmatter holds `title`, `skills` (what to load before starting), `created`, `source`. `TEMPLATE.md` is the shape; the `task-workflow` skill is the procedure for picking up, writing and closing one.
