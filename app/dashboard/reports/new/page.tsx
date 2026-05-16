"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultReportSections,
  renumberReportSections,
} from "../../../../lib/report-sections";
import { supabase } from "../../../../lib/supabase";

export default function NewReportPage() {
  const router = useRouter();

  const [title, setTitle] = useState("New Home Inspection Report");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [clientName, setClientName] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [sections, setSections] = useState([...defaultReportSections]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function updateSection(index: number, value: string) {
    const updated = [...sections];
    updated[index] = value;
    setSections(updated);
  }

  function addSection() {
    setSections(
      renumberReportSections([...sections, `${sections.length + 1}. New Section`])
    );
  }

  function removeSection(index: number) {
    setSections(renumberReportSections(sections.filter((_, i) => i !== index)));
  }

  async function createReport() {
    setLoading(true);
    setMessage("Creating report...");
    const renumberedSections = renumberReportSections(sections);

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .insert({
        title,
        property_address: propertyAddress,
        client_name: clientName,
        inspection_date: inspectionDate || null,
        status: "draft",
      })
      .select()
      .single();

    if (reportError) {
      console.error("Report error:", reportError);
      setMessage(`Report error: ${reportError.message}`);
      setLoading(false);
      return;
    }

    if (!report) {
      setMessage("Report was not created. Supabase returned no report.");
      setLoading(false);
      return;
    }

    const sectionRows = renumberedSections.map((name, index) => ({
      report_id: report.id,
      name,
      sort_order: index,
    }));

    const { error: sectionError } = await supabase
      .from("sections")
      .insert(sectionRows);

    if (sectionError) {
      console.error("Section error:", sectionError);
      setMessage(`Section error: ${sectionError.message}`);
      setLoading(false);
      return;
    }

    setMessage("Report created successfully.");
    router.push(`/dashboard/reports/${report.id}/edit`);
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#252b2e]">
      <div className="mx-auto max-w-4xl">
        <a href="/dashboard" className="text-sm underline">
          Back to Dashboard
        </a>

        <h1 className="mt-6 font-serif text-5xl">Create Report</h1>

        {message && (
          <div className="mt-6 rounded-xl border border-black/10 bg-white p-4 text-sm">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-4 rounded-3xl bg-white p-6 shadow-sm">
          <input
            className="rounded-xl border p-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Report Title"
          />

          <input
            className="rounded-xl border p-3"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            placeholder="Property Address"
          />

          <input
            className="rounded-xl border p-3"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client Name"
          />

          <input
            className="rounded-xl border p-3"
            type="date"
            value={inspectionDate}
            onChange={(e) => setInspectionDate(e.target.value)}
          />
        </div>

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">Report Sections</h2>

          <div className="mt-4 grid gap-3">
            {sections.map((section, index) => (
              <div key={index} className="flex gap-3">
                <input
                  className="flex-1 rounded-xl border p-3"
                  value={section}
                  onChange={(e) => updateSection(index, e.target.value)}
                />

                <button
                  type="button"
                  onClick={() => removeSection(index)}
                  className="rounded-xl border px-4 text-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addSection}
            className="mt-4 rounded-full border border-[#b9a16a] px-5 py-2 font-semibold"
          >
            Add Section
          </button>
        </section>

        <button
          type="button"
          onClick={createReport}
          disabled={loading}
          className="mt-8 rounded-full bg-[#252b2e] px-8 py-4 font-semibold text-[#f7f4ec] disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Report"}
        </button>
      </div>
    </main>
  );
}
