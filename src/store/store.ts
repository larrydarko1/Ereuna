import { createStore } from 'vuex';

const store = createStore({
    state: {}, // Add an empty state object
    getters: {
        getUser(state) {
            const token = localStorage.getItem('token');
            if (!token) {
                return null;
            }
            // Decode and validate the token
            const decodedToken = JSON.parse(atob(token.split('.')[1])); // decode the token

            // Validate the token
            if (decodedToken.exp < Date.now() / 1000) {
                // Token has expired, remove it and return null
                localStorage.removeItem('token');
                return null;
            }
            // Token is valid, return the user object
            return decodedToken.user;
        },
    },
});

export default store;