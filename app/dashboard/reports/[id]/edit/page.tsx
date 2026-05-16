"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useRef, useState } from "react";
import { isVideoUrl } from "../../../../../lib/report-media";
import { formatSectionName } from "../../../../../lib/report-sections";
import { supabase } from "../../../../../lib/supabase";

type Section = {
  id: string;
  name: string;
  sort_order: number;
};

type Finding = {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  severity: string;
  sort_order: number;
};

type ReportMedia = {
  id: string;
  finding_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

type EditReportPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type EditableFindingField = "description" | "severity" | "title";
type AutoSaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const TEXT_BOX_TITLE = "Text Box";
const AUTO_SAVE_DELAY_MS = 1200;
const severities = ["Safety Defect", "Major Defect", "Minor Defect"];

function getReportDetailsSnapshot({
  title,
  summaryText,
  homePhotoUrl,
}: {
  title: string;
  summaryText: string;
  homePhotoUrl: string;
}) {
  return JSON.stringify({
    title,
    summaryText,
    homePhotoUrl,
  });
}

function getFindingSnapshot(finding: Finding) {
  return JSON.stringify({
    title: finding.title,
    description: finding.description ?? "",
    severity: finding.severity,
    sort_order: finding.sort_order,
  });
}

export default function EditReportPage({ params }: EditReportPageProps) {
  const { id: reportId } = use(params);

  const [reportTitle, setReportTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [homePhotoUrl, setHomePhotoUrl] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [media, setMedia] = useState<ReportMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [autoSaveStatus, setAutoSaveStatus] =
    useState<AutoSaveStatus>("idle");
  const [autoSaveError, setAutoSaveError] = useState("");

  const savedReportDetailsRef = useRef("");
  const savedFindingSnapshotsRef = useRef<Record<string, string>>({});
  const autoSaveRequestRef = useRef(0);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      setMessage("");

      const { data: report, error: reportError } = await supabase
        .from("reports")
        .select("*")
        .eq("id", reportId)
        .single();

      if (reportError) {
        setMessage(reportError.message);
        setLoading(false);
        return;
      }

      const { data: sectionsData, error: sectionsError } = await supabase
        .from("sections")
        .select("*")
        .eq("report_id", reportId)
        .order("sort_order");

      if (sectionsError) {
        setMessage(sectionsError.message);
        setLoading(false);
        return;
      }

      const sectionIds = (sectionsData ?? []).map((section) => section.id);
      const safeSectionIds = sectionIds.length > 0 ? sectionIds : [EMPTY_UUID];

      const { data: findingsData, error: findingsError } = await supabase
        .from("findings")
        .select("*")
        .in("section_id", safeSectionIds)
        .order("sort_order");

      if (findingsError) {
        setMessage(findingsError.message);
        setLoading(false);
        return;
      }

      const findingIds = (findingsData ?? []).map((finding) => finding.id);
      const safeFindingIds = findingIds.length > 0 ? findingIds : [EMPTY_UUID];

      const { data: mediaData, error: mediaError } = await supabase
        .from("photos")
        .select("*")
        .in("finding_id", safeFindingIds)
        .order("sort_order");

      if (mediaError) {
        setMessage(mediaError.message);
        setLoading(false);
        return;
      }

      const loadedTitle = report?.title ?? "";
      const loadedSummaryText = report?.summary_text ?? "";
      const loadedHomePhotoUrl = report?.home_photo_url ?? "";
      const loadedFindings = findingsData ?? [];

      savedReportDetailsRef.current = getReportDetailsSnapshot({
        title: loadedTitle,
        summaryText: loadedSummaryText,
        homePhotoUrl: loadedHomePhotoUrl,
      });
      savedFindingSnapshotsRef.current = Object.fromEntries(
        loadedFindings.map((finding) => [
          finding.id,
          getFindingSnapshot(finding),
        ])
      );

      setReportTitle(loadedTitle);
      setStatus(report?.status ?? "draft");
      setShareToken(report?.share_token ?? "");
      setSummaryText(loadedSummaryText);
      setHomePhotoUrl(loadedHomePhotoUrl);
      setSections(sectionsData ?? []);
      setFindings(loadedFindings);
      setMedia(mediaData ?? []);
      setAutoSaveStatus("saved");
      setAutoSaveError("");
      setLoading(false);
    }

    void loadReport();
  }, [reportId]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const currentSnapshot = getReportDetailsSnapshot({
      title: reportTitle,
      summaryText,
      homePhotoUrl,
    });

    if (currentSnapshot === savedReportDetailsRef.current) {
      return;
    }

    setAutoSaveStatus("pending");
    setAutoSaveError("");

    const timeoutId = window.setTimeout(async () => {
      const requestId = autoSaveRequestRef.current + 1;
      autoSaveRequestRef.current = requestId;

      setAutoSaveStatus("saving");

      const { error } = await supabase
        .from("reports")
        .update({
          title: reportTitle,
          summary_text: summaryText,
          home_photo_url: homePhotoUrl || null,
        })
        .eq("id", reportId);

      if (error) {
        if (autoSaveRequestRef.current === requestId) {
          setAutoSaveStatus("error");
          setAutoSaveError(error.message);
        }

        return;
      }

      savedReportDetailsRef.current = currentSnapshot;

      if (autoSaveRequestRef.current === requestId) {
        setAutoSaveStatus("saved");
        setAutoSaveError("");
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [homePhotoUrl, loading, reportId, reportTitle, summaryText]);

  useEffect(() => {
    if (loading) {
      return;
    }

    const changedFindings = findings.filter(
      (finding) =>
        getFindingSnapshot(finding) !==
        savedFindingSnapshotsRef.current[finding.id]
    );

    if (changedFindings.length === 0) {
      return;
    }

    setAutoSaveStatus("pending");
    setAutoSaveError("");

    const timeoutId = window.setTimeout(async () => {
      const requestId = autoSaveRequestRef.current + 1;
      autoSaveRequestRef.current = requestId;

      setAutoSaveStatus("saving");

      for (const finding of changedFindings) {
        const { error } = await supabase
          .from("findings")
          .update({
            title: finding.title,
            description: finding.description,
            severity: finding.severity,
            sort_order: finding.sort_order,
          })
          .eq("id", finding.id);

        if (error) {
          if (autoSaveRequestRef.current === requestId) {
            setAutoSaveStatus("error");
            setAutoSaveError(error.message);
          }

          return;
        }

        savedFindingSnapshotsRef.current = {
          ...savedFindingSnapshotsRef.current,
          [finding.id]: getFindingSnapshot(finding),
        };
      }

      if (autoSaveRequestRef.current === requestId) {
        setAutoSaveStatus("saved");
        setAutoSaveError("");
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [findings, loading]);

  async function togglePublish() {
    const newStatus = status === "published" ? "draft" : "published";

    const { error } = await supabase
      .from("reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setStatus(newStatus);
    setMessage(
      newStatus === "published" ? "Report published." : "Report unpublished."
    );
  }

  async function saveReportDetails() {
    setMessage("Saving report details...");
    setAutoSaveStatus("saving");

    const { error } = await supabase
      .from("reports")
      .update({
        title: reportTitle,
        summary_text: summaryText,
        home_photo_url: homePhotoUrl || null,
      })
      .eq("id", reportId);

    if (error) {
      setMessage(error.message);
      setAutoSaveStatus("error");
      setAutoSaveError(error.message);
      return;
    }

    savedReportDetailsRef.current = getReportDetailsSnapshot({
      title: reportTitle,
      summaryText,
      homePhotoUrl,
    });
    setAutoSaveStatus("saved");
    setAutoSaveError("");
    setMessage("Report details saved.");
  }

  async function uploadHomePhoto(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file for the home photo.");
      return;
    }

    setMessage("Uploading home photo...");

    const fileExt =
      file.name.split(".").pop() || (file.type.startsWith("video/") ? "mp4" : "jpg");
    const fileName = `${reportId}/home/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("inspection-photos")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("inspection-photos")
      .getPublicUrl(fileName);

    const { error: reportError } = await supabase
      .from("reports")
      .update({ home_photo_url: data.publicUrl })
      .eq("id", reportId);

    if (reportError) {
      setMessage(reportError.message);
      return;
    }

    setHomePhotoUrl(data.publicUrl);
    setMessage("Home photo uploaded.");
  }

  function uploadHomePhotoFiles(files: FileList) {
    const imageFile = Array.from(files).find((file) =>
      file.type.startsWith("image/")
    );

    if (!imageFile) {
      setMessage("Please choose an image file for the home photo.");
      return;
    }

    void uploadHomePhoto(imageFile);
  }

  async function removeHomePhoto() {
    setMessage("Removing home photo...");

    const { error } = await supabase
      .from("reports")
      .update({ home_photo_url: null })
      .eq("id", reportId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setHomePhotoUrl("");
    setMessage("Home photo removed.");
  }

  async function addFinding(sectionId: string) {
    const sectionFindings = findings.filter(
      (finding) => finding.section_id === sectionId
    );

    const { data, error } = await supabase
      .from("findings")
      .insert({
        section_id: sectionId,
        title: "New Finding",
        description: "",
        severity: "Minor Defect",
        sort_order: sectionFindings.length,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    savedFindingSnapshotsRef.current = {
      ...savedFindingSnapshotsRef.current,
      [data.id]: getFindingSnapshot(data),
    };
    setFindings((currentFindings) => [...currentFindings, data]);
    setMessage("Finding added.");
  }

  async function addTextBox(sectionId: string) {
    const sectionFindings = findings.filter(
      (finding) => finding.section_id === sectionId
    );

    const { data, error } = await supabase
      .from("findings")
      .insert({
        section_id: sectionId,
        title: TEXT_BOX_TITLE,
        description: "",
        severity: "Minor Defect",
        sort_order: sectionFindings.length,
      })
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      return;
    }

    savedFindingSnapshotsRef.current = {
      ...savedFindingSnapshotsRef.current,
      [data.id]: getFindingSnapshot(data),
    };
    setFindings((currentFindings) => [...currentFindings, data]);
    setMessage("Text box added.");
  }

  function updateFinding(
    findingId: string,
    field: EditableFindingField,
    value: string
  ) {
    setFindings((currentFindings) =>
      currentFindings.map((finding) =>
        finding.id === findingId ? { ...finding, [field]: value } : finding
      )
    );
  }

  async function saveFinding(finding: Finding) {
    setMessage("Saving finding...");
    setAutoSaveStatus("saving");

    const { error } = await supabase
      .from("findings")
      .update({
        title: finding.title,
        description: finding.description,
        severity: finding.severity,
        sort_order: finding.sort_order,
      })
      .eq("id", finding.id);

    if (error) {
      setMessage(error.message);
      setAutoSaveStatus("error");
      setAutoSaveError(error.message);
      return;
    }

    savedFindingSnapshotsRef.current = {
      ...savedFindingSnapshotsRef.current,
      [finding.id]: getFindingSnapshot(finding),
    };
    setAutoSaveStatus("saved");
    setAutoSaveError("");
    setMessage("Finding saved.");
  }

  async function deleteFinding(findingId: string) {
    const { error } = await supabase
      .from("findings")
      .delete()
      .eq("id", findingId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFindings((currentFindings) =>
      currentFindings.filter((finding) => finding.id !== findingId)
    );
    setMedia((currentMedia) =>
      currentMedia.filter((mediaItem) => mediaItem.finding_id !== findingId)
    );
    const remainingFindingSnapshots = {
      ...savedFindingSnapshotsRef.current,
    };
    delete remainingFindingSnapshots[findingId];
    savedFindingSnapshotsRef.current = remainingFindingSnapshots;
    setMessage("Finding deleted.");
  }

  async function uploadMedia(findingId: string, file: File) {
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setMessage("Please choose an image or video file.");
      return;
    }

    setMessage("Uploading media...");

    const fileExt = file.name.split(".").pop() || "jpg";
    const fileName = `${reportId}/${findingId}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("inspection-photos")
      .upload(fileName, file);

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { data } = supabase.storage
      .from("inspection-photos")
      .getPublicUrl(fileName);

    const findingMedia = media.filter(
      (mediaItem) => mediaItem.finding_id === findingId
    );

    const { data: mediaRow, error: mediaError } = await supabase
      .from("photos")
      .insert({
        finding_id: findingId,
        image_url: data.publicUrl,
        caption: "",
        sort_order: findingMedia.length,
      })
      .select()
      .single();

    if (mediaError) {
      setMessage(mediaError.message);
      return;
    }

    setMedia((currentMedia) => [...currentMedia, mediaRow]);
    setMessage(
      file.type.startsWith("video/") ? "Video uploaded." : "Photo uploaded."
    );
  }

  function uploadMediaFiles(findingId: string, files: FileList) {
    const mediaFiles = Array.from(files).filter(
      (file) => file.type.startsWith("image/") || file.type.startsWith("video/")
    );

    if (mediaFiles.length === 0) {
      setMessage("Please choose image or video files.");
      return;
    }

    mediaFiles.forEach((file) => {
      void uploadMedia(findingId, file);
    });
  }

  function getFindingsForSection(sectionId: string) {
    return findings.filter((finding) => finding.section_id === sectionId);
  }

  function getMediaForFinding(findingId: string) {
    return media.filter((mediaItem) => mediaItem.finding_id === findingId);
  }

  function isTextBoxFinding(finding: Finding) {
    return finding.title === TEXT_BOX_TITLE;
  }

  function renderMediaPreview(mediaItem: ReportMedia, altText: string) {
    if (isVideoUrl(mediaItem.image_url)) {
      return (
        <div
          key={mediaItem.id}
          className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
        >
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
      );
    }

    return (
      <a
        key={mediaItem.id}
        href={mediaItem.image_url}
        target="_blank"
        rel="noreferrer"
        className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
      >
        <div className="relative aspect-square w-full">
          <Image
            src={mediaItem.image_url}
            alt={mediaItem.caption ?? altText}
            fill
            unoptimized
            sizes="(min-width: 768px) 25vw, 50vw"
            className="object-cover transition group-hover:scale-105"
          />
        </div>

        <div className="p-2 text-xs text-[#394146]">
          Click to open full size
        </div>
      </a>
    );
  }

  const clientLink =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/r/${shareToken}`
      : "";
  const autoSaveText =
    autoSaveStatus === "pending"
      ? "Autosave pending"
      : autoSaveStatus === "saving"
        ? "Autosaving"
        : autoSaveStatus === "saved"
          ? "All changes saved"
          : autoSaveStatus === "error"
            ? `Autosave failed: ${autoSaveError}`
            : "";

  if (loading) {
    return <main className="p-10">Loading report...</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#252b2e]">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm underline">
          Back to Dashboard
        </Link>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-serif text-5xl">Edit Report</h1>

          {autoSaveText && (
            <div
              className={`w-fit rounded-full px-4 py-2 text-xs font-semibold ${
                autoSaveStatus === "error"
                  ? "bg-red-50 text-red-700"
                  : "bg-white text-[#394146]"
              }`}
            >
              {autoSaveText}
            </div>
          )}
        </div>

        {message && (
          <div className="mt-6 rounded-xl border border-black/10 bg-white p-4 text-sm">
            {message}
          </div>
        )}

        <div className="mt-8 grid gap-5 rounded-3xl bg-white p-6 shadow-sm">
          <div>
            <label className="text-sm font-semibold">Report Title</label>
            <input
              className="mt-2 w-full rounded-xl border p-3"
              value={reportTitle}
              onChange={(event) => setReportTitle(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Inspection Summary</label>
            <textarea
              className="mt-2 min-h-36 w-full rounded-xl border p-3"
              value={summaryText}
              onChange={(event) => setSummaryText(event.target.value)}
              placeholder="Write a brief summary of the inspection here..."
            />
          </div>

          <div>
            <label className="text-sm font-semibold">Large Home Photo</label>

            <label
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                uploadHomePhotoFiles(event.dataTransfer.files);
              }}
              className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a16a] bg-[#f7f4ec] p-6 text-center transition hover:bg-white"
            >
              <span className="font-semibold text-[#252b2e]">
                Drag the home photo here
              </span>

              <span className="mt-1 text-sm text-[#394146]">
                or click to choose an image
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) {
                    uploadHomePhotoFiles(event.target.files);
                  }

                  event.target.value = "";
                }}
              />
            </label>

            {homePhotoUrl && (
              <div className="mt-4 overflow-hidden rounded-2xl border border-black/10 bg-[#f7f4ec] shadow-sm">
                <a href={homePhotoUrl} target="_blank" rel="noreferrer">
                  <div className="relative aspect-[16/9] w-full">
                    <Image
                      src={homePhotoUrl}
                      alt="Large home photo preview"
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 896px, 100vw"
                      className="object-cover"
                    />
                  </div>
                </a>

                <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p className="text-sm text-[#394146]">
                    This photo will appear below Certifications on the client
                    page.
                  </p>

                  <button
                    type="button"
                    onClick={removeHomePhoto}
                    className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700"
                  >
                    Remove Home Photo
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={saveReportDetails}
            className="w-fit rounded-full bg-[#252b2e] px-6 py-3 font-semibold text-[#f7f4ec]"
          >
            Save Report Details
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-[#f7f4ec] p-4">
          <p className="text-sm font-semibold">
            Status: {status === "published" ? "Published" : "Draft"}
          </p>

          {clientLink && (
            <p className="mt-2 break-all text-sm text-[#394146]">
              Client Link: {clientLink}
            </p>
          )}

          <button
            type="button"
            onClick={togglePublish}
            className="mt-4 rounded-full bg-[#252b2e] px-6 py-3 font-semibold text-[#f7f4ec]"
          >
            {status === "published" ? "Unpublish Report" : "Publish Report"}
          </button>
        </div>

        <div className="mt-8 grid gap-8">
          {sections.map((section) => (
            <section
              key={section.id}
              className="rounded-3xl border border-black/10 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-serif text-3xl">
                  {formatSectionName(section.name)}
                </h2>
              </div>

              <div className="mt-6 grid gap-5">
                {getFindingsForSection(section.id).map((finding) =>
                  isTextBoxFinding(finding) ? (
                    <article
                      key={finding.id}
                      className="rounded-2xl border border-[#b9a16a]/60 bg-white p-5"
                    >
                      <label className="text-sm font-semibold text-[#394146]">
                        Text Box
                      </label>

                      <textarea
                        className="mt-3 min-h-32 w-full rounded-xl border border-black/10 p-3 leading-7"
                        value={finding.description ?? ""}
                        onChange={(event) =>
                          updateFinding(
                            finding.id,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Add narrative text for this section..."
                      />

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold">
                          Photos & Videos
                        </label>

                        <label
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            uploadMediaFiles(
                              finding.id,
                              event.dataTransfer.files
                            );
                          }}
                          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a16a] bg-[#f7f4ec] p-6 text-center transition hover:bg-white"
                        >
                          <span className="font-semibold text-[#252b2e]">
                            Drag photos or videos here
                          </span>

                          <span className="mt-1 text-sm text-[#394146]">
                            or click to choose files
                          </span>

                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              if (event.target.files) {
                                uploadMediaFiles(
                                  finding.id,
                                  event.target.files
                                );
                              }

                              event.target.value = "";
                            }}
                          />
                        </label>

                        {getMediaForFinding(finding.id).length > 0 && (
                          <div className="mt-4">
                            <p className="mb-3 text-sm font-semibold text-[#394146]">
                              Media Preview
                            </p>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              {getMediaForFinding(finding.id).map(
                                (mediaItem) =>
                                  renderMediaPreview(
                                    mediaItem,
                                    "Text box media"
                                  )
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => saveFinding(finding)}
                          className="rounded-full bg-[#252b2e] px-5 py-2 text-sm font-semibold text-[#f7f4ec]"
                        >
                          Save Text Box
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteFinding(finding.id)}
                          className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700"
                        >
                          Delete Text Box
                        </button>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={finding.id}
                      className="rounded-2xl border border-black/10 bg-[#f7f4ec] p-5"
                    >
                      <div className="grid gap-4">
                        <input
                          className="rounded-xl border p-3 font-semibold"
                          value={finding.title}
                          onChange={(event) =>
                            updateFinding(
                              finding.id,
                              "title",
                              event.target.value
                            )
                          }
                          placeholder="Finding title"
                        />

                        <select
                          className="rounded-xl border p-3"
                          value={finding.severity}
                          onChange={(event) =>
                            updateFinding(
                              finding.id,
                              "severity",
                              event.target.value
                            )
                          }
                        >
                          {severities.map((severity) => (
                            <option key={severity} value={severity}>
                              {severity}
                            </option>
                          ))}
                        </select>

                        <textarea
                          className="min-h-28 rounded-xl border p-3"
                          value={finding.description ?? ""}
                          onChange={(event) =>
                            updateFinding(
                              finding.id,
                              "description",
                              event.target.value
                            )
                          }
                          placeholder="Description"
                        />

                        <div>
                          <label className="mb-2 block text-sm font-semibold">
                            Photos & Videos
                          </label>

                          <label
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              uploadMediaFiles(
                                finding.id,
                                event.dataTransfer.files
                              );
                            }}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a16a] bg-white p-6 text-center transition hover:bg-[#f7f4ec]"
                          >
                            <span className="font-semibold text-[#252b2e]">
                              Drag photos or videos here
                            </span>

                            <span className="mt-1 text-sm text-[#394146]">
                              or click to choose files
                            </span>

                            <input
                              type="file"
                              accept="image/*,video/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                if (event.target.files) {
                                  uploadMediaFiles(
                                    finding.id,
                                    event.target.files
                                  );
                                }

                                event.target.value = "";
                              }}
                            />
                          </label>

                          {getMediaForFinding(finding.id).length > 0 && (
                            <div className="mt-4">
                              <p className="mb-3 text-sm font-semibold text-[#394146]">
                                Media Preview
                              </p>

                              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {getMediaForFinding(finding.id).map(
                                  (mediaItem) =>
                                    renderMediaPreview(
                                      mediaItem,
                                      "Inspection media"
                                    )
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => saveFinding(finding)}
                            className="rounded-full bg-[#252b2e] px-5 py-2 text-sm font-semibold text-[#f7f4ec]"
                          >
                            Save Finding
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteFinding(finding.id)}
                            className="rounded-full border border-red-300 px-5 py-2 text-sm font-semibold text-red-700"
                          >
                            Delete Finding
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => addTextBox(section.id)}
                  className="rounded-full border border-[#b9a16a] bg-white px-5 py-2 text-sm font-semibold text-[#252b2e]"
                >
                  Add Text Box
                </button>

                <button
                  type="button"
                  onClick={() => addFinding(section.id)}
                  className="rounded-full bg-[#252b2e] px-5 py-2 text-sm font-semibold text-[#f7f4ec]"
                >
                  Add Finding
                </button>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
