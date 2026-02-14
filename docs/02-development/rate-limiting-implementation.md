# Rate Limiting 구현 전략

**작성일**: 2026-02-15
**Phase**: Phase 4 - Task 4.2
**작성자**: project-planner
**기반 문서**: `docs/01-planning/rate-limiting-design.md`

---

## 1. 구현 개요

### 1.1 목표

- ✅ RateLimiter 클래스 구현 (Token Bucket 알고리즘)
- ✅ SolvedAcClient 통합
- ✅ 단위 테스트 및 통합 테스트 작성
- ✅ 문서 업데이트

### 1.2 파일별 작업 내역

| 파일 | 작업 | 예상 코드 |
|------|------|----------|
| `src/utils/rate-limiter.ts` | **신규 생성** | ~150줄 |
| `src/api/types.ts` | **수정** (RateLimitError 추가) | +10줄 |
| `src/api/solvedac-client.ts` | **수정** (limiter.acquire() 추가) | +3줄 |
| `tests/utils/rate-limiter.test.ts` | **신규 생성** | ~200줄 |
| `tests/api/solvedac-client-rate-limit.test.ts` | **신규 생성** | ~100줄 |

**총 코드량**: 약 463줄 (신규 450줄, 수정 13줄)

---

## 2. 파일별 구현 상세

### 2.1 `src/utils/rate-limiter.ts` (신규 생성)

**파일 구조**:
```typescript
/**
 * Rate Limiter 유틸리티
 *
 * Token Bucket 알고리즘을 사용하여 API 호출 속도 제한
 */

/** RateLimiter 옵션 */
export interface RateLimiterOptions {
  /** 버킷 최대 용량 (한 번에 사용 가능한 최대 토큰 수) */
  capacity: number;

  /** 토큰 충전 속도 (초당 토큰 수) */
  refillRate: number;

  /** 대기 시 최대 타임아웃 (밀리초, 기본값: 5000ms) */
  maxWaitTime?: number;
}

/** Token Bucket 기반 Rate Limiter */
export class RateLimiter {
  /** 버킷 최대 용량 */
  private readonly capacity: number;

  /** 토큰 충전 속도 (초당) */
  private readonly refillRate: number;

  /** 대기 최대 타임아웃 (밀리초) */
  private readonly maxWaitTime: number;

  /** 현재 토큰 수 */
  private tokens: number;

  /** 마지막 충전 시간 (밀리초) */
  private lastRefillTime: number;

  constructor(options: RateLimiterOptions) {
    this.capacity = options.capacity;
    this.refillRate = options.refillRate;
    this.maxWaitTime = options.maxWaitTime || 5000;

    // 초기 상태: 버킷이 가득 참
    this.tokens = options.capacity;
    this.lastRefillTime = Date.now();
  }

  /**
   * 토큰 1개를 획득합니다. 토큰이 없으면 대기합니다.
   *
   * @throws {RateLimitError} maxWaitTime 초과 시
   *
   * @example
   * ```typescript
   * const limiter = new RateLimiter({ capacity: 10, refillRate: 10 });
   * await limiter.acquire(); // 토큰 1개 소비
   * // API 호출 진행
   * ```
   */
  async acquire(): Promise<void> {
    // 1. 토큰 충전
    this.refill();

    // 2. 토큰 사용 가능 확인
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return; // 즉시 반환
    }

    // 3. 토큰 부족 시 대기 시간 계산
    const waitTime = this.calculateWaitTime(1);

    // 4. 타임아웃 체크
    if (waitTime > this.maxWaitTime) {
      throw new RateLimitError(
        Math.ceil(waitTime / 1000),
        `Rate limit wait time (${waitTime}ms) exceeds max wait time (${this.maxWaitTime}ms)`
      );
    }

    // 5. 대기
    console.info(`[RateLimiter] Waiting ${waitTime}ms for token...`);
    await this.delay(waitTime);

    // 6. 토큰 소비
    this.refill(); // 대기 후 다시 충전
    this.tokens -= 1;
  }

  /**
   * 토큰 획득을 시도합니다. 즉시 반환합니다.
   *
   * @returns 성공 여부 (true: 토큰 획득, false: 토큰 부족)
   *
   * @example
   * ```typescript
   * if (limiter.tryAcquire()) {
   *   // API 호출
   * } else {
   *   // 나중에 재시도
   * }
   * ```
   */
  tryAcquire(): boolean {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * 현재 사용 가능한 토큰 수를 반환합니다 (테스트/디버깅용)
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * 토큰을 충전합니다 (시간 경과에 따라)
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000; // 초 단위 변환

    if (elapsed <= 0) {
      return; // 시간 경과 없음
    }

    // 충전할 토큰 수 계산
    const tokensToAdd = elapsed * this.refillRate;

    // 버킷 용량 초과 방지
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);

    // 마지막 충전 시간 업데이트
    this.lastRefillTime = now;
  }

  /**
   * 필요한 토큰을 얻기 위한 대기 시간을 계산합니다 (밀리초)
   */
  private calculateWaitTime(tokensNeeded: number): number {
    const tokensShortage = tokensNeeded - this.tokens;

    if (tokensShortage <= 0) {
      return 0; // 이미 충분
    }

    // 부족한 토큰을 충전하는 데 걸리는 시간 (밀리초)
    return (tokensShortage / this.refillRate) * 1000;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================
// 싱글톤 인스턴스
// ============================================

/**
 * solved.ac API Rate Limiter
 * - 버킷 용량: 10개
 * - 충전 속도: 초당 10개
 * - 최대 대기: 5초
 */
export const solvedAcLimiter = new RateLimiter({
  capacity: 10,
  refillRate: 10,
  maxWaitTime: 5000,
});
```

**핵심 로직 설명**:

1. **refill()**: 시간 경과에 따라 토큰 충전
   - 마지막 충전 이후 경과 시간 계산
   - `elapsed * refillRate` 만큼 토큰 추가
   - 최대 `capacity`까지만 보유

2. **acquire()**: 토큰 획득 (대기 포함)
   - 토큰 충전 후 사용 가능 확인
   - 부족 시 대기 시간 계산 → 타임아웃 체크 → 대기
   - 대기 후 토큰 소비

3. **calculateWaitTime()**: 필요한 대기 시간 계산
   - 부족한 토큰 수 / 충전 속도 = 대기 시간

**예시**:
```
현재 토큰: 0개
필요 토큰: 1개
충전 속도: 10개/초

대기 시간 = (1 - 0) / 10 * 1000 = 100ms
```

---

### 2.2 `src/api/types.ts` (수정)

**기존 파일 끝에 추가**:

```typescript
/**
 * Rate Limit 에러
 *
 * API 호출 횟수 제한에 도달했을 때 발생합니다.
 */
export class RateLimitError extends Error {
  /**
   * @param retryAfter - 재시도 가능 시간 (초 단위, 선택사항)
   * @param message - 에러 메시지
   */
  constructor(
    public retryAfter?: number,
    message = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

**변경 사항**:
- 새 에러 클래스 추가
- 기존 에러 클래스들과 동일한 패턴

---

### 2.3 `src/api/solvedac-client.ts` (수정)

**import 추가** (파일 상단):

```typescript
import { solvedAcLimiter } from '../utils/rate-limiter.js';
```

**request() 메서드 수정**:

```typescript
// Before:
private async request<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  retries = 0
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  // ... (쿼리 파라미터 추가)

  const cacheKey = url.toString();

  // 캐시 확인
  const cached = this.getCached<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const controller = new AbortController();
    // ... (기존 fetch 로직)
  } catch (error) {
    // ... (기존 에러 처리)
  }
}

// After:
private async request<T>(
  endpoint: string,
  params: Record<string, string | number> = {},
  retries = 0
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${endpoint}`);
  // ... (쿼리 파라미터 추가)

  const cacheKey = url.toString();

  // 캐시 확인
  const cached = this.getCached<T>(cacheKey);
  if (cached !== null) {
    return cached; // 캐시 히트 시 Rate Limiter 우회
  }

  // ✨ NEW: Rate Limiting 적용
  await solvedAcLimiter.acquire();

  try {
    const controller = new AbortController();
    // ... (기존 fetch 로직)
  } catch (error) {
    // ... (기존 에러 처리)
  }
}
```

**변경 사항**:
- import 1줄 추가
- `await solvedAcLimiter.acquire()` 1줄 추가
- 위치: 캐시 확인 후, fetch 호출 전

---

### 2.4 `tests/utils/rate-limiter.test.ts` (신규 생성)

**테스트 구조**:

```typescript
/**
 * RateLimiter 단위 테스트
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../../src/utils/rate-limiter.js';
import { RateLimitError } from '../../src/api/types.js';

/**
 * 지연 함수 (테스트용)
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('RateLimiter', () => {
  describe('Token Bucket 기본 동작', () => {
    it('should allow immediate acquire when tokens available', async () => {
      const limiter = new RateLimiter({ capacity: 10, refillRate: 10 });

      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      // 토큰이 충분하면 즉시 반환 (< 10ms)
      expect(elapsed).toBeLessThan(10);
      expect(limiter.getAvailableTokens()).toBe(9); // 1개 소비
    });

    it('should consume tokens correctly', async () => {
      const limiter = new RateLimiter({ capacity: 5, refillRate: 10 });

      // 5개 토큰 모두 소비
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.getAvailableTokens()).toBe(0);
    });

    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter({ capacity: 10, refillRate: 10 });

      // 10개 토큰 모두 소비
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      expect(limiter.getAvailableTokens()).toBe(0);

      // 0.5초 대기 → 5개 토큰 충전
      await sleep(500);

      expect(limiter.getAvailableTokens()).toBeCloseTo(5, 0);
    });

    it('should not exceed capacity when refilling', async () => {
      const limiter = new RateLimiter({ capacity: 3, refillRate: 100 });

      // 10초 대기 → 1000개 토큰 충전 시도
      await sleep(10000);

      // 하지만 최대 3개까지만 보유
      expect(limiter.getAvailableTokens()).toBe(3);
    });
  });

  describe('대기 (Waiting)', () => {
    it('should wait when no tokens available', async () => {
      const limiter = new RateLimiter({ capacity: 1, refillRate: 10 });

      // 첫 번째 토큰 소비
      await limiter.acquire();
      expect(limiter.getAvailableTokens()).toBe(0);

      // 두 번째 요청은 대기해야 함
      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;

      // 0.1초 (100ms) 대기 예상
      expect(elapsed).toBeGreaterThanOrEqual(90); // 오차 허용
      expect(elapsed).toBeLessThan(150);
    });

    it('should handle multiple waiters', async () => {
      const limiter = new RateLimiter({ capacity: 2, refillRate: 10 });

      // 2개 토큰 소비
      await limiter.acquire();
      await limiter.acquire();

      // 3개 요청 동시 발생 → 모두 대기
      const promises = [
        limiter.acquire(),
        limiter.acquire(),
        limiter.acquire(),
      ];

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // 3개 토큰 충전 시간: 0.3초 (300ms)
      expect(elapsed).toBeGreaterThanOrEqual(250);
      expect(elapsed).toBeLessThan(400);
    });
  });

  describe('타임아웃', () => {
    it('should throw RateLimitError on timeout', async () => {
      const limiter = new RateLimiter({
        capacity: 1,
        refillRate: 0.1, // 초당 0.1개 (10초에 1개)
        maxWaitTime: 100, // 0.1초
      });

      await limiter.acquire(); // 첫 토큰 소비

      // 두 번째 요청은 10초 대기 필요 → 타임아웃
      await expect(limiter.acquire()).rejects.toThrow(RateLimitError);
    });

    it('should include retryAfter in error', async () => {
      const limiter = new RateLimiter({
        capacity: 1,
        refillRate: 0.5, // 2초에 1개
        maxWaitTime: 100,
      });

      await limiter.acquire(); // 첫 토큰 소비

      try {
        await limiter.acquire();
        expect.fail('Should throw RateLimitError');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBeGreaterThan(0);
      }
    });
  });

  describe('tryAcquire()', () => {
    it('should return true when tokens available', () => {
      const limiter = new RateLimiter({ capacity: 5, refillRate: 10 });

      const result = limiter.tryAcquire();
      expect(result).toBe(true);
      expect(limiter.getAvailableTokens()).toBe(4);
    });

    it('should return false when no tokens available', () => {
      const limiter = new RateLimiter({ capacity: 1, refillRate: 10 });

      limiter.tryAcquire(); // 첫 토큰 소비
      const result = limiter.tryAcquire(); // 두 번째 시도

      expect(result).toBe(false);
      expect(limiter.getAvailableTokens()).toBe(0);
    });

    it('should not wait', () => {
      const limiter = new RateLimiter({ capacity: 1, refillRate: 0.1 });

      limiter.tryAcquire(); // 토큰 소비

      const start = Date.now();
      const result = limiter.tryAcquire();
      const elapsed = Date.now() - start;

      expect(result).toBe(false);
      expect(elapsed).toBeLessThan(10); // 즉시 반환
    });
  });

  describe('엣지 케이스', () => {
    it('should handle high refill rate', async () => {
      const limiter = new RateLimiter({ capacity: 100, refillRate: 1000 });

      // 100개 토큰 소비
      for (let i = 0; i < 100; i++) {
        await limiter.acquire();
      }

      // 0.1초 대기 → 100개 충전
      await sleep(100);

      expect(limiter.getAvailableTokens()).toBeCloseTo(100, 0);
    });

    it('should handle fractional tokens', async () => {
      const limiter = new RateLimiter({ capacity: 10, refillRate: 3.5 });

      // 10개 토큰 소비
      for (let i = 0; i < 10; i++) {
        await limiter.acquire();
      }

      // 1초 대기 → 3.5개 충전
      await sleep(1000);

      expect(limiter.getAvailableTokens()).toBeCloseTo(3.5, 1);
    });

    it('should handle zero capacity', () => {
      expect(() => {
        new RateLimiter({ capacity: 0, refillRate: 10 });
      }).not.toThrow(); // 생성은 가능

      const limiter = new RateLimiter({ capacity: 0, refillRate: 10 });
      expect(limiter.tryAcquire()).toBe(false); // 항상 실패
    });
  });
});
```

**테스트 커버리지**:
- ✅ 기본 동작: 토큰 소비, 충전, 용량 제한
- ✅ 대기: 토큰 부족 시 대기, 다중 대기
- ✅ 타임아웃: maxWaitTime 초과 시 에러
- ✅ tryAcquire(): 즉시 반환
- ✅ 엣지 케이스: 고속 충전, 분수 토큰, 0 용량

---

### 2.5 `tests/api/solvedac-client-rate-limit.test.ts` (신규 생성)

**통합 테스트**:

```typescript
/**
 * SolvedAcClient Rate Limiting 통합 테스트
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SolvedAcClient } from '../../src/api/solvedac-client.js';
import { solvedAcLimiter } from '../../src/utils/rate-limiter.js';

describe('SolvedAcClient Rate Limiting', () => {
  let client: SolvedAcClient;

  beforeEach(() => {
    client = new SolvedAcClient();
    client.clearCache(); // 캐시 초기화
  });

  it('should apply rate limiting to API requests', async () => {
    // 20개 요청 동시 발생
    const promises = Array.from({ length: 20 }, (_, i) =>
      client.getProblem(1000 + i)
    );

    const start = Date.now();
    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;

    // 초당 10회 제한 → 20개 요청은 최소 1초 소요
    expect(elapsed).toBeGreaterThanOrEqual(1000);

    // 모든 요청 성공
    expect(results).toHaveLength(20);
  });

  it('should not apply rate limit to cached requests', async () => {
    // 첫 요청 (캐시 미스 → Rate Limiter 통과)
    await client.getProblem(1000);

    // 두 번째 요청 (캐시 히트 → Rate Limiter 우회)
    const start = Date.now();
    await client.getProblem(1000);
    const elapsed = Date.now() - start;

    // 캐시 히트는 즉시 반환 (< 10ms)
    expect(elapsed).toBeLessThan(10);
  });

  it('should handle rate limit across different methods', async () => {
    // searchProblems, getProblem, searchTags 혼용
    const promises = [
      client.searchProblems({ query: 'DP' }),
      client.getProblem(1000),
      client.searchTags('graph'),
      client.searchProblems({ level_min: 10 }),
      client.getProblem(2000),
    ];

    const start = Date.now();
    await Promise.all(promises);
    const elapsed = Date.now() - start;

    // 5개 요청 → 즉시 처리 (버킷 용량 10개)
    expect(elapsed).toBeLessThan(100);
  });

  it('should recover after rate limit wait', async () => {
    // 10개 토큰 모두 소비
    for (let i = 0; i < 10; i++) {
      await client.getProblem(1000 + i);
    }

    // 11번째 요청 → 대기 필요
    const start = Date.now();
    await client.getProblem(2000);
    const elapsed = Date.now() - start;

    // 0.1초 대기 후 성공
    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(200);
  });

  describe('부하 테스트', () => {
    it('should handle 100 concurrent requests', async () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        client.getProblem(1000 + i)
      );

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // 100개 요청 → 초당 10회 → 최소 9초 소요
      expect(elapsed).toBeGreaterThanOrEqual(9000);
      expect(elapsed).toBeLessThan(12000); // 최대 12초 이내
    });

    it('should maintain rate limit under sustained load', async () => {
      const requestCounts: number[] = [];

      // 5초간 지속적으로 요청 발생
      const endTime = Date.now() + 5000;
      let count = 0;

      while (Date.now() < endTime) {
        await client.getProblem(1000 + count);
        count++;
      }

      // 5초 동안 최대 50개 요청 (초당 10회)
      expect(count).toBeLessThanOrEqual(55); // 오차 허용
      expect(count).toBeGreaterThanOrEqual(45);
    });
  });

  describe('캐싱과의 조합', () => {
    it('should benefit from cache to reduce rate limit pressure', async () => {
      // 동일 문제 10번 요청
      const promises = Array.from({ length: 10 }, () =>
        client.getProblem(1000)
      );

      const start = Date.now();
      await Promise.all(promises);
      const elapsed = Date.now() - start;

      // 첫 요청만 Rate Limiter 통과, 나머지는 캐시 히트
      // → 거의 즉시 완료
      expect(elapsed).toBeLessThan(100);
    });

    it('should use rate limiter only for cache misses', async () => {
      const spy = vi.spyOn(solvedAcLimiter, 'acquire');

      // 첫 요청 (캐시 미스)
      await client.getProblem(1000);
      expect(spy).toHaveBeenCalledTimes(1);

      // 두 번째 요청 (캐시 히트)
      await client.getProblem(1000);
      expect(spy).toHaveBeenCalledTimes(1); // 여전히 1회

      spy.mockRestore();
    });
  });
});
```

**테스트 시나리오**:
- ✅ 기본 Rate Limiting 동작
- ✅ 캐시와의 조합 (캐시 히트 시 Rate Limiter 우회)
- ✅ 다양한 메서드 혼용 (searchProblems, getProblem, searchTags)
- ✅ 부하 테스트 (100개 요청, 지속적 부하)
- ✅ Rate Limit 복구 (대기 후 정상 진행)

---

## 3. 구현 순서 및 체크리스트

### Day 1: Core Implementation (4시간)

#### Step 1: RateLimiter 클래스 구현 (2시간)

- [ ] `src/utils/rate-limiter.ts` 생성
  - [ ] RateLimiterOptions 인터페이스 정의
  - [ ] RateLimiter 클래스 구현
    - [ ] constructor (초기화)
    - [ ] acquire() 메서드
    - [ ] tryAcquire() 메서드
    - [ ] getAvailableTokens() 메서드 (테스트용)
    - [ ] refill() 메서드 (private)
    - [ ] calculateWaitTime() 메서드 (private)
    - [ ] delay() 메서드 (private)
  - [ ] solvedAcLimiter 싱글톤 인스턴스 export

#### Step 2: 에러 타입 추가 (30분)

- [ ] `src/api/types.ts` 수정
  - [ ] RateLimitError 클래스 추가
  - [ ] JSDoc 주석 작성

#### Step 3: SolvedAcClient 통합 (1시간)

- [ ] `src/api/solvedac-client.ts` 수정
  - [ ] solvedAcLimiter import 추가
  - [ ] request() 메서드에 `await limiter.acquire()` 추가
  - [ ] 로컬 테스트 (npm run dev)

#### Step 4: 빌드 및 기본 검증 (30분)

- [ ] `npm run build` 실행 (TypeScript 컴파일 에러 확인)
- [ ] 수동 테스트 (Claude Desktop 연동)
  - [ ] 문제 검색 10회 연속 실행
  - [ ] 대기 시간 관찰

---

### Day 2: Testing (4시간)

#### Step 5: 단위 테스트 작성 (2시간)

- [ ] `tests/utils/rate-limiter.test.ts` 생성
  - [ ] Token Bucket 기본 동작 (4개 테스트)
  - [ ] 대기 (2개 테스트)
  - [ ] 타임아웃 (2개 테스트)
  - [ ] tryAcquire() (3개 테스트)
  - [ ] 엣지 케이스 (3개 테스트)
- [ ] `npm test tests/utils/rate-limiter.test.ts` 실행
- [ ] 모든 테스트 통과 확인

#### Step 6: 통합 테스트 작성 (1.5시간)

- [ ] `tests/api/solvedac-client-rate-limit.test.ts` 생성
  - [ ] 기본 Rate Limiting (4개 테스트)
  - [ ] 부하 테스트 (2개 테스트)
  - [ ] 캐싱 조합 (2개 테스트)
- [ ] `npm test tests/api/solvedac-client-rate-limit.test.ts` 실행
- [ ] 모든 테스트 통과 확인

#### Step 7: 전체 테스트 실행 (30분)

- [ ] `npm test` 실행 (전체 테스트 스위트)
- [ ] 기존 테스트 영향 없음 확인
- [ ] 커버리지 확인 (`npm test -- --coverage`)

---

### Day 3: 문서 및 마무리 (1시간)

#### Step 8: 문서 업데이트

- [ ] `docs/03-project-management/tasks.md` 업데이트
  - [ ] Task 4.2 상태를 ✅ DONE으로 변경
  - [ ] 완료 항목 체크
- [ ] `CLAUDE.md` 업데이트
  - [ ] Phase 4 진행 상황 반영
  - [ ] Rate Limiting 언급 추가
- [ ] `docs/02-development/tools-reference.md` 검토
  - [ ] Rate Limiting 안내 추가 (선택)

#### Step 9: 최종 검토

- [ ] 코드 리뷰 체크리스트
  - [ ] TypeScript 타입 안전성
  - [ ] 에러 처리 적절성
  - [ ] 주석 및 문서화
  - [ ] 테스트 커버리지
- [ ] 성능 검증
  - [ ] 토큰 획득 오버헤드 < 1ms 확인
  - [ ] 대기 시간 정확도 ±10ms 확인

---

## 4. 인수 조건 (Acceptance Criteria)

### 4.1 기능 요구사항

- ✅ **RateLimiter 클래스**
  - Token Bucket 알고리즘 정확히 구현
  - acquire(), tryAcquire(), getAvailableTokens() 메서드 제공
  - 토큰 충전 및 소비 정확성

- ✅ **SolvedAcClient 통합**
  - 캐시 히트 시 Rate Limiter 우회
  - 실제 API 호출 시에만 Rate Limiter 통과
  - 초당 10회 제한 정상 작동

- ✅ **에러 처리**
  - maxWaitTime 초과 시 RateLimitError 발생
  - retryAfter 정보 포함
  - 명확한 에러 메시지

### 4.2 성능 요구사항

- ✅ **토큰 획득 오버헤드**: < 1ms (즉시 획득 시)
- ✅ **대기 시간 정확도**: ±10ms
- ✅ **메모리 효율성**: 싱글톤 인스턴스 (최소 메모리)

### 4.3 테스트 요구사항

- ✅ **단위 테스트**
  - 최소 14개 테스트 작성
  - 모든 테스트 통과
  - 엣지 케이스 커버

- ✅ **통합 테스트**
  - 최소 8개 테스트 작성
  - 부하 테스트 포함 (100개 요청)
  - 캐싱 조합 검증

- ✅ **전체 커버리지**
  - RateLimiter 클래스: 90% 이상
  - SolvedAcClient 수정 부분: 100%

### 4.4 문서 요구사항

- ✅ **코드 주석**
  - 모든 public 메서드에 JSDoc
  - 복잡한 로직에 인라인 주석

- ✅ **문서 업데이트**
  - tasks.md 상태 변경
  - CLAUDE.md 반영
  - 설계서 및 구현 가이드 작성 완료

---

## 5. 검증 방법

### 5.1 수동 테스트

**시나리오 1: 정상 동작**
```typescript
// Claude Desktop에서 실행
const client = new SolvedAcClient();

// 10개 요청 연속 실행 (즉시 처리)
for (let i = 0; i < 10; i++) {
  const problem = await client.getProblem(1000 + i);
  console.log(`Problem ${i + 1}: ${problem.titleKo}`);
}
```

**예상 결과**: 모든 요청이 1초 이내 완료

**시나리오 2: Rate Limit 대기**
```typescript
// 20개 요청 연속 실행
for (let i = 0; i < 20; i++) {
  const start = Date.now();
  const problem = await client.getProblem(1000 + i);
  const elapsed = Date.now() - start;
  console.log(`Request ${i + 1}: ${elapsed}ms`);
}
```

**예상 결과**:
- 1-10번째 요청: < 100ms (즉시)
- 11번째 요청: ~100ms (대기 발생)
- 12-20번째 요청: 순차적 대기

### 5.2 부하 테스트

**명령어**:
```bash
npm test tests/api/solvedac-client-rate-limit.test.ts -- --reporter=verbose
```

**확인 사항**:
- 100개 요청 → 9-12초 소요
- 메모리 사용량 안정적
- 에러 없음

### 5.3 캐싱 효과 검증

**시나리오**:
```typescript
// 동일 문제 100번 요청
for (let i = 0; i < 100; i++) {
  await client.getProblem(1000);
}
```

**예상 결과**:
- 첫 요청: Rate Limiter 통과 (~100ms)
- 나머지 99개: 캐시 히트 (< 10ms each)
- 총 소요 시간: < 1초

---

## 6. 트러블슈팅

### 6.1 일반적인 문제

**문제 1: 테스트 타임아웃**
```
Error: Test timeout exceeded (5000ms)
```

**원인**: 부하 테스트가 예상보다 오래 걸림

**해결**:
```typescript
// vitest.config.ts
export default {
  test: {
    testTimeout: 15000, // 15초로 증가
  },
};
```

**문제 2: 시간 기반 테스트 불안정**
```
Expected 100ms, but got 95ms
```

**원인**: OS 스케줄링으로 인한 오차

**해결**:
```typescript
// 오차 허용 범위 설정
expect(elapsed).toBeGreaterThanOrEqual(90); // -10ms 허용
expect(elapsed).toBeLessThan(150); // +50ms 허용
```

**문제 3: 캐시 간섭**
```
Expected rate limiter to be called once, but called twice
```

**원인**: 이전 테스트의 캐시가 남아있음

**해결**:
```typescript
beforeEach(() => {
  client.clearCache(); // 각 테스트 전 캐시 초기화
});
```

### 6.2 성능 이슈

**문제: 토큰 획득 오버헤드 > 1ms**

**진단**:
```typescript
const limiter = new RateLimiter({ capacity: 10, refillRate: 10 });

const start = Date.now();
for (let i = 0; i < 1000; i++) {
  await limiter.tryAcquire();
}
const elapsed = Date.now() - start;
console.log(`Average: ${elapsed / 1000}ms per acquire`);
```

**해결**:
- `refill()` 메서드 최적화 (캐싱)
- 불필요한 계산 제거

---

## 7. Next Steps

### 7.1 Phase 4.3 준비 (로깅/모니터링)

**Task 4.3과의 통합**:
- Winston 로거 추가
- 메트릭 집계 시스템
- 운영 대시보드

**Rate Limiter 로깅 확장**:
```typescript
// Phase 4.2 (현재)
console.info('[RateLimiter] Waiting 150ms...');

// Phase 4.3 (향후)
logger.info('rate_limit_wait', {
  waitTime: 150,
  tokens: 0,
  refillRate: 10,
});
```

### 7.2 Phase 4.4 준비 (LRU 캐싱)

**캐싱과 Rate Limiting의 시너지**:
- LRU 캐싱으로 캐시 히트율 70%+ 달성
- Rate Limiter 부담 30% 감소
- 전체 응답 시간 단축

### 7.3 Phase 6+ (BOJ 스크래핑)

**bojLimiter 추가**:
```typescript
export const bojLimiter = new RateLimiter({
  capacity: 1,
  refillRate: 0.33, // 3초에 1회
});
```

**BOJScraper 통합**:
```typescript
await bojLimiter.acquire();
const html = await fetch(url);
```

---

## 8. 참고 자료

### 8.1 관련 문서

- **설계서**: `docs/01-planning/rate-limiting-design.md`
- **Phase 4 계획**: `docs/03-project-management/tasks.md`
- **API 통합 가이드**: `docs/02-development/api-integration.md`

### 8.2 외부 자료

- **Token Bucket 알고리즘**: [Wikipedia](https://en.wikipedia.org/wiki/Token_bucket)
- **Rate Limiting 패턴**: [Stripe API Design](https://stripe.com/docs/rate-limits)

---

## 9. 요약

### 9.1 핵심 포인트

- ✅ **간단한 구현**: 150줄의 RateLimiter 클래스
- ✅ **최소 침습**: SolvedAcClient에 1줄만 추가
- ✅ **캐싱 활용**: 캐시 히트 시 Rate Limiter 우회
- ✅ **테스트 충실**: 22개 테스트로 안정성 보장

### 9.2 예상 결과

**안정성**:
- solved.ac API 차단 위험 제거
- 초당 10회 제한으로 보수적 운영

**사용자 경험**:
- 캐시 히트 시 즉시 응답 (< 100ms)
- 캐시 미스 시 최대 5초 대기 (투명)

**확장성**:
- 새 플랫폼 추가 용이
- Phase 4.3-4.4와 원활한 통합

---

**구현 시작 준비 완료**
다음 단계: fullstack-developer 에이전트에게 구현 위임
