import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SITE_ORIGIN,
  canonicalPathSerializer,
  normalizeBasePath,
  redirectMatcher,
  resolveBuildContext,
  sitemapUrlBuilder,
  validateBuildContext,
} from '../scripts/lib/url-policy.mjs';

test('normalizeBasePath preserves slash-wrapped subpaths', () => {
  assert.equal(normalizeBasePath('/sub/path'), '/sub/path/');
});

test('canonicalPathSerializer applies base path and trailing slash', () => {
  assert.equal(canonicalPathSerializer('/models/foo', '/sub/'), '/sub/models/foo/');
});

test('redirectMatcher returns slashless matcher form', () => {
  assert.equal(redirectMatcher('/models/foo/', '/'), '/models/foo');
});

test('resolveBuildContext uses the fixed production site origin', () => {
  const context = resolveBuildContext();

  assert.equal(context.mode, 'production');
  assert.equal(context.origin, SITE_ORIGIN);
  assert.equal(context.basePath, '/');
  assert.equal(context.robotsContent, 'index, follow');
});

test('validateBuildContext rejects insecure required HTTPS origins', () => {
  const errors = validateBuildContext({
    mode: 'production',
    origin: 'http://example.com',
    requiresHttps: true,
  });

  assert.deepEqual(errors, ['Site origin must be HTTPS']);
});

test('sitemapUrlBuilder emits absolute URLs', () => {
  const url = sitemapUrlBuilder('/models/foo/', {
    origin: 'https://example.com',
    basePath: '/docs/',
  });

  assert.equal(url, 'https://example.com/docs/models/foo/');
});
