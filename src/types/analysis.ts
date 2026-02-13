/**
 * 문제 분석 및 복습 템플릿 관련 타입 정의
 *
 * Keyless 아키텍처 Phase 3
 */

import type { Problem, Tag } from '../api/types.js';

/**
 * 문제 분석 결과
 */
export interface ProblemAnalysis {
  problem: Problem;
  difficulty: DifficultyContext;
  algorithm: AlgorithmInfo;
  hint_points: HintPoint[];
  constraints: Constraint[];
  gotchas: Gotcha[];
  similar_problems: Problem[];
  prompt_template?: string; // 선택적
}

/**
 * 난이도 컨텍스트
 */
export interface DifficultyContext {
  tier: string;           // "Silver II"
  level: number;          // 9
  emoji: string;          // "⚪"
  percentile: string;     // "상위 30-40%"
  context: string;        // "Silver 중상위권 DP 문제"
}

/**
 * 알고리즘 정보
 */
export interface AlgorithmInfo {
  primary_tags: string[];           // ["동적 프로그래밍", "그리디"]
  tag_explanations: Record<string, string>;
  typical_approaches: string[];
  time_complexity_typical: string;
  space_complexity_typical: string;
}

/**
 * 힌트 포인트
 */
export interface HintPoint {
  level: 1 | 2 | 3;
  type: 'pattern' | 'insight' | 'strategy' | 'implementation';
  key: string;
  detail?: string;
  steps?: string[];
  example?: string;
}

/**
 * 제약사항
 */
export interface Constraint {
  type: 'input_range' | 'time_limit' | 'memory_limit' | 'special';
  description: string;
  importance: 'low' | 'medium' | 'high';
}

/**
 * 주의사항 (Gotcha)
 */
export interface Gotcha {
  description: string;
  severity: 'low' | 'medium' | 'high';
  example?: string;
}

/**
 * 복습 템플릿
 */
export interface ReviewTemplate {
  template: string;
  problem_data: ProblemData;
  analysis: AnalysisInfo;
  related_problems: Problem[];
  prompts: GuidePrompts;
}

/**
 * 문제 데이터 (요약)
 */
export interface ProblemData {
  id: number;
  title: string;
  tier: string;
  tags: string[];
  stats: {
    acceptedUserCount: number;
    averageTries: number;
  };
}

/**
 * 분석 정보 (복습용)
 */
export interface AnalysisInfo {
  tags_explanation: Record<string, string>;
  difficulty_context: string;
  common_approaches: string[];
  time_complexity_typical: string;
  space_complexity_typical: string;
  common_mistakes: string[];
}

/**
 * 가이드 프롬프트
 */
export interface GuidePrompts {
  solution_approach: string;
  time_complexity: string;
  space_complexity: string;
  key_insights: string;
  difficulties: string;
}

/**
 * 힌트 패턴 (내부 사용)
 */
export interface HintPattern {
  level1: {
    key: string;
    detail: string;
  };
  level2: {
    key: string;
    detail: string;
    example?: string;
  };
  level3: {
    key: string;
    steps: string[];
  };
}
