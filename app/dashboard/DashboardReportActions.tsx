"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";

type DashboardReportActionsProps = {
  reportId: string;
  reportTitle: string;
  homePhotoUrl?: string | null;
  gisMapUrl?: string | null;
};

const STORAGE_PUBLIC_PATH = "/storage/v1/object/public/inspection-photos/";

function getStoragePathFromPublicUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  const pathStart = url.indexOf(STORAGE_PUBLIC_PATH);

  if (pathStart === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(pathStart + STORAGE_PUBLIC_PATH.length));
}

export default function DashboardReportActions({
  reportId,
  reportTitle,
  homePhotoUrl,
  gisMapUrl,
}: DashboardReportActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteReport() {
    const confirmed = window.confirm(
      `Delete "${reportTitle}"? This will permanently remove the report from the dashboard.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");

    const { data: sections, error: sectionsError } = await supabase
      .from("sections")
      .select("id")
      .eq("report_id", reportId);

    if (sectionsError) {
      setError(sectionsError.message);
      setDeleting(false);
      return;
    }

    const sectionIds = (sections ?? []).map((section) => section.id);
    const { data: findings, error: findingsError } =
      sectionIds.length > 0
        ? await supabase
            .from("findings")
            .select("id")
            .in("section_id", sectionIds)
        : { data: [], error: null };

    if (findingsError) {
      setError(findingsError.message);
      setDeleting(false);
      return;
    }

    const findingIds = (findings ?? []).map((finding) => finding.id);
    const { data: mediaRows, error: mediaError } =
      findingIds.length > 0
        ? await supabase
            .from("photos")
            .select("image_url")
            .in("finding_id", findingIds)
        : { data: [], error: null };

    if (mediaError) {
      setError(mediaError.message);
      setDeleting(false);
      return;
    }

    if (findingIds.length > 0) {
      const { error: photoDeleteError } = await supabase
        .from("photos")
        .delete()
        .in("finding_id", findingIds);

      if (photoDeleteError) {
        setError(photoDeleteError.message);
        setDeleting(false);
        return;
      }

      const { error: findingDeleteError } = await supabase
        .from("findings")
        .delete()
        .in("id", findingIds);

      if (findingDeleteError) {
        setError(findingDeleteError.message);
        setDeleting(false);
        return;
      }
    }

    if (sectionIds.length > 0) {
      const { error: sectionDeleteError } = await supabase
        .from("sections")
        .delete()
        .in("id", sectionIds);

      if (sectionDeleteError) {
        setError(sectionDeleteError.message);
        setDeleting(false);
        return;
      }
    }

    const { error: reportDeleteError } = await supabase
      .from("reports")
      .delete()
      .eq("id", reportId);

    if (reportDeleteError) {
      setError(reportDeleteError.message);
      setDeleting(false);
      return;
    }

    const storagePaths = [
      getStoragePathFromPublicUrl(homePhotoUrl),
      getStoragePathFromPublicUrl(gisMapUrl),
      ...(mediaRows ?? []).map((row) =>
        getStoragePathFromPublicUrl(row.image_url)
      ),
    ].filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      await supabase.storage.from("inspection-photos").remove(storagePaths);
    }

    setDeleting(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/dashboard/reports/${reportId}/edit`}
        className="rounded-full bg-[#252b2e] px-4 py-2 text-xs font-semibold text-[#f7f4ec]"
      >
        Edit
      </Link>

      <button
        type="button"
        onClick={deleteReport}
        disabled={deleting}
        className="rounded-full border border-red-300 px-4 py-2 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? "Deleting..." : "Delete"}
      </button>

      {error && <p className="basis-full text-xs text-red-700">{error}</p>}
    </div>
  );
}
