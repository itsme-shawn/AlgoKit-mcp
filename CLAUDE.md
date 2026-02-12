# cote-mcp-server : 코딩테스트 어시스턴트 MCP Server

## 프로젝트 목적

백준 온라인 저지(Baekjoon Online Judge) 알고리즘 문제 학습을 돕는 MCP(Model Context Protocol) 서버입니다. AI 기반으로 문제를 검색하고, 단계별 힌트를 제공하며, 구조화된 복습 문서를 생성합니다.

**프로젝트 이름**: `cote-mcp`
**스킬 Prefix**: `cote:` (향후 슬래시 커맨드용, SuperClaude의 `sc:` prefix에서 영감)

### 한 줄 정의

**백준 ID 기반으로 풀이 이력을 분석하고, 학습 리포트와 문제별 복기 피드백 파일을 자동 생성하는 개인 알고리즘 학습 분석 서버**

## 핵심 철학

### 현재 BOJ 학습의 문제점

1. **전략 없는 문제 풀이**
   - 체계적인 학습 계획 없이 무작위로 문제 선택
   - 현재 수준에 맞지 않는 문제로 시간 낭비

2. **취약 알고리즘 인지 불가**
   - 어떤 알고리즘이 약한지 정량적으로 파악하기 어려움
   - 같은 유형의 문제를 반복적으로 틀림

3. **티어 정체 구간 돌파 전략 부재**
   - Silver-Gold-Platinum 각 구간에서 장기간 정체
   - 다음 단계로 올라가기 위한 명확한 학습 방향성 부족

4. **복기 기록 자동화 없음**
   - 해결한 문제를 다시 보지 않음
   - 풀이 과정에서 배운 점을 기록하지 않음

5. **문제별 개선점 정리 안 함**
   - 왜 틀렸는지, 어떻게 개선할 수 있는지 분석 부재
   - 비슷한 실수를 반복

**결과적으로**: 많이 풀어도 실력이 체계적으로 상승하지 않고, Gold 진입에서 정체됩니다.

### 우리의 솔루션

cote-mcp는 **데이터 기반 학습 분석**과 **AI 기반 개인화 피드백**을 통해 효율적인 알고리즘 학습을 지원합니다.

## 주요 기능

### 1. 필수 기능 (Primary Goal)

#### 1.1 백준 ID 기반 전체 학습 분석 리포트 생성
- **analyze_user**: 백준 사용자 ID로 전체 풀이 이력 분석
- 티어 분포 및 정체 구간 탐지
- 알고리즘별 취약도 정량화
- 맞춤 2주 학습 전략 자동 생성
- 추천 문제 리스트 제공
- 출력: `{boj_id}_learning_report.md`

#### 1.2 특정 문제 풀이 후 복기 파일 자동 생성
- **create_review**: 문제별 구조화된 복습 문서 생성
- 문제 핵심 개념 자동 요약
- 풀이 전략 비교 (최적 풀이 vs 사용자 풀이)
- 시간복잡도 분석 및 개선 포인트 제시
- 배운 점 정리 섹션 제공
- 출력: `boj_reviews/{problem_id}.md`

### 2. 부가 기능 (Secondary Goal)

#### 2.1 문제 검색 및 발견
- **search_problems**: 필터를 사용한 문제 검색 (티어, 태그, 키워드)
- **get_problem**: 특정 문제의 상세 정보 조회
- **search_tags**: 알고리즘 태그 검색

#### 2.2 학습 지원
- **get_hint**: 단계별 힌트 생성 (3단계: 패턴 인식 → 핵심 통찰 → 상세 접근법)

### 3. 향후 슬래시 커맨드 (계획)
- `/cote:analyze` - ID 기반 전체 학습 분석
- `/cote:review` - 문제 복기 문서 생성
- `/cote:search` - 대화형 문제 검색
- `/cote:hint` - 점진적 힌트 제공

### 4. solved.ac API 통합
- 공개 solved.ac API를 활용한 문제 메타데이터 수집
- 인증 불필요
- 티어, 태그, 통계 등 풍부한 데이터 제공

## 프로젝트 구조

```
cote-mcp/
├── src/
│   ├── index.ts                   # MCP 서버 진입점
│   ├── api/
│   │   ├── solvedac-client.ts     # solved.ac API 클라이언트
│   │   └── types.ts               # API 응답 타입 정의
│   ├── tools/
│   │   ├── search-problems.ts     # 문제 검색 도구
│   │   ├── get-problem.ts         # 문제 상세 정보 도구
│   │   ├── search-tags.ts         # 태그 검색 도구
│   │   ├── get-hint.ts            # 힌트 생성 도구
│   │   ├── create-review.ts       # 복습 문서 생성 도구
│   │   └── analyze-user.ts        # 사용자 학습 분석 도구 (신규)
│   ├── services/
│   │   ├── hint-generator.ts      # LLM 기반 힌트 생성 로직
│   │   ├── review-generator.ts    # 복습 템플릿 생성기
│   │   └── analytics-engine.ts    # 학습 분석 엔진 (신규)
│   ├── types/
│   │   └── problem.ts             # 도메인 타입 정의
│   └── utils/
│       ├── tier-converter.ts      # 티어 레벨 ↔ 이름 변환
│       └── cache.ts               # 응답 캐싱 (선택사항)
├── tests/
│   ├── api/
│   └── tools/
├── docs/                           # 문서
│   ├── PRD.md                     # 제품 요구사항 문서
│   ├── tasks.md                   # 태스크 관리
│   ├── api-integration.md         # API 통합 가이드
│   ├── tools-reference.md         # 도구 레퍼런스
│   └── architecture.md            # 시스템 아키텍처
├── package.json
└── tsconfig.json
```

## 기술 스택

### 핵심 기술
- **MCP SDK**: `@modelcontextprotocol/sdk` v1.26.0
- **TypeScript**: TS 5.9.3로 타입 안전 개발
- **Node.js**: ES2022 모듈 시스템
- **Zod**: 도구 입출력의 런타임 스키마 검증

### 외부 API
- **solved.ac API**: BOJ 문제 데이터를 위한 공개 RESTful API
  - Base URL: `https://solved.ac/api/v3`
  - 인증 불필요
  - 서버 사이드 전용 (CORS 제한)
- **Claude API**: (선택) LLM 기반 힌트 생성용

### 개발 도구
- **vitest**: 모던 테스팅 프레임워크 (v4.0.18)
- **tsx**: 빠른 TypeScript 실행 (개발용)

## 코드베이스 작업 가이드

### MCP 아키텍처 이해

이 서버는 Model Context Protocol을 구현하므로:
- 도구들은 MCP 인터페이스를 통해 노출됨
- 각 도구는 정의된 스키마(입출력)를 가짐
- 도구는 MCP 클라이언트(Claude Desktop 등)에 의해 호출됨
- 서버는 장기 실행 프로세스로 동작

### 핵심 설계 패턴

#### 1. 도구 구조
각 도구는 다음 패턴을 따릅니다:
```typescript
// Zod로 입력 스키마 정의
const InputSchema = z.object({
  field: z.string(),
  // ...
});

// 도구 핸들러 구현
server.tool(
  "tool_name",
  "도구 설명",
  InputSchema,
  async (args) => {
    // 1. 입력 검증
    // 2. API 또는 서비스 레이어 호출
    // 3. 응답 포맷팅
    // 4. 구조화된 출력 반환
  }
);
```

#### 2. API 클라이언트 패턴
- `solvedac-client.ts`는 solved.ac에 대한 HTTP 호출을 래핑
- TypeScript 인터페이스를 사용한 타입화된 응답 반환
- 우아한 에러 처리
- 자주 접근하는 데이터에 대한 선택적 캐싱

#### 3. 서비스 레이어
- `hint-generator.ts`: 힌트용 LLM 프롬프트 엔지니어링 포함
- `review-generator.ts`: 템플릿 기반 복습 생성
- `analytics-engine.ts`: 학습 데이터 분석 로직 (신규)
- 비즈니스 로직을 도구 핸들러에서 분리

### 티어 시스템
BOJ 문제는 1-30 스케일로 평가됩니다:
- 1-5: Bronze V-I (초보자)
- 6-10: Silver V-I (기본 알고리즘)
- 11-15: Gold V-I (중급)
- 16-20: Platinum V-I (고급)
- 21-25: Diamond V-I (전문가)
- 26-30: Ruby V-I (마스터)

숫자가 높을수록 = 더 어려운 난이도

### 일반 작업

#### 새 도구 추가하기
1. `src/tools/`에 도구 파일 생성
2. 입력용 Zod 스키마 정의
3. 도구 핸들러 구현
4. `src/index.ts`에 등록
5. `tests/tools/`에 테스트 추가
6. 문서 업데이트

#### solved.ac API 작업
- 엔드포인트 문서는 `PLAN.md` 확인
- 가능한 경우 API 응답 캐싱
- 레이트 리밋 우아하게 처리
- 태그 키는 표준화됨 (예: "dp", "greedy")

#### 힌트 생성 전략
- 레벨 1: 문제 패턴/알고리즘 유형 식별
- 레벨 2: 완전한 해법 없이 핵심 통찰 제공
- 레벨 3: 상세한 알고리즘 단계 (코드 제외)
- 문제의 태그와 티어를 사용하여 힌트 난이도 조절

#### 복습 생성
- 사용자 입력을 활용한 템플릿 기반
- API에서 가져온 문제 메타데이터 포함
- 태그 기반 관련 문제 제안
- 마크다운 형식 출력

#### 학습 분석 (신규)
- solved.ac API를 통한 사용자 데이터 수집
- 티어 분포 및 알고리즘별 비율 계산
- 취약도 점수 = (평균 제출 횟수 / 전체 평균) × (1 - 정답률) × 100
- 정체 구간 탐지: 최근 40문제 중 같은 티어 75% 이상
- 맞춤 학습 전략 및 문제 추천 생성

### 테스팅
- 개별 도구에 대한 단위 테스트
- API 클라이언트 통합 테스트
- 신뢰성 있는 테스팅을 위한 Mock API 응답
- 모든 테스트에 vitest 사용

### 개발 워크플로우
1. 전체 아키텍처는 `PLAN.md` 참고
2. 관련 영역의 기존 코드 확인
3. 확립된 패턴을 따라 기능 구현
4. 구현과 함께 테스트 작성
5. 문서 업데이트

### 중요 사항
- 프로젝트는 초기 개발 단계
- 일부 컴포넌트는 아직 구현되지 않을 수 있음
- PLAN.md의 단계별 구현 계획 따르기
- 기존 코드 스타일과 일관성 유지
- 사용자 친화적인 에러 메시지 우선순위

### 설정
- solved.ac API에는 API 키 불필요
- 선택사항: 힌트 생성용 Claude API 키 (환경 변수)
- TypeScript strict 모드 활성화
- ES Module 형식 (CommonJS 아님)

## 현재 상태

이 프로젝트는 **Phase 1** 개발 중입니다. 핵심 인프라와 API 통합을 구현하고 있습니다. 상세한 구현 상태는 `docs/tasks.md`를 확인하세요.

## 사용 예시

### 전체 학습 분석
```
사용자: "/cote:analyze shawnhoon"
→ shawnhoon_learning_report.md 생성
→ 티어 분포, 취약 알고리즘, 정체 구간, 2주 학습 전략 포함
```

### 문제 복기
```
사용자: "/cote:review 1927"
→ boj_reviews/1927.md 생성
→ 문제 핵심, 풀이 전략, 개선점, 배운 점 정리
```

### 문제 검색
```
사용자: "Gold 티어의 DP 문제 찾아줘"
→ search_problems 호출
→ 필터링된 문제 목록 제공
```

### 힌트 요청
```
사용자: "11053번 문제 레벨 2 힌트 줘"
→ get_hint 호출
→ 핵심 통찰 제공 (완전한 해법 없이)
```

## Git 작업 방식

### Commit 작업 프로세스

#### 1. 작업 단위 분리
- `git status`로 변경된 파일 확인
- 논리적으로 관련된 변경사항을 하나의 커밋 단위로 그룹화
- 서로 다른 기능/수정은 별도의 커밋으로 분리

#### 2. 커밋 계획 파일 생성 (필수)
커밋 전에 **반드시** ``<현재프로젝트경로>/stash/commit/` 디렉토리에 계획 파일을 생성합니다:

**파일명 형식**: `YYYYMMDD_to_commit.md`

**파일 구조**:
```markdown
# 커밋 계획 - YYYY-MM-DD

## 커밋 1: [타입] 간결한 설명

### 커밋할 파일
- src/api/solvedac-client.ts
- src/tools/search-problems.ts

### 커밋 메시지
[feat] solved.ac API 클라이언트 구현

- solved.ac API 기본 클라이언트 구현
- 문제 검색 도구 추가
- 에러 핸들링 및 타입 정의

## 커밋 2: [타입] 간결한 설명
...
```

#### 3. 사용자 승인 절차 (필수)
커밋 실행 전 다음 정보를 사용자에게 제시하고 승인을 받습니다:
- 수행할 git 명령어
- 커밋될 파일 목록
- 커밋 메시지 내용

**예시**:
```
다음 커밋을 생성하겠습니다:

git add src/api/solvedac-client.ts src/tools/search-problems.ts
git commit -m "[feat] solved.ac API 클라이언트 구현

- solved.ac API 기본 클라이언트 구현
- 문제 검색 도구 추가
- 에러 핸들링 및 타입 정의

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

진행하시겠습니까?
```

#### 4. Push 금지 정책
- **AI 에이전트는 절대 `git push`를 실행하지 않습니다**
- Push는 사용자가 직접 수행합니다
- 커밋 완료 후 "커밋이 완료되었습니다. Push는 직접 수행해주세요."라고 안내

### 커밋 메시지 양식

한글로 작성하며 다음 형식을 따릅니다:

```
[타입] 간결한 설명

- 주요 변경사항 1
- 주요 변경사항 2
- 주요 변경사항 3
```

#### 타입 분류
- `[feat]`: 새로운 기능 추가
- `[fix]`: 버그 수정
- `[chore]`: 빌드, 설정, 의존성 등 기타 작업
- `[refactor]`: 코드 리팩토링 (기능 변경 없음)
- `[docs]`: 문서 수정
- `[test]`: 테스트 코드 추가/수정

#### 작성 가이드
- **제목**: 최대한 간결하게, 목적과 기능 중심
- **본문**: 개조식으로 주요 변경사항 나열 (3-5개 항목 권장)
- **무엇을 했는지**보다 **왜, 어떤 목적으로** 했는지 명확히

#### 커밋 메시지 예시

**좋은 예시**:
```
[feat] 문제 검색 API 통합 및 필터링 기능 구현

- solved.ac API 클라이언트 기본 구조 구현
- 티어/태그/키워드 기반 문제 검색 기능
- Zod 스키마 검증 추가
- 에러 핸들링 및 타입 안전성 보장
```

**나쁜 예시**:
```
update files

- modified solvedac-client.ts
- added types
```

### 작업 흐름 요약

1. ✅ `git status`로 변경사항 확인
2. ✅ 작업 단위별로 커밋 그룹화
3. ✅ `stash/commit/YYYYMMDD_to_commit.md` 계획 파일 작성
4. ✅ 사용자에게 커밋 명령어 및 내용 제시하고 승인 요청
5. ✅ 승인 후 `git add` + `git commit` 실행
6. ❌ **절대 `git push` 실행하지 않음**
7. ✅ "커밋 완료, Push는 직접 수행해주세요" 안내
