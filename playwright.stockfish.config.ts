import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: [
    '**/localStockfishAnalysis.spec.ts',
    '**/threadIsolation.spec.ts'
  ],
  testIgnore: [
    '**/slowStockfishAnalysis.spec.ts'
  ],

  // 무거운 WebAssembly 빌드 및 복수 후보 분석 흐름으로 인해 타임아웃을 150초로 넉넉히 설정합니다
  timeout: 150_000,

  expect: {
    timeout: 15_000
  },

  // Stockfish의 WebWorker 구동은 호스트 머신의 CPU 자원을 강하게 점유하고
  // 동시 분석 시 Worker ID 및 uciok 타이밍이 경합할 소지가 존재하므로 완벽히 순차 실행합니다.
  fullyParallel: false,
  workers: 1,

  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'line',

  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium-mt',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files'
          ]
        }
      }
    },
    {
      name: 'chromium-std',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files'
          ]
        }
      }
    },
    {
      name: 'chromium-st',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--allow-file-access-from-files'
          ]
        }
      }
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--no-sandbox',
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
    reuseExistingServer: false,
    timeout: 120_000
  }
});
