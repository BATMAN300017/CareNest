import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://mock_user:mock_password@localhost:5432/carenest_test?schema=public",
      JWT_SECRET: "test_secret_jwt_key_at_least_32_characters_long_for_hs256!",
      JWT_REFRESH_SECRET: "test_refresh_key_at_least_32_characters_long_for_hs256!",
      TABLET_KIOSK_PIN_SALT: "test_salt_for_pin_hashing",
      PHI_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
