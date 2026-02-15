/**
 * 프로그래머스 cheerio 스크래핑 검증 스크립트
 *
 * 목적: Puppeteer 없이 fetch + cheerio로 프로그래머스 페이지 파싱 가능 여부 확인
 */

import * as cheerio from 'cheerio';

const PROGRAMMERS_CONFIG = {
  /** 브라우저 User-Agent (BOJ와 동일) */
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  /** 타임아웃 */
  TIMEOUT: 10000,
};

/**
 * 테스트 1: 문제 상세 페이지 스크래핑
 */
async function testProblemDetail() {
  console.log('\n=== Test 1: 문제 상세 페이지 스크래핑 ===');
  const problemUrl = 'https://school.programmers.co.kr/learn/courses/30/lessons/389632';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROGRAMMERS_CONFIG.TIMEOUT);

    const response = await fetch(problemUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': PROGRAMMERS_CONFIG.USER_AGENT,
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    console.log(`✅ 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ HTTP 에러: ${response.status}`);
      return false;
    }

    const html = await response.text();
    console.log(`✅ HTML 크기: ${html.length} bytes`);

    // cheerio로 파싱
    const $ = cheerio.load(html);

    // 주요 요소 추출 시도
    console.log('\n--- 파싱 결과 ---');

    // 1. 제목
    const titleSelectors = [
      'h1',
      '.page-title',
      '.problem-title',
      '[class*="title"]',
      'title',
    ];

    let title = '';
    for (const selector of titleSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0) {
        title = text;
        console.log(`✅ 제목 (${selector}): "${text}"`);
        break;
      }
    }

    if (!title) {
      console.log('❌ 제목을 찾을 수 없음');
      console.log('\n--- HTML 샘플 (처음 500자) ---');
      console.log(html.substring(0, 500));
      return false;
    }

    // 2. 문제 설명
    const descriptionSelectors = [
      '.guide-section-description',
      '.problem-description',
      '[class*="description"]',
      'article',
      '.content',
    ];

    let description = '';
    for (const selector of descriptionSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 50) {
        description = text.substring(0, 100) + '...';
        console.log(`✅ 설명 (${selector}): "${description}"`);
        break;
      }
    }

    // 3. 난이도 정보
    const levelSelectors = [
      '.level',
      '[class*="level"]',
      '[class*="difficulty"]',
    ];

    for (const selector of levelSelectors) {
      const text = $(selector).first().text().trim();
      if (text && text.length > 0) {
        console.log(`✅ 난이도 (${selector}): "${text}"`);
        break;
      }
    }

    // 4. 카테고리/태그
    const tagSelectors = [
      '.tag',
      '[class*="tag"]',
      '[class*="category"]',
      '.chip',
    ];

    const tags: string[] = [];
    for (const selector of tagSelectors) {
      $(selector).each((_, elem) => {
        const text = $(elem).text().trim();
        if (text && text.length > 0 && text.length < 50) {
          tags.push(text);
        }
      });
      if (tags.length > 0) {
        console.log(`✅ 태그 (${selector}): [${tags.slice(0, 5).join(', ')}]`);
        break;
      }
    }

    console.log('\n✅ cheerio 파싱 성공!');
    return true;

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error(`❌ 타임아웃 (${PROGRAMMERS_CONFIG.TIMEOUT}ms 초과)`);
    } else {
      console.error(`❌ 에러: ${(error as Error).message}`);
    }
    return false;
  }
}

/**
 * 테스트 2: 검색 페이지 스크래핑
 */
async function testSearchPage() {
  console.log('\n=== Test 2: 검색 페이지 스크래핑 ===');
  const searchUrl = 'https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=0';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROGRAMMERS_CONFIG.TIMEOUT);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': PROGRAMMERS_CONFIG.USER_AGENT,
        'Accept': 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    clearTimeout(timeoutId);

    console.log(`✅ 응답 상태: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.error(`❌ HTTP 에러: ${response.status}`);
      return false;
    }

    const html = await response.text();
    console.log(`✅ HTML 크기: ${html.length} bytes`);

    const $ = cheerio.load(html);

    console.log('\n--- 파싱 결과 ---');

    // 문제 목록 추출 시도
    const listSelectors = [
      '.challenge-list',
      '[class*="list"]',
      '[class*="item"]',
      'article',
      'li',
    ];

    let foundList = false;
    for (const selector of listSelectors) {
      const items = $(selector);
      if (items.length > 0) {
        console.log(`✅ 목록 항목 (${selector}): ${items.length}개 발견`);

        // 첫 3개 항목의 텍스트 출력
        items.slice(0, 3).each((i, elem) => {
          const text = $(elem).text().trim().substring(0, 100);
          console.log(`  [${i + 1}] ${text}...`);
        });

        foundList = true;
        break;
      }
    }

    if (!foundList) {
      console.log('❌ 목록 항목을 찾을 수 없음');
      console.log('\n--- HTML 샘플 (처음 500자) ---');
      console.log(html.substring(0, 500));
      return false;
    }

    console.log('\n✅ cheerio 파싱 성공!');
    return true;

  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.error(`❌ 타임아웃 (${PROGRAMMERS_CONFIG.TIMEOUT}ms 초과)`);
    } else {
      console.error(`❌ 에러: ${(error as Error).message}`);
    }
    return false;
  }
}

/**
 * 메인 실행
 */
async function main() {
  console.log('🔍 프로그래머스 Cheerio 스크래핑 검증 시작...\n');

  const test1 = await testProblemDetail();
  await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 간격
  const test2 = await testSearchPage();

  console.log('\n' + '='.repeat(50));
  console.log('📊 최종 결과');
  console.log('='.repeat(50));
  console.log(`문제 상세 페이지: ${test1 ? '✅ 성공' : '❌ 실패'}`);
  console.log(`검색 페이지: ${test2 ? '✅ 성공' : '❌ 실패'}`);

  if (test1 && test2) {
    console.log('\n🎉 결론: Cheerio로 스크래핑 가능! (Puppeteer 불필요)');
    console.log('   → BOJ 패턴 재사용으로 2주 만에 구현 가능');
  } else if (test1 || test2) {
    console.log('\n⚠️  결론: 일부만 가능 (추가 조사 필요)');
  } else {
    console.log('\n❌ 결론: Cheerio 불가능 (Puppeteer 필요)');
    console.log('   → 프로젝트 매니저 계획대로 4주 소요');
  }
}

main().catch(console.error);
