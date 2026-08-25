/**
 * ============================================================================
 * TIỆN ÍCH QUẢN LÝ ĐỀ CƯƠNG & CHƯƠNG TRÌNH HỌC (SYLLABUS DATA UTILITY)
 * ============================================================================
 * Chứa dữ liệu đề cương bài học chi tiết theo từng buổi (26-28 buổi) cho các khóa học TOEIC/IELTS:
 * - Thông tin chuẩn đầu ra, dịch vụ bổ trợ, ngữ pháp & từ vựng.
 * - Danh sách nội dung chi tiết từng buổi học (Vocabulary, Grammar, Practice Test,...).
 */

const courseMeta = {
  1: {
    inputLevel: 'Mất gốc, mới bắt đầu học TOEIC',
    services: 'Bổ trợ 1 buổi/tuần + Tutoring 5 buổi/tuần',
    extraKnowledge: 'Xây nền vững chắc với phát âm & từ vựng căn bản',
    tests: 'Luyện tập có hệ thống theo từng nhóm chủ đề giúp nắm chắc nền tảng (Listening & Reading)',
    phonetics: 'Học nghe và luyện tập cách phát âm từ đơn vị nhỏ nhất (chữ cái) cho tới từng thành phần lớn như từ, cụm từ...',
    vocabulary: '250+ từ vựng (A1 - A2 CEFR) thuộc 17 chủ đề với từ vựng cơ bản quen thuộc thường xuất hiện trong bài thi TOEIC.',
    grammar: '8 thì (Hiện tại đơn, Quá khứ đơn, Tương lai...), 8 loại từ (động từ, đại từ...), 5 loại câu (Câu bị động, sự hòa hợp câu...)'
  },
  4: {
    inputLevel: 'Muốn làm quen cấu trúc đề thi, nắm vững phương pháp làm bài & tư duy tránh bẫy',
    services: 'Giải bộ đề ETS thực chiến mới nhất + Chữa đề bấm giờ áp lực phòng thi thật',
    extraKnowledge: 'Chiến thuật phân bổ thời gian & Phương pháp quét từ khóa Skimming/Scanning',
    tests: '8 Bộ đề ETS mới nhất + Bài Thi Thử Giữa Khóa và Bài Thi Bế Giảng (Target tăng 100-150 điểm)',
    phonetics: 'Luyện nghe phản xạ audio tốc độ cao 1.1x, đặc điểm nhận dạng bẫy phát âm Part 1 - Part 4',
    vocabulary: 'Từ vựng giao tiếp công việc (office, meeting, conference) & bối cảnh cuộc sống (restaurant, hotel, airport)',
    grammar: 'Củng cố thói quen ra đề Part 5-6-7, kỹ thuật né bẫy ngữ pháp và phân biệt các phương án gây nhiễu'
  }
};

const syllabiData = {
  1: [ // TOEIC Pre (300-350) - 26 Buổi (Chỉ Reading & Listening)
    { session: 1, type: 'Daily routines', content: 'Vocab: Daily routines, Days of the week | Grammar: Present Simple (Structures, Usage), Adverbs of frequency, Spelling rules with he, she, it', test: '' },
    { session: 2, type: 'Sports & exercises', content: 'Vocab: Sports (with "go, play, do") | Grammar: Modal verbs: can for ability', test: '' },
    { session: 3, type: 'Life stories', content: 'Vocab: Past events, Past-time expressions, Years 1xxx, 20xx | Grammar: Simple Past', test: '' },
    { session: 4, type: 'Holiday', content: 'Vocab: Holiday activities & Adjectives to describe holiday | Grammar: Review Simple Past & Past continuous', test: 'Minitest 1' },
    { session: 5, type: 'Review 1', content: 'Verb tenses - Review các thì đã học', test: '' },
    { session: 6, type: 'Mind and body', content: 'Vocab: Parts of the body, Health problems and treatments | Grammar: Should for advice', test: '' },
    { session: 7, type: 'Food and drinks', content: 'Vocab: Food & drinks (countable & uncountable) | Grammar: Singular & Plural nouns, This, that, these, those', test: 'Minitest 2' },
    { session: 8, type: 'Future plans', content: 'Vocab: Action verbs | Grammar: Will, Be going to for the future', test: '' },
    { session: 9, type: 'Clothing', content: 'Vocab: Clothes, Colors & Descriptive adjectives | Grammar: Adjectives to describe clothes, Want/Would like + to V, Present continuous', test: '' },
    { session: 10, type: 'Review 2', content: 'Adjectives, Adverbs deep review', test: 'Minitest 3' },
    { session: 11, type: 'Practice 1', content: 'Listening & Reading Practice 1', test: '' },
    { session: 12, type: 'PROGRESS TEST 1', content: 'Midterm test Reading & Listening', test: 'Progress Test 1' },
    { session: 13, type: 'At the office', content: 'Vocab: Office affairs, office supplies | Grammar: Nouns, Pronouns', test: '' },
    { session: 14, type: 'Travelling', content: 'Vocab: Travelling, booking a flight | Grammar: Verb tenses - HTHT, QKHT', test: '' },
    { session: 15, type: 'Dining out', content: 'Vocab: Food terms, restaurants and caterers | Grammar: Subject-verb agreement', test: 'Minitest 4' },
    { session: 16, type: 'Technology', content: 'Vocab: Devices & Activities with technology | Grammar: Passive voice (Câu bị động)', test: '' },
    { session: 17, type: 'Review 3', content: 'Comprehensive Review 3', test: '' },
    { session: 18, type: 'Leisure activities', content: 'Vocab: Hobbies & Leisure activities | Grammar: Comparisons (Các dạng so sánh)', test: '' },
    { session: 19, type: 'Entertainment', content: 'Vocab: Entertainment events (cinema, music, concert...) | Grammar: To-infinitives & Gerunds', test: 'Minitest 5' },
    { session: 20, type: 'Transportation', content: 'Vocab: Means of transport & verbs | Grammar: Types of conjunctions (Liên từ)', test: '' },
    { session: 21, type: 'Personnel', content: 'Vocab: Job requirements, qualifications, and benefits | Grammar: Relative pronouns', test: '' },
    { session: 22, type: 'Customer service', content: 'Vocab: Problems with service (hotels, restaurants, shops...) | Grammar: Conditional sentences (3 loại câu điều kiện)', test: 'Minitest 6' },
    { session: 23, type: 'Review 4', content: 'Advanced Grammar & Vocab Review 4', test: '' },
    { session: 24, type: 'Practice 2', content: 'Listening & Reading Practice 2', test: '' },
    { session: 25, type: 'PROGRESS TEST 2', content: 'Final test Reading & Listening (Phần 1)', test: 'Progress Test 2' },
    { session: 26, type: 'PROGRESS TEST 2', content: 'Final test Reading & Listening (Phần 2 & Tổng kết)', test: 'Progress Test 2' }
  ],
  2: [ // TOEIC A (450-500) - 26 Buổi
    { session: 1, type: 'Reading 1', content: 'Part 5 - Noun Clauses & Relative Clauses', test: '' },
    { session: 2, type: 'Listening 1', content: 'Part 1 & Part 2 Strategies', test: '' },
    { session: 3, type: 'Reading 2', content: 'Part 6 - Text Completion & Inversion', test: 'Minitest 1' },
    { session: 4, type: 'Listening 2', content: 'Part 3 - Short Conversations (Office & Business)', test: '' },
    { session: 5, type: 'Reading 3', content: 'Part 7 - Single Passages (Emails & Letters)', test: '' },
    { session: 6, type: 'Listening 3', content: 'Part 3 - Conversations with Visual Materials', test: 'Minitest 2' },
    { session: 7, type: 'Reading 4', content: 'Part 7 - Single Passages (Notices & Advertisements)', test: '' },
    { session: 8, type: 'Listening 4', content: 'Part 4 - Short Talks (Announcements & Speeches)', test: '' },
    { session: 9, type: 'Reading 5', content: 'Part 5 - Advanced Connectors & Prepositions', test: 'Minitest 3' },
    { session: 10, type: 'Listening 5', content: 'Part 4 - Talks with Graphic Information', test: '' },
    { session: 11, type: 'Review', content: 'Part 5 & 6 Speed Training 1', test: '' },
    { session: 12, type: 'Exam', content: 'Mid-term Progress Test Reading & Listening', test: 'Mid-term Test' },
    { session: 13, type: 'Reading 6', content: 'Part 7 - Double Passages (Articles & Schedules)', test: 'Minitest 4' },
    { session: 14, type: 'Listening 6', content: 'Listening Traps & Paraphrasing Techniques', test: '' },
    { session: 15, type: 'Reading 7', content: 'Part 7 - Triple Passages (Multi-document Synthesis)', test: '' },
    { session: 16, type: 'Listening 7', content: 'Part 3 & 4 Audio Acceleration 1.2x', test: 'Minitest 5' },
    { session: 17, type: 'Reading 8', content: 'Part 5 - Common Confusion Words & Collocations', test: '' },
    { session: 18, type: 'Listening 8', content: 'Part 2 Rapid Response Drills', test: '' },
    { session: 19, type: 'Reading 9', content: 'Part 7 Time Management (25s/question)', test: 'Minitest 6' },
    { session: 20, type: 'Listening 9', content: 'Part 3 & 4 Prediction Techniques', test: '' },
    { session: 21, type: 'Review 1', content: 'Full Reading Section Speed Drill', test: '' },
    { session: 22, type: 'Review 2', content: 'Full Listening Section Practice', test: '' },
    { session: 23, type: 'Review 3', content: 'Final Mock Test Strategy & Tips', test: '' },
    { session: 24, type: 'Practice', content: 'Full Length Test Simulation 200 Questions', test: '' },
    { session: 25, type: 'Exam', content: 'Final Graduation Test Reading & Listening', test: 'Final Test' },
    { session: 26, type: 'Review & Correction', content: 'Final Exam Analysis & Score Guidance', test: 'Test Review' }
  ],
  3: [ // TOEIC B (600-650) - 26 Buổi
    { session: 1, type: 'Reading 1', content: 'Part 5 & 6 Mastery - High Level Grammar & Vocabulary', test: '' },
    { session: 2, type: 'Listening 1', content: 'Part 3 & 4 Advanced Paraphrasing & Inference', test: '' },
    { session: 3, type: 'Reading 2', content: 'Part 7 Triple Passages Complex Cross-referencing', test: 'Minitest 1' },
    { session: 4, type: 'Listening 2', content: 'Part 2 Indirect Answers & Implied Meanings', test: '' },
    { session: 5, type: 'Reading 3', content: 'Part 7 Insert Sentence Questions & Text Cohesion', test: '' },
    { session: 6, type: 'Listening 3', content: 'Part 3 & 4 Speaker Intent & Mood Questions', test: 'Minitest 2' },
    { session: 7, type: 'Reading 4', content: 'Part 5 Idioms, Phrasal Verbs & Business Vocabulary', test: '' },
    { session: 8, type: 'Listening 4', content: 'Part 4 Technical Talks & Complex Business Reports', test: '' },
    { session: 9, type: 'Reading 5', content: 'Part 7 Double/Triple Passages (20 min Speed Test)', test: 'Minitest 3' },
    { session: 10, type: 'Listening 5', content: 'Listening Accent Mastery (UK, AU, US Accents)', test: '' },
    { session: 11, type: 'Review', content: 'Part 5-7 Reading Speed Marathon', test: '' },
    { session: 12, type: 'Exam', content: 'Mid-term Challenge Test Reading & Listening', test: 'Mid-term Test' },
    { session: 13, type: 'Reading 6', content: 'Part 7 Vocabulary-in-Context & Paraphrase Analysis', test: 'Minitest 4' },
    { session: 14, type: 'Listening 6', content: 'Part 3-4 High-Speed Audio Challenge', test: '' },
    { session: 15, type: 'Reading 7', content: 'Part 5 Hard Core Grammar Traps & Corner Cases', test: '' },
    { session: 16, type: 'Listening 7', content: 'Part 1 & 2 Perfect Score Drills', test: 'Minitest 5' },
    { session: 17, type: 'Reading 8', content: 'Part 7 Full Section Simulation (75 mins)', test: '' },
    { session: 18, type: 'Listening 8', content: 'Part 1-4 Full Section Simulation (45 mins)', test: '' },
    { session: 19, type: 'Review 1', content: 'Error Analysis & Score Boost Tactics', test: 'Minitest 6' },
    { session: 20, type: 'Review 2', content: 'Time Pressure & Mindset Optimization', test: '' },
    { session: 21, type: 'Exam 1', content: 'Full ETS Mock Test 1 Reading & Listening', test: 'Mock Test 1' },
    { session: 22, type: 'Review 3', content: 'Deep Diagnostic & Remediation', test: '' },
    { session: 23, type: 'Exam 2', content: 'Full ETS Mock Test 2 Reading & Listening', test: 'Mock Test 2' },
    { session: 24, type: 'Practice', content: 'Speed Reading & Listening Finish Drills', test: '' },
    { session: 25, type: 'Exam', content: 'Final Graduation Exam Reading & Listening (650+ Target)', test: 'Final Exam' },
    { session: 26, type: 'Review & Correction', content: 'Final Exam Correction & Score Certification', test: 'Test Review' }
  ],
  4: [ // TOEIC Luyện Đề (14 buổi)
    { session: 1, type: 'ETS Test 1', content: 'Giải chi tiết Đề ETS 01 (Part 1 - Part 4 Listening)', test: 'ETS 01 L' },
    { session: 2, type: 'ETS Test 1', content: 'Giải chi tiết Đề ETS 01 (Part 5 - Part 7 Reading)', test: 'ETS 01 R' },
    { session: 3, type: 'ETS Test 2', content: 'Giải chi tiết Đề ETS 02 - Bẫy Part 2 & 5', test: 'ETS 02' },
    { session: 4, type: 'ETS Test 3', content: 'Giải chi tiết Đề ETS 03 - Mẹo bạt Part 3 & 7 Triple Passages', test: 'ETS 03' },
    { session: 5, type: 'ETS Test 4', content: 'Giải chi tiết Đề ETS 04 - Chiến thuật phân bổ thời gian', test: 'ETS 04' },
    { session: 6, type: 'Exam', content: 'Bài Thi Thử Giữa Khóa Reading & Listening', test: 'Mid Test' },
    { session: 7, type: 'ETS Test 5', content: 'Giải chi tiết Đề ETS 05 - Tối ưu 200 câu thi', test: 'ETS 05' },
    { session: 8, type: 'ETS Test 6', content: 'Giải chi tiết Đề ETS 06 - Bẫy từ đồng nghĩa Paraphrasing', test: 'ETS 06' },
    { session: 9, type: 'ETS Test 7', content: 'Giải chi tiết Đề ETS 07 - Bốc tách Part 7 khó', test: 'ETS 07' },
    { session: 10, type: 'ETS Test 8', content: 'Giải chi tiết Đề ETS 08 - Tăng tốc nghe giọng Anh-Úc', test: 'ETS 08' },
    { session: 11, type: 'Review 1', content: 'Tổng ôn Bẫy đề thi & Bộ 500 từ vựng ăn điểm chắc chắn', test: 'Review' },
    { session: 12, type: 'Review 2', content: 'Chiến thuật bấm giờ áp lực thi thật', test: '' },
    { session: 13, type: 'Exam', content: 'Bài Thi Bế Giảng Thực Chiến (Đạt mốc tăng 50-100 điểm)', test: 'Final Exam' },
    { session: 14, type: 'Correction', content: 'Chữa bài thi bế giảng & Bảng tư vấn chiến thuật làm bài', test: 'Test Review' }
  ],
  5: [ // TOEIC Cấp Tốc 2 Kỹ Năng (26 buổi dồn 1 tháng)
    { session: 1, type: 'Day 1', content: 'Cấp tốc Part 1 & Ngữ pháp Từ loại Part 5', test: '' },
    { session: 2, type: 'Day 2', content: 'Cấp tốc Part 2 & Các thì động từ Part 5', test: '' },
    { session: 3, type: 'Day 3', content: 'Cấp tốc Part 3 (Business) & Đoạn văn đơn Part 7', test: 'Minitest 1' },
    { session: 4, type: 'Day 4', content: 'Cấp tốc Part 4 (Announcements) & Câu bị động Part 5', test: '' },
    { session: 5, type: 'Day 5', content: 'Cấp tốc Part 7 (Emails & Letters) & To-inf/Gerund', test: '' },
    { session: 6, type: 'Day 6', content: 'Chiến thuật gia tốc Part 2 & Part 6 Text Completion', test: 'Minitest 2' },
    { session: 7, type: 'Day 7', content: 'Cấp tốc Part 3 (Conversations + Visuals) & Mệnh đề quan hệ', test: '' },
    { session: 8, type: 'Day 8', content: 'Cấp tốc Part 4 (Talks + Visuals) & Giới từ/Liên từ', test: '' },
    { session: 9, type: 'Day 9', content: 'Part 7 Double Passages Speed Reading', test: 'Minitest 3' },
    { session: 10, type: 'Day 10', content: 'Full Listening Test Speed Drill 1.1x', test: '' },
    { session: 11, type: 'Day 11', content: 'Full Reading Test Speed Drill (60 mins)', test: '' },
    { session: 12, type: 'Exam', content: 'Bài thi Cấp tốc Giữa kỳ Reading & Listening', test: 'Mid Test' },
    { session: 13, type: 'Day 13', content: 'Tối ưu Part 5 (3 giây/câu) & Bẫy bạt Listening', test: '' },
    { session: 14, type: 'Day 14', content: 'Part 7 Triple Passages Fast Scanning', test: 'Minitest 4' },
    { session: 15, type: 'Day 15', content: 'Luyện đề thực chiến 01 (Part 1 - Part 4)', test: 'ETS 01' },
    { session: 16, type: 'Day 16', content: 'Luyện đề thực chiến 01 (Part 5 - Part 7)', test: 'ETS 01 R' },
    { session: 17, type: 'Day 17', content: 'Luyện đề thực chiến 02 (Bấm giờ ngặt nghèo)', test: 'ETS 02' },
    { session: 18, type: 'Day 18', content: 'Chữa đề 02 & Đóng gói bẫy thi hay gặp', test: 'Minitest 5' },
    { session: 19, type: 'Day 19', content: 'Luyện đề thực chiến 03 & Mẹo quét từ khóa Part 7', test: 'ETS 03' },
    { session: 20, type: 'Day 20', content: 'Listening Accent Mastery & Part 2 Inferences', test: '' },
    { session: 21, type: 'Day 21', content: 'Sprint Test 1 Reading & Listening (Full 200 Questions)', test: 'Sprint 1' },
    { session: 22, type: 'Day 22', content: 'Chữa Sprint Test 1 & Khắc phục điểm yếu', test: 'Minitest 6' },
    { session: 23, type: 'Day 23', content: 'Sprint Test 2 & Mẹo thi tâm lý phòng thi', test: 'Sprint 2' },
    { session: 24, type: 'Day 24', content: 'Rà soát toàn bộ từ vựng & Cú pháp ăn điểm', test: '' },
    { session: 25, type: 'Exam', content: 'Bài Thi Bế Giảng Cấp Tốc Reading & Listening (Tăng 150-200+ điểm)', test: 'Final Exam' },
    { session: 26, type: 'Correction', content: 'Chữa bài thi bế giảng & Nhận chứng chỉ hoàn thành khóa', test: 'Test Review' }
  ]
};

function getSyllabusByCourseId(courseId) {
  return syllabiData[courseId] || syllabiData[1];
}

function getCourseMetaById(courseId) {
  return courseMeta[courseId] || courseMeta[1];
}

function updateSyllabusByCourseId(courseId, newSyllabus, newMeta) {
  courseId = Number(courseId);
  if (newSyllabus && Array.isArray(newSyllabus)) {
    syllabiData[courseId] = newSyllabus;
  }
  if (newMeta && typeof newMeta === 'object') {
    courseMeta[courseId] = { ...(courseMeta[courseId] || {}), ...newMeta };
  }
  return true;
}

function getExamSessionsFromSyllabus(courseId, totalSessions) {
  const syllabus = syllabiData[courseId] || [];
  let midtermSession = null;
  let finalSession = null;

  // 1. Ưu tiên quét theo trường `test` và `type` chính xác
  for (const item of syllabus) {
    const testText = (item.test || '').toLowerCase();
    const typeText = (item.type || '').toLowerCase();

    if (!midtermSession && (testText.includes('mid-term') || testText.includes('giữa kỳ') || (typeText === 'exam' && item.session <= (totalSessions || 26) / 2))) {
      midtermSession = item.session;
    }
    if (!finalSession && (testText.includes('final test') || testText.includes('cuối kỳ') || testText.includes('bế giảng') || (typeText === 'exam' && item.session > (totalSessions || 26) / 2))) {
      finalSession = item.session;
    }
  }

  // 2. Dự phòng nếu chưa tìm thấy
  if (!midtermSession || !finalSession) {
    for (const item of syllabus) {
      const testText = (item.test || '').toLowerCase();
      const typeText = (item.type || '').toLowerCase();
      const contentText = (item.content || '').toLowerCase();
      const combined = `${testText} ${typeText} ${contentText}`;

      if (!midtermSession && (combined.includes('mid-term') || combined.includes('giữa kỳ'))) {
        midtermSession = item.session;
      }
      if (!finalSession && (combined.includes('final test') || combined.includes('graduation test') || combined.includes('cuối kỳ') || combined.includes('bế giảng'))) {
        finalSession = item.session;
      }
    }
  }

  // 3. Defaults nếu không có trong syllabus
  const fallbackTotal = Number(totalSessions || 26);
  if (!midtermSession) midtermSession = Math.max(1, Math.floor(fallbackTotal * 0.5));
  if (!finalSession) finalSession = Math.max(1, fallbackTotal >= 26 ? 25 : Math.floor(fallbackTotal * 0.9));

  return { midtermSession, finalSession };
}

module.exports = {
  syllabiData,
  courseMeta,
  getSyllabusByCourseId,
  getCourseMetaById,
  updateSyllabusByCourseId,
  getExamSessionsFromSyllabus
};
