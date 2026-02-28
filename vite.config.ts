import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  // THIS IS THE FIX: Forces assets to be relative to the current folder
  base: "", 
  
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
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
      clientPort: 443,
      // Tells the Hot Module Reload to look inside the proxy folder
      path: "/jupyterlab/default/proxy/5000/ws", 
    },
    allowedHosts: [".sagemaker.aws"],
  },
});
    },
    allowedHosts: [".sagemaker.aws"],
  }
});
