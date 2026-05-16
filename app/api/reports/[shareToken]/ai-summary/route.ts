import { NextResponse } from "next/server";
import { supabase } from "../../../../../lib/supabase";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const TEXT_BOX_TITLE = "Text Box";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const REPORT_INPUT_LIMIT = 18000;

type RouteContext = {
  params: Promise<{ shareToken: string }>;
};

type ReportRow = {
  id: string;
  title: string | null;
  property_address: string | null;
  client_name: string | null;
  inspection_date: string | null;
  summary_text: string | null;
};

type SectionRow = {
  id: string;
  name: string;
  sort_order: number;
};

type FindingRow = {
  id: string;
  section_id: string;
  title: string | null;
  description: string | null;
  severity: string | null;
  sort_order: number;
};

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function buildReportInput(
  report: ReportRow,
  sections: SectionRow[],
  findings: FindingRow[]
) {
  const reportLines = [
    `Report title: ${report.title || "Untitled inspection report"}`,
    `Property: ${report.property_address || "Not provided"}`,
    `Client: ${report.client_name || "Not provided"}`,
    `Inspection date: ${report.inspection_date || "Not provided"}`,
    report.summary_text
      ? `Inspector summary: ${report.summary_text}`
      : "Inspector summary: Not provided",
  ];

  const sectionLines = sections.map((section) => {
    const sectionFindings = findings
      .filter((finding) => finding.section_id === section.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (sectionFindings.length === 0) {
      return `\nSection: ${section.name}\nNo findings entered.`;
    }

    const findingLines = sectionFindings.map((finding) => {
      const label =
        finding.title === TEXT_BOX_TITLE ? "Narrative note" : finding.title;

      return [
        `- ${label || "Finding"}`,
        finding.severity ? `  Severity: ${finding.severity}` : "",
        finding.description ? `  Details: ${finding.description}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    });

    return `\nSection: ${section.name}\n${findingLines.join("\n")}`;
  });

  return `${reportLines.join("\n")}\n${sectionLines.join("\n")}`.slice(
    0,
    REPORT_INPUT_LIMIT
  );
}

function extractResponseText(response: OpenAIResponse) {
  if (response.output_text) {
    return response.output_text.trim();
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

export async function POST(_request: Request, context: RouteContext) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "AI summary is not configured yet." },
      { status: 503 }
    );
  }

  const { shareToken } = await context.params;

  const { data: report } = await supabase
    .from("reports")
    .select(
      "id,title,property_address,client_name,inspection_date,summary_text"
    )
    .eq("share_token", shareToken)
    .eq("status", "published")
    .single<ReportRow>();

  if (!report) {
    return NextResponse.json(
      { error: "Report is not published or the link is invalid." },
      { status: 404 }
    );
  }

  const { data: sectionsData, error: sectionsError } = await supabase
    .from("sections")
    .select("id,name,sort_order")
    .eq("report_id", report.id)
    .order("sort_order");

  if (sectionsError) {
    return NextResponse.json({ error: sectionsError.message }, { status: 500 });
  }

  const sections = (sectionsData ?? []) as SectionRow[];
  const sectionIds = sections.map((section) => section.id);

  const { data: findingsData, error: findingsError } = await supabase
    .from("findings")
    .select("id,section_id,title,description,severity,sort_order")
    .in("section_id", sectionIds.length > 0 ? sectionIds : [EMPTY_UUID])
    .order("sort_order");

  if (findingsError) {
    return NextResponse.json({ error: findingsError.message }, { status: 500 });
  }

  const reportInput = buildReportInput(
    report,
    sections,
    (findingsData ?? []) as FindingRow[]
  );

  const aiResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4.1-mini",
      instructions:
        "Write a concise, client-facing home inspection report summary. Use only the report details provided. Do not invent defects, diagnoses, or guarantees. Put the most important safety or major concerns first. Avoid alarmist language and recommend that the client review the full report and consult qualified specialists when appropriate.",
      input: `Create a summary in 4 short bullets with these labels: Overall, Main Concerns, Maintenance Items, Next Steps.\n\n${reportInput}`,
      max_output_tokens: 650,
    }),
  });

  const responseBody = (await aiResponse.json()) as OpenAIResponse;

  if (!aiResponse.ok) {
    return NextResponse.json(
      { error: responseBody.error?.message || "AI summary failed." },
      { status: 502 }
    );
  }

  const summary = extractResponseText(responseBody);

  if (!summary) {
    return NextResponse.json(
      { error: "AI summary returned no text." },
      { status: 502 }
    );
  }

  return NextResponse.json({ summary });
}
