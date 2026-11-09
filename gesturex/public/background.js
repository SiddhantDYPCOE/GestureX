
// GestureX - Background Service Worker

let creatingOffscreenDocument = null;

// Default settings
chrome.runtime.onInstalled.addListener(async () => {
  console.log("GestureX installed successfully");

  const settings = await chrome.storage.local.get(
    "gestureXSettings"
  );

  if (!settings.gestureXSettings) {
    await chrome.storage.local.set({
      gestureXSettings: {
        enabled: false,
        cameraEnabled: false,
        cursorSensitivity: 1,
        scrollSensitivity: 1,

        activeGestures: {
          cursor: true,
          pinchClick: true,
          rightClick: true,
          pauseResume: true,
          scroll: true,
          newTab: true,
          virtualKeyboard: true
        }
      }
    });
  }
});

// Check whether offscreen document exists
const isOffscreenDocumentCreated = async () => {
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");

  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });

  return contexts.length > 0;
};

// Create offscreen document
const createOffscreenDocument = async () => {
  if (await isOffscreenDocumentCreated()) {
    return;
  }

  if (creatingOffscreenDocument) {
    await creatingOffscreenDocument;
    return;
  }

  creatingOffscreenDocument = chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification:
      "Maintain one webcam session for hand gesture detection."
  });

  try {
    await creatingOffscreenDocument;

    console.log("GestureX offscreen document created");
  } finally {
    creatingOffscreenDocument = null;
  }
};

// Send camera commands
const sendCameraCommand = async (type) => {
  try {
    if (type === "GESTUREX_CAMERA_START") {
      await createOffscreenDocument();
    }

    if (!(await isOffscreenDocumentCreated())) {
      return {
        success: true,
        message: "Camera is already stopped"
      };
    }

    const response = await chrome.runtime.sendMessage({
      type,
      target: "offscreen"
    });

    return response || {
      success: false,
      message: "Camera engine did not respond"
    };

  } catch (error) {
    console.error("GestureX camera command failed:", error);

    return {
      success: false,
      message: error.message
    };
  }
};

// Get active browser tab
const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  return tabs[0] || null;
};

// Forward message to active webpage
const sendToActiveTab = async (message) => {
  try {
    const tab = await getActiveTab();

    if (!tab?.id) return;

    await chrome.tabs.sendMessage(tab.id, message);

  } catch (error) {
    console.debug(
      "GestureX could not reach the active tab:",
      error.message
    );
  }
};

// Handle recognized gesture actions
const handleGestureAction = async (message) => {
  switch (message.action) {
    case "LEFT_CLICK":
      await sendToActiveTab({
        type: "GESTUREX_LEFT_CLICK"
      });
      break;

    case "RIGHT_CLICK":
      await sendToActiveTab({
        type: "GESTUREX_RIGHT_CLICK"
      });
      break;

    case "OPEN_NEW_TAB":
      await chrome.tabs.create({});
      break;

    case "VIRTUAL_KEYBOARD":
      await sendToActiveTab({
        type: "GESTUREX_KEYBOARD_TOGGLE"
      });
      break;

    default:
      console.log(
        "GestureX: Unknown gesture action:",
        message.action
      );
      break;
  }
};

// Open dashboard when extension icon is clicked
chrome.action.onClicked.addListener(async () => {
  const dashboardUrl = chrome.runtime.getURL("index.html");

  const tabs = await chrome.tabs.query({
    url: dashboardUrl
  });

  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, {
      active: true
    });

    await chrome.windows.update(tabs[0].windowId, {
      focused: true
    });

  } else {
    await chrome.tabs.create({
      url: dashboardUrl
    });
  }
});

// Listen for messages
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {

    // Ignore messages intended for offscreen document
    if (message.target === "offscreen") {
      return;
    }

    // Start camera
    if (message.type === "GESTUREX_CAMERA_START") {
      sendCameraCommand("GESTUREX_CAMERA_START")
        .then(sendResponse);

      return true;
    }

    // Stop camera
    if (message.type === "GESTUREX_CAMERA_STOP") {
      sendCameraCommand("GESTUREX_CAMERA_STOP")
        .then(sendResponse);

      return true;
    }

    // Camera status
    if (message.type === "GESTUREX_CAMERA_STATUS") {
      console.log(
        "GestureX camera:",
        message.status,
        message.message || ""
      );

      return;
    }

    // Hand status
    if (message.type === "GESTUREX_HAND_STATUS") {
      console.log(
        "GestureX hand detected:",
        message.detected,
        "Count:",
        message.handCount
      );

      return;
    }

    // Gesture status and action label
    if (message.type === "GESTUREX_GESTURE_STATUS") {
      console.log(
        "GestureX gesture:",
        message.gesture,
        "Action:",
        message.action,
        "Paused:",
        message.paused
      );

      const action = message.paused
        ? "PAUSE_DETECTION"
        : message.action;

      sendToActiveTab({
        type: "GESTUREX_ACTION_LABEL",
        action
      });

      return;
    }

    // Cursor movement
    if (message.type === "GESTUREX_CURSOR_MOVE") {
      sendToActiveTab(message);
      return;
    }

    // Hide cursor
    if (message.type === "GESTUREX_CURSOR_HIDE") {
      sendToActiveTab(message);
      return;
    }

    if (message.type === "GESTUREX_SCROLL_UPDATE") {
  console.log("GestureX scroll coordinates received:", message.y);

  sendToActiveTab(message);
  return;
}
    // Reset scrolling
    if (message.type === "GESTUREX_SCROLL_RESET") {
      sendToActiveTab(message);
      return;
    }

    // Execute gesture action
    if (message.type === "GESTUREX_GESTURE_ACTION") {
      handleGestureAction(message);
      return;
    }

    // Test background service
    if (message.type === "GESTUREX_PING") {
      sendResponse({
        success: true,
        message: "GestureX background service is running"
      });
    }
  }
);

console.log("GestureX background service worker loaded");
