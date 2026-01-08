# Hookah Tobacco Database API

## Project Overview

Hookah Tobacco Database API is a centralized data service that aggregates and provides structured information about hookah tobacco brands and flavors from htreviews.org. The project addresses gap in the market by creating a comprehensive, accessible database of hookah tobacco products through web scraping and API delivery.

## Main Goals

1. **Data Aggregation**: Parse and extract comprehensive tobacco data from htreviews.org, including brands and flavors
2. **API Service**: Provide a secure, key-based API for authorized clients to access tobacco data
3. **Data Standardization**: Transform unstructured HTML data into structured, queryable JSON format
4. **Scalability**: Support approximately 100 brands with up to 100 flavors each (10,000+ total products)
5. **Containerization**: Provide Docker-based deployment for consistent development and production environments

## Key Features

- **Web Scraping**: Automated parsing of htreviews.org to extract brand and flavor data
- **Secure API Access**: API key-based authentication for up to 10 authorized clients
- **Comprehensive Data Model**: 
  - Brands: name, description, image url
  - Flavors: name, description, brand, image url
- **RESTful API**: Clean, documented endpoints for data retrieval
- **Data Caching**: Efficient caching strategy to minimize scraping load
- **Error Handling**: Robust error handling and rate limiting
- **Automated Scheduler**: Cron-based automatic data refresh with configurable schedules
- **Monitoring**: Comprehensive statistics and execution history tracking
- **Docker Deployment**: Multi-stage Docker setup with development and production configurations
  - Development environment with hot reload and volume mounts
  - Production environment with health checks and log rotation
  - Easy deployment with Docker Compose

## Technology Stack

- **Runtime**: Node.js
- **Package Manager**: npm
- **Language**: TypeScript
- **Web Scraping**: Cheerio or similar HTML parsing library
- **API Framework**: Express.js or Fastify
- **Authentication**: API key middleware
- **Caching**: In-memory or Redis caching
- **Data Validation**: Zod or similar schema validation
- **Scheduler**: node-cron for automated task scheduling
- **Containerization**: Docker and Docker Compose for deployment
- **Logging**: Winston with structured logging and file rotation

## Data Structure

### Brand
- Name
- Description
- Image URL

### Flavor
- Name
- Description
- Image URL
- Brand

## Significance

This project fills a critical gap in the hookah tobacco market by providing:
- **Centralized Data**: Single source of truth for tobacco product information
- **Developer-Friendly**: Easy-to-use API for integration with third-party applications
- **Real-Time Updates**: Regular scraping to keep data current
- **Ecosystem Support**: Enables development of applications, analytics tools, and comparison platforms
- **Containerized Deployment**: Docker support for consistent environments across development and production
- **Production-Ready**: Health checks, log rotation, and monitoring built-in

## Target Users

- Hookah shop inventory management systems
- Mobile apps for hookah enthusiasts
- Analytics platforms for market research
- Price comparison websites
- Recommendation engines
