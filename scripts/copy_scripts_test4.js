const fs = require('fs');
const path = require('path');

const test1Path = path.join(__dirname, '../public/json/toeic_test_1.json');
const test4Path = path.join(__dirname, '../public/json/toeic_test_4.json');

try {
  console.log('Loading test data...');
  const test1 = JSON.parse(fs.readFileSync(test1Path, 'utf8'));
  const test4 = JSON.parse(fs.readFileSync(test4Path, 'utf8'));

  let count = 0;
  test4.questions.forEach((q4, index) => {
    const q1 = test1.questions[index];
    if (q4.part <= 4 && q1 && q1.script) {
      q4.script = q1.script;
      count++;
    }
  });

  fs.writeFileSync(test4Path, JSON.stringify(test4, null, 2), 'utf8');
  console.log(`Successfully copied ${count} scripts from Test 1 to Test 4 JSON.`);
} catch (err) {
  console.error('Error copying scripts:', err);
}
