# API Documentation

## Overview

The Hookah Tobacco Database API provides RESTful endpoints for accessing tobacco brands and flavors. All endpoints require API key authentication.

**Base URL**: `http://localhost:3000/api` (development) or `https://api.example.com/api` (production)

**Authentication**: All requests must include `X-API-Key` header.

---

## Authentication

### API Key Header

All API requests must include an API key in the request header:

```bash
X-API-Key: your-api-key-here
```

### Example Request

```bash
curl -H "X-API-Key: your-api-key-here" \
  http://localhost:3000/api/brands
```

### Error Responses

**401 Unauthorized** - Missing or invalid API key
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

**403 Forbidden** - API key is inactive
```json
{
  "error": "Forbidden",
  "message": "API key is inactive"
}
```

---

## Endpoints

### Brands

#### List All Brands

Get a paginated list of all tobacco brands.

**Endpoint**: `GET /api/brands`

**Headers**:
- `X-API-Key`: Your API key

**Query Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number | `1` |
| `limit` | integer | No | Items per page (max 100) | `20` |
| `search` | string | No | Search by name | - |
| `sort` | string | No | Sort field (`name`, `parsed_at`) | `parsed_at` |
| `order` | string | No | Sort order (`asc`, `desc`) | `desc` |

**Example Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/brands?page=1&limit=20&sort=parsed_at&order=desc"
```

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Сарма",
      "slug": "sarma",
      "description": "Наши ароматы — это воспоминания...",
      "image_url": "https://htreviews.org/uploads/objects/6/73e3f550285a2fecadbf77982df295c6.webp",
      "updated_at": "2026-01-02T23:00:00Z",
      "parsed_at": "2026-01-02T23:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

#### Get Single Brand

Get detailed information about a specific brand.

**Endpoint**: `GET /api/brands/:slug`

**Headers**:
- `X-API-Key`: Your API key

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Brand slug (e.g., `sarma`) |

**Example Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/brands/sarma"
```

**Success Response** (200):
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Сарма",
    "slug": "sarma",
    "description": "Наши ароматы — это воспоминания...",
    "image_url": "https://htreviews.org/uploads/objects/6/73e3f550285a2fecadbf77982df295c6.webp",
    "updated_at": "2026-01-02T23:00:00Z",
    "parsed_at": "2026-01-02T23:00:00Z"
  }
}
```

**Error Response** (404):
```json
{
  "error": "Not Found",
  "message": "Brand with slug 'sarma' not found"
}
```

---

#### Get Brand's Tobaccos

Get all tobaccos for a specific brand.

**Endpoint**: `GET /api/brands/:slug/tobaccos`

**Headers**:
- `X-API-Key`: Your API key

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Brand slug (e.g., `sarma`) |

**Query Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number | `1` |
| `limit` | integer | No | Items per page (max 100) | `20` |
| `search` | string | No | Search by name | - |
| `sort` | string | No | Sort field (`name`, `parsed_at`) | `parsed_at` |
| `order` | string | No | Sort order (`asc`, `desc`) | `desc` |

**Example Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/brands/sarma/tobaccos?page=1&limit=20"
```

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "brand_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Зима",
      "slug": "zima",
      "description": "Бодрящий мороз с сибирским характером.",
      "image_url": "https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp",
      "updated_at": "2026-01-02T23:00:00Z",
      "parsed_at": "2026-01-02T23:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 94,
    "totalPages": 5
  }
}
```

---

### Tobaccos

#### List All Tobaccos

Get a paginated list of all tobacco flavors.

**Endpoint**: `GET /api/tobaccos`

**Headers**:
- `X-API-Key`: Your API key

**Query Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `page` | integer | No | Page number | `1` |
| `limit` | integer | No | Items per page (max 100) | `20` |
| `search` | string | No | Search by name | - |
| `brand_slug` | string | No | Filter by brand slug | - |
| `sort` | string | No | Sort field (`name`, `parsed_at`) | `parsed_at` |
| `order` | string | No | Sort order (`asc`, `desc`) | `desc` |

**Example Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/tobaccos?page=1&limit=20&brand_slug=sarma"
```

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "brand_id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Зима",
      "slug": "zima",
      "description": "Бодрящий мороз с сибирским характером.",
      "image_url": "https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp",
      "updated_at": "2026-01-02T23:00:00Z",
      "parsed_at": "2026-01-02T23:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 10000,
    "totalPages": 500
  }
}
```

---

#### Get Single Tobacco

Get detailed information about a specific tobacco flavor.

**Endpoint**: `GET /api/tobaccos/:slug`

**Headers**:
- `X-API-Key`: Your API key

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `slug` | string | Yes | Tobacco slug (e.g., `zima`) |

**Example Request**:
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3000/api/tobaccos/zima"
```

**Success Response** (200):
```json
{
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "brand_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Зима",
    "slug": "zima",
    "description": "Бодрящий мороз с сибирским характером.",
    "image_url": "https://htreviews.org/uploads/objects/5/8594df9a7f7469a4e63413f221dd95f9.webp",
    "updated_at": "2026-01-02T23:00:00Z",
    "parsed_at": "2026-01-02T23:00:00Z"
  }
}
```

**Error Response** (404):
```json
{
  "error": "Not Found",
  "message": "Tobacco with slug 'zima' not found"
}
```

---

### API Key Management

#### Generate API Key

Generate a new API key.

**Endpoint**: `POST /api/keys`

**Headers**:
- `X-API-Key`: Your API key (admin key)

**Request Body**:
```json
{
  "name": "Client App - Production"
}
```

**Example Request**:
```bash
curl -X POST \
  -H "X-API-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "Client App - Production"}' \
  http://localhost:3000/api/keys
```

**Success Response** (201):
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Client App - Production",
    "key": "hk_live_xxxxxxxxxxxxxxxxxxxxxx",
    "is_active": true,
    "created_at": "2026-01-02T23:00:00Z"
  }
}
```

---

#### List API Keys

List all API keys (admin only).

**Endpoint**: `GET /api/keys`

**Headers**:
- `X-API-Key`: Your API key (admin key)

**Example Request**:
```bash
curl -H "X-API-Key: your-admin-key" \
  http://localhost:3000/api/keys
```

**Success Response** (200):
```json
{
  "data": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440002",
      "name": "Client App - Production",
      "is_active": true,
      "created_at": "2026-01-02T23:00:00Z"
    }
  ]
}
```

---

#### Activate/Deactivate API Key

Toggle API key active status.

**Endpoint**: `PATCH /api/keys/:id`

**Headers**:
- `X-API-Key`: Your API key (admin key)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | API key UUID |

**Request Body**:
```json
{
  "is_active": false
}
```

**Example Request**:
```bash
curl -X PATCH \
  -H "X-API-Key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}' \
  http://localhost:3000/api/keys/770e8400-e29b-41d4-a716-446655440002
```

**Success Response** (200):
```json
{
  "data": {
    "id": "770e8400-e29b-41d4-a716-446655440002",
    "name": "Client App - Production",
    "is_active": false,
    "created_at": "2026-01-02T23:00:00Z"
  }
}
```

---

#### Delete API Key

Delete an API key.

**Endpoint**: `DELETE /api/keys/:id`

**Headers**:
- `X-API-Key`: Your API key (admin key)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | API key UUID |

**Example Request**:
```bash
curl -X DELETE \
  -H "X-API-Key: your-admin-key" \
  http://localhost:3000/api/keys/770e8400-e29b-41d4-a716-446655440002
```

**Success Response** (204):
No content returned.

---

## Response Format

### Success Response

All successful responses follow this format:

```json
{
  "data": <response data>,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Pagination is included for list endpoints only.

### Error Response

All error responses follow this format:

```json
{
  "error": "<error type>",
  "message": "<error description>"
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Missing or invalid API key |
| `403` | Forbidden - API key is inactive |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error - Server error |

---

## Rate Limiting

API requests are rate limited to prevent abuse.

**Default Limits**:
- 100 requests per minute per API key
- 10 requests per second burst

**Rate Limit Headers**:

Response headers include rate limit information:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704265600
```

**Rate Limit Exceeded** (429):
```json
{
  "error": "Rate Limit Exceeded",
  "message": "Too many requests. Please try again later."
}
```

---

## Data Types

### Brand Object

```typescript
interface Brand {
  id: string;           // UUID
  name: string;         // Brand name in Russian
  slug: string;         // URL-friendly identifier
  description: string;   // Brand description
  image_url: string;    // URL to brand image
  updated_at: string;    // ISO 8601 timestamp
  parsed_at: string;    // ISO 8601 timestamp
}
```

### Tobacco Object

```typescript
interface Tobacco {
  id: string;           // UUID
  brand_id: string;     // Brand UUID
  name: string;         // Tobacco name
  slug: string;         // URL-friendly identifier
  description: string;   // Tobacco description
  image_url: string;    // URL to tobacco image
  updated_at: string;    // ISO 8601 timestamp
  parsed_at: string;    // ISO 8601 timestamp
}
```

### Pagination Object

```typescript
interface Pagination {
  page: number;        // Current page number
  limit: number;       // Items per page
  total: number;       // Total items
  totalPages: number;  // Total pages
}
```

---

## Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';
const API_KEY = 'your-api-key-here';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': API_KEY
  }
});

// Get all brands
async function getBrands(page = 1, limit = 20) {
  const response = await api.get('/brands', {
    params: { page, limit }
  });
  return response.data;
}

// Get single brand
async function getBrand(slug: string) {
  const response = await api.get(`/brands/${slug}`);
  return response.data;
}

// Get brand's tobaccos
async function getBrandTobaccos(brandSlug: string, page = 1, limit = 20) {
  const response = await api.get(`/brands/${brandSlug}/tobaccos`, {
    params: { page, limit }
  });
  return response.data;
}

// Get all tobaccos
async function getTobaccos(page = 1, limit = 20) {
  const response = await api.get('/tobaccos', {
    params: { page, limit }
  });
  return response.data;
}

// Get single tobacco
async function getTobacco(slug: string) {
  const response = await api.get(`/tobaccos/${slug}`);
  return response.data;
}
```

### Python

```python
import requests

API_BASE_URL = 'http://localhost:3000/api'
API_KEY = 'your-api-key-here'

headers = {
    'X-API-Key': API_KEY
}

# Get all brands
def get_brands(page=1, limit=20):
    params = {'page': page, 'limit': limit}
    response = requests.get(f'{API_BASE_URL}/brands', headers=headers, params=params)
    return response.json()

# Get single brand
def get_brand(slug):
    response = requests.get(f'{API_BASE_URL}/brands/{slug}', headers=headers)
    return response.json()

# Get brand's tobaccos
def get_brand_tobaccos(brand_slug, page=1, limit=20):
    params = {'page': page, 'limit': limit}
    response = requests.get(f'{API_BASE_URL}/brands/{brand_slug}/tobaccos', 
                          headers=headers, params=params)
    return response.json()

# Get all tobaccos
def get_tobaccos(page=1, limit=20):
    params = {'page': page, 'limit': limit}
    response = requests.get(f'{API_BASE_URL}/tobaccos', headers=headers, params=params)
    return response.json()

# Get single tobacco
def get_tobacco(slug):
    response = requests.get(f'{API_BASE_URL}/tobaccos/{slug}', headers=headers)
    return response.json()
```

---

## Best Practices

1. **Handle Pagination**: Always check pagination object for more results
2. **Cache Responses**: Cache frequently accessed data to reduce API calls
3. **Handle Errors**: Implement proper error handling for all status codes
4. **Use Search**: Use search parameter instead of fetching all data
5. **Respect Rate Limits**: Implement backoff when rate limited

---

## Versioning

API versioning is done through URL path:

- Current version: `v1` (implicit)
- Future versions: `/api/v2/...`

---

## Changelog

### v1.0.0 (2026-01-02)
- Initial API release
- Brand endpoints
- Tobacco endpoints
- API key management
- Pagination support
- Search functionality

---

## Support

For API support or issues, please:
1. Check this documentation first
2. Review error messages
3. Open a GitHub issue with details

---

## Summary

This API provides:

- **RESTful Design**: Standard HTTP methods and status codes
- **Authentication**: API key-based access control
- **Pagination**: Efficient data retrieval
- **Search**: Find data quickly
- **Error Handling**: Clear error messages
- **Documentation**: Comprehensive examples

For database schema, see [`database.md`](database.md).
For implementation details, see [`implementation.md`](implementation.md).
