/**
 * =========================================================================
 * BỘ ĐIỀU KHIỂN THI & LUYỆN ĐỀ TOEIC (EXAM CONTROLLER)
 * =========================================================================
 * Chức năng:
 * - Quản lý ngân hàng đề thi TOEIC & Đề thi đánh giá năng lực đầu vào.
 * - Cho phép học viên làm bài thi trực tuyến online.
 * - Tự động chấm điểm Listening & Reading (thang điểm 990).
 * - Phân tích điểm yếu theo từng Part từ 1 đến 7.
 * - Đề xuất lộ trình khóa học & tự động cập nhật trình độ cho học viên.
 * =========================================================================
 */
const fs = require('fs');
const path = require('path');
const Exam = require('../models/Exam');
const pool = require('../models/db');
const { updateStudentProficiencyLevel } = require('../utils/scoreCalc');

function getCorrectAnswerText(q) {
  if (!q.options || !q.answer) return null;
  const letter = q.answer.trim().toUpperCase();
  const opt = q.options.find(o => String(o).trim().toUpperCase().startsWith(letter + '.'));
  if (!opt) return null;
  return String(opt).replace(/^[A-D]\.\s*/i, '').trim();
}

function getPart5GrammarExplanation(q) {
  if (q.explanation) return q.explanation;

  const letter = (q.answer || '').trim().toUpperCase();
  const text = getCorrectAnswerText(q);
  if (!text) return null;

  const lower = text.toLowerCase();

  const lyAdjectives = ['friendly', 'lovely', 'lonely', 'early', 'timely', 'daily', 'weekly', 'monthly', 'yearly', 'ugly', 'lively', 'costly', 'orderly', 'silly'];
  if (lyAdjectives.includes(lower)) {
    return `Chọn ${letter}. "${text}" là tính từ (adjective đặc biệt có đuôi -ly), dùng để bổ nghĩa cho danh từ hoặc đứng sau động từ liên kết.`;
  }

  if (/(?:ically|ally|ously|ently|fully|ingly)$/.test(lower) || (lower.endsWith('ly') && lower.length > 3)) {
    return `Chọn ${letter}. "${text}" là trạng từ (adverb), dùng để bổ nghĩa cho động từ, tính từ hoặc trạng từ khác trong câu.`;
  }
  if (lower.endsWith('ing')) {
    return `Chọn ${letter}. "${text}" là dạng V-ing (gerund), thường dùng sau giới từ hoặc sau các động từ như avoid, enjoy, suggest...`;
  }
  if (['request', 'stages', 'accessories', 'importance', 'accounting', 'mechanism'].includes(lower) || /(?:tion|sion|ness|ment|ity|ies|ure|age|ance|ence)$/.test(lower)) {
    return `Chọn ${letter}. "${text}" là danh từ (noun), phù hợp với vị trí danh từ trong cấu trúc câu.`;
  }
  if (/(?:ive|ous|ent|ant|al|ic|ful|less|able|ible|ary|ory|ual)$/.test(lower)) {
    return `Chọn ${letter}. "${text}" là tính từ (adjective), dùng sau động từ tobe hoặc bổ nghĩa cho danh từ.`;
  }
  if (['who', 'which', 'whom', 'whose', 'that', 'anyone', 'everyone', 'someone', 'nobody'].includes(lower)) {
    return `Chọn ${letter}. "${text}" là đại từ quan hệ/đại từ bất định, phù hợp với vai trò chủ ngữ hoặc tân ngữ trong mệnh đề quan hệ.`;
  }
  if (['before', 'after', 'when', 'while', 'until', 'unless', 'although', 'because', 'since', 'whereas', 'whenever', 'wherever'].includes(lower)) {
    return `Chọn ${letter}. "${text}" là liên từ chỉ thời gian/nguyên nhân/điều kiện, phù hợp với mối quan hệ logic giữa hai mệnh đề.`;
  }
  if (lower.startsWith('in ') || lower.startsWith('the fact') || lower.startsWith('as long') || lower.startsWith('in spite') || lower.startsWith('even if') || lower.startsWith('given that')) {
    return `Chọn ${letter}. "${text}" là cụm giới từ/liên từ, dùng để nối các mệnh đề và thể hiện quan hệ logic trong câu.`;
  }
  if (['he', 'him', 'his', 'she', 'her', 'they', 'them', 'their', 'it', 'its', 'we', 'us', 'our', 'you', 'your'].includes(lower)) {
    return `Chọn ${letter}. "${text}" là đại từ (pronoun), phù hợp với vai trò ngữ pháp cần thiết trong câu.`;
  }
  if (['notify', 'improve', 'agree', 'except', 'considering', 'legalize', 'accessorize'].includes(lower) || /^[a-z]+e$/.test(lower)) {
    return `Chọn ${letter}. "${text}" là động từ (verb), phù hợp với cấu trúc động từ trong câu (sau to, sau modal, hoặc làm động từ chính).`;
  }

  return `Chọn ${letter}. "${text}" là đáp án đúng vì phù hợp về ngữ pháp và nghĩa trong ngữ cảnh câu.`;
}

const PART_NAMES = {
  1: 'Part 1 - Mô tả tranh',
  2: 'Part 2 - Hỏi đáp',
  3: 'Part 3 - Hội thoại ngắn',
  4: 'Part 4 - Bài nói ngắn',
  5: 'Part 5 - Hoàn thành câu',
  6: 'Part 6 - Hoàn thành đoạn văn',
  7: 'Part 7 - Đọc hiểu'
};

const PART_STUDY_TIPS = {
  1: 'Luyện nghe mô tả tranh: tập trung vào hành động đang diễn ra, loại trừ đáp án sai về chủ thể hoặc hành động.',
  2: 'Luyện nghe hỏi-đáp: chú ý từ đầu câu (Wh-/How/Is/Are...) để xác định loại câu hỏi và chọn câu trả lời phù hợp.',
  3: 'Luyện nghe hội thoại ngắn: ghi chú từ khóa khi nghe, đoán chủ đề trước khi đọc câu hỏi.',
  4: 'Luyện nghe bài nói ngắn (talk): nắm thông tin chính — ai, làm gì, khi nào, ở đâu, tại sao.',
  5: 'Ôn ngữ pháp: trạng từ, tính từ, danh từ, giới từ, đại từ và cấu trúc câu incomplete sentences.',
  6: 'Luyện đọc hoàn thành đoạn văn: đọc ngữ cảnh xung quanh chỗ trống, chú ý liên kết logic giữa các câu.',
  7: 'Luyện đọc hiểu: skimming nắm ý chính trước, scanning tìm thông tin chi tiết khi làm từng câu.'
};

function calculateSkillScores(questions, userAnswers) {
  let listeningCorrect = 0;
  let listeningTotal = 0;
  let readingCorrect = 0;
  let readingTotal = 0;

  questions.forEach((q) => {
    const part = q.part || 1;
    const studentAns = (userAnswers[q.id] || '').trim().toUpperCase();
    const correctAns = q.answer.trim().toUpperCase();
    const isCorrect = studentAns === correctAns;

    if (part <= 4) {
      listeningTotal++;
      if (isCorrect) listeningCorrect++;
    } else {
      readingTotal++;
      if (isCorrect) readingCorrect++;
    }
  });

  const diemNghe = listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 495) : 0;
  const diemDoc = readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 495) : 0;

  return { listeningCorrect, listeningTotal, readingCorrect, readingTotal, diemNghe, diemDoc };
}

function analyzeWeakness(questions, userAnswers) {
  const partStats = {};
  for (let p = 1; p <= 7; p++) {
    partStats[p] = { total: 0, correct: 0, name: PART_NAMES[p] };
  }

  questions.forEach((q) => {
    const part = q.part || 1;
    partStats[part].total++;
    const studentAns = (userAnswers[q.id] || '').trim().toUpperCase();
    const correctAns = q.answer.trim().toUpperCase();
    if (studentAns === correctAns) {
      partStats[part].correct++;
    }
  });

  const partResults = Object.entries(partStats)
    .filter(([, s]) => s.total > 0)
    .map(([part, s]) => ({
      part: parseInt(part, 10),
      name: s.name,
      total: s.total,
      correct: s.correct,
      wrong: s.total - s.correct,
      percentage: Math.round((s.correct / s.total) * 100),
      skill: parseInt(part, 10) <= 4 ? 'Listening' : 'Reading'
    }));

  const weakParts = partResults
    .filter((p) => p.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);

  const listeningParts = partResults.filter((p) => p.skill === 'Listening');
  const readingParts = partResults.filter((p) => p.skill === 'Reading');

  const listeningCorrect = listeningParts.reduce((sum, p) => sum + p.correct, 0);
  const listeningTotal = listeningParts.reduce((sum, p) => sum + p.total, 0);
  const readingCorrect = readingParts.reduce((sum, p) => sum + p.correct, 0);
  const readingTotal = readingParts.reduce((sum, p) => sum + p.total, 0);

  const studySuggestions = [];

  if (listeningTotal > 0) {
    const listeningPct = Math.round((listeningCorrect / listeningTotal) * 100);
    if (listeningPct < 70) {
      studySuggestions.push({
        skill: 'Listening',
        icon: 'bi-headphones',
        title: 'Cần cải thiện kỹ năng Nghe',
        description: `Bạn đúng ${listeningCorrect}/${listeningTotal} câu Nghe (${listeningPct}%). Hãy luyện nghe mỗi ngày 15–20 phút với audio TOEIC và đối chiếu script sau khi nghe.`,
        priority: 'high'
      });
    }
  }

  if (readingTotal > 0) {
    const readingPct = Math.round((readingCorrect / readingTotal) * 100);
    if (readingPct < 70) {
      studySuggestions.push({
        skill: 'Reading',
        icon: 'bi-book',
        title: 'Cần cải thiện kỹ năng Đọc',
        description: `Bạn đúng ${readingCorrect}/${readingTotal} câu Đọc (${readingPct}%). Tập đọc nhanh đoạn văn ngắn và ôn từ vựng theo chủ đề kinh doanh/văn phòng.`,
        priority: 'high'
      });
    }
  }

  weakParts.forEach((wp) => {
    studySuggestions.push({
      skill: wp.skill,
      icon: wp.skill === 'Listening' ? 'bi-volume-up' : 'bi-journal-text',
      title: `Yếu tại ${wp.name}`,
      description: `Đúng ${wp.correct}/${wp.total} câu (${wp.percentage}%). ${PART_STUDY_TIPS[wp.part]}`,
      priority: wp.percentage < 50 ? 'high' : 'medium'
    });
  });

  if (studySuggestions.length === 0) {
    studySuggestions.push({
      skill: 'General',
      icon: 'bi-trophy',
      title: 'Kết quả tốt!',
      description: 'Bạn làm tốt ở tất cả các Part. Tiếp tục luyện đề đều đặn để duy trì phong độ và tăng tốc độ làm bài.',
      priority: 'low'
    });
  }

  return {
    partResults,
    weakParts,
    listeningAccuracy: listeningTotal > 0 ? Math.round((listeningCorrect / listeningTotal) * 100) : 0,
    readingAccuracy: readingTotal > 0 ? Math.round((readingCorrect / readingTotal) * 100) : 0,
    listeningCorrect,
    listeningTotal,
    readingCorrect,
    readingTotal,
    studySuggestions
  };
}

function buildGradingDetail(q, userAnswers) {
  const studentAns = (userAnswers[q.id] || '').trim().toUpperCase();
  const correctAns = q.answer.trim().toUpperCase();
  const isCorrect = studentAns === correctAns;
  const correctAnswerText = getCorrectAnswerText(q);

  return {
    id: q.id,
    part: q.part,
    question: q.question,
    studentAnswer: studentAns || 'Không trả lời',
    correctAnswer: correctAns,
    correctAnswerText,
    isCorrect,
    audio: q.audio,
    image: q.image,
    passage: q.passage,
    script: q.script || q.transcript || null,
    options: q.options || null,
    explanation: q.part === 5 ? getPart5GrammarExplanation(q) : (q.explanation || null)
  };
}

async function checkIsActiveStudent(user) {
  if (!user) return false;

  const [studentRows] = await pool.query(
    'SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?',
    [user.MaNguoiDung]
  );
  const studentIds = studentRows.map(s => s.MaHocVien);
  if (studentIds.length === 0) studentIds.push(0);

  const [regRows] = await pool.query(
    `SELECT COUNT(*) as count FROM dangkyhoc 
     WHERE (MaNguoiDangKy = ? OR MaHocVien IN (?)) 
       AND TrangThai IN ('Thành công', 'Đang học', 'Đã hoàn thành', 'Hoàn thành', 'Đã thanh toán')`,
    [user.MaNguoiDung, studentIds]
  );
  return regRows[0].count > 0;
}

class ExamController {
  static async listExams(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/login?redirect=/exams/free');
      }

      const isActiveStudent = await checkIsActiveStudent(req.session.user);
      const allExams = await Exam.getAll();

      // Active students can see official VIP exams and practice tests (excluding placement tests)
      const exams = allExams.filter(ex => ex.LoaiDe !== 'Đầu vào' && (isActiveStudent || ex.LoaiDe !== 'Luyện đề chính thức'));

      let examHistory = [];
      const [studentRows] = await pool.query(
        'SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?',
        [req.session.user.MaNguoiDung]
      );
      const studentIds = studentRows.map(s => s.MaHocVien);
      if (studentIds.length === 0) studentIds.push(0);

      const [historyRows] = await pool.query(
        `SELECT kq.MaKetQua, kq.MaDeThi, kq.DiemNghe, kq.DiemDoc, kq.NgayThi, bt.TenDeThi, bt.LoaiDe, bt.DuongDanFileJSON
         FROM ketquathi kq
         JOIN baithi bt ON kq.MaDeThi = bt.MaDeThi
         WHERE kq.MaHocVien IN (?) AND bt.LoaiDe != 'Đầu vào'
         ORDER BY kq.NgayThi DESC`,
        [studentIds]
      );
      examHistory = historyRows;

      res.render('student/exams-vip', { exams, examHistory, user: req.session.user, isActiveStudent });
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi máy chủ khi tải danh sách đề thi.');
    }
  }

  static async getPlacementTest(req, res) {
    try {
      if (!req.session.user) {
        return res.redirect('/login?redirect=/exams/placement');
      }

      // ===== Kiểm tra người dùng đã làm test đầu vào chưa (chỉ được làm 1 lần) =====
      const [existingResults] = await pool.query(
        `SELECT kq.*, bt.TenDeThi 
         FROM ketquathi kq 
         JOIN baithi bt ON kq.MaDeThi = bt.MaDeThi 
         WHERE kq.MaHocVien = (
           SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ? LIMIT 1
         ) AND bt.LoaiDe = 'Đầu vào'
         ORDER BY kq.NgayThi DESC LIMIT 1`,
        [req.session.user.MaNguoiDung]
      );

      if (existingResults.length > 0 && !req.query.retake && !req.query.timeout && !req.query.force) {
        // Người dùng đã làm test đầu vào rồi - hiển thị kết quả cũ
        const existingResult = existingResults[0];
        const totalScore = existingResult.DiemNghe + existingResult.DiemDoc;
        
        const [recommendations] = await pool.query(
          `SELECT lt.*, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong 
           FROM lotrinh_dexuat lt 
           JOIN khoahoc kh ON lt.MaKhoaHoc = kh.MaKhoaHoc 
           WHERE ? >= lt.DiemTu AND ? <= lt.DiemDen AND (lt.is_active = 1 OR lt.is_active IS NULL)`,
           [totalScore, totalScore]
        );

        let filteredRecs = recommendations;
        if (totalScore > 350) {
          filteredRecs = recommendations.filter(r => r.LoaiLoTrinh !== 'Mất gốc');
        }
        const isGap = (filteredRecs.length === 0);
        if (isGap) {
          console.warn(`[ROADMAP WARNING] Student test score ${totalScore} fell into unconfigured score gap.`);
        }

        const [allRoadmaps] = await pool.query(
          `SELECT lt.MaLoTrinh, lt.MaKhoaHoc, lt.DiemTu, lt.DiemDen, lt.LoaiLoTrinh, COALESCE(NULLIF(lt.MoTa, ''), kh.MoTa) AS MoTa, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong, kh.CapDo 
           FROM lotrinh_dexuat lt 
           JOIN khoahoc kh ON lt.MaKhoaHoc = kh.MaKhoaHoc 
           WHERE (lt.is_active = 1 OR lt.is_active IS NULL)
           ORDER BY lt.DiemTu ASC, lt.DiemDen ASC`
        );

        const availableClasses = await fetchAvailableClassesWithSchedule();

        return res.render('student/placement-result', {
          exam: { TenDeThi: existingResult.TenDeThi, LoaiDe: 'Đầu vào' },
          correctCount: null,
          totalQuestions: null,
          totalScore,
          diemNghe: existingResult.DiemNghe,
          diemDoc: existingResult.DiemDoc,
          recommendations: filteredRecs,
          isGap,
          hideMatGoc: totalScore > 350,
          allRoadmaps,
          availableClasses,
          gradingDetails: [],
          user: req.session.user,
          alreadyTaken: true,
          takenDate: existingResult.NgayThi
        });
      }

      // Fetch the placement tests (LoaiDe = "Đầu vào")
      const placementTests = await Exam.getPlacementTests();
      if (placementTests.length === 0) {
        return res.status(404).send('Không tìm thấy bài test đầu vào nào trong cơ sở dữ liệu.');
      }

      // Randomize which placement test to assign
      const randomIndex = Math.floor(Math.random() * placementTests.length);
      const exam = placementTests[randomIndex];
      const jsonPath = path.join(__dirname, '..', 'public', exam.DuongDanFileJSON);

      if (!fs.existsSync(jsonPath)) {
        return res.status(404).send('Không tìm thấy file câu hỏi của bài test.');
      }

      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const testData = JSON.parse(rawData);

      res.render('student/placement-test', {
        exam,
        questions: testData.questions,
        testAudio: testData.audio || null,
        user: req.session.user
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi máy chủ khi tải bài test đầu vào.');
    }
  }

  static async submitPlacementTest(req, res) {
    try {

      const { MaDeThi, answers } = req.body;
      const userAnswers = answers || {};

      // Load the exam metadata
      const exam = await Exam.getById(MaDeThi);
      if (!exam) {
        return res.status(404).send('Không tìm thấy bài test tương ứng.');
      }

      const jsonPath = path.join(__dirname, '..', 'public', exam.DuongDanFileJSON);
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).send('Không tìm thấy file câu hỏi.');
      }

      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const testData = JSON.parse(rawData);
      const questions = testData.questions;

      // Grade the exam
      let correctCount = 0;
      const totalQuestions = questions.length;

      questions.forEach((q) => {
        const studentAns = (userAnswers[q.id] || '').trim().toUpperCase();
        const correctAns = q.answer.trim().toUpperCase();
        if (studentAns === correctAns) {
          correctCount++;
        }
      });

      const skillScores = calculateSkillScores(questions, userAnswers);
      const diemNghe = skillScores.diemNghe;
      const diemDoc = skillScores.diemDoc;
      const totalScore = diemNghe + diemDoc;

      let maHocVien = null;
      let sessionKhach = null;

      if (req.session.user) {
        // Get MaHocVien for this user from hosohocvien
        let [studentRows] = await pool.query(
          'SELECT MaHocVien FROM hosohocvien WHERE MaNguoiDung = ?',
          [req.session.user.MaNguoiDung]
        );
        if (studentRows.length > 0) {
          maHocVien = studentRows[0].MaHocVien;
        } else {
          const [insRes] = await pool.query(
            'INSERT INTO hosohocvien (MaNguoiDung, HoTen, QuanHe, TrinhDoHienTai) VALUES (?, ?, "Bản thân", "Chưa xác định")',
            [req.session.user.MaNguoiDung, req.session.user.HoTen || 'Học viên']
          );
          maHocVien = insRes.insertId;
        }
      } else {
        sessionKhach = req.sessionID || 'GUEST_SESSION';
      }

      // Look up recommendations (lotrinh_dexuat) based on totalScore
      const [recommendations] = await pool.query(
        `SELECT lt.*, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong 
         FROM lotrinh_dexuat lt 
         JOIN khoahoc kh ON lt.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE ? >= lt.DiemTu AND ? <= lt.DiemDen`,
         [totalScore, totalScore]
      );

      // Save result in ketquathi
      let maLoTrinh = null;
      if (recommendations.length > 0) {
        maLoTrinh = recommendations[0].MaLoTrinh;
      }

      const [insertResult] = await pool.query(
        `INSERT INTO ketquathi (MaHocVien, SessionKhach, MaDeThi, MaLoTrinh, DiemNghe, DiemDoc, ChiTietBaiLam, NgayThi) 
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          maHocVien,
          sessionKhach,
          MaDeThi,
          maLoTrinh,
          diemNghe,
          diemDoc,
          JSON.stringify(userAnswers)
        ]
      );

      if (maHocVien) {
        await updateStudentProficiencyLevel(maHocVien);
      }

      res.redirect(`/exams/result/${insertResult.insertId}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi máy chủ khi chấm điểm.');
    }
  }

  static async showResult(req, res) {
    try {
      const maKetQua = req.params.id;

      // 1. Fetch ketquathi
      const [resultRows] = await pool.query(
        'SELECT * FROM ketquathi WHERE MaKetQua = ?',
        [maKetQua]
      );
      if (resultRows.length === 0) {
        return res.status(404).send('Không tìm thấy kết quả bài thi.');
      }
      const examResult = resultRows[0];

      // 2. Fetch exam metadata
      const exam = await Exam.getById(examResult.MaDeThi);
      if (!exam) {
        return res.status(404).send('Không tìm thấy đề thi tương ứng.');
      }

      // 3. Load exam questions to grade / display answers
      const jsonPath = path.join(__dirname, '..', 'public', exam.DuongDanFileJSON);
      if (!fs.existsSync(jsonPath)) {
        return res.status(404).send('Không tìm thấy file câu hỏi.');
      }
      const rawData = fs.readFileSync(jsonPath, 'utf8');
      const testData = JSON.parse(rawData);
      const questions = testData.questions;

      // Parse student answers
      const userAnswers = JSON.parse(examResult.ChiTietBaiLam || '{}');

      // Re-grade to populate gradingDetails
      let correctCount = 0;
      const totalQuestions = questions.length;
      const gradingDetails = [];

      questions.forEach(q => {
        const detail = buildGradingDetail(q, userAnswers);
        if (detail.isCorrect) {
          correctCount++;
        }
        gradingDetails.push(detail);
      });

      const weaknessAnalysis = analyzeWeakness(questions, userAnswers);
      const isActiveStudent = await checkIsActiveStudent(req.session.user);
      const totalScore = examResult.DiemNghe + examResult.DiemDoc;
      const diemNghe = examResult.DiemNghe;
      const diemDoc = examResult.DiemDoc;

      // Look up recommendations
      const [recommendations] = await pool.query(
        `SELECT lt.*, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong 
         FROM lotrinh_dexuat lt 
         JOIN khoahoc kh ON lt.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE ? >= lt.DiemTu AND ? <= lt.DiemDen AND (lt.is_active = 1 OR lt.is_active IS NULL)`,
         [totalScore, totalScore]
      );

      let filteredRecs = recommendations;
      if (totalScore > 350) {
        filteredRecs = recommendations.filter(r => r.LoaiLoTrinh !== 'Mất gốc');
      }
      const isGap = (filteredRecs.length === 0);
      if (isGap) {
        console.warn(`[ROADMAP WARNING] Student test score ${totalScore} fell into unconfigured score gap.`);
      }

      const [allRoadmaps] = await pool.query(
        `SELECT lt.MaLoTrinh, lt.MaKhoaHoc, lt.DiemTu, lt.DiemDen, lt.LoaiLoTrinh, COALESCE(NULLIF(lt.MoTa, ''), kh.MoTa) AS MoTa, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong, kh.CapDo 
         FROM lotrinh_dexuat lt 
         JOIN khoahoc kh ON lt.MaKhoaHoc = kh.MaKhoaHoc 
         WHERE (lt.is_active = 1 OR lt.is_active IS NULL)
         ORDER BY lt.DiemTu ASC, lt.DiemDen ASC`
      );

      const availableClasses = await fetchAvailableClassesWithSchedule();

      res.render('student/placement-result', {
        exam,
        correctCount,
        totalQuestions,
        totalScore,
        diemNghe,
        diemDoc,
        recommendations: filteredRecs,
        isGap,
        hideMatGoc: totalScore > 350,
        allRoadmaps,
        availableClasses,
        gradingDetails,
        weaknessAnalysis,
        isActiveStudent,
        user: req.session.user,
        examResultId: maKetQua
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Lỗi máy chủ khi tải kết quả bài thi.');
    }
  }
}

async function fetchAvailableClassesWithSchedule() {
  try {
    const [availableClasses] = await pool.query(
      `SELECT lh.*, kh.TenKhoaHoc, kh.HocPhi, kh.ThoiLuong, kh.CapDo, kh.MoTa,
              (SELECT COUNT(*) FROM dangkyhoc dk WHERE dk.MaLopHoc = lh.MaLopHoc AND dk.TrangThai IN ('Thành công', 'Đang học')) AS SiSoHienTai
       FROM lophoc lh
       JOIN khoahoc kh ON lh.MaKhoaHoc = kh.MaKhoaHoc
       WHERE lh.TrangThaiLop NOT IN ('Kết thúc', 'Đã đóng', 'Đã hủy')`
    );

    const [schedules] = await pool.query(`
      SELECT tkb.MaLopHoc, tkb.ThuTrongTuan, bh.TenBuoi, 
             TIME_FORMAT(bh.GioBatDau, '%H:%i') AS GioBatDau, 
             TIME_FORMAT(bh.GioKetThuc, '%H:%i') AS GioKetThuc, 
             ph.TenPhong,
             u.HoTen AS TenGiangVien
      FROM thoikhoabieu tkb
      JOIN lophoc lh ON tkb.MaLopHoc = lh.MaLopHoc
      JOIN buoihoc bh ON tkb.MaBuoiHoc = bh.MaBuoiHoc
      JOIN phonghoc ph ON tkb.MaPhongHoc = ph.MaPhongHoc
      LEFT JOIN hosonhansu n ON lh.MaGiangVien = n.MaNhanSu
      LEFT JOIN nguoidung u ON n.MaNguoiDung = u.MaNguoiDung
      ORDER BY FIELD(tkb.ThuTrongTuan, 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'), bh.GioBatDau
    `);

    function formatCompactSchedule(list) {
      if (!list || list.length === 0) return 'Chưa có lịch';
      const dayShort = {
        'Thứ Hai': 'Thứ 2', 'Thứ Ba': 'Thứ 3', 'Thứ Tư': 'Thứ 4', 'Thứ Năm': 'Thứ 5', 'Thứ Sáu': 'Thứ 6', 'Thứ Bảy': 'Thứ 7', 'Chủ Nhật': 'CN'
      };
      const timeGroup = {};
      list.forEach(item => {
        const timeKey = `${item.GioBatDau} - ${item.GioKetThuc}`;
        if (!timeGroup[timeKey]) timeGroup[timeKey] = [];
        timeGroup[timeKey].push(dayShort[item.ThuTrongTuan] || item.ThuTrongTuan);
      });
      const parts = [];
      for (const [time, days] of Object.entries(timeGroup)) {
        if (days.length === 5 && days.includes('Thứ 2') && days.includes('Thứ 6')) {
          parts.push(`Thứ 2 - 6 (${time})`);
        } else {
          parts.push(`${days.join(', ')} (${time})`);
        }
      }
      return parts.join('; ');
    }

    availableClasses.forEach(cls => {
      const clsSchedules = schedules.filter(s => s.MaLopHoc === cls.MaLopHoc);
      cls.LichHoc = formatCompactSchedule(clsSchedules);
    });

    return availableClasses;
  } catch (err) {
    console.error('Error fetching available classes:', err);
    return [];
  }
}

module.exports = ExamController;
