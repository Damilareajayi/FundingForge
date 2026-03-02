import type { Express } from "express";
import type { Server } from "http";
import { api } from "@shared/routes";
import { runPythonAgent } from "./python-bridge";
import { db } from "./db";
import { grants } from "@shared/schema";
import type { Grant } from "@shared/schema";

// In-memory storage for grants when database is not available
let inMemoryGrants: Grant[] = [];

// Cache for forge results to avoid repeated expensive AWS calls
interface ForgeCache {
  result: any;
  timestamp: number;
  profileHash: string;
}
let forgeCache: ForgeCache | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function hashProfile(profile: any): string {
  return JSON.stringify({ role: profile.role, year: profile.year, program: profile.program, interests: profile.interests });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Health check endpoint for AWS and system status
  app.get('/api/health', async (req, res) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: db ? 'connected' : 'in-memory',
      cache: forgeCache ? {
        age_seconds: Math.round((Date.now() - forgeCache.timestamp) / 1000),
        ttl_seconds: Math.round(CACHE_TTL_MS / 1000),
        is_valid: (Date.now() - forgeCache.timestamp) < CACHE_TTL_MS
      } : null,
      grants_count: db ? 'unknown' : inMemoryGrants.length,
      environment: {
        node_env: process.env.NODE_ENV,
        has_aws_credentials: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
      }
    };
    
    res.json(health);
  });

  // Grants endpoint - returns all grants from database or in-memory storage
  app.get('/api/grants', async (req, res) => {
    try {
      // If database is available, use it
      if (db) {
        const allGrants = await db.select().from(grants);
        return res.json(allGrants);
      }
      
      // Otherwise use in-memory storage
      res.json(inMemoryGrants);
    } catch (error) {
      console.error('Grants endpoint error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch grants',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Forge endpoint - runs the Python agent with AWS Knowledge Bases
  app.post('/api/forge', async (req, res) => {
    const startTime = Date.now();
    try {
      const { cvText, profile } = req.body;
      
      // Check cache first
      const profileHash = hashProfile(profile);
      const now = Date.now();
      if (forgeCache && forgeCache.profileHash === profileHash && (now - forgeCache.timestamp) < CACHE_TTL_MS) {
        console.log(`✓ Returning cached forge result (age: ${Math.round((now - forgeCache.timestamp) / 1000)}s)`);
        return res.json({ ...forgeCache.result, _cached: true });
      }
      
      // Build enriched CV text like app.py does
      const enrichedCv = `Researcher Profile:
- Role: ${profile.role}
- Level: ${profile.year}
- Program/Department: ${profile.program}
- Research Interests: ${profile.interests || 'Not provided'}

${cvText ? `--- CV CONTENT ---\n${cvText}` : '(No CV provided — use researcher profile above for recommendations)'}`;

      console.log(`⚡ Running Python agent for profile: ${profile.role} / ${profile.year}`);
      
      // Run Python agent with AWS Knowledge Bases
      const result = await runPythonAgent(enrichedCv);
      
      const duration = Date.now() - startTime;
      console.log(`✓ Python agent completed in ${duration}ms`);
      
      // Check for errors in result
      if (result._parse_error) {
        console.error('Python agent returned parse error:', result);
        return res.status(500).json({
          error: 'Agent processing error',
          message: result.researcher_summary || 'Failed to parse agent output',
          details: result
        });
      }
      
      // Save the matched grants to storage (database or in-memory)
      if (result.matches && Array.isArray(result.matches)) {
        // Transform the matched grants
        const grantsToStore = result.matches.map((match: any, index: number) => ({
          id: index + 1,
          name: match.grant_title || 'Untitled Grant',
          targetAudience: determineAudience(profile.role, profile.year),
          eligibility: match.grant_justification || 'See grant details',
          matchCriteria: `Match Score: ${match.grant_match_score || 0}/100. ${match.collaborator_justification || ''}`,
          internalDeadline: 'TBD',
        }));
        
        if (db) {
          // Save to database
          await db.delete(grants);
          await db.insert(grants).values(grantsToStore);
          console.log(`✓ Saved ${grantsToStore.length} grants to database`);
        } else {
          // Save to in-memory storage
          inMemoryGrants = grantsToStore;
          console.log(`✓ Stored ${grantsToStore.length} grants in memory`);
        }
      }
      
      // Cache the result
      forgeCache = {
        result,
        timestamp: now,
        profileHash
      };
      
      res.json(result);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`✗ Forge error after ${duration}ms:`, error);
      
      // Provide detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isAwsError = errorMessage.includes('AWS') || errorMessage.includes('credentials') || errorMessage.includes('Bedrock');
      
      res.status(500).json({ 
        error: 'Failed to process request',
        message: errorMessage,
        isAwsError,
        hint: isAwsError ? 'Check AWS credentials and session token expiration' : 'Check server logs for details'
      });
    }
  });

  // Helper function to determine target audience
  function determineAudience(role: string, year: string): string {
    const roleLower = role.toLowerCase();
    const yearLower = year.toLowerCase();
    
    if (roleLower.includes('faculty') || roleLower.includes('professor')) {
      return 'Faculty';
    }
    if (roleLower.includes('grad') || yearLower.includes('grad') || yearLower.includes('phd') || yearLower.includes('master')) {
      return 'Grad Students';
    }
    if (roleLower.includes('undergrad') || yearLower.includes('undergrad') || yearLower.includes('senior') || yearLower.includes('junior')) {
      return 'Undergrads';
    }
    return 'All';
  }

  // Streaming forge endpoint for real-time updates
  app.get('/api/forge-stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const steps = [
      "Analyzing CV and extracting researcher profile...",
      "Querying grant Knowledge Base...",
      "Finding collaborator for grant 1/3...",
      "Finding collaborator for grant 2/3...",
      "Finding collaborator for grant 3/3...",
      "Retrieving FSU compliance & policy guidelines...",
      "Synthesizing final packet..."
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        res.write(`data: ${JSON.stringify({ step: steps[i], done: false })}\n\n`);
        i++;
      } else {
        res.write(`data: ${JSON.stringify({ step: "Complete", done: true })}\n\n`);
        clearInterval(interval);
        res.end();
      }
    }, 1500);

    req.on('close', () => clearInterval(interval));
  });

  return httpServer;
}
