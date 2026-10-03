import { Camera } from "lucide-react";
import type { DiagnosisResponse } from "../types/diagnosis";
import ProductCard, { mapToolsToProducts } from "./ProductCard";

interface DiagnosisResultProps {
  result: DiagnosisResponse;
}

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-600";
  if (score >= 5) return "text-yellow-600";
  return "text-red-600";
}

function scoreBg(score: number): string {
  if (score >= 8) return "bg-green-100 border-green-300";
  if (score >= 5) return "bg-yellow-100 border-yellow-300";
  return "bg-red-100 border-red-300";
}

function urgencyBadge(urgency: string) {
  const map: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-yellow-100 text-yellow-700",
    high: "bg-red-100 text-red-700",
  };
  return map[urgency] ?? "bg-gray-100 text-gray-700";
}

const NOT_A_PLANT_TERMS = [
  "not a plant", "logo", "illustration", "artwork", "cartoon",
  "not an actual plant", "not a photograph", "graphic", "drawing",
  "brand", "image shows a brand", "not plant material",
];

function detectScenario(result: DiagnosisResponse): "not-a-plant" | "healthy" | "issues-no-match" {
  const haystack = `${result.status} ${result.likely_cause}`.toLowerCase();
  if (NOT_A_PLANT_TERMS.some((t) => haystack.includes(t))) return "not-a-plant";
  if (result.issues.length === 0 && result.health_score >= 8) return "healthy";
  return "issues-no-match";
}

export default function DiagnosisResult({ result }: DiagnosisResultProps) {
  const products = mapToolsToProducts(result.recommended_tools);
  const scenario = products.length === 0 ? detectScenario(result) : null;

  return (
    <div className="w-full space-y-4">
      {/* Score + Status */}
      <div className={`rounded-xl border p-4 ${scoreBg(result.health_score)}`}>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className={`text-4xl font-bold ${scoreColor(result.health_score)}`}>
              {result.health_score}
            </span>
            <span className="text-gray-500 text-sm">/10</span>
            <p className="text-xs text-gray-500 mt-0.5">Health Score</p>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-base">{result.status}</p>
            <span
              className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${urgencyBadge(result.urgency)}`}
            >
              {result.urgency.charAt(0).toUpperCase() + result.urgency.slice(1)} urgency
            </span>
          </div>
        </div>
      </div>

      {/* Likely Cause */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-1">Likely Cause</h3>
        <p className="text-sm text-gray-800">{result.likely_cause}</p>
      </div>

      {/* Issues */}
      {result.issues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Issues Detected</h3>
          <ul className="space-y-1">
            {result.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                <span className="mt-0.5 w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  !
                </span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Product Recommendations */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recommended Tools</h3>

        {products.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((p) => (
              <ProductCard key={p.skuId} product={p} />
            ))}
          </div>
        )}

        {scenario === "not-a-plant" && (
          <div className="bg-amber-50 rounded-xl border border-amber-300 p-4 flex gap-3 items-start text-sm text-amber-900">
            <Camera className="w-5 h-5 mt-0.5 flex-shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold mb-0.5">No plant detected in this photo</p>
              <p className="text-amber-800">
                Please upload a clear photo of a real plant — leaf, stem, or soil — so we
                can give you an accurate diagnosis.
              </p>
            </div>
          </div>
        )}

        {scenario === "healthy" && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-sm text-green-800">
            Your plant looks great! Browse our{" "}
            <a href="#" className="underline font-medium">full collection</a>{" "}
            to keep it that way.
          </div>
        )}

        {scenario === "issues-no-match" && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-sm text-blue-900">
            <p className="font-semibold mb-0.5">We spotted some issues</p>
            <p>
              We don't have a specific product match yet — browse our{" "}
              <a href="#" className="underline font-medium">full collection</a>{" "}
              or consult a local nursery for severe cases.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
