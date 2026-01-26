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
- Expected scale: ~100 brands, ~100 flavors per brand (~10,000 total flavors)

### API Features
- Key-based authentication for all endpoints
- Endpoints for brands, flavors, and their relationships
- Filtering and sorting capabilities
