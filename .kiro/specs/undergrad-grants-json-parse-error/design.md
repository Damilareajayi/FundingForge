# Undergrad Grants JSON Parse Error Bugfix Design

## Overview

The bug occurs when the frontend attempts to fetch grants data from `/api/grants` but receives a non-JSON response (HTML error page or 404) because the endpoint is not implemented on the server. This causes a JSON parsing error that prevents all users from viewing available grants in the Discovery Dashboard. The fix involves implementing the missing `/api/grants` endpoint in `server/routes.ts` to query the grants table from the database and return a valid JSON array of grant objects.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the frontend fetches from `/api/grants` and the server returns a non-JSON response
- **Property (P)**: The desired behavior - the server should return a valid JSON array of grant objects matching the schema
- **Preservation**: Existing endpoints (`/api/forge`, `/api/forge-stream`) and frontend filtering/search logic that must remain unchanged
- **grants table**: The PostgreSQL table defined in `shared/schema.ts` containing grant records with fields: id, name, targetAudience, eligibility, matchCriteria, internalDeadline
- **db**: The Drizzle ORM database connection exported from `server/db.ts`
- **api.grants.list**: The route definition in `shared/routes.ts` specifying the expected response schema

## Bug Details

### Fault Condition

The bug manifests when the frontend calls `fetch('/api/grants')` but the server has no route handler registered for this path. The Express server either returns a 404 Not Found response or an HTML error page, neither of which is valid JSON. When the frontend attempts to parse this response as JSON, it fails with "unexpected character at line 1 column 1".

**Formal Specification:**
```
FUNCTION isBugCondition(request)
  INPUT: request of type HTTPRequest
  OUTPUT: boolean
  
  RETURN request.method == 'GET'
         AND request.path == '/api/grants'
         AND NOT routeHandlerExists('/api/grants')
         AND responseIsNotJSON(serverResponse)
END FUNCTION
```

### Examples

- **Example 1**: User submits 4th year undergrad resume → Frontend fetches `/api/grants` → Server returns 404 HTML page → JSON.parse fails with "unexpected character at line 1 column 1"
- **Example 2**: User opens Discovery Dashboard → useGrants hook calls `/api/grants` → Server returns "Cannot GET /api/grants" HTML → Frontend displays "Couldn't load grants" error
- **Example 3**: Any user navigates to grants view → Fetch request to `/api/grants` → No route handler → Non-JSON response → Parsing error prevents grant display
- **Edge Case**: If database connection fails, endpoint should still return valid JSON (empty array or error object) rather than crashing

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- `/api/forge` POST endpoint must continue to process CV text and profile data correctly
- `/api/forge-stream` GET endpoint must continue to stream progress steps correctly
- Frontend filtering by audience (Faculty, Grad Students, Undergrads) must continue to work
- Frontend search by keywords must continue to filter results correctly
- Grant selection handling in the UI must remain unchanged

**Scope:**
All requests that do NOT target `/api/grants` should be completely unaffected by this fix. This includes:
- POST requests to `/api/forge`
- GET requests to `/api/forge-stream`
- Frontend filtering and search logic
- Database queries for other tables (faculty)
- Static asset serving

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing Route Handler**: The `/api/grants` endpoint is defined in the shared routes schema (`shared/routes.ts`) but no corresponding `app.get('/api/grants', ...)` handler exists in `server/routes.ts`

2. **Schema-Implementation Mismatch**: The shared schema defines the expected contract (GET request returning array of grants), but the server implementation never registers this route with Express

3. **Express Default Behavior**: When a route is not registered, Express returns a 404 response with HTML content ("Cannot GET /api/grants"), which cannot be parsed as JSON

4. **No Fallback Handling**: The frontend expects JSON and has no fallback for non-JSON responses, causing the parse error to propagate to the user

## Correctness Properties

Property 1: Fault Condition - Grants Endpoint Returns Valid JSON

_For any_ HTTP GET request to `/api/grants`, the server SHALL return a valid JSON response with status 200 containing an array of grant objects that conform to the grants table schema (id, name, targetAudience, eligibility, matchCriteria, internalDeadline).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Other Endpoints Unchanged

_For any_ HTTP request that is NOT a GET request to `/api/grants` (including POST to `/api/forge`, GET to `/api/forge-stream`, and all frontend operations), the system SHALL produce exactly the same behavior as before the fix, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

**File**: `server/routes.ts`

**Function**: `registerRoutes`

**Specific Changes**:
1. **Import Database Connection**: Add import for `db` and `grants` schema at the top of the file
   - `import { db } from "./db";`
   - `import { grants } from "@shared/schema";`

2. **Add GET /api/grants Route Handler**: Register a new Express route handler before the return statement
   - Use `app.get('/api/grants', async (req, res) => { ... })`
   - Query all grants from the database using Drizzle ORM
   - Return JSON array of grant objects

3. **Handle Database Connection Failure**: Check if `db` is null (no DATABASE_URL configured)
   - If null, return empty array `[]` to prevent crashes during development
   - If connected, execute query: `await db.select().from(grants)`

4. **Error Handling**: Wrap database query in try-catch block
   - Catch any database errors
   - Return 500 status with JSON error object (not HTML)
   - Log error for debugging

5. **Response Format**: Ensure response matches the schema defined in `shared/routes.ts`
   - Return array of objects with fields: id, name, targetAudience, eligibility, matchCriteria, internalDeadline
   - Use `res.json()` to ensure proper JSON serialization

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the `/api/grants` endpoint returns non-JSON responses.

**Test Plan**: Write tests that make HTTP GET requests to `/api/grants` on the UNFIXED server and assert that the response is not valid JSON. Capture the actual response content (404 HTML or error page) to confirm the root cause.

**Test Cases**:
1. **Missing Route Test**: Send GET request to `/api/grants` on unfixed server (will fail - returns 404 HTML)
2. **JSON Parse Test**: Attempt to parse response as JSON (will fail with "unexpected character" error)
3. **Frontend Integration Test**: Load Discovery Dashboard and observe "Couldn't load grants" error (will fail on unfixed code)
4. **Response Content Type Test**: Check Content-Type header of response (will be text/html instead of application/json)

**Expected Counterexamples**:
- Response body contains HTML like "Cannot GET /api/grants" instead of JSON array
- Content-Type header is text/html instead of application/json
- JSON.parse() throws SyntaxError when attempting to parse response

### Fix Checking

**Goal**: Verify that for all requests to `/api/grants`, the fixed server returns valid JSON with grant data.

**Pseudocode:**
```
FOR ALL request WHERE request.path == '/api/grants' AND request.method == 'GET' DO
  response := server_fixed.handle(request)
  ASSERT response.status == 200
  ASSERT response.contentType == 'application/json'
  ASSERT isValidJSON(response.body)
  ASSERT isArray(JSON.parse(response.body))
  ASSERT allElementsMatchGrantSchema(JSON.parse(response.body))
END FOR
```

### Preservation Checking

**Goal**: Verify that for all requests that do NOT target `/api/grants`, the fixed server produces the same result as the original server.

**Pseudocode:**
```
FOR ALL request WHERE NOT (request.path == '/api/grants' AND request.method == 'GET') DO
  ASSERT server_original.handle(request) == server_fixed.handle(request)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-grants requests

**Test Plan**: Observe behavior on UNFIXED code first for `/api/forge` and `/api/forge-stream` endpoints, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Forge Endpoint Preservation**: Observe that POST to `/api/forge` works correctly on unfixed code, then verify it continues working after fix
2. **Forge Stream Preservation**: Observe that GET to `/api/forge-stream` returns SSE correctly on unfixed code, then verify it continues after fix
3. **Frontend Filtering Preservation**: Observe that audience filtering works on unfixed code (with mock data), then verify it continues after fix
4. **Frontend Search Preservation**: Observe that keyword search works on unfixed code (with mock data), then verify it continues after fix

### Unit Tests

- Test `/api/grants` endpoint returns 200 status code
- Test response is valid JSON array
- Test each grant object has required fields (id, name, targetAudience, eligibility, matchCriteria, internalDeadline)
- Test endpoint handles database connection failure gracefully (returns empty array)
- Test endpoint handles database query errors (returns 500 with JSON error)

### Property-Based Tests

- Generate random HTTP requests and verify only GET `/api/grants` returns grant data
- Generate random grant data in database and verify endpoint returns all records
- Generate random database states (connected/disconnected) and verify endpoint never crashes
- Test that all non-grants requests continue to work across many scenarios

### Integration Tests

- Test full user flow: open Discovery Dashboard → grants load successfully → no JSON parse error
- Test filtering: load grants → filter by "Undergrads" audience → correct grants displayed
- Test search: load grants → search by keyword → correct grants displayed
- Test that `/api/forge` and `/api/forge-stream` continue to work after adding grants endpoint
