/**
 * script.js - 共用互動功能
 * 適合國小四年級：3D Q 版兒童遊戲風格、四層次閱讀測驗、50字防呆開放題、智慧評分、CSV匯出
 */

// ================= 音效合成器 (Web Audio API) =================
const SoundEffects = {
  ctx: null,
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  },
  play(type) {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'correct') {
        // 輕快叮咚音
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'wrong') {
        // 溫和提醒音
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.setValueAtTime(220, now + 0.15);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'fanfare') {
        // 慶祝歡呼音
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const o = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          o.connect(g);
          g.connect(this.ctx.destination);
          o.frequency.setValueAtTime(freq, now + i * 0.12);
          g.gain.setValueAtTime(0.2, now + i * 0.12);
          g.gain.linearRampToValueAtTime(0.01, now + i * 0.12 + 0.25);
          o.start(now + i * 0.12);
          o.stop(now + i * 0.12 + 0.25);
        });
      } else if (type === 'rooster') {
        // 天文鐘金雞啼鳴模擬音效
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(950, now + 0.25);
        osc.frequency.setValueAtTime(800, now + 0.35);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch (e) {
      console.log('Audio not supported or blocked:', e);
    }
  }
};

// ================= 全局學生資料與狀態 =================
const AppState = {
  seat: localStorage.getItem('agy_student_seat') || '',
  name: localStorage.getItem('agy_student_name') || '',
  userAnswers: {},       // { qId: selectedOpt }
  openEndedText: '',
  openEndedResult: null, // { score, grade, feedback }
  activeLevel: 'all',    // all, 1, 2, 3, 4
  fontSize: 'normal',

  saveUser() {
    localStorage.setItem('agy_student_seat', this.seat);
    localStorage.setItem('agy_student_name', this.name);
    // 同步到頁面上所有座號與姓名顯示
    document.querySelectorAll('.display-seat').forEach(el => el.textContent = this.seat || '未填寫');
    document.querySelectorAll('.display-name').forEach(el => el.textContent = this.name || '同學');
  }
};

// ================= DOM 載入後初始化 =================
document.addEventListener('DOMContentLoaded', () => {
  initStudentInfo();
  initTabs();
  initGallery();
  initFontControls();
  initTTS();
  initOpenEndedQuestion();
  initQuiz();
  initGame();
  initExport();

  // 若頁面有定義 ARTICLE_DATA，載入資料
  if (window.ARTICLE_DATA) {
    loadArticleData(window.ARTICLE_DATA);
  }
});

// 1. 學生資料綁定
function initStudentInfo() {
  const seatInput = document.getElementById('studentSeat');
  const nameInput = document.getElementById('studentName');

  if (seatInput) {
    seatInput.value = AppState.seat;
    seatInput.addEventListener('input', (e) => {
      AppState.seat = e.target.value.trim();
      AppState.saveUser();
    });
  }

  if (nameInput) {
    nameInput.value = AppState.name;
    nameInput.addEventListener('input', (e) => {
      AppState.name = e.target.value.trim();
      AppState.saveUser();
    });
  }

  AppState.saveUser();
}

// 2. 標籤頁切換 (原版圖文 vs 好讀文字)
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      SoundEffects.play('click');
      const targetId = btn.getAttribute('data-tab');
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.style.display = 'block';
    });
  });
}

// 3. 圖片畫廊切換
function initGallery() {
  const thumbs = document.querySelectorAll('.thumb-btn');
  const mainImg = document.getElementById('mainGalleryImg');

  thumbs.forEach(thumb => {
    thumb.addEventListener('click', () => {
      SoundEffects.play('click');
      thumbs.forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      const imgSrc = thumb.getAttribute('data-img');
      if (mainImg) {
        mainImg.src = imgSrc;
      }
    });
  });
}

// 4. 字級大小切換
function initFontControls() {
  const fontBtns = document.querySelectorAll('.font-btn');
  const textReader = document.getElementById('textReader');

  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      SoundEffects.play('click');
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const size = btn.getAttribute('data-size');
      if (textReader) {
        textReader.classList.remove('font-normal', 'font-large', 'font-xlarge');
        textReader.classList.add(`font-${size}`);
      }
    });
  });
}

// 5. 語音朗讀 (Web Speech API)
function initTTS() {
  const ttsPlayBtn = document.getElementById('ttsPlayBtn');
  const ttsStopBtn = document.getElementById('ttsStopBtn');

  if (!('speechSynthesis' in window)) {
    if (ttsPlayBtn) ttsPlayBtn.style.display = 'none';
    if (ttsStopBtn) ttsStopBtn.style.display = 'none';
    return;
  }

  let synth = window.speechSynthesis;
  let utter = null;

  if (ttsPlayBtn) {
    ttsPlayBtn.addEventListener('click', () => {
      SoundEffects.play('click');
      if (synth.speaking && synth.paused) {
        synth.resume();
        ttsPlayBtn.innerHTML = '⏸️ 暫停朗讀';
        return;
      }

      if (synth.speaking) {
        synth.pause();
        ttsPlayBtn.innerHTML = '▶️ 繼續朗讀';
        return;
      }

      const textReader = document.getElementById('textReader');
      if (!textReader) return;

      const fullText = textReader.innerText;
      utter = new SpeechSynthesisUtterance(fullText);
      utter.lang = 'zh-TW';
      utter.rate = 0.9; // 適合四年級學生的舒適語速

      utter.onend = () => {
        ttsPlayBtn.innerHTML = '🔊 全文朗讀';
      };

      utter.onerror = () => {
        ttsPlayBtn.innerHTML = '🔊 全文朗讀';
      };

      synth.speak(utter);
      ttsPlayBtn.innerHTML = '⏸️ 暫停朗讀';
    });
  }

  if (ttsStopBtn) {
    ttsStopBtn.addEventListener('click', () => {
      SoundEffects.play('click');
      synth.cancel();
      if (ttsPlayBtn) ttsPlayBtn.innerHTML = '🔊 全文朗讀';
    });
  }
}

// 6. 16 題四層次閱讀測驗邏輯
function initQuiz() {
  const levelPills = document.querySelectorAll('.level-pill');
  levelPills.forEach(pill => {
    pill.addEventListener('click', () => {
      SoundEffects.play('click');
      levelPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const level = pill.getAttribute('data-level');
      AppState.activeLevel = level;
      filterQuizQuestions(level);
    });
  });
}

function filterQuizQuestions(level) {
  const cards = document.querySelectorAll('.question-card');
  cards.forEach(card => {
    if (level === 'all' || card.getAttribute('data-level') === level) {
      card.style.display = 'block';
    } else {
      card.style.display = 'none';
    }
  });
}

function renderQuestions(questions) {
  const quizList = document.getElementById('quizList');
  if (!quizList) return;
  quizList.innerHTML = '';

  const levelNames = {
    1: '第一層：字面理解',
    2: '第二層：推論理解',
    3: '第三層：批判評價',
    4: '第四層：應用創造'
  };

  questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'question-card';
    card.setAttribute('data-id', q.id);
    card.setAttribute('data-level', q.level);

    card.innerHTML = `
      <div class="q-header">
        <div class="q-title">
          <span class="q-badge level-${q.level}-badge">${levelNames[q.level]}</span>
          第 ${idx + 1} 題：${q.question}
        </div>
      </div>
      <div class="options-list">
        ${q.options.map((opt, optIdx) => `
          <button class="option-btn" data-qid="${q.id}" data-opt="${optIdx + 1}">
            <span class="opt-num">${optIdx + 1}</span>
            <span>${opt}</span>
          </button>
        `).join('')}
      </div>
      <div class="explanation-box" id="exp_${q.id}">
        <strong>💡 解析：</strong>${q.explanation}
        <div class="exp-quote">📖 <strong>文章依據：</strong>${q.quote}</div>
      </div>
    `;

    quizList.appendChild(card);
  });

  // 綁定選項點擊事件
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const qId = parseInt(this.getAttribute('data-qid'));
      const selectedOpt = parseInt(this.getAttribute('data-opt'));
      handleOptionSelect(qId, selectedOpt);
    });
  });
}

function handleOptionSelect(qId, selectedOpt) {
  if (!window.ARTICLE_DATA) return;
  const question = window.ARTICLE_DATA.questions.find(q => q.id === qId);
  if (!question) return;

  AppState.userAnswers[qId] = selectedOpt;

  // 取得該題所有選項按鈕
  const card = document.querySelector(`.question-card[data-id="${qId}"]`);
  if (!card) return;

  const optBtns = card.querySelectorAll('.option-btn');
  optBtns.forEach(btn => {
    const opt = parseInt(btn.getAttribute('data-opt'));
    btn.classList.remove('selected', 'correct', 'wrong');

    if (opt === selectedOpt) {
      if (opt === question.correct) {
        btn.classList.add('correct');
        SoundEffects.play('correct');
      } else {
        btn.classList.add('wrong');
        SoundEffects.play('wrong');
      }
    }
    // 同步把正確答案標示出來
    if (opt === question.correct) {
      btn.classList.add('correct');
    }
  });

  // 顯示詳解與文章依據
  const expBox = document.getElementById(`exp_${qId}`);
  if (expBox) expBox.classList.add('show');

  // 更新統計分數
  updateStats();
}

// 7. 開放式思考題 (深度探究) - 50 字防呆與智慧評分
function initOpenEndedQuestion() {
  const textarea = document.getElementById('openEndedInput');
  const submitBtn = document.getElementById('openEndedSubmitBtn');
  const statusEl = document.getElementById('openEndedStatus');
  const resultCard = document.getElementById('openEndedResultCard');

  if (!textarea || !submitBtn || !statusEl) return;

  // 即時字數監聽 (使用 text.replace(/\s+/g, '') 過濾所有空白)
  textarea.addEventListener('input', () => {
    const rawText = textarea.value;
    const validText = rawText.replace(/\s+/g, '');
    const count = validText.length;
    AppState.openEndedText = rawText;

    if (count < 50) {
      const remaining = 50 - count;
      submitBtn.disabled = true;
      submitBtn.classList.add('btn-disabled');
      statusEl.className = 'char-status under';
      statusEl.innerHTML = `✏️ 目前寫了 <strong>${count}</strong> 個字，再多寫 <strong>${remaining}</strong> 個字就能分享你的思考囉！加油，你可以的！✨`;
    } else {
      submitBtn.disabled = false;
      submitBtn.classList.remove('btn-disabled');
      statusEl.className = 'char-status ready';
      statusEl.innerHTML = `🎉 太棒了！你已經寫了 <strong>${count}</strong> 個字，想法好豐富，快按送出跟大家一起討論吧！`;
    }
  });

  // 送出按鈕攔截與評分
  submitBtn.addEventListener('click', () => {
    const validText = textarea.value.replace(/\s+/g, '');
    const count = validText.length;

    if (count < 50) {
      SoundEffects.play('wrong');
      const remaining = 50 - count;
      alert(`你的思考很棒喔！不過還差 ${remaining} 個字才滿 50 字，再多寫一點你的想法吧！💪`);
      return;
    }

    // 進行智慧前端評分
    gradeOpenEndedAnswer(textarea.value, validText);
  });
}

function gradeOpenEndedAnswer(rawText, validText) {
  SoundEffects.play('fanfare');
  const length = validText.length;
  const title = (window.ARTICLE_DATA && window.ARTICLE_DATA.title) ? window.ARTICLE_DATA.title : '文章';

  // 關鍵字比對池 (結合特定文章與通用延伸詞彙)
  const defaultKeywords = [
    '鹽田', '井仔腳', '海水', '太陽', '陽光', '海風', '蒸發', '結晶', '瓦片', '鹽耙', '阿公', '祖先', '智慧', '文化', '資產', '自然', '乾淨', '白皙', '體驗', '小山', '介紹', '分享', '保存', '傳承',
    '時鐘', '天文', '齒輪', '星象', '月亮', '公雞', '骷髏', '報時', '捷克', '布拉格',
    '學校', '同學', '老師', '上課', '下課', '提醒', '音樂', '表演', '生活', '設計', '時間'
  ];
  const keywords = (window.ARTICLE_DATA && window.ARTICLE_DATA.gradingKeywords) ? window.ARTICLE_DATA.gradingKeywords : defaultKeywords;
  
  let matchCount = 0;
  keywords.forEach(kw => {
    if (validText.includes(kw)) matchCount++;
  });

  // 計算分數與等第
  let score = 80;
  let grade = '甲等';
  let feedback = '';

  const isSaltArticle = title.includes('鹽田');
  const isIslandArticle = title.includes('角鴞') || title.includes('約定') || title.includes('蘭嶼');

  if (matchCount >= 4 && length >= 80) {
    score = Math.min(100, 95 + Math.floor(Math.random() * 5));
    grade = '優等';
    if (isIslandArticle) {
      feedback = `🌟 哇！你的想法太溫暖且深刻了！你不僅精準理解了達悟族「半穴居地下屋、靠背石與飛魚季」的文化內涵，更深刻體會到「不貪心、懂得感恩、與海約定共生」的永續哲理。結合生活中的愛惜資源實踐，充滿同理心與文采，獲得最高肯定【優等】！`;
    } else if (isSaltArticle) {
      feedback = `🌟 哇！你的想法太深刻又有創意了！你不僅精準運用了「陽光、海風、蒸發與碎瓦片吸熱」等日晒鹽核心原理，還展現出推廣兩百年文化資產與老祖先智慧的熱情。內容條理清晰、文筆豐富且充滿同理心，獲得最高肯定【優等】！`;
    } else {
      feedback = `🌟 哇！你的想法太有創意又深刻了！你不僅確實掌握了課文的核心特色，還非常貼心且巧妙地結合了校園與生活需求。文筆流暢豐富，思考層次非常棒，獲得最高肯定【優等】！`;
    }
  } else if (matchCount >= 2 && length >= 50) {
    score = 88 + Math.floor(Math.random() * 5);
    grade = '甲等';
    if (isIslandArticle) {
      feedback = `👏 表現得很棒！你的回答清楚表達了對大自然的尊重與愛護，並且呼應了課文中角鴞守護者與不貪心、不浪費的精神。如果能再多補充一點點在生活中「如何落實珍惜或感恩分享」的具體小例子，你的分享會更加感動人心喔！`;
    } else if (isSaltArticle) {
      feedback = `👏 表現得很棒！你的回答清楚表達了想向大家介紹鹽田的想法，並呼應了課文中日晒鹽工序的特色。如果能再多補充一點點關於「為什麼要鋪碎瓦片」或「老祖先如何利用自然力量」的小細節，你的分享會更具吸引力喔！`;
    } else {
      feedback = `👏 表現得很棒！你的回答清楚表達了自己的想法，並且有呼應到文章中的關鍵元素與生活便利性。如果能再多加一點點細節，你的設計會更加完美喔！`;
    }
  } else {
    score = 80 + Math.floor(Math.random() * 5);
    grade = '乙等';
    feedback = `👍 寫得很用心！你已經突破了50字的挑戰，提出了可愛的點子。建議下次可以多融入課文提到的核心科學原理與老祖先智慧，分享內容會更充實、更有說服力喔！`;
  }

  AppState.openEndedResult = {
    score,
    grade,
    feedback,
    content: rawText
  };

  // 顯示評分結果卡片
  const resultCard = document.getElementById('openEndedResultCard');
  if (resultCard) {
    resultCard.style.display = 'block';
    resultCard.innerHTML = `
      <div class="grading-header">
        <h4>🎯 智慧學習回饋診斷</h4>
        <span class="grade-badge">${grade}（${score}分）</span>
      </div>
      <p class="feedback-text">${feedback}</p>
    `;
    resultCard.scrollIntoView({ behavior: 'smooth' });
  }

  updateStats();
}

// 8. 成績統計與成果展示
function updateStats() {
  if (!window.ARTICLE_DATA) return;
  const questions = window.ARTICLE_DATA.questions;
  let correctCount = 0;
  let answeredCount = 0;

  let levelStats = {
    1: { total: 0, correct: 0 },
    2: { total: 0, correct: 0 },
    3: { total: 0, correct: 0 },
    4: { total: 0, correct: 0 }
  };

  questions.forEach(q => {
    levelStats[q.level].total++;
    if (AppState.userAnswers[q.id] !== undefined) {
      answeredCount++;
      if (AppState.userAnswers[q.id] === q.correct) {
        correctCount++;
        levelStats[q.level].correct++;
      }
    }
  });

  const quizScore = Math.round((correctCount / questions.length) * 100);

  // 更新介面數值
  const statCorrectEl = document.getElementById('statCorrectCount');
  const statScoreEl = document.getElementById('statTotalScore');
  const statProgressEl = document.getElementById('statAnsweredProgress');

  if (statCorrectEl) statCorrectEl.textContent = `${correctCount} / ${questions.length}`;
  if (statScoreEl) statScoreEl.textContent = `${quizScore} 分`;
  if (statProgressEl) statProgressEl.textContent = `${answeredCount} / ${questions.length}`;

  // 更新證書內容
  const certScoreEl = document.getElementById('certQuizScore');
  const certOpenScoreEl = document.getElementById('certOpenScore');
  const certOpenTextEl = document.getElementById('certOpenText');
  const certFeedbackEl = document.getElementById('certTeacherFeedback');

  if (certScoreEl) certScoreEl.textContent = `${quizScore}分 (答對 ${correctCount}/${questions.length} 題)`;
  if (AppState.openEndedResult) {
    if (certOpenScoreEl) certOpenScoreEl.textContent = `${AppState.openEndedResult.grade} (${AppState.openEndedResult.score}分)`;
    if (certOpenTextEl) certOpenTextEl.textContent = AppState.openEndedResult.content;
    if (certFeedbackEl) certFeedbackEl.textContent = AppState.openEndedResult.feedback;
  }
}

// 9. 主題互動遊戲：布拉格天文鐘齒輪與星象大冒險
function initGame() {
  const spinBtn = document.getElementById('gameSpinBtn');
  const roosterBtn = document.getElementById('gameRoosterBtn');
  const dial = document.getElementById('gameClockDial');
  const hand = document.getElementById('gameClockHand');
  const msgBox = document.getElementById('gameMessage');

  let currentAngle = 0;
  let isNoon = false;

  if (spinBtn && dial && hand) {
    spinBtn.addEventListener('click', () => {
      SoundEffects.play('click');
      currentAngle += 90;
      dial.style.transform = `rotate(${currentAngle}deg)`;
      hand.style.transform = `rotate(${currentAngle * 1.5}deg)`;

      const phases = ['🌕 望月（滿月）', '🌗 下弦月', '🌑 朔月（新月）', '🌓 上弦月'];
      const phaseIdx = Math.floor((currentAngle / 90) % 4);
      if (msgBox) {
        msgBox.innerHTML = `⚙️ 齒輪急速嚙合轉動中！天文鐘觀測到當前月相：<strong>${phases[phaseIdx]}</strong>！`;
      }
    });
  }

  if (roosterBtn) {
    roosterBtn.addEventListener('click', () => {
      SoundEffects.play('rooster');
      if (msgBox) {
        msgBox.innerHTML = `🔔 鐘聲噹噹響起！骷髏人拉響了鈴鐺，十二門徒向你微笑揮手，頂端金色公雞：「喔喔喔——」整點報時大成功！🎉`;
      }
      setTimeout(() => {
        SoundEffects.play('fanfare');
      }, 500);
    });
  }
}

// 10. CSV 匯出與證書列印
function initExport() {
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const printCertBtn = document.getElementById('printCertBtn');

  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      SoundEffects.play('click');
      exportLearningRecordCSV();
    });
  }

  if (printCertBtn) {
    printCertBtn.addEventListener('click', () => {
      SoundEffects.play('click');
      window.print();
    });
  }
}

function exportLearningRecordCSV() {
  if (!window.ARTICLE_DATA) return;

  const seat = AppState.seat || '未填寫';
  const name = AppState.name || '同學';
  const title = window.ARTICLE_DATA.title || '閱讀教材';
  const questions = window.ARTICLE_DATA.questions;

  let correctCount = 0;
  questions.forEach(q => {
    if (AppState.userAnswers[q.id] === q.correct) correctCount++;
  });
  const quizScore = Math.round((correctCount / questions.length) * 100);

  const openText = AppState.openEndedResult ? AppState.openEndedResult.content.replace(/"/g, '""') : '尚未作答';
  const openGrade = AppState.openEndedResult ? AppState.openEndedResult.grade : '未評定';
  const openScore = AppState.openEndedResult ? AppState.openEndedResult.score : 0;
  const feedback = AppState.openEndedResult ? AppState.openEndedResult.feedback.replace(/"/g, '""') : '無';
  const dateStr = new Date().toLocaleString('zh-TW');

  // 組合 CSV
  const headers = ['學生座號', '學生姓名', '課程篇名', '選擇題得分', '答對題數', '總題數', '開放思考題等第', '開放思考題得分', '開放思考題作答內容', '教師智慧評語', '測驗完成時間'];
  const row = [
    `"${seat}"`,
    `"${name}"`,
    `"${title}"`,
    quizScore,
    correctCount,
    questions.length,
    `"${openGrade}"`,
    openScore,
    `"${openText}"`,
    `"${feedback}"`,
    `"${dateStr}"`
  ];

  const csvContent = '\uFEFF' + headers.join(',') + '\n' + row.join(',') + '\n';
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `閱讀成績單_${seat}_${name}_${title}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 11. 載入文章資料模型
function loadArticleData(data) {
  // 標題與文章元資訊
  document.title = `${data.title} - 國小四年級深層閱讀互動網站`;
  const titleEl = document.getElementById('articleTitle');
  if (titleEl) titleEl.textContent = data.title;

  const issueEl = document.getElementById('articleIssue');
  if (issueEl) issueEl.textContent = data.issue;

  const authorEl = document.getElementById('articleAuthor');
  if (authorEl) authorEl.textContent = data.author;

  const dateEl = document.getElementById('articleDate');
  if (dateEl) dateEl.textContent = data.date;

  const diffEl = document.getElementById('articleDifficulty');
  if (diffEl) diffEl.textContent = data.difficulty;

  // 渲染好讀版段落
  const textReader = document.getElementById('textReader');
  if (textReader && data.paragraphs) {
    textReader.innerHTML = data.paragraphs.map(p => `
      <div class="article-paragraph">
        <span class="p-tag">${p.tag}</span>
        ${p.title ? `<div class="p-subtitle">${p.title}</div>` : ''}
        ${p.content}
      </div>
    `).join('');
  }

  // 渲染開放題題目提示
  const openPromptEl = document.getElementById('openEndedPrompt');
  if (openPromptEl && data.openEndedPrompt) {
    openPromptEl.textContent = data.openEndedPrompt;
  }

  // 渲染 16 題選擇題
  if (data.questions) {
    renderQuestions(data.questions);
  }

  updateStats();
}
