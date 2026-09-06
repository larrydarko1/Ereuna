/**
 * A router for component suites — the app's routes without the app's guards.
 * The real router redirects an unauthenticated visit to the sign-in page, and
 * a component test that only wants to assert where a form sent the user would
 * otherwise be asserting the guard instead.
 */
import { createMemoryHistory, createRouter, type Router } from 'vue-router';

const BLANK = { template: '<div />' };

/** Every named route a component navigates to, and nothing else. */
export function testRouter(): Router {
    return createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/', redirect: { name: 'Dashboard' } },
            { path: '/dashboard', name: 'Dashboard', component: BLANK },
            { path: '/login', name: 'Login', component: BLANK },
            { path: '/signup', name: 'SignUp', component: BLANK },
            { path: '/recovery', name: 'Recovery', component: BLANK },
            { path: '/set-password', name: 'SetPassword', component: BLANK },
            { path: '/charts/:symbol?', name: 'Charts', component: BLANK },
            { path: '/screener', name: 'Screener', component: BLANK },
            { path: '/portfolio', name: 'Portfolio', component: BLANK },
            { path: '/account', name: 'Account', component: BLANK },
        ],
    });
}
