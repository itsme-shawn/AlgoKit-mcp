/**
 * ProblemAnalyzer 서비스
 *
 * 문제 분석 및 구조화된 힌트 데이터 생성 (Keyless Architecture)
 */

import type { SolvedAcClient } from '../api/solvedac-client.js';
import type { Problem, Tag } from '../api/types.js';
import type {
  ProblemAnalysis,
  DifficultyContext,
  AlgorithmInfo,
  HintPoint,
  Constraint,
  Gotcha,
  HintPattern,
} from '../types/analysis.js';
import { levelToTier, getTierBadge } from '../utils/tier-converter.js';

/**
 * 태그 기반 힌트 패턴 매핑 (정적 데이터)
 */
const HINT_PATTERNS: Record<string, HintPattern> = {
  dp: {
    level1: {
      key: '동적 프로그래밍',
      detail: 'DP의 전형적인 최적 부분 구조를 가진 문제입니다. 큰 문제를 작은 부분 문제로 나누어 해결할 수 있습니다.',
    },
    level2: {
      key: '상태 정의와 점화식',
      detail: 'dp[i]의 의미를 명확히 정의하고, 이전 상태에서 현재 상태로 전이하는 점화식을 세워야 합니다.',
      example: 'dp[i] = min(dp[i-1], dp[i/2], dp[i/3]) + 1',
    },
    level3: {
      key: 'Bottom-up 또는 Top-down 구현',
      steps: [
        '1. 상태 정의 (dp[i]의 의미)',
        '2. 초기값 설정 (base case)',
        '3. 점화식 구현 (recurrence relation)',
        '4. 계산 순서 결정 (bottom-up) 또는 메모이제이션 (top-down)',
        '5. 최종 답 반환',
      ],
    },
  },
  greedy: {
    level1: {
      key: '그리디 알고리즘',
      detail: '각 단계에서 지역적 최선의 선택이 전역 최적해를 보장하는 문제입니다.',
    },
    level2: {
      key: '정렬과 선택 전략',
      detail: '입력을 적절히 정렬한 후, 그리디 선택 속성을 이용해 단계적으로 해를 구성합니다.',
      example: '시간 순 정렬 → 빠른 종료 시간부터 선택',
    },
    level3: {
      key: '그리디 구현',
      steps: [
        '1. 그리디 선택 기준 정의',
        '2. 입력 정렬 (필요시)',
        '3. 반복문으로 순차 선택',
        '4. 선택한 요소 누적',
        '5. 최종 결과 반환',
      ],
    },
  },
  graphs: {
    level1: {
      key: '그래프 탐색',
      detail: '그래프 구조를 탐색하여 해를 찾는 문제입니다. DFS 또는 BFS를 활용할 수 있습니다.',
    },
    level2: {
      key: '탐색 전략',
      detail: '깊이 우선 탐색(DFS)은 스택 또는 재귀로, 너비 우선 탐색(BFS)은 큐를 사용합니다.',
      example: 'BFS: 최단 거리, DFS: 경로 탐색',
    },
    level3: {
      key: '그래프 탐색 구현',
      steps: [
        '1. 그래프 표현 (인접 리스트/행렬)',
        '2. 방문 체크 배열 준비',
        '3. 탐색 방법 선택 (DFS/BFS)',
        '4. 탐색 수행',
        '5. 결과 반환',
      ],
    },
  },
  math: {
    level1: {
      key: '수학적 접근',
      detail: '수학적 공식이나 원리를 활용하여 해결하는 문제입니다.',
    },
    level2: {
      key: '공식 또는 정리 적용',
      detail: '문제에서 요구하는 수학적 관계를 파악하고 적절한 공식을 적용합니다.',
      example: '등차수열, 등비수열, 조합론, 정수론 등',
    },
    level3: {
      key: '수학 문제 구현',
      steps: [
        '1. 문제의 수학적 관계 파악',
        '2. 공식 또는 알고리즘 선택',
        '3. 오버플로우 주의',
        '4. 계산 수행',
        '5. 결과 반환',
      ],
    },
  },
  implementation: {
    level1: {
      key: '구현 문제',
      detail: '알고리즘 없이 문제 조건을 그대로 구현하는 문제입니다.',
    },
    level2: {
      key: '조건 분기와 반복',
      detail: '문제에서 주어진 조건을 if-else와 반복문으로 정확히 구현합니다.',
      example: '시뮬레이션, 조건부 출력 등',
    },
    level3: {
      key: '구현 단계',
      steps: [
        '1. 입력 파싱',
        '2. 문제 조건 분석',
        '3. 조건에 따른 로직 구현',
        '4. 출력 형식 준수',
      ],
    },
  },
  string: {
    level1: {
      key: '문자열 처리',
      detail: '문자열을 다루는 문제입니다. 문자열 조작, 검색, 패턴 매칭 등이 필요합니다.',
    },
    level2: {
      key: '문자열 알고리즘',
      detail: '문자열 내장 함수 또는 알고리즘(KMP, 라빈-카프 등)을 활용합니다.',
      example: 'find(), substring(), split() 등',
    },
    level3: {
      key: '문자열 처리 구현',
      steps: [
        '1. 입력 문자열 파싱',
        '2. 필요한 연산 선택',
        '3. 문자열 조작 수행',
        '4. 결과 반환',
      ],
    },
  },
  data_structures: {
    level1: {
      key: '자료구조',
      detail: '적절한 자료구조(스택, 큐, 힙, 트리 등)를 선택하여 효율적으로 해결하는 문제입니다.',
    },
    level2: {
      key: '자료구조 선택',
      detail: '문제의 특성에 맞는 자료구조를 선택합니다.',
      example: 'LIFO → 스택, FIFO → 큐, 우선순위 → 힙',
    },
    level3: {
      key: '자료구조 활용',
      steps: [
        '1. 문제 특성 파악',
        '2. 적합한 자료구조 선택',
        '3. 자료구조 초기화',
        '4. 연산 수행',
        '5. 결과 반환',
      ],
    },
  },
};

/**
 * 태그 설명 (한글)
 */
const TAG_EXPLANATIONS: Record<string, string> = {
  dp: '큰 문제를 작은 부분 문제로 나누어 해결하는 동적 프로그래밍 기법. 중복 계산을 메모이제이션으로 방지합니다.',
  greedy: '각 단계에서 지역적 최선의 선택이 전역 최적해로 이어지는 그리디 알고리즘.',
  graphs: '정점과 간선으로 이루어진 그래프를 탐색하거나 분석하는 문제.',
  graph_traversal: '그래프를 깊이 우선 탐색(DFS) 또는 너비 우선 탐색(BFS)으로 순회합니다.',
  math: '수학적 공식, 정리, 원리를 활용하여 해결하는 문제.',
  implementation: '특별한 알고리즘 없이 문제 조건을 그대로 구현하는 문제.',
  string: '문자열을 다루는 문제. 문자열 조작, 검색, 패턴 매칭 등이 필요합니다.',
  data_structures: '스택, 큐, 힙, 트리 등의 자료구조를 활용하는 문제.',
  bruteforcing: '모든 경우의 수를 탐색하여 해를 찾는 완전 탐색 문제.',
  sorting: '정렬을 활용하여 해결하는 문제.',
  binary_search: '이분 탐색을 사용하여 탐색 범위를 절반씩 줄여나가는 문제.',
  backtracking: '백트래킹을 사용하여 가능한 경우를 탐색하되, 불가능한 경우는 가지치기하는 문제.',
  two_pointer: '두 개의 포인터를 사용하여 효율적으로 탐색하는 문제.',
  prefix_sum: '누적 합을 미리 계산하여 구간 합을 빠르게 구하는 문제.',
};

/**
 * ProblemAnalyzer 클래스
 */
export class ProblemAnalyzer {
  constructor(private apiClient: SolvedAcClient) {}

  /**
   * 문제 분석 및 힌트 포인트 생성
   */
  async analyze(
    problemId: number,
    includeSimilar = true
  ): Promise<ProblemAnalysis> {
    // 1. 문제 정보 조회
    const problem = await this.apiClient.getProblem(problemId);

    // 2. 난이도 컨텍스트 생성
    const difficulty = this.buildDifficultyContext(problem);

    // 3. 알고리즘 정보 생성
    const algorithm = this.buildAlgorithmInfo(problem);

    // 4. 힌트 포인트 생성 (레벨 1-3)
    const hintPoints = this.generateHintPoints(problem);

    // 5. 제약사항 추출
    const constraints = this.extractConstraints(problem);

    // 6. 주의사항 생성
    const gotchas = this.generateGotchas(problem);

    // 7. 유사 문제 추천
    const similarProblems = includeSimilar
      ? await this.findSimilarProblems(problem)
      : [];

    return {
      problem,
      difficulty,
      algorithm,
      hint_points: hintPoints,
      constraints,
      gotchas,
      similar_problems: similarProblems,
    };
  }

  /**
   * 난이도 컨텍스트 빌드
   */
  private buildDifficultyContext(problem: Problem): DifficultyContext {
    const tier = levelToTier(problem.level);
    const badge = getTierBadge(problem.level);
    const emoji = badge.split(' ')[0]; // "🟡 Gold I" → "🟡"

    const percentile = this.getPercentile(problem.level);

    // 컨텍스트 문자열
    const primaryTag = problem.tags[0]?.displayNames.find(dn => dn.language === 'ko')?.name || '알고리즘';
    const tierGroup = tier.split(' ')[0]; // "Silver II" → "Silver"
    const context = `${tierGroup} 난이도의 ${primaryTag} 문제`;

    return {
      tier,
      level: problem.level,
      emoji,
      percentile,
      context,
    };
  }

  /**
   * 백분위 계산
   */
  private getPercentile(level: number): string {
    if (level <= 5) return '입문';
    if (level <= 10) return '초급 (상위 70-80%)';
    if (level <= 15) return '중급 (상위 40-60%)';
    if (level <= 20) return '중상급 (상위 10-30%)';
    if (level <= 25) return '고급 (상위 3-10%)';
    return '최상급 (상위 1%)';
  }

  /**
   * 알고리즘 정보 빌드
   */
  private buildAlgorithmInfo(problem: Problem): AlgorithmInfo {
    // 태그 이름 추출 (한글)
    const primaryTags = problem.tags.map(tag =>
      tag.displayNames.find(dn => dn.language === 'ko')?.name || tag.key
    );

    // 태그별 설명
    const tagExplanations: Record<string, string> = {};
    for (const tag of problem.tags) {
      const explanation = TAG_EXPLANATIONS[tag.key];
      if (explanation) {
        tagExplanations[tag.key] = explanation;
      }
    }

    // 일반적인 접근법
    const typicalApproaches = this.getTypicalApproaches(problem.tags);

    // 복잡도 추정
    const timeComplexity = this.estimateComplexity(problem);
    const spaceComplexity = this.estimateSpaceComplexity(problem);

    return {
      primary_tags: primaryTags,
      tag_explanations: tagExplanations,
      typical_approaches: typicalApproaches,
      time_complexity_typical: timeComplexity,
      space_complexity_typical: spaceComplexity,
    };
  }

  /**
   * 일반적인 접근법 추출
   */
  private getTypicalApproaches(tags: Tag[]): string[] {
    const approaches: string[] = [];

    for (const tag of tags) {
      switch (tag.key) {
        case 'dp':
          approaches.push('Bottom-up DP', 'Top-down DP (재귀 + 메모)');
          break;
        case 'greedy':
          approaches.push('정렬 후 탐욕적 선택');
          break;
        case 'graphs':
        case 'graph_traversal':
          approaches.push('DFS (깊이 우선 탐색)', 'BFS (너비 우선 탐색)');
          break;
        case 'math':
          approaches.push('수학적 공식 적용');
          break;
        case 'implementation':
          approaches.push('직접 구현');
          break;
        case 'string':
          approaches.push('문자열 내장 함수 활용');
          break;
        case 'data_structures':
          approaches.push('적절한 자료구조 선택');
          break;
        case 'bruteforcing':
          approaches.push('완전 탐색');
          break;
        case 'sorting':
          approaches.push('정렬 알고리즘 활용');
          break;
        case 'binary_search':
          approaches.push('이분 탐색');
          break;
      }
    }

    // 중복 제거 및 기본값
    const uniqueApproaches = [...new Set(approaches)];
    return uniqueApproaches.length > 0 ? uniqueApproaches : ['문제 조건 분석 후 구현'];
  }

  /**
   * 시간 복잡도 추정
   */
  private estimateComplexity(problem: Problem): string {
    const primaryTag = problem.tags[0]?.key || 'implementation';

    switch (primaryTag) {
      case 'dp':
        return 'O(N) ~ O(N²)';
      case 'greedy':
        return 'O(N log N)';
      case 'graphs':
      case 'graph_traversal':
        return 'O(V + E)';
      case 'math':
        return 'O(1) ~ O(log N)';
      case 'implementation':
        return 'O(N)';
      case 'sorting':
        return 'O(N log N)';
      case 'binary_search':
        return 'O(log N)';
      default:
        return 'O(N)';
    }
  }

  /**
   * 공간 복잡도 추정
   */
  private estimateSpaceComplexity(problem: Problem): string {
    const primaryTag = problem.tags[0]?.key || 'implementation';

    switch (primaryTag) {
      case 'dp':
        return 'O(N) ~ O(N²)';
      case 'graphs':
      case 'graph_traversal':
        return 'O(V + E)';
      default:
        return 'O(1) ~ O(N)';
    }
  }

  /**
   * 힌트 포인트 생성 (레벨 1-3)
   */
  private generateHintPoints(problem: Problem): HintPoint[] {
    const points: HintPoint[] = [];

    // 주요 태그 선택
    const primaryTag = problem.tags[0]?.key || 'implementation';
    const pattern = HINT_PATTERNS[primaryTag] || HINT_PATTERNS['implementation'];

    // 레벨 1: 패턴 인식
    points.push({
      level: 1,
      type: 'pattern',
      key: pattern.level1.key,
      detail: pattern.level1.detail,
    });

    // 레벨 2: 핵심 통찰
    points.push({
      level: 2,
      type: 'insight',
      key: pattern.level2.key,
      detail: pattern.level2.detail,
      example: pattern.level2.example,
    });

    // 레벨 3: 전략 단계
    points.push({
      level: 3,
      type: 'strategy',
      key: pattern.level3.key,
      steps: pattern.level3.steps,
    });

    return points;
  }

  /**
   * 제약사항 추출
   */
  private extractConstraints(problem: Problem): Constraint[] {
    const constraints: Constraint[] = [];

    // 난이도에 따른 일반적인 제약사항
    if (problem.level <= 5) {
      constraints.push({
        type: 'input_range',
        description: '작은 입력 범위 (N ≤ 1,000)',
        importance: 'low',
      });
    } else if (problem.level <= 10) {
      constraints.push({
        type: 'input_range',
        description: '중간 입력 범위 (N ≤ 100,000)',
        importance: 'medium',
      });
    } else {
      constraints.push({
        type: 'input_range',
        description: '큰 입력 범위 (N ≤ 1,000,000 이상)',
        importance: 'high',
      });
    }

    return constraints;
  }

  /**
   * 주의사항 생성
   */
  private generateGotchas(problem: Problem): Gotcha[] {
    const gotchas: Gotcha[] = [];

    const primaryTag = problem.tags[0]?.key || 'implementation';

    switch (primaryTag) {
      case 'dp':
        gotchas.push({
          description: 'Top-down 재귀는 큰 입력에서 스택 오버플로우 가능',
          severity: 'medium',
        });
        break;
      case 'greedy':
        gotchas.push({
          description: '그리디 선택 속성이 성립하는지 증명 필요',
          severity: 'high',
        });
        break;
      case 'graphs':
        gotchas.push({
          description: '방문 체크를 누락하면 무한 루프 발생',
          severity: 'high',
        });
        break;
      case 'math':
        gotchas.push({
          description: '오버플로우 주의 (큰 수 계산 시)',
          severity: 'medium',
        });
        break;
    }

    return gotchas;
  }

  /**
   * 유사 문제 추천
   */
  private async findSimilarProblems(problem: Problem): Promise<Problem[]> {
    try {
      const primaryTag = problem.tags[0]?.key;
      if (!primaryTag) return [];

      // ±2 티어 범위
      const levelMin = Math.max(1, problem.level - 2);
      const levelMax = Math.min(30, problem.level + 2);

      const results = await this.apiClient.searchProblems({
        tag: primaryTag,
        level_min: levelMin,
        level_max: levelMax,
        sort: 'level',
        direction: 'asc',
      });

      // 현재 문제 제외하고 최대 5개
      return results.items
        .filter(p => p.problemId !== problem.problemId)
        .slice(0, 5);
    } catch (error) {
      // 에러 발생 시 빈 배열 반환
      return [];
    }
  }
}
