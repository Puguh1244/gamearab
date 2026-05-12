// PHASER GAME
// =============================================
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.fallingLetters = [];
    this.cursor = null;
    this.heldLetterObj = null;
    this.spawnTimer = 0;
    this.spawnInterval = 1800;
    this.letterPool = [];
    this.canSpawn = true;
    this.hoverSlotIndex = -1;
    this.hoverSlotSince = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.drawKidsBackground(W, H);

    // Cursor tangan kiri - bintang biru
    this.cursor = this.add.container(W / 2, H / 2);
    const cursorOuter = this.add.circle(0, 0, 32, 0xffffff, 0.65);
    cursorOuter.setStrokeStyle(5, 0x64c7ff, 0.9);
    const cursorInner = this.add.text(0, 0, '✋', {
      fontFamily: 'Arial',
      fontSize: '26px'
    }).setOrigin(0.5);
    this.cursor.add([cursorOuter, cursorInner]);
    this.cursor.setDepth(30);
    this.cursorInner = cursorInner;
    this.cursorOuter = cursorOuter;

    // Cursor tangan kanan - bintang ungu
    this.rightCursor = this.add.container(W / 2, H / 2);
    const rc1 = this.add.circle(0, 0, 28, 0xffffff, 0.65);
    rc1.setStrokeStyle(5, 0xb794f4, 0.9);
    const rc2 = this.add.text(0, 0, '⭐', {
      fontFamily: 'Arial',
      fontSize: '24px'
    }).setOrigin(0.5);
    this.rightCursor.add([rc1, rc2]);
    this.rightCursor.setDepth(30);
    this.rightCursor.setVisible(false);
    this.rightCursorOuter = rc1;
    this.rightCursorInner = rc2;

    // Drop zone anak: area slot jawaban
    const dzH = 118;
    this.dropZone = this.add.graphics();
    this.dropZone.fillStyle(0xffffff, 0.22);
    this.dropZone.fillRoundedRect(20, H - dzH - 10, W - 40, dzH, 30);
    this.dropZone.lineStyle(4, 0xffffff, 0.5);
    this.dropZone.strokeRoundedRect(20, H - dzH - 10, W - 40, dzH, 30);
    this.dropZoneBounds = new Phaser.Geom.Rectangle(0, H - dzH - 16, W, dzH + 16);

    this.buildLetterPool();
    GameState.state = GameMode.READY;
  }

  drawKidsBackground(W, H) {
    const bg = this.add.graphics();

    // Latar dibuat sederhana agar area permainan tidak ramai.
    bg.fillGradientStyle(0xbfeeff, 0xbfeeff, 0xf2fbff, 0xf2fbff, 1);
    bg.fillRect(0, 0, W, H);

    // Awan lembut
    this.drawCloud(W * 0.12, H * 0.20, 0.95);
    this.drawCloud(W * 0.82, H * 0.26, 0.9);

    // Matahari kecil
    bg.fillStyle(0xffd95c, 0.95);
    bg.fillCircle(W - 110, 110, 34);
    this.add.text(W - 110, 110, '•', { fontSize: '28px', color: '#b77716' }).setOrigin(0.5).setDepth(1);

    // Bukit sederhana
    bg.fillStyle(0xc9f7b6, 1);
    bg.fillEllipse(W * 0.24, H + 26, W * 0.88, 210);
    bg.fillStyle(0xb2ef9c, 1);
    bg.fillEllipse(W * 0.78, H + 36, W * 0.86, 230);
    bg.fillStyle(0x8ddd78, 1);
    bg.fillRect(0, H - 88, W, 88);

    // Dekorasi bunga sedikit saja
    for (let i = 0; i < 10; i++) {
      const x = Phaser.Math.Between(40, W - 40);
      const y = Phaser.Math.Between(H - 72, H - 22);
      this.drawFlower(x, y, Phaser.Math.FloatBetween(0.55, 0.85));
    }
  }

  drawCloud(x, y, scale = 1) {
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.82);
    g.fillCircle(x, y, 30 * scale);
    g.fillCircle(x + 32 * scale, y - 12 * scale, 36 * scale);
    g.fillCircle(x + 70 * scale, y, 30 * scale);
    g.fillRoundedRect(x - 18 * scale, y, 104 * scale, 30 * scale, 16 * scale);
    g.setDepth(0);
  }

  drawFlower(x, y, scale = 1) {
    const colors = [0xff8fc7, 0xffd95c, 0x64c7ff, 0xb794f4];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const g = this.add.graphics();
    g.lineStyle(3 * scale, 0x47b85b, 0.7);
    g.lineBetween(x, y, x, y + 20 * scale);
    g.fillStyle(color, 0.9);
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      g.fillCircle(x + Math.cos(a) * 7 * scale, y + Math.sin(a) * 7 * scale, 6 * scale);
    }
    g.fillStyle(0xfff2a8, 1);
    g.fillCircle(x, y, 5 * scale);
    g.setDepth(1);
  }

  drawBlock(x, y, char, fill) {
    const g = this.add.graphics();
    g.fillStyle(fill, 0.9);
    g.fillRoundedRect(x, y, 42, 42, 10);
    g.lineStyle(4, 0xffffff, 0.9);
    g.strokeRoundedRect(x, y, 42, 42, 10);
    this.add.text(x + 21, y + 21, char, {
      fontFamily: 'Comic Sans MS, Arial',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#28445f'
    }).setOrigin(0.5);
  }

  buildLetterPool() {
    const tokens = GameState.getCurrentAnswerTokens();
    if (!tokens.length) return;
    const letterChars = [...tokens];

    const difficulty = GameState.getCurrentQuestion().difficulty;
    const modeCfg = GameState.getModeConfig();
    const weakLetters = getWeakLetters(3);
    const extraBase = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 7 : 10;
    const adaptiveReduction = Math.min(4, GameState.wrongStreak);
    const extra = Math.max(2, extraBase - adaptiveReduction + (GameState.mode === 'challenge' ? 2 : 0));
    const symbolPool = getSymbolPoolForCurrentQuestion();
    const available = symbolPool.filter(ch => !tokens.includes(ch) || Math.random() > 0.45);

    weakLetters.forEach(ch => {
      if (tokens.includes(ch)) letterChars.push(ch);
    });

    for (let i = 0; i < tokens.length + extra; i++) {
      letterChars.push(available[Math.floor(Math.random() * available.length)] || symbolPool[Math.floor(Math.random() * symbolPool.length)]);
    }

    this.letterPool = letterChars.sort(() => Math.random() - 0.5);
    this.poolIndex = 0;

    const baseInterval = difficulty === 'easy' ? 2200 : difficulty === 'medium' ? 1650 : 1250;
    this.spawnInterval = Math.round(baseInterval * modeCfg.spawn + Math.min(GameState.wrongStreak, 3) * 180);
  }
  startLevel() {
    this.clearLetters();
    if (!GameState.getCurrentQuestion()) return;
    this.buildLetterPool();
    GameState.currentIndex = 0;
    GameState.filledSlots = new Array(GameState.getCurrentAnswerTokens().length).fill(false);
    GameState.selectedSlotIndex = -1;
    GameState.activeHand = null;
    GameState.heldLetter = null;
    GameState.currentLevelMistakes = 0;
    GameState.currentLevelHints = 0;
    GameState.wrongStreak = 0;
    GameState.levelStartTime = Date.now();
    GameState.roundToken++;
    this.heldLetterObj = null;
    this.canSpawn = true;
    this.spawnTimer = this.spawnInterval - 450;
    this.hoverSlotIndex = -1;
    this.hoverSlotSince = 0;

    const q = GameState.getCurrentQuestion();
    const qText = document.getElementById('question-text');
    qText.textContent = `${q.icon || '🌙'} ${q.question}`;
    qText.dir = 'auto';
    buildAnswerSlots();
    updateHUD();
    startTimer();

    GameState.state = GameMode.PLAYING;
    const kind = getQuestionKind(q);
    if (q.type === 'vocabulary') {
      speak(`${GameState.studentName}, susun kosakata Arab ${GameState.getCurrentAnswer()}. Cari ${kind} ${getCurrentTargetLetter()}.`, true, 'hint');
    } else {
      speak(`${GameState.studentName}, ${q.question}. Taruh ${kind} ${getCurrentTargetLetter()} di kotak.`, true, 'hint');
    }
  }
  clearLetters() {
    this.fallingLetters.forEach(l => { if (l.container) l.container.destroy(); });
    this.fallingLetters = [];
    if (this.heldLetterObj) {
      this.heldLetterObj.container.destroy();
      this.heldLetterObj = null;
    }
  }

  spawnLetter() {
    if (!this.canSpawn) return;
    if (this.poolIndex >= this.letterPool.length) this.buildLetterPool();

    // Target tetap sering muncul, tapi tidak boleh semua bola menjadi target.
    // Untuk mode pengenalan 1 huruf/angka, anak perlu melihat distraktor supaya belajar membedakan.
    const neededLetters = getNeededLetters();
    const modeCfg = GameState.getModeConfig();
    const currentQuestion = GameState.getCurrentQuestion();
    const isRecognitionMode = currentQuestion && (currentQuestion.type === 'hijaiyah' || currentQuestion.type === 'ayat');
    const minGap = isRecognitionMode ? 2 : 1;
    const forceEvery = Math.max(minGap + 1, modeCfg.forceNeedEvery - Math.min(GameState.wrongStreak, 1));
    const shouldForceNeededLetter = neededLetters.length > 0 && (this.poolIndex % forceEvery === 0);
    let char;

    if (shouldForceNeededLetter) {
      char = Phaser.Utils.Array.GetRandom(neededLetters);
      this.poolIndex++;
    } else {
      char = this.letterPool[this.poolIndex++];

      // Kalau mode pengenalan dan pool kebetulan memilih target terlalu sering,
      // ganti dengan distraktor agar tidak muncul A A A A terus.
      if (isRecognitionMode && neededLetters.includes(char)) {
        const pool = getSymbolPoolForCurrentQuestion().filter(ch => !neededLetters.includes(ch));
        char = Phaser.Utils.Array.GetRandom(pool);
      }
    }

    const W = this.scale.width;
    // Biar huruf tidak jatuh terlalu ke pinggir layar.
    // Area spawn dibuat lebih aman dan fokus ke tengah.
    const sideSafeMargin = Math.min(Math.max(W * 0.22, 90), W * 0.34);
    const x = Phaser.Math.Between(Math.round(sideSafeMargin), Math.round(W - sideSafeMargin));
    const y = -48;

    const difficulty = GameState.getCurrentQuestion().difficulty;
    const wrongSlowdown = Math.max(0.62, 1 - GameState.wrongStreak * 0.08);
    const baseSpeed = difficulty === 'easy' ? Phaser.Math.Between(58, 92) :
                  difficulty === 'medium' ? Phaser.Math.Between(95, 145) :
                  Phaser.Math.Between(145, 205);
    const speed = Math.round(baseSpeed * modeCfg.speed * wrongSlowdown);

    const palette = Phaser.Utils.Array.GetRandom(KID_PALETTE);

    const container = this.add.container(x, y);

    // Main toy bubble. Token sambung seperti ـجـ dibuat sedikit lebih lebar.
    const tokenLength = Array.from(String(char)).length;
    const bubbleRadius = tokenLength > 1 ? 40 : 33;
    const textFontSize = tokenLength > 1 ? '25px' : '31px';
    const shadow = this.add.circle(3, 7, bubbleRadius, 0x000000, 0.08);
    const bubble = this.add.circle(0, 0, bubbleRadius, palette.fill, 1);
    const shine = this.add.circle(-10, -11, 8, 0xffffff, 0.42);
    const bubbleBorder = this.add.circle(0, 0, bubbleRadius);
    bubbleBorder.setStrokeStyle(5, 0xffffff, 0.95);
    const innerBorder = this.add.circle(0, 0, Math.max(24, bubbleRadius - 5));
    innerBorder.setStrokeStyle(3, palette.stroke, 0.75);

    const text = this.add.text(0, 1, char, {
      fontFamily: 'Noto Naskh Arabic, Amiri, Scheherazade New, Arial',
      fontSize: textFontSize,
      fontStyle: 'bold',
      color: palette.text,
      align: 'center',
      rtl: true
    }).setOrigin(0.5);

    container.add([shadow, bubble, shine, bubbleBorder, innerBorder, text]);
    container.setDepth(10);
    container.setScale(0.96);

    this.tweens.add({
      targets: container,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    const letterObj = {
      container,
      bubble,
      bubbleBorder,
      innerBorder,
      text,
      char,
      speed,
      grabbed: false,
      x,
      y,
      palette
    };

    this.fallingLetters.push(letterObj);
    return letterObj;
  }

  update(time, delta) {
    if (GameState.state !== GameMode.PLAYING && GameState.state !== GameMode.HOLDING_LETTER) return;

    const W = this.scale.width;
    const H = this.scale.height;
    const dt = delta / 1000;

    this.updateCursors(W, H);

    this.spawnTimer += delta;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnLetter();
    }

    for (let i = this.fallingLetters.length - 1; i >= 0; i--) {
      const letter = this.fallingLetters[i];
      if (letter.grabbed) continue;

      letter.y += letter.speed * dt;
      letter.container.setPosition(letter.x, letter.y);

      if (letter.y > H + 60) {
        letter.container.destroy();
        this.fallingLetters.splice(i, 1);
        continue;
      }

      const hoverHand = this.getHoveringHand(letter, W, H);

      if (hoverHand && GameState.heldLetter === null) {
        letter.container.setScale(1.22);
        letter.bubbleBorder.setStrokeStyle(6, 0xffd95c, 1);
        if (hoverHand === 'left') this.cursorOuter && this.cursorOuter.setStrokeStyle(6, 0xffd95c, 1);
        if (hoverHand === 'right') this.rightCursorOuter && this.rightCursorOuter.setStrokeStyle(6, 0xffd95c, 1);

        const cooldownReady = !this.grabCooldownUntil || time >= this.grabCooldownUntil;
        if (cooldownReady && this.isHandPinching(hoverHand) && GameState.heldLetter === null) {
          this.grabLetter(letter, i, hoverHand);
        }
      } else {
        letter.bubbleBorder.setStrokeStyle(5, 0xffffff, 0.95);
      }
    }

    if (this.heldLetterObj) {
      const pos = GameState.activeHand === 'right' ? HandData.rightSmooth : HandData.leftSmooth;
      const handX = pos.x * W;
      const handY = pos.y * H;
      const tx = handX;
      const ty = handY - 36; // huruf tetap sedikit di atas tangan agar terlihat, tapi hit-test memakai tangan juga
      this.heldLetterObj.container.setPosition(tx, ty);
      this.heldLetterObj.x = tx;
      this.heldLetterObj.y = ty;

      const targetSlotIndex = getSlotIndexAtPosition(tx, ty, handX, handY);
      if (targetSlotIndex >= 0) {
        // Sentuh/dekatkan ke slot untuk memilih/highlight. Deteksi dibuat toleran agar anak tidak perlu presisi.
        setSlotTarget(targetSlotIndex);

        if (this.hoverSlotIndex !== targetSlotIndex) {
          this.hoverSlotIndex = targetSlotIndex;
          this.hoverSlotSince = time;
        }

        // Setelah huruf terambil, jangan bergantung pada status cubitan lagi.
        // Kamera/tracking yang jelek sering membaca tangan "terbuka" sesaat,
        // jadi huruf langsung dianggap masuk saat menyentuh kotak target.
        this.checkDropLetter(targetSlotIndex);
        this.hoverSlotIndex = -1;
        this.hoverSlotSince = 0;
      } else {
        clearSlotTargets();
        this.hoverSlotIndex = -1;
        this.hoverSlotSince = 0;

        // Jangan lepaskan huruf otomatis saat tangan terbaca terbuka.
        // Huruf yang sudah terambil tetap aman mengikuti tangan sampai benar-benar masuk kotak.
      }
    }

    if (!this.isNearAnyLetter(W, H)) {
      this.cursorOuter && this.cursorOuter.setStrokeStyle(5, 0x64c7ff, 0.9);
      this.rightCursorOuter && this.rightCursorOuter.setStrokeStyle(5, 0xb794f4, 0.9);
    }
  }

  isHandPinching(handName) {
    return handName === 'right' ? HandData.rightPinching : HandData.leftPinching;
  }

  getHoveringHand(letter, W, H) {
    const checks = [];

    if (HandData.leftHand) {
      checks.push({
        name: 'left',
        distance: Phaser.Math.Distance.Between(
          HandData.leftSmooth.x * W,
          HandData.leftSmooth.y * H,
          letter.x,
          letter.y
        )
      });
    }

    if (HandData.rightHand) {
      checks.push({
        name: 'right',
        distance: Phaser.Math.Distance.Between(
          HandData.rightSmooth.x * W,
          HandData.rightSmooth.y * H,
          letter.x,
          letter.y
        )
      });
    }

    checks.sort((a, b) => a.distance - b.distance);
    return checks.length > 0 && checks[0].distance < 48 ? checks[0].name : null;
  }

  isNearAnyLetter(W, H) {
    for (const letter of this.fallingLetters) {
      if (letter.grabbed) continue;
      if (this.getHoveringHand(letter, W, H)) return true;
    }
    return false;
  }

  grabLetter(letter, index, handName) {
    letter.grabbed = true;
    letter.container.setDepth(35);

    this.tweens.add({
      targets: letter.container,
      scaleX: 1.34,
      scaleY: 1.34,
      duration: 160,
      ease: 'Back.out'
    });

    letter.bubbleBorder.setStrokeStyle(7, 0xffd95c, 1);
    letter.innerBorder.setStrokeStyle(4, 0xffb02e, 1);

    this.fallingLetters.splice(index, 1);
    this.heldLetterObj = letter;
    GameState.heldLetter = letter.char;
    GameState.activeHand = handName;
    recordHandGrab(handName);
    GameState.state = GameMode.HOLDING_LETTER;
    this.hoverSlotIndex = -1;
    this.hoverSlotSince = 0;

    const handLabel = handName === 'right' ? 'kanan' : 'kiri';
    showFeedback(`Tangan ${handLabel}: ${letter.char}!`, '#e28b00', 560);
    playSfx('tap');
  }

  releaseHeldLetterOutside() {
    // Sengaja dibuat no-op. Pada kamera yang kurang stabil, status cubitan sering false
    // walau tangan belum benar-benar melepas. Huruf yang sudah diambil harus tetap aman
    // dan tidak pecah/drop sampai masuk ke kotak jawaban.
    return;
  }

  checkDropLetter(targetSlotIndex) {
    if (!this.heldLetterObj) return;
    if (targetSlotIndex < 0) {
      GameState.analytics.dropOutside++;
      return;
    }

    if (GameState.filledSlots[targetSlotIndex]) {
      showFeedback('Pilih kolom kosong ya!', '#1687d9', 520);
      if (!this.lastFilledSlotWarningAt || Date.now() - this.lastFilledSlotWarningAt > 900) {
        this.lastFilledSlotWarningAt = Date.now();
        speak('Pilih kotak yang masih kosong.', true, 'hint');
      }
      return;
    }

    const expectedChar = GameState.getCurrentAnswerTokens()[targetSlotIndex];
    const actualChar = this.heldLetterObj.char;
    const handName = GameState.activeHand || 'left';
    const isCorrect = actualChar === expectedChar;
    recordLetterAttempt(expectedChar, actualChar, isCorrect);

    if (isCorrect) {
      recordHandResult(handName, true);
      GameState.wrongStreak = 0;
      this.popStars(this.heldLetterObj.x, this.heldLetterObj.y, 0x34c759);
      this.heldLetterObj.container.destroy();
      this.heldLetterObj = null;
      GameState.heldLetter = null;
      GameState.activeHand = null;
      this.grabCooldownUntil = this.time.now + 650;

      fillSlot(targetSlotIndex, expectedChar);
      GameState.filledSlots[targetSlotIndex] = true;
      clearSlotTargets();
      GameState.score += GameState.mode === 'learn' ? 8 : 10;
      updateHUD();

      showFeedback('Bagus! ⭐', '#23a65a', 560);
      speak('Bagus.', false, 'correct');
      this.cameras.main.flash(180, 255, 255, 190, true);
      GameState.state = GameMode.PLAYING;

      if (isWordComplete()) {
        this.canSpawn = false;
        triggerLevelComplete();
      } else {
        const token = GameState.roundToken;
        setTimeout(() => {
          if (token === GameState.roundToken && GameState.state === GameMode.PLAYING) {
            speak(`Sekarang cari ${getQuestionKind()} ${getCurrentTargetLetter()}.`, false, 'hint');
          }
        }, 650);
      }
    } else {
      recordHandResult(handName, false);
      GameState.currentLevelMistakes++;
      GameState.wrongStreak++;
      this.popStars(this.heldLetterObj.x, this.heldLetterObj.y, 0xff8fc7);
      this.heldLetterObj.container.destroy();
      this.heldLetterObj = null;
      GameState.heldLetter = null;
      GameState.activeHand = null;
      this.grabCooldownUntil = this.time.now + 800;
      clearSlotTargets();

      const modeCfg = GameState.getModeConfig();
      if (modeCfg.wrongPenalty) {
        GameState.lives--;
        if (GameState.lives < 0) GameState.lives = 0;
      }
      updateHUD();

      flashWrongSlot(targetSlotIndex);
      const kind = getQuestionKind();
      showFeedback(`Hampir! Cari ${expectedChar}`, '#ff5f8f', 820);
      speak(`Hampir benar. Cari ${kind} ${expectedChar}.`, true, 'wrong');
      this.cameras.main.shake(220, 0.006);
      const isOutOfLives = modeCfg.lives && GameState.lives <= 0;
      if (isOutOfLives) {
        this.canSpawn = false;
        triggerGameOver();
        return;
      }

      GameState.state = GameMode.PLAYING;

      if (GameState.wrongStreak >= 2 || GameState.mode !== 'challenge') {
        const token = GameState.roundToken;
        setTimeout(() => {
          if (token === GameState.roundToken && GameState.state === GameMode.PLAYING) applyAdaptiveHint('auto');
        }, 650);
        this.buildLetterPool();
      }
    }
  }
  popStars(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const star = this.add.text(x, y, '⭐', { fontSize: `${Phaser.Math.Between(16, 26)}px` }).setOrigin(0.5).setDepth(40);
      const angle = Math.PI * 2 * (i / 8);
      this.tweens.add({
        targets: star,
        x: x + Math.cos(angle) * Phaser.Math.Between(45, 78),
        y: y + Math.sin(angle) * Phaser.Math.Between(35, 68),
        alpha: 0,
        scale: 0.2,
        duration: 540,
        ease: 'Cubic.out',
        onComplete: () => star.destroy()
      });
    }
  }

  updateCursors(W, H) {
    if (HandData.leftHand) {
      const wrist = HandData.leftHand[0];
      HandData.leftSmooth = HandData.smooth(HandData.leftSmooth, { x: 1 - wrist.x, y: wrist.y }, HandData.smoothFactor);

      this.cursor.setPosition(HandData.leftSmooth.x * W, HandData.leftSmooth.y * H);
      this.cursor.setVisible(true);

      const leftPill = document.getElementById('left-hand-pill');
      if (HandData.leftPinching) {
        this.cursorOuter.setFillStyle(0xfff4c2, 0.88);
        this.cursorOuter.setRadius(26);
        this.cursorInner.setText('👌');
        leftPill.className = 'hand-pill pinching';
        leftPill.textContent = '👈 Mencubit!';
      } else {
        this.cursorOuter.setFillStyle(0xffffff, 0.65);
        this.cursorOuter.setRadius(32);
        this.cursorInner.setText('✋');
        leftPill.className = 'hand-pill active';
        leftPill.textContent = '👈 Tangan Kiri Siap';
      }
    } else {
      this.cursor.setVisible(false);
      HandData.leftSmooth = { x: 0.5, y: 0.5 };
      document.getElementById('left-hand-pill').className = 'hand-pill';
      document.getElementById('left-hand-pill').textContent = '👈 Tangan Kiri';
    }

    if (HandData.rightHand) {
      const wrist = HandData.rightHand[0];
      HandData.rightSmooth = HandData.smooth(HandData.rightSmooth, { x: 1 - wrist.x, y: wrist.y }, HandData.smoothFactor);

      this.rightCursor.setPosition(HandData.rightSmooth.x * W, HandData.rightSmooth.y * H);
      this.rightCursor.setVisible(true);

      const rightPill = document.getElementById('right-hand-pill');
      if (HandData.rightPinching) {
        this.rightCursorOuter && this.rightCursorOuter.setFillStyle(0xfff4c2, 0.88);
        this.rightCursorOuter && this.rightCursorOuter.setRadius(24);
        this.rightCursorInner && this.rightCursorInner.setText('👌');
        rightPill.className = 'hand-pill pinching';
        rightPill.textContent = '👉 Mencubit!';
      } else {
        this.rightCursorOuter && this.rightCursorOuter.setFillStyle(0xffffff, 0.65);
        this.rightCursorOuter && this.rightCursorOuter.setRadius(28);
        this.rightCursorInner && this.rightCursorInner.setText('⭐');
        rightPill.className = 'hand-pill active';
        rightPill.textContent = '👉 Tangan Kanan Siap';
      }
    } else {
      this.rightCursor.setVisible(false);
      HandData.rightSmooth = { x: 0.5, y: 0.5 };
      document.getElementById('right-hand-pill').className = 'hand-pill';
      document.getElementById('right-hand-pill').textContent = '👉 Tangan Kanan';
    }
  }

  nextLevel() {
    this.clearLetters();
    document.getElementById('level-complete').style.display = 'none';
    GameState.currentLevel++;
    if (GameState.currentLevel >= QUESTIONS.length) {
      GameState.state = GameMode.GAME_OVER;
      speak(`Selamat ${GameState.studentName}, semua level selesai.`, true, 'complete');
      document.getElementById('go-score').textContent = `🏆 Semua Level Selesai! Najm Akhir: ${GameState.score}`;
      updateHandStatsPanel();
      if (typeof window.requestGroqKapAnalysis === 'function') {
        window.requestGroqKapAnalysis({ force: true, reason: 'all-levels-complete' });
      }
      document.getElementById('hand-stats').classList.remove('show');
      document.getElementById('game-over').style.display = 'flex';
      document.getElementById('game-over').querySelector('h2').textContent = '🏆 أنت بطل!';
      document.getElementById('game-over').querySelector('h2').style.color = '#23a65a';
      return;
    }
    this.startLevel();
  }

  restartGame() {
    document.getElementById('game-over').style.display = 'none';
    GameState.currentLevel = 0;
    GameState.score = 0;
    GameState.lives = 3;
    GameState.started = true;
    resetHandStats();
    resetLearningAnalytics();
    this.startLevel();
  }
}

// =============================================
