import {
    createRouter,
    createWebHistory,
    createMemoryHistory,
    type RouteRecordRaw
} from '@sigx/router';
import { Home } from './pages/Home';
import { About } from './pages/About';

export const routes: RouteRecordRaw[] = [
    { path: '/', name: 'home', component: Home },
    { path: '/about', name: 'about', component: About }
];

export function createClientRouter() {
    return createRouter({
        history: createWebHistory(),
        routes
    });
}

export function createServerRouter(url: string) {
    return createRouter({
        history: createMemoryHistory({ initialLocation: url }),
        routes
    });
}
