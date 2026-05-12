// GAME STATE
// =============================================
const GameState = {
  currentLevel: 0,
  score: 0,
  lives: 3,
  currentIndex: 0,
  filledSlots: [],
  selectedSlotIndex: -1,
  activeHand: null,
  heldLetter: null,
  state: GameMode.READY,
  mode: 'learn',
  learningTrack: 'hijaiyah',
  vocabSubchapter: 'nouns',
  studentName: 'Siswa',
  studentClass: 'Kelas Umum',
  sessionId: null,
  voiceEnabled: true,
  voiceMode: 'sfx',
  pinVerified: false,
  selectedVoice: null,
  lastSpeechText: '',
  lastSpeechAt: 0,
  lastSfxAt: 0,
  lastHintAt: 0,
  feedbackTimer: null,
  timerValue: 60,
  timerInterval: null,
  levelStartTime: 0,
  currentLevelHints: 0,
  currentLevelMistakes: 0,
  wrongStreak: 0,
  totalHints: 0,
  roundToken: 0,
  completedWords: [],
  levelHistory: [],
  started: false,
  handStats: {
    leftGrabs: 0,
    rightGrabs: 0,
    leftCorrect: 0,
    rightCorrect: 0,
    leftWrong: 0,
    rightWrong: 0
  },
  analytics: {
    letterAttempts: {},
    letterCorrect: {},
    letterWrong: {},
    confusedPairs: {},
    missedLetters: {},
    hintsByLetter: {},
    dropOutside: 0
  },

  getCurrentQuestion() { return QUESTIONS[this.currentLevel]; },
  getCurrentAnswer() { return getQuestionAnswerText(this.getCurrentQuestion()); },
  getCurrentAnswerTokens() { return getAnswerTokens(this.getCurrentQuestion()); },
  getModeConfig() { return PLAY_MODES[this.mode] || PLAY_MODES.learn; }
};

// =============================================
