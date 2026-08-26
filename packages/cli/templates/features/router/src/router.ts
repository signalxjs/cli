import { createRouter, createWebHistory, createMemoryHistory, type RouteRecordRaw } from '@sigx/router';
import { Home } from './pages/Home';
import { About } from './pages/About';

/** One route table for the browser and the server. */
export const routes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About },
];

/** Browser: history API navigation. */
export function createAppRouter() {
    return createRouter({ history: createWebHistory(), routes });
}

/** Server: a fresh in-memory history per request, positioned at the requested URL. */
export function createServerRouter(url: string) {
    return createRouter({ history: createMemoryHistory({ initialLocation: url }), routes });
}
