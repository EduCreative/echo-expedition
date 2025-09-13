import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file for the current mode
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Adding server config to help Vite's HMR client resolve the correct port
    // and avoid the 'ws://localhost:undefined' error.
    server: {
      host: 'localhost',
      port: 5173,
      // Explicitly configure the HMR WebSocket connection to resolve
      // connection issues in some environments.
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
      },
    },
    define: {
      // Expose environment variables to the client-side code
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY),
    }
  }
})