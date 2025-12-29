# Project Purpose

## Problem Statement

The hookah tobacco market lacks a centralized database that aggregates information about tobacco brands and products. This fragmentation makes it difficult for applications and services to access comprehensive, structured data about hookah tobacco products without implementing their own scraping solutions.

## Project Goal

This project provides a centralized API that aggregates hookah tobacco data from htreviews.org. It serves as a single source of truth for tobacco information, enabling clients to access structured data without implementing their own parsing infrastructure.

## Target Audience

The API is designed for a limited number of clients (approximately 10) who need access to structured hookah tobacco data. These clients may include mobile applications, websites, or other services that require tobacco information.

## Scope and Limitations

### In Scope

- Scraping tobacco brand data from htreviews.org
- Scraping tobacco product data from htreviews.org
- Storing structured data in a centralized database
- Providing API access to the stored data
- API key-based authentication for access control

### Out of Scope

- User-facing interfaces or dashboards
- Real-time data synchronization
- Multi-source data aggregation (single source only)
- Public API access without authentication
- Data modification or user-generated content
- Analytics or reporting features

### Constraints

- API access is restricted to authenticated clients with valid keys
- The system is designed for a small number of clients
- Data freshness depends on the scraping schedule
- The project relies on the availability and structure of htreviews.org
