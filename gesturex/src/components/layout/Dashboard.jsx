
import { useEffect, useState } from "react";

import {
  Activity,
  Camera,
  Keyboard,
  MousePointer2,
  Plus,
  ScrollText,
  Hand
} from "lucide-react";

const Dashboard = () => {
  const [cameraStatus, setCameraStatus] = useState("INACTIVE");
  const [cameraError, setCameraError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [cameraPreview, setCameraPreview] = useState(null);

  const [handDetected, setHandDetected] = useState(false);
  const [handCount, setHandCount] = useState(0);
  const [activeGesture, setActiveGesture] = useState("None");
  const [isPaused, setIsPaused] = useState(false);

  const isActive = cameraStatus === "ACTIVE";

  // Listen for messages from the extension
  useEffect(() => {
    if (!globalThis.chrome?.runtime?.onMessage) {
      return;
    }

    const handleExtensionMessage = (message) => {
      if (message.type === "GESTUREX_CAMERA_STATUS") {
        setCameraStatus(message.status);

        if (message.status === "ERROR") {
          setCameraError(
            message.message || "Camera access failed"
          );
        } else {
          setCameraError("");
        }

        if (message.status === "INACTIVE") {
          setCameraPreview(null);
          setHandDetected(false);
          setHandCount(0);
          setActiveGesture("None");
          setIsPaused(false);
        }
      }

      if (message.type === "GESTUREX_CAMERA_PREVIEW") {
        setCameraPreview(message.frame || null);
      }

      if (message.type === "GESTUREX_HAND_STATUS") {
        setHandDetected(message.detected);
        setHandCount(message.handCount);
      }

      if (message.type === "GESTUREX_GESTURE_STATUS") {
        setActiveGesture(
          message.gesture === "UNKNOWN"
            ? "None"
            : message.gesture.replaceAll("_", " ")
        );

        setIsPaused(Boolean(message.paused));
      }
    };

    chrome.runtime.onMessage.addListener(
      handleExtensionMessage
    );

    return () => {
      chrome.runtime.onMessage.removeListener(
        handleExtensionMessage
      );
    };
  }, []);

  // Start or stop camera
  const toggleCamera = async () => {
    if (isLoading) return;

    if (!globalThis.chrome?.runtime?.sendMessage) {
      setCameraError(
        "Open GestureX through your browser extension to use the camera."
      );
      return;
    }

    setIsLoading(true);
    setCameraError("");

    try {
      const response = await chrome.runtime.sendMessage({
        type: isActive
          ? "GESTUREX_CAMERA_STOP"
          : "GESTUREX_CAMERA_START"
      });

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to control camera"
        );
      }

      if (isActive) {
        setCameraStatus("INACTIVE");
        setCameraPreview(null);
        setHandDetected(false);
        setHandCount(0);
        setActiveGesture("None");
        setIsPaused(false);
      }
    } catch (error) {
      console.error("GestureX camera error:", error);

      setCameraError(error.message);
      setCameraStatus("ERROR");
    } finally {
      setIsLoading(false);
    }
  };

  // Camera status label
  const getCameraStatusText = () => {
    switch (cameraStatus) {
      case "ACTIVE":
        return "Camera Active";

      case "STARTING":
        return "Starting Camera...";

      case "ERROR":
        return "Camera Error";

      default:
        return "Camera Off";
    }
  };

  // Camera status colors
  const getCameraStatusColor = () => {
    switch (cameraStatus) {
      case "ACTIVE":
        return "bg-green-500/10 text-green-400";

      case "STARTING":
        return "bg-yellow-500/10 text-yellow-400";

      case "ERROR":
        return "bg-red-500/10 text-red-400";

      default:
        return "bg-red-500/10 text-red-400";
    }
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-8 py-10">

      {/* Heading */}
      <section>
        <h2 className="text-3xl font-bold">
          Gesture Control Center
        </h2>

        <p className="mt-2 text-slate-400">
          Control your browser using natural hand gestures.
        </p>
      </section>

      {/* Dashboard Grid */}
      <section className="grid gap-6 lg:grid-cols-3">

        {/* Camera Preview */}
        <div className="rounded-2xl border border-white/10 bg-slate-900 p-6 lg:col-span-2">

          <div className="mb-5 flex items-center justify-between">

            <div className="flex items-center gap-2">
              <Camera className="text-indigo-400" />

              <h3 className="font-semibold">
                Camera Preview
              </h3>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs ${getCameraStatusColor()}`}
            >
              {getCameraStatusText()}
            </span>

          </div>

          {/* Live Camera Preview */}
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-slate-950">

            {cameraPreview ? (
              <img
                src={cameraPreview}
                alt="Live GestureX webcam preview"
                className="h-full w-full object-contain"
                style={{
                  transform: "scaleX(-1)"
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center">

                <Camera
                  size={48}
                  className={`mb-4 ${
                    isActive
                      ? "text-green-400"
                      : "text-slate-600"
                  }`}
                />

                <p className="font-medium text-slate-300">
                  {cameraStatus === "STARTING"
                    ? "Starting camera..."
                    : cameraStatus === "ERROR"
                      ? "Camera unavailable"
                      : "Camera not started"}
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {cameraStatus === "STARTING"
                    ? "Initializing webcam and hand detection."
                    : "Start detection to activate your webcam."}
                </p>

              </div>
            )}

            {/* Live indicator */}
            {cameraPreview && (
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5">

                <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />

                <span className="text-xs font-medium text-white">
                  LIVE
                </span>

              </div>
            )}

            {/* Hand status */}
            {cameraPreview && (
              <div className="absolute bottom-4 right-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2">

                <p className="text-xs text-slate-300">
                  {handDetected
                    ? `${handCount} hand detected`
                    : "No hand detected"}
                </p>

              </div>
            )}

          </div>

          {/* Camera Error */}
          {cameraError && (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">
                {cameraError}
              </p>
            </div>
          )}

          {/* Start / Stop Button */}
          <button
            onClick={toggleCamera}
            disabled={
              isLoading ||
              cameraStatus === "STARTING"
            }
            className={`mt-5 w-full rounded-xl py-3 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isActive
                ? "bg-red-600 hover:bg-red-500"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {isLoading
              ? "Please wait..."
              : isActive
                ? "Stop Detection"
                : "Start Detection"}
          </button>

        </div>

        {/* Right Side */}
        <div className="space-y-6">

          {/* Detection Status */}
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-5 flex items-center gap-2">
              <Activity className="text-indigo-400" />

              <h3 className="font-semibold">
                Detection Status
              </h3>
            </div>

            <div className="space-y-5">

              {/* Hand Detected */}
              <div>
                <p className="text-sm text-slate-400">
                  Hand Detected
                </p>

                <p
                  className={`mt-1 font-semibold ${
                    handDetected
                      ? "text-green-400"
                      : "text-slate-300"
                  }`}
                >
                  {handDetected ? "Yes" : "No"}
                </p>
              </div>

              {/* Hand Count */}
              <div>
                <p className="text-sm text-slate-400">
                  Hands Detected
                </p>

                <p className="mt-1 font-semibold text-slate-300">
                  {handCount}
                </p>
              </div>

              {/* Active Gesture */}
              <div>
                <p className="text-sm text-slate-400">
                  Active Gesture
                </p>

                <p className="mt-1 font-semibold text-indigo-400">
                  {activeGesture}
                </p>
              </div>

              {/* Current Mode */}
              <div>
                <p className="text-sm text-slate-400">
                  Current Mode
                </p>

                <p
                  className={`mt-1 font-semibold ${
                    isPaused
                      ? "text-yellow-400"
                      : isActive
                        ? "text-green-400"
                        : "text-slate-300"
                  }`}
                >
                  {isPaused
                    ? "Gesture Detection Paused"
                    : isActive
                      ? "Detection Active"
                      : "Inactive"}
                </p>
              </div>

            </div>

          </div>

          {/* Browser Controls */}
          <div className="rounded-2xl border border-white/10 bg-slate-900 p-6">

            <div className="mb-4 flex items-center gap-2">
              <MousePointer2 className="text-indigo-400" />

              <h3 className="font-semibold">
                Browser Controls
              </h3>
            </div>

            <div className="space-y-4 text-sm text-slate-400">

              <p className="flex items-center gap-3">
                <MousePointer2 size={17} />
                Virtual Cursor
              </p>

              <p className="flex items-center gap-3">
                <ScrollText size={17} />
                Gesture Scrolling
              </p>

              <p className="flex items-center gap-3">
                <Plus size={17} />
                New Tab
              </p>

              <p className="flex items-center gap-3">
                <Keyboard size={17} />
                Virtual Keyboard
              </p>

              <p className="flex items-center gap-3">
                <Hand size={17} />
                Hand Gesture Recognition
              </p>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
};

export default Dashboard;
