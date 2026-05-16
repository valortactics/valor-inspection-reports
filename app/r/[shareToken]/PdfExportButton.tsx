"use client";

import { FileDown } from "lucide-react";

export default function PdfExportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#252b2e] px-4 py-2 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] focus:outline-none focus:ring-2 focus:ring-[#b9a16a]"
    >
      <FileDown aria-hidden="true" size={18} />
      Export PDF
    </button>
  );
}
