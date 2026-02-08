# Product Description

## Why This Project Exists

This project exists to provide a centralized, structured API for hookah tobacco data that can be consumed by a hookah enthusiast community website. The website needs reliable access to tobacco information including brands, flavors, ratings, and other metadata to display catalogs, enable filtering, and provide sorting capabilities to community members.

## Problems It Solves

### Data Fragmentation
- Hookah tobacco data is scattered across various sources
- htreviews.org contains comprehensive data but lacks a structured API
- Manual data extraction and maintenance is time-consuming and error-prone

### Data Freshness
- Tobacco information changes frequently (new releases, discontinued products, rating updates)
- Manual updates cannot keep pace with the rate of change
- Community members need current, accurate information

### Access Control
- Data should be available only to authorized clients
- Need to track usage and prevent abuse
- API keys provide a simple, effective authentication mechanism

## How It Works

1. **Data Collection:** Automated parser scrapes htreviews.org daily
2. **Data Storage:** Structured data stored in PostgreSQL database with TypeORM
3. **API Access:** RESTful endpoints provide filtered, sorted data to authorized clients
4. **Authentication:** API key-based authentication ensures only authorized access
5. **Maintenance:** Daily automatic updates keep data current

## User Experience Goals

### For API Consumers (Community Website)
- Fast, reliable API responses
- Simple, intuitive API design
- Comprehensive filtering and sorting options
- Consistent data format
- Minimal maintenance overhead

### For End Users (Community Members)
- Access to current tobacco information
- Ability to search and filter by various criteria
- Reliable ratings and reviews data
- Easy discovery of new products

## Success Criteria

### Functional Requirements
- API successfully parses data from htreviews.org
- All endpoints return correct, filtered data
- Authentication works correctly for all authorized clients
- Daily updates run without errors
- Data accuracy matches source

### Non-Functional Requirements
- API responds within acceptable timeframes
- System remains stable under expected load
- Docker deployment works reliably
- Logging provides sufficient visibility into operations

## Scope Boundaries

### Included Features
- Parsing tobacco data from htreviews.org
- Storing data in PostgreSQL database
- RESTful API for brands, tobaccos, lines, and flavors
- Filtering and sorting capabilities
- API key authentication
- Daily automatic data refresh
- Usage logging per client
- Many-to-many relationship between tobaccos and flavors

### Explicitly Excluded Features
- User accounts and authentication
- User reviews and ratings submission
- Social features (comments, likes, shares)
- Admin panel or web interface
- Payment processing
- Real-time data updates
- Multi-tenancy
- Advanced analytics or reporting
- Email notifications
- Backup/restore functionality beyond Docker volumes

## Target Users

### Primary Users
- Community website developers who consume the API
- Community website administrators who manage API keys

### Secondary Users
- Hookah enthusiasts who use the community website to browse tobacco information
