export interface DiagnosisResponse {
  health_score: number;
  status: string;
  issues: string[];
  likely_cause: string;
  home_remedies: string[];
  recommended_tools: string[];
  urgency: "low" | "medium" | "high";
}
