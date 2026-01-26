# Memory Bank and Documentation Rules

## Rule

The AI MUST store in the Memory Bank and project documentation not only the implemented functionality,
but also explicit decisions about what MUST NOT be implemented.

This includes:
- features intentionally excluded,
- rejected architectural approaches,
- known limitations,
- constraints and trade-offs,
- decisions postponed or explicitly declined, along with reasons.

The AI MUST NOT store only a high-level or generic context.
All negative or exclusionary decisions are first-class information and MUST be preserved.

If during discussion a decision is made to NOT implement something, it MUST be documented explicitly.

## Intent

The Memory Bank is a source of truth, not a summary.
Missing information about exclusions creates incorrect assumptions and future regressions.
