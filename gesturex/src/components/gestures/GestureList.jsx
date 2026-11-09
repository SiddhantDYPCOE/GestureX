
const gestures = [
  {
    emoji: "☝️",
    gesture: "Index Finger",
    action: "Move Cursor"
  },
  {
    emoji: "🤏",
    gesture: "Pinch",
    action: "Left Click"
  },
  {
    emoji: "✌️",
    gesture: "Two Fingers",
    action: "Scroll"
  },
  {
    emoji: "✊",
    gesture: "Closed Fist",
    action: "Open New Tab"
  },
  {
    emoji: "🤙",
    gesture: "Thumb + Pinky",
    action: "Pause Detection"
  },
  {
    emoji: "🖐️",
    gesture: "Open Palm",
    action: "Resume Detection"
  },
  {
    emoji: "🤟",
    gesture: "Three Fingers",
    action: "Virtual Keyboard"
  }
];

const GestureList = () => {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900 p-6">

      <h3 className="mb-6 text-lg font-semibold">
        Configured Gestures
      </h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {gestures.map((item) => (

          <div
            key={item.gesture}
            className="rounded-xl border border-white/5 bg-slate-950 p-4"
          >

            <div className="mb-3 text-3xl">
              {/* {item.emoji} */}
            </div>

            <p className="font-medium">
              {item.gesture}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {item.action}
            </p>

          </div>

        ))}

      </div>

    </section>
  );
};

export default GestureList;
