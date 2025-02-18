import express from 'express';
import fs from 'fs';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';
import cron from 'node-cron';

dotenv.config();

const app = express();
const port = process.env.PORT || 600;
const uri = process.env.MONGODB_URI;
const api_key = process.env.API_KEY;

// Consolidated middleware
app.use(express.json());

// SSL/TLS Certificate options
let options;
try {
  options = {
    key: fs.readFileSync(path.join(process.cwd(), 'localhost-key.pem')),
    cert: fs.readFileSync(path.join(process.cwd(), 'localhost.pem'))
  };

  // Use HTTPS server
  https.createServer(options, app).listen(port, () => {
    console.log(`HTTPS Server running on https://localhost:${port}`);
  });
} catch (error) {
  console.error('Error loading SSL certificates:', error);

  // Fallback to HTTP if certificates can't be loaded
  app.listen(port, () => {
    console.log(`HTTP Server running on http://localhost:${port}`);
  });
}

export default app;

// Schedule the daily job to run at 22:05 from Monday to Friday
cron.schedule('5 22 * * 1-5', async () => {
  console.log('Running daily scheduled task to fetch data...');
  await getPrice();
  await updateDailyRatios();
});

// Schedule the weekly job to run on Saturday at 00:05
cron.schedule('5 0 * * 6', async () => {
  console.log('Running weekly scheduled task to fetch data...');
  await getSummary();
  await getHistoricalPrice();
});

// Define the tickers array
const tickers = ['AAPL', 'GOOG', 'MSFT']; // Replace with your tickers array

async function getSummary() {
  // Connect to MongoDB
  const client = new MongoClient(uri);
  const db = client.db();
  const collection = db.collection('AssetInfo');

  // Define a custom progress bar
  const progressBar = (tickers, desc) => {
    let index = 0;
    return {
      next: () => {
        index++;
        console.log(`${desc}: ${index}/${tickers.length}`);
      }
    };
  };

  const progress = progressBar(tickers, 'Fetching data');

  // Loop through the tickers
  for (const ticker of tickers) {
    // Make the API request
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}?token=${api_key}`;
    const response = await fetch(url);

    // Check the response status code
    if (response.ok) {
      const data = await response.json();

      // Check if data is not null
      if (data) {
        // Find the document in MongoDB where Symbol matches the ticker
        const result = await collection.findOne({ Symbol: ticker });

        if (result) {
          // Update the existing document
          await collection.updateOne(
            { Symbol: ticker },
            {
              $set: {
                Symbol: data.ticker,
                Name: data.name,
                Description: data.description,
                IPO: data.startDate ? new Date(data.startDate) : null,
                LastUpdated: data.endDate ? new Date(data.endDate) : null,
                Exchange: data.exchangeCode
              }
            }
          );
          console.log(`${ticker} Summary Updated Successfully`);
        } else {
          // Insert a new document
          await collection.insertOne({
            Symbol: data.ticker,
            Name: data.name,
            Description: data.description,
            IPO: data.startDate ? new Date(data.startDate) : null,
            LastUpdated: data.endDate ? new Date(data.endDate) : null,
            Exchange: data.exchangeCode
          });
          console.log(`No document found, creating a new document for ${ticker}`);
        }
      } else {
        console.log(`No data found for ${ticker}`);
      }
    } else {
      console.log(`Error fetching data for ${ticker}: ${response.status}`);
    }

    // Update the progress bar
    progress.next();
  }

  // Close the MongoDB client
  client.close();
}

async function getPrice() {
  const client = new MongoClient(uri);
  const db = client.db('EreunaDB');
  const dailyCollection = db.collection('OHCLVData');
  const weeklyCollection = db.collection('OHCLVData2');
  const assetInfoCollection = db.collection('AssetInfo');

  for (const ticker of tickers) {
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${api_key}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        const dailyData = data.map(doc => ({
          tickerID: ticker,
          timestamp: new Date(doc.date),
          open: doc.adjOpen,
          high: doc.adjHigh,
          low: doc.adjLow,
          close: doc.adjClose,
          volume: doc.adjVolume,
          splitFactor: doc.splitFactor,
        }));

        // Check for splitFactor and fetch historical data if necessary
        for (const dailyDoc of dailyData) {
          if (dailyDoc.splitFactor !== 1) {
            console.log(`${ticker} has Split, updating it..`);
            const now = new Date();
            const historicalUrl = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${api_key}&startDate=1990-01-01&endDate=${now.toISOString().split('T')[0]}`;
            const historicalResponse = await fetch(historicalUrl);
            if (historicalResponse.ok) {
              const historicalData = await historicalResponse.json();
              if (historicalData.length > 0) {
                const historicalDocs = historicalData.map(doc => ({
                  tickerID: ticker,
                  timestamp: new Date(doc.date),
                  open: doc.adjOpen,
                  high: doc.adjHigh,
                  low: doc.adjLow,
                  close: doc.adjClose,
                  volume: doc.adjVolume,
                  splitFactor: doc.splitFactor,
                }));

                // Process weekly data from historical data
                const weeklyGrouped = {};
                historicalDocs.forEach(doc => {
                  const weekStart = new Date(doc.timestamp);
                  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                  const weekKey = weekStart.toISOString();
                  if (!weeklyGrouped[weekKey]) {
                    weeklyGrouped[weekKey] = [];
                  }
                  weeklyGrouped[weekKey].push(doc);
                });

                Object.keys(weeklyGrouped).forEach(weekKey => {
                  const weekData = weeklyGrouped[weekKey];
                  const weeklyDoc = {
                    tickerID: ticker,
                    timestamp: new Date(weekKey),
                    open: weekData[0].open,
                    high: Math.max(...weekData.map(doc => doc.high)),
                    low: Math.min(...weekData.map(doc => doc.low)),
                    close: weekData[weekData.length - 1].close,
                    volume: weekData.reduce((sum, doc) => sum + doc.volume, 0),
                  };

                  // Check if weekly document already exists
                  weeklyCollection.findOne({ tickerID: ticker, timestamp: weeklyDoc.timestamp }, (err, existingWeeklyDoc) => {
                    if (existingWeeklyDoc) {
                      weeklyCollection.updateOne({ tickerID: ticker, timestamp: weeklyDoc.timestamp }, { $set: weeklyDoc }, (err, result) => {
                        console.log(`Updated weekly document for ${ticker}`);
                      });
                    } else {
                      weeklyCollection.insertOne(weeklyDoc, (err, result) => {
                        console.log(`Inserted weekly document for ${ticker}`);
                      });
                    }
                  });
                });

                // Update AssetInfo collection
                assetInfoCollection.findOne({ Symbol: ticker }, (err, assetInfoDoc) => {
                  if (assetInfoDoc) {
                    if (!assetInfoDoc.splits) {
                      assetInfoDoc.splits = [];
                    }
                    assetInfoDoc.splits.push({
                      effective_date: dailyDoc.timestamp,
                      split_factor: dailyDoc.splitFactor,
                    });
                    assetInfoCollection.updateOne({ Symbol: ticker }, { $set: assetInfoDoc }, (err, result) => {
                      console.log(`Updated AssetInfo document for ${ticker}`);
                    });
                  } else {
                    console.log(`No document found in AssetInfo collection for ${ticker}`);
                  }
                });
              }
            }
          }
        }

        // Insert daily documents, preventing duplicates
        dailyData.forEach(dailyDoc => {
          dailyCollection.findOne({ tickerID: dailyDoc.tickerID, timestamp: dailyDoc.timestamp }, (err, existingDailyDoc) => {
            if (existingDailyDoc) {
              dailyCollection.updateOne({ tickerID: dailyDoc.tickerID, timestamp: dailyDoc.timestamp }, { $set: dailyDoc }, (err, result) => {
                console.log(`Updated daily document for ${ticker}`);
              });
            } else {
              dailyCollection.insertOne(dailyDoc, (err, result) => {
                console.log(`Inserted daily document for ${ticker}`);
              });
            }
          });
        });

        // Process weekly data from daily data
        const weeklyGrouped = {};
        dailyData.forEach(doc => {
          const weekStart = new Date(doc.timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString();
          if (!weeklyGrouped[weekKey]) {
            weeklyGrouped[weekKey] = [];
          }
          weeklyGrouped[weekKey].push(doc);
        });

        Object.keys(weeklyGrouped).forEach(weekKey => {
          const weekData = weeklyGrouped[weekKey];
          const weeklyDoc = {
            tickerID: ticker,
            timestamp: new Date(weekKey),
            open: weekData[0].open,
            high: Math.max(...weekData.map(doc => doc.high)),
            low: Math.min(...weekData.map(doc => doc.low)),
            close: weekData[weekData.length - 1].close,
            volume: weekData.reduce((sum, doc) => sum + doc.volume, 0),
          };

          // Check if weekly document already exists
          weeklyCollection.findOne({ tickerID: ticker, timestamp: weeklyDoc.timestamp }, (err, existingWeeklyDoc) => {
            if (existingWeeklyDoc) {
              weeklyCollection.updateOne({ tickerID: ticker, timestamp: weeklyDoc.timestamp }, { $set: weeklyDoc }, (err, result) => {
                console.log(`Updated weekly document for ${ticker}`);
              });
            } else {
              weeklyCollection.insertOne(weeklyDoc, (err, result) => {
                console.log(`Inserted weekly document for ${ticker}`);
              });
            }
          });
        });

        console.log(`Successfully processed ${ticker}`);
      } else {
        console.log(`No data found for ${ticker}`);
      }
    } else {
      console.log(`Error: ${response.statusText}`);
    }
  }

  client.close();
}

async function getHistoricalPrice() {
  const client = new MongoClient(uri);
  const db = client.db('EreunaDB');
  const dailyCollection = db.collection('OHCLVData');
  const weeklyCollection = db.collection('OHCLVData2');

  for (const ticker of tickers) {
    const now = new Date();
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${api_key}&startDate=1990-01-01&endDate=${now.toISOString().split('T')[0]}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.length > 0) {
        const dailyData = data.map(doc => ({
          tickerID: ticker,
          timestamp: new Date(doc.date),
          open: doc.adjOpen,
          high: doc.adjHigh,
          low: doc.adjLow,
          close: doc.adjClose,
          volume: doc.adjVolume,
          splitFactor: doc.splitFactor,
        }));

        // Insert daily documents, preventing duplicates
        for (const dailyDoc of dailyData) {
          dailyCollection.findOne({ tickerID: dailyDoc.tickerID, timestamp: dailyDoc.timestamp }, (err, existingDailyDoc) => {
            if (!existingDailyDoc) {
              dailyCollection.insertOne(dailyDoc, (err, result) => {
                console.log(`Inserted daily document for ${ticker}`);
              });
            }
          });
        }

        // Process weekly data from daily data
        const weeklyGrouped = {};
        dailyData.forEach(doc => {
          const weekStart = new Date(doc.timestamp);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekKey = weekStart.toISOString();
          if (!weeklyGrouped[weekKey]) {
            weeklyGrouped[weekKey] = [];
          }
          weeklyGrouped[weekKey].push(doc);
        });

        Object.keys(weeklyGrouped).forEach(weekKey => {
          const weekData = weeklyGrouped[weekKey];
          const weeklyDoc = {
            tickerID: ticker,
            timestamp: new Date(weekKey),
            open: weekData[0].open,
            high: Math.max(...weekData.map(doc => doc.high)),
            low: Math.min(...weekData.map(doc => doc.low)),
            close: weekData[weekData.length - 1].close,
            volume: weekData.reduce((sum, doc) => sum + doc.volume, 0),
          };

          // Check if weekly document already exists
          weeklyCollection.findOne({ tickerID: ticker, timestamp: weeklyDoc.timestamp }, (err, existingWeeklyDoc) => {
            if (!existingWeeklyDoc) {
              weeklyCollection.insertOne(weeklyDoc, (err, result) => {
                console.log(`Inserted weekly document for ${ticker}`);
              });
            }
          });
        });

        console.log(`Successfully processed ${ticker}`);
      } else {
        console.log(`No data found for ${ticker}`);
      }
    } else {
      console.log(`Error: ${response.statusText}`);
    }
  }

  client.close();
}

async function updateDailyRatios() {
  // Connect to MongoDB
  const client = new MongoClient(uri);
  const db = client.db('EreunaDB');
  const collection = db.collection('AssetInfo');

  for (const ticker of tickers) {
    const url = `https://api.tiingo.com/tiingo/fundamentals/${ticker}/daily?token=${api_key}`;
    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data === null) {
        console.log(`No data found for ${ticker}`);
        continue;
      }

      // Get the last object in the list
      const lastData = data[data.length - 1];

      // Find the document in MongoDB where Symbol matches the ticker
      collection.findOne({ Symbol: ticker }, (err, result) => {
        if (result) {
          // Update the existing document
          collection.updateOne(
            { Symbol: ticker },
            {
              $set: {
                MarketCapitalization: lastData.marketCap,
                EV: lastData.enterpriseVal,
                PERatio: lastData.peRatio,
                PriceToBookRatio: lastData.pbRatio,
                PEGRatio: lastData.trailingPEG1Y
              }
            },
            (err, result) => {
              console.log(`${ticker} Daily Ratios Updated Successfully`);
            }
          );
        } else {
          // Insert a new document
          collection.insertOne({
            Symbol: ticker,
            MarketCapitalization: lastData.marketCap,
            EV: lastData.enterpriseVal,
            PERatio: lastData.peRatio,
            PriceToBookRatio: lastData.pbRatio,
            PEGRatio: lastData.trailingPEG1Y
          }, (err, result) => {
            console.log(`No document found, creating a new document for ${ticker}`);
          });
        }
      });
    } else {
      console.log(`Error fetching data for ${ticker}: ${response.status}`);
    }
  }

  client.close();
}

