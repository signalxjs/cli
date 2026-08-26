import './styles.css';
// Registers a lazy loader per island (code-split chunks load on demand when
// each island's hydration strategy fires).
import 'virtual:sigx-islands';
import { hydrateIslands } from '@sigx/ssr-islands/client';

// The page itself is server-only, so the client ships no page code — just
// this bootstrap plus per-island chunks. The hydration core loads on the
// first `client:*` strategy that fires.
hydrateIslands();
