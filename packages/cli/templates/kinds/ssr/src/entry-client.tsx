import './styles.css';
import { defineApp } from 'sigx';
import { ssrClientPlugin } from '@sigx/server-renderer/client';
import { App } from './App';

// Hydrate the server-rendered HTML in place. `hydrate()` is installed by
// ssrClientPlugin (declared optional on App, hence the `!`).
defineApp(<App />).use(ssrClientPlugin).hydrate!('#app');
