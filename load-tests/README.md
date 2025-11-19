# Load Testing with k6

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## How k6 Works

k6 is a modern load testing tool that:
- Uses **Virtual Users (VUs)** to simulate concurrent users
- Each VU runs your test script in a loop
- **Stages** control how VUs ramp up/down over time
- **Thresholds** define pass/fail criteria (SLAs)
- **Metrics** track performance (response times, error rates, etc.)

### Key Concepts

**Virtual Users (VUs)**: Simulated concurrent users executing your test script
**Iterations**: Each execution of your default function
**Stages**: Periods with specific VU targets (ramp up/down)
**Checks**: Assertions that don't stop the test (for pass/fail tracking)
**Thresholds**: Criteria that determine if test passed or failed

## Running Tests

Set your API key first:
```bash
export VITE_EREUNA_KEY="your-api-key-here"
```

### 1. Smoke Test (Quick validation)
```bash
k6 run load-tests/smoke-test.js
```
- **Purpose**: Verify basic functionality before heavier testing
- **Duration**: 1 minute
- **VUs**: 1
- **When to run**: After deployments, before load tests

### 2. Load Test (Target: 500 concurrent users)
```bash
k6 run load-tests/load-test.js
```
- **Purpose**: Verify system handles expected load
- **Duration**: ~30 minutes
- **Max VUs**: 500
- **Realistic scenarios**: Dashboard, Charts, Screener, News

### 3. Stress Test (Find breaking points)
```bash
k6 run load-tests/stress-test.js
```
- **Purpose**: Find system limits
- **Duration**: ~30 minutes
- **Max VUs**: 1500
- **Watch for**: When does system start failing?

### 4. Spike Test (Sudden traffic surge)
```bash
k6 run load-tests/spike-test.js
```
- **Purpose**: Test recovery from traffic spikes
- **Duration**: ~4 minutes
- **Pattern**: 50 → 1000 → 50 VUs rapidly

## Test Against Different Environments

```bash
# Test production
k6 run --env BASE_URL=https://ereuna.io load-tests/load-test.js

# Test staging
k6 run --env BASE_URL=https://staging.ereuna.io load-tests/load-test.js

# Test local
k6 run --env BASE_URL=http://localhost:3500 load-tests/load-test.js
```

## Monitoring During Tests

### 1. Watch Grafana Dashboards
- Open https://grafana.ereuna.io during test
- Monitor:
  - CPU/Memory usage
  - Response times
  - Request rates
  - Error rates
  - Database connections

### 2. Watch Docker Stats
```bash
ssh -p 436 ereunavps@72.61.189.154
docker stats
```

### 3. Watch MongoDB Performance
```bash
docker exec -it <mongodb-container-id> mongosh EreunaDB
db.serverStatus().connections
db.currentOp()
```

### 4. Watch Redis
```bash
docker exec -it <redis-container-id> redis-cli INFO stats
```

## Interpreting Results

### Good Results ✅
- p(95) response time < 500ms
- Error rate < 1%
- No memory leaks (steady memory usage)
- CPU usage < 80%

### Warning Signs ⚠️
- p(95) response time > 1000ms
- Error rate > 1%
- Increasing response times over test duration
- Memory usage climbing steadily

### Critical Issues 🔴
- Error rate > 5%
- System unresponsive
- Out of memory errors
- Database connection pool exhausted

## k6 Cloud (Optional)

For distributed testing from multiple locations:
```bash
# Sign up at k6.io/cloud
k6 cloud load-tests/load-test.js
```

## Custom Metrics

The tests track:
- `errors`: Rate of failed requests
- `api_latency`: Custom latency tracking
- `successful_requests`: Count of successful requests

View in results:
```
errors..................: 0.45% ✓ 123   ✗ 27234
api_latency.............: avg=245.32ms min=12ms med=198ms max=2.4s p(90)=412ms p(95)=567ms
successful_requests.....: 27234
```

## Best Practices

1. **Start small**: Run smoke test first
2. **Monitor actively**: Watch Grafana during tests
3. **Ramp gradually**: Don't jump straight to max VUs
4. **Test realistic scenarios**: Mix of different user behaviors
5. **Run multiple times**: Single test can have anomalies
6. **Test off-peak**: Don't impact real users
7. **Document results**: Track improvements over time

## Troubleshooting

### Rate limiting hits
```bash
# Check backend rate limit in api/server.ts
# Temporarily increase for testing or use different IPs
```

### Connection refused
```bash
# Check if services are running
docker ps
# Check logs
docker logs <container-id>
```

### Out of memory on test machine
```bash
# Reduce max VUs or run from more powerful machine
# Or use k6 cloud for distributed testing
```
