/**
 * Spike Test - Sudden surge in traffic (e.g., breaking news)
 * Run: k6 run load-tests/spike-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '10s', target: 50 },    // Baseline
        { duration: '30s', target: 1000 },  // SPIKE!
        { duration: '1m', target: 1000 },   // Hold spike
        { duration: '30s', target: 50 },    // Return to baseline
        { duration: '1m', target: 50 },     // Recovery period
        { duration: '10s', target: 0 },
    ],
};

const BASE_URL = __ENV.BASE_URL || 'https://ereuna.io';
const API_KEY = __ENV.VITE_EREUNA_KEY;

export default function () {
    const headers = {
        'x-api-key': API_KEY,
    };

    const res = http.get(`${BASE_URL}/api/market-stats`, { headers });

    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1);
}
