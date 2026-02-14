/**
 * 프로그래머스 테이블 구조 상세 분석
 */
import puppeteer from 'puppeteer';

async function analyzeTableStructure() {
  console.log('🔍 프로그래머스 테이블 구조 분석 시작...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    const testUrl =
      'https://school.programmers.co.kr/learn/challenges?order=recent&page=1&levels=1';

    await page.goto(testUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 테이블 구조 분석
    const tableInfo = await page.evaluate(() => {
      const table = document.querySelector('table');
      if (!table) return null;

      const thead = table.querySelector('thead');
      const tbody = table.querySelector('tbody');

      const headerCells = thead
        ? Array.from(thead.querySelectorAll('th, td')).map((cell) => ({
            text: cell.textContent?.trim(),
            class: cell.className,
          }))
        : [];

      const rows = tbody ? Array.from(tbody.querySelectorAll('tr')) : [];

      // 첫 3개 행 상세 분석
      const rowDetails = rows.slice(0, 3).map((row, idx) => {
        const cells = Array.from(row.querySelectorAll('td'));

        return {
          rowIndex: idx,
          cellCount: cells.length,
          cells: cells.map((cell, cellIdx) => {
            const link = cell.querySelector('a');
            const levelSpan = cell.querySelector('[class*="level"]');

            return {
              cellIndex: cellIdx,
              text: cell.textContent?.trim().substring(0, 100),
              class: cell.className,
              hasLink: !!link,
              linkHref: link?.getAttribute('href') || null,
              linkText: link?.textContent?.trim(),
              hasLevel: !!levelSpan,
              levelText: levelSpan?.textContent?.trim(),
              levelClass: levelSpan?.className,
              innerHTML: cell.innerHTML.substring(0, 300),
            };
          }),
        };
      });

      return {
        tableClass: table.className,
        hasHeader: !!thead,
        headerCells,
        rowCount: rows.length,
        rowDetails,
      };
    });

    if (!tableInfo) {
      console.log('❌ 테이블을 찾을 수 없습니다');
      return;
    }

    console.log('✅ 테이블 발견\n');
    console.log(`📊 테이블 클래스: ${tableInfo.tableClass}`);
    console.log(`📋 전체 행 개수: ${tableInfo.rowCount}\n`);

    if (tableInfo.hasHeader) {
      console.log('📌 헤더 정보:');
      tableInfo.headerCells.forEach((cell, idx) => {
        console.log(`  [${idx}] "${cell.text}" (class: ${cell.class})`);
      });
      console.log();
    }

    console.log('🔎 첫 3개 행 상세 분석:\n');

    tableInfo.rowDetails.forEach((row) => {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`행 #${row.rowIndex + 1} (셀 개수: ${row.cellCount})`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      row.cells.forEach((cell) => {
        console.log(`  📦 셀 #${cell.cellIndex}:`);
        console.log(`     텍스트: "${cell.text}"`);
        console.log(`     클래스: ${cell.class}`);

        if (cell.hasLink) {
          console.log(`     🔗 링크: ${cell.linkHref}`);
          console.log(`     링크 텍스트: "${cell.linkText}"`);
        }

        if (cell.hasLevel) {
          console.log(`     ⭐ 레벨: ${cell.levelText}`);
          console.log(`     레벨 클래스: ${cell.levelClass}`);
        }

        console.log(`     HTML: ${cell.innerHTML}\n`);
      });
    });

    // CSS Selector 제안
    console.log('\n💡 추천 CSS Selector:\n');
    console.log('문제 목록 컨테이너:');
    console.log(`  table.${tableInfo.tableClass.split(' ')[0]}`);
    console.log();
    console.log('문제 행:');
    console.log(`  table tbody tr`);
    console.log();
    console.log('문제 제목:');
    console.log(`  td a[href*="/lessons/"]`);
    console.log();
    console.log('난이도:');
    console.log(`  td [class*="level"]`);
    console.log();
  } catch (error) {
    console.error('❌ 에러:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

analyzeTableStructure().catch(console.error);
