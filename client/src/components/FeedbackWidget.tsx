import { useState } from "react";
import { MessageSquare, Send, CheckCircle, X } from "lucide-react";
import type { DiagnosisResponse } from "../types/diagnosis";

interface FeedbackWidgetProps {
  analysis: DiagnosisResponse;
  imageFile: File | null;
}

type Status = "idle" | "open" | "sending" | "sent" | "error";

export default function FeedbackWidget({ analysis, imageFile }: FeedbackWidgetProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");

  async function handleSubmit() {
    setStatus("sending");

    let imageBase64: string | null = null;
    let imageType: string | null = null;

    if (imageFile) {
      imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          resolve(dataUrl.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
      imageType = imageFile.type || "image/jpeg";
    }

    try {
      const res = await fetch("/.netlify/functions/send-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feedback: text.trim(),
          analysis,
          imageBase64,
          imageName: imageFile?.name ?? null,
          imageType,
        }),
      });

      if (!res.ok) {
        throw new Error("Send failed");
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "idle") {
    return (
      <button
        onClick={() => setStatus("open")}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-600 transition-colors mt-2"
        title="Send feedback"
      >
        <MessageSquare className="w-4 h-4" />
        Was this diagnosis helpful?
      </button>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 mt-2">
        <CheckCircle className="w-4 h-4" />
        Thank you — feedback sent!
      </div>
    );
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4 text-green-500" />
          Send feedback
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Close feedback"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Was the diagnosis accurate? Any corrections or suggestions? Your photo and analysis will be included.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="e.g. The plant was actually overwatered, not underwatered…"
        rows={3}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-green-300"
      />

      {status === "error" && (
        <p className="text-xs text-red-600 mt-1">Failed to send — please try again.</p>
      )}

      <button
        onClick={handleSubmit}
        disabled={status === "sending"}
        className="mt-3 flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
      >
        <Send className="w-3.5 h-3.5" />
        {status === "sending" ? "Sending…" : "Send Feedback"}
      </button>
    </div>
  );
}
