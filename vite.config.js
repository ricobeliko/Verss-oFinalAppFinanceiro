import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getPackageName(id) {
  const normalized = id.replace(/\\/g, '/');
  const match = normalized.match(/\/node_modules\/((?:@[^/]+\/)?[^/]+)/);
  return match ? match[1] : null;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          const pkg = getPackageName(id);
          if (!pkg) return;

          // Vendor React: apenas core do React e React Router (dependências diretas da aplicação)
          if (
            pkg === 'react' ||
            pkg === 'react-dom' ||
            pkg === 'scheduler' ||
            pkg === 'react-router' ||
            pkg === 'react-router-dom'
          ) {
            return 'vendor-react';
          }

          // Vendor Firebase: SDK e subpacotes oficiais
          if (pkg === 'firebase' || pkg.startsWith('@firebase/')) {
            return 'vendor-firebase';
          }

          // Vendor GSAP: motor de animação GreenSock
          if (pkg === 'gsap') {
            return 'vendor-gsap';
          }

          // Vendor Recharts: recharts e dependências transitivas exclusivas
          if (
            pkg === 'recharts' ||
            pkg === 'recharts-scale' ||
            pkg === 'react-smooth' ||
            pkg === 'react-transition-group' ||
            pkg === 'react-is' ||
            pkg === 'victory-vendor' ||
            pkg === 'decimal.js-light' ||
            pkg === 'fast-equals' ||
            pkg === 'eventemitter3' ||
            pkg.startsWith('d3-')
          ) {
            return 'vendor-recharts';
          }

          // Demais pacotes seguem o comportamento padrão do Rollup
        },
      },
    },
  },
})
