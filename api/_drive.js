import { google } from "googleapis";

export const DOSSIER_DRIVE_ID = "1BaUd8YRYYKRZFTWR1hKd2jwccmdiyj_K"; // Dossier PARTAGE AMIABLE
export const FICHIER_ASSOCIES_ID = "10amtSne7u3XTwvgdbznlUzv9CcvzokTO"; // « Liste associés » (xlsx, 11 associés)

// Lecture seule (xlsx des associés) — utilisé par api/associes.js.
// On garde le compte de service ici : la LECTURE d'un fichier partagé fonctionne.
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
 * Archive un rapport dans le dossier PARTAGE AMIABLE.
 *
 * L'ÉCRITURE ne passe PAS par le compte de service : un compte de service
 * Google n'a pas de quota de stockage et ne peut plus créer de fichiers dans
 * un « Mon Drive ». On délègue donc la création à un Apps Script déployé en
 * application web, exécuté sous le compte de Jean-François Dumetz, qui crée
 * la fiche .txt et la photo .jpg dans le dossier.
 *
 * Contrat avec l'Apps Script : POST JSON { secret, titre, fiche, photoBase64 }.
 */
export async function archiverRapport(it) {
  const url = process.env.ARCHIVE_WEBHOOK_URL;
  const secret = process.env.ARCHIVE_SECRET;
  if (!url) throw new Error("ARCHIVE_WEBHOOK_URL absent (variable Vercel manquante)");
  if (!secret) throw new Error("ARCHIVE_SECRET absent (variable Vercel manquante)");

  const d = new Date(it.date);
  const dateISO = d.toISOString().slice(0, 10);
  const titre = `Rapport ${dateISO} — ${it.nom} — ${it.par}`;

  const avis0 = it.avis && it.avis[0];
  const fiche = [
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
  ]
    .filter((l) => l !== "")
    .join("\n");

  // Partie base64 seule (sans le préfixe "data:image/...;base64,")
  let photoBase64 = "";
  if (it.photo && it.photo.startsWith("data:image")) {
    photoBase64 = it.photo.split(",")[1] || "";
  }

  const reponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, titre, fiche, photoBase64 }),
  });

  const texte = await reponse.text();
  if (!reponse.ok) {
    throw new Error(`Apps Script HTTP ${reponse.status} : ${texte.slice(0, 200)}`);
  }
  return texte;
}
