import { createStore } from 'vuex';

const store = createStore({
    state: {
        user: null,
        token: null,
    },
    mutations: {
    },
    getters: {
        getUser(state) {
            const token = localStorage.getItem('token');

            if (!token) {
                return null; // or redirect to login page
            }

            // Decode and validate the token
            const decodedToken = JSON.parse(atob(token.split('.')[1])); // decode the token

            // Validate the token
            if (decodedToken.exp < Date.now() / 1000) {
                // Token has expired, remove it and return null
                localStorage.removeItem('token');
                return null; // or redirect to login page
            }

            // Token is valid, return the user object
            return decodedToken.user; // assume the token contains the user information
        },
    },
    actions: {
    },
});

export default store;