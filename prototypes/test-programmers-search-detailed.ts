/**
 * 프로그래머스 검색 페이지 상세 분석
 *
 * React가 아닐 가능성을 고려하여 HTML 구조를 상세히 분석
 */

import * as cheerio from 'cheerio';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function analyzeSearchPage() {
  console.log('🔍 프로그래머스 검색 페이지 상세 분석...\n');

  const url = 'https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=1';

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    console.log(`✅ 응답 상태: ${response.status} ${response.statusText}`);
    console.log(`📦 Content-Type: ${response.headers.get('content-type')}`);

    const html = await response.text();
    console.log(`📄 HTML 크기: ${html.length} bytes\n`);

    // HTML 전체 구조 출력
    console.log('=== HTML 전체 출력 (처음 2000자) ===');
    console.log(html.substring(0, 2000));
    console.log('...\n');

    // cheerio로 파싱
    const $ = cheerio.load(html);

    console.log('=== 주요 태그 분석 ===');

    // 1. body 내용 확인
    const bodyText = $('body').text().trim();
    console.log(`body 텍스트 길이: ${bodyText.length} 글자`);
    console.log(`body 텍스트 샘플: ${bodyText.substring(0, 200)}...\n`);

    // 2. script 태그 확인 (React/SPA 판단)
    const scripts = $('script');
    console.log(`script 태그 개수: ${scripts.length}개`);
    scripts.each((i, elem) => {
      const src = $(elem).attr('src');
      const content = $(elem).html()?.substring(0, 100);
      if (src) {
        console.log(`  [${i + 1}] src="${src}"`);
      } else if (content) {
        console.log(`  [${i + 1}] inline: ${content}...`);
      }
    });
    console.log();

    // 3. div 구조 분석
    console.log('=== div 구조 분석 (id/class 있는 것만) ===');
    const divsWithId = $('div[id]');
    console.log(`id 속성 있는 div: ${divsWithId.length}개`);
    divsWithId.each((i, elem) => {
      const id = $(elem).attr('id');
      const classes = $(elem).attr('class');
      console.log(`  [${i + 1}] <div id="${id}" class="${classes}">`);
    });
    console.log();

    // 4. 특정 키워드로 요소 검색
    console.log('=== 키워드 기반 요소 검색 ===');

    const keywords = ['challenge', 'problem', 'list', 'item', 'card', 'table', 'row'];
    for (const keyword of keywords) {
      const byClass = $(`[class*="${keyword}"]`);
      const byId = $(`[id*="${keyword}"]`);

      if (byClass.length > 0 || byId.length > 0) {
        console.log(`\n"${keyword}" 관련 요소:`);
        if (byClass.length > 0) {
          console.log(`  class 포함: ${byClass.length}개`);
          byClass.slice(0, 3).each((i, elem) => {
            const className = $(elem).attr('class');
            const text = $(elem).text().trim().substring(0, 80);
            console.log(`    [${i + 1}] .${className}: "${text}..."`);
          });
        }
        if (byId.length > 0) {
          console.log(`  id 포함: ${byId.length}개`);
          byId.slice(0, 3).each((i, elem) => {
            const id = $(elem).attr('id');
            const text = $(elem).text().trim().substring(0, 80);
            console.log(`    [${i + 1}] #${id}: "${text}..."`);
          });
        }
      }
    }
    console.log();

    // 5. 링크 분석 (문제 링크 찾기)
    console.log('=== 링크 분석 ===');
    const links = $('a[href*="lessons"], a[href*="challenges"]');
    console.log(`문제/도전과제 링크: ${links.length}개`);
    links.slice(0, 5).each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().trim();
      console.log(`  [${i + 1}] ${href} - "${text}"`);
    });
    console.log();

    // 6. 테이블 확인
    console.log('=== 테이블 구조 확인 ===');
    const tables = $('table');
    console.log(`테이블 개수: ${tables.length}개`);
    tables.each((i, elem) => {
      const rows = $(elem).find('tr');
      console.log(`  [${i + 1}] ${rows.length}개 행`);
    });
    console.log();

    // 7. article 태그 확인
    console.log('=== article 태그 확인 ===');
    const articles = $('article');
    console.log(`article 개수: ${articles.length}개`);
    articles.slice(0, 3).each((i, elem) => {
      const text = $(elem).text().trim().substring(0, 100);
      console.log(`  [${i + 1}] "${text}..."`);
    });
    console.log();

    // 8. ul/li 리스트 확인
    console.log('=== ul/li 리스트 확인 ===');
    const lists = $('ul');
    console.log(`ul 개수: ${lists.length}개`);
    lists.each((i, elem) => {
      const items = $(elem).find('li');
      if (items.length > 0) {
        console.log(`  [${i + 1}] ${items.length}개 항목`);
        items.slice(0, 2).each((j, li) => {
          const text = $(li).text().trim().substring(0, 80);
          console.log(`    - "${text}..."`);
        });
      }
    });

    // 최종 판단
    console.log('\n' + '='.repeat(50));
    console.log('📊 최종 분석');
    console.log('='.repeat(50));

    if (bodyText.length < 500) {
      console.log('❌ SPA (클라이언트 렌더링) 확인');
      console.log('   → body에 실제 콘텐츠 없음');
      console.log('   → JavaScript로 동적 렌더링');
      console.log('   → Puppeteer 필요');
    } else {
      console.log('✅ 서버 렌더링 가능성 있음');
      console.log('   → body에 콘텐츠 존재');
      console.log('   → cheerio로 파싱 가능');
    }

  } catch (error) {
    console.error('❌ 에러:', (error as Error).message);
  }
}

analyzeSearchPage().catch(console.error);
