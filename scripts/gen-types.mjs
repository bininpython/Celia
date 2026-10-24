#!/usr/bin/env node
// Gera src/types/database.ts no formato do `supabase gen types` a partir de
// um PostgreSQL com as migrations aplicadas (ver scripts/gen-types.sh).
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const url = process.argv[2];
if (!url) {
  console.error("uso: node scripts/gen-types.mjs <database-url>");
  process.exit(1);
}

const q = (sql) => {
  const out = execFileSync("psql", [url, "-At", "-c", `select coalesce(json_agg(t), '[]') from (${sql}) t`], {
    encoding: "utf8",
  });
  return JSON.parse(out.trim());
};

const enums = q(`
  select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values
    from pg_type t join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' group by t.typname order by t.typname`);
const enumNames = new Set(enums.map((e) => e.name));

const columns = q(`
  select c.table_name, c.column_name, c.is_nullable = 'YES' as nullable,
         c.column_default is not null as has_default, c.is_identity = 'YES' as identity,
         c.identity_generation, c.data_type, c.udt_name, c.ordinal_position,
         tb.table_type
    from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name
   where c.table_schema = 'public'
   order by c.table_name, c.ordinal_position`);

const fks = q(`
  select con.conname as name, cl.relname as table_name, rcl.relname as ref_table,
         array(select a.attname from unnest(con.conkey) k join pg_attribute a on a.attrelid = con.conrelid and a.attnum = k) as cols,
         array(select a.attname from unnest(con.confkey) k join pg_attribute a on a.attrelid = con.confrelid and a.attnum = k) as ref_cols,
         exists (select 1 from pg_index i where i.indrelid = con.conrelid and i.indisunique
                   and i.indpred is null and i.indkey::int2[] @> con.conkey and array_length(con.conkey,1) = i.indnatts) as one_to_one
    from pg_constraint con
    join pg_class cl on cl.oid = con.conrelid
    join pg_class rcl on rcl.oid = con.confrelid
    join pg_namespace n on n.oid = cl.relnamespace
    join pg_namespace rn on rn.oid = rcl.relnamespace
   where con.contype = 'f' and n.nspname = 'public' and rn.nspname = 'public'
   order by cl.relname, con.conname`);

const functions = q(`
  select p.proname as name, p.proretset as returns_set,
         pg_get_function_result(p.oid) as result,
         coalesce(p.proargnames, '{}') as arg_names,
         coalesce(p.proargmodes::text[], '{}') as arg_modes,
         array(select format_type(t, null) from unnest(coalesce(p.proallargtypes, p.proargtypes::oid[])) t) as arg_types,
         p.pronargdefaults as n_defaults, p.pronargs as n_args,
         format_type(p.prorettype, null) as ret_type
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f'
     and format_type(p.prorettype, null) <> 'trigger'
     and p.proname not in ('invoice_total')
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
   order by p.proname`);

const pgToTs = (udt, dataType) => {
  if (dataType === "ARRAY") return `${pgToTs(udt.replace(/^_/, ""), "")}[]`;
  if (enumNames.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;
  switch (udt) {
    case "int2": case "int4": case "int8": case "numeric": case "float4": case "float8":
    case "smallint": case "integer": case "bigint": case "real": case "double precision":
      return "number";
    case "bool": case "boolean":
      return "boolean";
    case "json": case "jsonb":
      return "Json";
    default:
      return "string";
  }
};

const fmtToTs = (fmt) => {
  const arr = fmt.endsWith("[]");
  const base = fmt.replace(/\[\]$/, "").replace(/^public\./, "").replace(/\(.*\)$/, "").trim();
  const map = {
    "uuid": "string", "text": "string", "date": "string", "timestamp with time zone": "string",
    "integer": "number", "bigint": "number", "smallint": "number", "numeric": "number",
    "boolean": "boolean", "jsonb": "Json", "json": "Json", "void": "undefined",
  };
  let ts = map[base];
  if (!ts && enumNames.has(base)) ts = `Database["public"]["Enums"]["${base}"]`;
  if (!ts) ts = "string";
  return arr ? `${ts}[]` : ts;
};

const byTable = new Map();
for (const c of columns) {
  if (!byTable.has(c.table_name)) byTable.set(c.table_name, { type: c.table_type, cols: [] });
  byTable.get(c.table_name).cols.push(c);
}

const ind = (n) => "  ".repeat(n);
let out = `// Arquivo gerado por scripts/gen-types.mjs — não edite manualmente.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
`;

const rels = (table) =>
  fks
    .filter((f) => f.table_name === table)
    .map(
      (f) =>
        `${ind(5)}{ foreignKeyName: "${f.name}"; columns: [${f.cols.map((c) => `"${c}"`).join(", ")}]; isOneToOne: ${f.one_to_one}; referencedRelation: "${f.ref_table}"; referencedColumns: [${f.ref_cols.map((c) => `"${c}"`).join(", ")}] },`,
    )
    .join("\n");

for (const [table, { type, cols }] of byTable) {
  if (type !== "BASE TABLE") continue;
  out += `${ind(3)}${table}: {\n${ind(4)}Row: {\n`;
  for (const c of cols) out += `${ind(5)}${c.column_name}: ${pgToTs(c.udt_name, c.data_type)}${c.nullable ? " | null" : ""};\n`;
  out += `${ind(4)}};\n${ind(4)}Insert: {\n`;
  for (const c of cols) {
    if (c.identity && c.identity_generation === "ALWAYS") {
      out += `${ind(5)}${c.column_name}?: never;\n`;
      continue;
    }
    const opt = c.nullable || c.has_default || c.identity;
    out += `${ind(5)}${c.column_name}${opt ? "?" : ""}: ${pgToTs(c.udt_name, c.data_type)}${c.nullable ? " | null" : ""};\n`;
  }
  out += `${ind(4)}};\n${ind(4)}Update: {\n`;
  for (const c of cols) {
    if (c.identity && c.identity_generation === "ALWAYS") {
      out += `${ind(5)}${c.column_name}?: never;\n`;
      continue;
    }
    out += `${ind(5)}${c.column_name}?: ${pgToTs(c.udt_name, c.data_type)}${c.nullable ? " | null" : ""};\n`;
  }
  const r = rels(table);
  out += `${ind(4)}};\n${ind(4)}Relationships: [${r ? `\n${r}\n${ind(4)}` : ""}];\n${ind(3)}};\n`;
}
out += `${ind(2)}};\n${ind(2)}Views: {\n`;
for (const [table, { type, cols }] of byTable) {
  if (type !== "VIEW") continue;
  out += `${ind(3)}${table}: {\n${ind(4)}Row: {\n`;
  for (const c of cols) out += `${ind(5)}${c.column_name}: ${pgToTs(c.udt_name, c.data_type)} | null;\n`;
  out += `${ind(4)}};\n${ind(4)}Relationships: [];\n${ind(3)}};\n`;
}
out += `${ind(2)}};\n${ind(2)}Functions: {\n`;

const parseTableResult = (result) => {
  // "TABLE(month date, income_paid numeric, ...)"
  const inner = result.replace(/^TABLE\(/, "").replace(/\)$/, "");
  const parts = [];
  let depth = 0, cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts.map((p) => {
    const i = p.indexOf(" ");
    return { name: p.slice(0, i), type: p.slice(i + 1) };
  });
};

for (const f of functions) {
  const inArgs = [];
  f.arg_types.forEach((t, i) => {
    const mode = f.arg_modes[i] ?? "i";
    if (mode === "i" || mode === "b") inArgs.push({ name: f.arg_names[i], type: t });
  });
  const firstDefault = inArgs.length - f.n_defaults;
  const args = inArgs.length
    ? `{ ${inArgs.map((a, i) => `${a.name}${i >= firstDefault ? "?" : ""}: ${fmtToTs(a.type)}`).join("; ")} }`
    : "Record<PropertyKey, never>";
  let ret;
  if (f.result.startsWith("TABLE(")) {
    ret = `{ ${parseTableResult(f.result).map((c) => `${c.name}: ${fmtToTs(c.type)}`).join("; ")} }[]`;
  } else if (f.returns_set) {
    const t = f.ret_type.replace(/^public\./, "");
    ret = byTable.has(t) ? `Database["public"]["Tables"]["${t}"]["Row"][]` : `${fmtToTs(f.ret_type)}[]`;
  } else {
    ret = fmtToTs(f.ret_type);
  }
  out += `${ind(3)}${f.name}: { Args: ${args}; Returns: ${ret} };\n`;
}
out += `${ind(2)}};\n${ind(2)}Enums: {\n`;
for (const e of enums) out += `${ind(3)}${e.name}: ${e.values.map((v) => `"${v}"`).join(" | ")};\n`;
out += `${ind(2)}};\n${ind(2)}CompositeTypes: { [_ in never]: never };\n  };\n};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
export type Views<T extends keyof PublicSchema["Views"]> = PublicSchema["Views"][T]["Row"];
export type FunctionReturns<T extends keyof PublicSchema["Functions"]> = PublicSchema["Functions"][T]["Returns"];

export const Constants = {
  public: {
    Enums: {
${enums.map((e) => `      ${e.name}: [${e.values.map((v) => `"${v}"`).join(", ")}],`).join("\n")}
    },
  },
} as const;
`;

const target = resolve(process.cwd(), "src/types/database.ts");
writeFileSync(target, out);
console.log(`Tipos gerados em ${target}`);
