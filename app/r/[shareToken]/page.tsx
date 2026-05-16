import Image from "next/image";
import { formatSectionName } from "../../../lib/report-sections";
import { supabase } from "../../../lib/supabase";

const TEXT_BOX_TITLE = "Text Box";
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

  const sectionIds = (sections || []).map((s) => s.id);

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
    <main className="min-h-screen bg-[#f7f4ec] text-[#252b2e]">
      <header className="bg-[#252b2e] px-6 py-8 text-[#f7f4ec]">
        <div className="mx-auto max-w-5xl text-center">
          <Image
            src="/brand/valor-logo-tagline-card.jpg"
            alt="Valor Home Inspections"
            width={1280}
            height={960}
            priority
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
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
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

        {report.summary_text && (
          <section className="mb-8 rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-serif text-3xl">Inspection Summary</h2>
            <p className="mt-4 whitespace-pre-wrap leading-8 text-[#394146]">
              {report.summary_text}
            </p>
          </section>
        )}

        <div className="grid gap-8">
          {(sections || []).map((section) => {
            const sectionFindings = (findings || []).filter(
              (finding) => finding.section_id === section.id
            );

            return (
              <section key={section.id} className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="font-serif text-3xl">
                  {formatSectionName(section.name)}
                </h2>

                <div className="mt-6 grid gap-5">
                  {sectionFindings.map((finding) => {
                    const findingPhotos = (photos || []).filter(
                      (photo) => photo.finding_id === finding.id
                    );

                    if (finding.title === TEXT_BOX_TITLE) {
                      return (
                        <article
                          key={finding.id}
                          className="rounded-2xl border border-[#b9a16a]/60 bg-white p-5"
                        >
                          <p className="whitespace-pre-wrap leading-8 text-[#394146]">
                            {finding.description}
                          </p>

                          {findingPhotos.length > 0 && (
                            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                              {findingPhotos.map((photo) => (
                                <a
                                  key={photo.id}
                                  href={photo.image_url}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <div className="relative aspect-square overflow-hidden rounded-xl">
                                    <Image
                                      src={photo.image_url}
                                      alt="Text box photo"
                                      fill
                                      unoptimized
                                      sizes="(min-width: 768px) 33vw, 50vw"
                                      className="object-cover"
                                    />
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    }

                    return (
                      <article key={finding.id} className="rounded-2xl bg-[#f7f4ec] p-5">
                        <span className="rounded-full bg-[#252b2e] px-3 py-1 text-xs font-semibold text-[#f7f4ec]">
                          {finding.severity}
                        </span>

                        <h3 className="mt-4 text-2xl font-semibold">
                          {finding.title}
                        </h3>

                        <p className="mt-3 whitespace-pre-wrap leading-7 text-[#394146]">
                          {finding.description}
                        </p>

                        {findingPhotos.length > 0 && (
                          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                            {findingPhotos.map((photo) => (
                              <a
                                key={photo.id}
                                href={photo.image_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <div className="relative aspect-square overflow-hidden rounded-xl">
                                  <Image
                                    src={photo.image_url}
                                    alt="Inspection photo"
                                    fill
                                    unoptimized
                                    sizes="(min-width: 768px) 33vw, 50vw"
                                    className="object-cover"
                                  />
                                </div>
                              </a>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
