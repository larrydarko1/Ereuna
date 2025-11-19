#!/bin/bash

echo "================================================"
echo "🚀 Ereuna MongoDB Initialization"
echo "================================================"

# Check if database already has data
COLLECTION_COUNT=$(mongosh EreunaDB --quiet --eval "db.Users.countDocuments()")

if [ "$COLLECTION_COUNT" -gt 0 ]; then
    echo "✓ Database already populated (Users: $COLLECTION_COUNT)"
    echo "⏭️  Skipping restore, checking indexes..."
else
    echo "📦 Database is empty, restoring from dump..."
    mongorestore --db EreunaDB /docker-entrypoint-initdb.d/dump/EreunaDB --quiet
    echo "✓ Database restoration completed"
fi

echo ""
echo "📊 Creating indexes..."

# Create all indexes using mongosh
mongosh EreunaDB --quiet --eval '
// AssetInfo indexes
db.AssetInfo.createIndex({ Delisted: 1, Symbol: 1 }, { name: "idx_delisted_symbol", background: true });
db.AssetInfo.createIndex({ Delisted: 1, Sector: 1, Exchange: 1 }, { name: "idx_delisted_sector_exchange", background: true });
db.AssetInfo.createIndex({ Delisted: 1, AssetType: 1 }, { name: "idx_delisted_assettype", background: true });
db.AssetInfo.createIndex({ Delisted: 1, AssetType: 1, Exchange: 1 }, { name: "idx_delisted_assettype_exchange", background: true });
db.AssetInfo.createIndex({ Delisted: 1, Industry: 1, Exchange: 1 }, { name: "idx_delisted_industry_exchange", background: true });
db.AssetInfo.createIndex({ Delisted: 1, Exchange: 1 }, { name: "idx_delisted_exchange", background: true });
db.AssetInfo.createIndex({ Delisted: 1, Country: 1 }, { name: "idx_delisted_country", background: true });
db.AssetInfo.createIndex({ Delisted: 1, MarketCap: 1 }, { name: "idx_delisted_marketcap", background: true });
db.AssetInfo.createIndex({ Delisted: 1, PERatio: 1 }, { name: "idx_delisted_peratio", background: true });
db.AssetInfo.createIndex({ Delisted: 1, RSScore1M: 1 }, { name: "idx_delisted_rsscore1m", background: true });
db.AssetInfo.createIndex({ Delisted: 1, RSScore4M: 1 }, { name: "idx_delisted_rsscore4m", background: true });
db.AssetInfo.createIndex({ Delisted: 1, EPS: 1 }, { name: "idx_delisted_eps", background: true });
db.AssetInfo.createIndex({ "quarterlyFinancials.0.roe": 1 }, { name: "idx_qf_roe", background: true });
db.AssetInfo.createIndex({ "quarterlyFinancials.0.roa": 1 }, { name: "idx_qf_roa", background: true });
db.AssetInfo.createIndex({ Delisted: 1, IPO: 1 }, { name: "idx_delisted_ipo", background: true });
db.AssetInfo.createIndex({ Delisted: 1, fundFamily: 1 }, { name: "idx_delisted_fundfamily", background: true });
db.AssetInfo.createIndex({ Delisted: 1, FundCategory: 1 }, { name: "idx_delisted_fundcategory", background: true });
db.AssetInfo.createIndex({ AssetType: 1, IntrinsicValue: 1, Exchange: 1 }, { name: "idx_assettype_intrinsic_exchange", background: true });

// OHCLVData indexes
db.OHCLVData1m.createIndex({ tickerID: 1, timestamp: -1 }, { name: "idx_tickerid_timestamp_desc", background: true });
db.OHCLVData.createIndex({ tickerID: 1, timestamp: -1 }, { name: "idx_tickerid_timestamp_desc", background: true });
db.OHCLVData.createIndex({ timestamp: -1 }, { name: "idx_timestamp_desc", background: true });

// Users index
db.Users.createIndex({ Username: 1 }, { name: "idx_username", unique: true, background: true });

// Screeners indexes
db.Screeners.createIndex({ UsernameID: 1, Name: 1 }, { name: "idx_usernameid_name", background: true });
db.Screeners.createIndex({ UsernameID: 1, Include: 1 }, { name: "idx_usernameid_include", background: true });

print("✓ All indexes created");
'

echo "✓ Indexes created successfully"
echo ""
echo "================================================"
echo "✅ MongoDB initialization complete!"
echo "================================================"
