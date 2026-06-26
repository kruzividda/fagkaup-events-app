// Sjálfgefnir reitir per viðburðartegund. Notað bæði þegar nýr viðburður er
// stofnaður (sem grunnur ef ekkert sniðmát er til) og til að "sá" sniðmáts-
// viðburði (is_template = true) í fyrsta sinn sem tegund er opnuð í sniðmátum.
// visible_if er ALLTAF key-based ({ field: "<field_key>", equals: <gildi> }).

export type TemplateField = {
  field_key: string;
  label: string;
  field_type: string;
  requirement: string;
  sort_order: number;
  visible_if: { field: string; equals: string | boolean } | null;
  is_custom?: boolean;
};

export const DEFAULT_FIELDS: TemplateField[] = [
  { field_key: "full_name", label: "Nafn", field_type: "text", requirement: "required", sort_order: 1, visible_if: null },
  { field_key: "kennitala", label: "Kennitala", field_type: "text", requirement: "required", sort_order: 2, visible_if: null },
  { field_key: "email", label: "Tölvupóstur", field_type: "email", requirement: "required", sort_order: 3, visible_if: null },
  { field_key: "phone", label: "Símanúmer", field_type: "phone", requirement: "optional", sort_order: 4, visible_if: null },
  { field_key: "company", label: "Fyrirtæki", field_type: "text", requirement: "optional", sort_order: 5, visible_if: null },
  { field_key: "dietary", label: "Fæðuóþol", field_type: "text", requirement: "optional", sort_order: 6, visible_if: null },
  { field_key: "has_plus_one", label: "Ég kem með maka / +1", field_type: "boolean", requirement: "optional", sort_order: 7, visible_if: null },
  { field_key: "spouse_name", label: "Nafn maka", field_type: "text", requirement: "optional", sort_order: 8, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "spouse_email", label: "Tölvupóstur maka (fyrir hans miða)", field_type: "email", requirement: "optional", sort_order: 9, visible_if: { field: "has_plus_one", equals: true } },
  { field_key: "consent", label: "Ég samþykki að upplýsingar mínar séu unnar vegna viðburðarins", field_type: "consent", requirement: "required", sort_order: 10, visible_if: null },
];

// Golfmót: golf-sértækir reitir, enginn maki
export const GOLF_FIELDS: TemplateField[] = [
  { field_key: "full_name", label: "Nafn", field_type: "text", requirement: "required", sort_order: 1, visible_if: null, is_custom: false },
  { field_key: "kennitala", label: "Kennitala", field_type: "text", requirement: "required", sort_order: 2, visible_if: null, is_custom: false },
  { field_key: "forgjof", label: "Forgjöf", field_type: "text", requirement: "optional", sort_order: 3, visible_if: null, is_custom: true },
  { field_key: "golfklubbur", label: "Golfklúbbur", field_type: "text", requirement: "optional", sort_order: 4, visible_if: null, is_custom: true },
  { field_key: "golfbox_numer", label: "Golfbox númer", field_type: "text", requirement: "optional", sort_order: 5, visible_if: null, is_custom: true },
  { field_key: "email", label: "Netfang", field_type: "email", requirement: "required", sort_order: 6, visible_if: null, is_custom: false },
  { field_key: "phone", label: "Símanúmer", field_type: "phone", requirement: "optional", sort_order: 7, visible_if: null, is_custom: false },
  { field_key: "company", label: "Fyrirtæki", field_type: "text", requirement: "optional", sort_order: 8, visible_if: null, is_custom: false },
  { field_key: "dietary", label: "Annað (t.d. fæðuóþol)", field_type: "text", requirement: "optional", sort_order: 9, visible_if: null, is_custom: false },
  { field_key: "vantar_golfbil", label: "Vantar golfbíl?", field_type: "boolean", requirement: "optional", sort_order: 10, visible_if: null, is_custom: true },
  { field_key: "consent", label: "Ég samþykki að upplýsingar mínar séu unnar vegna viðburðarins", field_type: "consent", requirement: "required", sort_order: 11, visible_if: null, is_custom: false },
];

export function templateFor(eventType: string): TemplateField[] {
  return eventType === "golfmot" ? GOLF_FIELDS : DEFAULT_FIELDS;
}

export const TEMPLATE_NAME_PREFIX = "Sniðmát: ";

// Viðburðartegundir — skilgreint hér (server-öruggt) svo bæði server- og
// client-kóði geti flutt þetta inn. components/form.tsx endurútflytur þetta.
export const EVENT_TYPE_OPTIONS = [
  { value: "arshatid", label: "Árshátíð" },
  { value: "golfmot", label: "Golfmót" },
  { value: "vorukynning", label: "Vörukynning" },
  { value: "fraedslufundur", label: "Fræðslufundur" },
  { value: "opid_hus", label: "Opið hús" },
  { value: "vidskiptavinavidburdur", label: "Viðskiptavinaviðburður" },
  { value: "starfsmannavidburdur", label: "Starfsmannaviðburður" },
  { value: "sersnidinn", label: "Sérsniðinn viðburður" },
];
