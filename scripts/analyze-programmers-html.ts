/**
 * 프로그래머스 문제 페이지 HTML 구조 상세 분석
 */
import * as cheerio from 'cheerio';

const problemUrl =
  'https://school.programmers.co.kr/learn/courses/30/lessons/389632';

async function main() {
  console.log('📝 프로그래머스 문제 페이지 분석 시작...\n');

  const response = await fetch(problemUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });

  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('=== 1. 제목 ===');
  const titleSelectors = [
    'h1',
    'h2',
    'h3',
    'h4',
    '.page-title',
    '[class*="title"]',
  ];
  for (const sel of titleSelectors) {
    const text = $(sel).first().text().trim();
    if (text) {
      console.log(`${sel}: "${text}"`);
    }
  }

  console.log('\n=== 2. 카테고리/레벨 ===');
  const metaSelectors = [
    '.breadcrumb',
    '[class*="level"]',
    '[class*="difficulty"]',
    '[class*="badge"]',
  ];
  for (const sel of metaSelectors) {
    const elem = $(sel).first();
    if (elem.length > 0) {
      console.log(`${sel}: "${elem.text().trim()}"`);
      console.log(`  HTML: ${elem.html()?.substring(0, 200)}`);
    }
  }

  console.log('\n=== 3. 문제 설명 ===');
  const descSelectors = [
    '.guide-section',
    '.guide-section-description',
    '#problem-description',
    '[class*="description"]',
  ];
  for (const sel of descSelectors) {
    const elem = $(sel).first();
    if (elem.length > 0) {
      const text = elem.text().trim().substring(0, 200);
      console.log(`${sel}: "${text}..."`);
    }
  }

  console.log('\n=== 4. 제한사항 ===');
  const constraintsSelectors = [
    'h5:contains("제한사항")',
    'h6:contains("제한사항")',
    '.constraints',
  ];
  for (const sel of constraintsSelectors) {
    const elem = $(sel);
    if (elem.length > 0) {
      console.log(`${sel}: 발견 (${elem.length}개)`);
      const next = elem.next();
      console.log(`  다음 요소: ${next.prop('tagName')} - "${next.text().trim().substring(0, 100)}"`);
    }
  }

  console.log('\n=== 5. 입출력 예제 ===');
  const exampleSelectors = [
    'h5:contains("입출력 예")',
    'table',
    '[class*="example"]',
  ];
  for (const sel of exampleSelectors) {
    const elem = $(sel);
    if (elem.length > 0) {
      console.log(`${sel}: 발견 (${elem.length}개)`);
      if (sel === 'table') {
        elem.each((i, table) => {
          const headers = $(table).find('th').map((_, th) => $(th).text().trim()).get();
          console.log(`  Table ${i + 1} headers: [${headers.join(', ')}]`);
        });
      }
    }
  }

  console.log('\n=== 6. 전체 섹션 구조 ===');
  $('h5, h6').each((_, heading) => {
    const text = $(heading).text().trim();
    console.log(`${$(heading).prop('tagName')}: "${text}"`);
  });

  console.log('\n✅ 분석 완료');
}

main().catch(console.error);
