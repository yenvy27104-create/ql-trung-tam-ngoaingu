const fs = require('fs');
const path = require('path');

const explanations = {
  51: 'Chọn B. "strategically" là trạng từ (adverb) bổ nghĩa cho động từ "lowered" (hạ giá một cách có chiến lược).',
  52: 'Chọn C. "Before" là liên từ chỉ thời gian, thể hiện hành động "addressed" xảy ra trước hành động "showed".',
  53: 'Chọn D. "obstructing" là dạng V-ing (gerund), dùng sau động từ "avoid" theo cấu trúc avoid + V-ing.',
  54: 'Chọn C. "essential" là tính từ (adjective) bổ nghĩa cho cụm "is ... for protecting" (rất cần thiết).',
  55: 'Chọn B. "The fact that" là cụm danh từ làm chủ ngữ cho động từ "indicates".',
  56: 'Chọn A. "mechanically" là trạng từ bổ nghĩa cho tính từ "controlled" (được điều khiển bằng cơ khí).',
  57: 'Chọn A. "notify" là động từ nguyên thể, dùng sau "to" trong cụm "posted signs to notify" (để thông báo).',
  58: 'Chọn C. "who" là đại từ quan hệ chỉ người (Mr. Ross), thay thế cho danh từ chỉ người trong mệnh đề quan hệ.',
  59: 'Chọn C. "periodically" là trạng từ chỉ tần suất (định kỳ), bổ nghĩa cho động từ "revised".',
  60: 'Chọn A. "In spite of" là cụm giới từ chỉ sự tương phản (mặc dù), theo sau là cụm danh từ "an ankle injury".',
  61: 'Chọn A. "legal" là tính từ bổ nghĩa cho danh từ "services" (dịch vụ pháp lý).',
  62: 'Chọn C. "request" là danh từ trong cụm cố định "at the guest\'s request" (theo yêu cầu của khách).',
  63: 'Chọn D. "accessories" là danh từ số nhiều, là tân ngữ của động từ "selling".',
  64: 'Chọn C. "importance" là danh từ sau "the increasing" và trước "of using".',
  65: 'Chọn A. "After" là giới từ/liên từ chỉ thời gian, mệnh đề phụ mô tả thời điểm xảy ra hành động chính.',
  66: 'Chọn D. "stages" là danh từ số nhiều chỉ các giai đoạn của quá trình phát triển thuốc.',
  67: 'Chọn A. "Anyone" là đại từ bất định làm chủ ngữ cho động từ "must submit".'
};

const jsonPath = path.join(__dirname, '..', 'public', 'json', 'test_dauvao_02.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

data.questions.forEach((q) => {
  if (q.part === 5 && explanations[q.id]) {
    q.explanation = explanations[q.id];
  }
});

fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Added ${Object.keys(explanations).length} explanations to test_dauvao_02.json`);
