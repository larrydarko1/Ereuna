/**
 * Smoke Test - Minimal load to verify basic functionality
 * Run: k6 run load-tests/smoke-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

export const options = {
    vus: 1, // 1 virtual user
    duration: '1m', // 1 minute test
    thresholds: {
        http_req_duration: ['p(99)<1000'], // 99% of requests should be below 1s
        errors: ['rate<0.01'], // Error rate should be below 1%
    },
};

const BASE_URL = __ENV.BASE_URL || 'https://ereuna.io';
const API_KEY = __ENV.VITE_EREUNA_KEY;

export default function () {
    const headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
    };

    // Test health/basic endpoints
    const responses = http.batch([
        ['GET', `${BASE_URL}/`, null, { headers }],
        ['GET', `${BASE_URL}/api/market-stats`, null, { headers }],
    ]);

    // Check responses
    responses.forEach((res) => {
        const success = check(res, {
            'status is 200': (r) => r.status === 200,
            'response time OK': (r) => r.timings.duration < 1000,
        });

        errorRate.add(!success);
    });

    sleep(1);
}
