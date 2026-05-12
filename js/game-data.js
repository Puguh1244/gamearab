// DATA SOAL - PETUALANGAN HURUF ARAB
// =============================================
const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const ARABIC_LETTER_RE = /[\u0621-\u064A\u0660-\u0669\u06F0-\u06F9\u0640]/g;

function stripArabicMarks(text) {
  return String(text || '').normalize('NFKC').replace(ARABIC_DIACRITICS_RE, '');
}

function sanitizeAnswer(raw) {
  return stripArabicMarks(raw)
    .replace(/[^\u0621-\u064A\u0660-\u0669\u06F0-\u06F9\u0640A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 20);
}

function answerToTokens(answer) {
  return Array.from(String(answer || '').replace(/\s+/g, ''));
}

function makeQuestion(data) {
  const rawAnswer = data.answer || '';
  const tokens = Array.isArray(data.tokens) && data.tokens.length
    ? data.tokens.map(token => String(token))
    : answerToTokens(sanitizeAnswer(rawAnswer));
  return {
    time: 60,
    difficulty: 'easy',
    icon: '🌙',
    category: 'Arab',
    ...data,
    answer: tokens.join(''),
    tokens,
    displayAnswer: data.displayAnswer || tokens.join('')
  };
}

function getAnswerTokens(q = GameState?.getCurrentQuestion?.()) {
  if (!q) return [];
  if (Array.isArray(q.tokens) && q.tokens.length) return q.tokens;
  return answerToTokens(q.answer || '');
}

function getQuestionAnswerText(q = GameState?.getCurrentQuestion?.()) {
  if (!q) return '';
  return q.displayAnswer || getAnswerTokens(q).join('');
}

const QUESTION_STORAGE_KEY = 'petualanganHurufArabCustomQuestionsV1';

function loadCustomQuestions() {
  try {
    const saved = JSON.parse(localStorage.getItem(QUESTION_STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(q => q.question && q.answer) : [];
  } catch (e) {
    return [];
  }
}

function saveCustomQuestions(customQuestions) {
  localStorage.setItem(QUESTION_STORAGE_KEY, JSON.stringify(customQuestions));
}

const HIJAIYAH_LETTERS = [
  { letter: 'ا', name: 'Alif' }, { letter: 'ب', name: 'Ba' }, { letter: 'ت', name: 'Ta' }, { letter: 'ث', name: 'Tsa' },
  { letter: 'ج', name: 'Jim / Ja' }, { letter: 'ح', name: 'Ha' }, { letter: 'خ', name: 'Kha' }, { letter: 'د', name: 'Dal' },
  { letter: 'ذ', name: 'Dzal' }, { letter: 'ر', name: 'Ra' }, { letter: 'ز', name: 'Zai' }, { letter: 'س', name: 'Sin' },
  { letter: 'ش', name: 'Syin' }, { letter: 'ص', name: 'Shad' }, { letter: 'ض', name: 'Dhad' }, { letter: 'ط', name: 'Tha' },
  { letter: 'ظ', name: 'Zha' }, { letter: 'ع', name: 'Ain' }, { letter: 'غ', name: 'Ghain' }, { letter: 'ف', name: 'Fa' },
  { letter: 'ق', name: 'Qaf' }, { letter: 'ك', name: 'Kaf' }, { letter: 'ل', name: 'Lam' }, { letter: 'م', name: 'Mim' },
  { letter: 'ن', name: 'Nun' }, { letter: 'ه', name: 'Ha' }, { letter: 'و', name: 'Wawu' }, { letter: 'ي', name: 'Ya' }
];

const ARABIC_SYMBOL_POOL = HIJAIYAH_LETTERS.map(item => item.letter);
const ARABIC_DIGIT_POOL = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];

const HIJAIYAH_QUESTIONS = HIJAIYAH_LETTERS.map((item, index) => makeQuestion({
  question: `Cari huruf ${item.letter} (${item.name})`,
  answer: item.letter,
  tokens: [item.letter],
  category: 'Pengenalan Hijaiyah',
  difficulty: index < 10 ? 'easy' : index < 20 ? 'medium' : 'hard',
  time: 45,
  icon: '🔤',
  type: 'hijaiyah',
  symbolPool: ARABIC_SYMBOL_POOL
}));

const JOINING_FORMS = [
  { base: 'ج', name: 'Jim / Ja', isolated: 'ج', initial: 'جـ', medial: 'ـجـ', final: 'ـج', sample: 'جَبَل، مَسْجِد، حَجّ' },
  { base: 'ح', name: 'Ha', isolated: 'ح', initial: 'حـ', medial: 'ـحـ', final: 'ـح', sample: 'حُوت، لَحْم، فَرَح' },
  { base: 'خ', name: 'Kha', isolated: 'خ', initial: 'خـ', medial: 'ـخـ', final: 'ـخ', sample: 'خُبْز، أَخْضَر، شَيْخ' },
  { base: 'ب', name: 'Ba', isolated: 'ب', initial: 'بـ', medial: 'ـبـ', final: 'ـب', sample: 'بَيْت، كِتَاب، طَبِيب' },
  { base: 'م', name: 'Mim', isolated: 'م', initial: 'مـ', medial: 'ـمـ', final: 'ـم', sample: 'مَاء، قَمَر، قَلَم' },
  { base: 'س', name: 'Sin', isolated: 'س', initial: 'سـ', medial: 'ـسـ', final: 'ـس', sample: 'سَمَك، مَسْجِد، شَمْس' },
  { base: 'ف', name: 'Fa', isolated: 'ف', initial: 'فـ', medial: 'ـفـ', final: 'ـف', sample: 'فِيل، دَفْتَر، حَرْف' },
  { base: 'ك', name: 'Kaf', isolated: 'ك', initial: 'كـ', medial: 'ـكـ', final: 'ـك', sample: 'كِتَاب، مَكْتَب، سَمَك' },
  { base: 'ل', name: 'Lam', isolated: 'ل', initial: 'لـ', medial: 'ـلـ', final: 'ـل', sample: 'لَبَن، قَلَم، جَمَل' },
  { base: 'ن', name: 'Nun', isolated: 'ن', initial: 'نـ', medial: 'ـنـ', final: 'ـن', sample: 'نَجْم، بِنْت، لَوْن' },
  { base: 'ي', name: 'Ya', isolated: 'ي', initial: 'يـ', medial: 'ـيـ', final: 'ـي', sample: 'يَد، بَيْت، كُرْسِي' }
];

const POSITION_LABELS = {
  isolated: 'sendiri',
  initial: 'di depan kata',
  medial: 'di tengah kata',
  final: 'di akhir kata'
};

const JOINING_SYMBOL_POOL = JOINING_FORMS.flatMap(item => [item.isolated, item.initial, item.medial, item.final]);

const JOINING_QUESTIONS = JOINING_FORMS.flatMap((item, formIndex) => {
  const baseDifficulty = formIndex < 4 ? 'easy' : formIndex < 8 ? 'medium' : 'hard';
  return ['isolated', 'initial', 'medial', 'final'].map(position => makeQuestion({
    question: `Pilih bentuk ${item.base} (${item.name}) ${POSITION_LABELS[position]}. Contoh: ${item.sample}`,
    answer: item[position],
    tokens: [item[position]],
    displayAnswer: item[position],
    category: 'Sambung Huruf',
    difficulty: position === 'isolated' ? 'easy' : baseDifficulty,
    time: 55,
    icon: '🧩',
    type: 'joining',
    position,
    baseLetter: item.base,
    symbolPool: JOINING_SYMBOL_POOL
  }));
});

const JOINING_CLOZE_QUESTIONS = [
  makeQuestion({ question: 'Lubang di tengah: مَسْـِد. Bentuk ج yang benar adalah...', answer: 'ـجـ', tokens: ['ـجـ'], displayAnswer: 'ـجـ', category: 'Sambung Huruf', difficulty: 'medium', time: 65, icon: '🕌', type: 'joining', symbolPool: JOINING_SYMBOL_POOL }),
  makeQuestion({ question: 'Lubang di depan: ــمَل. Untuk kata جَمَل, bentuk ج yang benar adalah...', answer: 'جـ', tokens: ['جـ'], displayAnswer: 'جـ', category: 'Sambung Huruf', difficulty: 'medium', time: 65, icon: '🐪', type: 'joining', symbolPool: JOINING_SYMBOL_POOL }),
  makeQuestion({ question: 'Lubang di akhir: حَـ. Untuk kata حَجّ, bentuk ج yang benar adalah...', answer: 'ـج', tokens: ['ـج'], displayAnswer: 'ـج', category: 'Sambung Huruf', difficulty: 'medium', time: 65, icon: '🕋', type: 'joining', symbolPool: JOINING_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi kata: مَـْتَب. Huruf ك di tengah memakai bentuk...', answer: 'ـكـ', tokens: ['ـكـ'], displayAnswer: 'ـكـ', category: 'Sambung Huruf', difficulty: 'hard', time: 70, icon: '🪑', type: 'joining', symbolPool: JOINING_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi kata: قَـَم. Huruf ل di tengah memakai bentuk...', answer: 'ـلـ', tokens: ['ـلـ'], displayAnswer: 'ـلـ', category: 'Sambung Huruf', difficulty: 'hard', time: 70, icon: '✏️', type: 'joining', symbolPool: JOINING_SYMBOL_POOL })
];

const VOCAB_SUBCHAPTERS = {
  nouns: { label: 'Kata Benda', icon: '📘' },
  places: { label: 'Tempat', icon: '🕌' },
  adjectives: { label: 'Kata Sifat', icon: '✨' },
  colors: { label: 'Warna', icon: '🎨' },
  animals: { label: 'Hewan', icon: '🐾' },
  body: { label: 'Anggota Tubuh', icon: '🧍' },
  general: { label: 'Umum', icon: '🌙' }
};

function vocabQuestion(subchapter, question, answer, icon = '📚', difficulty = 'easy') {
  const clean = sanitizeAnswer(answer);
  return makeQuestion({
    question,
    answer: clean,
    tokens: answerToTokens(clean),
    displayAnswer: answer,
    category: VOCAB_SUBCHAPTERS[subchapter]?.label || 'Kosakata Arab',
    subchapter,
    difficulty,
    time: difficulty === 'easy' ? 60 : difficulty === 'medium' ? 70 : 80,
    icon,
    type: 'vocabulary',
    symbolPool: ARABIC_SYMBOL_POOL
  });
}

const VOCAB_QUESTIONS = [
  vocabQuestion('nouns', 'Apa bahasa Arab dari buku?', 'كتاب', '📘'),
  vocabQuestion('nouns', 'Apa bahasa Arab dari pena?', 'قلم', '✏️'),
  vocabQuestion('nouns', 'Apa bahasa Arab dari pintu?', 'باب', '🚪'),
  vocabQuestion('nouns', 'Apa bahasa Arab dari rumah?', 'بيت', '🏠'),
  vocabQuestion('nouns', 'Apa bahasa Arab dari kursi?', 'كرسي', '🪑', 'medium'),

  vocabQuestion('places', 'Apa bahasa Arab dari masjid?', 'مسجد', '🕌'),
  vocabQuestion('places', 'Apa bahasa Arab dari sekolah?', 'مدرسة', '🏫', 'medium'),
  vocabQuestion('places', 'Apa bahasa Arab dari pasar?', 'سوق', '🏪'),
  vocabQuestion('places', 'Apa bahasa Arab dari kelas?', 'فصل', '🏫'),
  vocabQuestion('places', 'Apa bahasa Arab dari rumah?', 'بيت', '🏠'),

  vocabQuestion('adjectives', 'Apa bahasa Arab dari besar?', 'كبير', '🐘'),
  vocabQuestion('adjectives', 'Apa bahasa Arab dari kecil?', 'صغير', '🐣'),
  vocabQuestion('adjectives', 'Apa bahasa Arab dari indah?', 'جميل', '🌸'),
  vocabQuestion('adjectives', 'Apa bahasa Arab dari panjang?', 'طويل', '📏', 'medium'),
  vocabQuestion('adjectives', 'Apa bahasa Arab dari baik?', 'طيب', '😊'),

  vocabQuestion('colors', 'Apa bahasa Arab dari merah?', 'أحمر', '🔴'),
  vocabQuestion('colors', 'Apa bahasa Arab dari biru?', 'أزرق', '🔵'),
  vocabQuestion('colors', 'Apa bahasa Arab dari hijau?', 'أخضر', '🟢'),
  vocabQuestion('colors', 'Apa bahasa Arab dari kuning?', 'أصفر', '🟡'),
  vocabQuestion('colors', 'Apa bahasa Arab dari putih?', 'أبيض', '⚪'),
  vocabQuestion('colors', 'Apa bahasa Arab dari hitam?', 'أسود', '⚫'),

  vocabQuestion('animals', 'Apa bahasa Arab dari singa?', 'أسد', '🦁'),
  vocabQuestion('animals', 'Apa bahasa Arab dari kucing?', 'قط', '🐱'),
  vocabQuestion('animals', 'Apa bahasa Arab dari gajah?', 'فيل', '🐘'),
  vocabQuestion('animals', 'Apa bahasa Arab dari ikan?', 'سمك', '🐟'),
  vocabQuestion('animals', 'Apa bahasa Arab dari unta?', 'جمل', '🐪'),

  vocabQuestion('body', 'Apa bahasa Arab dari tangan?', 'يد', '✋'),
  vocabQuestion('body', 'Apa bahasa Arab dari mata?', 'عين', '👁️'),
  vocabQuestion('body', 'Apa bahasa Arab dari kepala?', 'رأس', '🙂'),
  vocabQuestion('body', 'Apa bahasa Arab dari telinga?', 'أذن', '👂', 'medium'),
  vocabQuestion('body', 'Apa bahasa Arab dari kaki?', 'قدم', '🦶')
];

const AYAT_QUESTIONS = [
  makeQuestion({ question: 'Lengkapi penggalan: بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيـ', answer: 'م', tokens: ['م'], displayAnswer: 'م', category: 'Penggalan Ayat', difficulty: 'easy', time: 60, icon: '📜', type: 'ayat', symbolPool: ARABIC_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi penggalan: الْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيـ', answer: 'ن', tokens: ['ن'], displayAnswer: 'ن', category: 'Penggalan Ayat', difficulty: 'medium', time: 70, icon: '📜', type: 'ayat', symbolPool: ARABIC_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi penggalan: إِيَّاكَ نَعْبُـُ', answer: 'د', tokens: ['د'], displayAnswer: 'د', category: 'Penggalan Ayat', difficulty: 'medium', time: 70, icon: '📜', type: 'ayat', symbolPool: ARABIC_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi penggalan: قُلْ أَعُوذُ بِرَبِّ الْفَلَـ', answer: 'ق', tokens: ['ق'], displayAnswer: 'ق', category: 'Penggalan Ayat', difficulty: 'hard', time: 80, icon: '📜', type: 'ayat', symbolPool: ARABIC_SYMBOL_POOL }),
  makeQuestion({ question: 'Lengkapi penggalan: مِنَ الْجِنَّةِ وَالنَّاـِ', answer: 'س', tokens: ['س'], displayAnswer: 'س', category: 'Penggalan Ayat', difficulty: 'hard', time: 80, icon: '📜', type: 'ayat', symbolPool: ARABIC_SYMBOL_POOL })
];

function reviveCustomQuestion(q) {
  const type = q.type || q.track || 'vocabulary';
  const subchapter = q.subchapter || 'general';
  const clean = sanitizeAnswer(q.answer);
  return makeQuestion({
    ...q,
    type,
    subchapter,
    answer: clean,
    tokens: Array.isArray(q.tokens) && q.tokens.length ? q.tokens : answerToTokens(clean),
    displayAnswer: q.displayAnswer || q.answer || clean,
    symbolPool: type === 'joining' ? JOINING_SYMBOL_POOL : ARABIC_SYMBOL_POOL,
    icon: q.icon || (type === 'joining' ? '🧩' : type === 'ayat' ? '📜' : type === 'hijaiyah' ? '🔤' : '📚')
  });
}

let CUSTOM_QUESTIONS = loadCustomQuestions().map(reviveCustomQuestion);
let selectedVocabSubchapter = 'nouns';

const LEARNING_TRACKS = {
  hijaiyah: { label: 'Pengenalan Hijaiyah', noun: 'huruf' },
  joining: { label: 'Sambung Huruf Arab', noun: 'bentuk huruf' },
  vocabulary: { label: 'Kosakata Arab', noun: 'kata' },
  ayat: { label: 'Penggalan Ayat', noun: 'huruf ayat' },
  mixed: { label: 'Campuran Lomba', noun: 'materi' }
};

function getCustomQuestionsFor(type, subchapter = selectedVocabSubchapter) {
  return CUSTOM_QUESTIONS.filter(q => {
    if (type === 'vocabulary') return q.type === 'vocabulary' && (q.subchapter === subchapter || q.subchapter === 'general');
    return q.type === type;
  });
}

function getVocabularyQuestions(subchapter = selectedVocabSubchapter) {
  const core = VOCAB_QUESTIONS.filter(q => q.subchapter === subchapter);
  return [...core, ...getCustomQuestionsFor('vocabulary', subchapter)];
}

function buildQuestionSet(track = 'hijaiyah') {
  if (track === 'joining') return [...JOINING_QUESTIONS.slice(0, 18), ...JOINING_CLOZE_QUESTIONS, ...getCustomQuestionsFor('joining')];
  if (track === 'vocabulary') return getVocabularyQuestions(selectedVocabSubchapter);
  if (track === 'ayat') return [...AYAT_QUESTIONS, ...getCustomQuestionsFor('ayat')];
  if (track === 'mixed') {
    return [
      ...HIJAIYAH_QUESTIONS.slice(0, 8),
      ...JOINING_CLOZE_QUESTIONS.slice(0, 4),
      ...getVocabularyQuestions(selectedVocabSubchapter).slice(0, 6),
      ...AYAT_QUESTIONS.slice(0, 3)
    ];
  }
  return [...HIJAIYAH_QUESTIONS.slice(0, 18), ...getCustomQuestionsFor('hijaiyah')];
}

let QUESTIONS = buildQuestionSet('hijaiyah');

const PLAY_MODES = {
  // forceNeedEvery mengatur seberapa sering target dipaksa muncul.
  learn: { label: 'Belajar', timer: false, lives: false, speed: 0.72, spawn: 1.25, forceNeedEvery: 3, wrongPenalty: false },
  practice: { label: 'Latihan', timer: true, lives: false, speed: 0.86, spawn: 1.12, forceNeedEvery: 3, wrongPenalty: false },
  challenge: { label: 'Kompetisi', timer: true, lives: true, speed: 1, spawn: 1, forceNeedEvery: 4, wrongPenalty: true }
};

const GameMode = Object.freeze({
  LOADING: 'LOADING',
  READY: 'READY',
  PLAYING: 'PLAYING',
  HOLDING_LETTER: 'HOLDING_LETTER',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER'
});

const ALPHABET = ARABIC_SYMBOL_POOL.join('');

const KID_PALETTE = [
  { fill: 0xff9ecf, stroke: 0xe85d9e, text: '#65304f' },
  { fill: 0x64c7ff, stroke: 0x1687d9, text: '#143c5f' },
  { fill: 0xffd95c, stroke: 0xe09a18, text: '#5b3a00' },
  { fill: 0x9df7b8, stroke: 0x34b866, text: '#1c5c34' },
  { fill: 0xc7b6ff, stroke: 0x8d6ad9, text: '#3f2f68' },
  { fill: 0xffbd7a, stroke: 0xdb7d20, text: '#5e3410' }
];

// =============================================
