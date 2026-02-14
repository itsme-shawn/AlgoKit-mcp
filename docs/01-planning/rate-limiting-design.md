# Rate Limiting 설계서

**작성일**: 2026-02-15
**Phase**: Phase 4 - Task 4.2
**작성자**: project-planner

---

## 1. 개요

### 1.1 목적

외부 API 호출에 대한 Rate Limiting을 구현하여 다음 목표를 달성합니다:

- **서비스 안정성**: API 제공자의 차단 위험 제거
- **공정한 사용**: 공개 API의 책임있는 사용
- **예측 가능성**: 일관된 응답 시간 보장
- **확장 가능성**: 향후 다중 사용자/배포 시나리오 대응

### 1.2 적용 범위

| API | 현재 상태 | Rate Limiting 필요성 | 우선순위 |
|-----|-----------|---------------------|----------|
| **solved.ac API** | 재시도 O, Rate Limiting X | 높음 (공개 API, 제한 명시 없음) | P0 |
| **BOJ 스크래핑** | 3초 간격 구현 완료 | 낮음 (이미 윤리적 스크래핑 적용) | P2 |
| **Programmers** | 미구현 | 중간 (향후 계획) | P3 |

**Phase 4.2 구현 범위**: solved.ac API만 우선 구현

---

## 2. Rate Limiting 정책

### 2.1 solved.ac API 정책

**제약 분석**:
- solved.ac는 공개 API이며 공식 Rate Limit 명시 없음
- 하지만 과도한 호출 시 IP 차단 위험 존재
- 일반적인 공개 API Rate Limit: 초당 10-100회

**결정된 정책**:

```typescript
const SOLVED_AC_RATE_LIMIT = {
  /** 버킷 최대 용량 (한 번에 사용 가능한 최대 토큰 수) */
  capacity: 10,

  /** 토큰 충전 속도 (초당 토큰 수) */
  refillRate: 10, // 초당 10회

  /** 대기 시 최대 타임아웃 (밀리초) */
  maxWaitTime: 5000, // 5초
};
```

**근거**:
- **초당 10회**: 보수적인 값으로 API 차단 위험 최소화
- **버킷 크기 10**: 순간적인 버스트 트래픽 허용 (10회까지)
- **최대 대기 5초**: 사용자 경험 저해 방지

**캐싱과의 조합**:
- 현재 캐시 히트율: 예상 60-70% (TTL 1시간)
- 실제 API 호출: 30-40%만 Rate Limiter 통과
- **효과**: 초당 10회 제한으로 충분 (실제 부하는 초당 3-4회)

### 2.2 BOJ 스크래핑 정책

**현재 상태**:
```typescript
// src/api/boj-scraper.ts (이미 구현 완료)
const BOJ_CONFIG = {
  REQUEST_INTERVAL: 3000, // 3초 간격
};
```

**Phase 4.2 액션**: 없음 (이미 충분히 보수적)

**향후 개선** (Phase 6+):
- LRU 캐싱 추가 시 스크래핑 빈도 추가 감소
- 30일 TTL로 대부분 요청이 캐시 히트

### 2.3 Programmers 정책 (향후)

**Phase 6+ 계획**:
- BOJ와 동일한 3초 간격 적용
- Rate Limiter는 별도 인스턴스 생성 (플랫폼별 독립적 제한)

---

## 3. 아키텍처 설계

### 3.1 알고리즘 선택: Token Bucket

**비교 분석**:

| 알고리즘 | 장점 | 단점 | 적합성 |
|---------|------|------|--------|
| **Token Bucket** | • 버스트 트래픽 허용<br>• 구현 간단<br>• 메모리 효율적 | • 순간 부하 가능 | ✅ **최적** |
| Fixed Window | • 매우 간단 | • 윈도우 경계 부하 집중 | ❌ |
| Sliding Window | • 정밀한 제어 | • 복잡한 구현 | ❌ 과도한 엔지니어링 |
| Leaky Bucket | • 일정한 속도 보장 | • 버스트 불가 | ❌ 사용자 경험 저해 |

**Token Bucket 선택 이유**:
1. **버스트 허용**: 사용자가 여러 문제를 연속 조회할 수 있음 (최대 10개)
2. **간단함**: 100줄 미만의 코드로 구현 가능
3. **효율성**: O(1) 시간 복잡도, 최소 메모리 사용

### 3.2 Token Bucket 동작 원리

```
┌─────────────────────────────────────────┐
│       Token Bucket Algorithm            │
├─────────────────────────────────────────┤
│                                         │
│  Bucket Capacity: 10 tokens             │
│  Refill Rate: 10 tokens/sec             │
│                                         │
│  [🟢🟢🟢🟢🟢🟢🟢⚪⚪⚪]                    │
│   ↑                                     │
│   현재 7개 토큰 보유                     │
│                                         │
│  요청 1회 → 토큰 1개 소비                │
│  1초 경과 → 토큰 10개 충전               │
│  (최대 10개까지만 보유)                  │
│                                         │
└─────────────────────────────────────────┘
```

**의사코드**:
```typescript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;        // 10
    this.tokens = capacity;          // 초기값 10
    this.refillRate = refillRate;    // 10/sec
    this.lastRefillTime = Date.now();
  }

  async acquire() {
    // 1. 토큰 충전
    this.refill();

    // 2. 토큰 사용 가능 확인
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return; // 즉시 반환
    }

    // 3. 토큰 부족 시 대기
    const waitTime = this.calculateWaitTime(1);
    await sleep(waitTime);
    this.tokens -= 1;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000; // 초 단위
    const tokensToAdd = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }
}
```

### 3.3 아키텍처 구조

**옵션 분석**:

| 구조 | 설명 | 장점 | 단점 | 선택 |
|------|------|------|------|------|
| **Single Limiter** | 전역 1개 리미터 | 간단 | 모든 API 동일 제한 | ❌ |
| **Per-API Limiter** | API별 독립 리미터 | API마다 정책 다름 | 관리 복잡 | ❌ |
| **Per-Platform Limiter** | 플랫폼별 리미터 | 플랫폼별 정책 다름 | 균형적 복잡도 | ✅ **최적** |

**선택: Per-Platform Limiter**

**이유**:
- solved.ac, BOJ, Programmers는 각각 다른 Rate Limit 필요
- 하지만 같은 플랫폼 내 API는 동일한 제한 공유 (예: `searchProblems`, `getProblem` 모두 초당 10회)
- 확장 가능: 새 플랫폼 추가 시 리미터만 추가

**클래스 다이어그램**:

```
┌──────────────────────────────┐
│      RateLimiter             │
├──────────────────────────────┤
│ - capacity: number           │
│ - refillRate: number         │
│ - tokens: number             │
│ - lastRefillTime: number     │
├──────────────────────────────┤
│ + acquire(): Promise<void>   │
│ + tryAcquire(): boolean      │
│ - refill(): void             │
│ - calculateWaitTime(): number│
└──────────────────────────────┘
         ↑
         │ 싱글톤 인스턴스
         │
┌────────┴────────┐
│ solvedAcLimiter │  (export)
│ bojLimiter      │  (export, 향후)
│ programmersLimiter│ (export, 향후)
└─────────────────┘
```

### 3.4 Stateless vs Stateful

**MCP 서버 특성**:
- **서버 수명**: 장시간 실행 (Claude Desktop 재시작 전까지)
- **요청 특성**: 각 도구 호출은 독립적이지만, 서버 프로세스는 유지
- **상태 관리**: 가능 (싱글톤 패턴)

**결정**: **Stateful** (인메모리 상태 유지)

**근거**:
- MCP 서버는 프로세스가 계속 실행되므로 메모리 상태 안전
- 토큰 버킷은 시간에 따라 상태 변경 필요 (Stateless 불가능)
- Redis 등 외부 저장소 불필요 (단일 프로세스)

**다중 인스턴스 시나리오** (Phase 6+):
- 현재는 로컬 개발/개인 사용만 고려
- 향후 배포 시: Redis 기반 분산 Rate Limiter로 전환 가능

---

## 4. 에러 처리 전략

### 4.1 Rate Limit 도달 시 동작

**Scenario 1: 토큰 부족, 대기 가능**

```typescript
// 예: 토큰 0개, 0.1초 후 충전 예정
await limiter.acquire();
// → 0.1초 대기 후 자동으로 요청 진행
```

**사용자 경험**: 투명한 대기 (별도 메시지 없음)

**Scenario 2: 토큰 부족, 대기 시간 초과**

```typescript
// 예: 토큰 0개, 5초 이상 대기 필요
await limiter.acquire(); // maxWaitTime=5000ms
// → RateLimitError 발생
```

**에러 메시지**:
```json
{
  "error": "Rate limit exceeded",
  "message": "API 호출 횟수 제한에 도달했습니다. 5초 후 다시 시도해주세요.",
  "retryAfter": 5
}
```

**사용자 가이드**:
- Claude Code가 자동으로 재시도하거나 사용자에게 안내
- "잠시 후 다시 시도해주세요" 메시지

### 4.2 재시도 로직

**기존 재시도 로직 유지**:
```typescript
// src/api/solvedac-client.ts (현재 구현)
const MAX_RETRIES = 3;

// 네트워크 에러 시 재시도 (지수 백오프)
catch (error) {
  if (retries < MAX_RETRIES) {
    await delay(1000 * (retries + 1));
    return this.request(endpoint, params, retries + 1);
  }
}
```

**Rate Limit과의 조합**:
- Rate Limiter는 **재시도 전**에 실행
- Rate Limit 도달 시: 대기 후 정상 진행 (재시도 카운트 증가 안 함)
- 네트워크 에러 시: 재시도 로직 실행 (최대 3회)

**호출 순서**:
```
1. await limiter.acquire()       ← Rate Limiting
2. fetch(url)                    ← 실제 API 호출
3. if (network error) → retry    ← 재시도 로직
```

### 4.3 우아한 실패 (Graceful Degradation)

**Fallback 전략**:

| 상황 | Fallback | 사용자 경험 |
|------|----------|------------|
| Rate Limit 도달 | 5초 대기 후 자동 재시도 | 약간의 지연 |
| 네트워크 에러 | 3회 재시도 (지수 백오프) | 최대 7초 지연 |
| API 다운 | 에러 메시지 반환 | 명확한 안내 |
| 캐시 히트 | API 호출 생략 | 즉시 응답 |

**캐싱의 역할**:
- Rate Limiter의 부담 감소
- 캐시 히트 시 Rate Limiter 통과 불필요
- **전체 처리 속도**: 캐시 히트 < 100ms, 캐시 미스 200-500ms

---

## 5. 구현 세부 사항

### 5.1 파일 구조

```
src/
├── utils/
│   ├── rate-limiter.ts          # NEW: RateLimiter 클래스
│   └── cache.ts                 # EXISTING: 캐싱 (변경 없음)
├── api/
│   ├── solvedac-client.ts       # MODIFY: limiter.acquire() 추가
│   ├── boj-scraper.ts           # NO CHANGE: 이미 간격 제어
│   └── types.ts                 # MODIFY: RateLimitError 추가
└── index.ts                     # NO CHANGE
```

### 5.2 RateLimiter 클래스

**인터페이스**:
```typescript
export interface RateLimiterOptions {
  /** 버킷 최대 용량 */
  capacity: number;
  /** 토큰 충전 속도 (초당 토큰 수) */
  refillRate: number;
  /** 대기 시 최대 타임아웃 (밀리초) */
  maxWaitTime?: number;
}

export class RateLimiter {
  constructor(options: RateLimiterOptions);

  /**
   * 토큰 1개를 획득합니다. 토큰이 없으면 대기합니다.
   * @throws {RateLimitError} maxWaitTime 초과 시
   */
  acquire(): Promise<void>;

  /**
   * 토큰 획득을 시도합니다. 즉시 반환합니다.
   * @returns 성공 여부
   */
  tryAcquire(): boolean;

  /**
   * 현재 토큰 수를 반환합니다 (테스트/디버깅용)
   */
  getAvailableTokens(): number;
}
```

### 5.3 통합 방식

**SolvedAcClient 수정**:

```typescript
// src/api/solvedac-client.ts

import { solvedAcLimiter } from '../utils/rate-limiter.js';

export class SolvedAcClient {
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number> = {},
    retries = 0
  ): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    // ... (쿼리 파라미터 추가 생략)

    // 캐시 확인
    const cached = this.getCached<T>(cacheKey);
    if (cached !== null) {
      return cached; // Rate Limiter 통과 안 함 (캐시 히트)
    }

    // ✨ NEW: Rate Limiting 적용
    await solvedAcLimiter.acquire();

    try {
      // ... (기존 fetch 로직)
    } catch (error) {
      // ... (기존 에러 처리)
    }
  }
}
```

**특징**:
- 캐시 히트 시 Rate Limiter 우회
- Rate Limiter는 실제 API 호출 직전에만 실행
- 기존 에러 처리 로직 유지

### 5.4 에러 타입 추가

```typescript
// src/api/types.ts

export class RateLimitError extends Error {
  constructor(
    public retryAfter?: number, // 초 단위
    message = 'Rate limit exceeded'
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

---

## 6. 모니터링 & 로깅

### 6.1 추적할 메트릭

**Rate Limiter 메트릭**:

| 메트릭 | 설명 | 로그 레벨 | Phase |
|--------|------|----------|-------|
| `rate_limit_wait` | 대기 발생 (>100ms) | info | Phase 4.2 |
| `rate_limit_timeout` | 대기 시간 초과 | warn | Phase 4.2 |
| `rate_limit_tokens` | 현재 토큰 수 | debug | Phase 4.3 |
| `rate_limit_acquire_duration` | 획득 소요 시간 | debug | Phase 4.3 |

**Phase 4.2 구현 범위**: `rate_limit_wait`, `rate_limit_timeout` 로깅

**Phase 4.3 확장**: Winston 로거와 통합, 메트릭 집계

### 6.2 로그 예시

**정상 동작**:
```typescript
// 로그 없음 (즉시 토큰 획득)
```

**대기 발생**:
```typescript
console.info('[RateLimiter] Waiting 150ms for token...');
```

**타임아웃**:
```typescript
console.warn('[RateLimiter] Wait timeout exceeded (5000ms)');
// RateLimitError 발생
```

### 6.3 운영 대시보드 (Phase 4.3+)

**메트릭 집계**:
```typescript
interface RateLimiterStats {
  totalAcquires: number;           // 총 토큰 획득 횟수
  totalWaits: number;              // 대기 발생 횟수
  totalTimeouts: number;           // 타임아웃 발생 횟수
  averageWaitTime: number;         // 평균 대기 시간 (ms)
  currentTokens: number;           // 현재 토큰 수
}
```

**알림 조건** (향후):
- 타임아웃 발생 시: 관리자 알림
- 대기율 50% 초과 시: 정책 검토 필요

---

## 7. Phase 4.2 구현 계획

### 7.1 구현 범위

**Phase 4.2에서 구현할 항목**:
- ✅ RateLimiter 클래스 (Token Bucket 알고리즘)
- ✅ solvedAcLimiter 싱글톤 인스턴스
- ✅ SolvedAcClient 통합
- ✅ 기본 로깅 (console.info/warn)
- ✅ 단위 테스트 (5개 이상)
- ✅ 통합 테스트 (부하 테스트 포함)

**Phase 4.3으로 이연**:
- ⏸️ Winston 로거 통합
- ⏸️ 메트릭 집계 시스템
- ⏸️ 운영 대시보드

### 7.2 단계별 구현 순서

**Day 1: Core Implementation (4시간)**
1. `src/utils/rate-limiter.ts` 생성 (2시간)
   - RateLimiter 클래스
   - acquire(), tryAcquire() 메서드
   - refill() 로직
2. `src/api/types.ts` 수정 (30분)
   - RateLimitError 클래스 추가
3. `src/api/solvedac-client.ts` 통합 (1시간)
   - limiter.acquire() 추가 (1줄)
   - 테스트

**Day 2: Testing (4시간)**
1. 단위 테스트 (2시간)
   - Token Bucket 동작 검증
   - 대기 시간 계산
   - 타임아웃 처리
2. 통합 테스트 (1.5시간)
   - SolvedAcClient 통합 확인
   - 부하 테스트 (초당 20회 요청)
3. 문서 업데이트 (30분)
   - tasks.md 업데이트
   - CLAUDE.md 업데이트

**총 예상 소요 시간**: 1일 (8시간)

### 7.3 테스트 계획

**단위 테스트 (`tests/utils/rate-limiter.test.ts`)**:

```typescript
describe('RateLimiter', () => {
  it('should allow immediate acquire when tokens available', async () => {
    const limiter = new RateLimiter({ capacity: 10, refillRate: 10 });
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(10); // 즉시 반환
  });

  it('should wait when no tokens available', async () => {
    const limiter = new RateLimiter({ capacity: 1, refillRate: 10 });

    // 첫 번째 토큰 소비
    await limiter.acquire();

    // 두 번째 요청은 대기해야 함
    const start = Date.now();
    await limiter.acquire();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(100); // 최소 0.1초 대기
  });

  it('should refill tokens over time', async () => {
    const limiter = new RateLimiter({ capacity: 5, refillRate: 10 });

    // 5개 토큰 모두 소비
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }

    // 0.5초 대기 → 5개 토큰 충전
    await sleep(500);

    // 5개 토큰 즉시 사용 가능
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await limiter.acquire();
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(10);
    }
  });

  it('should throw RateLimitError on timeout', async () => {
    const limiter = new RateLimiter({
      capacity: 1,
      refillRate: 0.1, // 초당 0.1개 (10초에 1개)
      maxWaitTime: 100
    });

    await limiter.acquire(); // 첫 토큰 소비

    // 두 번째 요청은 타임아웃
    await expect(limiter.acquire()).rejects.toThrow(RateLimitError);
  });

  it('should respect capacity limit', async () => {
    const limiter = new RateLimiter({ capacity: 3, refillRate: 100 });

    // 10초 대기 → 1000개 토큰 충전 시도
    await sleep(10000);

    // 하지만 최대 3개까지만 보유
    expect(limiter.getAvailableTokens()).toBe(3);
  });
});
```

**통합 테스트 (`tests/api/solvedac-client-rate-limit.test.ts`)**:

```typescript
describe('SolvedAcClient Rate Limiting', () => {
  it('should limit concurrent requests', async () => {
    const client = new SolvedAcClient();

    // 20개 요청 동시 발생
    const promises = Array.from({ length: 20 }, (_, i) =>
      client.getProblem(1000 + i)
    );

    const start = Date.now();
    await Promise.all(promises);
    const elapsed = Date.now() - start;

    // 초당 10회 제한 → 최소 1초 소요 예상
    expect(elapsed).toBeGreaterThanOrEqual(1000);
  });

  it('should not apply rate limit to cached requests', async () => {
    const client = new SolvedAcClient();

    // 첫 요청 (캐시 미스)
    await client.getProblem(1000);

    // 두 번째 요청 (캐시 히트)
    const start = Date.now();
    await client.getProblem(1000);
    const elapsed = Date.now() - start;

    // 캐시 히트는 Rate Limiter 통과 안 함 → 즉시 반환
    expect(elapsed).toBeLessThan(10);
  });
});
```

### 7.4 인수 조건 (Acceptance Criteria)

**기능 요구사항**:
- ✅ RateLimiter 클래스가 Token Bucket 알고리즘 정확히 구현
- ✅ 초당 10회 제한이 정상 작동
- ✅ 대기 시간 초과 시 RateLimitError 발생
- ✅ 캐시 히트 시 Rate Limiter 우회

**성능 요구사항**:
- ✅ 토큰 획득 오버헤드 < 1ms (즉시 획득 시)
- ✅ 대기 시간 정확도 ±10ms

**테스트 요구사항**:
- ✅ 단위 테스트 5개 이상 통과
- ✅ 통합 테스트 2개 이상 통과
- ✅ 부하 테스트 통과 (초당 20회 요청)

**문서 요구사항**:
- ✅ tasks.md 업데이트 (Task 4.2 완료)
- ✅ CLAUDE.md 업데이트 (Rate Limiting 언급)

---

## 8. 향후 확장 계획

### 8.1 BOJ 스크래핑 통합 (Phase 6+)

**현재 상태**:
```typescript
// src/api/boj-scraper.ts
private async _ensureRequestInterval() {
  // 3초 간격 보장
}
```

**Phase 6 통합**:
```typescript
// RateLimiter를 사용하여 간격 제어 통일
export const bojLimiter = new RateLimiter({
  capacity: 1,
  refillRate: 0.33, // 3초에 1회 (1/3 = 0.33)
});

// BOJScraper 수정
await bojLimiter.acquire();
const html = await this._fetchWithTimeout(url);
```

**장점**:
- 간격 제어 로직 통일
- 모니터링 메트릭 통합

### 8.2 Programmers 추가 (Phase 7+)

**새 리미터 인스턴스**:
```typescript
export const programmersLimiter = new RateLimiter({
  capacity: 1,
  refillRate: 0.33, // 3초에 1회
});
```

**클라이언트 통합**:
```typescript
// src/api/programmers-scraper.ts
await programmersLimiter.acquire();
const html = await fetch(url);
```

### 8.3 다중 사용자/배포 시나리오

**현재 제한**:
- 단일 MCP 서버 인스턴스만 고려
- 인메모리 상태 (프로세스 재시작 시 초기화)

**Phase 8+ 개선**:
```typescript
// Redis 기반 분산 Rate Limiter
import { RedisRateLimiter } from './redis-rate-limiter.js';

export const solvedAcLimiter = new RedisRateLimiter({
  key: 'solvedac',
  capacity: 10,
  refillRate: 10,
  redis: redisClient,
});
```

**변경 사항**:
- RateLimiter 인터페이스 유지
- 구현만 Redis 기반으로 교체
- 기존 코드 변경 최소화

---

## 9. 결론

### 9.1 핵심 결정 요약

| 항목 | 결정 | 근거 |
|------|------|------|
| **알고리즘** | Token Bucket | 버스트 허용, 간단한 구현 |
| **정책** | 초당 10회 (solved.ac) | 보수적, API 차단 위험 최소화 |
| **구조** | Per-Platform Limiter | 플랫폼별 독립적 정책 |
| **상태 관리** | Stateful (인메모리) | MCP 서버는 장시간 실행 |
| **구현 범위** | solved.ac만 (Phase 4.2) | 우선순위 P0, 1일 구현 |

### 9.2 예상 효과

**안정성 향상**:
- API 차단 위험 제거 (초당 10회 제한)
- 예측 가능한 응답 시간

**사용자 경험**:
- 투명한 대기 (최대 5초)
- 캐시 히트 시 즉시 응답 (Rate Limiter 우회)

**확장성**:
- 새 플랫폼 추가 용이 (리미터 인스턴스만 추가)
- 향후 분산 환경 전환 가능 (Redis)

### 9.3 Next Steps

1. **Phase 4.2 구현 시작**: 이 설계서를 바탕으로 fullstack-developer에게 위임
2. **Phase 4.3 준비**: Winston 로거 통합 계획 수립
3. **Phase 4.4 병렬 진행**: LRU 캐싱 최적화 (독립적 작업)

---

**설계 승인 대기 중**
다음 단계: 사용자 승인 후 구현 전략 수립 (Task #2)
