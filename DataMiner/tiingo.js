import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

// Set your API key here
const API_KEY = process.env.API_KEY;
const mongoURI = process.env.MONGODB_URI; // MongoDB connection string from environment variables

async function getSummary(req, res) {
    const ticker = 'AAPL'; // Hardcoded ticker value
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}?token=${API_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        // Log the fetched data for review
        console.log('Fetched Data:', data);

        // Connect to MongoDB
        const client = new MongoClient(mongoURI);
        await client.connect();
        const database = client.db('EreunaDB'); // Replace with your database name
        const collection = database.collection('AssetInfo'); // Replace with your collection name

        // Insert the fetched data into the database
        await collection.insertOne(data);

        res.json(data);
    } catch (error) {
        res.json({ error: error.message });
    }
}

// Export the function for use in the server
export { getSummary };
