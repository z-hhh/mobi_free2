import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'

// 获取 Commit Hash
const getCommitHash = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), '')
  try {
    // Cloudflare Pages build environment
    if (env.CF_PAGES_COMMIT_SHA) {
      return env.CF_PAGES_COMMIT_SHA.substring(0, 7);
    }
    // GitHub Actions build environment
    if (env.GITHUB_SHA) {
      return env.GITHUB_SHA.substring(0, 7);
    }
    // Local git environment
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch (e) {
    return 'unknown';
  }
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const commitHash = getCommitHash(mode);
  console.log('Build Commit Hash:', commitHash);

  return {
    plugins: [react()],
    // Use base path for GitHub Pages, root path for Cloudflare Pages
    base: process.env.VITE_BASE_PATH || '/',
    define: {
      __COMMIT_HASH__: JSON.stringify(commitHash),
    },
  }
})
