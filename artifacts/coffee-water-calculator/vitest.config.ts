import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets/1_1792294122443.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/watermancer-guide-step5-dropper-lineup.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/4_1792294122444.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/5_1792294122444.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/9_1792294122446.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/2_1792294122443.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
      '@assets/6_1792294122444.jpg': path.resolve(import.meta.dirname, 'src', 'testAssetMock.ts'),
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
      '@assets/rounded_1786763676557.jpg': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/straight_1786763676557.jpg': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/robert-asami-logo-transparent.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/image_1786855239956.webp': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/image_1787373159788.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/watermancer-header-256.webp': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/Kapp_1787058386404.gif': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/Kapp_1787058386404_last.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/hackerman_1787062754046.gif': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
      '@assets/hackerman_1787062754046_last.png': path.resolve(
        import.meta.dirname,
        'src',
        'testAssetMock.ts',
      ),
    },
  },
});
