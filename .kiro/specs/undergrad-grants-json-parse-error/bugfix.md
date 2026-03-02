# Bugfix Requirements Document

## Introduction

When a 4th year undergraduate student submits their resume through the application, the system attempts to load and display available grants. However, instead of successfully loading the grants data, the application throws a JSON parsing error: "Couldn't load grants JSON.parse: unexpected character at line 1 column 1 of the JSON data". This error prevents undergraduate students (and all other users) from viewing available grant opportunities in the Discovery Dashboard.

The root cause is that the `/api/grants` endpoint is defined in the shared routes schema but is not implemented in the server routes, resulting in the server returning an error response (likely HTML error page or 404) instead of valid JSON data.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the application attempts to fetch grants data from `/api/grants` THEN the system returns a non-JSON response (HTML error page or 404 response)

1.2 WHEN the frontend receives the non-JSON response and attempts to parse it as JSON THEN the system throws "JSON.parse: unexpected character at line 1 column 1 of the JSON data" error

1.3 WHEN the JSON parsing error occurs THEN the Discovery Dashboard displays "Couldn't load grants" error message to the user

1.4 WHEN a 4th year undergraduate (or any user) tries to view available grants THEN the system fails to display any grant opportunities

### Expected Behavior (Correct)

2.1 WHEN the application attempts to fetch grants data from `/api/grants` THEN the system SHALL return a valid JSON response with an array of grant objects

2.2 WHEN the frontend receives the JSON response THEN the system SHALL successfully parse the data without errors

2.3 WHEN the grants data is successfully loaded THEN the Discovery Dashboard SHALL display the list of available grants to the user

2.4 WHEN a 4th year undergraduate (or any user) views the Discovery Dashboard THEN the system SHALL show filterable grant opportunities including those tagged for "Undergrads" audience

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the `/api/forge` endpoint is called to run the Python agent THEN the system SHALL CONTINUE TO process CV text and profile data correctly

3.2 WHEN the `/api/forge-stream` endpoint is called for real-time updates THEN the system SHALL CONTINUE TO stream progress steps correctly

3.3 WHEN grants data is filtered by audience (Faculty, Grad Students, Undergrads) THEN the system SHALL CONTINUE TO apply the correct filtering logic

3.4 WHEN grants data is searched by keywords THEN the system SHALL CONTINUE TO filter results based on the search query

3.5 WHEN a user selects a grant from the Discovery Dashboard THEN the system SHALL CONTINUE TO handle the grant selection correctly
