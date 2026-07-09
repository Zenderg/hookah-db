# Project Scope

Purpose: this document is the source of truth for product boundaries, data
assumptions, and explicit non-goals. Technical architecture belongs in
`architecture.md`. Developer commands belong in `development.md`. Agent
workflow rules belong in `../AGENTS.md`. Human-facing usage belongs in
`../README.md`.

## Product Boundary

Hookah DB is a self-hosted REST API for a structured hookah tobacco catalog. It
stores brands, lines, tobaccos, and flavors in PostgreSQL and exposes them
through authorized endpoints.

Import from `htreviews.org` is optional. New self-host setups should be able to
start with sample data and without automatically calling external websites.

Approximate production-scale data:

- 272 brands
- 471 lines
- 11,861 tobaccos

## Explicit Non-Goals

Do not add these features unless product scope is explicitly changed:

- User accounts, OAuth, JWT.
- User reviews, rating submission, or social features.
- Admin panel or web UI.
- Payment processing.
- Real-time updates.
- Multi-tenancy.
- Advanced analytics.
- Email notifications.
- Rate limiting; request logging is allowed.
- Automatic backups beyond Docker volumes.
