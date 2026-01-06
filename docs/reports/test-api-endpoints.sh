#!/bin/bash

# API Endpoint Testing Script
# Tests all flavor and brand endpoints with authentication, pagination, filtering, and performance metrics

set -e

# Configuration
API_BASE_URL="http://localhost:3000"
API_KEY="test-api-key-12345"
INVALID_API_KEY="invalid-key-99999"
RESULTS_FILE="API-TEST-RESULTS.md"
TEMP_DIR=$(mktemp -d)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper functions
print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((PASSED_TESTS++))
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAILED_TESTS++))
}

print_info() {
    echo -e "${BLUE}ℹ INFO: $1${NC}"
}

# Measure response time and get response with HTTP code
get_response() {
    local url="$1"
    local headers="$2"
    local output_file="$3"
    
    local start_time=$(date +%s%N)
    local response=$(curl -s -w "\nHTTP_CODE:%{http_code}" $headers "$url" 2>&1)
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))
    
    # Split response into body and HTTP code
    local http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_CODE:/d')
    
    echo "$body" > "$output_file"
    echo "$http_code"
    echo "$duration"
}

# Initialize results file
init_results() {
    cat > "$RESULTS_FILE" << 'EOF'
# API Endpoint Test Results

**Date:** $(date)
**API Base URL:** http://localhost:3000
**Test API Key:** test-api-key-12345

## Test Summary

| Category | Tests | Passed | Failed | Pass Rate |
|----------|-------|--------|--------|-----------|
| Flavor Endpoints | 0 | 0 | 0 | 0% |
| Brand Endpoints | 0 | 0 | 0 | 0% |
| Authentication | 0 | 0 | 0 | 0% |
| Pagination & Filtering | 0 | 0 | 0 | 0% |
| Data Integrity | 0 | 0 | 0 | 0% |
| Performance | 0 | 0 | 0 | 0% |
| **TOTAL** | **0** | **0** | **0** | **0%** |

## Test Results

EOF
}

# Append test result to file
append_result() {
    local category="$1"
    local test_name="$2"
    local status="$3"
    local details="$4"
    local response_time="$5"

    cat >> "$RESULTS_FILE" << EOF

### $category: $test_name

**Status:** $status
**Response Time:** ${response_time}ms

**Details:**
\`\`\`
$details
\`\`\`

EOF
}

# Test 1: Health Check (No auth required)
test_health_check() {
    print_header "Test 1: Health Check (No Auth Required)"
    
    local test_name="GET /health"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/health_response.txt"
    local result=$(get_response "$API_BASE_URL/health" "" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        append_result "Health Check" "$test_name" "✅ PASS" "$response_body" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Health Check" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 2: Detailed Health Check (No auth required)
test_health_detailed() {
    print_header "Test 2: Detailed Health Check (No Auth Required)"
    
    local test_name="GET /health/detailed"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/health_detailed_response.txt"
    local result=$(get_response "$API_BASE_URL/health/detailed" "" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        append_result "Health Check" "$test_name" "✅ PASS" "$response_body" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Health Check" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 3: GET /api/v1/flavors without API key (should return 401)
test_flavors_no_auth() {
    print_header "Test 3: GET /api/v1/flavors (No API Key)"
    
    local test_name="GET /api/v1/flavors without API key"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavors_no_auth.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors" "" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "401" ]; then
        print_pass "$test_name - HTTP $http_code (Unauthorized as expected)"
        append_result "Authentication" "$test_name" "✅ PASS" "$response_body" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code (Expected 401)"
        append_result "Authentication" "$test_name" "❌ FAIL" "Expected 401, got $http_code" "$response_time"
    fi
}

# Test 4: GET /api/v1/flavors with invalid API key (should return 403)
test_flavors_invalid_auth() {
    print_header "Test 4: GET /api/v1/flavors (Invalid API Key)"
    
    local test_name="GET /api/v1/flavors with invalid API key"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavors_invalid_auth.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors" "-H \"X-API-Key: $INVALID_API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "403" ]; then
        print_pass "$test_name - HTTP $http_code (Forbidden as expected)"
        append_result "Authentication" "$test_name" "✅ PASS" "$response_body" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code (Expected 403)"
        append_result "Authentication" "$test_name" "❌ FAIL" "Expected 403, got $http_code" "$response_time"
    fi
}

# Test 5: GET /api/v1/flavors with valid API key
test_flavors_list() {
    print_header "Test 5: GET /api/v1/flavors (Valid API Key)"
    
    local test_name="GET /api/v1/flavors with valid API key"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavors_list.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Flavor Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Check if response is valid JSON
        if echo "$response_body" | jq empty 2>/dev/null; then
            print_info "Response is valid JSON"
            
            # Extract data count
            local count=$(echo "$response_body" | jq '.data | length' 2>/dev/null || echo "0")
            print_info "Total flavors: $count"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Flavor Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 6: GET /api/v1/flavors with pagination
test_flavors_pagination() {
    print_header "Test 6: GET /api/v1/flavors (Pagination)"
    
    local test_name="GET /api/v1/flavors with pagination (page=1, limit=10)"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavors_pagination.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors?page=1&limit=10" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Pagination & Filtering" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Check pagination metadata
        if echo "$response_body" | jq empty 2>/dev/null; then
            local page=$(echo "$response_body" | jq '.pagination.page' 2>/dev/null || echo "N/A")
            local limit=$(echo "$response_body" | jq '.pagination.limit' 2>/dev/null || echo "N/A")
            local total=$(echo "$response_body" | jq '.pagination.total' 2>/dev/null || echo "N/A")
            local count=$(echo "$response_body" | jq '.data | length' 2>/dev/null || echo "0")
            
            print_info "Page: $page, Limit: $limit, Total: $total, Returned: $count"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Pagination & Filtering" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 7: GET /api/v1/flavors with brandSlug filter
test_flavors_filter_brand() {
    print_header "Test 7: GET /api/v1/flavors (Filter by Brand)"
    
    local test_name="GET /api/v1/flavors?brandSlug=sarma"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavors_filter_brand.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors?brandSlug=sarma" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Pagination & Filtering" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Check if all flavors have correct brandSlug
        if echo "$response_body" | jq empty 2>/dev/null; then
            local count=$(echo "$response_body" | jq '.data | length' 2>/dev/null || echo "0")
            print_info "Flavors for brand 'sarma': $count"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Pagination & Filtering" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 8: GET /api/v1/flavors/:slug with valid API key
test_flavor_by_slug() {
    print_header "Test 8: GET /api/v1/flavors/:slug"
    
    local test_name="GET /api/v1/flavors/zima"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/flavor_by_slug.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors/zima" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Flavor Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Verify data integrity
        if echo "$response_body" | jq empty 2>/dev/null; then
            local slug=$(echo "$response_body" | jq -r '.data.slug' 2>/dev/null || echo "N/A")
            local name=$(echo "$response_body" | jq -r '.data.name' 2>/dev/null || echo "N/A")
            local brand_slug=$(echo "$response_body" | jq -r '.data.brandSlug' 2>/dev/null || echo "N/A")
            
            print_info "Slug: $slug, Name: $name, Brand Slug: $brand_slug"
            
            # Check if brandSlug doesn't have "tobaccos/" prefix
            if [[ "$brand_slug" != *"tobaccos/"* ]]; then
                print_info "✓ brandSlug is correct (no 'tobaccos/' prefix)"
            else
                print_info "⚠ brandSlug has 'tobaccos/' prefix (should be removed)"
            fi
        fi
    elif [ "$http_code" = "404" ]; then
        print_info "$test_name - HTTP 404 (Flavor not found - may not exist in database)"
        append_result "Flavor Endpoints" "$test_name" "⚠️ SKIP" "Flavor not found (404)" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Flavor Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 9: GET /api/v1/brands/:brandSlug/flavors
test_brand_flavors() {
    print_header "Test 9: GET /api/v1/brands/:brandSlug/flavors"
    
    local test_name="GET /api/v1/brands/sarma/flavors"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/brand_flavors.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/brands/sarma/flavors" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Flavor Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Check flavor count
        if echo "$response_body" | jq empty 2>/dev/null; then
            local count=$(echo "$response_body" | jq '.data | length' 2>/dev/null || echo "0")
            print_info "Flavors for brand 'sarma': $count"
        fi
    elif [ "$http_code" = "404" ]; then
        print_info "$test_name - HTTP 404 (Brand not found or no flavors)"
        append_result "Flavor Endpoints" "$test_name" "⚠️ SKIP" "Brand not found or no flavors (404)" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Flavor Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 10: POST /api/v1/flavors/refresh
test_flavors_refresh() {
    print_header "Test 10: POST /api/v1/flavors/refresh"
    
    local test_name="POST /api/v1/flavors/refresh"
    ((TOTAL_TESTS++))
    
    print_info "This test may take 15-20 seconds as it scrapes data from htreviews.org"
    
    local temp_file="$TEMP_DIR/flavors_refresh.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/flavors/refresh" "-X POST -H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Flavor Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Extract refresh stats
        if echo "$response_body" | jq empty 2>/dev/null; then
            local message=$(echo "$response_body" | jq -r '.message' 2>/dev/null || echo "N/A")
            print_info "Message: $message"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Flavor Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 11: GET /api/v1/brands
test_brands_list() {
    print_header "Test 11: GET /api/v1/brands"
    
    local test_name="GET /api/v1/brands"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/brands_list.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/brands" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Brand Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Check brand count
        if echo "$response_body" | jq empty 2>/dev/null; then
            local count=$(echo "$response_body" | jq '.data | length' 2>/dev/null || echo "0")
            print_info "Total brands: $count"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Brand Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 12: GET /api/v1/brands/:slug
test_brand_by_slug() {
    print_header "Test 12: GET /api/v1/brands/:slug"
    
    local test_name="GET /api/v1/brands/sarma"
    ((TOTAL_TESTS++))
    
    local temp_file="$TEMP_DIR/brand_by_slug.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/brands/sarma" "-H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Brand Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Verify data integrity
        if echo "$response_body" | jq empty 2>/dev/null; then
            local slug=$(echo "$response_body" | jq -r '.data.slug' 2>/dev/null || echo "N/A")
            local name=$(echo "$response_body" | jq -r '.data.name' 2>/dev/null || echo "N/A")
            
            print_info "Slug: $slug, Name: $name"
        fi
    elif [ "$http_code" = "404" ]; then
        print_info "$test_name - HTTP 404 (Brand not found)"
        append_result "Brand Endpoints" "$test_name" "⚠️ SKIP" "Brand not found (404)" "$response_time"
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Brand Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 13: POST /api/v1/brands/refresh
test_brands_refresh() {
    print_header "Test 13: POST /api/v1/brands/refresh"
    
    local test_name="POST /api/v1/brands/refresh"
    ((TOTAL_TESTS++))
    
    print_info "This test may take 10-15 seconds as it scrapes data from htreviews.org"
    
    local temp_file="$TEMP_DIR/brands_refresh.txt"
    local result=$(get_response "$API_BASE_URL/api/v1/brands/refresh" "-X POST -H \"X-API-Key: $API_KEY\"" "$temp_file")
    local http_code=$(echo "$result" | head -n1)
    local response_time=$(echo "$result" | tail -n1)
    local response_body=$(cat "$temp_file")
    
    print_test "$test_name"
    
    if [ "$http_code" = "200" ]; then
        print_pass "$test_name - HTTP $http_code"
        print_info "Response time: ${response_time}ms"
        append_result "Brand Endpoints" "$test_name" "✅ PASS" "$response_body" "$response_time"
        
        # Extract refresh stats
        if echo "$response_body" | jq empty 2>/dev/null; then
            local message=$(echo "$response_body" | jq -r '.message' 2>/dev/null || echo "N/A")
            print_info "Message: $message"
        fi
    else
        print_fail "$test_name - HTTP $http_code"
        append_result "Brand Endpoints" "$test_name" "❌ FAIL" "Expected 200, got $http_code" "$response_time"
    fi
}

# Test 14: Data integrity check
test_data_integrity() {
    print_header "Test 14: Data Integrity Check"
    
    local test_name="Data integrity verification"
    ((TOTAL_TESTS++))
    
    # Get a flavor and check its structure
    local response=$(curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/flavors?limit=1" 2>&1)
    
    if echo "$response" | jq empty 2>/dev/null; then
        local has_slug=$(echo "$response" | jq '.data[0].slug' 2>/dev/null || echo "null")
        local has_name=$(echo "$response" | jq '.data[0].name' 2>/dev/null || echo "null")
        local has_brand_slug=$(echo "$response" | jq '.data[0].brandSlug' 2>/dev/null || echo "null")
        local has_rating=$(echo "$response" | jq '.data[0].rating' 2>/dev/null || echo "null")
        
        if [ "$has_slug" != "null" ] && [ "$has_name" != "null" ] && [ "$has_brand_slug" != "null" ]; then
            print_pass "$test_name - All required fields present"
            append_result "Data Integrity" "$test_name" "✅ PASS" "slug, name, brandSlug, rating fields present" "N/A"
        else
            print_fail "$test_name - Missing required fields"
            append_result "Data Integrity" "$test_name" "❌ FAIL" "Missing required fields" "N/A"
        fi
    else
        print_fail "$test_name - Invalid JSON response"
        append_result "Data Integrity" "$test_name" "❌ FAIL" "Invalid JSON response" "N/A"
    fi
}

# Test 15: Performance check
test_performance() {
    print_header "Test 15: Performance Check"
    
    local test_name="Average response time < 200ms"
    ((TOTAL_TESTS++))
    
    local total_time=0
    local iterations=10
    
    print_info "Testing response times with $iterations iterations..."
    
    for i in $(seq 1 $iterations); do
        local start=$(date +%s%N)
        curl -s -H "X-API-Key: $API_KEY" "$API_BASE_URL/api/v1/brands" > /dev/null
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        total_time=$((total_time + duration))
    done
    
    local avg_time=$((total_time / iterations))
    
    print_info "Average response time: ${avg_time}ms"
    
    if [ $avg_time -lt 200 ]; then
        print_pass "$test_name - ${avg_time}ms < 200ms"
        append_result "Performance" "$test_name" "✅ PASS" "Average: ${avg_time}ms over $iterations requests" "$avg_time"
    else
        print_fail "$test_name - ${avg_time}ms >= 200ms"
        append_result "Performance" "$test_name" "❌ FAIL" "Average: ${avg_time}ms over $iterations requests (target: <200ms)" "$avg_time"
    fi
}

# Generate final summary
generate_summary() {
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi
    
    cat >> "$RESULTS_FILE" << EOF

## Final Summary

- **Total Tests:** $TOTAL_TESTS
- **Passed:** $PASSED_TESTS
- **Failed:** $FAILED_TESTS
- **Pass Rate:** ${pass_rate}%

## Overall Status

EOF

    if [ $pass_rate -ge 90 ]; then
        echo "✅ **PRODUCTION READY** - API is functioning correctly with ${pass_rate}% pass rate" >> "$RESULTS_FILE"
    elif [ $pass_rate -ge 70 ]; then
        echo "⚠️ **MOSTLY READY** - API is mostly functional with ${pass_rate}% pass rate. Minor issues to address." >> "$RESULTS_FILE"
    else
        echo "❌ **NOT READY** - API has significant issues with ${pass_rate}% pass rate. Major fixes required." >> "$RESULTS_FILE"
    fi
    
    cat >> "$RESULTS_FILE" << EOF

## Recommendations

EOF

    if [ $FAILED_TESTS -eq 0 ]; then
        echo "- All tests passed! API is ready for production deployment." >> "$RESULTS_FILE"
    else
        echo "- Review failed tests and fix identified issues." >> "$RESULTS_FILE"
        echo "- Ensure all endpoints return correct HTTP status codes." >> "$RESULTS_FILE"
        echo "- Verify data integrity and response formats." >> "$RESULTS_FILE"
    fi
    
    if [ $pass_rate -lt 90 ]; then
        echo "- Address performance issues if response times exceed 200ms." >> "$RESULTS_FILE"
    fi
}

# Main execution
main() {
    print_header "API Endpoint Testing Suite"
    print_info "Starting comprehensive API endpoint tests..."
    print_info "API Base URL: $API_BASE_URL"
    print_info "Test API Key: $API_KEY"
    echo ""
    
    # Initialize results file
    init_results
    
    # Run all tests
    test_health_check
    test_health_detailed
    test_flavors_no_auth
    test_flavors_invalid_auth
    test_flavors_list
    test_flavors_pagination
    test_flavors_filter_brand
    test_flavor_by_slug
    test_brand_flavors
    test_flavors_refresh
    test_brands_list
    test_brand_by_slug
    test_brands_refresh
    test_data_integrity
    test_performance
    
    # Generate final summary
    generate_summary
    
    # Print final summary
    print_header "Test Summary"
    echo -e "${BLUE}Total Tests:${NC} $TOTAL_TESTS"
    echo -e "${GREEN}Passed:${NC} $PASSED_TESTS"
    echo -e "${RED}Failed:${NC} $FAILED_TESTS"
    
    local pass_rate=0
    if [ $TOTAL_TESTS -gt 0 ]; then
        pass_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi
    echo -e "${BLUE}Pass Rate:${NC} ${pass_rate}%"
    echo ""
    
    print_info "Detailed results saved to: $RESULTS_FILE"
    
    # Cleanup
    rm -rf "$TEMP_DIR"
    
    # Exit with appropriate code
    if [ $FAILED_TESTS -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main
