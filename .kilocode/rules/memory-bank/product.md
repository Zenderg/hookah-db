# Product Description

## Why This Project Exists

The hookah tobacco market lacks a centralized, programmatic source of structured data about tobacco products. Currently, developers and businesses must manually collect information from various sources or scrape websites themselves, which is time-consuming, error-prone, and often violates terms of service.

HTReviews.org (htreviews.org) is the most comprehensive public database of hookah tobacco products with user reviews, ratings, and detailed product information. However, this valuable data is locked behind HTML pages and not accessible via API.

## Problems This Project Solves

1. **No Centralized Data Source**: Developers building hookah-related applications (inventory management, recommendation engines, analytics platforms) have no reliable API to access tobacco product data.

2. **Manual Data Collection**: Businesses must manually maintain product databases, leading to outdated information and inconsistencies.

3. **Limited Integration**: Third-party applications cannot easily integrate with or leverage the rich data available on htreviews.org.

4. **High Development Costs**: Each developer must build their own scraping solution, duplicating effort and potentially causing server load on htreviews.org.

## How It Works

### Data Flow

```mermaid
graph LR
    A[htreviews.org] --> B[Web Scraper]
    B --> C[Data Parser]
    C --> D[Structured JSON]
    D --> E[Cache Layer]
    E --> F[API Server]
    F --> G[Authorized Clients]
    
    style A fill:#e1f5ff
    style G fill:#c8e6c9
```

### Core Components

1. **Web Scraper**: Periodically fetches HTML pages from htreviews.org
2. **Data Parser**: Extracts structured data (brands, flavors, ratings) using Cheerio
3. **Cache Layer**: Stores parsed data to minimize scraping frequency
4. **API Server**: RESTful endpoints for data retrieval
5. **Authentication**: API key-based access control for authorized clients

### API Endpoints

- `GET /api/v1/brands` - List all brands with pagination
- `GET /api/v1/brands/:slug` - Get brand details
- `GET /api/v1/flavors` - List all flavors with filtering
- `GET /api/v1/flavors/:slug` - Get flavor details
- `GET /api/v1/brands/:brandSlug/flavors` - Get flavors for a specific brand

## User Experience Goals

### For API Consumers

- **Simple Integration**: Clean, documented REST API with JSON responses
- **Reliable Access**: High uptime with cached data for fast responses
- **Predictable Rate Limits**: Clear rate limiting to prevent abuse
- **Comprehensive Data**: Access to brands, flavors, ratings, reviews, and metadata

### For htreviews.org

- **Respectful Scraping**: Minimal server load with intelligent caching
- **Attribution**: Proper attribution to htreviews.org as data source
- **Data Accuracy**: Maintain data integrity and update regularly
- **No Competition**: This API serves as a data provider, not a competing service

## Target Users

1. **Hookah Shop Inventory Systems**: Automated product catalog management
2. **Mobile Apps**: Hookah enthusiast apps for flavor discovery and reviews
3. **Analytics Platforms**: Market research and trend analysis
4. **Price Comparison Sites**: Real-time price tracking across retailers
5. **Recommendation Engines**: Personalized flavor recommendations
6. **Social Media Platforms**: Enriching user-generated content with product data

## Success Metrics

- **API Reliability**: 99.9% uptime
- **Data Freshness**: Cache updated at least daily
- **Response Time**: <200ms average response time
- **Client Satisfaction**: Low error rates, comprehensive documentation
- **Server Load**: Minimal impact on htreviews.org through intelligent caching
