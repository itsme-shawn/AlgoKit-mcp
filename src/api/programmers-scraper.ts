/**
 * 프로그래머스 웹 스크래핑 클라이언트
 *
 * 검색 페이지: Puppeteer (SPA, JavaScript 렌더링 필요)
 * 상세 페이지: cheerio (Task 7.3에서 구현)
 */
import { Browser } from 'puppeteer';
import { BrowserPool } from '../utils/browser-pool.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import {
  ProgrammersSearchOptions,
  ProgrammersProblemSummary,
} from '../types/programmers.js';

/**
 * 프로그래머스 스크래핑 에러
 */
export class ProgrammersScrapeError extends Error {
  constructor(
    message: string,
    public code:
      | 'TIMEOUT'
      | 'SELECTOR_NOT_FOUND'
      | 'NAVIGATION_ERROR'
      | 'PARSE_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'ProgrammersScrapeError';
  }
}

/**
 * 프로그래머스 스크래퍼
 */
export class ProgrammersScraper {
  private browserPool: BrowserPool;
  private rateLimiter: RateLimiter;
  private readonly baseUrl = 'https://school.programmers.co.kr';

  constructor() {
    this.browserPool = BrowserPool.getInstance();
    // 초당 1회 요청 (보수적)
    this.rateLimiter = new RateLimiter({
      capacity: 2,
      refillRate: 1,
    });
  }

  /**
   * 프로그래머스 문제 검색
   *
   * @param options 검색 옵션
   * @returns 문제 목록
   * @throws {ProgrammersScrapeError}
   */
  async searchProblems(
    options: ProgrammersSearchOptions = {}
  ): Promise<ProgrammersProblemSummary[]> {
    const {
      levels = [],
      order = 'recent',
      page = 1,
      limit,
      query,
    } = options;

    // Rate limiting
    await this.rateLimiter.acquire();

    let browser: Browser | null = null;

    try {
      // 1. BrowserPool에서 브라우저 획득
      browser = await this.browserPool.acquire();
      const browserPage = await browser.newPage();

      // 2. 검색 URL 생성
      const searchUrl = this.buildSearchUrl({
        levels,
        order,
        page,
        query,
      });

      console.log(`[ProgrammersScraper] 검색 URL: ${searchUrl}`);

      // 3. 페이지 이동 및 로딩 대기
      try {
        await browserPage.goto(searchUrl, {
          waitUntil: 'networkidle2',
          timeout: 30000,
        });
      } catch (error) {
        throw new ProgrammersScrapeError(
          `페이지 로딩 실패: ${searchUrl}`,
          'NAVIGATION_ERROR',
          error
        );
      }

      // 4. JavaScript 렌더링 대기
      try {
        await browserPage.waitForSelector('table tbody tr', {
          timeout: 10000,
        });
      } catch (error) {
        // 빈 결과일 수 있으므로 스크린샷 저장 후 빈 배열 반환
        await browserPage.screenshot({
          path: 'programmers-search-empty.png',
        });

        const rowCount = await browserPage.$$eval(
          'table tbody tr',
          (rows) => rows.length
        );

        if (rowCount === 0) {
          console.log('[ProgrammersScraper] 검색 결과 없음');
          await browserPage.close();
          return [];
        }

        throw new ProgrammersScrapeError(
          'table tbody tr selector를 찾을 수 없습니다',
          'SELECTOR_NOT_FOUND',
          error
        );
      }

      // 5. 문제 목록 추출
      let problems: ProgrammersProblemSummary[];

      try {
        problems = await browserPage.$$eval('table tbody tr', (rows) => {
          return rows.map((row) => {
            const titleLink = row.querySelector(
              'td.title a[href*="/lessons/"]'
            );
            const categoryEl = row.querySelector('td.title small.part-title');
            const levelSpan = row.querySelector('td.level span[class*="level-"]');
            const finishedEl = row.querySelector('td.finished-count');
            const rateEl = row.querySelector('td.acceptance-rate');

            const href = titleLink?.getAttribute('href') || '';
            const problemId = href.match(/lessons\/(\d+)/)?.[1] || '';
            const title = titleLink?.textContent?.trim() || '';
            const category = categoryEl?.textContent?.trim() || '기타';
            const levelClass = levelSpan?.className || '';
            const level = parseInt(
              levelClass.match(/level-(\d+)/)?.[1] || '0'
            );

            const finishedText = finishedEl?.textContent?.trim() || '0명';
            const finishedCount = parseInt(
              finishedText.replace(/,/g, '').replace('명', '') || '0'
            );

            const rateText = rateEl?.textContent?.trim() || '0%';
            const acceptanceRate = parseInt(rateText.replace('%', '') || '0');

            return {
              problemId,
              title,
              level,
              category,
              url: `https://school.programmers.co.kr${href}`,
              finishedCount,
              acceptanceRate,
            };
          });
        });
      } catch (error) {
        throw new ProgrammersScrapeError(
          '문제 목록 파싱 실패',
          'PARSE_ERROR',
          error
        );
      }

      await browserPage.close();

      // 6. limit 적용
      if (limit && limit > 0) {
        problems = problems.slice(0, limit);
      }

      console.log(
        `[ProgrammersScraper] ${problems.length}개 문제 검색 완료`
      );

      return problems;
    } finally {
      // 7. 브라우저 반환 (필수!)
      if (browser) {
        await this.browserPool.release(browser);
      }
    }
  }

  /**
   * 검색 URL 생성
   */
  private buildSearchUrl(options: {
    levels: number[];
    order: string;
    page: number;
    query?: string;
  }): string {
    const params = new URLSearchParams();

    params.set('order', options.order);
    params.set('page', options.page.toString());

    if (options.levels.length > 0) {
      params.set('levels', options.levels.join(','));
    }

    if (options.query) {
      params.set('query', options.query);
    }

    return `${this.baseUrl}/learn/challenges?${params.toString()}`;
  }

  /**
   * 문제 상세 페이지 가져오기 (Task 7.3에서 구현)
   *
   * @param problemId 문제 ID
   * @returns HTML 문자열
   * @throws {Error} Not implemented yet
   */
  async fetchProblemPage(_problemId: string): Promise<string> {
    throw new Error('fetchProblemPage is not implemented yet (Task 7.3)');
  }
}
