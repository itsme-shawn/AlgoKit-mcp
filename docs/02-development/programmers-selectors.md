# 프로그래머스 CSS Selector 정의

## 조사 일시
- **날짜**: 2026-02-15
- **대상 URL**: `https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=1`
- **방법**: Puppeteer 자동 조사 스크립트

---

## 페이지 구조 개요

프로그래머스 검색 페이지는 **테이블 기반 레이아웃**을 사용합니다.

### HTML 구조

```html
<table class="ChallengesTablestyle__Table-sc-wt0ety-4 PQQPZ">
  <thead>
    <tr>
      <th class="status">상태</th>
      <th class="title">제목</th>
      <th class="level">난이도</th>
      <th class="finished-count">완료한 사람</th>
      <th class="acceptance-rate">정답률</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="status unsolved"></td>
      <td class="title">
        <div class="bookmark">
          <a href="/learn/courses/30/lessons/451808">숫자 야구</a>
          <div class="challenge-status"></div>
        </div>
        <small class="part-title">연습문제</small>
      </td>
      <td class="level">
        <span class="level-3">Lv. 3</span>
      </td>
      <td class="finished-count">350명</td>
      <td class="acceptance-rate">4%</td>
    </tr>
    <!-- 20개 행 반복 -->
  </tbody>
</table>
```

---

## CSS Selector 정의

### 1. 문제 목록 컨테이너

**Selector**: `table`

**설명**: 페이지에 테이블이 1개만 존재하므로 `table` 태그로 충분

**대안 (더 구체적)**:
- `table[class*="ChallengesTable"]`
- `table.ChallengesTablestyle__Table-sc-wt0ety-4`

**주의사항**:
- Styled-component 클래스(`-sc-wt0ety-4`)는 빌드마다 변경될 수 있음
- 일반 `table` 선택자 사용 권장

---

### 2. 문제 행 (Problem Row)

**Selector**: `table tbody tr`

**설명**: tbody 내부의 모든 tr이 문제 항목

**특징**:
- 페이지당 20개 행 반환
- 각 행은 5개 셀 포함 (상태, 제목, 난이도, 완료자, 정답률)

**예제**:
```typescript
const rows = await page.$$('table tbody tr');
console.log(`총 ${rows.length}개 문제`); // 20
```

---

### 3. 문제 제목 (Title)

**Selector**: `td.title a[href*="/lessons/"]`

**설명**: title 클래스의 td 내부 링크

**추출 정보**:
- **텍스트**: `textContent` (예: "숫자 야구")
- **링크**: `href` 속성 (예: "/learn/courses/30/lessons/451808")
- **문제 ID**: 링크에서 추출 (예: "451808")

**예제**:
```typescript
const titleLink = await row.$('td.title a[href*="/lessons/"]');
const title = await titleLink?.evaluate(el => el.textContent?.trim());
const href = await titleLink?.evaluate(el => el.getAttribute('href'));
const problemId = href?.match(/lessons\/(\d+)/)?.[1];
```

---

### 4. 문제 카테고리 (Category)

**Selector**: `td.title small.part-title`

**설명**: 제목 셀 하단의 작은 텍스트

**예제**:
- "연습문제"
- "2025 프로그래머스 코드챌린지 2차 예선"
- "[PCCP 기출문제]"
- "[PCCE 기출문제]"

**주의사항**:
- 일부 문제는 카테고리가 없을 수 있음
- Optional 처리 필요

**예제**:
```typescript
const categoryEl = await row.$('td.title small.part-title');
const category = categoryEl
  ? await categoryEl.evaluate(el => el.textContent?.trim())
  : '기타';
```

---

### 5. 난이도 (Level)

**Selector**: `td.level span[class*="level-"]`

**설명**: level 클래스의 td 내부 span

**클래스 패턴**:
- `level-1`: Lv. 1
- `level-2`: Lv. 2
- `level-3`: Lv. 3
- `level-4`: Lv. 4
- `level-5`: Lv. 5
- `level-0`: Lv. 0 (존재하는 경우)

**추출 방법 1 (텍스트)**:
```typescript
const levelSpan = await row.$('td.level span[class*="level-"]');
const levelText = await levelSpan?.evaluate(el => el.textContent?.trim());
// "Lv. 3" → 3으로 파싱
const level = parseInt(levelText?.match(/Lv\. (\d+)/)?.[1] || '0');
```

**추출 방법 2 (클래스)**:
```typescript
const levelClass = await levelSpan?.evaluate(el => el.className);
// "level-3" → 3으로 파싱
const level = parseInt(levelClass?.match(/level-(\d+)/)?.[1] || '0');
```

**권장**: 클래스 기반 추출 (더 안정적)

---

### 6. 완료한 사람 (Finished Count)

**Selector**: `td.finished-count`

**설명**: 해당 문제를 완료한 사람 수

**형식**:
- "350명"
- "9,831명" (천 단위 콤마 포함)

**파싱 예제**:
```typescript
const finishedText = await row.$eval('td.finished-count', el => el.textContent?.trim());
const finishedCount = parseInt(finishedText?.replace(/,/g, '').replace('명', '') || '0');
```

---

### 7. 정답률 (Acceptance Rate)

**Selector**: `td.acceptance-rate`

**설명**: 문제 정답률

**형식**: "4%", "36%", "50%"

**파싱 예제**:
```typescript
const rateText = await row.$eval('td.acceptance-rate', el => el.textContent?.trim());
const acceptanceRate = parseInt(rateText?.replace('%', '') || '0');
```

---

### 8. 풀이 상태 (Solved Status)

**Selector**: `td.status`

**설명**: 사용자가 해당 문제를 풀었는지 여부

**클래스 패턴**:
- `status unsolved`: 미해결
- `status solved`: 해결 (로그인 상태)

**주의사항**:
- **비로그인 상태에서는 항상 `unsolved`**
- 프로그래머스 통합 시 사용자 풀이 상태는 별도 API 필요
- 검색 단계에서는 무시 가능

---

### 9. 페이지네이션 (Pagination)

**Selector**: 조사 필요 (다음 단계에서 확인)

**URL 패턴**:
```
?order=recent&page=1&levels=1
?order=recent&page=2&levels=1
```

**구현 방법**:
- URL 파라미터 변경으로 처리
- 별도 selector 불필요

---

## 검색 필터 URL 파라미터

### Query Parameters

| 파라미터 | 설명 | 값 예시 | 기본값 |
|---------|-----|---------|-------|
| `order` | 정렬 순서 | `recent`, `accuracy`, `popular` | `recent` |
| `page` | 페이지 번호 | `1`, `2`, `3`, ... | `1` |
| `levels` | 난이도 필터 | `1`, `2`, `3`, `4`, `5` (콤마 구분) | 없음 |
| `query` | 검색어 | 문자열 | 없음 |

### 예제 URL

```
# 레벨 1 문제, 최신순
https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=1

# 레벨 1, 2 문제, 정확도순
https://school.programmers.co.kr/learn/challenges?order=accuracy&page=1&levels=1,2

# 인기순, 2페이지
https://school.programmers.co.kr/learn/challenges?order=popular&page=2

# 검색어 포함
https://school.programmers.co.kr/learn/challenges?query=동적계획법
```

---

## Puppeteer 대기 전략

### 1. 페이지 로딩

```typescript
await page.goto(url, {
  waitUntil: 'networkidle2',
  timeout: 30000,
});
```

**설명**: 네트워크 요청이 500ms 동안 2개 이하일 때까지 대기

### 2. JavaScript 렌더링 대기

```typescript
await page.waitForSelector('table tbody tr', {
  timeout: 10000,
});
```

**설명**: 문제 행이 렌더링될 때까지 대기

### 3. 추가 안정화 대기 (선택적)

```typescript
await new Promise(resolve => setTimeout(resolve, 1000));
```

**설명**: JavaScript 완전 렌더링 보장 (필요시)

---

## 데이터 추출 전체 예제

```typescript
const problems = await page.$$eval('table tbody tr', rows => {
  return rows.map(row => {
    const titleLink = row.querySelector('td.title a[href*="/lessons/"]');
    const categoryEl = row.querySelector('td.title small.part-title');
    const levelSpan = row.querySelector('td.level span[class*="level-"]');

    const href = titleLink?.getAttribute('href') || '';
    const problemId = href.match(/lessons\/(\d+)/)?.[1] || '';
    const title = titleLink?.textContent?.trim() || '';
    const category = categoryEl?.textContent?.trim() || '기타';
    const levelClass = levelSpan?.className || '';
    const level = parseInt(levelClass.match(/level-(\d+)/)?.[1] || '0');

    return {
      problemId,
      title,
      level,
      category,
      url: `https://school.programmers.co.kr${href}`,
    };
  });
});
```

---

## 주의사항 및 Best Practices

### 1. Styled-component 클래스명 변경 가능

- `ChallengesTablestyle__Table-sc-wt0ety-4` 같은 해시는 빌드마다 변경
- **일반 태그 선택자 사용 권장**: `table`, `tbody`, `tr`, `td`

### 2. 빈 결과 처리

- 검색 조건에 맞는 문제가 없을 경우 tbody가 비어있을 수 있음
- `rows.length === 0` 체크 필요

### 3. 타임아웃 처리

- 프로그래머스 서버 응답 지연 가능
- `page.goto()` 및 `waitForSelector()`에 적절한 타임아웃 설정

### 4. 에러 시 스크린샷

```typescript
try {
  await page.waitForSelector('table tbody tr', { timeout: 10000 });
} catch (error) {
  await page.screenshot({ path: 'error-screenshot.png' });
  throw new Error('Failed to load problem list');
}
```

### 5. 메모리 관리

- BrowserPool 사용으로 브라우저 인스턴스 재사용
- 반드시 `browserPool.release(browser)` 호출

---

## 변경 이력

| 날짜 | 변경 내용 | 작성자 |
|------|----------|--------|
| 2026-02-15 | 초기 작성 (Puppeteer 자동 조사 결과) | project-planner |

---

## 참고 자료

- 조사 스크립트: `/scripts/investigate-programmers.ts`
- 테이블 분석 스크립트: `/scripts/analyze-table-structure.ts`
- 스크린샷: `/docs/02-development/programmers-search-screenshot.png`
- 원본 HTML: `/docs/02-development/programmers-search-page.html`
