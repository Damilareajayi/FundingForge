# Bugfix Requirements Document

## Introduction

The new frontend is experiencing a polling loop where `GET /api/grants` fires repeatedly every 1-2 seconds, preventing progression to the Discovery and Packet stages. The root causes are: (1) the `/api/grants` endpoint queries an empty database table instead of AWS Knowledge Base (KB ID: KFW7ZEBGMR) where grants actually exist, (2) missing backend endpoint for `/api/faculty`, (3) potential component remounting issues causing unnecessary refetches, and (4) mismatched SSE endpoint paths between frontend expectations and backend implementation.

CRITICAL DISCOVERY: The grants database table is empty, but grants actually come from AWS Knowledge Base via the Python agent's `search_grant_opportunities` tool. The backend needs to query AWS Knowledge Base using the same `_retrieve` pattern from agents.py, not the database. This is why the frontend sees empty/stale data and keeps polling.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the DiscoveryDashboard component mounts THEN the system makes repeated `GET /api/grants` requests every 1-2 seconds instead of a single request

1.2 WHEN the `/api/grants` endpoint is called THEN the system queries an empty database table instead of AWS Knowledge Base (KB ID: KFW7ZEBGMR) where grants actually exist, returning empty or stale data

1.3 WHEN the FinalPacket component attempts to fetch faculty data THEN the system fails silently because the `/api/faculty` endpoint does not exist on the backend

1.4 WHEN the FinalPacket component attempts to start the forge stream with a grantId THEN the system fails because the backend has `/api/forge-stream` (no parameter) but the frontend expects `/api/forge/:grantId`

1.5 WHEN the forge stream endpoint mismatch occurs THEN the system never progresses past the Discovery stage and no SSE events are received

### Expected Behavior (Correct)

2.1 WHEN the DiscoveryDashboard component mounts THEN the system SHALL make exactly one `GET /api/grants` request and cache the result

2.2 WHEN the `/api/grants` endpoint is called THEN the system SHALL query AWS Knowledge Base (KB ID: KFW7ZEBGMR) using the same `_retrieve` pattern from agents.py and return the top grant opportunities

2.3 WHEN the FinalPacket component mounts THEN the system SHALL successfully fetch faculty data from a working `/api/faculty` endpoint

2.4 WHEN the FinalPacket component starts the forge stream with a grantId THEN the system SHALL connect to `/api/forge/:grantId` and receive SSE events with the correct format `data: {"step": "...", "done": false}`

2.5 WHEN the forge stream completes THEN the system SHALL receive a final event with `done: true` and terminate the connection

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the grants endpoint returns data THEN the system SHALL CONTINUE TO validate the response against the Zod schema from `@shared/schema`

3.2 WHEN the queryClient is configured with default options THEN the system SHALL CONTINUE TO use `staleTime: Infinity` and `refetchInterval: false`

3.3 WHEN the useForgeStream hook parses SSE events THEN the system SHALL CONTINUE TO validate chunks against `streams.forge.chunk` schema

3.4 WHEN components import types THEN the system SHALL CONTINUE TO import `Grant` and `Faculty` from `@shared/schema` rather than defining local types

3.5 WHEN the forge stream is cancelled or errors occur THEN the system SHALL CONTINUE TO handle cleanup properly with AbortController
