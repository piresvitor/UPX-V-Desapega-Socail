import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      ENCRYPTION_KEY: '12345678901234567890123456789012',
      JWT_SECRET: 'testsecret1234567890'
    }
  },
});