import * as XLSX from "xlsx";
import { getDrive, FICHIER_ASSOCIES_ID } from "./_drive.js";

// Petit cache en mémoire (réutilisé tant que l'instance serverless vit)
let cache = { liste: null, t: 0 };
const CACHE_MS = 5 * 60 * 1000;

export default async function handler(req, res) {
  try {
    if (cache.liste && Date.now() - cache.t < CACHE_MS) {
      return res.status(200).json({ associes: cache.liste, cache: true });
    }
    const drive = getDrive();
    const r = await drive.files.get(
      { fileId: FICHIER_ASSOCIES_ID, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const wb = XLSX.read(Buffer.from(r.data), { type: "buffer" });
    const feuille = wb.Sheets[wb.SheetNames[0]];
    const lignes = XLSX.utils.sheet_to_json(feuille, { header: 1 });

    const associes = lignes
      .map((l) => {
        // Format attendu : NOM en colonne A, Prénom en colonne B (ou "NOM,Prénom" en A)
        let nom = "";
        let prenom = "";
        if (l.length >= 2 && l[0] && l[1]) {
          nom = String(l[0]).trim();
          prenom = String(l[1]).trim();
        } else if (l[0] && String(l[0]).includes(",")) {
          [nom, prenom] = String(l[0]).split(",").map((x) => x.trim());
        }
        if (!nom || !prenom) return null;
        const nomPropre = nom.charAt(0).toUpperCase() + nom.slice(1).toLowerCase();
        return `${prenom} ${nomPropre}`;
      })
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, "fr"));

    cache = { liste: associes, t: Date.now() };
    res.status(200).json({ associes });
  } catch (e) {
    console.error("associes:", e.message);
    // En cas d'échec Drive, renvoyer le dernier cache connu s'il existe
    if (cache.liste) return res.status(200).json({ associes: cache.liste, cache: true });
    res.status(500).json({ error: "Liste des associés indisponible" });
  }
}
