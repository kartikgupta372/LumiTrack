<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
=======
<<<<<<< HEAD
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});
=======
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
>>>>>>> fd72f99e81b27682b7b4e06683189149817245ec

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
<<<<<<< HEAD
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
});
=======
    host: true
  }
})
>>>>>>> 0ae65c60083ba3fd455f868222cea90b34c9947f
>>>>>>> fd72f99e81b27682b7b4e06683189149817245ec
