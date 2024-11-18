import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5500/api', // your backend API URL
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('Token:', token);
        if (token) {
            config.headers = {
                ...config.headers,
                Authorization: `Bearer ${token}`,
            };
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default {
    install(app) {
        app.config.globalProperties.$axios = axiosInstance;
    },
};