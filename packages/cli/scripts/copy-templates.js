import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, '..', 'templates');
const distDir = join(__dirname, '..', 'dist', 'templates');

// Ensure dist directory exists
if (!existsSync(join(__dirname, '..', 'dist'))) {
    mkdirSync(join(__dirname, '..', 'dist'), { recursive: true });
}

// Copy templates to dist (only if templates dir exists)
if (existsSync(templatesDir)) {
    cpSync(templatesDir, distDir, { recursive: true });
    console.log('✓ Templates copied to dist/templates');
} else {
    console.log('⚠ No templates directory found, skipping copy');
}
