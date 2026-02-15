/**
 * BOJ HTML 파싱 유틸리티
 *
 * Phase 6 - P6-002: 문제 본문 스크래퍼 구현
 *
 * cheerio를 사용하여 BOJ 문제 페이지를 파싱합니다.
 */

import * as cheerio from 'cheerio';
import type { ProblemContent, ProblemExample, ProblemLimits } from '../types/problem-content.js';

/**
 * BOJ 페이지 CSS Selector 정의
 */
const BOJ_SELECTORS = {
  /** 문제 제목 */
  title: '#problem_title',
  /** 문제 설명 */
  description: '#problem_description',
  /** 입력 형식 */
  input: '#problem_input',
  /** 출력 형식 */
  output: '#problem_output',
  /** 예제 입력 (n은 1부터 시작) */
  sampleInput: (n: number) => `#sample-input-${n}`,
  /** 예제 출력 (n은 1부터 시작) */
  sampleOutput: (n: number) => `#sample-output-${n}`,
  /** 시간 제한 */
  timeLimit: '#problem-info tbody tr td:nth-child(1)',
  /** 메모리 제한 */
  memoryLimit: '#problem-info tbody tr td:nth-child(2)',
} as const;

/**
 * HTML 파싱 에러
 */
export class HtmlParseError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'HtmlParseError';
  }
}

/**
 * BOJ 문제 페이지 HTML을 파싱하여 구조화된 데이터로 변환
 *
 * @param html - BOJ 문제 페이지의 HTML 문자열
 * @param problemId - 문제 번호
 * @returns 파싱된 문제 콘텐츠
 * @throws {HtmlParseError} 필수 필드 파싱 실패 시
 *
 * @example
 * ```typescript
 * const html = await scraper.fetchProblemPage(1000);
 * const content = parseProblemContent(html, 1000);
 * console.log(content.title); // "A+B"
 * console.log(content.examples[0].input); // "1 2"
 * ```
 */
export function parseProblemContent(html: string, problemId: number): ProblemContent {
  const $ = cheerio.load(html);

  // 1. 제목 추출
  const title = parseTitle($);

  // 2. 설명 추출
  const description = parseDescription($);

  // 3. 입력 형식 추출
  const inputFormat = parseInputFormat($);

  // 4. 출력 형식 추출
  const outputFormat = parseOutputFormat($);

  // 5. 예제 추출
  const examples = parseExamples($);

  // 6. 제한사항 추출
  const limits = parseLimits($);

  // 현재 시각 및 만료 시각 계산
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30일 후

  return {
    problemId,
    title,
    description,
    inputFormat,
    outputFormat,
    examples,
    limits,
    metadata: {
      fetchedAt: now.toISOString(),
      source: 'web',
      cacheExpiresAt: expiresAt.toISOString(),
    },
  };
}

/**
 * 제목 파싱
 */
function parseTitle($: cheerio.Root): string {
  const title = $(BOJ_SELECTORS.title).text().trim();

  if (!title) {
    throw new HtmlParseError('문제 제목을 찾을 수 없습니다.', 'title');
  }

  return title;
}

/**
 * 설명 파싱
 */
function parseDescription($: cheerio.Root): string {
  const description = $(BOJ_SELECTORS.description).text().trim();

  if (!description) {
    throw new HtmlParseError('문제 설명을 찾을 수 없습니다.', 'description');
  }

  // 여러 줄 공백을 단일 공백으로 치환
  return description.replace(/\s+/g, ' ').trim();
}

/**
 * 입력 형식 파싱
 */
function parseInputFormat($: cheerio.Root): string {
  const input = $(BOJ_SELECTORS.input).text().trim();

  if (!input) {
    throw new HtmlParseError('입력 형식을 찾을 수 없습니다.', 'inputFormat');
  }

  return input.replace(/\s+/g, ' ').trim();
}

/**
 * 출력 형식 파싱
 */
function parseOutputFormat($: cheerio.Root): string {
  const output = $(BOJ_SELECTORS.output).text().trim();

  if (!output) {
    throw new HtmlParseError('출력 형식을 찾을 수 없습니다.', 'outputFormat');
  }

  return output.replace(/\s+/g, ' ').trim();
}

/**
 * 예제 입출력 파싱
 */
function parseExamples($: cheerio.Root): ProblemExample[] {
  const examples: ProblemExample[] = [];

  // 최대 10개의 예제 확인
  for (let i = 1; i <= 10; i++) {
    const inputSelector = BOJ_SELECTORS.sampleInput(i);
    const outputSelector = BOJ_SELECTORS.sampleOutput(i);

    const input = $(inputSelector).text();
    const output = $(outputSelector).text();

    // 더 이상 예제가 없으면 종료
    if (!input && !output) {
      break;
    }

    // 입력 또는 출력 중 하나만 있으면 경고 (일부 문제는 이럴 수 있음)
    if (!input || !output) {
      console.warn(`예제 ${i}번의 입력 또는 출력이 누락되었습니다.`);
      continue;
    }

    examples.push({
      input: input.trim(),
      output: output.trim(),
    });
  }

  if (examples.length === 0) {
    throw new HtmlParseError('예제를 찾을 수 없습니다.', 'examples');
  }

  return examples;
}

/**
 * 시간/메모리 제한 파싱
 */
function parseLimits($: cheerio.Root): ProblemLimits {
  const timeLimit = $(BOJ_SELECTORS.timeLimit).text().trim();
  const memoryLimit = $(BOJ_SELECTORS.memoryLimit).text().trim();

  if (!timeLimit || !memoryLimit) {
    throw new HtmlParseError('시간 또는 메모리 제한을 찾을 수 없습니다.', 'limits');
  }

  return {
    timeLimit,
    memoryLimit,
  };
}

/**
 * HTML 엔티티 디코딩 (cheerio가 대부분 처리하지만 보조 함수로 제공)
 *
 * @param text - HTML 엔티티가 포함된 텍스트
 * @returns 디코딩된 텍스트
 */
export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' ',
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
  };

  return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
}

// ============================================================================
// 프로그래머스 (Programmers) HTML 파싱
// ============================================================================

import type {
  ProgrammersProblemDetail,
  ProgrammersExample,
} from '../types/programmers.js';

/**
 * 프로그래머스 페이지 CSS Selector 정의
 */
const PROGRAMMERS_SELECTORS = {
  /** 제목 */
  title: '.challenge-title',
  /** 카테고리 (breadcrumb - 두 번째 li의 a 태그) */
  categoryBreadcrumb: '.breadcrumb li:nth-child(2) a',
  /** 레벨 (data attribute) */
  levelDataAttr: '.lesson-content',
  /** 문제 설명 */
  description: '.guide-section-description',
  /** 제한사항 섹션 */
  constraintsHeading: 'h5:contains("제한사항")',
  /** 입출력 예제 테이블 */
  examplesTable: 'table',
} as const;

/**
 * 프로그래머스 문제 페이지 HTML을 파싱하여 구조화된 데이터로 변환
 *
 * @param html - 프로그래머스 문제 페이지의 HTML 문자열
 * @param problemId - 문제 ID
 * @returns 파싱된 문제 콘텐츠
 * @throws {HtmlParseError} 필수 필드 파싱 실패 시
 *
 * @example
 * ```typescript
 * const html = await scraper.fetchProblemPage('389632');
 * const content = parseProgrammersProblemContent(html, '389632');
 * console.log(content.title); // "문자열과 알파벳과 쿼리"
 * ```
 */
export function parseProgrammersProblemContent(
  html: string,
  problemId: string
): ProgrammersProblemDetail {
  const $ = cheerio.load(html);

  // 1. 제목 추출
  const title = parseProgrammersTitle($);

  // 2. 레벨 추출 (data attribute)
  const level = parseProgrammersLevel($);

  // 3. 카테고리 추출
  const category = parseProgrammersCategory($);

  // 4. 문제 설명 추출
  const description = parseProgrammersDescription($);

  // 5. 제한사항 추출
  const constraints = parseProgrammersConstraints($);

  // 6. 입출력 예제 추출
  const examples = parseProgrammersExamples($);

  // 7. 태그 추출 (프로그래머스는 태그 정보 없음, 빈 배열)
  const tags: string[] = [];

  return {
    problemId,
    title,
    level,
    category,
    description,
    constraints,
    examples,
    tags,
  };
}

/**
 * 프로그래머스 제목 파싱
 */
function parseProgrammersTitle($: cheerio.Root): string {
  const title = $(PROGRAMMERS_SELECTORS.title).text().trim();

  if (!title) {
    throw new HtmlParseError('문제 제목을 찾을 수 없습니다.', 'title');
  }

  return title;
}

/**
 * 프로그래머스 레벨 파싱 (data attribute)
 */
function parseProgrammersLevel($: cheerio.Root): number {
  const levelAttr = $(PROGRAMMERS_SELECTORS.levelDataAttr).attr(
    'data-challenge-level'
  );

  if (!levelAttr) {
    // 레벨 정보 없으면 0 (일부 문제는 레벨 없음)
    return 0;
  }

  const level = parseInt(levelAttr, 10);
  if (isNaN(level) || level < 0 || level > 5) {
    throw new HtmlParseError(
      `유효하지 않은 레벨: ${levelAttr}`,
      'level'
    );
  }

  return level;
}

/**
 * 프로그래머스 카테고리 파싱
 */
function parseProgrammersCategory($: cheerio.Root): string {
  const category = $(PROGRAMMERS_SELECTORS.categoryBreadcrumb).text().trim();

  if (!category) {
    // 카테고리 없는 경우 기본값
    return '기타';
  }

  return category;
}

/**
 * 프로그래머스 설명 파싱
 */
function parseProgrammersDescription($: cheerio.Root): string {
  const descEl = $(PROGRAMMERS_SELECTORS.description).first();

  if (!descEl.length) {
    throw new HtmlParseError(
      '문제 설명을 찾을 수 없습니다.',
      'description'
    );
  }

  // HTML 그대로 반환 (마크다운 형식 포함)
  const html = descEl.html();
  if (!html) {
    throw new HtmlParseError(
      '문제 설명이 비어있습니다.',
      'description'
    );
  }

  return html.trim();
}

/**
 * 프로그래머스 제한사항 파싱
 */
function parseProgrammersConstraints($: cheerio.Root): string[] {
  const constraints: string[] = [];

  // "제한사항" 섹션 찾기
  const heading = $(PROGRAMMERS_SELECTORS.constraintsHeading);
  if (!heading.length) {
    // 제한사항 없는 문제도 있음 (빈 배열 반환)
    return constraints;
  }

  // 다음 요소 (ul 또는 div) 가져오기
  let next = heading.next();
  while (next.length > 0) {
    const tagName = next.prop('tagName');
    if (!tagName) break;

    // ul이면 li 항목들 추출
    if (tagName.toLowerCase() === 'ul') {
      next.find('li').each((_, li) => {
        const text = $(li).text().trim();
        if (text) {
          constraints.push(text);
        }
      });
      break;
    }

    // div면 텍스트 추출
    if (tagName.toLowerCase() === 'div') {
      const text = next.text().trim();
      if (text) {
        constraints.push(text);
      }
    }

    // 다음 h6 (새 섹션) 만나면 종료
    if (tagName.toLowerCase() === 'h6') {
      break;
    }

    next = next.next();
  }

  return constraints;
}

/**
 * 프로그래머스 입출력 예제 파싱
 */
function parseProgrammersExamples($: cheerio.Root): ProgrammersExample[] {
  const examples: ProgrammersExample[] = [];

  // 입출력 예제 테이블 찾기
  $(PROGRAMMERS_SELECTORS.examplesTable).each((_, table) => {
    const headers = $(table)
      .find('thead th')
      .map((_, th) => $(th).text().trim().toLowerCase())
      .get();

    // "입출력 예" 테이블인지 확인
    if (headers.length < 2) return;

    // tbody tr 순회
    $(table)
      .find('tbody tr')
      .each((_, row) => {
        const cells = $(row).find('td');
        if (cells.length < 2) return;

        const input = $(cells[0]).text().trim();
        const output = $(cells[1]).text().trim();

        // 입력 또는 출력이 비어있으면 스킵
        if (!input || !output) return;

        examples.push({
          input,
          output,
          // 3번째 열이 있으면 설명
          explanation: cells.length >= 3 ? $(cells[2]).text().trim() : undefined,
        });
      });
  });

  if (examples.length === 0) {
    // 예제가 없는 문제도 있음 (경고만 출력)
    console.warn('입출력 예제를 찾을 수 없습니다.');
  }

  return examples;
}
