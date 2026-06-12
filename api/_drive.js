import { google } from "googleapis";

export const DOSSIER_DRIVE_ID = "1BaUd8YRYYKRZFTWR1hKd2jwccmdiyj_K"; // Dossier PARTAGE AMIABLE
export const FICHIER_ASSOCIES_ID = "1SwoQHUAVFj3UxHO9yOC1Yi80KoHA_nv-"; // Liste des associés (xlsx)

export function getDrive() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

/**
 * Archive un rapport dans le dossier PARTAGE AMIABLE :
 * 1. la photo de l'étiquette en JPEG
 * 2. la fiche texte du rapport
 */
export async function archiverRapport(it) {
  const drive = getDrive();
  const d = new Date(it.date);
  const dateISO = d.toISOString().slice(0, 10);
  const base = `Rapport ${dateISO} — ${it.nom} — ${it.par}`;

  // 1. Photo de l'étiquette
  if (it.photo && it.photo.startsWith("data:image")) {
    const base64 = it.photo.split(",")[1];
    const buffer = Buffer.from(base64, "base64");
    const { Readable } = await import("stream");
    await drive.files.create({
      requestBody: { name: `${base}.jpg`, parents: [DOSSIER_DRIVE_ID] },
      media: { mimeType: "image/jpeg", body: Readable.from(buffer) },
      fields: "id",
    });
  }

  // 2. Fiche du rapport
  const avis0 = it.avis && it.avis[0];
  const lignes = [
    "PARTAGE AMIABLE — Rapport à la masse",
    "",
    `Vin : ${it.nom}`,
    it.detail ? `Appellation · millésime : ${it.detail}` : "",
    it.region ? `Région : ${it.region}` : "",
    it.couleur ? `Couleur : ${it.couleur}` : "",
    it.sensations && it.sensations.length ? `Sensations : ${it.sensations.join(", ")}` : "",
    avis0 && avis0.note > 0 ? `Note : ${avis0.note}/10` : "",
    avis0 && avis0.texte ? `Commentaire : ${avis0.texte}` : "",
    "",
    `Rapporté par : ${it.par}`,
    `Date : ${d.toLocaleDateString("fr-FR")} ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`,
    `Identifiant : ${it.id}`,
  ].filter((l) => l !== "");

  await drive.files.create({
    requestBody: { name: `${base}.txt`, parents: [DOSSIER_DRIVE_ID] },
    media: { mimeType: "text/plain", body: lignes.join("\n") },
    fields: "id",
  });
}
