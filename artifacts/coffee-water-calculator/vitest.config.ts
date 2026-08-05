import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets/116-1167350_transparent-twitch-emote-monkas-monkas-png-png-dow_1785734255499.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/image_1785734539832.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/ez_1785735003821.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/robert-asami-logo-transparent.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
    },
  },
});
