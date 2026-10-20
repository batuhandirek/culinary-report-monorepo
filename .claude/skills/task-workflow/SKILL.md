---
name: task-workflow
description: Pick up, write, update or close a task in the repo's `tasks/` queue (todo / in-progress / done). Use when asked to "pick the next task", "what's next", "add a task", "write this up as a task", "close the task", or when a review or conversation produces work that should be queued rather than done now.
---

# Task workflow

`tasks/README.md` defines the folders and the filename grammar; `tasks/TEMPLATE.md` is the shape. A task is a self-contained brief: a fresh session must be able to start from the file alone.

Filename: `<priority>.<type>.<slug>.md` (`p1.feature.monthly-report-email.md`). Priority `p0 | p1 | p2`, type `bug | feature | chore | decision | research`. The slug is the stable id: refer to a task by its slug, never by the full filename.

## Picking up a task

1. `ls tasks/todo` sorts by priority. Read the frontmatter of the candidates, pick the top `p0` unless the user asked for something else; if the user named a task, take that one. Skip `decision` and `research` tasks unless the user is present to answer: they cannot be finished alone.
2. Read the task in full. **Load every skill in its `skills:` list** before touching code.
3. `git mv tasks/todo/<file> tasks/in-progress/` and add a dated line to `## Log` saying what you are about to do and under which assumptions (answer the open questions you can from the code; state the assumption for the rest).
4. Work it. Append to the log at decision points, not every edit: a decision taken, a scope cut, a finding that changes the plan.
5. Before finishing, walk the `## Acceptance` boxes and tick what you verified. Anything you did not do stays unticked with a line saying why.

## Writing a task

- Start from `TEMPLATE.md`. Pick the priority and type honestly: a `bug` needs a reproducing test in its acceptance; a `decision` lists the options and the assumption; a `research` lists the questions and who answers them.
- `skills:` lists the domain and procedure skills the work needs (`backend-endpoint`, `pglite-test`, …). Wrong or missing skills are the most common reason a task gets re-derived from scratch.
- Pointers are paths. Scope says what is *out*. Acceptance is observable (an endpoint answers, a screen shows, a test covers).
- Open questions are only decisions the user must make; each carries the assumption you would proceed under. Everything decidable from the code is decided in the task.
- One task per deliverable. A wishlist of ten endpoints is ten tasks or one task with a clear "first slice"; it is not a dumping ground.
- Something learned that is *always* true of the domain (an invariant, a quirk) goes in the skill right away, not in a task.
- A question only an outside party can answer (a provider, a vendor, a lawyer) goes in `questions/<party>.md` (`questions/README.md` has the block format), not in a task's open questions: a task's open questions are the *user's* decisions. The task names the question's slug under "Open questions" with the assumption it proceeds under. When the user pastes an answer, record it there, write the follow-up tasks, and fold the durable fact into the skill.
- Re-prioritising or re-typing is a `git mv` of the file; the slug stays.

## Closing a task

1. Tick the acceptance boxes, final log line with what shipped and what did not. `npm run backend:test` passes, and every journey whose flow the task touched (`integration-test` skill) was updated and run; the log names them.
2. `git mv tasks/in-progress/<file> tasks/done/`.
3. **Fold the learnings into the skills**: any rule, entry point, quirk or pointer the work established goes into the matching `.claude/skills/*/SKILL.md`; a convention that now applies everywhere goes into the relevant `CLAUDE.md`. Delete skill statements the work made wrong.
4. Once folded, delete the file from `done/` (`git rm`). If you cannot fold it (unclear what is durable), leave it in `done/` and say so.

## Queueing instead of doing

When a review, a conversation or a code read turns up work outside the current task: write it as a task in `todo/` with the context you have *now* (the file, the line, the symptom), and carry on. Don't leave it in chat or in a root-level markdown file.
