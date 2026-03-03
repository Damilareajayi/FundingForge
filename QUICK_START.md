# Quick Start - Troubleshooting Data Issues

## 1. Verify AWS Credentials
```bash
python test_aws_connection.py
```

Expected output: `✅ ALL TESTS PASSED`

If failed:
- Check `.env` file has all AWS variables
- Verify session token hasn't expired
- Generate new credentials if needed

## 2. Check System Health
```bash
curl http://localhost:8001/api/health
```

Key fields:
- `database`: "connected" or "in-memory"
- `cache.is_valid`: true if cache is fresh
- `has_aws_credentials`: should be true
- `grants_count`: number of grants in memory

## 3. Start the Server
```bash
npm run dev
```

Watch for these log messages:
- `✓ AWS credentials loaded` - Good!
- `⚡ Running Python agent` - First request (slow)
- `✓ Returning cached forge result` - Cached (fast)

## 4. Test the Frontend

1. Open http://localhost:8001
2. Fill in the intake form
3. Submit and watch Discovery Dashboard

**First time**: 30-60s wait (AWS Knowledge Base query)
**Subsequent times**: <1s (cached results)

## Common Issues

### "No grants showing"
1. Check health endpoint: `curl http://localhost:8001/api/health`
2. Look at `grants_count` - should be > 0 after forge call
3. Check browser console for errors

### "Slow loading every time"
1. Check if cache is working: Look for `_cached: true` in response
2. Verify profile hasn't changed (cache key is profile-based)
3. Cache TTL is 5 minutes - may need refresh

### "AWS errors"
1. Run `python test_aws_connection.py`
2. If "ExpiredTokenException": Update session token in .env
3. If "AccessDeniedException": Check IAM permissions

## Performance Expectations

| Scenario | Expected Time |
|----------|--------------|
| First request (cold) | 30-60 seconds |
| Cached request | <100ms |
| Cache expired | 30-60 seconds |
| Database query | <10ms |

## Monitoring Commands

```bash
# Test AWS
python test_aws_connection.py

# Check health
curl http://localhost:8001/api/health | python -m json.tool

# View grants
curl http://localhost:8001/api/grants | python -m json.tool

# Watch server logs
npm run dev
```

## When to Refresh Credentials

AWS temporary credentials expire. Signs:
- `ExpiredTokenException` in logs
- Health endpoint shows `has_aws_credentials: false`
- Test script fails with token error

To fix:
1. Generate new credentials from AWS Console
2. Update `.env` file
3. Restart server
