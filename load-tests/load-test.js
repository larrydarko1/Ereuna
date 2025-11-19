/**
 * Load Test - Simulate 500 concurrent users
 * Run: k6 run load-tests/load-test.js
 * 
 * How k6 works:
 * - VUs (Virtual Users) are simulated concurrent users
 * - Each VU runs the default function in a loop
 * - Stages control ramping up/down of VUs over time
 * - Thresholds define SLAs (pass/fail criteria)
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const successfulRequests = new Counter('successful_requests');

export const options = {
    stages: [
        { duration: '2m', target: 50 },   // Ramp up to 50 users over 2 min
        { duration: '3m', target: 100 },  // Ramp up to 100 users over 3 min
        { duration: '5m', target: 250 },  // Ramp up to 250 users over 5 min
        { duration: '5m', target: 500 },  // Ramp up to 500 users over 5 min
        { duration: '10m', target: 500 }, // Stay at 500 users for 10 min
        { duration: '3m', target: 250 },  // Ramp down to 250 users
        { duration: '2m', target: 0 },    // Ramp down to 0
    ],
    thresholds: {
        // 95% of requests should complete within 500ms
        http_req_duration: ['p(95)<500', 'p(99)<1000'],

        // Error rate should be below 1%
        errors: ['rate<0.01'],

        // 99% of requests should receive response within 2s
        http_req_waiting: ['p(99)<2000'],

        // Request rate should be above certain threshold
        http_reqs: ['rate>100'], // At least 100 req/s during test
    },
};

const BASE_URL = __ENV.BASE_URL || 'https://ereuna.io';
const API_KEY = __ENV.VITE_EREUNA_KEY;

// Sample tickers for testing
const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'AMD', 'NFLX', 'DIS'];

function getRandomTicker() {
    return TICKERS[randomIntBetween(0, TICKERS.length - 1)];
}

export default function () {
    const headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
    };

    // Simulate realistic user behavior patterns
    const userScenario = randomIntBetween(1, 100);

    if (userScenario <= 40) {
        // 40% - Dashboard browsing
        dashboardScenario(headers);
    } else if (userScenario <= 70) {
        // 30% - Chart viewing
        chartScenario(headers);
    } else if (userScenario <= 90) {
        // 20% - Screener usage
        screenerScenario(headers);
    } else {
        // 10% - News reading
        newsScenario(headers);
    }

    // User think time between actions (1-5 seconds)
    sleep(randomIntBetween(1, 5));
}

function dashboardScenario(headers) {
    group('Dashboard Scenario', () => {
        // Get market stats
        let res = http.get(`${BASE_URL}/api/market-stats`, { headers });
        checkResponse(res, 'market-stats');

        sleep(1);

        // Get index news for watchlist
        const tickers = [getRandomTicker(), getRandomTicker(), getRandomTicker()].join(',');
        res = http.get(`${BASE_URL}/api/index-news?tickers=${tickers}`, { headers });
        checkResponse(res, 'index-news');
    });
}

function chartScenario(headers) {
    group('Chart Scenario', () => {
        const ticker = getRandomTicker();

        // Get chart data
        let res = http.get(`${BASE_URL}/api/chart/${ticker}`, { headers });
        checkResponse(res, `chart/${ticker}`);

        sleep(1);

        // Get price data
        res = http.get(`${BASE_URL}/api/price/${ticker}`, { headers });
        checkResponse(res, `price/${ticker}`);

        sleep(1);

        // Get historical data
        res = http.get(`${BASE_URL}/api/historical/${ticker}`, { headers });
        checkResponse(res, `historical/${ticker}`);
    });
}

function screenerScenario(headers) {
    group('Screener Scenario', () => {
        // Get screener results
        const res = http.get(`${BASE_URL}/api/screener`, { headers });
        checkResponse(res, 'screener');

        sleep(2);
    });
}

function newsScenario(headers) {
    group('News Scenario', () => {
        const ticker = getRandomTicker();

        // Get news for ticker
        const res = http.get(`${BASE_URL}/api/news/${ticker}`, { headers });
        checkResponse(res, `news/${ticker}`);
    });
}

function checkResponse(res, endpoint) {
    const success = check(res, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
        'has body': (r) => r.body && r.body.length > 0,
    });

    // Track metrics
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);

    if (success) {
        successfulRequests.add(1);
    }

    // Log errors for debugging
    if (!success) {
        console.error(`Failed request to ${endpoint}: ${res.status} - ${res.body.substring(0, 100)}`);
    }
}

export function handleSummary(data) {
    return {
        'load-test-results.json': JSON.stringify(data, null, 2),
        stdout: textSummary(data, { indent: ' ', enableColors: true }),
    };
}

function textSummary(data, options) {
    const indent = options.indent || '';
    const enableColors = options.enableColors || false;

    let summary = `\n${indent}Load Test Summary\n`;
    summary += `${indent}================\n\n`;

    // Add VU and iteration info
    summary += `${indent}Virtual Users (max): ${data.metrics.vus_max.values.max}\n`;
    summary += `${indent}Total Iterations: ${data.metrics.iterations.values.count}\n`;
    summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)} req/s\n\n`;

    // Add response time stats
    summary += `${indent}Response Times:\n`;
    summary += `${indent}  Average: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

    // Add error rate
    const errorRate = data.metrics.errors ? data.metrics.errors.values.rate * 100 : 0;
    summary += `${indent}Error Rate: ${errorRate.toFixed(2)}%\n`;

    return summary;
}
