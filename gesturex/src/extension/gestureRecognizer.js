
// GestureX - Custom Hand Gesture Recognition Engine

const distance = (pointA, pointB) => {
  const dx = pointA.x - pointB.x;
  const dy = pointA.y - pointB.y;
  return Math.hypot(dx, dy);
};

const isFingerExtended = (
  landmarks,
  tipIndex,
  pipIndex,
  mcpIndex
) => {
  const wrist = landmarks[0];

  const tipDistance = distance(landmarks[tipIndex], wrist);
  const pipDistance = distance(landmarks[pipIndex], wrist);

  const tipToMcp = distance(
    landmarks[tipIndex],
    landmarks[mcpIndex]
  );

  const pipToMcp = distance(
    landmarks[pipIndex],
    landmarks[mcpIndex]
  );

  return (
    tipDistance > pipDistance * 1.12 &&
    tipToMcp > pipToMcp * 1.05
  );
};

const isThumbExtended = (landmarks) => {
  return (
    distance(landmarks[4], landmarks[5]) >
    distance(landmarks[3], landmarks[5]) * 1.15
  );
};

export const recognizeGesture = (landmarks) => {
  if (!landmarks || landmarks.length !== 21) {
    return { name: "UNKNOWN", action: "None" };
  }

  const thumb = isThumbExtended(landmarks);
  const index = isFingerExtended(landmarks, 8, 6, 5);
  const middle = isFingerExtended(landmarks, 12, 10, 9);
  const ring = isFingerExtended(landmarks, 16, 14, 13);
  const pinky = isFingerExtended(landmarks, 20, 18, 17);

  // Open palm: resume detection
  if (thumb && index && middle && ring && pinky) {
    return { name: "OPEN_PALM", action: "RESUME_DETECTION" };
  }

  // Thumb + pinky: pause detection
  if (thumb && pinky && !index && !middle && !ring) {
    return { name: "THUMB_PINKY", action: "PAUSE_DETECTION" };
  }

  // Only pinky extended: open new tab
if (!thumb && !index && !middle && !ring && pinky) {
  return {
    name: "PINKY_ONLY",
    action: "OPEN_NEW_TAB"
  };
}

  // Three fingers: virtual keyboard
  if (!index && middle && ring && pinky && !thumb) {
    return { name: "KEYBOARD_GESTURE", action: "VIRTUAL_KEYBOARD" };
  }

  // Two fingers: scroll
  if (index && middle && !ring && !pinky && !thumb) {
    return {
      name: "TWO_FINGERS",
      action: "SCROLL",
      cursor: {
        x: (landmarks[8].x + landmarks[12].x) / 2,
        y: (landmarks[8].y + landmarks[12].y) / 2
      }
    };
  }

  // Index + pinky: right-click
  if (index && !middle && !ring && pinky && !thumb) {
    return { name: "INDEX_PINKY", action: "RIGHT_CLICK" };
  }

  // Index + open thumb: left-click
  if (index && thumb && !middle && !ring && !pinky) {
    return { name: "INDEX_THUMB_OPEN", action: "LEFT_CLICK" };
  }

  // Index only: move cursor
  if (index && !thumb && !middle && !ring && !pinky) {
    return {
      name: "INDEX_FINGER",
      action: "MOVE_CURSOR",
      cursor: {
        x: landmarks[8].x,
        y: landmarks[8].y
      }
    };
  }

  return { name: "UNKNOWN", action: "None" };
};
