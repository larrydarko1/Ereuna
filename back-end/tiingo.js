const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set your API key here
const API_KEY = process.env.API_KEY;
const ticker = 'AAPL';

// Define routes for each functionality
app.get('/summary', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/prices', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/historical', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?token=${API_KEY}&startDate=2012-01-01&endDate=2016-01-01`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/news', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/news?token=${API_KEY}&tickers=${ticker}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/fundamentals', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/fundamentals/${ticker}/statements?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/daily-ratios', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/fundamentals/${ticker}/daily?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/dividends', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/corporate-actions/${ticker}/distributions?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/yield', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/corporate-actions/${ticker}/distribution-yield?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/splits', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/corporate-actions/${ticker}/splits?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/future-dividends', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/corporate-actions/distributions?token=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/future-splits', async (req, res) => {
    const url = `https://api.tiingo.com/tiingo/corporate-actions/cvs/splits?token=${API_KEY}&startExDate=2024-12-31`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
