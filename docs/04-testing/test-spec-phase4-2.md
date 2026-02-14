# Rate Limiting 테스트 스펙

**작성일**: 2026-02-15
**Phase**: Phase 4 - Task 4.2
**작성자**: project-planner
**기반 문서**:
- `docs/01-planning/rate-limiting-design.md`
- `docs/02-development/rate-limiting-implementation.md`

---

## 1. 테스트 개요

### 1.1 목표

Rate Limiting 구현의 정확성과 안정성을 검증하기 위한 테스트 스펙 정의

### 1.2 테스트 범위

| 테스트 유형 | 파일 | 테스트 수 | 우선순위 |
|------------|------|----------|---------|
| **단위 테스트** | `tests/utils/rate-limiter.test.ts` | 14개 | P0 |
| **통합 테스트** | `tests/api/solvedac-client-rate-limit.test.ts` | 8개 | P0 |
| **성능 테스트** | 통합 테스트에 포함 | 2개 | P1 |

**총 테스트 케이스**: 22개

### 1.3 테스트 환경

- **테스트 프레임워크**: vitest 4.0.18
- **타임아웃 설정**: 15000ms (부하 테스트용)
- **정확도 허용 오차**: ±10ms (시간 기반 테스트)

---

## 2. 단위 테스트 스펙 (tests/utils/rate-limiter.test.ts)

### Test Suite 1: Token Bucket 기본 동작

#### Test-1.1: 토큰 사용 가능 시 즉시 획득

**설명**: 버킷에 토큰이 있으면 즉시 반환

**입력 (Arrange)**:
- 버킷 설정: capacity=10, refillRate=10
- 초기 상태: 토큰 10개 (버킷 가득 참)

**실행 (Act)**:
```typescript
await limiter.acquire();
```

**검증 (Assert)**:
- 반환 시간: < 10ms
- 남은 토큰: 9개

**성공 기준**:
- Promise가 즉시 resolve
- 토큰 1개 정확히 소비

**실패 조건**:
- 10ms 이상 대기
- 토큰 수 부정확

---

#### Test-1.2: 토큰 소비 정확성

**설명**: acquire() 호출 시 토큰이 정확히 1개씩 소비됨

**입력 (Arrange)**:
- 버킷 설정: capacity=5, refillRate=10
- 초기 토큰: 5개

**실행 (Act)**:
```typescript
for (let i = 0; i < 5; i++) {
  await limiter.acquire();
}
```

**검증 (Assert)**:
- 최종 토큰: 0개
- 모든 acquire() 성공

**성공 기준**:
- 5회 호출 후 토큰 정확히 0개

**실패 조건**:
- 토큰 수 불일치 (< 0 또는 > 0)

---

#### Test-1.3: 시간 경과에 따른 토큰 충전

**설명**: refillRate에 따라 토큰이 자동으로 충전됨

**입력 (Arrange)**:
- 버킷 설정: capacity=10, refillRate=10 (초당 10개)
- 초기 상태: 토큰 10개
- 동작: 10개 모두 소비 후 0.5초 대기

**실행 (Act)**:
```typescript
// 10개 소비
for (let i = 0; i < 10; i++) await limiter.acquire();

// 0.5초 대기
await sleep(500);

// 충전된 토큰 확인
const tokens = limiter.getAvailableTokens();
```

**검증 (Assert)**:
- 충전된 토큰: 약 5개 (0.5초 × 10개/초 = 5개)
- 허용 오차: ±0.5개

**성공 기준**:
- `toBeCloseTo(5, 0)` 통과

**실패 조건**:
- 토큰 수가 4개 미만 또는 6개 초과

---

#### Test-1.4: 버킷 용량 제한

**설명**: 충전 시 최대 capacity까지만 보유

**입력 (Arrange)**:
- 버킷 설정: capacity=3, refillRate=100 (초당 100개)
- 동작: 10초 대기 (이론상 1000개 충전)

**실행 (Act)**:
```typescript
await sleep(10000);
const tokens = limiter.getAvailableTokens();
```

**검증 (Assert)**:
- 토큰 수: 정확히 3개 (capacity 제한)

**성공 기준**:
- tokens === 3

**실패 조건**:
- tokens > 3 (버킷 오버플로우)

---

### Test Suite 2: 대기 (Waiting)

#### Test-2.1: 토큰 부족 시 대기

**설명**: 토큰이 없으면 충전될 때까지 대기

**입력 (Arrange)**:
- 버킷 설정: capacity=1, refillRate=10
- 초기 토큰: 1개
- 동작: 첫 번째 토큰 소비

**실행 (Act)**:
```typescript
await limiter.acquire(); // 첫 토큰 소비 (남은 토큰: 0)

const start = Date.now();
await limiter.acquire(); // 두 번째 요청 (대기 필요)
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 대기 시간: 90-150ms
- 두 번째 acquire() 성공

**성공 기준**:
- elapsed >= 90ms && elapsed < 150ms
- 예상 대기 시간: 100ms (1개 / 10개/초 = 0.1초)

**실패 조건**:
- elapsed < 90ms (대기 안 함)
- elapsed >= 150ms (과도한 대기)

---

#### Test-2.2: 다중 대기자 처리

**설명**: 여러 acquire() 호출이 동시에 대기할 때 순차적으로 처리

**입력 (Arrange)**:
- 버킷 설정: capacity=2, refillRate=10
- 초기 동작: 2개 토큰 모두 소비

**실행 (Act)**:
```typescript
await limiter.acquire();
await limiter.acquire(); // 토큰 0개 상태

// 3개 요청 동시 발생
const promises = [
  limiter.acquire(), // 0.1초 대기
  limiter.acquire(), // 0.2초 대기
  limiter.acquire(), // 0.3초 대기
];

const start = Date.now();
await Promise.all(promises);
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 총 대기 시간: 250-400ms
- 모든 Promise 성공

**성공 기준**:
- elapsed >= 250ms && elapsed < 400ms
- 3개 토큰 충전 시간: 0.3초

**실패 조건**:
- 일부 Promise reject
- elapsed < 250ms 또는 >= 400ms

---

### Test Suite 3: 타임아웃

#### Test-3.1: maxWaitTime 초과 시 에러

**설명**: 대기 시간이 maxWaitTime을 초과하면 RateLimitError 발생

**입력 (Arrange)**:
- 버킷 설정:
  - capacity=1
  - refillRate=0.1 (초당 0.1개 = 10초에 1개)
  - maxWaitTime=100ms
- 초기 동작: 첫 토큰 소비

**실행 (Act)**:
```typescript
await limiter.acquire(); // 첫 토큰 소비

// 두 번째 요청 (10초 대기 필요 > 100ms maxWaitTime)
await limiter.acquire();
```

**검증 (Assert)**:
- 에러 타입: RateLimitError
- 에러 메시지: "Rate limit wait time ... exceeds max wait time"

**성공 기준**:
- RateLimitError가 throw됨
- Promise reject

**실패 조건**:
- 에러가 발생하지 않음
- 다른 타입의 에러 발생

---

#### Test-3.2: retryAfter 정보 포함

**설명**: RateLimitError에 재시도 가능 시간(초) 포함

**입력 (Arrange)**:
- 버킷 설정: capacity=1, refillRate=0.5 (2초에 1개), maxWaitTime=100ms
- 초기 동작: 첫 토큰 소비

**실행 (Act)**:
```typescript
await limiter.acquire();

try {
  await limiter.acquire();
} catch (error) {
  // 에러 검증
}
```

**검증 (Assert)**:
- error.retryAfter: > 0
- error.retryAfter: 대략 2초 (1개 / 0.5개/초 = 2초)

**성공 기준**:
- retryAfter 필드 존재
- retryAfter 값이 합리적 (1-3초)

**실패 조건**:
- retryAfter 없음
- retryAfter <= 0

---

#### Test-3.3: 타임아웃 전 완료

**설명**: 대기 시간이 maxWaitTime 이내면 정상 처리

**입력 (Arrange)**:
- 버킷 설정: capacity=1, refillRate=10, maxWaitTime=5000ms
- 초기 동작: 첫 토큰 소비

**실행 (Act)**:
```typescript
await limiter.acquire(); // 첫 토큰 소비

const start = Date.now();
await limiter.acquire(); // 100ms 대기 (< 5000ms)
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 대기 시간: 90-150ms
- 에러 발생 안 함

**성공 기준**:
- Promise resolve
- elapsed < 5000ms

**실패 조건**:
- RateLimitError 발생

---

### Test Suite 4: tryAcquire()

#### Test-4.1: 토큰 사용 가능 시 true 반환

**설명**: tryAcquire()는 토큰이 있으면 즉시 true 반환

**입력 (Arrange)**:
- 버킷 설정: capacity=5, refillRate=10
- 초기 토큰: 5개

**실행 (Act)**:
```typescript
const result = limiter.tryAcquire();
```

**검증 (Assert)**:
- 반환값: true
- 남은 토큰: 4개

**성공 기준**:
- result === true
- 토큰 1개 소비

**실패 조건**:
- result === false
- 토큰 수 변화 없음

---

#### Test-4.2: 토큰 부족 시 false 반환

**설명**: tryAcquire()는 토큰이 없으면 즉시 false 반환 (대기 안 함)

**입력 (Arrange)**:
- 버킷 설정: capacity=1, refillRate=10
- 초기 동작: 첫 토큰 소비 (남은 토큰: 0)

**실행 (Act)**:
```typescript
limiter.tryAcquire(); // 첫 토큰 소비
const result = limiter.tryAcquire(); // 두 번째 시도
```

**검증 (Assert)**:
- 반환값: false
- 남은 토큰: 0개
- 반환 시간: < 10ms (즉시)

**성공 기준**:
- result === false
- 대기 없음

**실패 조건**:
- result === true
- 대기 발생

---

#### Test-4.3: 대기 없음 검증

**설명**: tryAcquire()는 절대 대기하지 않음

**입력 (Arrange)**:
- 버킷 설정: capacity=1, refillRate=0.1 (10초에 1개)
- 초기 동작: 토큰 소비

**실행 (Act)**:
```typescript
limiter.tryAcquire(); // 토큰 소비

const start = Date.now();
const result = limiter.tryAcquire(); // 즉시 반환 예상
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 반환 시간: < 10ms
- 반환값: false

**성공 기준**:
- elapsed < 10ms
- 동기적 반환

**실패 조건**:
- elapsed >= 10ms (대기 발생)

---

### Test Suite 5: 엣지 케이스

#### Test-5.1: 고속 충전 속도

**설명**: 매우 빠른 refillRate 처리

**입력 (Arrange)**:
- 버킷 설정: capacity=100, refillRate=1000 (초당 1000개)
- 초기 동작: 100개 모두 소비 후 0.1초 대기

**실행 (Act)**:
```typescript
for (let i = 0; i < 100; i++) await limiter.acquire();

await sleep(100); // 0.1초
const tokens = limiter.getAvailableTokens();
```

**검증 (Assert)**:
- 충전된 토큰: 약 100개
- 허용 오차: ±10개

**성공 기준**:
- tokens >= 90 && tokens <= 100

**실패 조건**:
- tokens < 90 (충전 부족)

---

#### Test-5.2: 분수(fractional) 토큰

**설명**: refillRate가 정수가 아닐 때 정확히 계산

**입력 (Arrange)**:
- 버킷 설정: capacity=10, refillRate=3.5 (초당 3.5개)
- 초기 동작: 10개 소비 후 1초 대기

**실행 (Act)**:
```typescript
for (let i = 0; i < 10; i++) await limiter.acquire();

await sleep(1000);
const tokens = limiter.getAvailableTokens();
```

**검증 (Assert)**:
- 충전된 토큰: 약 3.5개
- 허용 오차: ±0.5개

**성공 기준**:
- tokens >= 3.0 && tokens <= 4.0

**실패 조건**:
- tokens < 3.0 또는 > 4.0

---

#### Test-5.3: 0 용량 버킷

**설명**: capacity=0일 때 항상 토큰 부족

**입력 (Arrange)**:
- 버킷 설정: capacity=0, refillRate=10

**실행 (Act)**:
```typescript
const limiter = new RateLimiter({ capacity: 0, refillRate: 10 });
const result = limiter.tryAcquire();
```

**검증 (Assert)**:
- 반환값: false (항상 실패)
- 토큰 수: 0개

**성공 기준**:
- 생성 시 에러 없음
- tryAcquire() 항상 false

**실패 조건**:
- 생성 시 에러 발생

---

### Test Suite 6: 싱글톤 (Singleton)

#### Test-6.1: 동일 인스턴스 사용

**설명**: solvedAcLimiter가 전역 싱글톤임

**입력 (Arrange)**:
```typescript
import { solvedAcLimiter as limiter1 } from '../../src/utils/rate-limiter.js';
import { solvedAcLimiter as limiter2 } from '../../src/utils/rate-limiter.js';
```

**실행 (Act)**:
```typescript
limiter1.tryAcquire();
const tokens = limiter2.getAvailableTokens();
```

**검증 (Assert)**:
- limiter1 === limiter2 (동일 참조)
- 상태 공유 (limiter1의 토큰 소비가 limiter2에 반영)

**성공 기준**:
- tokens === 9 (limiter1에서 1개 소비)

**실패 조건**:
- 별도 인스턴스 (tokens === 10)

---

## 3. 통합 테스트 스펙 (tests/api/solvedac-client-rate-limit.test.ts)

### Test Suite 7: SolvedAcClient 통합

#### Test-7.1: API 요청에 Rate Limiting 적용

**설명**: 실제 API 호출 시 초당 10회 제한 적용

**입력 (Arrange)**:
- SolvedAcClient 인스턴스 생성
- 캐시 초기화 (모든 요청이 API 호출)

**실행 (Act)**:
```typescript
const promises = Array.from({ length: 20 }, (_, i) =>
  client.getProblem(1000 + i) // 서로 다른 문제
);

const start = Date.now();
await Promise.all(promises);
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 소요 시간: >= 1000ms (20개 / 10개/초 = 2초, 버스트 고려 최소 1초)
- 모든 요청 성공

**성공 기준**:
- elapsed >= 1000ms
- results.length === 20

**실패 조건**:
- elapsed < 1000ms (Rate Limiting 미적용)
- 일부 요청 실패

---

#### Test-7.2: 캐시 히트 시 Rate Limiter 우회

**설명**: 캐시된 데이터는 Rate Limiter를 통과하지 않음

**입력 (Arrange)**:
- 첫 요청으로 캐시 생성

**실행 (Act)**:
```typescript
await client.getProblem(1000); // 첫 요청 (캐시 미스)

const start = Date.now();
await client.getProblem(1000); // 두 번째 요청 (캐시 히트)
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 반환 시간: < 10ms (즉시)
- Rate Limiter 호출 안 됨

**성공 기준**:
- elapsed < 10ms

**실패 조건**:
- elapsed >= 10ms (Rate Limiter 통과)

---

#### Test-7.3: 여러 메서드 혼용 시 Rate Limit 공유

**설명**: searchProblems, getProblem, searchTags 모두 동일한 Rate Limiter 사용

**입력 (Arrange)**:
- 다양한 API 메서드 호출

**실행 (Act)**:
```typescript
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
```

**검증 (Assert)**:
- 소요 시간: < 100ms (5개 요청 모두 버스트로 처리)
- 모든 요청 성공

**성공 기준**:
- elapsed < 100ms
- 5개 요청 즉시 처리 (버킷 용량 10개)

**실패 조건**:
- elapsed >= 100ms (불필요한 대기)

---

#### Test-7.4: Rate Limit 대기 후 복구

**설명**: 토큰 소진 후 대기하고 정상 복구

**입력 (Arrange)**:
- 10개 요청으로 토큰 소진

**실행 (Act)**:
```typescript
// 10개 토큰 소비
for (let i = 0; i < 10; i++) {
  await client.getProblem(1000 + i);
}

// 11번째 요청 (대기 필요)
const start = Date.now();
await client.getProblem(2000);
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 대기 시간: 90-200ms
- 요청 성공

**성공 기준**:
- elapsed >= 90ms && elapsed < 200ms
- 응답 정상

**실패 조건**:
- 에러 발생
- 대기 없음 (elapsed < 90ms)

---

### Test Suite 8: 성능 테스트

#### Test-8.1: 100개 동시 요청 부하 테스트

**설명**: 대량 요청 시 안정적 처리

**입력 (Arrange)**:
- 100개 서로 다른 문제 요청

**실행 (Act)**:
```typescript
const promises = Array.from({ length: 100 }, (_, i) =>
  client.getProblem(1000 + i)
);

const start = Date.now();
await Promise.all(promises);
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 소요 시간: 9000-12000ms (100개 / 10개/초 = 10초, 버스트 고려)
- 모든 요청 성공

**성공 기준**:
- elapsed >= 9000ms && elapsed < 12000ms
- 메모리 안정적
- 에러 없음

**실패 조건**:
- 타임아웃
- 메모리 누수
- 일부 요청 실패

---

#### Test-8.2: 지속적 부하 테스트

**설명**: 일정 시간 동안 지속적으로 요청 발생 시 Rate Limit 유지

**입력 (Arrange)**:
- 5초간 연속 요청

**실행 (Act)**:
```typescript
const endTime = Date.now() + 5000;
let count = 0;

while (Date.now() < endTime) {
  await client.getProblem(1000 + count);
  count++;
}
```

**검증 (Assert)**:
- 총 요청 수: 45-55개 (5초 × 10개/초 = 50개, 오차 허용)
- 에러 없음

**성공 기준**:
- count >= 45 && count <= 55

**실패 조건**:
- count > 55 (Rate Limiting 미작동)
- count < 45 (과도한 제한)

---

### Test Suite 9: 캐싱과의 조합

#### Test-9.1: 캐시로 Rate Limit 압력 감소

**설명**: 동일 문제 반복 요청 시 캐시 효과

**입력 (Arrange)**:
- 동일 문제 10번 요청

**실행 (Act)**:
```typescript
const promises = Array.from({ length: 10 }, () =>
  client.getProblem(1000) // 동일 문제
);

const start = Date.now();
await Promise.all(promises);
const elapsed = Date.now() - start;
```

**검증 (Assert)**:
- 소요 시간: < 100ms (첫 요청만 API, 나머지 캐시)
- 모든 요청 성공

**성공 기준**:
- elapsed < 100ms

**실패 조건**:
- elapsed >= 100ms (캐시 미작동)

---

#### Test-9.2: Rate Limiter 호출 횟수 검증

**설명**: 캐시 히트 시 Rate Limiter를 호출하지 않음

**입력 (Arrange)**:
- Rate Limiter spy 설정

**실행 (Act)**:
```typescript
const spy = vi.spyOn(solvedAcLimiter, 'acquire');

await client.getProblem(1000); // 첫 요청 (캐시 미스)
expect(spy).toHaveBeenCalledTimes(1);

await client.getProblem(1000); // 두 번째 요청 (캐시 히트)
expect(spy).toHaveBeenCalledTimes(1); // 여전히 1회
```

**검증 (Assert)**:
- acquire() 호출 횟수: 1회 (캐시 미스만)

**성공 기준**:
- spy.mock.calls.length === 1

**실패 조건**:
- spy.mock.calls.length > 1 (캐시 히트에도 호출)

---

## 4. 테스트 실행 계획

### 4.1 단위 테스트 실행

**명령어**:
```bash
npm test tests/utils/rate-limiter.test.ts
```

**예상 소요 시간**: 약 20초 (시간 기반 테스트 포함)

**성공 기준**:
- 14개 테스트 모두 통과
- 에러 없음

---

### 4.2 통합 테스트 실행

**명령어**:
```bash
npm test tests/api/solvedac-client-rate-limit.test.ts
```

**예상 소요 시간**: 약 30초 (부하 테스트 포함)

**타임아웃 설정**:
```typescript
// vitest.config.ts
export default {
  test: {
    testTimeout: 15000, // 15초
  },
};
```

**성공 기준**:
- 8개 테스트 모두 통과
- 메모리 안정적

---

### 4.3 전체 테스트 실행

**명령어**:
```bash
npm test
```

**확인 사항**:
- Rate Limiting 테스트 22개 통과
- 기존 테스트 영향 없음
- 전체 테스트 스위트 통과

---

### 4.4 커버리지 확인

**명령어**:
```bash
npm test -- --coverage
```

**목표 커버리지**:
- RateLimiter 클래스: 90% 이상
- SolvedAcClient 수정 부분: 100%

---

## 5. 성능 기준

### 5.1 응답 시간

| 시나리오 | 목표 | 허용 오차 |
|---------|------|----------|
| 토큰 사용 가능 (즉시) | < 10ms | ±5ms |
| 토큰 대기 (0.1초) | 100ms | ±10ms |
| 캐시 히트 | < 10ms | ±5ms |
| 캐시 미스 (Rate Limit 대기 없음) | 200-500ms | ±100ms |

---

### 5.2 메모리 사용

**기준**:
- RateLimiter 인스턴스: < 1KB
- 100개 요청 처리 시 메모리 증가: < 10MB

**검증 방법**:
```typescript
const before = process.memoryUsage().heapUsed;

// 100개 요청 처리
await Promise.all(promises);

const after = process.memoryUsage().heapUsed;
const increase = (after - before) / 1024 / 1024; // MB

expect(increase).toBeLessThan(10);
```

---

### 5.3 정확도

**시간 계산 정확도**:
- 대기 시간 계산: ±10ms
- 토큰 충전 계산: ±0.5개 (분수 토큰)

**허용 오차 이유**:
- OS 스케줄링 지연
- JavaScript 타이머 정확도 제한

---

## 6. 엣지 케이스 및 예외 상황

### 6.1 동시성 (Concurrency)

**시나리오**: 여러 acquire() 동시 호출

**테스트 방법**:
```typescript
const promises = Array.from({ length: 20 }, () => limiter.acquire());
await Promise.all(promises);
```

**예상 동작**:
- 순차적 대기 (FIFO)
- 토큰 충돌 없음

---

### 6.2 시간 역행 (Time Regression)

**시나리오**: 시스템 시간이 과거로 변경

**예상 동작**:
- `Date.now()` 기반이므로 영향 받음
- 하지만 실제 운영에서 발생 가능성 낮음
- Phase 4.2에서는 무시

---

### 6.3 대량 토큰 소비

**시나리오**: 매우 빠른 속도로 토큰 소비

**테스트**:
```typescript
for (let i = 0; i < 1000; i++) {
  limiter.tryAcquire();
}
```

**예상 동작**:
- 메모리 안정적
- 성능 저하 없음

---

## 7. 트러블슈팅 가이드

### 7.1 테스트 실패 시나리오

#### 문제 1: 시간 기반 테스트 불안정

**증상**:
```
Expected 100ms, but got 95ms
```

**원인**: OS 스케줄링 지연

**해결**:
```typescript
// 오차 범위 넓히기
expect(elapsed).toBeGreaterThanOrEqual(90); // -10ms 허용
expect(elapsed).toBeLessThan(150); // +50ms 허용
```

---

#### 문제 2: 부하 테스트 타임아웃

**증상**:
```
Error: Test timeout exceeded (5000ms)
```

**원인**: 부하 테스트가 예상보다 오래 걸림

**해결**:
```typescript
// vitest.config.ts
testTimeout: 15000, // 15초로 증가
```

---

#### 문제 3: 캐시 간섭

**증상**:
```
Expected 1 acquire call, but got 2
```

**원인**: 이전 테스트의 캐시가 남아있음

**해결**:
```typescript
beforeEach(() => {
  client.clearCache(); // 각 테스트 전 캐시 초기화
});
```

---

### 7.2 성능 이슈

#### 문제: 토큰 획득 오버헤드 > 1ms

**진단 방법**:
```typescript
const start = Date.now();
for (let i = 0; i < 1000; i++) {
  limiter.tryAcquire();
}
const elapsed = Date.now() - start;
console.log(`Average: ${elapsed / 1000}ms per call`);
```

**목표**: < 0.001ms per call

**최적화**:
- refill() 호출 최소화
- 불필요한 Date.now() 제거

---

## 8. 인수 조건 (Acceptance Criteria)

### 8.1 기능 요구사항

- ✅ Token Bucket 알고리즘 정확히 구현
- ✅ acquire() 대기 동작 정확
- ✅ tryAcquire() 즉시 반환
- ✅ 토큰 충전 정확성
- ✅ 버킷 용량 제한 준수
- ✅ maxWaitTime 타임아웃 처리
- ✅ RateLimitError 정확한 정보 포함

---

### 8.2 통합 요구사항

- ✅ SolvedAcClient와 정상 통합
- ✅ 캐시 히트 시 Rate Limiter 우회
- ✅ 초당 10회 제한 정확
- ✅ 여러 메서드 간 Rate Limit 공유

---

### 8.3 성능 요구사항

- ✅ 토큰 획득 오버헤드: < 1ms
- ✅ 대기 시간 정확도: ±10ms
- ✅ 메모리 사용: 안정적
- ✅ 100개 요청 처리: 에러 없음

---

### 8.4 테스트 요구사항

- ✅ 단위 테스트: 14개 통과
- ✅ 통합 테스트: 8개 통과
- ✅ 전체 테스트 스위트: 모두 통과
- ✅ 커버리지: RateLimiter 90% 이상

---

## 9. 다음 단계

### 9.1 테스트 구현

**Phase 2: TDD 구현**
1. 🔴 Red: 테스트 작성 (qa-testing-agent)
2. 🟢 Green: 구현 (fullstack-developer)
3. 🔵 Refactor: 개선 (fullstack-developer)

---

### 9.2 문서 업데이트

**완료 후**:
- `docs/03-project-management/tasks.md` 업데이트
- `CLAUDE.md` Phase 4 진행 상황 반영

---

### 9.3 다음 Task

**Task 4.3**: 로깅/모니터링 (Rate Limiter 메트릭 추가)
**Task 4.4**: LRU 캐싱 (캐시 효율 극대화)

---

## 10. 요약

### 10.1 테스트 구조

```
tests/utils/rate-limiter.test.ts (14개)
├── Token Bucket 기본 동작 (4개)
├── 대기 (2개)
├── 타임아웃 (3개)
├── tryAcquire() (3개)
├── 엣지 케이스 (3개)
└── 싱글톤 (1개)

tests/api/solvedac-client-rate-limit.test.ts (8개)
├── SolvedAcClient 통합 (4개)
├── 성능 테스트 (2개)
└── 캐싱 조합 (2개)
```

---

### 10.2 핵심 검증 항목

1. **정확성**: Token Bucket 알고리즘 정확히 구현
2. **안정성**: 대량 요청 시에도 안정적 동작
3. **성능**: 최소 오버헤드 (< 1ms)
4. **통합**: SolvedAcClient와 원활한 통합
5. **캐싱**: 캐시 히트 시 Rate Limiter 우회

---

**테스트 스펙 작성 완료**

다음 단계: qa-testing-agent가 이 스펙을 바탕으로 실제 테스트 코드 작성 (🔴 Red Phase)
