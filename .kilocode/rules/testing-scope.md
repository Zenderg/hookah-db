# Testing Scope Rules

## Rule

Tests MUST be written ONLY for functionality implemented by this project.

The AI MUST NOT:
- test third-party libraries,
- test framework behavior,
- test that external dependencies "work as expected",
- reproduce library test cases.

The AI MAY:
- mock third-party libraries,
- stub external services,
- test how the project integrates with a dependency,
  as long as the test validates the project’s own logic.

Tests MUST validate:
- business logic,
- project-specific behavior,
- integration boundaries owned by the project.

## Intent

Tests exist to protect our code, not to verify external dependencies.
