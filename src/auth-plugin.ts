
type FetchOptions = RequestInit & { headers?: Record<string, string> };

const fetchInstance = async (url: string, options: FetchOptions = {}): Promise<any> => {
    const token = localStorage.getItem('token');

    // Set the Authorization header if the token exists
    if (token) {
        if (!options.headers) {
            options.headers = { Authorization: `Bearer ${token}` };
        } else if (options.headers instanceof Headers) {
            options.headers.set('Authorization', `Bearer ${token}`);
        } else if (Array.isArray(options.headers)) {
            options.headers.push(['Authorization', `Bearer ${token}`]);
        } else {
            options.headers = {
                ...options.headers,
                Authorization: `Bearer ${token}`,
            };
        }
    }

    // Make the fetch request
    const response = await fetch(url, options);

    // Check if the response is ok (status in the range 200-299)
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Network response was not ok');
    }

    // Return the parsed JSON response
    return response.json();
};

import type { App } from 'vue';

export default {
    install(app: App) {
        app.config.globalProperties.$fetch = fetchInstance;
    },
};