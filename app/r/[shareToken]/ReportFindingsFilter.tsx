"use client";

import Image from "next/image";
import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { isVideoUrl } from "../../../lib/report-media";
import {
  formatFindingNumber,
  formatSectionName,
  getFindingSubsectionName,
  getSectionSubsections,
} from "../../../lib/report-sections";

const TEXT_BOX_TITLE = "Text Box";
const severityFilters = [
  "All",
  "Safety Defect",
  "Major Defect",
  "Minor Defect",
] as const;

type SeverityFilter = (typeof severityFilters)[number];

type ReportSection = {
  id: string;
  name: string;
  sort_order?: number | null;
};

type Finding = {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  severity: string;
  subsection_name?: string | null;
  sort_order?: number | null;
};

type ReportMedia = {
  id: string;
  finding_id: string;
  image_url: string;
  caption?: string | null;
  sort_order?: number | null;
};

type SectionNavigationItem = {
  id: string;
  label: string;
  section: ReportSection;
};

type ReportFindingsFilterProps = {
  sectionNavigationItems: SectionNavigationItem[];
  findings: Finding[];
  photos: ReportMedia[];
};

function isTextBoxFinding(finding: Finding) {
  return finding.title === TEXT_BOX_TITLE;
}

function renderPublicMedia(mediaItem: ReportMedia, altText: string) {
  if (isVideoUrl(mediaItem.image_url)) {
    return (
      <div
        key={mediaItem.id}
        className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm"
      >
        <div className="no-print">
          <video
            src={mediaItem.image_url}
            controls
            playsInline
            preload="metadata"
            className="aspect-square w-full bg-black object-contain"
          />

          <a
            href={mediaItem.image_url}
            target="_blank"
            rel="noreferrer"
            className="block p-2 text-xs text-[#394146] underline"
          >
            Open video in new tab
          </a>
        </div>

        <a
          href={mediaItem.image_url}
          target="_blank"
          rel="noreferrer"
          className="print-only p-4 text-sm font-semibold text-[#252b2e] underline"
        >
          View inspection video
        </a>
      </div>
    );
  }

  return (
    <a
      key={mediaItem.id}
      href={mediaItem.image_url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="relative aspect-square overflow-hidden rounded-xl">
        <Image
          src={mediaItem.image_url}
          alt={mediaItem.caption ?? altText}
          fill
          unoptimized
          sizes="(min-width: 768px) 33vw, 50vw"
          className="object-cover"
        />
      </div>
    </a>
  );
}

function matchesSearch(finding: Finding, sectionName: string, searchQuery: string) {
  if (!searchQuery) {
    return true;
  }

  const searchableText = [
    finding.title,
    finding.description ?? "",
    finding.severity,
    finding.subsection_name ?? "",
    sectionName,
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(searchQuery);
}

function sortFindings(firstFinding: Finding, secondFinding: Finding) {
  return (firstFinding.sort_order ?? 0) - (secondFinding.sort_order ?? 0);
}

function getFindingDisplayNumber(
  section: ReportSection,
  finding: Finding,
  sectionFindings: Finding[]
) {
  if (isTextBoxFinding(finding)) {
    return "";
  }

  const numberedFindings = sectionFindings.filter(
    (sectionFinding) => !isTextBoxFinding(sectionFinding)
  );
  const findingIndex = numberedFindings.findIndex(
    (sectionFinding) => sectionFinding.id === finding.id
  );

  return findingIndex === -1
    ? ""
    : formatFindingNumber(section.name, findingIndex);
}

function getFindingsForSubsection(
  section: ReportSection,
  sectionFindings: Finding[],
  subsectionName: string
) {
  return sectionFindings.filter((finding) => {
    return (
      getFindingSubsectionName(section.name, finding.subsection_name) ===
      subsectionName
    );
  });
}

function renderPublicFinding(
  section: ReportSection,
  finding: Finding,
  sectionFindings: Finding[],
  photos: ReportMedia[]
) {
  const findingMedia = photos.filter(
    (photo) => photo.finding_id === finding.id
  );

  if (isTextBoxFinding(finding)) {
    return (
      <article
        key={finding.id}
        className="rounded-2xl border border-[#b9a16a]/60 bg-white p-5"
      >
        <p className="whitespace-pre-wrap leading-8 text-[#394146]">
          {finding.description}
        </p>

        {findingMedia.length > 0 && (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
            {findingMedia.map((mediaItem) =>
              renderPublicMedia(mediaItem, "Text box media")
            )}
          </div>
        )}
      </article>
    );
  }

  const findingNumber = getFindingDisplayNumber(
    section,
    finding,
    sectionFindings
  );

  return (
    <article key={finding.id} className="rounded-2xl bg-[#f7f4ec] p-5">
      <div className="flex flex-wrap items-center gap-2">
        {findingNumber && (
          <span className="rounded-full bg-[#252b2e] px-3 py-1 text-xs font-semibold text-[#f7f4ec]">
            Finding {findingNumber}
          </span>
        )}

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#394146]">
          {finding.severity}
        </span>
      </div>

      <h3 className="mt-4 text-2xl font-semibold">{finding.title}</h3>

      <p className="mt-3 whitespace-pre-wrap leading-7 text-[#394146]">
        {finding.description}
      </p>

      {findingMedia.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          {findingMedia.map((mediaItem) =>
            renderPublicMedia(mediaItem, "Inspection media")
          )}
        </div>
      )}
    </article>
  );
}

export default function ReportFindingsFilter({
  sectionNavigationItems,
  findings,
  photos,
}: ReportFindingsFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleEntriesBySection = useMemo(() => {
    return sectionNavigationItems.map(({ id, section }) => {
      const sectionLabel = formatSectionName(section.name);
      const sectionFindings = findings.filter(
        (finding) => finding.section_id === section.id
      ).sort(sortFindings);
      const visibleFindings = sectionFindings.filter((finding) => {
        const isTextBox = isTextBoxFinding(finding);
        const severityMatches =
          severityFilter === "All" ||
          (!isTextBox && finding.severity === severityFilter);
        const searchMatches = matchesSearch(
          finding,
          sectionLabel,
          normalizedSearchQuery
        );

        return severityMatches && searchMatches;
      });

      return {
        id,
        section,
        sectionFindings,
        visibleFindings,
      };
    });
  }, [findings, normalizedSearchQuery, sectionNavigationItems, severityFilter]);

  const visibleEntryCount = visibleEntriesBySection.reduce(
    (total, section) => total + section.visibleFindings.length,
    0
  );
  const hasActiveFilter =
    severityFilter !== "All" || normalizedSearchQuery.length > 0;

  return (
    <>
      <section className="no-print mb-8 rounded-3xl border border-[#b9a16a]/50 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-2 lg:min-w-80">
            <label
              htmlFor="report-search"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d6b3d]"
            >
              Search Report
            </label>

            <div className="relative">
              <Search
                aria-hidden="true"
                size={18}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7d6b3d]"
              />
              <input
                id="report-search"
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search findings, notes, or sections"
                className="w-full rounded-full border border-[#b9a16a]/60 bg-[#f7f4ec] py-3 pl-11 pr-4 text-sm text-[#252b2e] outline-none transition focus:border-[#252b2e] focus:bg-white focus:ring-2 focus:ring-[#b9a16a]/40"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d6b3d]">
              Severity
            </span>

            <div className="flex flex-wrap gap-2">
              {severityFilters.map((severity) => {
                const isActive = severityFilter === severity;

                return (
                  <button
                    key={severity}
                    type="button"
                    onClick={() => setSeverityFilter(severity)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#b9a16a] ${
                      isActive
                        ? "border-[#252b2e] bg-[#252b2e] text-[#f7f4ec]"
                        : "border-[#b9a16a]/70 bg-white text-[#252b2e] hover:border-[#252b2e]"
                    }`}
                  >
                    {severity}
                  </button>
                );
              })}

              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSeverityFilter("All");
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <X aria-hidden="true" size={16} />
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-sm text-[#394146]">
          Showing {visibleEntryCount} matching{" "}
          {visibleEntryCount === 1 ? "entry" : "entries"}.
        </p>
      </section>

      <div className="grid gap-8">
        {visibleEntriesBySection.map(
          ({ id, section, sectionFindings, visibleFindings }) => {
            const subsections = getSectionSubsections(section.name);

            return (
              <section
                key={section.id}
                id={id}
                className="client-report-section scroll-mt-28 rounded-3xl bg-white p-6 shadow-sm"
              >
                <h2 className="font-serif text-3xl">
                  {formatSectionName(section.name)}
                </h2>

                {subsections.length > 0 ? (
                  <div className="mt-6 grid gap-6">
                    {subsections.map((subsection) => {
                      const subsectionFindings = getFindingsForSubsection(
                        section,
                        visibleFindings,
                        subsection
                      );

                      return (
                        <section
                          key={subsection}
                          className="rounded-2xl border border-[#b9a16a]/50 bg-[#f7f4ec] p-5"
                        >
                          <h3 className="font-serif text-2xl">
                            {subsection}
                          </h3>

                          {subsectionFindings.length === 0 ? (
                            <p className="mt-5 rounded-2xl border border-[#b9a16a]/40 bg-white p-5 text-sm text-[#394146]">
                              {hasActiveFilter
                                ? "No findings match the current filter for this subsection."
                                : "No findings have been added to this subsection."}
                            </p>
                          ) : (
                            <div className="mt-5 grid gap-5">
                              {subsectionFindings.map((finding) =>
                                renderPublicFinding(
                                  section,
                                  finding,
                                  sectionFindings,
                                  photos
                                )
                              )}
                            </div>
                          )}
                        </section>
                      );
                    })}
                  </div>
                ) : visibleFindings.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-[#b9a16a]/50 bg-[#f7f4ec] p-5 text-sm text-[#394146]">
                    {hasActiveFilter
                      ? "No findings match the current filter for this section."
                      : "No findings have been added to this section."}
                  </p>
                ) : (
                  <div className="mt-6 grid gap-5">
                    {visibleFindings.map((finding) =>
                      renderPublicFinding(
                        section,
                        finding,
                        sectionFindings,
                        photos
                      )
                    )}
                  </div>
                )}
              </section>
            );
          }
        )}
      </div>
    </>
  );
}
