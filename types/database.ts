// Sjálfvirkar TypeScript týpur frá Supabase koma hingað.
// Búðu þær til með Supabase CLI þegar þú vilt full týpuöryggi:
//
//   npx supabase login
//   npx supabase link --project-ref <DITT-PROJECT-REF>
//   npx supabase gen types typescript --linked > types/database.ts
//
// Þangað til er þetta tóm týpa svo verkefnið þýðist.
export type Database = Record<string, unknown>;
