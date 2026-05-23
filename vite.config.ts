import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'; // fs 모듈 임포트

// package.json 파일 읽기
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // package.json의 버전을 환경 변수로 노출
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
})