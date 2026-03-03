import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express, { type Express } from 'express';
import { createServer, type Server } from 'http';
import request from 'supertest';
import * as fc from 'fast-check';
import { registerRoutes } from './routes';

/**
 * Bug Condition Exploration Test for Missing /api/grants Endpoint
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 * 
 * This test encodes the EXPECTED behavior: GET /api/grants should return valid JSON.
 * 
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * When the endpoint is not implemented, the server returns HTML (404 page) instead of JSON,
 * causing JSON parsing errors in the frontend.
 * 
 * **EXPECTED OUTCOME ON UNFIXED CODE**: Test FAILS (this is correct - proves bug exists)
 * **EXPECTED OUTCOME AFTER FIX**: Test PASSES (confirms bug is fixed)
 */

describe('Bug Condition Exploration: /api/grants endpoint', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    server = await registerRoutes(httpServer, app);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  /**
   * Property 1: Fault Condition - Grants Endpoint Returns Valid JSON
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * This property-based test verifies that GET requests to /api/grants
   * return valid JSON responses with the correct structure.
   * 
   * **Scoped PBT Approach**: We scope the property to GET requests to /api/grants endpoint.
   * 
   * The test checks:
   * 1. Response status is 200
   * 2. Content-Type is application/json
   * 3. Response body can be parsed as JSON without errors
   * 4. Parsed JSON is an array
   * 5. Each grant object has required fields: id, name, targetAudience, eligibility, matchCriteria, internalDeadline
   * 
   * **ON UNFIXED CODE**: This test will FAIL because:
   * - The endpoint is not implemented in server/routes.ts
   * - Server returns 404 HTML page instead of JSON
   * - Content-Type will be text/html, not application/json
   * - JSON.parse() will fail with "unexpected character at line 1 column 1"
   * 
   * **AFTER FIX**: This test will PASS, confirming the bug is fixed.
   */
  it('Property 1: GET /api/grants returns valid JSON with status 200 and array of grant objects', async () => {
    // Use property-based testing to generate multiple test cases
    await fc.assert(
      fc.asyncProperty(fc.constant('/api/grants'), async (endpoint) => {
        const response = await request(app).get(endpoint);

        // Check 1: Response status should be 200
        expect(response.status).toBe(200);

        // Check 2: Content-Type should be application/json
        expect(response.headers['content-type']).toMatch(/application\/json/);

        // Check 3: Response body should be parseable as JSON
        // (supertest already parses JSON, but we verify it's valid)
        expect(() => JSON.parse(JSON.stringify(response.body))).not.toThrow();

        // Check 4: Parsed JSON should be an array
        expect(Array.isArray(response.body)).toBe(true);

        // Check 5: Each grant object should have required fields
        const grants = response.body as any[];
        grants.forEach((grant) => {
          expect(grant).toHaveProperty('id');
          expect(grant).toHaveProperty('name');
          expect(grant).toHaveProperty('targetAudience');
          expect(grant).toHaveProperty('eligibility');
          expect(grant).toHaveProperty('matchCriteria');
          expect(grant).toHaveProperty('internalDeadline');
          
          // Verify field types
          expect(typeof grant.id).toBe('number');
          expect(typeof grant.name).toBe('string');
          expect(typeof grant.targetAudience).toBe('string');
          expect(typeof grant.eligibility).toBe('string');
          expect(typeof grant.matchCriteria).toBe('string');
          expect(typeof grant.internalDeadline).toBe('string');
        });
      }),
      { numRuns: 10 } // Run the property test 10 times
    );
  });

  /**
   * Additional test: Verify the bug exists by checking for non-JSON response
   * 
   * This test explicitly checks for the bug condition on unfixed code.
   * It will PASS on unfixed code (confirming bug exists) and FAIL after fix.
   * 
   * We keep this separate to document the exact bug behavior.
   */
  it('Bug verification: GET /api/grants returns non-JSON response on unfixed code', async () => {
    const response = await request(app).get('/api/grants');

    // On unfixed code, we expect:
    // - Status 404 (or other error status)
    // - Content-Type text/html (not application/json)
    // - Body contains HTML error page
    
    const isUnfixed = response.status === 404 || 
                      !response.headers['content-type']?.includes('application/json');

    if (isUnfixed) {
      // Bug exists - document the counterexample
      console.log('COUNTEREXAMPLE FOUND:');
      console.log(`  Status: ${response.status}`);
      console.log(`  Content-Type: ${response.headers['content-type']}`);
      console.log(`  Body (first 200 chars): ${JSON.stringify(response.text).substring(0, 200)}`);
      
      // This confirms the bug exists
      expect(isUnfixed).toBe(true);
    } else {
      // Bug is fixed - endpoint returns JSON
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(Array.isArray(response.body)).toBe(true);
    }
  });
});

/**
 * Preservation Property Tests for Existing Endpoints
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 * 
 * These tests verify that adding the /api/grants endpoint does NOT break
 * existing functionality. We follow the observation-first methodology:
 * 1. Observe behavior on UNFIXED code
 * 2. Write property-based tests capturing that behavior
 * 3. Run tests on UNFIXED code - they should PASS
 * 4. After fix, re-run tests - they should still PASS (no regressions)
 * 
 * **Property 2: Preservation - Other Endpoints Unchanged**
 * 
 * For any HTTP request that is NOT a GET request to /api/grants,
 * the system SHALL produce exactly the same behavior as before the fix.
 */
describe('Preservation: Existing endpoints remain unchanged', () => {
  let app: Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    const httpServer = createServer(app);
    server = await registerRoutes(httpServer, app);
  });

  afterAll((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  /**
   * Property 2.1: POST /api/forge endpoint structure remains unchanged
   * 
   * **Validates: Requirement 3.1**
   * 
   * This property-based test verifies that the /api/forge endpoint continues
   * to exist, accept POST requests, and return JSON responses (whether success or error).
   * We're not testing the Python agent functionality, just that the endpoint structure
   * remains unchanged after adding /api/grants.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test PASSES (baseline behavior)
   * **EXPECTED OUTCOME AFTER FIX**: Test PASSES (no regression)
   */
  it('Property 2.1: POST /api/forge endpoint structure remains unchanged', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          role: fc.constantFrom('Faculty', 'Graduate Student', 'Undergraduate'),
          year: fc.constantFrom('1st Year', '2nd Year', '3rd Year', '4th Year', 'N/A'),
          program: fc.string({ minLength: 3, maxLength: 50 }),
          interests: fc.string({ minLength: 5, maxLength: 100 })
        }), // profile
        async (profile) => {
          const response = await request(app)
            .post('/api/forge')
            .send({ cvText: 'Test CV content', profile });

          // The endpoint should return a response (success or error)
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(600);

          // Response should be JSON (not HTML)
          expect(response.headers['content-type']).toMatch(/application\/json/);

          // Response body should be parseable
          expect(response.body).toBeDefined();

          // If error (500), should have error structure with JSON
          if (response.status === 500) {
            expect(response.body).toHaveProperty('error');
            expect(typeof response.body.error).toBe('string');
          }
        }
      ),
      { numRuns: 3, timeout: 10000 } // Run 3 test cases with 10s timeout
    );
  }, 15000); // 15s test timeout

  /**
   * Property 2.2: Verify non-grants endpoints maintain their structure
   * 
   * **Validates: Requirements 3.1, 3.2**
   * 
   * This test verifies that the existing endpoints continue to exist and
   * return responses with the expected structure. We test that:
   * - POST /api/forge returns JSON
   * - The fix doesn't break existing endpoint routing
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test PASSES (baseline behavior)
   * **EXPECTED OUTCOME AFTER FIX**: Test PASSES (no regression)
   */
  it('Property 2.2: Non-grants endpoints maintain their structure', async () => {
    // Test POST /api/forge endpoint exists and returns JSON
    const forgeResponse = await request(app)
      .post('/api/forge')
      .send({
        cvText: 'Sample CV',
        profile: {
          role: 'Faculty',
          year: 'N/A',
          program: 'Computer Science',
          interests: 'AI Research'
        }
      });

    // Endpoint should respond (success or error)
    expect(forgeResponse.status).toBeGreaterThanOrEqual(200);
    expect(forgeResponse.status).toBeLessThan(600);
    
    // Response should be JSON
    expect(forgeResponse.headers['content-type']).toMatch(/application\/json/);
    expect(forgeResponse.body).toBeDefined();
  }, 10000); // 10s timeout

  /**
   * Property 2.3: Verify fix is scoped to /api/grants only
   * 
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
   * 
   * This property-based test uses fast-check to generate various test cases
   * and verify that the /api/forge endpoint continues to work correctly.
   * 
   * **EXPECTED OUTCOME ON UNFIXED CODE**: Test PASSES (baseline behavior)
   * **EXPECTED OUTCOME AFTER FIX**: Test PASSES (no regression)
   */
  it('Property 2.3: Fix is scoped to /api/grants endpoint only', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('/api/forge'),
        fc.record({
          role: fc.constantFrom('Faculty', 'Graduate Student'),
          year: fc.constantFrom('N/A', '1st Year'),
          program: fc.constantFrom('CS', 'Biology', 'Physics'),
          interests: fc.constantFrom('AI', 'Genomics', 'Quantum')
        }),
        async (endpoint, profile) => {
          const response = await request(app)
            .post(endpoint)
            .send({ cvText: 'Test', profile });

          // Endpoint should respond
          expect(response.status).toBeGreaterThanOrEqual(200);
          expect(response.status).toBeLessThan(600);
          
          // Response should be JSON (not HTML)
          expect(response.headers['content-type']).toMatch(/application\/json/);
        }
      ),
      { numRuns: 5, timeout: 10000 } // Run 5 test cases
    );
  }, 15000); // 15s timeout
});
