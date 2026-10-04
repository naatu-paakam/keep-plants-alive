import { useState, useEffect } from "react";
import { Loader2, ArrowLeft, MapPin, MapPinOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CameraUpload from "../components/CameraUpload";
import DiagnosisResult from "../components/DiagnosisResult";
import FeedbackWidget from "../components/FeedbackWidget";
import { analyzePlant } from "../services/plantDiagnosis";
import type { LocationContext } from "../services/plantDiagnosis";
import type { DiagnosisResponse } from "../types/diagnosis";

type LocationState = "pending" | "granted" | "denied" | "unavailable";

export default function Diagnose() {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noFileError, setNoFileError] = useState(false);
  const [location, setLocation] = useState<LocationContext | null>(null);
  const [locationState, setLocationState] = useState<LocationState>("pending");

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationState("unavailable");
      return;
    }
    const timeout = setTimeout(() => setLocationState("unavailable"), 8000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timeout);
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationState("granted");
      },
      () => {
        clearTimeout(timeout);
        setLocationState("denied");
      },
      { timeout: 7000, maximumAge: 300_000 }
    );
    return () => clearTimeout(timeout);
  }, []);

  function handleImageSelected(file: File) {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    setNoFileError(false);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleAnalyze() {
    if (!selectedFile) {
      setNoFileError(true);
      return;
    }
    setNoFileError(false);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const diagnosis = await analyzePlant(selectedFile, location ?? undefined);
      setResult(diagnosis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Nav */}
      <nav className="flex items-center gap-3 px-6 py-4 max-w-2xl mx-auto">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-green-600 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Home
        </button>
      </nav>

      <main className="max-w-2xl mx-auto px-6 pb-20">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1">Plant Health Check</h1>
        <p className="text-gray-500 text-sm mb-3">
          Take a photo or upload an image of your plant to get an instant AI diagnosis.
        </p>

        {/* Location badge */}
        {locationState === "granted" && (
          <div data-testid="location-badge" className="mb-4 flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-3 py-1 w-fit">
            <MapPin className="w-3 h-3" />
            Using your location for weather-aware diagnosis
          </div>
        )}
        {(locationState === "denied" || locationState === "unavailable") && (
          <div data-testid="location-denied" className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 w-fit">
            <MapPinOff className="w-3 h-3" />
            No location — diagnosis without local weather context
          </div>
        )}

        {/* Upload zone */}
        <CameraUpload onImageSelected={handleImageSelected} selectedFile={selectedFile} />

        {noFileError && (
          <p className="mt-2 text-sm text-red-600">Please select or take a photo first.</p>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="mt-4 rounded-xl overflow-hidden border border-green-200 shadow-sm">
            <img
              src={previewUrl}
              alt="Selected plant"
              className="w-full max-h-72 object-cover"
            />
          </div>
        )}

        {/* Analyze button — hidden once result is showing */}
        {selectedFile && !result && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-bold text-base px-6 py-3.5 rounded-2xl shadow transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {locationState === "granted" ? "Fetching weather & analyzing..." : "Analyzing your plant..."}
              </>
            ) : (
              "Analyze Plant"
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6">
            <DiagnosisResult result={result} />
            <FeedbackWidget analysis={result} imageFile={selectedFile} />
            <button
              onClick={() => { setResult(null); setSelectedFile(null); setPreviewUrl(null); }}
              className="mt-4 w-full text-sm text-green-700 hover:underline"
            >
              ↩ Try another photo
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
