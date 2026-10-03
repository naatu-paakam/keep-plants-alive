import { useNavigate } from "react-router-dom";
import { Droplets, ShieldCheck, Activity } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <span className="font-bold text-green-700 text-lg">Keep Your Plants Alive</span>
        <a href="#" className="text-sm text-green-600 hover:underline">Shop All</a>
      </nav>

      {/* Hero */}
      <main className="max-w-4xl mx-auto px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
          AI-powered plant diagnosis
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-4">
          Keep Your Plants Alive
        </h1>

        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Upload a photo — get an instant health diagnosis and the right tools to fix it.
        </p>

        <button
          onClick={() => navigate("/diagnose")}
          className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-lg transition-colors"
        >
          Diagnose My Plant
          <span aria-hidden>→</span>
        </button>

        <p className="text-sm text-gray-400 mt-4">No account needed · Free to try</p>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-3 gap-6 mt-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left">
            <Droplets className="w-8 h-8 text-blue-400 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">Watering</h2>
            <p className="text-sm text-gray-500">
              Learn exactly when and how much to water to prevent root rot or drought stress.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left">
            <ShieldCheck className="w-8 h-8 text-green-400 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">Protection</h2>
            <p className="text-sm text-gray-500">
              Get product recommendations matched to your plant's exact issue.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-left">
            <Activity className="w-8 h-8 text-purple-400 mb-3" />
            <h2 className="font-semibold text-gray-900 mb-1">Monitoring</h2>
            <p className="text-sm text-gray-500">
              Track health scores over time and catch problems before they get worse.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
