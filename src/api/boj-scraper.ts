/**
 * BOJ 문제 페이지 크롤러
 *
 * Phase 6 - P6-002: 문제 본문 크롤러 구현
 *
 * fetch를 사용하여 BOJ 페이지 HTML을 가져옵니다.
 */

/**
 * BOJ 크롤러 설정
 */
const BOJ_CONFIG = {
  /** BOJ 문제 페이지 URL 템플릿 */
  BASE_URL: 'https://www.acmicpc.net/problem',
  /** User-Agent (개인 학습 목적 명시) */
  USER_AGENT: 'cote-mcp-learner/1.0 (Educational Purpose)',
  /** 타임아웃 (밀리초) */
  TIMEOUT: 10000,
  /** 재시도 횟수 */
  MAX_RETRIES: 2,
} as const;

/**
 * BOJ 크롤링 에러
 */
export class BojFetchError extends Error {
  constructor(
    message: string,
    public code: 'NOT_FOUND' | 'NETWORK_ERROR' | 'TIMEOUT' | 'PARSE_ERROR',
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'BojFetchError';
  }
}

/**
 * BOJ 문제 페이지 크롤러
 */
export class BOJScraper {
  /**
   * 지정된 문제 번호의 HTML 페이지를 가져옵니다.
   *
   * @param problemId - BOJ 문제 번호 (예: 1000)
   * @returns HTML 문자열
   * @throws {BojFetchError} 크롤링 실패 시
   *
   * @example
   * ```typescript
   * const scraper = new BOJScraper();
   * const html = await scraper.fetchProblemPage(1000);
   * console.log(html.length); // HTML 길이 출력
   * ```
   */
  async fetchProblemPage(problemId: number): Promise<string> {
    if (!Number.isInteger(problemId) || problemId <= 0) {
      throw new BojFetchError(
        `유효하지 않은 문제 번호: ${problemId}`,
        'PARSE_ERROR'
      );
    }

    const url = `${BOJ_CONFIG.BASE_URL}/${problemId}`;
    let lastError: unknown;

    // 재시도 로직
    for (let attempt = 0; attempt <= BOJ_CONFIG.MAX_RETRIES; attempt++) {
      try {
        const html = await this._fetchWithTimeout(url);
        return html;
      } catch (error) {
        lastError = error;

        // 404는 재시도 불필요
        if (error instanceof BojFetchError && error.code === 'NOT_FOUND') {
          throw error;
        }

        // 마지막 시도가 아니면 재시도
        if (attempt < BOJ_CONFIG.MAX_RETRIES) {
          await this._delay(1000 * (attempt + 1)); // 지수 백오프
          continue;
        }
      }
    }

    // 모든 재시도 실패
    throw new BojFetchError(
      `문제 ${problemId}번을 ${BOJ_CONFIG.MAX_RETRIES + 1}번 시도했으나 실패했습니다.`,
      'NETWORK_ERROR',
      lastError
    );
  }

  /**
   * 타임아웃 적용된 HTTP 요청
   */
  private async _fetchWithTimeout(url: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BOJ_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': BOJ_CONFIG.USER_AGENT,
          'Accept': 'text/html',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });

      clearTimeout(timeoutId);

      // 404 처리
      if (response.status === 404) {
        throw new BojFetchError(
          `문제를 찾을 수 없습니다: ${url}`,
          'NOT_FOUND'
        );
      }

      // 기타 HTTP 에러
      if (!response.ok) {
        throw new BojFetchError(
          `HTTP 에러 ${response.status}: ${response.statusText}`,
          'NETWORK_ERROR'
        );
      }

      const html = await response.text();

      // HTML 검증
      if (!html || html.length < 100) {
        throw new BojFetchError(
          '빈 HTML 응답을 받았습니다.',
          'PARSE_ERROR'
        );
      }

      return html;
    } catch (error) {
      clearTimeout(timeoutId);

      // 이미 BojFetchError면 그대로 throw
      if (error instanceof BojFetchError) {
        throw error;
      }

      // AbortError는 타임아웃
      if ((error as Error).name === 'AbortError') {
        throw new BojFetchError(
          `요청이 타임아웃되었습니다 (${BOJ_CONFIG.TIMEOUT}ms 초과)`,
          'TIMEOUT',
          error
        );
      }

      // 기타 네트워크 에러
      throw new BojFetchError(
        `네트워크 요청 실패: ${(error as Error).message}`,
        'NETWORK_ERROR',
        error
      );
    }
  }

  /**
   * 지연 함수 (재시도 간격)
   */
  private _delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
