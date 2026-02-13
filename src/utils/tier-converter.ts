/**
 * 백준 문제 티어(난이도) 변환 유틸리티
 *
 * solved.ac에서 사용하는 1-30 스케일의 레벨을
 * 사람이 읽기 쉬운 티어 이름으로 변환합니다.
 *
 * 티어 구조:
 * - 1-5: Bronze V-I
 * - 6-10: Silver V-I
 * - 11-15: Gold V-I
 * - 16-20: Platinum V-I
 * - 21-25: Diamond V-I
 * - 26-30: Ruby V-I
 */

/**
 * 티어 정의
 */
export const TIER_NAMES = {
  Bronze: { min: 1, max: 5, emoji: '🟤' },
  Silver: { min: 6, max: 10, emoji: '⚪' },
  Gold: { min: 11, max: 15, emoji: '🟡' },
  Platinum: { min: 16, max: 20, emoji: '🟢' },
  Diamond: { min: 21, max: 25, emoji: '🔵' },
  Ruby: { min: 26, max: 30, emoji: '🔴' },
} as const;

export type TierName = keyof typeof TIER_NAMES;

/**
 * 레벨 숫자를 티어 이름으로 변환
 *
 * @param level - 1-30 사이의 레벨 숫자
 * @returns 티어 이름 (예: "Gold I", "Silver V")
 * @throws {Error} 레벨이 1-30 범위를 벗어난 경우
 *
 * @example
 * levelToTier(15) // "Gold I"
 * levelToTier(6)  // "Silver V"
 */
export function levelToTier(level: number): string {
  // 입력 검증
  if (!Number.isInteger(level)) {
    throw new Error('Level must be an integer');
  }

  if (level < 1 || level > 30) {
    throw new Error('Level must be between 1 and 30');
  }

  // 티어 그룹 찾기
  for (const [tierName, tierInfo] of Object.entries(TIER_NAMES)) {
    if (level >= tierInfo.min && level <= tierInfo.max) {
      // 티어 내 등급 계산 (V, IV, III, II, I)
      const rankInTier = level - tierInfo.min;  // 0-4
      const romanNumerals = ['V', 'IV', 'III', 'II', 'I'];
      const rank = romanNumerals[rankInTier];

      return `${tierName} ${rank}`;
    }
  }

  // 이론적으로 도달 불가능
  throw new Error('Invalid tier calculation');
}

/**
 * 티어 이름을 레벨 범위로 변환
 *
 * @param tier - 티어 이름 (대소문자 무관)
 * @returns [최소 레벨, 최대 레벨] 튜플
 * @throws {Error} 유효하지 않은 티어 이름인 경우
 *
 * @example
 * tierToLevelRange("Gold")   // [11, 15]
 * tierToLevelRange("silver") // [6, 10]
 */
export function tierToLevelRange(tier: string): [number, number] {
  // 입력 검증 및 정규화
  if (typeof tier !== 'string' || tier.trim() === '') {
    throw new Error('Invalid tier name');
  }

  // 대소문자 무관 처리
  const normalizedTier = tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();

  // 티어 존재 확인
  if (!(normalizedTier in TIER_NAMES)) {
    throw new Error('Invalid tier name');
  }

  const tierInfo = TIER_NAMES[normalizedTier as TierName];
  return [tierInfo.min, tierInfo.max];
}

/**
 * 레벨에 해당하는 티어 뱃지 생성 (이모지 포함)
 *
 * @param level - 1-30 사이의 레벨 숫자
 * @returns 이모지와 티어 이름 (예: "🟡 Gold I")
 * @throws {Error} 레벨이 1-30 범위를 벗어난 경우
 *
 * @example
 * getTierBadge(15) // "🟡 Gold I"
 * getTierBadge(6)  // "⚪ Silver V"
 */
export function getTierBadge(level: number): string {
  // levelToTier에서 검증 수행
  const tierName = levelToTier(level);

  // 티어 그룹 찾기
  for (const [name, info] of Object.entries(TIER_NAMES)) {
    if (level >= info.min && level <= info.max) {
      return `${info.emoji} ${tierName}`;
    }
  }

  // 이론적으로 도달 불가능
  throw new Error('Invalid tier calculation');
}

/**
 * 레벨이 유효한 범위인지 검증
 *
 * @param level - 검증할 레벨
 * @returns 유효하면 true, 아니면 false
 */
export function isValidLevel(level: number): boolean {
  return Number.isInteger(level) && level >= 1 && level <= 30;
}

/**
 * 티어 문자열을 레벨 숫자로 변환
 *
 * @param tierString - 티어 문자열 (예: "실버 3", "Silver III", "골드 1", "Gold I")
 * @returns 해당하는 레벨 숫자 (1-30)
 * @throws {Error} 유효하지 않은 티어 문자열인 경우
 *
 * @example
 * parseTierString("실버 3")   // 8
 * parseTierString("Silver III") // 8
 * parseTierString("골드 1")   // 15
 * parseTierString("Gold I")   // 15
 */
export function parseTierString(tierString: string): number {
  if (typeof tierString !== 'string' || tierString.trim() === '') {
    throw new Error('티어 문자열은 비어있을 수 없습니다.');
  }

  const normalized = tierString.trim().toLowerCase();

  // 티어 이름 매핑 (한글/영문 모두 지원)
  const tierMap: Record<string, TierName> = {
    '브론즈': 'Bronze',
    '브': 'Bronze',
    'bronze': 'Bronze',
    '실버': 'Silver',
    '실': 'Silver',
    'silver': 'Silver',
    '골드': 'Gold',
    '골': 'Gold',
    'gold': 'Gold',
    '플래티넘': 'Platinum',
    '플래': 'Platinum',
    '플': 'Platinum',
    'platinum': 'Platinum',
    '다이아몬드': 'Diamond',
    '다이아': 'Diamond',
    '다': 'Diamond',
    'diamond': 'Diamond',
    '루비': 'Ruby',
    '루': 'Ruby',
    'ruby': 'Ruby',
  };

  // 등급 매핑 (한글 숫자/로마 숫자 모두 지원)
  const rankMap: Record<string, number> = {
    // 아라비아 숫자
    '5': 0,
    '4': 1,
    '3': 2,
    '2': 3,
    '1': 4,
    // 로마 숫자
    'v': 0,
    'iv': 1,
    'iii': 2,
    'ii': 3,
    'i': 4,
  };

  // 공백/하이픈으로 분리
  const parts = normalized.split(/[\s\-]+/);

  if (parts.length !== 2) {
    throw new Error(
      '티어 형식이 올바르지 않습니다. ' +
        '형식: "<티어> <등급>" (예: "실버 3", "Silver III", "골드 1")'
    );
  }

  const [tierPart, rankPart] = parts;

  // 티어 이름 찾기
  const tierName = tierMap[tierPart];
  if (!tierName) {
    const validTiers = Object.keys(tierMap)
      .filter((k, i, arr) => arr.indexOf(k) === i)
      .join(', ');
    throw new Error(
      `유효하지 않은 티어 이름입니다: "${tierPart}"\n` +
        `사용 가능한 티어: ${validTiers}`
    );
  }

  // 등급 찾기
  const rankOffset = rankMap[rankPart];
  if (rankOffset === undefined) {
    throw new Error(
      `유효하지 않은 등급입니다: "${rankPart}"\n` +
        `사용 가능한 등급: 1-5, I-V`
    );
  }

  // 레벨 계산
  const tierInfo = TIER_NAMES[tierName];
  const level = tierInfo.min + rankOffset;

  return level;
}
