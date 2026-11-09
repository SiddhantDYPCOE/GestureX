import {
  FilesetResolver,
  HandLandmarker
} from "@mediapipe/tasks-vision";

// Initialize MediaPipe hand detection
export const createHandLandmarker = async ({
  wasmPath,
  modelPath
}) => {
  // Load MediaPipe's local WebAssembly files
  const vision = await FilesetResolver.forVisionTasks(
    wasmPath
  );

  // Create the hand detector
  const handLandmarker = await HandLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: modelPath,
        delegate: "CPU"
      },

      runningMode: "VIDEO",

      numHands: 1,

      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.6,
      minTrackingConfidence: 0.6
    }
  );

  console.log("GestureX hand detector initialized");

  return handLandmarker;
};

// Detect hands in a video frame
export const detectHands = (
  handLandmarker,
  video,
  timestamp = performance.now()
) => {
  if (!handLandmarker || !video) {
    return null;
  }

  // Ensure the video has a usable frame
  if (video.readyState < 2) {
    return null;
  }

  const results = handLandmarker.detectForVideo(
    video,
    timestamp
  );

  return results;
};

// Release MediaPipe resources
export const closeHandLandmarker = (handLandmarker) => {
  if (handLandmarker) {
    handLandmarker.close();

    console.log("GestureX hand detector stopped");
  }
};