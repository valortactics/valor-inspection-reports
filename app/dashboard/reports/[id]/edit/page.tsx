"use client";

import Link from "next/link";
import Image from "next/image";
import { use, useEffect, useState } from "react";
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

type Photo = {
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

const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const TEXT_BOX_TITLE = "Text Box";
const severities = ["Safety Defect", "Major Defect", "Minor Defect"];

export default function EditReportPage({ params }: EditReportPageProps) {
  const { id: reportId } = use(params);

  const [reportTitle, setReportTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [shareToken, setShareToken] = useState("");

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

      const { data: photosData, error: photosError } = await supabase
        .from("photos")
        .select("*")
        .in("finding_id", safeFindingIds)
        .order("sort_order");

      if (photosError) {
        setMessage(photosError.message);
        setLoading(false);
        return;
      }

      setReportTitle(report?.title ?? "");
      setStatus(report?.status ?? "draft");
      setShareToken(report?.share_token ?? "");
      setSummaryText(report?.summary_text ?? "");
      setSections(sectionsData ?? []);
      setFindings(findingsData ?? []);
      setPhotos(photosData ?? []);
      setLoading(false);
    }

    void loadReport();
  }, [reportId]);

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

    const { error } = await supabase
      .from("reports")
      .update({
        title: reportTitle,
        summary_text: summaryText,
      })
      .eq("id", reportId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Report details saved.");
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
      return;
    }

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
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.finding_id !== findingId)
    );
    setMessage("Finding deleted.");
  }

  async function uploadPhoto(findingId: string, file: File) {
    setMessage("Uploading photo...");

    const fileExt = file.name.split(".").pop();
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

    const findingPhotos = photos.filter(
      (photo) => photo.finding_id === findingId
    );

    const { data: photoRow, error: photoError } = await supabase
      .from("photos")
      .insert({
        finding_id: findingId,
        image_url: data.publicUrl,
        caption: "",
        sort_order: findingPhotos.length,
      })
      .select()
      .single();

    if (photoError) {
      setMessage(photoError.message);
      return;
    }

    setPhotos((currentPhotos) => [...currentPhotos, photoRow]);
    setMessage("Photo uploaded.");
  }

  function uploadImageFiles(findingId: string, files: FileList) {
    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith("image/")
    );

    imageFiles.forEach((file) => {
      void uploadPhoto(findingId, file);
    });
  }

  function getFindingsForSection(sectionId: string) {
    return findings.filter((finding) => finding.section_id === sectionId);
  }

  function getPhotosForFinding(findingId: string) {
    return photos.filter((photo) => photo.finding_id === findingId);
  }

  function isTextBoxFinding(finding: Finding) {
    return finding.title === TEXT_BOX_TITLE;
  }

  const clientLink =
    shareToken && typeof window !== "undefined"
      ? `${window.location.origin}/r/${shareToken}`
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

        <h1 className="mt-6 font-serif text-5xl">Edit Report</h1>

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
                          Photos
                        </label>

                        <label
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => {
                            event.preventDefault();
                            uploadImageFiles(
                              finding.id,
                              event.dataTransfer.files
                            );
                          }}
                          className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a16a] bg-[#f7f4ec] p-6 text-center transition hover:bg-white"
                        >
                          <span className="font-semibold text-[#252b2e]">
                            Drag photos here
                          </span>

                          <span className="mt-1 text-sm text-[#394146]">
                            or click to choose images
                          </span>

                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              if (event.target.files) {
                                uploadImageFiles(
                                  finding.id,
                                  event.target.files
                                );
                              }

                              event.target.value = "";
                            }}
                          />
                        </label>

                        {getPhotosForFinding(finding.id).length > 0 && (
                          <div className="mt-4">
                            <p className="mb-3 text-sm font-semibold text-[#394146]">
                              Photo Preview
                            </p>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                              {getPhotosForFinding(finding.id).map((photo) => (
                                <a
                                  key={photo.id}
                                  href={photo.image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
                                >
                                  <div className="relative aspect-square w-full">
                                    <Image
                                      src={photo.image_url}
                                      alt={photo.caption ?? "Text box photo"}
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
                              ))}
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
                            Photos
                          </label>

                          <label
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => {
                              event.preventDefault();
                              uploadImageFiles(
                                finding.id,
                                event.dataTransfer.files
                              );
                            }}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#b9a16a] bg-white p-6 text-center transition hover:bg-[#f7f4ec]"
                          >
                            <span className="font-semibold text-[#252b2e]">
                              Drag photos here
                            </span>

                            <span className="mt-1 text-sm text-[#394146]">
                              or click to choose images
                            </span>

                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              onChange={(event) => {
                                if (event.target.files) {
                                  uploadImageFiles(
                                    finding.id,
                                    event.target.files
                                  );
                                }

                                event.target.value = "";
                              }}
                            />
                          </label>

                          {getPhotosForFinding(finding.id).length > 0 && (
                            <div className="mt-4">
                              <p className="mb-3 text-sm font-semibold text-[#394146]">
                                Photo Preview
                              </p>

                              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                {getPhotosForFinding(finding.id).map((photo) => (
                                  <a
                                    key={photo.id}
                                    href={photo.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"
                                  >
                                    <div className="relative aspect-square w-full">
                                      <Image
                                        src={photo.image_url}
                                        alt={photo.caption ?? "Inspection photo"}
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
                                ))}
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
