
import Navbar from "./components/layout/Navbar";
import Dashboard from "./components/layout/Dashboard";
import GestureList from "./components/gestures/GestureList";

function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">

      <Navbar />

      <Dashboard />

      <div className="mx-auto max-w-7xl px-8 pb-10">
        <GestureList />
      </div>

    </div>
  );
}

export default App;
