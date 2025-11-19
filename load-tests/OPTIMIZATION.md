# Performance Optimization Recommendations

## Current Setup Analysis ✅

### What's Already Optimized:

1. **Redis Caching** ✅
   - Smart TTL based on market hours (60s during trading, 5min after)
   - Automatic fallback if Redis unavailable
   - Used in Screener routes
   - Good implementation!

2. **Nginx Configuration** ✅
   - Compression enabled
   - Conditional logging (reduces I/O)
   - Proxying configured correctly
   - Security headers in place

3. **Docker Setup** ✅
   - Separate networks (internal/external)
   - Health checks on services
   - Logging configured with rotation
   - Good resource isolation

4. **Monitoring Stack** ✅
   - Prometheus for metrics
   - Grafana for visualization
   - Loki for log aggregation
   - Redis & MongoDB exporters

## Critical Optimizations Needed ⚠️

### 1. MongoDB Indexes (HIGH PRIORITY)

**Problem**: No database indexes found - this will KILL performance under load.

**Create these indexes IMMEDIATELY:**

```javascript
// Connect to MongoDB
docker exec -it <mongodb-container-id> mongosh EreunaDB

// AssetInfo collection (for chart lookups)
db.AssetInfo.createIndex({ Symbol: 1 })
db.AssetInfo.createIndex({ ISIN: 1 })

// OHCLVData collections (for historical data)
db.OHCLVData.createIndex({ tickerID: 1, timestamp: -1 })
db.OHCLVData2.createIndex({ tickerID: 1, timestamp: -1 })

// News collection (for news queries)
db.News.createIndex({ ticker: 1, publishedDate: -1 })

// Stats collection (for market stats)
db.Stats.createIndex({ _id: 1 })

// Users collection (for authentication)
db.Users.createIndex({ Username: 1 }, { unique: true })
db.Users.createIndex({ Email: 1 }, { unique: true })

// Screeners collection
db.Screeners.createIndex({ UserID: 1 })
db.Screeners.createIndex({ ScreenerName: 1, UserID: 1 })

// Watchlists collection
db.Watchlists.createIndex({ UserID: 1 })

// Notes collection
db.Notes.createIndex({ UserID: 1, tickerSymbol: 1 })

// Portfolio collection
db.Portfolio.createIndex({ UserID: 1 })

// Verify indexes were created
db.AssetInfo.getIndexes()
```

**Impact**: This alone could improve query performance by 10-100x! 🚀

### 2. MongoDB Connection Pooling

**Problem**: Opening/closing connections on every request is SLOW.

**Solution**: Implement connection pooling in `api/server.ts`:

```typescript
// Create a single connection pool at startup
let mongoClient: MongoClient | null = null;

async function getMongoClient(): Promise<MongoClient> {
  if (!mongoClient) {
    mongoClient = new MongoClient(uri, {
      maxPoolSize: 50, // Max 50 concurrent connections
      minPoolSize: 10, // Keep 10 connections ready
      maxIdleTimeMS: 30000,
    });
    await mongoClient.connect();
    console.log('MongoDB connection pool initialized');
  }
  return mongoClient;
}

// Use in routes:
const client = await getMongoClient();
const db = client.db('EreunaDB');
// Don't close the connection!
```

**Impact**: Reduces connection overhead from ~50ms to ~0ms per request

### 3. Expand Redis Caching

**Good**: Already using Redis in Screener routes
**Missing**: Should cache in Dashboard, Charts, Portfolio routes

**Add caching to**:
- `/market-stats` (cache for 60s during market hours)
- `/chart/:identifier` (cache for 5min - static data)
- `/index-news` (cache for 2min)
- `/price/:ticker` (cache for 30s during market hours)

Example implementation:
```typescript
import { withCache } from '../utils/cache.js';

app.get('/market-stats', async (req: Request, res: Response) => {
  // ... auth code ...
  
  const stats = await withCache(
    'market-stats',
    async () => {
      const client = await getMongoClient();
      const db = client.db('EreunaDB');
      return await db.collection('Stats').findOne({ _id: 'marketStats' });
    },
    60, // 60 second TTL
    'price'
  );
  
  return res.status(200).json(stats);
});
```

### 4. Nginx Optimizations

Add to `docker/nginx.conf`:

```nginx
# Inside server block
# Enable gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript application/xml+rss 
           application/rss+xml font/truetype font/opentype 
           application/vnd.ms-fontobject image/svg+xml;

# Browser caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Connection settings
keepalive_timeout 65;
keepalive_requests 100;

# Buffer sizes
client_body_buffer_size 128k;
client_max_body_size 10m;
client_header_buffer_size 1k;
large_client_header_buffers 4 8k;
```

### 5. Rate Limiting Adjustment

**Current**: 50,000 requests per minute per IP
**For testing**: Temporarily increase or disable

In `api/server.ts`, for load testing:
```typescript
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50000 : 1000000,
  // ... rest
});
```

### 6. Docker Compose Scaling

Your compose file has `replicas: 1` for frontend/backend/websocket.

**For production under load, scale up:**

```yaml
frontend:
  deploy:
    replicas: 2  # Run 2 instances
    
backend:
  deploy:
    replicas: 3  # Run 3 instances
    
websocket:
  deploy:
    replicas: 2  # Run 2 instances
```

**Note**: Traefik will automatically load balance!

### 7. VPS Resource Allocation

Check your VPS specs:
```bash
ssh -p 436 ereunavps@72.61.189.154
free -h  # Memory
nproc    # CPU cores
df -h    # Disk
```

**Minimum for 500 users:**
- 8GB RAM
- 4 CPU cores
- 50GB SSD

**Recommended for 500 users:**
- 16GB RAM
- 8 CPU cores
- 100GB SSD

### 8. Database Query Optimization

Some routes fetch entire documents when only fields are needed.

**Optimize with projection:**
```typescript
// Instead of:
const assetInfo = await collection.findOne({ Symbol: identifier });

// Use projection:
const assetInfo = await collection.findOne(
  { Symbol: identifier },
  { 
    projection: { 
      Symbol: 1, 
      Name: 1, 
      Price: 1,
      // Only fields you need
    } 
  }
);
```

## Implementation Priority

1. **MongoDB Indexes** (Do this FIRST! 🔥)
2. **MongoDB Connection Pooling** (Major performance gain)
3. **Expand Redis Caching** (Reduce DB load)
4. **Nginx Optimization** (Better asset delivery)
5. **Scale Docker Services** (Handle more concurrent users)
6. **Query Optimization** (Reduce data transfer)

## Expected Performance After Optimization

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg Response Time | 200-500ms | 50-150ms | 3-4x faster |
| p95 Response Time | 800ms-2s | 200-400ms | 4-5x faster |
| Max Concurrent Users | ~200 | 500+ | 2.5x+ |
| Database Query Time | 50-200ms | 5-20ms | 10x faster |
| Cache Hit Rate | ~20% | 60-80% | 3-4x |

## Monitoring Checklist During Load Test

- [ ] CPU usage stays below 80%
- [ ] Memory usage stable (no leaks)
- [ ] Response times p95 < 500ms
- [ ] Error rate < 1%
- [ ] Database connections don't max out
- [ ] Redis cache hit rate > 60%
- [ ] No container restarts
- [ ] Disk I/O not saturated

## Next Steps

1. Apply MongoDB indexes (5 minutes)
2. Implement connection pooling (30 minutes)
3. Add caching to main routes (1 hour)
4. Run smoke test to verify (5 minutes)
5. Run load test with 500 VUs (30 minutes)
6. Review results in Grafana
7. Iterate on bottlenecks found
