"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

type AiSummaryProps = {
  shareToken: string;
};

type SummaryResponse = {
  summary?: string;
  error?: string;
};

export default function AiSummary({ shareToken }: AiSummaryProps) {
  const [summary, setSummary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateSummary() {
    setLoading(true);
    setError("");

    const response = await fetch(`/api/reports/${shareToken}/ai-summary`, {
      method: "POST",
    });
    const data = (await response.json()) as SummaryResponse;

    if (!response.ok || !data.summary) {
      setError(data.error || "Unable to generate the AI summary.");
      setLoading(false);
      return;
    }

    setSummary(data.summary);
    setLoading(false);
  }

  return (
    <section className="client-report-card mb-8 rounded-3xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-3xl">
            <Sparkles aria-hidden="true" size={24} />
            AI Report Summary
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#394146]">
            AI-generated from this published report. Review the full report for
            complete details.
          </p>
        </div>

        <button
          type="button"
          onClick={generateSummary}
          disabled={loading}
          className="inline-flex w-fit shrink-0 items-center justify-center gap-2 rounded-full bg-[#252b2e] px-5 py-3 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 aria-hidden="true" size={18} className="animate-spin" />}
          {summary ? "Regenerate Summary" : "Generate Summary"}
        </button>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-5 whitespace-pre-wrap rounded-2xl bg-[#f7f4ec] p-5 leading-8 text-[#394146]">
          {summary}
        </div>
      )}
    </section>
  );
}
