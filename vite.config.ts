import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  // THIS IS THE FIX: It tells the browser to look for files in the current folder
  base: "./", 
  
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
  alias: {
    "@": path.resolve(import.meta.dirname, "client", "src"),
    // Ensure this path correctly points to your 'shared' folder
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  },
},
  root: path.resolve(import.meta.dirname, "client"),
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: true,
    hmr: {
      clientPort: 443, // Forces the refresh to go through AWS HTTPS
      path: "/jupyterlab/default/proxy/5000/ws", // Specific for SageMaker
    },
    allowedHosts: [".sagemaker.aws"],
  },
});
