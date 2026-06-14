import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: [
    '**/localStockfishAnalysis.spec.ts',
    '**/threadIsolation.spec.ts',
    '**/slowStockfishAnalysis.spec.ts'
  ],

  timeout: 60_000,

  expect: {
    timeout: 10_000
  },

  // 일반 UI/반응성 등 일반 테스트는 무거운 Stockfish 부하가 배제되어 있으므로,
  // 원활하게 병렬(Fully Parallel) 분산 처리를 통해 가속 실행합니다.
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',

  use: {
    baseURL: 'http://127.0.0.1:3000',

    // 로컬 재시도가 0이어도 실패 원인을 확인할 수 있게 보존합니다.
    trace: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-web-security',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files'
          ]
        }
      }
    }
  ],

  webServer: {
    command: 'pnpm dev',
    url: 'http://127.0.0.1:3000',

    // 다른 터미널의 오래된 dev/preview 서버를 조용히 재사용하지 않습니다.
    reuseExistingServer: false,
    timeout: 120_000
  }
});