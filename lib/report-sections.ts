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

export const exteriorSubsections = [
  "Siding",
  "Eaves, Soffits, and Fascia",
  "Doors and Windows",
  "Driveways and Walkways",
  "Stairs, Stoops, and Ramps",
  "Decks, Porches, and Balconies",
];

export const electricalSubsections = [
  "Service Entrance and Meter",
  "Subpanels and Distribution Boxes",
  "Service Grounding and Bonding",
  "Switches, Receptacles, and Outlets",
  "GFCI and AFCI",
  "Other Electrical Components",
];

export const insulationVentilationSubsections = [
  "Insulation and Ventilation in Unfinished Spaces",
  "Mechanical Ventilation",
  "Missing, Damaged, or Inadequate Insulation",
];

export const interiorSubsections = [
  "Floors, Ceilings, and Walls",
  "Doors and Windows",
  "Appliances",
];

export const plumbingSubsections = [
  "Supply Plumbing",
  "Faucets and Fixtures",
  "Drain, Waste, Vent Plumbing",
  "Water Heating Equipment",
];

export const heatingDetailFields = [
  { key: "heatingType", label: "Heating Type" },
  { key: "energySource", label: "Energy Source" },
  { key: "fuelShutOff", label: "Fuel Shut-Off" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "ductingType", label: "Ducting Type" },
  { key: "modelNumber", label: "Model #" },
] as const;

export const electricalDetailFields = [
  { key: "serviceConnection", label: "Service Connection" },
  { key: "serviceSize", label: "Service Size" },
  { key: "mainServiceDisconnect", label: "Main Service Disconnect" },
  { key: "branchCircuitWiring", label: "Branch Circuit Wiring" },
] as const;

export const plumbingDetailFields = [
  { key: "waterSource", label: "Water Source" },
  { key: "mainWaterShutOff", label: "Main Water Shut-Off" },
  { key: "waterHeaterType", label: "Water Heater Type" },
  { key: "plumbingEnergySource", label: "Energy Source" },
  { key: "tankCapacity", label: "Tank Capacity" },
  { key: "plumbingModelNumber", label: "Model #" },
] as const;

export type HeatingDetailKey = (typeof heatingDetailFields)[number]["key"];
export type ElectricalDetailKey =
  (typeof electricalDetailFields)[number]["key"];
export type PlumbingDetailKey = (typeof plumbingDetailFields)[number]["key"];
export type SectionDetailKey =
  | HeatingDetailKey
  | ElectricalDetailKey
  | PlumbingDetailKey;
export type SectionDetails = Partial<Record<SectionDetailKey, string>>;

export type SectionDetailField = {
  key: SectionDetailKey;
  label: string;
};

const reportSubsectionsBySectionName: Record<string, string[]> = {
  roof: roofSubsections,
  exterior: exteriorSubsections,
  electrical: electricalSubsections,
  "insulation & ventilation": insulationVentilationSubsections,
  "insulation and ventilation": insulationVentilationSubsections,
  interior: interiorSubsections,
  plumbing: plumbingSubsections,
};

const sectionDetailFieldsBySectionName: Record<
  string,
  readonly SectionDetailField[]
> = {
  heating: heatingDetailFields,
  electrical: electricalDetailFields,
  plumbing: plumbingDetailFields,
};

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
  const sectionNumber = getSectionNumber(sectionName);

  return sectionNumber && unnumberedName
    ? `${sectionNumber}. ${unnumberedName}`
    : sectionName;
}

export function formatFindingNumber(sectionName: string, findingIndex: number) {
  const sectionNumber = getSectionNumber(sectionName);

  return sectionNumber ? `${sectionNumber}.${findingIndex + 1}` : "";
}

export function getSectionSubsections(sectionName: string) {
  return reportSubsectionsBySectionName[
    stripSectionNumber(sectionName).toLowerCase()
  ] ?? [];
}

export function getSectionDetailFields(sectionName: string) {
  return (
    sectionDetailFieldsBySectionName[
      stripSectionNumber(sectionName).toLowerCase()
    ] ?? []
  );
}

export function getSectionDetailsTitle(sectionName: string) {
  const unnumberedName = stripSectionNumber(sectionName);

  return `${unnumberedName} Details`;
}

export function hasSectionDetails(sectionName: string) {
  return getSectionDetailFields(sectionName).length > 0;
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
