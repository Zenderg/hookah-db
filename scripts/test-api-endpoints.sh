#!/bin/bash

# API Endpoint Testing Script
# Tests all endpoints with real data from database

API_BASE_URL="http://localhost:3000"
API_KEY="test-api-key-12345"
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test result
print_result() {
    local test_name="$1"
    local expected_code="$2"
    local actual_code="$3"
    local response_time="$4"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ "$actual_code" == "$expected_code" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓ PASS${NC} [$response_time] - $test_name (Expected: $expected_code, Got: $actual_code)"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗ FAIL${NC} [$response_time] - $test_name (Expected: $expected_code, Got: $actual_code)"
    fi
}

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}API Endpoint Testing with Real Data${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# 1. Health Endpoints (No Auth Required)
# ============================================
echo -e "${YELLOW}1. Testing Health Endpoints (No Auth)${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /health
response=$(curl -s -w "\n%{http_code}" -o /tmp/health_response.txt "$API_BASE_URL/health")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" "$API_BASE_URL/health")
body=$(cat /tmp/health_response.txt)
print_result "GET /health" "200" "$code" "$time"
echo "Response: $body" | head -c 200
echo ""

# GET /health/detailed
response=$(curl -s -w "\n%{http_code}" -o /tmp/health_detailed_response.txt "$API_BASE_URL/health/detailed")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" "$API_BASE_URL/health/detailed")
body=$(cat /tmp/health_detailed_response.txt)
print_result "GET /health/detailed" "200" "$code" "$time"
echo "Response: $body" | head -c 200
echo ""

echo ""

# ============================================
# 2. Documentation Endpoints (No Auth Required)
# ============================================
echo -e "${YELLOW}2. Testing Documentation Endpoints (No Auth)${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api-docs.json
response=$(curl -s -w "\n%{http_code}" -o /tmp/api_docs_json_response.txt "$API_BASE_URL/api-docs.json")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" "$API_BASE_URL/api-docs.json")
body=$(cat /tmp/api_docs_json_response.txt)
print_result "GET /api-docs.json" "200" "$code" "$time"
echo "Response size: $(echo "$body" | wc -c) bytes"
echo ""

# GET /api-docs (Swagger UI)
response=$(curl -s -w "\n%{http_code}" -o /tmp/api_docs_response.txt "$API_BASE_URL/api-docs/")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" "$API_BASE_URL/api-docs/")
print_result "GET /api-docs/ (Swagger UI)" "200" "$code" "$time"
echo ""

echo ""

# ============================================
# 3. Authentication Tests
# ============================================
echo -e "${YELLOW}3. Testing Authentication${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Request without API key (should return 401)
response=$(curl -s -w "\n%{http_code}" -o /tmp/auth_no_key_response.txt "$API_BASE_URL/api/v1/brands")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" "$API_BASE_URL/api/v1/brands")
print_result "GET /api/v1/brands (No API Key)" "401" "$code" "$time"

# Request with invalid API key (should return 403)
response=$(curl -s -w "\n%{http_code}" -o /tmp/auth_invalid_key_response.txt -H "X-API-Key: invalid-key" "$API_BASE_URL/api/v1/brands")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: invalid-key" "$API_BASE_URL/api/v1/brands")
print_result "GET /api/v1/brands (Invalid API Key)" "403" "$code" "$time"

# Request with valid API key (should return 200)
response=$(curl -s -w "\n%{http_code}" -o /tmp/auth_valid_key_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands")
print_result "GET /api/v1/brands (Valid API Key)" "200" "$code" "$time"

echo ""

# ============================================
# 4. Brand Endpoints (Auth Required)
# ============================================
echo -e "${YELLOW}4. Testing Brand Endpoints (Auth Required)${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api/v1/brands (with pagination)
response=$(curl -s -w "\n%{http_code}" -o /tmp/brands_page1_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands?page=1&limit=10")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands?page=1&limit=10")
body=$(cat /tmp/brands_page1_response.txt)
print_result "GET /api/v1/brands?page=1&limit=10" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/brands/sarma
response=$(curl -s -w "\n%{http_code}" -o /tmp/brand_sarma_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/sarma")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/sarma")
body=$(cat /tmp/brand_sarma_response.txt)
print_result "GET /api/v1/brands/sarma" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/brands/dogma
response=$(curl -s -w "\n%{http_code}" -o /tmp/brand_dogma_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/dogma")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/dogma")
body=$(cat /tmp/brand_dogma_response.txt)
print_result "GET /api/v1/brands/dogma" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/brands/sarma/flavors
response=$(curl -s -w "\n%{http_code}" -o /tmp/brand_sarma_flavors_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/sarma/flavors")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/sarma/flavors")
body=$(cat /tmp/brand_sarma_flavors_response.txt)
print_result "GET /api/v1/brands/sarma/flavors" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# POST /api/v1/brands/refresh
response=$(curl -s -w "\n%{http_code}" -o /tmp/brands_refresh_response.txt -H "X-API-Key: $API_KEY" -X POST "$API_BASE_URL/api/v1/brands/refresh")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" -X POST "$API_BASE_URL/api/v1/brands/refresh")
body=$(cat /tmp/brands_refresh_response.txt)
print_result "POST /api/v1/brands/refresh" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

echo ""

# ============================================
# 5. Flavor Endpoints (Auth Required)
# ============================================
echo -e "${YELLOW}5. Testing Flavor Endpoints (Auth Required)${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api/v1/flavors (with pagination and filtering)
response=$(curl -s -w "\n%{http_code}" -o /tmp/flavors_page1_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors?page=1&limit=10")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors?page=1&limit=10")
body=$(cat /tmp/flavors_page1_response.txt)
print_result "GET /api/v1/flavors?page=1&limit=10" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/flavors/zima
response=$(curl -s -w "\n%{http_code}" -o /tmp/flavor_zima_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors/zima")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors/zima")
body=$(cat /tmp/flavor_zima_response.txt)
print_result "GET /api/v1/flavors/zima" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# POST /api/v1/flavors/refresh
response=$(curl -s -w "\n%{http_code}" -o /tmp/flavors_refresh_response.txt -H "X-API-Key: $API_KEY" -X POST "$API_BASE_URL/api/v1/flavors/refresh")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" -X POST "$API_BASE_URL/api/v1/flavors/refresh")
body=$(cat /tmp/flavors_refresh_response.txt)
print_result "POST /api/v1/flavors/refresh" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

echo ""

# ============================================
# 6. Scheduler Endpoints (Auth Required)
# ============================================
echo -e "${YELLOW}6. Testing Scheduler Endpoints (Auth Required)${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api/v1/scheduler/stats
response=$(curl -s -w "\n%{http_code}" -o /tmp/scheduler_stats_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/scheduler/stats")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/scheduler/stats")
body=$(cat /tmp/scheduler_stats_response.txt)
print_result "GET /api/v1/scheduler/stats" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/scheduler/jobs
response=$(curl -s -w "\n%{http_code}" -o /tmp/scheduler_jobs_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/scheduler/jobs")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/scheduler/jobs")
body=$(cat /tmp/scheduler_jobs_response.txt)
print_result "GET /api/v1/scheduler/jobs" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

echo ""

# ============================================
# 7. Error Handling Tests
# ============================================
echo -e "${YELLOW}7. Testing Error Handling${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api/v1/brands/nonexistent (should return 404)
response=$(curl -s -w "\n%{http_code}" -o /tmp/brand_404_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/nonexistent")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/nonexistent")
body=$(cat /tmp/brand_404_response.txt)
print_result "GET /api/v1/brands/nonexistent" "404" "$code" "$time"
echo "Response: $body"
echo ""

# GET /api/v1/flavors/nonexistent (should return 404)
response=$(curl -s -w "\n%{http_code}" -o /tmp/flavor_404_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors/nonexistent")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors/nonexistent")
body=$(cat /tmp/flavor_404_response.txt)
print_result "GET /api/v1/flavors/nonexistent" "404" "$code" "$time"
echo "Response: $body"
echo ""

# GET /api/v1/brands/sarma/flavors with invalid brand (should return 404)
response=$(curl -s -w "\n%{http_code}" -o /tmp/brand_flavors_404_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/nonexistent/flavors")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands/nonexistent/flavors")
body=$(cat /tmp/brand_flavors_404_response.txt)
print_result "GET /api/v1/brands/nonexistent/flavors" "404" "$code" "$time"
echo "Response: $body"
echo ""

echo ""

# ============================================
# 8. Pagination and Filtering Tests
# ============================================
echo -e "${YELLOW}8. Testing Pagination and Filtering${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# GET /api/v1/brands with page=2
response=$(curl -s -w "\n%{http_code}" -o /tmp/brands_page2_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands?page=2&limit=10")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands?page=2&limit=10")
body=$(cat /tmp/brands_page2_response.txt)
print_result "GET /api/v1/brands?page=2&limit=10" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

# GET /api/v1/flavors with brandSlug filter
response=$(curl -s -w "\n%{http_code}" -o /tmp/flavors_filter_response.txt -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors?brandSlug=sarma")
code=$(tail -n1 <<< "$response")
time=$(curl -s -o /dev/null -w "%{time_total}s" -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors?brandSlug=sarma")
body=$(cat /tmp/flavors_filter_response.txt)
print_result "GET /api/v1/flavors?brandSlug=sarma" "200" "$code" "$time"
echo "Response: $body" | head -c 300
echo ""

echo ""

# ============================================
# 9. Data Validation Tests
# ============================================
echo -e "${YELLOW}9. Testing Data Validation${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Verify Sarma brand data structure
body=$(cat /tmp/brand_sarma_response.txt)

echo "Validating Sarma brand data structure:"
if echo "$body" | grep -q '"slug"'; then
    echo -e "${GREEN}✓${NC} Has slug field"
else
    echo -e "${RED}✗${NC} Missing slug field"
fi
if echo "$body" | grep -q '"name"'; then
    echo -e "${GREEN}✓${NC} Has name field"
else
    echo -e "${RED}✗${NC} Missing name field"
fi
if echo "$body" | grep -q '"country"'; then
    echo -e "${GREEN}✓${NC} Has country field"
else
    echo -e "${RED}✗${NC} Missing country field"
fi
if echo "$body" | grep -q '"rating"'; then
    echo -e "${GREEN}✓${NC} Has rating field"
else
    echo -e "${RED}✗${NC} Missing rating field"
fi
echo ""

# Verify Winter flavor data structure
body=$(cat /tmp/flavor_zima_response.txt)

echo "Validating Winter (zima) flavor data structure:"
if echo "$body" | grep -q '"slug"'; then
    echo -e "${GREEN}✓${NC} Has slug field"
else
    echo -e "${RED}✗${NC} Missing slug field"
fi
if echo "$body" | grep -q '"name"'; then
    echo -e "${GREEN}✓${NC} Has name field"
else
    echo -e "${RED}✗${NC} Missing name field"
fi
if echo "$body" | grep -q '"brandSlug"'; then
    echo -e "${GREEN}✓${NC} Has brandSlug field"
else
    echo -e "${RED}✗${NC} Missing brandSlug field"
fi
if echo "$body" | grep -q '"rating"'; then
    echo -e "${GREEN}✓${NC} Has rating field"
else
    echo -e "${RED}✗${NC} Missing rating field"
fi
if echo "$body" | grep -q '"tags"'; then
    echo -e "${GREEN}✓${NC} Has tags field"
else
    echo -e "${RED}✗${NC} Missing tags field"
fi
echo ""

# ============================================
# Summary
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed!${NC}"
    exit 1
fi
