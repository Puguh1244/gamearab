// HAND TRACKING STATE
// =============================================
const HandData = {
  leftHand: null,
  rightHand: null,
  leftPinching: false,
  rightPinching: false,
  leftPos: { x: 0, y: 0 },
  rightPos: { x: 0, y: 0 },
  pinchThreshold: 0.055,
  smoothFactor: 0.25,
  leftSmooth: { x: 0.5, y: 0.5 },
  rightSmooth: { x: 0.5, y: 0.5 },

  getPinchDistance(hand) {
    if (!hand || hand.length < 9) return 1;
    const thumb = hand[4];
    const index = hand[8];
    return Math.hypot(thumb.x - index.x, thumb.y - index.y);
  },

  smooth(current, target, factor) {
    return {
      x: current.x + (target.x - current.x) * factor,
      y: current.y + (target.y - current.y) * factor
    };
  }
};

// =============================================
