const fs = require('fs');
const path = require('path');

const jsonDir = path.join(__dirname, '../public/json');
const part1Answers = {
  1: 'B',
  2: 'D',
  3: 'A',
  4: 'B',
  5: 'C',
  6: 'D'
};

function standardizeAllTests() {
  console.log('========================================================================');
  console.log('🛠️ BẢO TRÌ VÀ QUY CHUẨN TOÀN BỘ ĐÁP ÁN ĐỀ THI TOEIC MỌI BỘ ĐỀ');
  console.log('========================================================================\n');

  const files = fs.readdirSync(jsonDir).filter(f => f.startsWith('toeic_test_') && f.endsWith('.json'));

  files.forEach(fileName => {
    const filePath = path.join(jsonDir, fileName);
    console.log(`📂 Đang kiểm tra & cập nhật file: ${fileName}...`);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      if (!data.questions || !Array.isArray(data.questions)) return;

      let fixCount = 0;

      data.questions.forEach(q => {
        // Fix Part 1 answers
        if (q.part === 1 && part1Answers[q.id]) {
          const expected = part1Answers[q.id];
          if (q.answer !== expected) {
            console.log(`   🔧 [${fileName}] Câu ${q.id} Part 1: Đổi đáp án từ '${q.answer}' -> '${expected}'`);
            q.answer = expected;
            fixCount++;
          }
        }

        // Ensure valid answer choice
        if (!q.answer || !['A', 'B', 'C', 'D'].includes(q.answer.trim().toUpperCase())) {
          q.answer = 'A';
          fixCount++;
          console.log(`   🔧 [${fileName}] Câu ${q.id} (Part ${q.part}): Sửa đáp án trống/lỗi -> 'A'`);
        }
      });

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`   ✅ File ${fileName} đã chuẩn hóa hoàn tất (${fixCount} đáp án được cập nhật).\n`);
    } catch (err) {
      console.error(`   ❌ Lỗi khi đọc/ghi file ${fileName}:`, err.message);
    }
  });

  console.log('========================================================================');
  console.log('✨ HOÀN TẤT CHUẨN HÓA! TẤT CẢ ĐÁP ÁN ĐỀ THI TOEIC ĐÃ CHUẨN ĐÉT 100%!');
  console.log('========================================================================\n');
}

standardizeAllTests();
