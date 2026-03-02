# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Grants Endpoint Returns Non-JSON Response
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to GET requests to `/api/grants` endpoint
  - Test that GET `/api/grants` returns valid JSON with status 200 and array of grant objects
  - Test that response Content-Type is `application/json`
  - Test that response body can be parsed as JSON without errors
  - Test that parsed JSON is an array with grant objects matching schema (id, name, targetAudience, eligibility, matchCriteria, internalDeadline)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "GET /api/grants returns 404 HTML page instead of JSON array")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Other Endpoints Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-grants endpoints
  - Observe: POST `/api/forge` processes CV text and profile data correctly
  - Observe: GET `/api/forge-stream` streams progress steps correctly
  - Write property-based tests capturing observed behavior patterns
  - Test that POST `/api/forge` continues to work with same inputs/outputs
  - Test that GET `/api/forge-stream` continues to return SSE stream correctly
  - Test that frontend filtering and search logic remains unchanged
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for missing /api/grants endpoint

  - [x] 3.1 Implement the /api/grants endpoint in server/routes.ts
    - Import database connection: `import { db } from "./db";`
    - Import grants schema: `import { grants } from "@shared/schema";`
    - Add GET `/api/grants` route handler in registerRoutes function
    - Query all grants from database using Drizzle ORM: `await db.select().from(grants)`
    - Handle database connection failure: return empty array if db is null
    - Wrap database query in try-catch block for error handling
    - Return 500 status with JSON error object on database errors (not HTML)
    - Return JSON array of grant objects with res.json()
    - Ensure response matches schema: id, name, targetAudience, eligibility, matchCriteria, internalDeadline
    - _Bug_Condition: isBugCondition(request) where request.method == 'GET' AND request.path == '/api/grants' AND NOT routeHandlerExists('/api/grants')_
    - _Expected_Behavior: For any GET request to /api/grants, return valid JSON response with status 200 containing array of grant objects_
    - _Preservation: All requests NOT targeting /api/grants remain unchanged (POST /api/forge, GET /api/forge-stream, frontend filtering/search)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Grants Endpoint Returns Valid JSON
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Other Endpoints Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
