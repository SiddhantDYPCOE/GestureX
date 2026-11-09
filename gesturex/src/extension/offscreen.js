
import {
  createHandLandmarker,
  detectHands,
  closeHandLandmarker
} from "./handDetector.js";

import { recognizeGesture } from "./gestureRecognizer.js";

// Camera
let cameraStream = null;
let cameraVideo = null;

// Preview
let previewCanvas = null;
let previewContext = null;
let lastPreviewTime = 0;

const PREVIEW_INTERVAL = 120;

// MediaPipe
let handLandmarker = null;

// Detection state
let isCameraStarting = false;
let isDetectionRunning = false;
let detectionTimer = null;

let previousHandCount = -1;
let previousGesture = "UNKNOWN";
let isGesturePaused = false;

// New-tab cooldown
let lastNewTabTime = -Infinity;
const NEW_TAB_COOLDOWN = 5000;

// Cursor diagnostics
let minFingerX = 1;
let maxFingerX = 0;
let minFingerY = 1;
let maxFingerY = 0;
let lastCoordinateLog = 0;

// Scroll tracking
let wasScrolling = false;

// Hand skeleton connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17]
];

// Extension assets
const WASM_PATH = chrome.runtime.getURL("mediapipe/wasm/");
const MODEL_PATH = chrome.runtime.getURL(
  "models/hand_landmarker.task"
);

const sendExtensionMessage = (message) => {
  chrome.runtime.sendMessage(message).catch((error) => {
    console.warn("GestureX message error:", error);
  });
};

const sendCameraStatus = (status, message = "") => {
  sendExtensionMessage({
    type: "GESTUREX_CAMERA_STATUS",
    status,
    message
  });
};

const sendGestureStatus = (gesture, action) => {
  sendExtensionMessage({
    type: "GESTUREX_GESTURE_STATUS",
    gesture,
    action,
    paused: isGesturePaused
  });
};

// Initialize webcam
const initializeCamera = async () => {
  cameraStream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      facingMode: "user"
    }
  });

  cameraVideo = document.createElement("video");

  cameraVideo.autoplay = true;
  cameraVideo.muted = true;
  cameraVideo.playsInline = true;
  cameraVideo.srcObject = cameraStream;

  await cameraVideo.play();

  if (cameraVideo.readyState < 2) {
    await new Promise((resolve, reject) => {
      cameraVideo.addEventListener("loadeddata", resolve, {
        once: true
      });

      cameraVideo.addEventListener("error", reject, {
        once: true
      });
    });
  }

  previewCanvas = document.createElement("canvas");

  previewCanvas.width = cameraVideo.videoWidth || 640;
  previewCanvas.height = cameraVideo.videoHeight || 480;

  previewContext = previewCanvas.getContext("2d");

  console.log("GestureX webcam initialized");
};

// Draw hand skeleton
const drawHandOverlay = (landmarks) => {
  if (!previewContext || !landmarks) return;

  const width = previewCanvas.width;
  const height = previewCanvas.height;

  previewContext.save();

  previewContext.lineWidth = 3;
  previewContext.strokeStyle = "rgba(56, 189, 248, 0.85)";
  previewContext.shadowColor = "rgba(56, 189, 248, 0.8)";
  previewContext.shadowBlur = 8;

  HAND_CONNECTIONS.forEach(([start, end]) => {
    const pointA = landmarks[start];
    const pointB = landmarks[end];

    previewContext.beginPath();
    previewContext.moveTo(
      pointA.x * width,
      pointA.y * height
    );
    previewContext.lineTo(
      pointB.x * width,
      pointB.y * height
    );
    previewContext.stroke();
  });

  landmarks.forEach((point, index) => {
    const x = point.x * width;
    const y = point.y * height;
    const isFingerTip = [4, 8, 12, 16, 20].includes(index);

    previewContext.beginPath();
    previewContext.arc(
      x,
      y,
      isFingerTip ? 7 : 4,
      0,
      Math.PI * 2
    );

    previewContext.fillStyle = isFingerTip
      ? "rgba(129, 140, 248, 0.95)"
      : "rgba(255, 255, 255, 0.8)";

    previewContext.fill();

    previewContext.beginPath();
    previewContext.arc(
      x,
      y,
      isFingerTip ? 11 : 7,
      0,
      Math.PI * 2
    );

    previewContext.strokeStyle = "rgba(129, 140, 248, 0.45)";
    previewContext.lineWidth = 2;
    previewContext.stroke();
  });

  // Index fingertip highlight
  const indexTip = landmarks[8];

  previewContext.beginPath();
  previewContext.arc(
    indexTip.x * width,
    indexTip.y * height,
    12,
    0,
    Math.PI * 2
  );

  previewContext.fillStyle = "rgba(59, 130, 246, 0.9)";
  previewContext.shadowColor = "#3b82f6";
  previewContext.shadowBlur = 18;
  previewContext.fill();

  previewContext.restore();
};

// Send camera preview
const sendCameraPreview = (landmarks = null) => {
  if (!cameraVideo || !previewContext || !previewCanvas) return;

  const now = performance.now();

  if (now - lastPreviewTime < PREVIEW_INTERVAL) return;

  lastPreviewTime = now;

  previewContext.clearRect(
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );

  previewContext.drawImage(
    cameraVideo,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height
  );

  if (landmarks) {
    drawHandOverlay(landmarks);
  }

  sendExtensionMessage({
    type: "GESTUREX_CAMERA_PREVIEW",
    frame: previewCanvas.toDataURL("image/jpeg", 0.55)
  });
};

// Initialize MediaPipe
const initializeHandDetection = async () => {
  handLandmarker = await createHandLandmarker({
    wasmPath: WASM_PATH,
    modelPath: MODEL_PATH
  });

  console.log("GestureX MediaPipe initialized");
};

// Track fingertip coordinates for calibration
const trackFingerCoordinates = (x, y) => {
  minFingerX = Math.min(minFingerX, x);
  maxFingerX = Math.max(maxFingerX, x);
  minFingerY = Math.min(minFingerY, y);
  maxFingerY = Math.max(maxFingerY, y);

  const now = performance.now();

  if (now - lastCoordinateLog >= 1000) {
    lastCoordinateLog = now;

    console.log("GestureX fingertip range:", {
      minX: minFingerX.toFixed(3),
      maxX: maxFingerX.toFixed(3),
      minY: minFingerY.toFixed(3),
      maxY: maxFingerY.toFixed(3)
    });
  }
};

// Process webcam frames
const processFrame = () => {
  if (!isDetectionRunning || !cameraVideo || !handLandmarker) {
    return;
  }

  try {
    if (
      cameraVideo.readyState >= 2 &&
      cameraVideo.currentTime > 0
    ) {
      const results = detectHands(
        handLandmarker,
        cameraVideo,
        performance.now()
      );

      const landmarks = results?.landmarks || [];
      const handCount = landmarks.length;

      if (handCount !== previousHandCount) {
        previousHandCount = handCount;

        sendExtensionMessage({
          type: "GESTUREX_HAND_STATUS",
          detected: handCount > 0,
          handCount
        });
      }

      sendCameraPreview(
        handCount > 0 ? landmarks[0] : null
      );

      if (handCount === 0) {
        if (previousGesture !== "UNKNOWN") {
          previousGesture = "UNKNOWN";

          sendGestureStatus("UNKNOWN", "None");

          sendExtensionMessage({
            type: "GESTUREX_CURSOR_HIDE"
          });

          if (wasScrolling) {
            sendExtensionMessage({
              type: "GESTUREX_SCROLL_RESET"
            });
            wasScrolling = false;
          }
        }
      } else {
        const gesture = recognizeGesture(landmarks[0]);

        const gestureName = gesture.name;
        const gestureAction = gesture.action;

        // Pause
        if (
          gestureName === "THUMB_PINKY" &&
          !isGesturePaused
        ) {
          isGesturePaused = true;
          wasScrolling = false;

          sendGestureStatus(gestureName, gestureAction);

          sendExtensionMessage({
            type: "GESTUREX_CURSOR_HIDE"
          });

          sendExtensionMessage({
            type: "GESTUREX_SCROLL_RESET"
          });
        }

        // Resume
        else if (
          gestureName === "OPEN_PALM" &&
          isGesturePaused
        ) {
          isGesturePaused = false;

          sendGestureStatus(gestureName, gestureAction);
        }

        // Normal gesture processing
        else if (!isGesturePaused) {
          if (gestureName !== previousGesture) {
            sendGestureStatus(
              gestureName,
              gestureAction
            );

            // Reset scroll tracking when entering or leaving scroll mode
            if (gestureAction !== "SCROLL" && wasScrolling) {
              sendExtensionMessage({
                type: "GESTUREX_SCROLL_RESET"
              });

              wasScrolling = false;
            }

            if (
              gestureAction === "SCROLL" &&
              !wasScrolling
            ) {
              sendExtensionMessage({
                type: "GESTUREX_SCROLL_RESET"
              });

              wasScrolling = true;
            }

            if (
              gestureAction !== "None" &&
              gestureAction !== "MOVE_CURSOR" &&
              gestureAction !== "SCROLL"
            ) {
              if (gestureAction === "OPEN_NEW_TAB") {
                const now = performance.now();

                if (now - lastNewTabTime >= NEW_TAB_COOLDOWN) {
                  lastNewTabTime = now;

                  sendExtensionMessage({
                    type: "GESTUREX_GESTURE_ACTION",
                    gesture: gestureName,
                    action: gestureAction
                  });

                  console.log("GestureX: New tab opened");
                } else {
                  console.log(
                    "GestureX: New tab gesture is cooling down"
                  );
                }
              } else {
                sendExtensionMessage({
                  type: "GESTUREX_GESTURE_ACTION",
                  gesture: gestureName,
                  action: gestureAction
                });
              }
            }

            // Keep cursor visible for scrolling
            if (
              gestureAction !== "MOVE_CURSOR" &&
              gestureAction !== "SCROLL"
            ) {
              sendExtensionMessage({
                type: "GESTUREX_CURSOR_HIDE"
              });
            }
          }

          // Cursor movement
          if (
            gestureAction === "MOVE_CURSOR" &&
            gesture.cursor
          ) {
            const { x, y } = gesture.cursor;

            trackFingerCoordinates(x, y);

            sendExtensionMessage({
              type: "GESTUREX_CURSOR_MOVE",
              x,
              y
            });
          }


          // Cursor movement and scrolling
          if (gestureAction === "MOVE_CURSOR") {
            const x = landmarks[8].x;
            const y = landmarks[8].y;

            trackFingerCoordinates(x, y);

            sendExtensionMessage({
              type: "GESTUREX_CURSOR_MOVE",
              x,
              y
            });
          }

          if (gestureAction === "SCROLL") {
            // Keep the blue dot following the index fingertip
            const x = landmarks[8].x;
            const y = landmarks[8].y;

            // Use both fingertips for stable scroll tracking
            const scrollY =
              (landmarks[8].y + landmarks[12].y) / 2;

            sendExtensionMessage({
              type: "GESTUREX_SCROLL_UPDATE",
              y: scrollY,
              cursorX: x,
              cursorY: y
            });
          }

        }

        previousGesture = gestureName;
      }
    }
  } catch (error) {
    console.error("GestureX frame detection error:", error);
  }

  if (isDetectionRunning) {
    detectionTimer = setTimeout(processFrame, 33);
  }
};

// Cleanup
const cleanupDetection = () => {
  isDetectionRunning = false;

  if (detectionTimer) {
    clearTimeout(detectionTimer);
    detectionTimer = null;
  }

  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  if (cameraVideo) {
    cameraVideo.pause();
    cameraVideo.srcObject = null;
    cameraVideo = null;
  }

  if (handLandmarker) {
    closeHandLandmarker(handLandmarker);
    handLandmarker = null;
  }

  previewCanvas = null;
  previewContext = null;
  lastPreviewTime = 0;

  previousHandCount = -1;
  previousGesture = "UNKNOWN";
  isGesturePaused = false;
  wasScrolling = false;

  minFingerX = 1;
  maxFingerX = 0;
  minFingerY = 1;
  maxFingerY = 0;
  lastCoordinateLog = 0;
};

// Start detection
const startDetection = async () => {
  if (isDetectionRunning) {
    return {
      success: true,
      message: "Detection is already running"
    };
  }

  if (isCameraStarting) {
    return {
      success: false,
      message: "Camera initialization is already in progress"
    };
  }

  isCameraStarting = true;

  try {
    sendCameraStatus("STARTING");

    await initializeCamera();
    await initializeHandDetection();

    isDetectionRunning = true;

    processFrame();

    sendCameraStatus("ACTIVE");

    return {
      success: true,
      message: "Camera and hand detection started"
    };
  } catch (error) {
    console.error("GestureX initialization failed:", error);

    cleanupDetection();

    sendCameraStatus("ERROR", error.message);

    return {
      success: false,
      message: error.message
    };
  } finally {
    isCameraStarting = false;
  }
};

// Stop detection
const stopDetection = async () => {
  cleanupDetection();

  sendExtensionMessage({
    type: "GESTUREX_CAMERA_PREVIEW",
    frame: null
  });

  sendExtensionMessage({
    type: "GESTUREX_HAND_STATUS",
    detected: false,
    handCount: 0
  });

  sendGestureStatus("UNKNOWN", "None");

  sendExtensionMessage({
    type: "GESTUREX_CURSOR_HIDE"
  });

  sendExtensionMessage({
    type: "GESTUREX_SCROLL_RESET"
  });

  sendCameraStatus("INACTIVE");

  console.log("GestureX detection stopped");

  return {
    success: true,
    message: "Detection stopped successfully"
  };
};

// Listen for commands
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    if (message.target !== "offscreen") return;

    if (message.type === "GESTUREX_CAMERA_START") {
      startDetection().then(sendResponse);
      return true;
    }

    if (message.type === "GESTUREX_CAMERA_STOP") {
      stopDetection().then(sendResponse);
      return true;
    }
  }
);

console.log("GestureX offscreen detection engine loaded");
