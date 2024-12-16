import { createStore } from 'vuex';

const store = createStore({
    state: {
        user: null,
        token: null,
    },
    mutations: {
        setUser(state, payload) {
            state.user = payload.user;
        },
        setToken(state, token) {
            state.token = token;
        },
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
        async fetchUser({ commit }) {
            const token = localStorage.getItem('token');
            if (!token) {
                commit('setUser ', { user: null });
                return;
            }

            try {
                const response = await fetch('/api/verify', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`, // Send the token in the Authorization header
                    },
                });
                const tokenResponse = await response.json();

                if (response.ok) {
                    // If the token is valid, update the user
                    commit('setUser ', { user: tokenResponse.user });
                } else {
                    // If the token is invalid, remove it
                    localStorage.removeItem('token');
                    commit('setUser ', { user: null });
                }
            } catch (error) {
                console.error('Error fetching user:', error);
                commit('setUser ', { user: null });
            }
        },
    },
});

export default store;