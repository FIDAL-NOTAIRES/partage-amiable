import { sql } from "@vercel/postgres";
import { archiverRapport } from "./_drive.js";

// Détection automatique de la chaîne de connexion Postgres, quel que soit
// le nom de variable choisi par l'intégration Neon (POSTGRES_URL,
// DATABASE_URL, STORAGE_URL, STORAGE_POSTGRES_URL, etc.)
if (!process.env.POSTGRES_URL) {
  const candidat =
    process.env.DATABASE_URL ||
    Object.entries(process.env).find(
      ([k, v]) =>
        typeof v === "string" &&
        (v.startsWith("postgres://") || v.startsWith("postgresql://")) &&
        !k.includes("UNPOOLED") &&
        !k.includes("NO_SSL")
    )?.[1];
  if (candidat) process.env.POSTGRES_URL = candidat;
}

async function assurerTable() {
  await sql`CREATE TABLE IF NOT EXISTS rapports (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    created BIGINT NOT NULL
  )`;
}

export default async function handler(req, res) {
  try {
    await assurerTable();

    if (req.method === "GET") {
      const { rows } = await sql`SELECT data FROM rapports ORDER BY created DESC LIMIT 200`;
      return res.status(200).json({ items: rows.map((r) => r.data) });
    }

    if (req.method === "POST") {
      const { action, item, id, avis } = req.body || {};

      if (action === "create") {
        if (!item || !item.id || !item.nom || !item.photo) {
          return res.status(400).json({ error: "item incomplet" });
        }
        await sql`INSERT INTO rapports (id, data, created)
                  VALUES (${item.id}, ${JSON.stringify(item)}, ${item.date})
                  ON CONFLICT (id) DO NOTHING`;
        try {
          await archiverRapport(item);
        } catch (e) {
          console.error("archive Drive:", e.message);
        }
        return res.status(200).json({ ok: true });
      }

      if (action === "like") {
        const { rows } = await sql`SELECT data FROM rapports WHERE id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: "introuvable" });
        const data = rows[0].data;
        data.likes = (data.likes || 0) + 1;
        await sql`UPDATE rapports SET data = ${JSON.stringify(data)} WHERE id = ${id}`;
        return res.status(200).json({ ok: true, likes: data.likes });
      }

      if (action === "avis") {
        if (!avis || !avis.par) return res.status(400).json({ error: "avis incomplet" });
        const { rows } = await sql`SELECT data FROM rapports WHERE id = ${id}`;
        if (!rows.length) return res.status(404).json({ error: "introuvable" });
        const data = rows[0].data;
        data.avis = [...(data.avis || []), avis];
        await sql`UPDATE rapports SET data = ${JSON.stringify(data)} WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: "action inconnue" });
    }

    res.status(405).json({ error: "méthode non autorisée" });
  } catch (e) {
    console.error("items:", e.message);
    res.status(500).json({ error: "erreur serveur" });
  }
}
