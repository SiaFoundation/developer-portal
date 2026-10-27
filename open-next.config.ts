import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

// Every page is prerendered, so the Worker serves them from the build and never
// renders one itself. It has no docs folder to read.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
