# Implementation Plan

- [ ] 1. Write bug condition exploration tests
  - **Property 1: Fault Condition** - Four API Integration Bugs
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failures confirm the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate the four bugs exist
  
  - [ ] 1.1 Test grants polling loop behavior
    - Mount DiscoveryDashboard component in test environment
    - Monitor network requests to `/api/grants` over 10 second window
    - Count number of requests made
    - **EXPECTED OUTCOME on UNFIXED code**: Multiple requests (3-5+) instead of 1 - FAILURE confirms polling bug
    - Document counterexamples: exact number of requests and timing intervals
    - _Requirements: 2.1_
  
  - [ ] 1.2 Test grants data source (database vs AWS Knowledge Base)
    - Call `GET /api/grants` endpoint
    - Inspect backend implementation to verify data source
    - Check if response is empty array (indicating empty database table)
    - **EXPECTED OUTCOME on UNFIXED code**: Queries database instead of AWS KB, returns empty array - FAILURE confirms wrong data source bug
    - Document counterexamples: empty response when grants should exist in AWS KB
    - _Requirements: 2.2_
  
  - [ ] 1.3 Test faculty endpoint existence
    - Attempt to call `GET /api/faculty` endpoint
    - Observe response status code
    - **EXPECTED OUTCOME on UNFIXED code**: 404 error - FAILURE confirms missing endpoint bug
    - Document counterexamples: "Cannot GET /api/faculty" error message
    - _Requirements: 2.3_
  
  - [ ] 1.4 Test SSE endpoint parameterization
    - Attempt to connect to `/api/forge/123` (with grantId parameter)
    - Observe connection status
    - **EXPECTED OUTCOME on UNFIXED code**: 404 error because backend only has `/api/forge-stream` - FAILURE confirms endpoint mismatch bug
    - Document counterexamples: connection failure with specific grantId
    - _Requirements: 2.4, 2.5_
  
  - [ ] 1.5 Investigate component remounting (optional diagnostic)
    - Add console.log or React DevTools profiler to DiscoveryDashboard
    - Observe if component mounts multiple times
    - Document findings: is remounting causing the polling issue?
    - This helps confirm or refute root cause hypothesis
    - _Requirements: 2.1_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Existing API Behavior
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy scenarios
  - Write property-based tests capturing observed behavior patterns
  - Property-based testing generates many test cases for stronger guarantees
  
  - [ ] 2.1 Test Zod validation preservation
    - Observe: API responses are validated with Zod schemas on unfixed code
    - Write property test: for all API responses (grants, faculty, forge chunks), Zod validation occurs with same error logging
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline validation behavior)
    - _Requirements: 3.1, 3.3_
  
  - [ ] 2.2 Test query configuration preservation
    - Observe: queryClient uses `staleTime: Infinity` and `refetchInterval: false` on unfixed code
    - Write property test: for all React Query hooks, default options remain unchanged
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline caching configuration)
    - _Requirements: 3.2_
  
  - [ ] 2.3 Test error handling preservation
    - Observe: 500 errors display error states in UI on unfixed code
    - Write property test: for all error conditions, same try-catch patterns and error state display occur
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline error handling)
    - _Requirements: 3.5_
  
  - [ ] 2.4 Test AbortController cleanup preservation
    - Observe: stream cancellation properly cleans up resources on unfixed code (if testable)
    - Write property test: for all stream cancellation scenarios, AbortController cleanup works correctly
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline cleanup behavior)
    - _Requirements: 3.5_
  
  - [ ] 2.5 Test unaffected endpoints preservation
    - Observe: `/api/forge` POST endpoint works on unfixed code
    - Write property test: for all non-affected endpoints, behavior remains identical
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms other endpoints unaffected)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 3. Fix for frontend API integration issues

  - [ ] 3.1 Install AWS SDK for JavaScript v3
    - Add @aws-sdk/client-bedrock-agent-runtime to package.json
    - Run: `npm install @aws-sdk/client-bedrock-agent-runtime`
    - Verify installation successful
    - _Requirements: 2.2_

  - [ ] 3.2 Create AWS Knowledge Base helper module
    - Create new file `server/aws-kb.ts`
    - Import BedrockAgentRuntimeClient and RetrieveCommand from AWS SDK
    - Create kbClient instance with region "us-east-1"
    - Implement `retrieveFromKB(kbId, query, numberOfResults)` function
    - Mirror Python agents.py `_retrieve` pattern with vectorSearchConfiguration
    - Format results as text similar to Python version
    - Add error handling for AWS SDK errors
    - Export retrieveFromKB function and kbClient
    - _Bug_Condition: isBugCondition(input) where input.scenario == "grants_data_source" AND queriesDatabase() == true_
    - _Expected_Behavior: Query AWS Knowledge Base (KB ID: KFW7ZEBGMR) using AWS SDK with same pattern as agents.py_
    - _Preservation: AWS credentials loaded from environment variables same way as Python agent_
    - _Requirements: 2.2, 3.1_

  - [ ] 3.3 Update /api/grants endpoint to query AWS Knowledge Base
    - Import retrieveFromKB from aws-kb module
    - Remove database query: `await db.select().from(grants)`
    - Add AWS KB query: `await retrieveFromKB("KFW7ZEBGMR", "grant opportunities", 10)`
    - Parse text results into Grant objects matching Zod schema
    - Handle AWS errors gracefully (return empty array if KB query fails)
    - Consider caching results in memory or database for performance
    - Maintain existing Zod validation and error handling patterns
    - _Bug_Condition: isBugCondition(input) where input.endpoint == "/api/grants" AND queriesDatabase() == true_
    - _Expected_Behavior: Returns grant opportunities from AWS Knowledge Base instead of empty database table_
    - _Preservation: Zod validation, error handling, and response format unchanged_
    - _Requirements: 2.2, 3.1, 3.3_

  - [ ] 3.4 Implement /api/faculty endpoint
    - Add new route handler: `app.get('/api/faculty', async (req, res) => {...})`
    - Query database: `await db.select().from(faculty)`
    - Import faculty schema from @shared/schema
    - Handle database connection failures gracefully (return empty array if db is null)
    - Include try-catch error handling with 500 status on failure
    - Follow same pattern as other database query endpoints
    - _Bug_Condition: isBugCondition(input) where input.scenario == "faculty_fetch" AND endpointExists(input.endpoint) == false_
    - _Expected_Behavior: Successful fetch returning faculty array validated against Zod schema_
    - _Preservation: Database query pattern, error handling, and Zod validation consistent with other endpoints_
    - _Requirements: 2.3, 3.1, 3.3_

  - [ ] 3.5 Update SSE endpoint to accept grantId parameter
    - Change route from `/api/forge-stream` to `/api/forge/:grantId`
    - Extract grantId from request params: `const { grantId } = req.params`
    - Maintain same SSE response format and streaming logic
    - Optionally use grantId to customize streaming behavior
    - Ensure SSE events format remains: `data: {"step": "...", "done": false}`
    - _Bug_Condition: isBugCondition(input) where frontendExpects("/api/forge/:grantId") AND backendImplements("/api/forge-stream")_
    - _Expected_Behavior: Successful SSE connection with grantId parameter, streaming events received_
    - _Preservation: SSE event format, streaming logic, and error handling unchanged_
    - _Requirements: 2.4, 2.5, 3.1, 3.3_

  - [ ] 3.6 Investigate and fix grants polling loop
    - Review DiscoveryDashboard component and parent components for remounting issues
    - Check if parent component state changes cause unnecessary re-renders
    - Verify onPickGrant callback is stable (wrapped in useCallback if needed)
    - Ensure api.grants.list.path is imported at module level and not recreated
    - If component remounting is unavoidable, add `refetchOnMount: false` to useGrants hook
    - If query key instability detected, stabilize the query key
    - Test that grants endpoint is called exactly once when component mounts
    - _Bug_Condition: isBugCondition(input) where requestsRepeating(input.endpoint, interval < 3000)_
    - _Expected_Behavior: Single GET /api/grants request with cached result, no repeated polling_
    - _Preservation: Query configuration defaults (staleTime: Infinity, refetchInterval: false) remain unchanged_
    - _Requirements: 2.1, 3.2_

  - [ ] 3.7 Verify bug condition exploration tests now pass
    - **Property 1: Expected Behavior** - Four API Integration Bugs Fixed
    - **IMPORTANT**: Re-run the SAME tests from task 1 - do NOT write new tests
    - The tests from task 1 encode the expected behavior
    - When these tests pass, it confirms the expected behavior is satisfied
    
    - [ ] 3.7.1 Re-run grants polling test
      - Run test from task 1.1
      - **EXPECTED OUTCOME**: Test PASSES - exactly 1 request to /api/grants in 10 seconds
      - _Requirements: 2.1_
    
    - [ ] 3.7.2 Re-run grants data source test
      - Run test from task 1.2
      - **EXPECTED OUTCOME**: Test PASSES - queries AWS Knowledge Base, returns grant data
      - _Requirements: 2.2_
    
    - [ ] 3.7.3 Re-run faculty endpoint test
      - Run test from task 1.3
      - **EXPECTED OUTCOME**: Test PASSES - 200 status with faculty array
      - _Requirements: 2.3_
    
    - [ ] 3.7.4 Re-run SSE endpoint test
      - Run test from task 1.4
      - **EXPECTED OUTCOME**: Test PASSES - successful connection to /api/forge/:grantId
      - _Requirements: 2.4, 2.5_

  - [ ] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Existing API Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation property tests from step 2
    - **EXPECTED OUTCOME**: All tests PASS (confirms no regressions)
    - Confirm Zod validation, query configuration, error handling, AbortController cleanup, and unaffected endpoints all work as before
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run all exploration tests (should now pass)
  - Run all preservation tests (should still pass)
  - Run full integration test: SelectionPortal → DiscoveryDashboard → FinalPacket
  - Verify grants load from AWS Knowledge Base and display correctly
  - Verify faculty data loads and displays in CollaboratorMesh
  - Verify forge stream connects and progresses through states
  - Verify no repeated polling of /api/grants
  - Ask user if any questions arise or if additional testing is needed
