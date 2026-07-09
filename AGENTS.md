# AGENTS.md

Purpose: this file contains only concrete instructions for agents working in
this repository. Do not put business context, architecture notes, API behavior,
parser details, command catalogs, or troubleshooting notes here.

Project knowledge lives in focused documents:

- `docs/development.md` for commands, checks, migrations, and test mechanics.
- `docs/architecture.md` for module boundaries, entities, parser behavior, and API contracts.
- `docs/project-scope.md` for product boundaries, data assumptions, and non-goals.
- `README.md`, `CONTRIBUTING.md`, and `SECURITY.md` for human-facing usage, contribution, and security information.

## Branch And Git

- Work only on the main branch.
- Do not create or switch to new branches unless the user explicitly asks for a new branch.
- Preserve user work. Do not revert unrelated changes or clean up files you did not touch unless explicitly asked.
- Use conventional commit prefixes for commit messages so releases can be summarized cleanly: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`, or `build:`.

## Runtime And Dependencies

- Use Docker Compose to run the application.
- Do not start the project locally outside Docker Compose.
- Local commands are fine for tests, checks, scripts, migrations, and other tasks that are not application startup.
- Before installing or updating dependencies, verify the latest stable version. If the latest stable version is not suitable, document why.

## Work Style

- Use subagents at your discretion whenever they are useful.
- When the user says they found a bug, first investigate and identify the exact problem, then implement a fix only after the user approves it.
- It is acceptable to ask the user to do something manually or inspect something when you cannot do it yourself.
- Implement fallback mechanics only with explicit user permission. Avoid fallbacks when possible because they make debugging harder.
- If a fallback would be a clear future advantage rather than a likely maintenance problem, stop and ask the user before adding it.
- When working from a GitHub issue, validate that the issue describes a real, current problem before fixing it.
- If a GitHub issue is invalid, already fixed, unreproducible, or outside project scope, comment on the issue with the finding and close it instead of opening a PR.

## Testing And Verification

- Do not write tests for everything by default.
- Write only genuinely useful tests; the goal is verification, not testing for its own sake or covering everything.
- Before adding a test, first ask whether that location truly needs one.
- Use the project-specific test guidance in `docs/development.md` when changing repository queries, parser behavior, DTOs, or other tested boundaries.

## Documentation Maintenance

- Record newly discovered project knowledge where future agents can find it.
- Keep documentation organized by ownership and purpose, not by convenience.
- User-facing documents, such as `README.md` and `SECURITY.md`, should stay reader-facing. Do not add agent-only purpose boilerplate there unless it also helps the intended human reader.
- Internal and agent-facing documentation should start with a short purpose statement explaining what the document is the source of truth for, what belongs in it, and what should be documented somewhere else.
- Before adding information to an existing document, read its opening purpose statement and make sure the new content belongs there.
- Create a new focused document when the information introduces a distinct long-lived topic, workflow, subsystem, contract, or troubleshooting area that does not clearly fit an existing document.
- Do not append unrelated discoveries to a nearby or familiar document just because it already exists.
- Prefer updating an existing document when the new information clarifies, corrects, or extends that document's stated purpose.
- Avoid turning docs into chronological work logs. Temporary plans, investigation notes, and shipped implementation details should be removed, condensed, or moved into durable product, architecture, development, or decision documentation as appropriate.
- When adding or changing docs, preserve links between related documents so future agents can find the right source of truth.
