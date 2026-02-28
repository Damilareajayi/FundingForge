import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  // Force all assets to load relative to the current folder for SageMaker Proxy
  base: "", 
  
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      // Maps '@' to your client source folder
      "@": path.resolve(import.meta.dirname, "client", "src"),
      // Maps '@shared' to the shared folder in the root
      "@shared": path.resolve(import.meta.dirname, "shared"),
      // Maps '@assets' to the attached_assets folder
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true, 
    hmr: {
      clientPort: 443, // Required for AWS HTTPS Proxy
      path: "/jupyterlab/default/proxy/5000/ws", // Matches SageMaker URL structure
    },
    allowedHosts: [".sagemaker.aws"],
  }
});
