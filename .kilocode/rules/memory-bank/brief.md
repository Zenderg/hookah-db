# Hookah Tobacco Database API

## Project Overview

A RESTful API service that provides structured access to hookah tobacco data by parsing information from htreviews.org. The API serves as a centralized database for tobacco brands, flavors, and their ratings.

## Core Goals

- Parse and aggregate tobacco data from htreviews.org into a structured database
- Provide authenticated API access for up to 10 clients
- Maintain up-to-date tobacco information through scheduled parsing
- Deliver reliable, fast API responses with key-based authentication

## Key Features

### Data Sources
- Primary source: htreviews.org
- Expected scale: ~272 brands, ~471 lines, ~11,861 tobaccos total

### API Features
- Key-based authentication for all endpoints
- Endpoints for brands, lines, tobaccos, and their relationships
- Filtering and sorting capabilities
- Playwright-based parsers for all three data types (brands, lines, tobaccos)
