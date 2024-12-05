const fetchInstance = async (url, options = {}) => {
    const token = localStorage.getItem('token');

    // Set the Authorization header if the token exists
    if (token) {
        options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        };
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

export default {
    install(app) {
        app.config.globalProperties.$fetch = fetchInstance;
    },
};