
// GestureX - Virtual Keyboard

(() => {
  let keyboardContainer = null;
  let keyboardVisible = false;
  let isShiftActive = false;

  const keyboardRows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["SHIFT", "z", "x", "c", "v", "b", "n", "m", "BACKSPACE"],
    ["SPACE", "ENTER"]
  ];

  // Get the currently focused webpage element
  const getActiveElement = () => {
    const active = document.activeElement;

    if (
      active instanceof HTMLInputElement ||
      active instanceof HTMLTextAreaElement ||
      active?.isContentEditable
    ) {
      return active;
    }

    return null;
  };

  // Insert text into the active webpage element
  const insertText = (text) => {
    const target = getActiveElement();

    if (!target) return;

    target.focus();

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;

      target.setRangeText(text, start, end, "end");

      target.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      return;
    }

    if (target.isContentEditable) {
      document.execCommand("insertText", false, text);
    }
  };

  // Handle backspace
  const handleBackspace = () => {
    const target = getActiveElement();

    if (!target) return;

    target.focus();

    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    ) {
      const start = target.selectionStart ?? target.value.length;
      const end = target.selectionEnd ?? target.value.length;

      if (start === end && start > 0) {
        target.setRangeText(
          "",
          start - 1,
          end,
          "end"
        );
      } else {
        target.setRangeText("", start, end, "end");
      }

      target.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      return;
    }

    if (target.isContentEditable) {
      document.execCommand("delete");
    }
  };

  // Dispatch keyboard events to the active element
  const dispatchKey = (key) => {
    const target = getActiveElement();

    if (!target) return;

    target.focus();

    target.dispatchEvent(
      new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true
      })
    );

    target.dispatchEvent(
      new KeyboardEvent("keyup", {
        key,
        bubbles: true,
        cancelable: true
      })
    );
  };

  // Handle virtual key presses
  const handleKeyPress = (key) => {
    if (key === "SHIFT") {
      isShiftActive = !isShiftActive;
      renderKeyboard();
      return;
    }

    if (key === "BACKSPACE") {
      handleBackspace();
      return;
    }

    if (key === "SPACE") {
      insertText(" ");
      return;
    }

    if (key === "ENTER") {
      const target = getActiveElement();

      if (
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        insertText("\n");
      } else {
        dispatchKey("Enter");
      }

      return;
    }

    const character = isShiftActive
      ? key.toUpperCase()
      : key.toLowerCase();

    insertText(character);

    if (isShiftActive) {
      isShiftActive = false;
      renderKeyboard();
    }
  };

  // Create keyboard layout
  const renderKeyboard = () => {
    if (!keyboardContainer) return;

    const shadow = keyboardContainer.shadowRoot;
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }

        .keyboard {
          font-family: Arial, sans-serif;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 16px;
          padding: 14px;
          box-shadow: 0 12px 40px rgba(0,0,0,.4);
          color: white;
          width: min(680px, calc(100vw - 32px));
          box-sizing: border-box;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          font-size: 13px;
          color: #cbd5e1;
        }

        .close {
          border: 0;
          border-radius: 7px;
          padding: 6px 10px;
          background: #334155;
          color: white;
          cursor: pointer;
        }

        .row {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: 6px;
        }

        button.key {
          flex: 1;
          min-width: 0;
          height: 43px;
          border: 1px solid #475569;
          border-radius: 7px;
          background: #1e293b;
          color: white;
          font-size: 15px;
          cursor: pointer;
          user-select: none;
        }

        button.key:active {
          background: #4f46e5;
        }

        button.key.special {
          background: #3730a3;
          font-size: 12px;
        }

        button.key.active {
          background: #4f46e5;
        }

        @media (max-width: 480px) {
          .keyboard {
            padding: 8px;
          }

          button.key {
            height: 36px;
            font-size: 12px;
          }
        }
      </style>

      <div class="keyboard">
        <div class="header">
          <strong>GestureX Keyboard</strong>
          <button class="close" id="close">Hide ✕</button>
        </div>

        <div id="keys"></div>
      </div>
    `;

    const keysContainer = shadow.getElementById("keys");

    keyboardRows.forEach((row) => {
      const rowElement = document.createElement("div");
      rowElement.className = "row";

      row.forEach((key) => {
        const button = document.createElement("button");
        button.className = "key";

        if (
          ["SHIFT", "BACKSPACE", "SPACE", "ENTER"].includes(key)
        ) {
          button.classList.add("special");
        }

        if (key === "SHIFT" && isShiftActive) {
          button.classList.add("active");
        }

        button.textContent =
          key === "BACKSPACE" ? "⌫" :
          key === "SPACE" ? "Space" :
          key === "ENTER" ? "Enter" :
          key === "SHIFT" ? "Shift" :
          isShiftActive ? key.toUpperCase() : key;

        button.addEventListener("click", () => {
          handleKeyPress(key);
        });

        rowElement.appendChild(button);
      });

      keysContainer.appendChild(rowElement);
    });

    shadow.getElementById("close").addEventListener(
      "click",
      hideKeyboard
    );
  };

  // Show keyboard
  const showKeyboard = () => {
    if (!keyboardContainer) {
      keyboardContainer = document.createElement("div");
      keyboardContainer.id = "gesturex-keyboard";

      Object.assign(keyboardContainer.style, {
        position: "fixed",
        left: "50%",
        bottom: "20px",
        transform: "translateX(-50%)",
        zIndex: "2147483647",
        display: "block"
      });

      keyboardContainer.attachShadow({ mode: "open" });

      document.documentElement.appendChild(keyboardContainer);
    }

    renderKeyboard();

    keyboardContainer.style.display = "block";
    keyboardVisible = true;
  };

  // Hide keyboard
  const hideKeyboard = () => {
    if (keyboardContainer) {
      keyboardContainer.style.display = "none";
    }

    keyboardVisible = false;
  };

  // Toggle keyboard visibility
  const toggleKeyboard = () => {
    if (keyboardVisible) {
      hideKeyboard();
    } else {
      showKeyboard();
    }
  };

  // Listen for virtual keyboard commands
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "GESTUREX_KEYBOARD_TOGGLE") {
      toggleKeyboard();
    }
  });

  console.log("GestureX virtual keyboard loaded");
})();
