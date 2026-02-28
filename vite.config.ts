import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  // ADD THIS SERVER BLOCK BELOW
  server: {
    host: "0.0.0.0", // Allows access from outside the container
    port: 5000,      // Matches the port you are proxying
    strictPort: true,
    hmr: {
      clientPort: 443, // Important for AWS SageMaker HTTPS proxy
    },
    allowedHosts: [".sagemaker.aws"], // Allows the SageMaker domain
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
