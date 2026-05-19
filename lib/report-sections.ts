export const defaultReportSections = [
  "1. Roof",
  "2. Exterior",
  "3. Foundation",
  "4. Heating",
  "5. Cooling",
  "6. Electrical",
  "7. Plumbing",
  "8. Insulation & Ventilation",
  "9. Interior",
];

export const roofSubsections = [
  "Roof Covering",
  "Flashings and Penetrations",
  "Gutters and Downspouts",
  "Roof Framing and Attic",
];

const numberedSectionNames = defaultReportSections.map((section) =>
  stripSectionNumber(section)
);

export function stripSectionNumber(sectionName: string) {
  return sectionName.replace(/^\s*\d+\.\s*/, "").trim();
}

export function renumberReportSections(sectionNames: string[]) {
  return sectionNames.map((sectionName, index) => {
    const unnumberedName = stripSectionNumber(sectionName) || "New Section";

    return `${index + 1}. ${unnumberedName}`;
  });
}

export function getSectionNumber(sectionName: string) {
  const sectionNumber = sectionName.match(/^\s*(\d+)\./)?.[1];

  if (sectionNumber) {
    return sectionNumber;
  }

  const sectionIndex = numberedSectionNames.findIndex(
    (name) =>
      name.toLowerCase() === stripSectionNumber(sectionName).toLowerCase()
  );

  return sectionIndex === -1 ? "" : String(sectionIndex + 1);
}

export function formatSectionName(sectionName: string) {
  const unnumberedName = stripSectionNumber(sectionName);
  const sectionIndex = numberedSectionNames.findIndex(
    (name) => name.toLowerCase() === unnumberedName.toLowerCase()
  );

  if (sectionIndex === -1) {
    return sectionName;
  }

  return `${sectionIndex + 1}. ${unnumberedName}`;
}

export function formatFindingNumber(sectionName: string, findingIndex: number) {
  const sectionNumber = getSectionNumber(sectionName);

  return sectionNumber ? `${sectionNumber}.${findingIndex + 1}` : "";
}

export function getSectionSubsections(sectionName: string) {
  return stripSectionNumber(sectionName).toLowerCase() === "roof"
    ? roofSubsections
    : [];
}

export function getFindingSubsectionName(
  sectionName: string,
  subsectionName?: string | null
) {
  const sectionSubsections = getSectionSubsections(sectionName);

  if (sectionSubsections.length === 0) {
    return null;
  }

  const normalizedSubsectionName = subsectionName?.trim().toLowerCase();
  const matchingSubsection = sectionSubsections.find(
    (subsection) => subsection.toLowerCase() === normalizedSubsectionName
  );

  return matchingSubsection ?? sectionSubsections[0];
}
