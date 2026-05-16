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

const numberedSectionNames = defaultReportSections.map((section) =>
  stripSectionNumber(section)
);

export function stripSectionNumber(sectionName: string) {
  return sectionName.replace(/^\s*\d+\.\s*/, "").trim();
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
