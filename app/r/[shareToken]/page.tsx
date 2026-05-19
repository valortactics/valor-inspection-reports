import Image from "next/image";
import { reportKeyItems } from "../../../lib/report-key";
import { formatSectionName } from "../../../lib/report-sections";
import { supabase } from "../../../lib/supabase";
import PdfExportButton from "./PdfExportButton";
import ReportFindingsFilter from "./ReportFindingsFilter";

const certifications = [
  {
    src: "/brand/internachi-cpi-logo.png",
    alt: "InterNACHI Certified Professional Inspector",
  },
  {
    src: "/brand/roof-inspector.png",
    alt: "InterNACHI Certified Roof Inspector",
  },
  {
    src: "/brand/plumbing-inspector.png",
    alt: "InterNACHI Certified Plumbing Inspector",
  },
  {
    src: "/brand/moisture-inspector.png",
    alt: "InterNACHI Certified Moisture Intrusion Inspector",
  },
  {
    src: "/brand/nrpp-badge.png",
    alt: "NRPP Certified Radon Measurement Professional",
  },
];

type PageProps = {
  params: Promise<{ shareToken: string }>;
};

function formatInspectionDate(inspectionDate?: string | null) {
  if (!inspectionDate) {
    return "";
  }

  const [year, month, day] = inspectionDate.split("-").map(Number);

  if (!year || !month || !day) {
    return inspectionDate;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export default async function PublicReportPage({ params }: PageProps) {
  const { shareToken } = await params;

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("share_token", shareToken)
    .eq("status", "published")
    .single();

  if (!report) {
    return (
      <main className="min-h-screen bg-[#f7f4ec] p-10 text-[#252b2e]">
        <h1 className="font-serif text-4xl">Report Not Available</h1>
        <p className="mt-4">This report is not published or the link is invalid.</p>
      </main>
    );
  }

  const { data: sections } = await supabase
    .from("sections")
    .select("*")
    .eq("report_id", report.id)
    .order("sort_order");

  const reportSections = sections || [];
  const sectionNavigationItems = reportSections.map((section, index) => ({
    id: `report-section-${index + 1}`,
    label: formatSectionName(section.name),
    section,
  }));

  const sectionIds = reportSections.map((s) => s.id);

  const { data: findings } = await supabase
    .from("findings")
    .select("*")
    .in("section_id", sectionIds.length ? sectionIds : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order");

  const findingIds = (findings || []).map((f) => f.id);

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .in("finding_id", findingIds.length ? findingIds : ["00000000-0000-0000-0000-000000000000"])
    .order("sort_order");

  return (
    <main className="client-report-page min-h-screen bg-[#f7f4ec] text-[#252b2e]">
      <header className="client-report-header bg-[#252b2e] px-6 py-8 text-[#f7f4ec]">
        <div className="mx-auto max-w-5xl text-center">
          <Image
            src="/brand/valor-logo-tagline-card.jpg"
            alt="Valor Home Inspections"
            width={1280}
            height={960}
            preload
            className="mx-auto w-full max-w-3xl rounded-2xl object-contain shadow-xl"
          />

          <div className="mt-8">
            <p className="text-sm tracking-[0.3em] text-[#d8c995]">
              INSPECTION REPORT
            </p>
            <h1 className="mt-4 font-serif text-4xl md:text-5xl">
              {report.title}
            </h1>
            <p className="mt-3 text-[#d8c995]">{report.property_address}</p>
            <p className="mt-1 text-sm">Client: {report.client_name}</p>
            {report.inspection_date && (
              <p className="mt-1 text-sm">
                Inspection Date: {formatInspectionDate(report.inspection_date)}
              </p>
            )}
            {report.inspector_name && (
              <p className="mt-1 text-sm">Inspector: {report.inspector_name}</p>
            )}
          </div>
        </div>
      </header>

      <nav
        aria-label="Report tools and sections"
        className="no-print sticky top-0 z-20 border-b border-[#d8c995]/50 bg-[#f7f4ec]/95 px-6 py-4 shadow-sm backdrop-blur"
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Back to top of report"
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#b9a16a]/70 bg-[#b9a16a]"
              >
                <Image
                  src="/brand/valor-icon-only.png"
                  alt="Valor Home Inspections"
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </a>

              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d6b3d]">
                Report
              </span>
            </div>

            <PdfExportButton />
          </div>

          {sectionNavigationItems.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto lg:flex-1">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-[#7d6b3d]">
                Sections
              </span>

              <div className="flex min-w-max gap-2">
                <a
                  href="#report-key"
                  className="rounded-full border border-[#b9a16a]/70 bg-white px-4 py-2 text-sm font-semibold text-[#252b2e] shadow-sm transition hover:border-[#252b2e] hover:bg-[#252b2e] hover:text-[#f7f4ec] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
                >
                  Report Key
                </a>

                {sectionNavigationItems.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="rounded-full border border-[#b9a16a]/70 bg-white px-4 py-2 text-sm font-semibold text-[#252b2e] shadow-sm transition hover:border-[#252b2e] hover:bg-[#252b2e] hover:text-[#f7f4ec] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="client-report-card mb-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-center font-serif text-3xl">Certifications</h2>

          <div className="mt-6 grid grid-cols-2 items-center gap-5 sm:grid-cols-3 lg:grid-cols-5">
            {certifications.map((certification) => (
              <div
                key={certification.src}
                className="flex min-h-36 items-center justify-center rounded-2xl border border-black/10 bg-[#f7f4ec] p-4"
              >
                <Image
                  src={certification.src}
                  alt={certification.alt}
                  width={220}
                  height={220}
                  className="max-h-32 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </section>

        {report.home_photo_url && (
          <section className="client-report-card mb-8 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-center font-serif text-3xl">Property Photo</h2>

            <a href={report.home_photo_url} target="_blank" rel="noreferrer">
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-[#f7f4ec] shadow-sm">
                <Image
                  src={report.home_photo_url}
                  alt={`Large photo of ${
                    report.property_address || "the inspected home"
                  }`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-cover"
                />
              </div>
            </a>
          </section>
        )}

        {report.gis_map_url && (
          <section className="client-report-card mb-8 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-center font-serif text-3xl">GIS Map</h2>

            <a href={report.gis_map_url} target="_blank" rel="noreferrer">
              <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-2xl bg-[#f7f4ec] shadow-sm">
                <Image
                  src={report.gis_map_url}
                  alt={`GIS map for ${
                    report.property_address || "the inspected property"
                  }`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 896px, 100vw"
                  className="object-cover"
                />
              </div>
            </a>
          </section>
        )}

        <section
          id="report-key"
          className="client-report-card mb-8 scroll-mt-28 rounded-3xl bg-white p-6 shadow-sm"
        >
          <h2 className="font-serif text-3xl">Report Key</h2>

          <dl className="mt-5 grid gap-4">
            {reportKeyItems.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[#b9a16a]/50 bg-[#f7f4ec] p-5"
              >
                <dt className="text-lg font-semibold text-[#252b2e]">
                  {item.label}
                </dt>
                <dd className="mt-2 leading-7 text-[#394146]">
                  {item.description}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {report.summary_text && (
          <section className="client-report-card mb-8 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-serif text-3xl">Inspection Summary</h2>
            <p className="mt-4 whitespace-pre-wrap leading-8 text-[#394146]">
              {report.summary_text}
            </p>
          </section>
        )}

        <ReportFindingsFilter
          sectionNavigationItems={sectionNavigationItems}
          findings={findings || []}
          photos={photos || []}
        />
      </div>
    </main>
  );
}
