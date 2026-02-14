/**
 * 프로그래머스 관련 타입 정의
 */

/**
 * 프로그래머스 문제 검색 옵션
 */
export interface ProgrammersSearchOptions {
  /** 난이도 필터 (0-5) */
  levels?: number[];
  /** 카테고리 필터 */
  categories?: string[];
  /** 정렬 순서 */
  order?: 'recent' | 'accuracy' | 'popular';
  /** 페이지 번호 (1부터 시작) */
  page?: number;
  /** 반환할 최대 문제 수 */
  limit?: number;
  /** 검색어 */
  query?: string;
}

/**
 * 프로그래머스 문제 요약 정보 (검색 결과)
 */
export interface ProgrammersProblemSummary {
  /** 문제 ID */
  problemId: string;
  /** 문제 제목 */
  title: string;
  /** 난이도 (0-5) */
  level: number;
  /** 카테고리 */
  category: string;
  /** 문제 URL */
  url: string;
  /** 완료한 사람 수 (optional) */
  finishedCount?: number;
  /** 정답률 (0-100, optional) */
  acceptanceRate?: number;
}

/**
 * 프로그래머스 문제 상세 정보 (상세 페이지)
 */
export interface ProgrammersProblemDetail {
  /** 문제 ID */
  problemId: string;
  /** 문제 제목 */
  title: string;
  /** 난이도 (0-5) */
  level: number;
  /** 카테고리 */
  category: string;
  /** 문제 설명 (HTML) */
  description: string;
  /** 제한사항 */
  constraints: string[];
  /** 입출력 예시 */
  examples: ProgrammersExample[];
  /** 태그 */
  tags: string[];
}

/**
 * 입출력 예시
 */
export interface ProgrammersExample {
  /** 입력 */
  input: string;
  /** 출력 */
  output: string;
  /** 설명 (optional) */
  explanation?: string;
}
