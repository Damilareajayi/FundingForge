# Frontend API Integration Fix - Bugfix Design

## Overview

The frontend is experiencing four distinct API integration issues that prevent proper application flow: (1) a polling loop on `/api/grants` that fires repeatedly every 1-2 seconds despite proper query configuration, (2) the `/api/grants` endpoint queries an empty database table instead of AWS Knowledge Base (KB ID: KFW7ZEBGMR) where grants actually exist, (3) a missing `/api/faculty` endpoint causing silent failures when loading collaborator data, and (4) an SSE endpoint mismatch where the backend implements `/api/forge-stream` (non-parameterized) but the frontend expects `/api/forge/:grantId` (parameterized).

The fix strategy involves: (1) investigating and resolving the root cause of the grants polling behavior (likely component remounting or query key issues), (2) updating `/api/grants` to query AWS Knowledge Base using the same `_retrieve` pattern from agents.py instead of the database, (3) implementing the missing `/api/faculty` endpoint on the backend, and (4) aligning the SSE endpoint implementation to match the frontend's expectation of a parameterized route that accepts a grantId.

## Glossary

- **Bug_Condition (C)**: The conditions that trigger the four distinct bugs - grants polling loop, wrong data source for grants, missing faculty endpoint, and SSE endpoint mismatch
- **Property (P)**: The desired behavior - single grants request with caching, grants from AWS Knowledge Base, successful faculty data fetching, and working SSE connection with grantId parameter
- **Preservation**: Existing Zod validation, query configuration defaults, error handling, and schema imports that must remain unchanged
- **AWS Knowledge Base**: The Bedrock Knowledge Base (KB ID: KFW7ZEBGMR) that contains grant opportunities, accessed via boto3 bedrock-agent-runtime client
- **_retrieve**: The Python helper function in agents.py that queries AWS Knowledge Base using vectorSearchConfiguration
- **useGrants**: The hook in `client/src/hooks/use-grants.ts` that fetches grants data using React Query
- **useFaculty**: The hook in `client/src/hooks/use-faculty.ts` that attempts to fetch faculty data from the non-existent endpoint
- **useForgeStream**: The hook in `client/src/hooks/use-forge-stream.ts` that attempts to connect to the SSE endpoint with a grantId parameter
- **queryClient**: The React Query client in `client/src/lib/queryClient.ts` configured with `staleTime: Infinity` and `refetchInterval: false`
- **DiscoveryDashboard**: The component in `client/src/components/DiscoveryDashboard.tsx` that displays grants and triggers the polling behavior
- **FinalPacket**: The component in `client/src/components/FinalPacket.tsx` that attempts to fetch faculty data and start the forge stream

## Bug Details

### Fault Condition

The bugs manifest in four distinct scenarios:

**Bug 1 - Grants Polling Loop**: When the DiscoveryDashboard component is mounted, the system makes repeated `GET /api/grants` requests every 1-2 seconds instead of a single cached request, despite the queryClient being configured with `staleTime: Infinity` and `refetchInterval: false`.

**Bug 2 - Wrong Data Source for Grants**: When the `/api/grants` endpoint is called, it queries the database table `grants` which is empty. However, grants actually come from AWS Knowledge Base (KB ID: KFW7ZEBGMR) via the Python agent's `search_grant_opportunities` tool. The backend should use the same `_retrieve` pattern from agents.py to query AWS Knowledge Base, not the database.

**Bug 3 - Missing Faculty Endpoint**: When the FinalPacket component mounts and the useFaculty hook attempts to fetch data, the request to `/api/faculty` fails with a 404 because the endpoint does not exist on the backend.

**Bug 4 - SSE Endpoint Mismatch**: When the FinalPacket component attempts to start the forge stream, the useForgeStream hook builds a URL like `/api/forge/123` (with grantId parameter) but the backend only implements `/api/forge-stream` (non-parameterized), causing the connection to fail.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { scenario: string, component: string, endpoint: string }
  OUTPUT: boolean
  
  RETURN (
    // Bug 1: Grants polling
    (input.scenario == "grants_fetch" 
     AND input.component == "DiscoveryDashboard"
     AND requestsRepeating(input.endpoint, interval < 3000))
    
    OR
    
    // Bug 2: Wrong data source for grants
    (input.scenario == "grants_data_source"
     AND input.endpoint == "/api/grants"
     AND queriesDatabase() == true
     AND shouldQueryAWSKnowledgeBase() == true)
    
    OR
    
    // Bug 3: Missing faculty endpoint
    (input.scenario == "faculty_fetch"
     AND input.component == "FinalPacket"
     AND endpointExists(input.endpoint) == false)
    
    OR
    
    // Bug 4: SSE endpoint mismatch
    (input.scenario == "forge_stream"
     AND input.component == "FinalPacket"
     AND frontendExpects("/api/forge/:grantId")
     AND backendImplements("/api/forge-stream"))
  )
END FUNCTION
```

### Examples

- **Bug 1 Example**: User navigates to DiscoveryDashboard → `GET /api/grants` fires → 1.5 seconds later → `GET /api/grants` fires again → repeats indefinitely. Expected: Single request with cached result.

- **Bug 2 Example**: User calls `GET /api/grants` → backend queries database table `grants` → returns empty array because table is empty → frontend sees no grants. Expected: Backend queries AWS Knowledge Base (KB ID: KFW7ZEBGMR) using boto3 bedrock-agent-runtime client and returns grant opportunities from the Knowledge Base.

- **Bug 3 Example**: User selects a grant and navigates to FinalPacket → useFaculty hook attempts `GET /api/faculty` → receives 404 error → displays "Couldn't load collaborators" error state. Expected: Successful fetch returning faculty array.

- **Bug 4 Example**: User is on FinalPacket with grantId=5 → useForgeStream builds URL `/api/forge/5` → attempts to connect → receives 404 because backend only has `/api/forge-stream` → no SSE events received → forge status shows "Initializing…" indefinitely. Expected: Successful SSE connection with streaming events.

- **Edge Case**: User rapidly switches between grants on FinalPacket → multiple forge streams may be initiated → AbortController should properly cancel previous streams (this behavior should be preserved).

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Zod validation for grants, faculty, and forge stream chunks must continue using schemas from `@shared/schema`
- QueryClient default options (`staleTime: Infinity`, `refetchInterval: false`, `refetchOnWindowFocus: false`) must remain unchanged
- Error handling patterns with try-catch blocks and error state display must continue to work
- Type imports from `@shared/schema` (Grant, Faculty types) must continue to be used rather than local type definitions
- AbortController cleanup logic in useForgeStream must continue to properly cancel streams on unmount or re-trigger

**Scope:**
All API interactions that do NOT involve the three specific bugs should be completely unaffected by this fix. This includes:
- The existing `/api/forge` POST endpoint for non-streaming forge requests
- Query key generation and caching behavior for other endpoints
- Error boundary behavior and toast notifications
- Component rendering and UI state management

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Grants Polling - Component Remounting**: The DiscoveryDashboard component may be remounting repeatedly due to parent component state changes, causing the useGrants hook to re-execute and trigger new requests despite proper query configuration. Alternatively, the query key may be unstable (regenerated on each render).

2. **Grants Polling - Query Key Instability**: The queryKey in useGrants is `[api.grants.list.path]` which should be stable, but if `api.grants.list.path` is being recreated on each render (unlikely but possible), it would cause cache misses.

3. **Wrong Data Source - Architectural Mismatch**: The `/api/grants` endpoint in server/routes.ts queries the database table using `await db.select().from(grants)`, but this table is empty. The actual grant data comes from AWS Knowledge Base (KB ID: KFW7ZEBGMR) which is accessed by the Python agent's `search_grant_opportunities` tool using the `_retrieve` helper function. The Node.js backend needs to integrate AWS SDK for JavaScript v3 (@aws-sdk/client-bedrock-agent-runtime) to query the Knowledge Base directly.

4. **Missing Faculty Endpoint**: The backend `server/routes.ts` file simply does not implement a `GET /api/faculty` route handler, even though the frontend expects it based on the shared API contract in `shared/routes.ts`. Faculty data IS in the database, so this endpoint should query the database.

5. **SSE Endpoint Mismatch - Path Definition**: The backend implements `/api/forge-stream` as a non-parameterized route, but the frontend's `shared/routes.ts` defines `streams.forge.path` as `/api/forge/:grantId`, expecting a parameterized route. The backend needs to either accept the grantId as a parameter or the frontend needs to adjust (backend change is preferred to match the contract).

## Correctness Properties

Property 1: Fault Condition - Single Grants Request with Caching

_For any_ scenario where the DiscoveryDashboard component mounts and the grants endpoint is called, the fixed system SHALL make exactly one `GET /api/grants` request and cache the result, preventing repeated polling behavior even if the component remains mounted for extended periods.

**Validates: Requirements 2.1**

Property 2: Fault Condition - Grants from AWS Knowledge Base

_For any_ request to the `/api/grants` endpoint, the fixed system SHALL query AWS Knowledge Base (KB ID: KFW7ZEBGMR) using the AWS SDK for JavaScript v3 (@aws-sdk/client-bedrock-agent-runtime) with the same retrieval pattern as agents.py, returning grant opportunities from the Knowledge Base instead of the empty database table.

**Validates: Requirements 2.2**

Property 3: Fault Condition - Faculty Endpoint Returns Data

_For any_ scenario where the FinalPacket component mounts and attempts to fetch faculty data, the fixed system SHALL successfully complete the `GET /api/faculty` request and return an array of faculty records validated against the Zod schema, allowing the CollaboratorMesh component to display collaborator information.

**Validates: Requirements 2.3**

Property 4: Fault Condition - Parameterized SSE Connection

_For any_ scenario where the FinalPacket component starts a forge stream with a specific grantId, the fixed system SHALL successfully connect to `/api/forge/:grantId` (with the grantId parameter substituted), receive SSE events in the format `data: {"step": "...", "done": false}`, and eventually receive a final event with `done: true`.

**Validates: Requirements 2.4, 2.5**

Property 5: Preservation - Zod Validation Unchanged

_For any_ API response from grants, faculty, or forge stream endpoints, the fixed system SHALL continue to validate responses against the Zod schemas defined in `@shared/schema`, maintaining the same validation error logging behavior when validation fails.

**Validates: Requirements 3.1, 3.3**

Property 6: Preservation - Query Configuration Unchanged

_For any_ React Query hook (useGrants, useFaculty), the fixed system SHALL continue to use the queryClient's default options including `staleTime: Infinity` and `refetchInterval: false`, preserving the intended caching behavior for all queries.

**Validates: Requirements 3.2**

Property 7: Preservation - Error Handling and Cleanup Unchanged

_For any_ error condition or stream cancellation scenario, the fixed system SHALL continue to handle errors with the same try-catch patterns, display error states in the UI, and properly clean up resources using AbortController, preserving all existing error handling and cleanup logic.

**Validates: Requirements 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `server/routes.ts`

**Function**: `registerRoutes`

**Specific Changes**:
1. **Install AWS SDK**: Add @aws-sdk/client-bedrock-agent-runtime to package.json dependencies
   - Run: `npm install @aws-sdk/client-bedrock-agent-runtime`
   - This provides the BedrockAgentRuntimeClient for querying Knowledge Bases

2. **Create AWS Knowledge Base Helper**: Add a `retrieveFromKB` helper function that mirrors the Python `_retrieve` function
   - Import: `import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";`
   - Create client: `const kbClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });`
   - Implement function that takes kbId, query, and numberOfResults (default 5)
   - Use RetrieveCommand with vectorSearchConfiguration
   - Format results as text similar to Python version

3. **Update Grants Endpoint**: Change `/api/grants` to query AWS Knowledge Base instead of database
   - Remove: `await db.select().from(grants)`
   - Add: `const grantsText = await retrieveFromKB("KFW7ZEBGMR", "grant opportunities", 10);`
   - Parse the text results into Grant objects matching the Zod schema
   - Consider caching the results in memory or database for performance
   - Handle AWS errors gracefully (return empty array if KB query fails)

4. **Add Faculty Endpoint**: Implement a new `GET /api/faculty` route handler that queries the faculty table from the database
   - Follow the same pattern as the original grants endpoint
   - Handle database connection failures gracefully (return empty array if db is null)
   - Include try-catch error handling with 500 status on failure
   - Query: `await db.select().from(faculty)`
   - Import faculty schema: `import { grants, faculty } from "@shared/schema";`

5. **Update Forge Stream Endpoint**: Change `/api/forge-stream` to `/api/forge/:grantId` to accept a grantId parameter
   - Update route definition from `app.get('/api/forge-stream', ...)` to `app.get('/api/forge/:grantId', ...)`
   - Extract grantId from request params: `const { grantId } = req.params`
   - Optionally use grantId to customize the streaming behavior (or ignore for now if mock data is sufficient)
   - Maintain the same SSE response format and streaming logic

**File 2**: `client/src/components/DiscoveryDashboard.tsx` or `client/src/pages/Home.tsx`

**Component**: `DiscoveryDashboard` or parent component

**Specific Changes**:
6. **Investigate Component Remounting**: Add React DevTools profiler or console.log statements to determine if DiscoveryDashboard is remounting repeatedly
   - Check if parent component (Home.tsx) is causing unnecessary re-renders
   - Verify that the `onPickGrant` callback is stable (wrapped in useCallback if needed)
   - Ensure no state changes in parent are causing child remounts

7. **Stabilize Query Key** (if needed): If query key instability is detected, ensure `api.grants.list.path` is imported correctly and not recreated
   - Verify the import statement is at module level
   - Check that the api object is not being recreated on each render

8. **Add Query Options Override** (if component remounting cannot be prevented): If the component must remount for valid reasons, add explicit query options to useGrants to prevent refetching on mount
   - Add `refetchOnMount: false` to the useQuery options in useGrants hook
   - This would be a fallback solution if component remounting is unavoidable

**File 3**: `server/aws-kb.ts` (new file)

**Specific Changes**:
9. **Create AWS Knowledge Base Module**: Extract the AWS KB logic into a separate module for reusability
   - Export `retrieveFromKB` function
   - Export `kbClient` for testing
   - Add TypeScript types for KB results
   - Include error handling and logging

**Example Implementation Pattern** (based on agents.py):
```typescript
import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const kbClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });

export async function retrieveFromKB(
  kbId: string, 
  query: string, 
  numberOfResults: number = 5
): Promise<string> {
  const command = new RetrieveCommand({
    knowledgeBaseId: kbId,
    retrievalQuery: { text: query },
    retrievalConfiguration: {
      vectorSearchConfiguration: { numberOfResults }
    }
  });
  
  const response = await kbClient.send(command);
  const results = response.retrievalResults || [];
  
  if (results.length === 0) {
    return "No results found.";
  }
  
  return results
    .map((r, i) => `Result ${i + 1}:\n${r.content?.text || ''}`)
    .join('\n\n');
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bugs on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the four bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate the four bug scenarios and observe the failures on UNFIXED code to understand the root causes.

**Test Cases**:
1. **Grants Polling Test**: Mount DiscoveryDashboard component, wait 5 seconds, count the number of `GET /api/grants` requests made (will show multiple requests on unfixed code, expected: 1)
2. **Grants Data Source Test**: Call `GET /api/grants`, inspect backend code to confirm it queries database instead of AWS Knowledge Base (will show database query on unfixed code, expected: AWS KB query)
3. **Empty Grants Test**: Call `GET /api/grants`, observe empty array returned because database table is empty (will fail on unfixed code)
4. **Faculty 404 Test**: Mount FinalPacket component, attempt to fetch faculty data, observe 404 error (will fail on unfixed code)
5. **SSE Endpoint Mismatch Test**: Start forge stream with grantId=1, attempt to connect to `/api/forge/1`, observe 404 error (will fail on unfixed code)
6. **Component Remount Test**: Add console.log to DiscoveryDashboard constructor/mount, observe if it logs multiple times (may reveal remounting issue)

**Expected Counterexamples**:
- Grants endpoint is called 3-5 times within 10 seconds instead of once
- Grants endpoint queries database table instead of AWS Knowledge Base
- Grants endpoint returns empty array because database table is empty
- Faculty endpoint returns 404 with "Cannot GET /api/faculty" message
- Forge stream connection fails with 404 when trying to connect to `/api/forge/1`
- Possible causes: component remounting, wrong data source, missing route handlers, endpoint path mismatch

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed system produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := fixedSystem(input)
  ASSERT expectedBehavior(result)
END FOR

// Specific assertions:
// Bug 1: ASSERT requestCount("/api/grants", timeWindow=10s) == 1
// Bug 2: ASSERT grantsEndpoint.dataSource == "AWS_KNOWLEDGE_BASE" AND grantsEndpoint.kbId == "KFW7ZEBGMR"
// Bug 3: ASSERT response("/api/faculty").status == 200 AND isArray(response.body)
// Bug 4: ASSERT sseConnection("/api/forge/:grantId").connected == true AND receivedEvents.length > 0
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalSystem(input) = fixedSystem(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-affected endpoints and interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Zod Validation Preservation**: Observe that grants/faculty responses are validated with Zod on unfixed code, verify same validation occurs after fix with same error logging
2. **Query Config Preservation**: Observe that queryClient uses `staleTime: Infinity` on unfixed code, verify same configuration after fix
3. **Error Handling Preservation**: Observe that 500 errors display error states on unfixed code, verify same error handling after fix
4. **AbortController Preservation**: Observe that stream cancellation works on unfixed code (if SSE was working), verify same cleanup after fix
5. **Other Endpoints Preservation**: Verify that `/api/forge` POST endpoint continues to work exactly as before
6. **AWS Credentials Preservation**: Verify that AWS credentials are loaded from environment variables the same way as in the Python agent

### Unit Tests

- Test that `GET /api/grants` is called exactly once when DiscoveryDashboard mounts
- Test that `GET /api/grants` queries AWS Knowledge Base (KB ID: KFW7ZEBGMR) instead of database
- Test that AWS Knowledge Base retrieval returns formatted grant data
- Test that `GET /api/faculty` returns 200 status with array of faculty records from database
- Test that `GET /api/forge/:grantId` accepts grantId parameter and returns SSE stream
- Test that SSE events match the expected format `{step: string, done: boolean}`
- Test that query keys remain stable across renders
- Test that AbortController properly cancels streams on unmount
- Test that AWS SDK errors are handled gracefully (return empty array)

### Property-Based Tests

- Generate random grantIds and verify SSE connection succeeds for all valid IDs
- Generate random component mount/unmount sequences and verify grants endpoint is called exactly once per mount
- Generate random faculty data and verify Zod validation passes for all valid schemas
- Generate random AWS Knowledge Base queries and verify retrieval returns valid results
- Test that all non-affected API endpoints continue to work across many scenarios
- Test that AWS SDK handles various error conditions gracefully (network errors, invalid KB IDs, etc.)

### Integration Tests

- Test full user flow: SelectionPortal → DiscoveryDashboard → FinalPacket with grants loading from AWS Knowledge Base, faculty loading from database, and forge streaming
- Test that grants data from AWS Knowledge Base displays correctly in the UI
- Test that switching between grants properly cancels previous streams and starts new ones
- Test that error states display correctly when endpoints fail
- Test that the UI progresses from "Initializing" to "streaming" to "done" states correctly
- Test that AWS credentials are properly configured and accessible to the Node.js backend
