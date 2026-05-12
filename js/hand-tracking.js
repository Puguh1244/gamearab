// MEDIAPIPE HANDS
// =============================================
let handsDetector = null;
let mpCamera = null;
let mpLoopActive = false;
let mpLoopRunning = false;

function initMediaPipe(videoEl) {
  if (!videoEl) throw new Error('Elemen video kamera tidak ditemukan');

  handsDetector = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  handsDetector.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.5
  });

  handsDetector.onResults(onHandResults);

  // Jangan pakai Camera Utils untuk membuat stream baru.
  // Kita pakai video preview yang sama agar gambar kamera benar-benar tampil,
  // lalu frame video itu dikirim ke MediaPipe.
  mpCamera = {
    async start() {
      if (mpLoopActive) return;
      mpLoopActive = true;
      if (!mpLoopRunning) runMediaPipeLoop(videoEl);
    },
    stop() {
      mpLoopActive = false;
    }
  };

  return mpCamera;
}

async function runMediaPipeLoop(videoEl) {
  mpLoopRunning = true;
  while (mpLoopActive) {
    try {
      if (
        handsDetector &&
        videoEl &&
        videoEl.readyState >= 2 &&
        videoEl.videoWidth > 0 &&
        videoEl.videoHeight > 0
      ) {
        await handsDetector.send({ image: videoEl });
      }
    } catch (e) {
      // Lewati frame yang gagal supaya game tidak crash saat kamera lambat.
    }
    await new Promise(resolve => requestAnimationFrame(resolve));
  }
  mpLoopRunning = false;
}

function resizeHandCanvas() {
  const fullCanvas = document.getElementById('hand-canvas');
  if (fullCanvas) {
    fullCanvas.width = window.innerWidth;
    fullCanvas.height = window.innerHeight;
  }

  const previewCanvas = document.getElementById('cam-preview-canvas');
  const preview = document.getElementById('cam-preview');
  if (previewCanvas && preview) {
    const rect = preview.getBoundingClientRect();
    previewCanvas.width = Math.max(1, Math.round(rect.width));
    previewCanvas.height = Math.max(1, Math.round(rect.height));
  }
}

function clearCanvas(canvas) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (!canvas.width || !canvas.height) resizeHandCanvas();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  return ctx;
}

function onHandResults(results) {
  const previewCanvas = document.getElementById('cam-preview-canvas');
  const previewCtx = clearCanvas(previewCanvas);

  HandData.leftHand = null;
  HandData.rightHand = null;
  HandData.leftPinching = false;
  HandData.rightPinching = false;

  if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) return;

  results.multiHandLandmarks.forEach((landmarks, i) => {
    const handedness = (results.multiHandedness && results.multiHandedness[i] && results.multiHandedness[i].label) || 'Right';
    const pinchDist = HandData.getPinchDistance(landmarks);
    const isPinching = pinchDist < HandData.pinchThreshold;

    // Preview video dibuat mirror. Label MediaPipe dibalik agar terasa natural untuk pemain.
    if (handedness === 'Right') {
      HandData.leftHand = landmarks;
      HandData.leftPinching = isPinching;
    } else {
      HandData.rightHand = landmarks;
      HandData.rightPinching = isPinching;
    }

    if (previewCtx && previewCanvas) {
      drawHandSkeleton(previewCtx, previewCanvas, landmarks, handedness === 'Right' ? '#00a8ff' : '#8a5cff', isPinching);
    }
  });
}

function drawHandSkeleton(ctx, canvas, landmarks, color, isPinching) {
  const W = canvas.width;
  const H = canvas.height;

  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = 'rgba(255,255,255,.92)';
  ctx.lineWidth = Math.max(4, W * 0.016);
  connections.forEach(([a, b]) => {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    ctx.beginPath();
    ctx.moveTo((1 - lmA.x) * W, lmA.y * H);
    ctx.lineTo((1 - lmB.x) * W, lmB.y * H);
    ctx.stroke();
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, W * 0.009);
  connections.forEach(([a, b]) => {
    const lmA = landmarks[a];
    const lmB = landmarks[b];
    ctx.beginPath();
    ctx.moveTo((1 - lmA.x) * W, lmA.y * H);
    ctx.lineTo((1 - lmB.x) * W, lmB.y * H);
    ctx.stroke();
  });

  landmarks.forEach((lm, idx) => {
    const isFingerTip = [4, 8, 12, 16, 20].includes(idx);
    const r = isFingerTip ? Math.max(5, W * 0.028) : Math.max(3.5, W * 0.018);
    const x = (1 - lm.x) * W;
    const y = lm.y * H;

    ctx.fillStyle = isPinching && (idx === 4 || idx === 8) ? '#ffd95c' : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.5, W * 0.006);
    ctx.stroke();
  });

  ctx.restore();
}

window.addEventListener('resize', resizeHandCanvas);

// =============================================
