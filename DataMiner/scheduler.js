import cron from 'node-cron';
import { getSummary } from './tiingo.js';

// Schedule the job to run every hour (adjust as needed)
cron.schedule('0 * * * *', () => {
    console.log('Running scheduled task to fetch data...');
    // Here you would typically call the function with req and res, but for this example, we will just log it.
    // In a real scenario, you might want to create a mock request and response object.
    // getSummary(mockReq, mockRes);
});
