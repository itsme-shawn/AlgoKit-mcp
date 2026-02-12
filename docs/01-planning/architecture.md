# 시스템 아키텍처 문서

**BOJ 학습 도우미 MCP Server**
**버전**: 1.0
**마지막 업데이트**: 2026-02-13

---

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처 다이어그램](#아키텍처-다이어그램)
3. [컴포넌트 상세 설명](#컴포넌트-상세-설명)
4. [데이터 흐름](#데이터-흐름)
5. [기술 스택](#기술-스택)
6. [설계 결정사항](#설계-결정사항)
7. [확장성 및 성능](#확장성-및-성능)

---

## 시스템 개요

### 목적
BOJ 학습 도우미는 **MCP(Model Context Protocol)** 기반 서버로, Claude와 같은 AI 어시스턴트가 백준 온라인 저지 문제를 검색하고 학습을 지원할 수 있도록 도구를 제공합니다.

### 핵심 특징
- **MCP 프로토콜 준수**: 표준 MCP SDK 사용
- **Stateless 설계**: 각 요청은 독립적으로 처리
- **외부 API 통합**: solved.ac API 활용
- **AI 기반 힌트**: Claude API를 통한 맞춤형 힌트 생성
- **캐싱 최적화**: 자주 조회되는 데이터 캐싱

### 배포 모델
- **로컬 실행**: 사용자 PC에서 MCP 서버로 실행
- **Claude Desktop 통합**: Claude Desktop의 MCP 클라이언트로 연결

---

## 아키텍처 다이어그램

### 전체 시스템 구조

```
┌─────────────────────────────────────────────────────────────┐
│                        사용자                                │
│                   (Claude Desktop UI)                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ 자연어 대화
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   Claude AI Client                           │
│              (MCP Protocol Consumer)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ MCP Protocol
                         │ (JSON-RPC)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    MCP Server                                │
│               (BOJ 학습 도우미)                              │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                Tool Registry                          │  │
│  │  - search_problems                                   │  │
│  │  - get_problem                                       │  │
│  │  - search_tags                                       │  │
│  │  - get_hint                                          │  │
│  │  - create_review                                     │  │
│  └────────────┬─────────────────────────────────────────┘  │
│               │                                              │
│  ┌────────────▼──────────┐  ┌─────────────────────────┐    │
│  │    Tool Handlers      │  │   Service Layer         │    │
│  │  - search-problems.ts │  │  - hint-generator.ts    │    │
│  │  - get-problem.ts     │  │  - review-generator.ts  │    │
│  │  - search-tags.ts     │  │                         │    │
│  │  - get-hint.ts        │  │                         │    │
│  │  - create-review.ts   │  │                         │    │
│  └────────────┬──────────┘  └──────────┬──────────────┘    │
│               │                        │                    │
│  ┌────────────▼────────────────────────▼──────────────┐    │
│  │              API Client Layer                      │    │
│  │          (solvedac-client.ts)                      │    │
│  │                                                     │    │
│  │  - HTTP Client (fetch)                             │    │
│  │  - Request/Response Handling                       │    │
│  │  - Error Handling & Retry Logic                    │    │
│  │  - Response Caching (optional)                     │    │
│  └────────────┬────────────────────────────────────────┘    │
│               │                                              │
│  ┌────────────▼──────────┐  ┌─────────────────────────┐    │
│  │    Utilities          │  │   Type Definitions      │    │
│  │  - tier-converter.ts  │  │  - api/types.ts         │    │
│  │  - cache.ts           │  │  - types/problem.ts     │    │
│  └───────────────────────┘  └─────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌──────────┐ ┌──────────────┐
│ solved.ac   │ │ Claude   │ │  File        │
│ API         │ │ API      │ │  System      │
│             │ │ (hints)  │ │  (reviews)   │
└─────────────┘ └──────────┘ └──────────────┘
```

### 레이어 구조

```
┌────────────────────────────────────────────┐
│         Presentation Layer                 │
│      (MCP Protocol Interface)              │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Application Layer                  │
│    (Tool Handlers + Business Logic)        │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Service Layer                      │
│  (Hint Generation, Review Generation)      │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Integration Layer                  │
│      (External API Clients)                │
└────────────────┬───────────────────────────┘
                 │
┌────────────────▼───────────────────────────┐
│         Infrastructure Layer               │
│   (HTTP, Caching, Error Handling)          │
└────────────────────────────────────────────┘
```

---

## 컴포넌트 상세 설명

### 1. MCP Server Core (`src/index.ts`)

**역할**: MCP 프로토콜 진입점, 도구 등록 및 라이프사이클 관리

**주요 기능**:
- MCP SDK를 사용한 서버 초기화
- 5개 도구 등록 및 메타데이터 정의
- 요청 라우팅 및 응답 반환
- 전역 에러 핸들링

**코드 구조 예시**:
```typescript
import { McpServer } from '@modelcontextprotocol/sdk';

const server = new McpServer({
  name: 'boj-study-assistant',
  version: '1.0.0'
});

// 도구 등록
server.tool(
  'search_problems',
  'Search BOJ problems with filters',
  SearchProblemsInputSchema,
  async (args) => {
    // 핸들러 로직
  }
);

// 서버 시작
server.run();
```

---

### 2. Tool Handlers (`src/tools/`)

각 도구는 독립적인 파일로 구현되며, MCP 도구 인터페이스를 준수합니다.

#### 구조
```
src/tools/
├── search-problems.ts    # 문제 검색 도구
├── get-problem.ts        # 문제 상세 조회 도구
├── search-tags.ts        # 태그 검색 도구
├── get-hint.ts           # 힌트 생성 도구
└── create-review.ts      # 복습 생성 도구
```

#### 공통 패턴
```typescript
// 1. Zod 스키마 정의
const InputSchema = z.object({
  problem_id: z.number().positive(),
  // ...
});

// 2. 타입 추론
type Input = z.infer<typeof InputSchema>;

// 3. 핸들러 함수
export async function handler(input: Input): Promise<Output> {
  // 1. 입력 검증 (Zod가 자동 수행)
  // 2. 비즈니스 로직 실행
  // 3. API 호출 또는 서비스 호출
  // 4. 응답 포맷팅
  // 5. 반환
}
```

---

### 3. API Client Layer (`src/api/`)

#### `solvedac-client.ts`
**역할**: solved.ac API와의 통신을 담당하는 HTTP 클라이언트

**주요 메서드**:
```typescript
class SolvedAcClient {
  private baseUrl = 'https://solved.ac/api/v3';

  // 문제 검색
  async searchProblems(params: SearchParams): Promise<SearchResult> {
    return this.request('/search/problem', params);
  }

  // 문제 상세 조회
  async getProblem(problemId: number): Promise<ProblemDetail> {
    return this.request('/problem/show', { problemId });
  }

  // 태그 검색
  async searchTags(query: string): Promise<TagResult> {
    return this.request('/search/tag', { query });
  }

  // 공통 요청 메서드
  private async request<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    // HTTP 요청 로직
    // - URL 구성
    // - Timeout 설정
    // - 에러 처리
    // - 재시도 로직
  }
}
```

**특징**:
- Singleton 패턴으로 인스턴스 공유
- 요청 타임아웃 설정 (10초)
- Exponential backoff 재시도 로직
- 응답 캐싱 지원 (선택사항)

#### `types.ts`
**역할**: solved.ac API 응답 타입 정의

```typescript
// API 응답 인터페이스
export interface SearchProblemResponse {
  count: number;
  items: Problem[];
}

export interface Problem {
  problemId: number;
  titleKo: string;
  level: number;
  tags: Tag[];
  acceptedUserCount: number;
  averageTries: number;
  // ...
}

export interface Tag {
  key: string;
  displayNames: DisplayName[];
  problemCount: number;
  // ...
}
```

---

### 4. Service Layer (`src/services/`)

#### `hint-generator.ts`
**역할**: AI 기반 힌트 생성 로직

**아키텍처**:
```typescript
class HintGenerator {
  private llmClient: ClaudeClient;

  // 3단계 힌트 생성
  async generateHint(
    problem: ProblemDetail,
    level: 1 | 2 | 3,
    userContext?: string
  ): Promise<string> {
    // 1. 프롬프트 템플릿 선택
    const template = this.getPromptTemplate(level);

    // 2. 문제 메타데이터로 프롬프트 구성
    const prompt = this.buildPrompt(template, problem, userContext);

    // 3. LLM API 호출
    const hint = await this.llmClient.complete(prompt);

    // 4. 마크다운 포맷팅
    return this.formatHint(hint, level);
  }

  // 레벨별 프롬프트 템플릿
  private getPromptTemplate(level: number): string {
    switch (level) {
      case 1: return LEVEL_1_TEMPLATE;
      case 2: return LEVEL_2_TEMPLATE;
      case 3: return LEVEL_3_TEMPLATE;
    }
  }
}
```

**프롬프트 전략**:
- **Level 1**: 문제 패턴 인식 프롬프트
- **Level 2**: 핵심 통찰 제공 프롬프트
- **Level 3**: 상세 알고리즘 단계 프롬프트

#### `review-generator.ts`
**역할**: 복습 문서 생성 (템플릿 기반)

**아키텍처**:
```typescript
class ReviewGenerator {
  // 복습 문서 생성
  async generateReview(
    problem: ProblemDetail,
    userInput: ReviewInput
  ): Promise<string> {
    // 1. 마크다운 템플릿 로드
    const template = this.loadTemplate();

    // 2. 문제 메타데이터 채우기
    const content = this.fillMetadata(template, problem);

    // 3. 사용자 입력 채우기
    const filled = this.fillUserInput(content, userInput);

    // 4. 관련 문제 추천
    const relatedProblems = await this.findRelatedProblems(problem);
    const final = this.addRelatedProblems(filled, relatedProblems);

    return final;
  }

  // 관련 문제 찾기 (같은 태그 기반)
  private async findRelatedProblems(
    problem: ProblemDetail
  ): Promise<Problem[]> {
    // 문제의 태그로 유사 문제 검색
    // 비슷한 난이도 필터링
    // 상위 3-5개 반환
  }
}
```

---

### 5. Utilities (`src/utils/`)

#### `tier-converter.ts`
**역할**: 레벨 숫자 ↔ 티어 이름 변환

```typescript
// 레벨 → 티어 변환
export function levelToTier(level: number): string {
  const tiers = [
    'Bronze V', 'Bronze IV', 'Bronze III', 'Bronze II', 'Bronze I',
    'Silver V', 'Silver IV', 'Silver III', 'Silver II', 'Silver I',
    'Gold V', 'Gold IV', 'Gold III', 'Gold II', 'Gold I',
    // ...
  ];
  return tiers[level - 1];
}

// 티어 → 레벨 범위 변환
export function tierToLevelRange(tier: string): [number, number] {
  const tierMap = {
    'Bronze': [1, 5],
    'Silver': [6, 10],
    'Gold': [11, 15],
    // ...
  };
  return tierMap[tier];
}

// 티어 뱃지 (이모지 포함)
export function getTierBadge(level: number): string {
  const emoji = getTierEmoji(level);
  const name = levelToTier(level);
  return `${emoji} ${name}`;
}
```

#### `cache.ts`
**역할**: 응답 캐싱 (선택사항)

```typescript
class Cache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private ttl: number; // Time to live (ms)

  set(key: string, value: T): void {
    this.store.set(key, {
      data: value,
      timestamp: Date.now()
    });
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // TTL 확인
    if (Date.now() - entry.timestamp > this.ttl) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  // LRU 방식 캐시 정리
  private evictOldest(): void {
    // 가장 오래된 항목 제거
  }
}
```

---

## 데이터 흐름

### 플로우 1: 문제 검색 (search_problems)

```
1. 사용자
   ↓ "Gold 티어 DP 문제 찾아줘"
2. Claude AI
   ↓ MCP 요청 생성
3. MCP Server (Tool Handler)
   ↓ { tag: "dp", level_min: 11, level_max: 15 }
4. API Client
   ↓ GET /search/problem?query=tier:g+dp
5. solved.ac API
   ↓ JSON 응답
6. API Client
   ↓ 응답 파싱 및 타입 변환
7. Tool Handler
   ↓ 티어 변환, 포맷팅
8. MCP Server
   ↓ MCP 응답 생성
9. Claude AI
   ↓ 자연어로 변환
10. 사용자
   ← "20개의 Gold DP 문제를 찾았습니다..."
```

### 플로우 2: 힌트 생성 (get_hint)

```
1. 사용자
   ↓ "11053번 문제 레벨 2 힌트 줘"
2. Claude AI
   ↓ MCP 요청
3. MCP Server (get_hint handler)
   ↓ { problem_id: 11053, hint_level: 2 }
4. API Client
   ↓ GET /problem/show?problemId=11053
5. solved.ac API
   ↓ 문제 메타데이터 반환
6. Hint Generator Service
   ↓ 프롬프트 구성 (태그, 난이도 포함)
7. Claude API (LLM)
   ↓ 힌트 생성
8. Hint Generator
   ↓ 마크다운 포맷팅
9. Tool Handler
   ↓ MCP 응답 구성
10. 사용자
   ← "DP 배열을 다음과 같이 정의..."
```

### 플로우 3: 복습 생성 (create_review)

```
1. 사용자
   ↓ "1927번 문제 복습 문서 만들어줘"
2. Claude AI (대화형)
   ↓ 사용자에게 추가 정보 요청
3. 사용자
   ↓ 풀이 접근법, 복잡도 등 입력
4. MCP Server (create_review handler)
   ↓ { problem_id: 1927, solution_approach: "...", ... }
5. API Client
   ↓ GET /problem/show?problemId=1927
6. Review Generator Service
   ↓ 템플릿 로드 및 채우기
7. Review Generator
   ↓ 관련 문제 검색 (같은 태그)
8. API Client
   ↓ GET /search/problem?query=priority_queue
9. Review Generator
   ↓ 최종 마크다운 생성
10. 사용자
   ← 마크다운 문서 반환
```

---

## 기술 스택

### 런타임 환경
- **Node.js**: v18+ (ES2022 모듈 지원)
- **TypeScript**: v5.9.3 (strict mode)

### 핵심 라이브러리

| 라이브러리 | 버전 | 용도 |
|-----------|------|------|
| `@modelcontextprotocol/sdk` | 1.26.0 | MCP 프로토콜 구현 |
| `zod` | 4.3.6 | 스키마 검증 |
| `node-fetch` | 3.x | HTTP 클라이언트 |
| `vitest` | 4.0.18 | 테스트 프레임워크 |
| `tsx` | 4.21.0 | TypeScript 실행 |

### 외부 API

| API | Base URL | 인증 | 용도 |
|-----|----------|------|------|
| solved.ac | `https://solved.ac/api/v3` | 불필요 | 문제 메타데이터 조회 |
| Claude API | `https://api.anthropic.com/v1` | API 키 | 힌트 생성 (선택) |

### 개발 도구
- **빌드**: TypeScript Compiler (tsc)
- **테스트**: vitest (watch mode 지원)
- **린트**: ESLint (선택사항)
- **포맷터**: Prettier (선택사항)

---

## 설계 결정사항

### 1. Stateless 아키텍처

**결정**: 서버는 상태를 유지하지 않음

**이유**:
- MCP 프로토콜이 기본적으로 stateless 요청-응답 모델
- 수평 확장 용이 (여러 인스턴스 실행 가능)
- 에러 복구 간단 (서버 재시작 시 영향 없음)

**트레이드오프**:
- 각 요청마다 API 호출 필요 → 캐싱으로 완화
- 사용자 세션 정보 없음 → 향후 필요 시 외부 스토리지 활용

### 2. 레이어 분리

**결정**: Tool Handlers, Services, API Client를 명확히 분리

**이유**:
- **관심사 분리**: 각 레이어는 단일 책임
- **테스트 용이성**: 각 레이어를 독립적으로 테스트
- **재사용성**: API Client는 여러 도구에서 공유
- **유지보수성**: 한 레이어 변경이 다른 레이어에 영향 최소화

**예시**:
```
Tool Handler (search_problems)
  → API Client (searchProblems)
    → solved.ac API

Tool Handler (get_hint)
  → API Client (getProblem) + Hint Generator Service
    → solved.ac API + Claude API
```

### 3. Zod를 통한 런타임 검증

**결정**: 모든 입력/출력에 Zod 스키마 사용

**이유**:
- **타입 안전성**: TypeScript 타입과 런타임 검증을 동시에 제공
- **명확한 API 계약**: 스키마가 곧 문서
- **자동 에러 메시지**: 유효성 검증 실패 시 명확한 에러

**예시**:
```typescript
const InputSchema = z.object({
  problem_id: z.number().positive(),
  hint_level: z.number().min(1).max(3)
});

// 자동 타입 추론
type Input = z.infer<typeof InputSchema>;

// 런타임 검증
const result = InputSchema.parse(userInput);  // 실패 시 ZodError 발생
```

### 4. 캐싱 전략

**결정**: 문제 메타데이터만 캐싱 (TTL: 1시간)

**이유**:
- **문제 메타데이터**: 거의 변경되지 않음 → 캐싱 효과 큼
- **검색 결과**: 자주 변경됨 → 캐싱하지 않음
- **힌트/복습**: 매번 새로 생성 → 캐싱 불필요

**구현**:
```typescript
// getProblem은 캐싱
const problem = await cachedClient.getProblem(1927);  // 캐시 활용

// searchProblems는 캐싱 안 함
const results = await client.searchProblems({ ... });  // 항상 최신 결과
```

### 5. 에러 처리 전략

**결정**: 계층별 에러 처리 + 사용자 친화적 메시지

**계층별 책임**:
- **API Client**: HTTP 에러, 타임아웃, 재시도
- **Tool Handler**: 비즈니스 로직 에러, 입력 검증
- **MCP Server**: 전역 에러, MCP 프로토콜 에러

**사용자 메시지**:
```typescript
// ❌ 기술적 에러 메시지
throw new Error('HTTP 404: Not Found');

// ✅ 사용자 친화적 메시지
throw new Error('해당 문제를 찾을 수 없습니다. 문제 번호를 확인해주세요.');
```

### 6. 힌트 생성 방식

**결정**: LLM 기반 (템플릿 기반 아님)

**이유**:
- **맥락 인식**: 문제 태그, 난이도를 고려한 힌트
- **자연스러움**: 템플릿보다 유연하고 자연스러운 표현
- **확장성**: 사용자 컨텍스트 반영 가능

**트레이드오프**:
- Claude API 비용 발생 → 프롬프트 최적화로 토큰 사용량 최소화
- 응답 시간 증가 (2-5초) → 사용자에게 로딩 표시

### 7. 복습 생성 방식

**결정**: 템플릿 기반 (LLM 선택적 사용)

**이유**:
- **구조화**: 복습 문서는 정해진 포맷이 있음
- **비용 효율**: LLM 없이도 충분히 유용
- **빠른 응답**: 템플릿 기반은 즉시 생성 가능

**LLM 활용**:
- 관련 문제 추천 설명 생성 (선택사항)
- 복잡도 분석 제안 (선택사항)

---

## 확장성 및 성능

### 성능 목표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| 문제 검색 응답 시간 | < 1.5초 | p95 latency |
| 문제 상세 조회 | < 0.5초 | 캐시 히트 시 |
| 힌트 생성 | < 5초 | LLM API 호출 포함 |
| 캐시 히트율 | > 70% | 로그 분석 |

### 최적화 전략

#### 1. 캐싱
```typescript
// 인메모리 LRU 캐시
class LRUCache<T> {
  private maxSize = 100;  // 최대 100개 문제 캐싱
  private ttl = 3600000;  // 1시간

  // 자주 조회되는 문제 우선 캐싱
  // 메모리 사용량 제한
}
```

#### 2. 병렬 처리
```typescript
// 여러 문제 상세 정보를 병렬로 조회
const problems = await Promise.all(
  problemIds.map(id => client.getProblem(id))
);
```

#### 3. 요청 Throttling
```typescript
// API 호출 간 최소 간격 유지
class ThrottledClient {
  private minInterval = 100;  // 100ms
  private lastRequestTime = 0;

  async request<T>(endpoint: string): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minInterval) {
      await sleep(this.minInterval - elapsed);
    }

    this.lastRequestTime = Date.now();
    return this.doRequest(endpoint);
  }
}
```

#### 4. 응답 압축
```typescript
// 큰 응답은 압축하여 전송
const response = {
  problems: largeArray,
  _compressed: true  // 클라이언트에 압축 힌트
};
```

### 확장성 고려사항

#### 수평 확장
- Stateless 설계로 인해 여러 인스턴스 실행 가능
- 로드 밸런서를 통한 요청 분산
- 공유 캐시 (Redis) 도입 시 더 효율적

#### 외부 의존성 관리
- solved.ac API 다운타임 대응:
  - 캐시된 데이터 제공
  - Graceful degradation (기능 축소 운영)
- Claude API 장애 대응:
  - 힌트 생성 실패 시 기본 템플릿 제공

#### 모니터링
```typescript
// 주요 지표 로깅
logger.info({
  event: 'api_request',
  endpoint: '/search/problem',
  duration: 234,  // ms
  cacheHit: true,
  statusCode: 200
});
```

---

## 배포 아키텍처

### 로컬 배포 (현재)

```
┌─────────────────────────────┐
│    사용자 PC                 │
│                              │
│  ┌──────────────────────┐   │
│  │  Claude Desktop       │   │
│  │  (MCP Client)         │   │
│  └──────────┬───────────┘   │
│             │ stdio          │
│  ┌──────────▼───────────┐   │
│  │  BOJ 학습 도우미      │   │
│  │  (MCP Server)         │   │
│  └──────────┬───────────┘   │
│             │ HTTPS          │
└─────────────┼───────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼──────┐  ┌─────────▼────┐
│ solved.ac│  │  Claude API  │
│   API    │  │              │
└──────────┘  └──────────────┘
```

### 향후 클라우드 배포 (선택사항)

```
┌─────────────────────────────┐
│    사용자 PC                 │
│  ┌──────────────────────┐   │
│  │  Claude Desktop       │   │
│  └──────────┬───────────┘   │
└─────────────┼───────────────┘
              │ WebSocket
              │
┌─────────────▼───────────────┐
│   Cloud (AWS/GCP)            │
│                              │
│  ┌──────────────────────┐   │
│  │  Load Balancer        │   │
│  └──────────┬───────────┘   │
│             │                │
│  ┌──────────▼───────────┐   │
│  │  MCP Server           │   │
│  │  (Multiple Instances) │   │
│  └──────────┬───────────┘   │
│             │                │
│  ┌──────────▼───────────┐   │
│  │  Redis (캐시)         │   │
│  └──────────────────────┘   │
└──────────────┬───────────────┘
               │
     ┌─────────┴─────────┐
     │                   │
┌────▼──────┐  ┌─────────▼────┐
│ solved.ac │  │  Claude API  │
└───────────┘  └──────────────┘
```

---

## 보안 고려사항

### API 키 관리
```typescript
// 환경 변수로 관리
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// ❌ 절대 하드코딩 금지
const API_KEY = 'sk-ant-...';  // 위험!
```

### 입력 검증
```typescript
// Zod를 통한 철저한 검증
const InputSchema = z.object({
  problem_id: z.number()
    .positive()
    .max(100000),  // 합리적인 범위 제한
});
```

### 에러 메시지
```typescript
// ✅ 사용자 친화적, 정보 노출 최소화
throw new Error('문제를 찾을 수 없습니다.');

// ❌ 시스템 정보 노출
throw new Error(`Database query failed: ${dbError.stack}`);
```

---

## 향후 개선 방향

### Phase 5: 개인화
- 사용자별 해결 기록 추적
- 약점 알고리즘 분석
- 맞춤형 문제 추천

### Phase 6: 고급 분석
- 제출 코드 분석
- 시간/공간 복잡도 자동 분석
- 최적화 제안

### Phase 7: 협업 기능
- 스터디 그룹 지원
- 풀이 공유 및 토론

---

**문서 작성자**: Project Planner
**최종 검토일**: 2026-02-13
