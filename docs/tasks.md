# 개발 태스크 목록 및 상태 관리

**프로젝트**: BOJ 학습 도우미 MCP Server
**마지막 업데이트**: 2026-02-13
**현재 Phase**: Phase 1 - 기반 구축

---

## 상태 범례

- ✅ **DONE**: 완료
- 🚧 **IN_PROGRESS**: 진행 중
- 📋 **TODO**: 예정
- ⏸️ **BLOCKED**: 블로킹됨 (의존성 대기)
- 🔄 **REVIEW**: 리뷰 중

---

## Phase 1: 기반 구축 (Foundation)
**목표**: 프로젝트 구조 설정 및 API 통합
**우선순위**: 🔴 높음
**예상 기간**: 1-2주

### Task 1.1: 프로젝트 구조 및 TypeScript 설정
**상태**: ✅ DONE
**담당**: Developer
**설명**: MCP SDK 기반 프로젝트 초기 설정

**완료 항목**:
- [x] npm 프로젝트 초기화
- [x] package.json 구성 (dependencies, scripts)
- [x] tsconfig.json 설정 (strict mode, ES2022)
- [x] 디렉토리 구조 생성 (src/, tests/, docs/)
- [x] 빌드 스크립트 설정

**인수 조건 (Acceptance Criteria)**:
- [x] `npm run build` 정상 작동
- [x] TypeScript 컴파일 에러 없음
- [x] 기본 디렉토리 구조 완성

---

### Task 1.2: solved.ac API 클라이언트 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P0 (최우선)
**예상 소요**: 2-3일

**세부 태스크**:
- [ ] HTTP 클라이언트 라이브러리 선택 (fetch 또는 axios)
- [ ] `src/api/solvedac-client.ts` 생성
- [ ] API 응답 타입 정의 (`src/api/types.ts`)
- [ ] 주요 엔드포인트 메서드 구현:
  - [ ] `searchProblems(query, filters)` - 문제 검색
  - [ ] `getProblem(problemId)` - 문제 상세 조회
  - [ ] `searchTags(query)` - 태그 검색
- [ ] 에러 처리 및 재시도 로직 구현
- [ ] 요청 타임아웃 설정 (10초)
- [ ] 기본 캐싱 메커니즘 (선택사항)

**API 엔드포인트**:
```typescript
// 구현할 메서드 인터페이스
interface SolvedAcClient {
  searchProblems(params: SearchParams): Promise<SearchResult>;
  getProblem(problemId: number): Promise<Problem>;
  searchTags(query: string): Promise<Tag[]>;
}
```

**인수 조건**:
- [ ] 모든 API 메서드가 정상 작동
- [ ] 네트워크 에러 시 적절한 예외 발생
- [ ] TypeScript 타입 검사 통과
- [ ] 단위 테스트 작성 (최소 80% 커버리지)

**참고 문서**:
- `docs/api-integration.md` 참조
- solved.ac API 공식 문서: https://solvedac.github.io/unofficial-documentation/

**블로킹 이슈**: 없음

---

### Task 1.3: 티어/레벨 유틸리티 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P1
**예상 소요**: 1일

**세부 태스크**:
- [ ] `src/utils/tier-converter.ts` 생성
- [ ] 레벨 숫자 → 티어 이름 변환 함수
  ```typescript
  levelToTier(level: number): string  // 15 → "Gold I"
  ```
- [ ] 티어 이름 → 레벨 범위 변환 함수
  ```typescript
  tierToLevelRange(tier: string): [number, number]  // "Gold" → [11, 15]
  ```
- [ ] 티어 색상/이모지 헬퍼
  ```typescript
  getTierBadge(level: number): string  // 15 → "🟡 Gold I"
  ```
- [ ] 유효성 검증 함수 (level 범위 1-30)

**인수 조건**:
- [ ] 모든 티어 (Bronze ~ Ruby) 변환 가능
- [ ] 유효하지 않은 입력 시 명확한 에러
- [ ] 단위 테스트 작성 (100% 커버리지)

**의존성**: Task 1.2 (API 클라이언트에서 사용)

---

## Phase 2: 핵심 도구 (Core Tools)
**목표**: 문제 검색 및 조회 도구 구현
**우선순위**: 🔴 높음
**예상 기간**: 2-3주

### Task 2.1: `search_problems` 도구 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P0
**예상 소요**: 2-3일
**의존성**: Task 1.2, Task 1.3

**세부 태스크**:
- [ ] `src/tools/search-problems.ts` 생성
- [ ] Zod 스키마 정의 (입력 파라미터)
  ```typescript
  const SearchProblemsInputSchema = z.object({
    query: z.string().optional(),
    level_min: z.number().min(1).max(30).optional(),
    level_max: z.number().min(1).max(30).optional(),
    tag: z.string().optional(),
    sort: z.enum(["level", "id", "average_try"]).optional(),
    direction: z.enum(["asc", "desc"]).optional(),
    page: z.number().positive().optional()
  });
  ```
- [ ] MCP 도구 핸들러 구현
- [ ] API 클라이언트 호출 및 응답 포맷팅
- [ ] 페이지네이션 처리
- [ ] 에러 처리 (유효하지 않은 필터, API 실패 등)
- [ ] 응답 포맷:
  - 문제 ID, 제목, 티어, 태그, 통계
  - 총 결과 개수, 현재 페이지

**인수 조건**:
- [ ] 모든 필터 옵션 정상 작동
- [ ] 빈 결과 시 적절한 메시지 반환
- [ ] 페이지네이션 정확함
- [ ] 통합 테스트 통과

**테스트 케이스**:
- 키워드 검색
- 티어 범위 필터링
- 태그 필터링
- 정렬 옵션
- 페이지네이션
- 빈 결과 처리

---

### Task 2.2: `get_problem` 도구 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P0
**예상 소요**: 1-2일
**의존성**: Task 1.2, Task 1.3

**세부 태스크**:
- [ ] `src/tools/get-problem.ts` 생성
- [ ] Zod 스키마 정의
  ```typescript
  const GetProblemInputSchema = z.object({
    problem_id: z.number().positive()
  });
  ```
- [ ] API 클라이언트 호출 (getProblem)
- [ ] BOJ 링크 생성 (`https://www.acmicpc.net/problem/{id}`)
- [ ] 응답 포맷팅:
  - 문제 메타데이터 전체
  - 티어 이름 변환
  - 태그 표시명 포함
  - 통계 정보
- [ ] 캐싱 구현 (선택사항, 자주 조회되는 문제)

**인수 조건**:
- [ ] 유효한 문제 ID로 정확한 정보 반환
- [ ] 존재하지 않는 문제 ID는 명확한 에러
- [ ] 모든 필수 필드 포함
- [ ] 단위 테스트 및 통합 테스트 통과

**테스트 케이스**:
- 유효한 문제 ID (예: 1000)
- 존재하지 않는 문제 ID
- API 실패 시나리오

---

### Task 2.3: `search_tags` 도구 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P1
**예상 소요**: 1일
**의존성**: Task 1.2

**세부 태스크**:
- [ ] `src/tools/search-tags.ts` 생성
- [ ] Zod 스키마 정의
  ```typescript
  const SearchTagsInputSchema = z.object({
    query: z.string().min(1)
  });
  ```
- [ ] API 클라이언트 호출 (searchTags)
- [ ] 응답 포맷팅:
  - 태그 키
  - 한글/영문 표시명
  - 문제 개수
- [ ] 다국어 처리 (한글 우선)

**인수 조건**:
- [ ] 키워드로 관련 태그 검색 가능
- [ ] 빈 결과 시 적절한 메시지
- [ ] 단위 테스트 통과

**테스트 케이스**:
- 한글 키워드 ("다이나믹")
- 영문 키워드 ("dynamic")
- 부분 매칭
- 빈 결과

---

### Task 2.4: MCP 서버 통합
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P0
**예상 소요**: 1일
**의존성**: Task 2.1, Task 2.2, Task 2.3

**세부 태스크**:
- [ ] `src/index.ts`에 모든 도구 등록
- [ ] 도구 메타데이터 작성 (설명, 스키마)
- [ ] 로컬 테스트 설정 (Claude Desktop 연동)
- [ ] 에러 로깅 추가
- [ ] README 업데이트 (설치 및 사용법)

**인수 조건**:
- [ ] Claude Desktop에서 5개 도구 모두 인식
- [ ] 각 도구가 정상 작동
- [ ] 에러 발생 시 명확한 메시지

---

## Phase 3: 고급 기능 (Advanced Features)
**목표**: 힌트 생성 및 복습 시스템
**우선순위**: 🟡 중간
**예상 기간**: 3-4주

### Task 3.1: 힌트 생성 서비스 구현
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P1
**예상 소요**: 3-4일
**의존성**: Task 2.2 (문제 메타데이터 조회)

**세부 태스크**:
- [ ] `src/services/hint-generator.ts` 생성
- [ ] 3단계 힌트 프롬프트 템플릿 설계
  - Level 1: 문제 패턴 인식
  - Level 2: 핵심 통찰
  - Level 3: 상세 알고리즘 단계
- [ ] Claude API 통합 (환경 변수로 API 키 관리)
- [ ] 문제 태그와 난이도 기반 프롬프트 생성
- [ ] 사용자 컨텍스트 반영 (선택사항)
- [ ] 응답 포맷팅 (마크다운)
- [ ] 토큰 사용량 최적화

**프롬프트 예시**:
```typescript
// Level 1 프롬프트
`문제 정보:
- 제목: ${problem.title}
- 난이도: ${problem.tier}
- 태그: ${problem.tags.join(', ')}

사용자에게 이 문제가 어떤 유형의 알고리즘 문제인지 알려주세요.
구체적인 풀이는 제시하지 말고, 어떤 방향으로 접근해야 하는지만 안내하세요.`
```

**인수 조건**:
- [ ] 3가지 레벨의 힌트가 명확히 구분됨
- [ ] 힌트가 문제 난이도에 적절함
- [ ] 레벨 3 힌트도 코드를 직접 제공하지 않음
- [ ] 다양한 알고리즘 유형에서 테스트 완료

**테스트 케이스**:
- DP 문제 (Gold)
- 그리디 문제 (Silver)
- 그래프 문제 (Platinum)
- 각 레벨의 힌트 품질 검증

---

### Task 3.2: `get_hint` 도구 구현
**상태**: ⏸️ BLOCKED
**담당**: Developer
**우선순위**: P1
**예상 소요**: 1-2일
**의존성**: Task 3.1

**세부 태스크**:
- [ ] `src/tools/get-hint.ts` 생성
- [ ] Zod 스키마 정의
  ```typescript
  const GetHintInputSchema = z.object({
    problem_id: z.number().positive(),
    hint_level: z.number().min(1).max(3),
    user_context: z.string().optional()
  });
  ```
- [ ] 문제 메타데이터 조회 (Task 2.2 재사용)
- [ ] Hint Generator Service 호출
- [ ] 응답 포맷팅

**인수 조건**:
- [ ] 3가지 힌트 레벨 모두 작동
- [ ] 사용자 컨텍스트 반영 확인
- [ ] 통합 테스트 통과

---

### Task 3.3: 복습 생성 서비스 구현
**상태**: ⏸️ BLOCKED
**담당**: Developer
**우선순위**: P1
**예상 소요**: 2-3일
**의존성**: Task 2.2

**세부 태스크**:
- [ ] `src/services/review-generator.ts` 생성
- [ ] 마크다운 템플릿 설계
- [ ] 템플릿 채우기 로직:
  - 문제 메타데이터 (API에서 조회)
  - 사용자 입력 (풀이 접근법, 복잡도, 인사이트 등)
  - 해결 날짜 자동 추가
- [ ] 관련 문제 추천 로직:
  - 같은 태그를 가진 문제 검색
  - 비슷한 난이도 필터링
  - 상위 3-5개 제안
- [ ] 마크다운 포맷 검증

**인수 조건**:
- [ ] 템플릿이 모든 필드를 포함
- [ ] 관련 문제 추천이 적절함
- [ ] 마크다운 문법이 유효함
- [ ] 단위 테스트 통과

---

### Task 3.4: `create_review` 도구 구현
**상태**: ⏸️ BLOCKED
**담당**: Developer
**우선순위**: P1
**예상 소요**: 1-2일
**의존성**: Task 3.3

**세부 태스크**:
- [ ] `src/tools/create-review.ts` 생성
- [ ] Zod 스키마 정의
  ```typescript
  const CreateReviewInputSchema = z.object({
    problem_id: z.number().positive(),
    solution_approach: z.string().min(10),
    time_complexity: z.string().optional(),
    space_complexity: z.string().optional(),
    key_insights: z.string().optional(),
    difficulties: z.string().optional()
  });
  ```
- [ ] Review Generator Service 호출
- [ ] 마크다운 문서 반환
- [ ] 선택적 파일 저장 기능 (향후)

**인수 조건**:
- [ ] 사용자 입력이 올바르게 반영됨
- [ ] 출력된 마크다운이 유효함
- [ ] 통합 테스트 통과

---

## Phase 4: 완성도 & 최적화 (Polish & Optimization)
**목표**: 프로덕션 준비
**우선순위**: 🟢 낮음
**예상 기간**: 5주차

### Task 4.1: 요청 Throttling/Rate Limiting
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P2
**예상 소요**: 1일

**세부 태스크**:
- [ ] API 호출 간 최소 간격 설정 (100ms)
- [ ] 동시 요청 수 제한 (최대 5개)
- [ ] 큐 메커니즘 구현
- [ ] Rate limit 초과 시 에러 메시지

---

### Task 4.2: 캐싱 전략 최적화
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P2
**예상 소요**: 2일

**세부 태스크**:
- [ ] `src/utils/cache.ts` 강화
- [ ] LRU (Least Recently Used) 캐시 구현
- [ ] TTL (Time To Live) 설정 (1시간)
- [ ] 캐시 히트율 로깅
- [ ] 캐시 무효화 메커니즘

**인수 조건**:
- [ ] 캐시 히트율 70% 이상
- [ ] 메모리 사용량 적정 수준

---

### Task 4.3: 로깅 및 모니터링
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P2
**예상 소요**: 1-2일

**세부 태스크**:
- [ ] 로깅 라이브러리 선택 (winston, pino 등)
- [ ] 로그 레벨 설정 (debug, info, warn, error)
- [ ] 주요 이벤트 로깅:
  - API 호출 (URL, 파라미터, 응답 시간)
  - 에러 (스택 트레이스 포함)
  - 캐시 히트/미스
- [ ] 민감 정보 마스킹 (API 키 등)

---

### Task 4.4: 예외 상황 처리 강화
**상태**: 📋 TODO
**담당**: Developer
**우선순위**: P2
**예상 소요**: 2일

**세부 태스크**:
- [ ] 유효하지 않은 문제 ID 처리
- [ ] API 타임아웃 처리
- [ ] 네트워크 에러 재시도 로직
- [ ] 사용자 친화적 에러 메시지 (한글)
- [ ] 에러 복구 메커니즘

---

## QA 태스크

### QA-1: 통합 테스트 작성
**상태**: 📋 TODO
**담당**: QA
**우선순위**: P0
**의존성**: Phase 2 완료

**테스트 대상**:
- [ ] 문제 검색 플로우
- [ ] 문제 상세 조회 플로우
- [ ] 태그 검색 플로우
- [ ] 힌트 생성 플로우
- [ ] 복습 생성 플로우

**테스트 환경**:
- 실제 solved.ac API 사용
- Mock API 응답 시나리오

---

### QA-2: E2E 테스트 작성
**상태**: 📋 TODO
**담당**: QA
**우선순위**: P1
**의존성**: Phase 3 완료

**시나리오**:
- [ ] 사용자 시나리오 1: 문제 발견
- [ ] 사용자 시나리오 2: 힌트 요청
- [ ] 사용자 시나리오 3: 복습 작성
- [ ] 사용자 시나리오 4: 태그 탐색

---

### QA-3: 성능 테스트
**상태**: 📋 TODO
**담당**: QA
**우선순위**: P2
**의존성**: Phase 4 완료

**테스트 항목**:
- [ ] 응답 시간 측정 (모든 도구)
- [ ] 캐싱 효과 측정
- [ ] 동시 요청 처리 테스트
- [ ] 메모리 사용량 프로파일링

---

## Technical Writer 태스크

### TW-1: API 통합 가이드 작성
**상태**: 📋 TODO
**담당**: Technical Writer
**우선순위**: P1
**의존성**: Task 1.2 완료

**문서 내용**:
- [ ] solved.ac API 엔드포인트 상세 설명
- [ ] 요청/응답 예시
- [ ] 에러 코드 및 처리 방법
- [ ] 코드 예제 (TypeScript)

**파일**: `docs/api-integration.md`

---

### TW-2: MCP 도구 레퍼런스 작성
**상태**: 📋 TODO
**담당**: Technical Writer
**우선순위**: P0
**의존성**: Phase 2 완료

**문서 내용**:
- [ ] 각 도구의 상세 명세
- [ ] 입출력 스키마 및 예시
- [ ] 사용 예제 (실제 대화 예시)
- [ ] 제약사항 및 주의사항

**파일**: `docs/tools-reference.md`

---

### TW-3: 사용자 가이드 작성
**상태**: 📋 TODO
**담당**: Technical Writer
**우선순위**: P1
**의존성**: Phase 3 완료

**문서 내용**:
- [ ] 설치 및 설정 가이드
- [ ] 기본 사용법
- [ ] 고급 사용법 (팁 & 트릭)
- [ ] FAQ
- [ ] 문제 해결 (Troubleshooting)

**파일**: `docs/user-guide.md`

---

### TW-4: 개발 가이드 작성
**상태**: 📋 TODO
**담당**: Technical Writer
**우선순위**: P2
**의존성**: Phase 3 완료

**문서 내용**:
- [ ] 프로젝트 구조 설명
- [ ] 새 도구 추가 방법
- [ ] 테스트 작성 가이드
- [ ] 기여 가이드라인
- [ ] 배포 프로세스

**파일**: `docs/development-guide.md`

---

## 우선순위 요약

### P0 (최우선 - 즉시 시작)
1. Task 1.2: solved.ac API 클라이언트
2. Task 2.1: search_problems 도구
3. Task 2.2: get_problem 도구
4. Task 2.4: MCP 서버 통합

### P1 (높음 - Phase 2-3)
1. Task 1.3: 티어/레벨 유틸리티
2. Task 2.3: search_tags 도구
3. Task 3.1: 힌트 생성 서비스
4. Task 3.2: get_hint 도구
5. Task 3.3: 복습 생성 서비스
6. Task 3.4: create_review 도구

### P2 (중간 - Phase 4)
1. Task 4.1: Rate Limiting
2. Task 4.2: 캐싱 최적화
3. Task 4.3: 로깅 및 모니터링
4. Task 4.4: 예외 처리 강화

---

## 진행 상황 대시보드

| Phase | 완료율 | 상태 |
|-------|--------|------|
| Phase 1 | 20% (1/5) | 🚧 진행 중 |
| Phase 2 | 0% (0/4) | 📋 예정 |
| Phase 3 | 0% (0/4) | 📋 예정 |
| Phase 4 | 0% (0/4) | 📋 예정 |

**전체 진행률**: 5% (1/17 태스크 완료)

---

## 다음 단계 (Next Steps)

1. **즉시 시작**: Task 1.2 (API 클라이언트 구현)
2. **병렬 작업 가능**: Task 1.3 (티어 유틸리티)
3. **준비 사항**: Claude API 키 발급 (Task 3.1 이전)

---

**노트**:
- 각 태스크 완료 시 이 문서를 업데이트하세요
- 블로킹 이슈 발생 시 즉시 기록하세요
- 우선순위는 프로젝트 진행 상황에 따라 조정될 수 있습니다
