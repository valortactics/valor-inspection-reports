"use client";

import { FileDown } from "lucide-react";
import { useState } from "react";
import { prepareReportForPrint } from "./print-utils";

export default function PdfExportButton() {
  const [isPreparing, setIsPreparing] = useState(false);

  async function exportPdf() {
    if (isPreparing) {
      return;
    }

    setIsPreparing(true);

    try {
      await prepareReportForPrint();
      window.print();
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportPdf}
      disabled={isPreparing}
      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#252b2e] px-4 py-2 text-sm font-semibold text-[#f7f4ec] shadow-sm transition hover:bg-[#394146] focus:outline-none focus:ring-2 focus:ring-[#b9a16a] disabled:cursor-wait disabled:bg-[#c8c0aa] disabled:text-[#7d6b3d]"
    >
      <FileDown aria-hidden="true" size={18} />
      {isPreparing ? "Preparing PDF" : "Export PDF"}
    </button>
  );
}
