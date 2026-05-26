"use client";

import Image from "next/image";
import {
  Clipboard,
  Download,
  FileText,
  Printer,
  Search,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { isVideoUrl } from "../../../lib/report-media";
import {
  formatFindingNumber,
  formatSectionName,
  getFindingSubsectionName,
  getSectionDetailFields,
  getSectionDetailsTitle,
  getSectionSubsections,
  type SectionDetails,
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
  section_details?: SectionDetails | null;
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

type ReportDetails = {
  title: string;
  propertyAddress?: string | null;
  clientName?: string | null;
  inspectionDate?: string | null;
  inspectorName?: string | null;
};

type ReportFindingsFilterProps = {
  reportDetails: ReportDetails;
  sectionNavigationItems: SectionNavigationItem[];
  findings: Finding[];
  photos: ReportMedia[];
};

type RepairSelection = {
  selected: boolean;
  onToggle: (findingId: string) => void;
};

type RepairReportFinding = {
  section: ReportSection;
  sectionLabel: string;
  subsectionName: string | null;
  finding: Finding;
  findingNumber: string;
};

type RepairReportSectionGroup = {
  sectionId: string;
  sectionLabel: string;
  findings: RepairReportFinding[];
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

function getReportDetailRows(reportDetails: ReportDetails) {
  return [
    { label: "Property", value: reportDetails.propertyAddress },
    { label: "Client", value: reportDetails.clientName },
    { label: "Inspection Date", value: reportDetails.inspectionDate },
    { label: "Inspector", value: reportDetails.inspectorName },
  ].flatMap(({ label, value }) => {
    const trimmedValue = value?.trim();

    return trimmedValue ? [{ label, value: trimmedValue }] : [];
  });
}

function groupRepairReportFindings(
  repairFindings: RepairReportFinding[]
): RepairReportSectionGroup[] {
  return repairFindings.reduce<RepairReportSectionGroup[]>((groups, item) => {
    const existingGroup = groups.find(
      (group) => group.sectionId === item.section.id
    );

    if (existingGroup) {
      existingGroup.findings.push(item);
      return groups;
    }

    return [
      ...groups,
      {
        sectionId: item.section.id,
        sectionLabel: item.sectionLabel,
        findings: [item],
      },
    ];
  }, []);
}

function getRepairReportFileName(reportDetails: ReportDetails) {
  const fileNameBase = (
    reportDetails.propertyAddress ||
    reportDetails.title ||
    "repair-report"
  )
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  return `${fileNameBase || "repair-report"}-repair-report.txt`;
}

function buildRepairReportText(
  reportDetails: ReportDetails,
  repairFindings: RepairReportFinding[]
) {
  const detailLines = getReportDetailRows(reportDetails).map(
    ({ label, value }) => `${label}: ${value}`
  );

  const findingLines = repairFindings.flatMap((item, index) => {
    const findingLabel = item.findingNumber
      ? `Finding ${item.findingNumber}`
      : "Finding";
    const description = item.finding.description?.trim();

    return [
      "",
      `${index + 1}. ${findingLabel} - ${item.finding.title}`,
      `Section: ${item.sectionLabel}`,
      item.subsectionName ? `Subsection: ${item.subsectionName}` : null,
      `Severity: ${item.finding.severity}`,
      description ? `Description: ${description}` : null,
    ].filter((line): line is string => line !== null);
  });

  return [
    "Repair Report",
    reportDetails.title,
    ...detailLines,
    "",
    "Selected Defects",
    ...findingLines,
  ]
    .filter((line) => line !== undefined && line !== null)
    .join("\n");
}

async function writeRepairReportToClipboard(reportText: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(reportText);
      return;
    } catch {
      // Fall back to the legacy selection copy below.
    }
  }

  const textArea = document.createElement("textarea");

  textArea.value = reportText;
  textArea.setAttribute("readonly", "");
  textArea.style.left = "-9999px";
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  const copySucceeded = document.execCommand("copy");
  textArea.remove();

  if (!copySucceeded) {
    throw new Error("Unable to copy repair report");
  }
}

function renderPublicFinding(
  section: ReportSection,
  finding: Finding,
  sectionFindings: Finding[],
  photos: ReportMedia[],
  repairSelection?: RepairSelection
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

        {repairSelection && (
          <label className="no-print inline-flex w-fit cursor-pointer items-center gap-2 rounded-full border border-[#b9a16a]/70 bg-white px-3 py-2 text-xs font-semibold text-[#252b2e] shadow-sm transition hover:border-[#252b2e] focus-within:ring-2 focus-within:ring-[#b9a16a]">
            <input
              type="checkbox"
              checked={repairSelection.selected}
              onChange={() => repairSelection.onToggle(finding.id)}
              aria-label={`Add ${
                findingNumber ? `Finding ${findingNumber}` : finding.title
              } to repair report`}
              className="h-4 w-4 rounded border-[#b9a16a] text-[#252b2e]"
            />
            Repair Report
          </label>
        )}
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

function renderPublicSectionDetails(section: ReportSection) {
  const sectionDetailFields = getSectionDetailFields(section.name);

  if (sectionDetailFields.length === 0) {
    return null;
  }

  const sectionDetails = section.section_details ?? {};

  return (
    <section className="mt-6 rounded-2xl border border-[#b9a16a]/50 bg-[#f7f4ec] p-5">
      <h3 className="font-serif text-2xl">
        {getSectionDetailsTitle(section.name)}
      </h3>

      <dl className="mt-5 grid gap-4 md:grid-cols-2">
        {sectionDetailFields.map((field) => {
          const value = sectionDetails[field.key]?.trim();

          return (
            <div
              key={field.key}
              className="rounded-xl border border-[#b9a16a]/40 bg-white p-4"
            >
              <dt className="text-sm font-semibold text-[#252b2e]">
                {field.label}
              </dt>
              <dd className="mt-2 min-h-6 text-[#394146]">
                {value || "Not entered"}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function renderRepairReportPreview(
  reportDetails: ReportDetails,
  repairFindings: RepairReportFinding[],
  copyStatus: string,
  onCopy: () => void | Promise<void>,
  onDownload: () => void,
  onPrint: () => void
) {
  const detailRows = getReportDetailRows(reportDetails);
  const repairReportGroups = groupRepairReportFindings(repairFindings);

  return (
    <section
      id="repair-report"
      className="client-report-card mb-8 scroll-mt-28 rounded-3xl bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-[#b9a16a]/40 pb-5 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7d6b3d]">
            Selected Defects
          </p>
          <h2 className="mt-2 font-serif text-3xl">Repair Report</h2>
          <p className="mt-2 text-[#394146]">{reportDetails.title}</p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex items-center gap-2 rounded-full border border-[#b9a16a]/70 bg-white px-4 py-2 text-sm font-semibold text-[#252b2e] shadow-sm transition hover:border-[#252b2e] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
          >
            <Clipboard aria-hidden="true" size={16} />
            Copy
          </button>

          <button
            type="button"
            onClick={onDownload}
            className="inline-flex items-center gap-2 rounded-full bg-[#252b2e] px-4 py-2 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
          >
            <Download aria-hidden="true" size={16} />
            Download TXT
          </button>

          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-2 rounded-full bg-[#252b2e] px-4 py-2 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
          >
            <Printer aria-hidden="true" size={16} />
            Export PDF
          </button>

          {copyStatus && (
            <span
              role="status"
              className="text-sm font-semibold text-[#7d6b3d]"
            >
              {copyStatus}
            </span>
          )}
        </div>
      </div>

      {detailRows.length > 0 && (
        <dl className="mt-5 grid gap-3 md:grid-cols-2">
          {detailRows.map((detail) => (
            <div
              key={detail.label}
              className="rounded-xl border border-[#b9a16a]/40 bg-[#f7f4ec] p-4"
            >
              <dt className="text-sm font-semibold text-[#252b2e]">
                {detail.label}
              </dt>
              <dd className="mt-1 text-[#394146]">{detail.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="mt-6 grid gap-6">
        {repairReportGroups.map((group) => (
          <section
            key={group.sectionId}
            className="rounded-2xl border border-[#b9a16a]/50 bg-[#f7f4ec] p-5"
          >
            <h3 className="font-serif text-2xl">{group.sectionLabel}</h3>

            <ol className="mt-5 grid gap-4">
              {group.findings.map((item) => {
                const findingLabel = item.findingNumber
                  ? `Finding ${item.findingNumber}`
                  : "Finding";

                return (
                  <li
                    key={item.finding.id}
                    className="rounded-xl border border-[#b9a16a]/40 bg-white p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#252b2e] px-3 py-1 text-xs font-semibold text-[#f7f4ec]">
                        {findingLabel}
                      </span>
                      <span className="rounded-full bg-[#f7f4ec] px-3 py-1 text-xs font-semibold text-[#394146]">
                        {item.finding.severity}
                      </span>
                      {item.subsectionName && (
                        <span className="rounded-full bg-[#f7f4ec] px-3 py-1 text-xs font-semibold text-[#394146]">
                          {item.subsectionName}
                        </span>
                      )}
                    </div>

                    <h4 className="mt-4 text-xl font-semibold">
                      {item.finding.title}
                    </h4>

                    {item.finding.description && (
                      <p className="mt-3 whitespace-pre-wrap leading-7 text-[#394146]">
                        {item.finding.description}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </section>
  );
}

export default function ReportFindingsFilter({
  reportDetails,
  sectionNavigationItems,
  findings,
  photos,
}: ReportFindingsFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("All");
  const [selectedFindingIds, setSelectedFindingIds] = useState<string[]>([]);
  const [showRepairReport, setShowRepairReport] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");

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

  const selectedFindingIdSet = useMemo(
    () => new Set(selectedFindingIds),
    [selectedFindingIds]
  );

  const selectedRepairFindings = useMemo(() => {
    if (selectedFindingIdSet.size === 0) {
      return [];
    }

    return sectionNavigationItems.flatMap(({ section }) => {
      const sectionLabel = formatSectionName(section.name);
      const sectionFindings = findings
        .filter((finding) => finding.section_id === section.id)
        .sort(sortFindings);

      return sectionFindings
        .filter(
          (finding) =>
            selectedFindingIdSet.has(finding.id) && !isTextBoxFinding(finding)
        )
        .map((finding) => ({
          section,
          sectionLabel,
          subsectionName: getFindingSubsectionName(
            section.name,
            finding.subsection_name
          ),
          finding,
          findingNumber: getFindingDisplayNumber(
            section,
            finding,
            sectionFindings
          ),
        }));
    });
  }, [findings, sectionNavigationItems, selectedFindingIdSet]);

  const repairFindingCount = useMemo(() => {
    return findings.filter((finding) => !isTextBoxFinding(finding)).length;
  }, [findings]);

  const visibleEntryCount = visibleEntriesBySection.reduce(
    (total, section) => total + section.visibleFindings.length,
    0
  );
  const hasActiveFilter =
    severityFilter !== "All" || normalizedSearchQuery.length > 0;
  const selectedRepairCount = selectedRepairFindings.length;

  function toggleRepairFinding(findingId: string) {
    setCopyStatus("");
    setSelectedFindingIds((currentFindingIds) =>
      currentFindingIds.includes(findingId)
        ? currentFindingIds.filter(
            (currentFindingId) => currentFindingId !== findingId
          )
        : [...currentFindingIds, findingId]
    );
  }

  function buildSelectedRepairReport() {
    if (selectedRepairCount === 0) {
      return;
    }

    setCopyStatus("");
    setShowRepairReport(true);
  }

  function clearRepairReport() {
    setSelectedFindingIds([]);
    setShowRepairReport(false);
    setCopyStatus("");
  }

  async function copyRepairReport() {
    if (selectedRepairCount === 0) {
      return;
    }

    try {
      await writeRepairReportToClipboard(
        buildRepairReportText(reportDetails, selectedRepairFindings)
      );
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  function downloadRepairReport() {
    if (selectedRepairCount === 0) {
      return;
    }

    const repairReportText = buildRepairReportText(
      reportDetails,
      selectedRepairFindings
    );
    const repairReportBlob = new Blob([repairReportText], {
      type: "text/plain;charset=utf-8",
    });
    const downloadUrl = URL.createObjectURL(repairReportBlob);
    const downloadLink = document.createElement("a");

    downloadLink.href = downloadUrl;
    downloadLink.download = getRepairReportFileName(reportDetails);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
    URL.revokeObjectURL(downloadUrl);
  }

  function printRepairReport() {
    if (selectedRepairCount === 0) {
      return;
    }

    const cleanupPrintMode = () => {
      document.body.classList.remove("print-repair-report-only");
    };

    document.body.classList.add("print-repair-report-only");
    window.addEventListener("afterprint", cleanupPrintMode, { once: true });
    window.print();
    window.setTimeout(cleanupPrintMode, 1000);
  }

  return (
    <>
      <section className="no-print mb-8 rounded-3xl border border-[#b9a16a]/50 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#252b2e] text-[#f7f4ec]">
              <FileText aria-hidden="true" size={20} />
            </span>

            <div>
              <h2 className="font-serif text-2xl">Repair Report</h2>
              <p className="mt-1 text-sm font-semibold text-[#7d6b3d]">
                {selectedRepairCount} of {repairFindingCount} defects selected
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={buildSelectedRepairReport}
              disabled={selectedRepairCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-[#252b2e] px-4 py-2 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] focus:outline-none focus:ring-2 focus:ring-[#b9a16a] disabled:cursor-not-allowed disabled:bg-[#c8c0aa] disabled:text-[#7d6b3d]"
            >
              <FileText aria-hidden="true" size={16} />
              Build Repair Report
            </button>

            <button
              type="button"
              onClick={clearRepairReport}
              disabled={selectedRepairCount === 0}
              className="inline-flex items-center gap-2 rounded-full border border-[#b9a16a]/70 bg-white px-4 py-2 text-sm font-semibold text-[#252b2e] shadow-sm transition hover:border-[#252b2e] focus:outline-none focus:ring-2 focus:ring-[#b9a16a] disabled:cursor-not-allowed disabled:border-[#d7cfbb] disabled:text-[#9a9078]"
            >
              <X aria-hidden="true" size={16} />
              Clear
            </button>
          </div>
        </div>
      </section>

      {showRepairReport &&
        selectedRepairCount > 0 &&
        renderRepairReportPreview(
          reportDetails,
          selectedRepairFindings,
          copyStatus,
          copyRepairReport,
          downloadRepairReport,
          printRepairReport
        )}

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

                {renderPublicSectionDetails(section)}

                {subsections.length > 0 ? (
                  <div
                    className={`${
                      getSectionDetailFields(section.name).length > 0
                        ? "mt-5"
                        : "mt-6"
                    } grid gap-6`}
                  >
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
                                  photos,
                                  {
                                    selected: selectedFindingIdSet.has(
                                      finding.id
                                    ),
                                    onToggle: toggleRepairFinding,
                                  }
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
                        photos,
                        {
                          selected: selectedFindingIdSet.has(finding.id),
                          onToggle: toggleRepairFinding,
                        }
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
