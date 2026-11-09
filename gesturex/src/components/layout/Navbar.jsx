
import { Hand, Circle } from "lucide-react";

const Navbar = ({ isActive = false }) => {
  return (
    <nav className="flex items-center justify-between border-b border-white/10 px-8 py-5">

      <div className="flex items-center gap-3">

        <div className="rounded-xl bg-indigo-500 p-2">
          <Hand size={24} />
        </div>

        <div>
          <h1 className="text-xl font-bold tracking-wide">
            GestureX
          </h1>

          <p className="text-xs text-slate-400">
            Gesture-powered browser control
          </p>
        </div>

      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2">

        <Circle
          size={9}
          fill="currentColor"
          className={isActive ? "text-green-400" : "text-red-400"}
        />

        <span className="text-sm text-slate-300">
          {isActive ? "Detection Active" : "Detection Offline"}
        </span>

      </div>

    </nav>
  );
};

export default Navbar;
