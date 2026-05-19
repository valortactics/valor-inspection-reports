import Link from "next/link";
import DashboardReportActions from "./DashboardReportActions";
import { supabase } from "../../lib/supabase";

type Report = {
  id: string;
  title: string;
  property_address: string | null;
  client_name: string | null;
  inspection_date: string | null;
  status: string | null;
  share_token: string | null;
  home_photo_url: string | null;
  gis_map_url: string | null;
  created_at: string;
};

export default async function DashboardPage() {
  const { data: reports, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#f7f4ec] p-6 text-[#252b2e]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="font-serif text-5xl">Valor Dashboard</h1>
            <p className="mt-3 text-[#394146]">
              Create, edit, and manage inspection reports.
            </p>
          </div>

          <Link
            href="/dashboard/reports/new"
            className="rounded-full bg-[#252b2e] px-6 py-3 text-center font-semibold text-[#f7f4ec]"
          >
            Create New Report
          </Link>
        </div>

        {error && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <section className="mt-8 rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold">My Reports</h2>

          {!reports || reports.length === 0 ? (
            <p className="mt-4 text-[#394146]">
              No reports yet. Create your first inspection report.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-black/10">
                    <th className="py-3 pr-4">Report</th>
                    <th className="py-3 pr-4">Client</th>
                    <th className="py-3 pr-4">Inspection Date</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 pr-4">Created</th>
                    <th className="py-3 pr-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {(reports as Report[]).map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-black/5 align-top"
                    >
                      <td className="py-4 pr-4">
                        <div className="font-semibold">{report.title}</div>
                        <div className="mt-1 text-[#394146]">
                          {report.property_address || "No address entered"}
                        </div>
                      </td>

                      <td className="py-4 pr-4">
                        {report.client_name || "No client entered"}
                      </td>

                      <td className="py-4 pr-4">
                        {report.inspection_date || "No date"}
                      </td>

                      <td className="py-4 pr-4">
                        {report.status === "published" &&
                        report.share_token ? (
                          <Link
                            href={`/r/${report.share_token}`}
                            className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 underline-offset-2 hover:underline"
                          >
                            Published
                          </Link>
                        ) : (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-800">
                            {report.status || "draft"}
                          </span>
                        )}
                      </td>

                      <td className="py-4 pr-4">
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 pr-4">
                        <DashboardReportActions
                          reportId={report.id}
                          reportTitle={report.title}
                          homePhotoUrl={report.home_photo_url}
                          gisMapUrl={report.gis_map_url}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
