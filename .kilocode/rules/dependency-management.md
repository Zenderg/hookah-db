# Dependency Version Rules

## Rule

Before installing any dependency using a package manager
(e.g. npm, pnpm, yarn, pip, etc.),
the AI MUST verify the latest stable version available at the time of execution.

The AI MUST:
- search the internet or official package registry,
- use the most recent stable release.

The AI MUST NOT:
- rely on outdated examples or templates,
- install implicit or default versions without verification.

If the latest version cannot be used due to:
- breaking changes,
- incompatibility,
- known critical issues,

the AI MUST:
- explicitly explain the reason,
- document the decision,
- choose the closest suitable version.

## Intent

Projects should start with a modern and up-to-date dependency stack,
not with pre-existing technical debt.
