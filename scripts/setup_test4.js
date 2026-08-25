const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const pool = require('../models/db');

const sourcePath = path.join(__dirname, '../source.html');
const answerPath = path.join(__dirname, '../da.html');
const destJsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');

async function main() {
  try {
    console.log('Starting setup for TOEIC Test 4...');

    if (!fs.existsSync(sourcePath)) {
      throw new Error(`source.html not found at ${sourcePath}`);
    }
    if (!fs.existsSync(answerPath)) {
      throw new Error(`da.html not found at ${answerPath}`);
    }

    const html = fs.readFileSync(sourcePath, 'utf8');
    const $ = cheerio.load(html);

    // 1. Parse Answers
    console.log('Parsing answer key from da.html...');
    const answerHtml = fs.readFileSync(answerPath, 'utf8');
    const $ans = cheerio.load(answerHtml);
    const textLines = $ans('body').text().split('\n').map(l => l.trim()).filter(l => l);

    const answersMap = {};
    let currentQNum = null;
    textLines.forEach(line => {
      if (/^\d+$/.test(line)) {
        currentQNum = parseInt(line, 10);
      } else if (line.includes('Đáp án đúng:')) {
        const ansLetter = line.split('Đáp án đúng:')[1].trim().toUpperCase();
        if (currentQNum) {
          answersMap[currentQNum] = ansLetter;
        }
      }
    });
    console.log(`Successfully parsed ${Object.keys(answersMap).length} answers.`);

    // 2. Parse Questions
    console.log('Parsing questions from source.html...');
    const partIds = {
      1: 'partcontent-10140',
      2: 'partcontent-10141',
      3: 'partcontent-10142',
      4: 'partcontent-10143',
      5: 'partcontent-10144',
      6: 'partcontent-10145',
      7: 'partcontent-10146'
    };

    const questions = [];

    for (let part = 1; part <= 7; part++) {
      const partDiv = $(`#${partIds[part]}`);
      if (partDiv.length === 0) {
        console.log(`Warning: Part ${part} container not found.`);
        continue;
      }

      const qWrappers = partDiv.find('.question-wrapper');
      qWrappers.each((idx, qEl) => {
        const qWrapper = $(qEl);
        const qId = qWrapper.attr('data-qid');
        const qNumText = qWrapper.find('.question-number').text().trim();
        const qNum = parseInt(qNumText, 10);
        
        // Find options
        const options = [];
        qWrapper.find('.form-check').each((optIdx, optEl) => {
          const optText = $(optEl).text().trim();
          options.push(optText);
        });

        // Find clean question text
        const qTextEl = qWrapper.find('.question-text');
        let questionText = '';
        if (qTextEl.length > 0) {
          questionText = qTextEl.clone().children().remove().end().text().trim();
          if (!questionText) {
            questionText = qTextEl.text().trim();
          }
        } else {
          questionText = qWrapper.find('.question-content').clone().children().remove().end().text().trim();
        }
        questionText = questionText.replace(/\s+/g, ' ').trim();

        // Resolve context (image or passage text)
        let image = null;
        let passage = null;

        // Try closest parent item wrapper
        const itemWrapper = qWrapper.closest('.question-item-wrapper');
        if (itemWrapper.length > 0) {
          const ctxImg = itemWrapper.find('.context-image img');
          if (ctxImg.length > 0) {
            image = ctxImg.attr('data-src') || ctxImg.attr('src');
          }
          const ctxText = itemWrapper.find('.context-text');
          if (ctxText.length > 0) {
            passage = ctxText.html() || ctxText.text();
          }
        }

        // Try closest twocols left column
        if (!image && !passage) {
          const twoCols = qWrapper.closest('.question-twocols');
          if (twoCols.length > 0) {
            const leftCol = twoCols.find('.question-twocols-left');
            if (leftCol.length > 0) {
              const ctxImg = leftCol.find('.context-image img, img');
              if (ctxImg.length > 0) {
                image = ctxImg.attr('data-src') || ctxImg.attr('src');
              }
              const ctxText = leftCol.find('.context-text');
              if (ctxText.length > 0) {
                passage = ctxText.html() || ctxText.text();
              }
            }
          }
        }

        // Try group-wrapper context
        if (!image && !passage) {
          const groupWrapper = qWrapper.closest('.question-group-wrapper');
          if (groupWrapper.length > 0) {
            const ctxImg = groupWrapper.find('.context-image img');
            if (ctxImg.length > 0) {
              image = ctxImg.attr('data-src') || ctxImg.attr('src');
            }
            const ctxText = groupWrapper.find('.context-text');
            if (ctxText.length > 0) {
              passage = ctxText.html() || ctxText.text();
            }
          }
        }

        // Try test-questions-wrapper previous sibling
        if (!image && !passage) {
          const testQWrapper = qWrapper.closest('.test-questions-wrapper');
          if (testQWrapper.length > 0) {
            const prevContext = testQWrapper.prev('.context-wrapper');
            if (prevContext.length > 0) {
              const ctxImg = prevContext.find('.context-image img');
              if (ctxImg.length > 0) {
                image = ctxImg.attr('data-src') || ctxImg.attr('src');
              }
              const ctxText = prevContext.find('.context-text');
              if (ctxText.length > 0) {
                passage = ctxText.html() || ctxText.text();
              }
            }
          }
        }

        // Standardize URLs
        if (image && !image.startsWith('http')) {
          image = 'https://s4-media1.study4.com' + image;
        }

        const answer = answersMap[qNum] || '';

        questions.push({
          id: qNum,
          part: part,
          question: questionText || (part === 1 ? 'Look at the picture and select the best statement.' : (part === 2 ? 'Listen and select the best response.' : '')),
          options: options,
          answer: answer,
          audio: null,
          image: image || null,
          passage: passage || null,
          script: null
        });
      });
    }

    questions.sort((a, b) => a.id - b.id);
    console.log(`Successfully parsed ${questions.length} questions.`);

    if (questions.length !== 200) {
      throw new Error(`Expected 200 questions, but parsed ${questions.length}`);
    }

    // Prepare JSON object
    const testJson = {
      title: "TOEIC Test 4",
      type: "Luyện đề",
      duration: 120,
      audio: "https://s4-media1.study4.com/media/e24/audio/Test_4.mp3",
      questions: questions
    };

    // Save JSON file
    fs.writeFileSync(destJsonPath, JSON.stringify(testJson, null, 2), 'utf8');
    console.log(`Saved JSON file to ${destJsonPath}`);

    // 3. Insert into database table 'baithi'
    console.log('Connecting to database to register the test...');
    const [existing] = await pool.query(
      'SELECT MaDeThi FROM baithi WHERE DuongDanFileJSON = ?',
      ['json/toeic_test_4.json']
    );

    if (existing.length > 0) {
      console.log(`TOEIC Test 4 is already registered in the database (MaDeThi = ${existing[0].MaDeThi}). Updating details...`);
      await pool.query(
        `UPDATE baithi SET TenDeThi = ?, ThoiGianLamBai = ?, LoaiDe = ?, TrangThai = 1 WHERE MaDeThi = ?`,
        ['TOEIC Test 4', 120, 'Luyện đề chính thức', existing[0].MaDeThi]
      );
      console.log('Database entry updated successfully.');
    } else {
      console.log('Inserting new entry for TOEIC Test 4 into the database...');
      const [insertResult] = await pool.query(
        `INSERT INTO baithi (TenDeThi, ThoiGianLamBai, LoaiDe, DuongDanFileJSON, TrangThai) VALUES (?, ?, ?, ?, 1)`,
        ['TOEIC Test 4', 120, 'Luyện đề chính thức', 'json/toeic_test_4.json']
      );
      console.log(`Database entry inserted successfully. (New MaDeThi = ${insertResult.insertId})`);
    }

    console.log('Setup finished successfully!');
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    process.exit(0);
  }
}

main();
