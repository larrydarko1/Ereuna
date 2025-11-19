/**
 * Stress Test - Push system beyond normal capacity to find breaking points
 * Run: k6 run load-tests/stress-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
    stages: [
        { duration: '2m', target: 100 },   // Ramp up to 100 users
        { duration: '3m', target: 500 },   // Ramp up to 500 users
        { duration: '5m', target: 1000 },  // Ramp up to 1000 users
        { duration: '5m', target: 1500 },  // Ramp up to 1500 users - STRESS!
        { duration: '10m', target: 1500 }, // Hold at 1500 for 10 min
        { duration: '3m', target: 500 },   // Scale down
        { duration: '2m', target: 0 },     // Ramp down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // More lenient for stress test
        errors: ['rate<0.05'], // Allow up to 5% errors
    },
};

const BASE_URL = __ENV.BASE_URL || 'https://ereuna.io';
const API_KEY = __ENV.VITE_EREUNA_KEY;

export default function () {
    const headers = {
        'x-api-key': API_KEY,
    };

    const res = http.get(`${BASE_URL}/api/market-stats`, { headers });

    const success = check(res, {
        'status is 200 or 503': (r) => r.status === 200 || r.status === 503,
    });

    errorRate.add(!success);
    sleep(1);
}
