/**
 * Puppeteer 브라우저 인스턴스 풀
 *
 * Phase 7 - Task 7.1: Puppeteer 설치 및 BrowserPool 구현
 *
 * 메모리 효율성을 위해 브라우저 인스턴스를 재사용합니다.
 * - 최대 2개 인스턴스 유지
 * - 100회 사용 후 자동 재시작 (메모리 누수 방지)
 * - 타임아웃 및 에러 처리
 */

import puppeteer, { Browser } from 'puppeteer';

/**
 * BrowserPool 설정 옵션
 */
export interface BrowserPoolOptions {
  /** 최대 브라우저 인스턴스 수 (기본값: 2) */
  maxSize?: number;

  /** 브라우저 재시작 임계값 (사용 횟수, 기본값: 100) */
  restartThreshold?: number;

  /** 브라우저 인스턴스 타임아웃 (밀리초, 기본값: 60000) */
  timeout?: number;
}

/**
 * 브라우저 인스턴스 메타데이터
 */
interface BrowserInstance {
  browser: Browser;
  usageCount: number;
  createdAt: number;
  inUse: boolean;
}

/**
 * Puppeteer 브라우저 풀
 *
 * 싱글톤 패턴으로 브라우저 인스턴스를 관리합니다.
 *
 * @example
 * ```typescript
 * const pool = BrowserPool.getInstance();
 * const browser = await pool.acquire();
 * try {
 *   const page = await browser.newPage();
 *   await page.goto('https://example.com');
 *   // ...
 * } finally {
 *   await pool.release(browser);
 * }
 * ```
 */
export class BrowserPool {
  private static instance: BrowserPool | null = null;

  private instances: BrowserInstance[] = [];
  private readonly maxSize: number;
  private readonly restartThreshold: number;
  private readonly timeout: number;
  private acquireQueue: Array<{
    resolve: (browser: Browser) => void;
    reject: (error: Error) => void;
  }> = [];

  private constructor(options: BrowserPoolOptions = {}) {
    this.maxSize = options.maxSize ?? 2;
    this.restartThreshold = options.restartThreshold ?? 100;
    this.timeout = options.timeout ?? 60000;
  }

  /**
   * BrowserPool 싱글톤 인스턴스 획득
   */
  public static getInstance(options?: BrowserPoolOptions): BrowserPool {
    if (!BrowserPool.instance) {
      BrowserPool.instance = new BrowserPool(options);
    }
    return BrowserPool.instance;
  }

  /**
   * 싱글톤 인스턴스 초기화 (테스트용)
   */
  public static resetInstance(): void {
    if (BrowserPool.instance) {
      BrowserPool.instance.closeAll();
      BrowserPool.instance = null;
    }
  }

  /**
   * 브라우저 인스턴스 획득
   *
   * 사용 가능한 인스턴스가 없으면 대기하거나 새로 생성합니다.
   *
   * @returns Browser 인스턴스
   * @throws {Error} 타임아웃 또는 브라우저 실행 실패 시
   */
  public async acquire(): Promise<Browser> {
    // 1. 사용 가능한 인스턴스 우선 확인 (재사용)
    const available = this.instances.find(
      inst => inst.browser.isConnected() && !inst.inUse
    );
    if (available) {
      available.inUse = true;
      available.usageCount++;

      // 재시작 임계값 초과 시 교체
      if (available.usageCount >= this.restartThreshold) {
        await this.restartBrowser(available);
      }

      return available.browser;
    }

    // 2. 새 인스턴스 생성 가능 여부 확인
    if (this.instances.length < this.maxSize) {
      const browser = await this.createBrowser();
      const instance: BrowserInstance = {
        browser,
        usageCount: 1,
        createdAt: Date.now(),
        inUse: true,
      };
      this.instances.push(instance);
      return browser;
    }

    // 3. 대기 큐에 추가 (풀이 가득 차고 사용 가능한 인스턴스 없음)
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.acquireQueue.findIndex(item => item.resolve === resolve);
        if (index !== -1) {
          this.acquireQueue.splice(index, 1);
        }
        reject(new Error('Browser acquire timeout'));
      }, this.timeout);

      this.acquireQueue.push({
        resolve: (browser: Browser) => {
          clearTimeout(timeoutId);
          resolve(browser);
        },
        reject: (error: Error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
      });
    });
  }

  /**
   * 브라우저 인스턴스 반환
   *
   * @param browser - 반환할 Browser 인스턴스
   */
  public async release(browser: Browser): Promise<void> {
    const instance = this.instances.find(inst => inst.browser === browser);
    if (!instance) {
      return;
    }

    // 대기 중인 요청이 있으면 즉시 전달 (inUse 상태 유지)
    if (this.acquireQueue.length > 0) {
      const waiter = this.acquireQueue.shift();
      if (waiter) {
        instance.usageCount++;
        waiter.resolve(browser);
        return;
      }
    }

    // 아니면 사용 가능 상태로 전환
    instance.inUse = false;
  }

  /**
   * 모든 브라우저 인스턴스 종료
   */
  public async closeAll(): Promise<void> {
    // 대기 중인 요청 모두 거부
    for (const waiter of this.acquireQueue) {
      waiter.reject(new Error('BrowserPool is closing'));
    }
    this.acquireQueue = [];

    // 모든 브라우저 종료
    await Promise.all(
      this.instances.map(async inst => {
        if (inst.browser.isConnected()) {
          await inst.browser.close();
        }
      })
    );

    this.instances = [];
  }

  /**
   * 풀 상태 조회
   */
  public getStatus(): {
    total: number;
    active: number;
    waiting: number;
  } {
    return {
      total: this.instances.length,
      active: this.instances.filter(inst => inst.browser.isConnected()).length,
      waiting: this.acquireQueue.length,
    };
  }

  /**
   * 새 브라우저 인스턴스 생성
   */
  private async createBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // 메모리 절약
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
      ],
    });
  }

  /**
   * 브라우저 인스턴스 재시작
   */
  private async restartBrowser(instance: BrowserInstance): Promise<void> {
    if (instance.browser.isConnected()) {
      await instance.browser.close();
    }

    const newBrowser = await this.createBrowser();
    instance.browser = newBrowser;
    instance.usageCount = 0;
    instance.createdAt = Date.now();
    instance.inUse = true;
  }
}
