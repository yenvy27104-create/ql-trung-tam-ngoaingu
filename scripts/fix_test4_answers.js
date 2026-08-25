const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/json/toeic_test_4.json');

function fixTest4Answers() {
  console.log('🔄 Checking and fixing answer keys in toeic_test_4.json...');

  if (!fs.existsSync(jsonPath)) {
    console.error('❌ File not found:', jsonPath);
    return;
  }

  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  let fixedCount = 0;

  data.questions.forEach((q) => {
    // 1. Check Part 2 questions where script contains (A)... (B)... (C)...
    if (q.part === 2 && q.script) {
      const script = q.script;
      const matchA = script.match(/\(A\)\s*([^(\n]+)/i);
      const matchB = script.match(/\(B\)\s*([^(\n]+)/i);
      const matchC = script.match(/\(C\)\s*([^(\n]+)/i);

      const textA = matchA ? matchA[1].trim() : '';
      const textB = matchB ? matchB[1].trim() : '';
      const textC = matchC ? matchC[1].trim() : '';

      // Determine correct answer based on semantic match
      let correctLetter = null;

      // Question 7 & 17 & 27: proofread slides -> helpful
      if (script.toLowerCase().includes('proofread')) {
        if (textA.toLowerCase().includes('helpful')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('helpful')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('helpful')) correctLetter = 'C';
      }
      // Question 8 & 18 & 28: tickets -> purchased online
      else if (script.toLowerCase().includes('tickets')) {
        if (textA.toLowerCase().includes('purchased') || textA.toLowerCase().includes('online')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('purchased') || textB.toLowerCase().includes('online')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('purchased') || textC.toLowerCase().includes('online')) correctLetter = 'C';
      }
      // Question 9 & 19 & 29: inspect machinery -> three months
      else if (script.toLowerCase().includes('inspect')) {
        if (textA.toLowerCase().includes('three months')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('three months')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('three months')) correctLetter = 'C';
      }
      // Question 10 & 20 & 30: instruction manual -> top drawer
      else if (script.toLowerCase().includes('instruction manual')) {
        if (textA.toLowerCase().includes('drawer')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('drawer')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('drawer')) correctLetter = 'C';
      }
      // Question 11 & 21 & 31: marketing department -> third floor
      else if (script.toLowerCase().includes('marketing department')) {
        if (textA.toLowerCase().includes('third floor')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('third floor')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('third floor')) correctLetter = 'C';
      }
      // Question 12 & 22: sales report -> end of the afternoon
      else if (script.toLowerCase().includes('sales report')) {
        if (textA.toLowerCase().includes('afternoon')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('afternoon')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('afternoon')) correctLetter = 'C';
      }
      // Question 13 & 23: project presentation -> Mr. Davis
      else if (script.toLowerCase().includes('project presentation')) {
        if (textA.toLowerCase().includes('davis')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('davis')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('davis')) correctLetter = 'C';
      }
      // Question 14 & 24: schedule the meeting -> client is busy
      else if (script.toLowerCase().includes('schedule the meeting')) {
        if (textA.toLowerCase().includes('client')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('client')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('client')) correctLetter = 'C';
      }
      // Question 15 & 25: convention center -> subway
      else if (script.toLowerCase().includes('convention center')) {
        if (textA.toLowerCase().includes('subway')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('subway')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('subway')) correctLetter = 'C';
      }
      // Question 16 & 26: order lunch -> he will arrive late
      else if (script.toLowerCase().includes('order lunch')) {
        if (textA.toLowerCase().includes('arrive late')) correctLetter = 'A';
        else if (textB.toLowerCase().includes('arrive late')) correctLetter = 'B';
        else if (textC.toLowerCase().includes('arrive late')) correctLetter = 'C';
      }

      if (correctLetter && q.answer !== correctLetter) {
        console.log(`✅ Fixed Question #${q.id} Part 2 Answer: Changed from '${q.answer}' -> '${correctLetter}'`);
        q.answer = correctLetter;
        fixedCount++;
      }
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✨ Successfully checked & updated ${fixedCount} answer keys in ${jsonPath}`);
}

fixTest4Answers();
