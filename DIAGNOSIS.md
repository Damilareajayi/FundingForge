# Data Persistence & Latency Issues - Diagnosis

## Issues Identified

### 1. AWS Credentials Not Loading
- **Problem**: Environment variables from `.env` are not being loaded in Python
- **Impact**: AWS Bedrock Knowledge Base queries fail, causing no grant data to be retrieved
- **Evidence**: `python -c` test shows `AWS_DEFAULT_REGION: None` and `Access Key ID: Not set`

### 2. Database Configuration
- **Current State**: Database is optional (falls back to in-memory storage)
- **Problem**: No `DATABASE_URL` set, so grants are stored in memory and lost on server restart
- **Impact**: Data persistence issues - grants disappear when server restarts

### 3. Frontend Data Flow Issues
- **Problem**: `DiscoveryDashboard` calls `/api/forge` on mount, which:
  - Takes 30-60+ seconds (AWS Bedrock + Knowledge Base queries)
  - Blocks UI while loading
  - No caching mechanism
- **Impact**: High latency on every page load

### 4. No Error Handling for Expired AWS Credentials
- **Problem**: Session token expires but no refresh mechanism
- **Impact**: Silent failures after credentials expire

## Root Causes

1. **Python dotenv not loading**: `run_agent.py` doesn't call `load_dotenv()` before importing agents
2. **No persistent storage**: In-memory grants array cleared on restart
3. **Synchronous forge calls**: Frontend waits for entire AI pipeline before showing data
4. **No caching layer**: Every page load triggers expensive AWS calls

## Recommended Fixes

### Priority 1: Fix AWS Credentials Loading
- Ensure `load_dotenv()` is called in `run_agent.py` before importing agents
- Add credential validation before making AWS calls

### Priority 2: Add Database Persistence
- Set up PostgreSQL database with `DATABASE_URL`
- OR: Use SQLite for local development
- Store grants persistently

### Priority 3: Optimize Frontend Data Flow
- Cache forge results in database
- Load existing grants immediately, refresh in background
- Add loading states and progressive enhancement

### Priority 4: Add Monitoring
- Log AWS credential status
- Track query latency
- Monitor Knowledge Base response times
