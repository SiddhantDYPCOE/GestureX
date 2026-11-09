
// GestureX - Webpage Interaction Controller

let gestureXCursor = null;
let gestureXLabel = null;

let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

let targetX = cursorX;
let targetY = cursorY;

let animationFrame = null;
let hasCursorPosition = false;

let previousScrollY = null;

const CURSOR_SMOOTHING = 0.35;
const SCROLL_SENSITIVITY = 5;
const SCROLL_THRESHOLD = 0.001;

const clamp = (value) => Math.max(0, Math.min(1, value));

const actionLabels = {
  MOVE_CURSOR: "Move Cursor",
  LEFT_CLICK: "Left Click",
  RIGHT_CLICK: "Right Click",
  SCROLL: "Scrolling",
  OPEN_NEW_TAB: "Opening New Tab",
  VIRTUAL_KEYBOARD: "Virtual Keyboard",
  PAUSE_DETECTION: "Detection Paused",
  RESUME_DETECTION: "Detection Resumed",
  None: "Ready"
};

// Create cursor
const createCursor = () => {
  if (document.getElementById("gesturex-cursor")) {
    gestureXCursor = document.getElementById("gesturex-cursor");
    gestureXLabel = document.getElementById("gesturex-label");
    return;
  }

  gestureXCursor = document.createElement("div");
  gestureXCursor.id = "gesturex-cursor";

  Object.assign(gestureXCursor.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
    width: "18px",
    height: "18px",
    backgroundColor: "#3b82f6",
    border: "3px solid white",
    borderRadius: "50%",
    boxShadow: "0 0 8px #3b82f6, 0 0 18px rgba(59,130,246,.8)",
    pointerEvents: "none",
    zIndex: "2147483647",
    display: "none",
    transform: "translate(-50%, -50%)",
    willChange: "left, top"
  });

  gestureXLabel = document.createElement("div");
  gestureXLabel.id = "gesturex-label";

  Object.assign(gestureXLabel.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
    padding: "5px 9px",
    background: "rgba(15, 23, 42, 0.92)",
    color: "#ffffff",
    border: "1px solid rgba(148, 163, 184, 0.35)",
    borderRadius: "6px",
    fontFamily: "Arial, sans-serif",
    fontSize: "12px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: "2147483647",
    display: "none",
    transform: "translate(-50%, 12px)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
  });

  document.documentElement.appendChild(gestureXCursor);
  document.documentElement.appendChild(gestureXLabel);
};

// Update action label
const updateActionLabel = (action) => {
  if (!gestureXCursor) createCursor();

  gestureXLabel.textContent =
    actionLabels[action] || action || "Ready";

  gestureXLabel.style.display = "block";
};

// Position cursor and label
const updateCursorPosition = () => {
  if (!gestureXCursor) return;

  gestureXCursor.style.left = `${cursorX}px`;
  gestureXCursor.style.top = `${cursorY}px`;

  if (gestureXLabel) {
    gestureXLabel.style.left = `${cursorX}px`;
    gestureXLabel.style.top = `${cursorY}px`;
  }
};

// Cursor animation
const animateCursor = () => {
  if (!gestureXCursor) return;

  cursorX += (targetX - cursorX) * CURSOR_SMOOTHING;
  cursorY += (targetY - cursorY) * CURSOR_SMOOTHING;

  updateCursorPosition();

  const distance = Math.hypot(
    targetX - cursorX,
    targetY - cursorY
  );

  if (distance > 0.5) {
    animationFrame = requestAnimationFrame(animateCursor);
  } else {
    cursorX = targetX;
    cursorY = targetY;

    updateCursorPosition();

    animationFrame = null;
  }
};

// Move cursor
const moveCursor = (x, y) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  if (!gestureXCursor) createCursor();

  // Mirror horizontal direction for selfie camera
  targetX = (1 - clamp(x)) * window.innerWidth;
  targetY = clamp(y) * window.innerHeight;

  if (!hasCursorPosition) {
    cursorX = targetX;
    cursorY = targetY;
    hasCursorPosition = true;
  }

  gestureXCursor.style.display = "block";
  gestureXLabel.style.display = "block";

  if (animationFrame === null) {
    animationFrame = requestAnimationFrame(animateCursor);
  }
};

// Show action
const showAction = (action) => {
  if (!gestureXCursor) createCursor();

  updateActionLabel(action);

  gestureXCursor.style.display = "block";
  gestureXLabel.style.display = "block";

  updateCursorPosition();
};

// Hide cursor
const hideCursor = () => {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  if (gestureXCursor) {
    gestureXCursor.style.display = "none";
  }

  if (gestureXLabel) {
    gestureXLabel.style.display = "none";
  }

  hasCursorPosition = false;
};

// Find element below cursor
const getCursorTarget = () => {
  const target = document.elementFromPoint(cursorX, cursorY);

  if (
    !target ||
    target === gestureXCursor ||
    target === gestureXLabel ||
    target.id === "gesturex-cursor" ||
    target.id === "gesturex-label"
  ) {
    return null;
  }

  return target;
};

// Left click
const performLeftClick = () => {
  const target = getCursorTarget();

  if (!target) return;

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    target.focus();
  }

  target.click();

  console.log("GestureX left click:", target);
};

// Right click
const performRightClick = () => {
  const target = getCursorTarget();

  if (!target) return;

  const eventOptions = {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 2,
    buttons: 2,
    clientX: cursorX,
    clientY: cursorY
  };

  target.dispatchEvent(
    new MouseEvent("mousedown", eventOptions)
  );

  target.dispatchEvent(
    new MouseEvent("mouseup", {
      ...eventOptions,
      buttons: 0
    })
  );

  target.dispatchEvent(
    new MouseEvent("contextmenu", eventOptions)
  );

  console.log("GestureX right click:", target);
};



const getScrollableElements = (scrollAmount) => {
  let element = document.elementFromPoint(cursorX, cursorY);
  const scrollableElements = [];

  // Find scrollable containers under the cursor, nearest first.
  while (
    element &&
    element !== document.body &&
    element !== document.documentElement
  ) {
    const styles = window.getComputedStyle(element);

    const canScroll =
      element.scrollHeight > element.clientHeight + 2 &&
      ["auto", "scroll", "overlay"].includes(styles.overflowY);

    if (canScroll) {
      scrollableElements.push(element);
    }

    element = element.parentElement;
  }

  const pageScroller = document.scrollingElement || document.documentElement;
  if (!scrollableElements.includes(pageScroller)) {
    scrollableElements.push(pageScroller);
  }

  return scrollableElements.filter((scrollableElement) => {
    const maxScrollTop =
      scrollableElement.scrollHeight - scrollableElement.clientHeight;

    return scrollAmount < 0
      ? scrollableElement.scrollTop > 0
      : scrollableElement.scrollTop < maxScrollTop;
  });
};

const performScroll = (normalizedY) => {
  if (!Number.isFinite(normalizedY)) return;

  if (previousScrollY === null) {
    previousScrollY = normalizedY;
    return;
  }

  const delta = normalizedY - previousScrollY;
  previousScrollY = normalizedY;

  if (Math.abs(delta) < 0.0005) return;

  // Reverse the direction of hand movement
  const scrollAmount =
    -delta * window.innerHeight * SCROLL_SENSITIVITY;

  const scrollTargets = getScrollableElements(scrollAmount);

  for (const scrollTarget of scrollTargets) {
    const previousTop = scrollTarget.scrollTop;
    scrollTarget.scrollBy({
      top: scrollAmount,
      behavior: "auto"
    });

    if (scrollTarget.scrollTop !== previousTop) {
      return;
    }
  }

  window.scrollBy({
    top: scrollAmount,
    behavior: "auto"
  });
};



// Reset scroll
const resetScrollTracking = () => {
  previousScrollY = null;
};

// Receive messages
chrome.runtime.onMessage.addListener((message) => {
  switch (message.type) {
    case "GESTUREX_CURSOR_MOVE":
      moveCursor(message.x, message.y);
      break;

    case "GESTUREX_CURSOR_HIDE":
      hideCursor();
      break;

    case "GESTUREX_LEFT_CLICK":
      showAction("LEFT_CLICK");
      performLeftClick();
      break;

    case "GESTUREX_RIGHT_CLICK":
      showAction("RIGHT_CLICK");
      performRightClick();
      break;

    case "GESTUREX_SCROLL_UPDATE":
      if (
        Number.isFinite(message.cursorX) &&
        Number.isFinite(message.cursorY)
      ) {
        moveCursor(message.cursorX, message.cursorY);
      }
      showAction("SCROLL");
      performScroll(message.y);
      break;

    case "GESTUREX_SCROLL_RESET":
      resetScrollTracking();
      break;

    case "GESTUREX_ACTION_LABEL":
      showAction(message.action);
      break;

    default:
      break;
  }
});

createCursor();

console.log("GestureX content script loaded");
