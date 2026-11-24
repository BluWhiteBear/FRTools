import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

test('local ES modules are never loaded as classic scripts by tool pages', () => {
    const root = new URL('../', import.meta.url);
    for (const file of readdirSync(root).filter(name => name.endsWith('.html'))) {
        const html = readFileSync(new URL(file, root), 'utf8');
        for (const match of html.matchAll(/<script\b([^>]*)>/gi)) {
            const attributes = match[1];
            const src = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attributes)?.[1];
            if (!src || /^(?:https?:)?\/\//i.test(src)) continue;
            const source = readFileSync(new URL(src, root), 'utf8');
            if (/^\s*(?:import\s|export\s)/m.test(source)) {
                assert.match(attributes, /\btype\s*=\s*["']module["']/i, `${file} loads ES module ${src} as a classic script`);
            }
        }
    }
});
