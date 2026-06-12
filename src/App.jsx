import { useState, useEffect, useRef } from "react";

/* ============================================================
   PARTAGE AMIABLE — FIDAL Notaires
   (la cave du cabinet)
   Esprit FIDAL Apps : bleu nuit, turquoise au trait,
   capitales espacées (Open Sans), italiques Gelasio,
   touche ocre en accent.
   Backend : /api/items (Postgres), /api/identify (Anthropic),
   /api/associes (Drive). Archivage Drive côté serveur.
   ============================================================ */

const C = {
  fond: "#0C1827",
  nuit: "#08111E",
  carteH: "#1A2C45",
  carteB: "#111F34",
  bord: "#24395544",
  filet: "#22364F",
  teal: "#7CC4BF",
  tealDim: "#5E9C98",
  blanc: "#F2F6FA",
  gris: "#8DA2B8",
  grisFonce: "#5E7287",
};
const OCRE = "#F2D27E";

const SENSATIONS = {
  rouge: ["Fruits rouges", "Fruits noirs", "Épicé", "Boisé", "Tannique", "Soyeux", "Puissant", "Frais", "Cuir"],
  blanc: ["Agrumes", "Fruits blancs", "Floral", "Minéral", "Beurré", "Miel", "Vif", "Rond", "Exotique"],
  "rosé": ["Fruits rouges", "Agrumes", "Pamplemousse", "Floral", "Vif", "Léger", "Bonbon", "Épicé", "Gourmand"],
  effervescent: ["Brioché", "Toasté", "Bulles fines", "Crémeux", "Vif", "Agrumes", "Fruits blancs", "Floral", "Minéral"],
  defaut: ["Fruité", "Floral", "Épicé", "Boisé", "Minéral", "Frais", "Rond", "Puissant", "Soyeux"],
};
function sensationsPour(couleur) {
  const c = (couleur || "").toLowerCase();
  if (c.includes("rouge")) return SENSATIONS.rouge;
  if (c.includes("blanc")) return SENSATIONS.blanc;
  if (c.includes("ros")) return SENSATIONS["rosé"];
  if (c.includes("efferv") || c.includes("champ") || c.includes("crémant")) return SENSATIONS.effervescent;
  return SENSATIONS.defaut;
}

const fontCaps = {
  fontFamily: "'Open Sans', 'Segoe UI', sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.22em",
  fontWeight: 700,
};
const fontSerifIt = {
  fontFamily: "Gelasio, Georgia, serif",
  fontStyle: "italic",
  fontWeight: 400,
};
const fontBody = { fontFamily: "'Open Sans', 'Segoe UI', sans-serif" };

const fondTexture = {
  backgroundColor: C.fond,
  backgroundImage:
    "repeating-radial-gradient(circle at 50% -20%, rgba(255,255,255,0.016) 0px, rgba(255,255,255,0.016) 1px, transparent 1px, transparent 110px)",
};

const tuile = {
  background: `linear-gradient(160deg, ${C.carteH} 0%, ${C.carteB} 100%)`,
  border: `1px solid ${C.bord}`,
  borderRadius: 22,
  boxShadow: "0 14px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
};

const champ = {
  ...fontBody,
  width: "100%",
  boxSizing: "border-box",
  background: C.nuit,
  border: `1px solid ${C.filet}`,
  borderRadius: 12,
  color: C.blanc,
  padding: "11px 14px",
  fontSize: 14,
  outline: "none",
};

const boutonPlein = {
  ...fontCaps,
  letterSpacing: "0.18em",
  background: C.teal,
  color: C.nuit,
  border: "none",
  borderRadius: 12,
  padding: "12px 22px",
  fontSize: 13,
  cursor: "pointer",
};

const boutonLigne = {
  ...fontCaps,
  letterSpacing: "0.16em",
  background: "transparent",
  color: C.teal,
  border: `1px solid ${C.teal}66`,
  borderRadius: 12,
  padding: "10px 18px",
  fontSize: 12,
  cursor: "pointer",
};

/* ---------- utilitaires ---------- */

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function compresserImage(file, qualite = 0.8) {
  // Recadre systématiquement au format portrait 3:4 (centré) et redimensionne :
  // toutes les photos de la cave ont ainsi la même belle proportion.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const RATIO = 3 / 4; // largeur / hauteur
        let sx = 0, sy = 0, sw = img.width, sh = img.height;
        if (sw / sh > RATIO) {
          const nw = sh * RATIO;
          sx = (sw - nw) / 2;
          sw = nw;
        } else {
          const nh = sw / RATIO;
          sy = (sh - nh) / 2;
          sh = nh;
        }
        const outW = Math.min(720, Math.round(sw));
        const outH = Math.round(outW / RATIO);
        const cv = document.createElement("canvas");
        cv.width = outW;
        cv.height = outH;
        cv.getContext("2d").drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        resolve(cv.toDataURL("image/jpeg", qualite));
      };
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
}

function noteGuideSur100(brut) {
  // Convertit la note d'un guide vers l'échelle /100, quelle que soit l'échelle d'origine
  if (!brut) return null;
  const n = brut.replace(",", ".");
  let m = n.match(/([\d.]+)\s*\/\s*100/);
  if (m) return Math.round(parseFloat(m[1]));
  m = n.match(/([\d.]+)\s*\/\s*20/);
  if (m) return Math.round(parseFloat(m[1]) * 5);
  m = n.match(/([\d.]+)\s*\/\s*10\b/);
  if (m) return Math.round(parseFloat(m[1]) * 10);
  const etoiles = (brut.match(/★/g) || []).length;
  if (etoiles) return [null, 82, 88, 94][Math.min(etoiles, 3)];
  m = n.match(/([\d.]+)/);
  if (m) {
    const v = parseFloat(m[1]);
    if (v >= 50 && v <= 100) return Math.round(v);
  }
  return null;
}

const LAVANDE = "#ADA2E8";
const VERT_PRET = "#6FCF8F";

function statutApogee(apogee) {
  // Détermine où l'on se situe dans la fenêtre de dégustation
  if (!apogee) return null;
  const a = apogee.toLowerCase();
  const annee = new Date().getFullYear();
  const ans = (apogee.match(/(19|20)\d{2}/g) || []).map(Number);
  if (a.includes("maintenant") || a.includes("dès à présent") || a.includes("a point") || a.includes("à point")) {
    if (ans.length >= 1 && annee > Math.max(...ans)) return { etat: "passe", label: "apogée passée" };
    return { etat: "pret", label: "à point" };
  }
  if (ans.length >= 2) {
    const [d, f] = [Math.min(...ans), Math.max(...ans)];
    if (annee < d) return { etat: "jeune", label: "encore jeune" };
    if (annee > f) return { etat: "passe", label: "apogée passée" };
    return { etat: "pret", label: "à point" };
  }
  if (ans.length === 1) {
    if (annee < ans[0]) return { etat: "jeune", label: "encore jeune" };
    return { etat: "pret", label: "à point" };
  }
  return null;
}

function SymboleApogee({ etat }) {
  if (etat === "pret") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 9,
          height: 9,
          borderRadius: "50%",
          background: VERT_PRET,
          boxShadow: `0 0 6px ${VERT_PRET}66`,
          flexShrink: 0,
        }}
        aria-label="À point"
      />
    );
  }
  if (etat === "jeune") {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-label="Encore jeune" style={{ flexShrink: 0 }}>
        <path
          d="M6 3h12M6 21h12M7 3c0 5 4 6 5 9-1 3-5 4-5 9M17 3c0 5-4 6-5 9 1 3 5 4 5 9"
          stroke={OCRE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (etat === "passe") {
    return (
      <span
        style={{
          display: "inline-block",
          width: 9,
          height: 9,
          borderRadius: "50%",
          border: `2px solid ${ROUGE_CARTE}`,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
        aria-label="Apogée passée"
      />
    );
  }
  return null;
}

function infosMillesime(it) {
  // Millésime extrait (champ dédié ou détecté dans le détail) + appellation épurée
  const annee = it.millesime || (it.detail || "").match(/\b(19|20)\d{2}\b/)?.[0] || "";
  let appellation = it.detail || "";
  if (annee) {
    appellation = appellation
      .replace(new RegExp("\\s*[·,–-]?\\s*" + annee + "\\s*"), " ")
      .replace(/\s+·\s*$/, "")
      .trim();
  }
  return { annee, appellation };
}

function moyenne(avis) {
  const notes = (avis || []).filter((a) => a.note > 0);
  if (notes.length === 0) return null;
  return notes.reduce((s, a) => s + a.note, 0) / notes.length;
}

function srcAffiche(it) {
  // Photo officielle (via le relais /api/photo) si disponible, sinon la photo prise
  return it.photoOff ? `/api/photo?u=${encodeURIComponent(it.photoOff)}` : it.photo;
}

async function apiJson(url, options) {
  const r = await fetch(url, options);
  if (!r.ok) throw new Error(`API ${url} : ${r.status}`);
  return r.json();
}

/* ---------- pictos au trait (esprit FIDAL Apps) ---------- */

function PictoCave({ taille = 56, couleur = C.teal }) {
  // Logo : bouteille bourguignonne + verre à moitié plein (vin ocre)
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M15.3 1.5h3.9M15.3 1.5v5.5c0 6.2-4.3 8-4.3 14.2v20.5a2.8 2.8 0 0 0 2.8 2.8h6.9a2.8 2.8 0 0 0 2.8-2.8V21.2c0-6.2-4.3-8-4.3-14.2V1.5"
        stroke={couleur}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.3 30.5h7.9M13.3 35h4.5" stroke={couleur} strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
      <path d="M30.8 22.8h10.4c-.9 3.1-2.6 4.9-5.2 5.4-2.6-.5-4.3-2.3-5.2-5.4z" fill={OCRE} opacity="0.9" />
      <path
        d="M29.5 17h13c0 6.2-2.2 10.3-6.5 11.1v9.4m0 0h-4.6m4.6 0h4.6"
        stroke={couleur}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PictoBouteille({ taille = 22, couleur = C.teal }) {
  // Bouteille bourguignonne seule (formulaire)
  return (
    <svg width={taille} height={taille} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path
        d="M21.3 2.5h5.5M21.3 2.5v6c0 6.6-5 8.4-5 15v18a3 3 0 0 0 3 3h9.4a3 3 0 0 0 3-3v-18c0-6.6-5-8.4-5-15v-6"
        stroke={couleur}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M19 32h10M19 36.8h5.6" stroke={couleur} strokeWidth="2.4" strokeLinecap="round" opacity="0.65" />
    </svg>
  );
}

const ROUGE_CARTE = "#E2604C";

// Position approximative des vignobles sur la carte stylisée (viewBox 0 0 100 100)
const REGIONS_CARTE = [
  ["bordeaux", 30.2, 63.5],
  ["bordelais", 30.2, 63.5],
  ["médoc", 28.4, 60.0],
  ["saint-émilion", 33.1, 63.0],
  ["bourgogne", 66.4, 42.2],
  ["chablis", 59.5, 34.6],
  ["côte de nuits", 67.2, 40.7],
  ["côte de beaune", 66.4, 42.2],
  ["beaujolais", 65.0, 51.2],
  ["mâcon", 66.4, 49.2],
  ["champagne", 60.6, 22.7],
  ["alsace", 83.3, 32.0],
  ["loire", 38.7, 38.7],
  ["sancerre", 53.0, 39.3],
  ["muscadet", 23.7, 40.4],
  ["anjou", 30.3, 37.9],
  ["touraine", 38.7, 38.7],
  ["vouvray", 39.4, 38.5],
  ["rhône", 66.4, 62.6],
  ["hermitage", 66.4, 61.2],
  ["châteauneuf", 66.4, 71.1],
  ["côte-rôtie", 66.2, 57.3],
  ["provence", 74.2, 76.5],
  ["bandol", 72.5, 80.0],
  ["languedoc", 57.5, 76.5],
  ["roussillon", 53.4, 84.4],
  ["sud-ouest", 40.8, 72.6],
  ["cahors", 43.7, 67.3],
  ["madiran", 33.7, 76.0],
  ["gascogne", 34.1, 74.5],
  ["jurançon", 31.4, 78.7],
  ["jura", 72.7, 43.5],
  ["savoie", 74.2, 56.1],
  ["cognac", 31.9, 55.2],
  ["charentes", 31.9, 55.2],
  ["armagnac", 34.7, 73.1],
  ["corse", 93.6, 89.1],
];

function pointRegion(region) {
  const r = (region || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!r) return null;
  for (const [nom, x, y] of REGIONS_CARTE) {
    const n = nom.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (r.includes(n)) return { x, y };
  }
  return null;
}

function CarteFrance({ region, taille = 64 }) {
  const pt = pointRegion(region);
  if (!pt) return null;
  return (
    <svg width={taille} height={taille} viewBox="0 0 100 100" fill="none" aria-label={`Vignoble : ${region}`}>
      {/* France métropolitaine (contour géographique réel simplifié) */}
      <path
        d="M81.8 37.6 L74.9 46.6 L73.9 50.9 L76.2 50.0 L76.2 48.6 L79.6 48.4 L81.2 53.0 L79.6 54.9 L82.1 58.0 L81.4 59.9 L78.4 60.9 L81.0 63.6 L79.9 66.5 L80.9 69.3 L85.5 69.9 L84.4 73.7 L79.2 77.3 L78.5 79.7 L75.2 81.1 L69.8 79.3 L69.6 77.9 L66.6 76.9 L66.5 78.1 L65.2 78.0 L60.9 76.0 L54.8 80.5 L55.3 86.8 L47.5 87.7 L45.7 85.1 L38.8 82.7 L38.5 84.4 L30.3 83.5 L29.0 81.7 L24.4 80.9 L24.8 78.8 L22.5 78.5 L24.4 75.1 L25.7 66.3 L27.4 65.3 L26.3 64.1 L25.6 65.5 L27.5 56.3 L25.8 55.1 L26.6 49.4 L21.9 47.4 L19.7 44.2 L20.8 42.2 L19.0 41.2 L19.6 39.9 L17.0 39.7 L17.9 37.7 L15.2 37.8 L14.6 37.1 L16.1 36.3 L14.2 36.1 L13.1 37.9 L13.1 35.2 L12.6 36.2 L11.4 34.4 L11.0 35.7 L10.4 34.1 L10.4 35.1 L8.3 34.8 L6.5 32.9 L6.1 34.7 L4.8 34.7 L4.1 32.4 L2.4 32.4 L5.5 31.3 L3.1 30.0 L6.7 30.3 L4.3 29.6 L5.5 28.5 L2.0 28.7 L3.7 26.6 L7.5 25.7 L8.3 26.9 L10.6 24.6 L13.5 24.2 L13.2 25.4 L13.9 24.8 L16.1 28.0 L18.6 26.1 L20.7 28.0 L21.1 26.0 L25.0 26.6 L23.6 25.5 L23.6 20.9 L21.1 16.0 L25.6 16.3 L26.5 19.6 L33.5 20.2 L36.3 18.8 L34.5 18.1 L35.4 16.1 L45.3 11.6 L44.6 4.9 L51.1 2.8 L52.7 6.3 L55.1 5.7 L58.9 10.4 L62.2 10.7 L62.1 13.8 L65.5 13.4 L66.3 11.7 L66.5 15.4 L70.6 18.2 L75.8 18.1 L79.1 21.5 L83.9 21.3 L89.1 23.3 L84.7 31.6 L84.8 36.9 L83.5 38.3 Z"
        fill="#0E1C2E"
        stroke="#3A557A"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* Corse */}
      <path d="M96.9 92.4 L96.0 96.8 L94.9 97.0 L92.8 95.3 L93.7 94.1 L92.0 93.6 L92.9 92.1 L91.6 92.1 L92.6 90.6 L91.2 88.8 L92.3 85.5 L96.4 84.4 L97.1 81.2 L98.0 89.2 Z" fill="#0E1C2E" stroke="#3A557A" strokeWidth="1.1" strokeLinejoin="round" />
      {/* Zone du vignoble */}
      <circle cx={pt.x} cy={pt.y} r="9" fill={ROUGE_CARTE} opacity="0.25" />
      <circle cx={pt.x} cy={pt.y} r="4.5" fill={ROUGE_CARTE} />
    </svg>
  );
}

function Coeur({ plein, taille = 18 }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill={plein ? OCRE : "none"} aria-hidden="true">
      <path
        d="M12 20.5C7 16.5 3.5 13.3 3.5 9.6 3.5 7 5.5 5 8 5c1.6 0 3.1.8 4 2.1C12.9 5.8 14.4 5 16 5c2.5 0 4.5 2 4.5 4.6 0 3.7-3.5 6.9-8.5 10.9z"
        stroke={plein ? OCRE : C.gris}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ============================================================ */

export default function App() {
  const [ecran, setEcran] = useState("accueil"); // accueil | cave
  const [prenom, setPrenom] = useState(() => localStorage.getItem("pa:nom") || "");
  const [associes, setAssocies] = useState([]);
  const [assocChargement, setAssocChargement] = useState(true);
  const [saisieLibre, setSaisieLibre] = useState(false);
  const [items, setItems] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [tri, setTri] = useState("recents"); // recents | aimes | notes
  const [recherche, setRecherche] = useState("");
  const [filtreCouleur, setFiltreCouleur] = useState("");
  const [filtreRegion, setFiltreRegion] = useState("");
  const [compact, setCompact] = useState(false);
  const [deplies, setDeplies] = useState({});
  const [formOuvert, setFormOuvert] = useState(false);
  const [zoom, setZoom] = useState(null);
  const [aimes, setAimes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pa:aimes") || "{}");
    } catch {
      return {};
    }
  });
  const [avisOuvert, setAvisOuvert] = useState(null);
  const [editionId, setEditionId] = useState(null);
  const [eNom, setENom] = useState("");
  const [eDetail, setEDetail] = useState("");
  const [aNote, setANote] = useState(0);
  const [aTexte, setATexte] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);

  // formulaire d'ajout
  const [fPhoto, setFPhoto] = useState(null);
  const [fNom, setFNom] = useState("");
  const [fDetail, setFDetail] = useState("");
  const [fInfos, setFInfos] = useState(null); // identification de l'étiquette
  const [analyse, setAnalyse] = useState(false);
  const [fSensations, setFSensations] = useState([]);
  const [fNote, setFNote] = useState(0); // 0 = pas encore notée
  const [fCommentaire, setFCommentaire] = useState("");
  const fichierRef = useRef(null);

  /* ---------- liste des associés (Drive, via le serveur) ---------- */

  async function chargerAssocies() {
    try {
      const data = await apiJson("/api/associes");
      if (Array.isArray(data.associes) && data.associes.length) setAssocies(data.associes);
    } catch {
      /* liste indisponible : la saisie libre reste possible */
    }
    setAssocChargement(false);
  }

  useEffect(() => {
    chargerAssocies();
  }, []);

  /* ---------- la cave (Postgres, via le serveur) ---------- */

  async function chargerCave() {
    setChargement(true);
    setErreur("");
    try {
      const data = await apiJson("/api/items");
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setErreur("La cave n'a pas pu être ouverte. Réessayez dans un instant.");
    }
    setChargement(false);
  }

  useEffect(() => {
    if (ecran === "cave") chargerCave();
  }, [ecran]);

  /* ---------- identification de l'étiquette ---------- */

  async function analyserEtiquette(dataUrl) {
    setAnalyse(true);
    setFInfos(null);
    try {
      const base64 = dataUrl.split(",")[1];
      const j = await apiJson("/api/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });
      if (j && (j.nom || j.appellation)) {
        setFInfos(j);
        if (j.nom) setFNom(j.nom);
        const detail = [j.appellation, j.millesime].filter(Boolean).join(" · ");
        if (detail) setFDetail(detail);
      }
    } catch {
      /* identification impossible : saisie manuelle */
    }
    setAnalyse(false);
  }

  /* ---------- publication ---------- */

  async function publierBouteille() {
    if (!fPhoto || !fNom.trim()) return;
    setEnregistrement(true);
    setErreur("");
    try {
      const avisInitial = [];
      if (fNote > 0 || fCommentaire.trim()) {
        avisInitial.push({ par: prenom || "Anonyme", note: fNote, texte: fCommentaire.trim(), date: Date.now() });
      }
      const it = {
        id: genId(),
        nom: fNom.trim(),
        detail: fDetail.trim(),
        region: fInfos?.region || "",
        couleur: fInfos?.couleur || "",
        millesime: fInfos?.millesime || "",
        guide: fInfos?.guide || "",
        noteGuide: fInfos?.noteGuide || "",
        commentaireGuide: fInfos?.commentaireGuide || "",
        prixMoyen: fInfos?.prixMoyen || "",
        accords: fInfos?.accords || "",
        apogee: fInfos?.apogee || "",
        photoOff: fInfos?.photoUrl && /^https:\/\//.test(fInfos.photoUrl) ? fInfos.photoUrl : "",
        sensations: fSensations,
        photo: fPhoto,
        par: prenom || "Anonyme",
        date: Date.now(),
        likes: 0,
        avis: avisInitial,
      };
      await apiJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", item: it }),
      });
      setItems((prev) => [it, ...prev]);
      setFPhoto(null);
      setFNom("");
      setFDetail("");
      setFInfos(null);
      setFSensations([]);
      setFNote(0);
      setFCommentaire("");
      setFormOuvert(false);
    } catch {
      setErreur("Partage impossible — la photo est peut-être trop lourde. Réessayez.");
    }
    setEnregistrement(false);
  }

  async function aimer(id) {
    if (aimes[id]) return;
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const maj = { ...it, likes: (it.likes || 0) + 1 };
    const nouveauxAimes = { ...aimes, [id]: true };
    setAimes(nouveauxAimes);
    localStorage.setItem("pa:aimes", JSON.stringify(nouveauxAimes));
    setItems((prev) => prev.map((x) => (x.id === id ? maj : x)));
    try {
      await apiJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", id }),
      });
    } catch {
      /* silencieux */
    }
  }

  async function publierAvis(id) {
    if (!aTexte.trim() || aNote === 0) return;
    setEnregistrement(true);
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const avis = { par: prenom || "Anonyme", note: aNote, texte: aTexte.trim(), date: Date.now() };
    const maj = { ...it, avis: [...(it.avis || []), avis] };
    setItems((prev) => prev.map((x) => (x.id === id ? maj : x)));
    setAvisOuvert(null);
    setANote(0);
    setATexte("");
    try {
      await apiJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "avis", id, avis }),
      });
    } catch {
      setErreur("L'avis n'a pas pu être enregistré.");
    }
    setEnregistrement(false);
  }

  function estProprietaire(it) {
    return !!prenom && (prenom === it.par || prenom === "Jean-François Dumetz");
  }

  async function retirerBouteille(id) {
    if (!window.confirm("Retirer définitivement cette bouteille de la masse ?")) return;
    setItems((prev) => prev.filter((x) => x.id !== id));
    try {
      await apiJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
    } catch {
      setErreur("La suppression n'a pas pu être enregistrée.");
      chargerCave();
    }
  }

  async function corrigerBouteille(id) {
    if (!eNom.trim()) return;
    setEnregistrement(true);
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, nom: eNom.trim(), detail: eDetail.trim() } : x)));
    setEditionId(null);
    try {
      await apiJson("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id, champs: { nom: eNom.trim(), detail: eDetail.trim() } }),
      });
    } catch {
      setErreur("La correction n'a pas pu être enregistrée.");
      chargerCave();
    }
    setEnregistrement(false);
  }

  const triés = [...items].sort((a, b) => {
    if (tri === "aimes") return (b.likes || 0) - (a.likes || 0);
    if (tri === "notes") return (moyenne(b.avis) || 0) - (moyenne(a.avis) || 0);
    return b.date - a.date;
  });

  const regionsPresentes = [...new Set(items.map((i) => i.region).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fr")
  );

  const filtrés = triés.filter((it) => {
    if (filtreCouleur && !(it.couleur || "").toLowerCase().includes(filtreCouleur)) return false;
    if (filtreRegion && it.region !== filtreRegion) return false;
    const q = recherche.trim().toLowerCase();
    if (q) {
      const txt = [it.nom, it.detail, it.region, it.par, (it.sensations || []).join(" ")]
        .join(" ")
        .toLowerCase();
      if (!txt.includes(q)) return false;
    }
    return true;
  });

  /* ---------- écran d'accueil ---------- */

  if (ecran === "accueil") {
    return (
      <div
        style={{
          ...fondTexture,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            ...tuile,
            width: 108,
            height: 108,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 34,
          }}
        >
          <PictoCave />
        </div>
        <h1 style={{ ...fontCaps, color: C.blanc, fontSize: 24, margin: 0, letterSpacing: "0.26em", textAlign: "center" }}>
          PARTAGE AMIABLE
        </h1>
        <p style={{ ...fontSerifIt, color: C.gris, fontSize: 19, margin: "10px 0 40px" }}>
          D'authentiques bons choix
        </p>
        {!saisieLibre ? (
          <select
            style={{
              ...champ,
              maxWidth: 280,
              textAlign: "center",
              marginBottom: 16,
              appearance: "none",
              WebkitAppearance: "none",
              cursor: "pointer",
            }}
            value={prenom}
            onChange={(e) => {
              if (e.target.value === "__autre__") {
                setSaisieLibre(true);
                setPrenom("");
              } else {
                setPrenom(e.target.value);
                localStorage.setItem("pa:nom", e.target.value);
              }
            }}
          >
            <option value="" disabled>
              {assocChargement && associes.length === 0 ? "Chargement des associés…" : "À la requête de…"}
            </option>
            {associes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            {prenom && !associes.includes(prenom) && <option value={prenom}>{prenom}</option>}
            <option value="__autre__">Autre…</option>
          </select>
        ) : (
          <input
            style={{ ...champ, maxWidth: 280, textAlign: "center", marginBottom: 16 }}
            placeholder="Votre prénom"
            autoFocus
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prenom.trim()) {
                localStorage.setItem("pa:nom", prenom.trim());
                setEcran("cave");
              }
            }}
          />
        )}
        <button
          style={boutonPlein}
          onClick={() => {
            localStorage.setItem("pa:nom", prenom.trim());
            setEcran("cave");
          }}
          disabled={!prenom.trim()}
        >
          Déclarer un actif à partager
        </button>
        <span style={{ ...fontCaps, color: C.grisFonce, fontSize: 9, letterSpacing: "0.3em", marginTop: 60 }}>
          FIDAL NOTAIRES
        </span>
      </div>
    );
  }

  /* ---------- catalogue imprimable ---------- */

  if (ecran === "catalogue") {
    const NAVY = "#13233A";
    const parRegion = {};
    for (const it of [...items].sort((a, b) => (moyenne(b.avis) || 0) - (moyenne(a.avis) || 0))) {
      const r = it.region || "Autres";
      (parRegion[r] = parRegion[r] || []).push(it);
    }
    const regions = Object.keys(parRegion).sort((a, b) => a.localeCompare(b, "fr"));
    return (
      <div style={{ background: "#FFFFFF", color: NAVY, minHeight: "100vh", ...fontBody }}>
        <style>{`
          @media print {
            .no-print { display: none !important; }
            article { break-inside: avoid; }
            @page { margin: 18mm; }
          }
        `}</style>

        {/* barre d'actions (masquée à l'impression) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            padding: "16px 24px",
            borderBottom: "1px solid #E3E8EF",
          }}
        >
          <button
            onClick={() => setEcran("cave")}
            style={{ ...boutonLigne, color: NAVY, border: `1px solid ${NAVY}55` }}
          >
            Retour à la cave
          </button>
          <button onClick={() => window.print()} style={{ ...boutonPlein, background: NAVY, color: "#fff" }}>
            Imprimer / PDF
          </button>
        </div>

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "36px 24px 60px" }}>
          <header style={{ textAlign: "center", marginBottom: 36 }}>
            <h1 style={{ ...fontCaps, fontSize: 24, letterSpacing: "0.28em", margin: 0, color: NAVY }}>
              PARTAGE AMIABLE
            </h1>
            <p style={{ ...fontSerifIt, fontSize: 17, color: "#5E7287", margin: "6px 0 0" }}>
              Catalogue de la cave · {new Date().toLocaleDateString("fr-FR")}
            </p>
            <p style={{ ...fontCaps, fontSize: 9, letterSpacing: "0.3em", color: "#9AA8B8", margin: "10px 0 0" }}>
              FIDAL NOTAIRES · {items.length} BOUTEILLE{items.length > 1 ? "S" : ""}
            </p>
          </header>

          {regions.map((r) => (
            <section key={r} style={{ marginBottom: 30 }}>
              <h2
                style={{
                  ...fontCaps,
                  fontSize: 12,
                  letterSpacing: "0.24em",
                  color: NAVY,
                  borderBottom: `2px solid ${NAVY}`,
                  paddingBottom: 6,
                  margin: "0 0 16px",
                }}
              >
                {r}
              </h2>
              {parRegion[r].map((it) => {
                const moy = moyenne(it.avis);
                return (
                  <article key={it.id} style={{ display: "flex", gap: 14, marginBottom: 18 }}>
                    <img
                      src={srcAffiche(it)}
                      alt=""
                      onError={(e) => {
                        if (it.photo && e.currentTarget.src !== it.photo) e.currentTarget.src = it.photo;
                      }}
                      style={{
                        width: 44,
                        height: 58,
                        objectFit: "cover",
                        borderRadius: 6,
                        border: "1px solid #E3E8EF",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                        <strong style={{ ...fontCaps, fontSize: 12, letterSpacing: "0.1em" }}>{it.nom}</strong>
                        {it.detail && (
                          <span style={{ ...fontSerifIt, fontSize: 13.5, color: "#5E7287" }}>{it.detail}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 11.5, color: "#8A97A8", margin: "3px 0" }}>
                        {[it.couleur, it.prixMoyen ? `≈ ${it.prixMoyen}` : "", it.apogee ? `à boire ${it.apogee}${statutApogee(it.apogee) ? " (" + statutApogee(it.apogee).label + ")" : ""}` : "", it.accords ? `accords : ${it.accords}` : ""]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {(it.noteGuide || moy !== null) && (
                        <p style={{ fontSize: 12.5, margin: "3px 0", color: NAVY }}>
                          {it.noteGuide && (
                            <strong>
                              {it.guide ? `${it.guide} · ` : ""}
                              {noteGuideSur100(it.noteGuide) !== null ? `${noteGuideSur100(it.noteGuide)}/100` : it.noteGuide}
                            </strong>
                          )}
                          {it.noteGuide && moy !== null && " — "}
                          {moy !== null &&
                            `FIDAL Notaires : ${Math.round(moy * 10)}/100 (${it.avis.filter((a) => a.note > 0).length} avis)`}
                        </p>
                      )}
                      {it.commentaireGuide && (
                        <p style={{ ...fontSerifIt, fontSize: 13, color: "#5E7287", margin: "3px 0" }}>
                          « {it.commentaireGuide} »
                        </p>
                      )}
                      {(it.avis || [])
                        .filter((a) => a.texte)
                        .map((a, i) => (
                          <p key={i} style={{ fontSize: 12, color: "#5E7287", margin: "3px 0" }}>
                            <span style={{ ...fontCaps, fontSize: 9.5, letterSpacing: "0.12em", color: NAVY }}>
                              {a.par}
                            </span>
                            {a.note > 0 ? ` — ${a.note}/10` : ""} : <em style={fontSerifIt}>{a.texte}</em>
                          </p>
                        ))}
                      <p style={{ fontSize: 10.5, color: "#9AA8B8", margin: "4px 0 0" }}>
                        Rapporté par {it.par} le {new Date(it.date).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                  </article>
                );
              })}
            </section>
          ))}

          <footer style={{ ...fontCaps, fontSize: 8.5, letterSpacing: "0.26em", color: "#9AA8B8", textAlign: "center", marginTop: 40 }}>
            FIDAL NOTAIRES · L'ABUS D'ALCOOL EST DANGEREUX POUR LA SANTÉ
          </footer>
        </div>
      </div>
    );
  }

  /* ---------- la cave ---------- */

  return (
    <div style={{ ...fondTexture, minHeight: "100vh", color: C.blanc, ...fontBody }}>
      <style>{`
        button:disabled { opacity: .45; cursor: default; }
        button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }
      `}</style>

      {/* en-tête */}
      <header style={{ padding: "26px 20px 6px", maxWidth: 680, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ ...fontCaps, fontSize: 17, margin: 0, letterSpacing: "0.22em" }}>PARTAGE AMIABLE</h1>
            <p style={{ ...fontSerifIt, color: C.gris, fontSize: 15, margin: "4px 0 0" }}>
              D'authentiques bons choix
            </p>
          </div>
          <button style={boutonPlein} onClick={() => setFormOuvert((v) => !v)}>
            {formOuvert ? "Fermer" : "Nouveau rapport"}
          </button>
        </div>

        {/* tris + affichage */}
        <nav style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap", alignItems: "center" }}>
          {[
            ["recents", "Plus récents"],
            ["aimes", "Plus aimés"],
            ["notes", "Mieux notés"],
          ].map(([k, lib]) => (
            <button
              key={k}
              onClick={() => setTri(k)}
              style={{
                ...fontCaps,
                fontSize: 10,
                letterSpacing: "0.18em",
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
                background: tri === k ? C.teal : "transparent",
                color: tri === k ? C.nuit : C.gris,
                border: `1px solid ${tri === k ? C.teal : C.filet}`,
              }}
            >
              {lib}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button
            onClick={() => setCompact((v) => !v)}
            title="Basculer l'affichage compact"
            style={{
              ...fontCaps,
              fontSize: 10,
              letterSpacing: "0.18em",
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              background: compact ? C.teal : "transparent",
              color: compact ? C.nuit : C.gris,
              border: `1px solid ${compact ? C.teal : C.filet}`,
            }}
          >
            Compact
          </button>
          <button
            onClick={() => setEcran("catalogue")}
            style={{
              ...fontCaps,
              fontSize: 10,
              letterSpacing: "0.18em",
              padding: "8px 14px",
              borderRadius: 999,
              cursor: "pointer",
              background: "transparent",
              color: C.gris,
              border: `1px solid ${C.filet}`,
            }}
          >
            Catalogue
          </button>
        </nav>

        {/* recherche + filtres */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            style={{ ...champ, flex: "1 1 180px", padding: "9px 14px", fontSize: 13 }}
            placeholder="Rechercher (domaine, appellation, associé…)"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
          />
          {regionsPresentes.length > 1 && (
            <select
              style={{ ...champ, width: "auto", padding: "9px 12px", fontSize: 13, cursor: "pointer" }}
              value={filtreRegion}
              onChange={(e) => setFiltreRegion(e.target.value)}
            >
              <option value="">Toutes régions</option>
              {regionsPresentes.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {[
            ["", "Tous"],
            ["rouge", "Rouge"],
            ["blanc", "Blanc"],
            ["ros", "Rosé"],
            ["efferv", "Bulles"],
          ].map(([k, lib]) => (
            <button
              key={lib}
              onClick={() => setFiltreCouleur(k)}
              style={{
                ...fontBody,
                fontSize: 12,
                padding: "6px 13px",
                borderRadius: 999,
                cursor: "pointer",
                background: filtreCouleur === k ? C.teal : "transparent",
                color: filtreCouleur === k ? C.nuit : C.gris,
                border: `1px solid ${filtreCouleur === k ? C.teal : C.filet}`,
              }}
            >
              {lib}
            </button>
          ))}
        </div>
      </header>

      {/* formulaire : nouveau rapport */}
      {formOuvert && (
        <section style={{ ...tuile, maxWidth: 640, margin: "18px auto 0", padding: 22, marginLeft: "auto", marginRight: "auto" }}>
          <h2 style={{ ...fontCaps, fontSize: 12, color: C.teal, margin: "0 0 16px", letterSpacing: "0.24em" }}>
            Rapport à la masse
          </h2>
          <input
            ref={fichierRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const img = await compresserImage(f);
                setFPhoto(img);
                analyserEtiquette(img);
              } catch {
                setErreur("La photo n'a pas pu être lue.");
              }
              e.target.value = "";
            }}
          />

          {/* 1 — La photo, toujours visible */}
          <div
            onClick={() => fichierRef.current?.click()}
            style={{
              border: fPhoto ? `1px solid ${C.filet}` : `1.5px dashed ${C.filet}`,
              borderRadius: 14,
              height: fPhoto ? "auto" : 150,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              overflow: "hidden",
              background: C.nuit,
            }}
          >
            {fPhoto ? (
              <img src={fPhoto} alt="Étiquette" style={{ width: "100%", display: "block", maxHeight: 360, objectFit: "contain" }} />
            ) : (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                <PictoBouteille taille={30} />
                <span style={{ ...fontCaps, fontSize: 10, color: C.gris, letterSpacing: "0.2em" }}>
                  Photographier l'étiquette
                </span>
              </span>
            )}
          </div>
          {fPhoto && (
            <p style={{ ...fontSerifIt, color: C.grisFonce, fontSize: 12.5, margin: "6px 0 0", textAlign: "center" }}>
              Touchez la photo pour la reprendre
            </p>
          )}

          {fPhoto && (
            <div style={{ marginTop: 16 }}>
              {/* 2 — Les précisions, pré-remplies par la lecture de l'étiquette */}
              {analyse ? (
                <p style={{ ...fontSerifIt, color: C.teal, fontSize: 14, margin: "0 0 12px" }}>
                  Lecture de l'étiquette et identification du vin…
                </p>
              ) : (
                fInfos &&
                (fInfos.nom || fInfos.appellation) && (
                  <p style={{ ...fontSerifIt, color: C.gris, fontSize: 13.5, margin: "0 0 12px" }}>
                    Identifié{fInfos.confiance === "basse" ? " (à vérifier)" : ""}
                    {[
                      fInfos.region,
                      fInfos.couleur,
                      fInfos.noteGuide ? `${fInfos.guide || "guide"} ${fInfos.noteGuide}` : "",
                      fInfos.prixMoyen ? `≈ ${fInfos.prixMoyen}` : "",
                    ].filter(Boolean).length > 0
                      ? " : " +
                        [
                          fInfos.region,
                          fInfos.couleur,
                          fInfos.noteGuide ? `${fInfos.guide || "guide"} ${fInfos.noteGuide}` : "",
                          fInfos.prixMoyen ? `≈ ${fInfos.prixMoyen}` : "",
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      : ""}{" "}
                    — corrigez si besoin.
                  </p>
                )
              )}
              <input
                style={{ ...champ, marginBottom: 10 }}
                placeholder="Domaine, cuvée…"
                value={fNom}
                onChange={(e) => setFNom(e.target.value)}
              />
              <input
                style={{ ...champ, marginBottom: 18 }}
                placeholder="Appellation · millésime"
                value={fDetail}
                onChange={(e) => setFDetail(e.target.value)}
              />

              {/* 3 — Sensations : une ou deux parmi les 9 du type de vin */}
              <h3 style={{ ...fontCaps, fontSize: 10, color: C.teal, letterSpacing: "0.22em", margin: "0 0 10px" }}>
                Sensations <span style={{ color: C.grisFonce }}>· une ou deux</span>
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {sensationsPour(fInfos?.couleur).map((sn) => {
                  const actif = fSensations.includes(sn);
                  return (
                    <button
                      key={sn}
                      onClick={() =>
                        setFSensations((prev) => {
                          if (prev.includes(sn)) return prev.filter((x) => x !== sn);
                          if (prev.length < 2) return [...prev, sn];
                          return [prev[1], sn];
                        })
                      }
                      style={{
                        ...fontBody,
                        fontSize: 13,
                        padding: "7px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        background: actif ? C.teal : "transparent",
                        color: actif ? C.nuit : C.gris,
                        border: `1px solid ${actif ? C.teal : C.filet}`,
                        fontWeight: actif ? 700 : 400,
                      }}
                    >
                      {sn}
                    </button>
                  );
                })}
              </div>

              {/* 4 — La note */}
              <h3 style={{ ...fontCaps, fontSize: 10, color: C.teal, letterSpacing: "0.22em", margin: "0 0 10px" }}>
                Votre note
              </h3>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={fNote || 1}
                  onChange={(e) => setFNote(Number(e.target.value))}
                  style={{ flex: 1, accentColor: C.teal, cursor: "pointer" }}
                  aria-label="Note de 1 à 10"
                />
                <span
                  style={{
                    ...fontCaps,
                    fontSize: 20,
                    letterSpacing: "0.06em",
                    color: fNote > 0 ? OCRE : C.grisFonce,
                    minWidth: 74,
                    textAlign: "right",
                  }}
                >
                  {fNote > 0 ? `${fNote}/10` : "—"}
                </span>
              </div>

              {/* 5 — Complément éventuel */}
              <textarea
                style={{ ...champ, minHeight: 70, resize: "vertical", marginBottom: 18 }}
                placeholder="Un mot sur ce vin… (facultatif)"
                value={fCommentaire}
                onChange={(e) => setFCommentaire(e.target.value)}
              />

              {/* 6 — Partage */}
              <button style={{ ...boutonPlein, width: "100%" }} onClick={publierBouteille} disabled={enregistrement || !fNom.trim()}>
                {enregistrement ? "Partage en cours…" : "Partager"}
              </button>
            </div>
          )}
        </section>
      )}

      {erreur && (
        <p style={{ maxWidth: 640, margin: "14px auto 0", color: OCRE, fontSize: 13, padding: "0 20px" }}>{erreur}</p>
      )}

      {/* flux */}
      <main style={{ maxWidth: 680, margin: "0 auto", padding: "22px 20px 40px", display: "grid", gap: 18 }}>
        {chargement ? (
          <p style={{ ...fontSerifIt, color: C.gris, textAlign: "center", fontSize: 16 }}>Ouverture de la cave…</p>
        ) : filtrés.length === 0 ? (
          <div style={{ ...tuile, padding: "50px 20px", textAlign: "center" }}>
            <PictoCave taille={52} couleur={C.tealDim} />
            {items.length === 0 ? (
              <>
                <p style={{ ...fontSerifIt, color: C.gris, fontSize: 17, margin: "18px 0 6px" }}>La masse à partager est vide.</p>
                <p style={{ color: C.grisFonce, fontSize: 13, margin: 0 }}>Soyez le premier à faire rapport d'une bouteille.</p>
              </>
            ) : (
              <>
                <p style={{ ...fontSerifIt, color: C.gris, fontSize: 17, margin: "18px 0 6px" }}>Aucune bouteille ne correspond.</p>
                <p style={{ color: C.grisFonce, fontSize: 13, margin: 0 }}>Essayez d'élargir la recherche ou les filtres.</p>
              </>
            )}
          </div>
        ) : (
          filtrés.map((it) => {
            const moy = moyenne(it.avis);

            // Mode compact : carte repliée, un clic pour déplier
            if (compact && !deplies[it.id]) {
              return (
                <article
                  key={it.id}
                  onClick={() => setDeplies((d) => ({ ...d, [it.id]: true }))}
                  style={{ ...tuile, overflow: "hidden", cursor: "pointer" }}
                >
                  <div style={{ display: "flex", gap: 12, padding: 12, alignItems: "center" }}>
                    <img
                      src={srcAffiche(it)}
                      alt={it.nom}
                      onError={(e) => {
                        if (it.photo && e.currentTarget.src !== it.photo) e.currentTarget.src = it.photo;
                      }}
                      style={{
                        width: 46,
                        height: 60,
                        objectFit: it.photoOff ? "contain" : "cover",
                        borderRadius: 8,
                        border: `1px solid ${C.filet}`,
                        flexShrink: 0,
                        background: it.photoOff ? "#FFFFFF" : C.nuit,
                        padding: it.photoOff ? 2 : 0,
                        boxSizing: "border-box",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3
                        style={{
                          ...fontCaps,
                          fontSize: 12,
                          letterSpacing: "0.12em",
                          margin: 0,
                          color: C.blanc,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {it.nom}
                      </h3>
                      {it.detail && (
                        <p style={{ ...fontSerifIt, color: C.gris, fontSize: 13, margin: "2px 0 0" }}>{it.detail}</p>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {it.noteGuide && (
                        <div style={{ ...fontBody, fontSize: 11, fontWeight: 700, color: OCRE }}>
                          {it.guide ? `${it.guide} ` : ""}
                          {noteGuideSur100(it.noteGuide) !== null ? `${noteGuideSur100(it.noteGuide)}/100` : it.noteGuide}
                        </div>
                      )}
                      {moy !== null && (
                        <div style={{ ...fontBody, color: OCRE, fontWeight: 700, fontSize: 11 }}>
                          FIDAL {Math.round(moy * 10)}/100
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            }

            return (
              <article key={it.id} style={{ ...tuile, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 16, padding: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <img
                      src={srcAffiche(it)}
                      alt={it.nom}
                      onError={(e) => {
                        if (it.photo && e.currentTarget.src !== it.photo) e.currentTarget.src = it.photo;
                      }}
                      onClick={(e) => setZoom(e.currentTarget.src)}
                      style={{
                        width: 96,
                        height: 128,
                        objectFit: it.photoOff ? "contain" : "cover",
                        borderRadius: 12,
                        border: `1px solid ${C.filet}`,
                        cursor: "zoom-in",
                        background: it.photoOff ? "#FFFFFF" : C.nuit,
                        padding: it.photoOff ? 4 : 0,
                        boxSizing: "border-box",
                      }}
                    />
                    <CarteFrance region={it.region} taille={84} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      onClick={compact ? () => setDeplies((d) => ({ ...d, [it.id]: false })) : undefined}
                      style={{
                        ...fontCaps,
                        fontSize: 14,
                        letterSpacing: "0.14em",
                        margin: "2px 0 2px",
                        color: C.blanc,
                        cursor: compact ? "pointer" : "default",
                      }}
                    >
                      {it.nom}
                    </h3>
                    {(() => {
                      const { annee, appellation } = infosMillesime(it);
                      return (
                        <>
                          {appellation && (
                            <p style={{ ...fontSerifIt, color: C.gris, fontSize: 14, margin: "0 0 4px" }}>{appellation}</p>
                          )}
                          {(annee || it.prixMoyen) && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: 14, margin: "0 0 6px" }}>
                              {annee && (
                                <span style={{ ...fontCaps, color: C.blanc, fontSize: 19, letterSpacing: "0.1em" }}>
                                  {annee}
                                </span>
                              )}
                              {it.prixMoyen && (
                                <span style={{ ...fontBody, color: C.teal, fontWeight: 700, fontSize: 16 }}>
                                  ≈ {it.prixMoyen}
                                </span>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {(it.region || it.couleur) && (
                      <p style={{ ...fontCaps, color: C.grisFonce, fontSize: 9, letterSpacing: "0.2em", margin: "0 0 6px" }}>
                        {[it.region, it.couleur].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {it.sensations && it.sensations.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "0 0 8px" }}>
                        {it.sensations.map((sn) => (
                          <span
                            key={sn}
                            style={{
                              ...fontBody,
                              fontSize: 11,
                              padding: "3px 10px",
                              borderRadius: 999,
                              color: C.teal,
                              border: `1px solid ${C.teal}55`,
                            }}
                          >
                            {sn}
                          </span>
                        ))}
                      </div>
                    )}
                    {it.commentaireGuide && (
                      <p style={{ ...fontSerifIt, color: C.gris, fontSize: 13.5, margin: "0 0 8px" }}>
                        « {it.commentaireGuide} »{it.guide ? ` — ${it.guide}` : ""}
                      </p>
                    )}
                    {it.accords && (
                      <p style={{ ...fontSerifIt, color: C.grisFonce, fontSize: 13, margin: "0 0 6px" }}>
                        Accords : {it.accords}
                      </p>
                    )}
                    {it.apogee &&
                      (() => {
                        const st = statutApogee(it.apogee);
                        return (
                          <p
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 7,
                              color: LAVANDE,
                              fontSize: 13,
                              margin: "0 0 8px",
                              ...fontBody,
                            }}
                          >
                            {st && <SymboleApogee etat={st.etat} />}
                            <span>
                              À boire : {it.apogee}
                              {st && (
                                <span style={{ color: C.grisFonce, fontStyle: "italic" }}> — {st.label}</span>
                              )}
                            </span>
                          </p>
                        );
                      })()}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      {(() => {
                        const nGuide = noteGuideSur100(it.noteGuide);
                        const pastille = {
                          ...fontBody,
                          fontSize: 12.5,
                          fontWeight: 700,
                          padding: "5px 13px",
                          borderRadius: 999,
                          color: OCRE,
                          border: `1px solid ${OCRE}66`,
                          whiteSpace: "nowrap",
                        };
                        return (
                          <>
                            {it.noteGuide && (
                              <span style={pastille}>
                                {it.guide || "Guide"} · {nGuide !== null ? `${nGuide}/100` : it.noteGuide}
                              </span>
                            )}
                            {moy !== null ? (
                              <>
                                <span style={pastille}>FIDAL Notaires · {Math.round(moy * 10)}/100</span>
                                <span style={{ color: C.grisFonce, fontSize: 11 }}>
                                  ({it.avis.filter((a) => a.note > 0).length} avis)
                                </span>
                              </>
                            ) : (
                              <span style={{ color: C.grisFonce, fontSize: 12 }}>Pas encore d'avis</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <p style={{ color: C.grisFonce, fontSize: 11, margin: "10px 0 0" }}>
                      Par {it.par} · {new Date(it.date).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderTop: `1px solid ${C.filet}`,
                    padding: "10px 16px",
                  }}
                >
                  <button
                    onClick={() => aimer(it.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: aimes[it.id] ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: C.gris,
                      fontSize: 13,
                      padding: 0,
                      ...fontBody,
                    }}
                  >
                    <Coeur plein={!!aimes[it.id]} /> {it.likes || 0}
                  </button>
                  {estProprietaire(it) && (
                    <>
                      <button
                        onClick={() => {
                          setEditionId(editionId === it.id ? null : it.id);
                          setENom(it.nom);
                          setEDetail(it.detail || "");
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: C.grisFonce,
                          fontSize: 12,
                          padding: 0,
                          textDecoration: "underline",
                          ...fontBody,
                        }}
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => retirerBouteille(it.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          cursor: "pointer",
                          color: "#C97A6B",
                          fontSize: 12,
                          padding: 0,
                          textDecoration: "underline",
                          ...fontBody,
                        }}
                      >
                        Retirer
                      </button>
                    </>
                  )}
                  <button
                    style={{ ...boutonLigne, padding: "7px 14px", fontSize: 10, marginLeft: "auto" }}
                    onClick={() => {
                      setAvisOuvert(avisOuvert === it.id ? null : it.id);
                      setANote(0);
                      setATexte("");
                    }}
                  >
                    {avisOuvert === it.id ? "Annuler" : "Donner un avis"}
                  </button>
                </div>

                {/* correction par le rapporteur */}
                {editionId === it.id && (
                  <div style={{ borderTop: `1px solid ${C.filet}`, padding: 16, background: C.nuit + "66" }}>
                    <input
                      style={{ ...champ, marginBottom: 10 }}
                      placeholder="Domaine, cuvée…"
                      value={eNom}
                      onChange={(e) => setENom(e.target.value)}
                    />
                    <input
                      style={{ ...champ, marginBottom: 12 }}
                      placeholder="Appellation · millésime"
                      value={eDetail}
                      onChange={(e) => setEDetail(e.target.value)}
                    />
                    <button
                      style={{ ...boutonPlein, padding: "9px 18px", fontSize: 12 }}
                      onClick={() => corrigerBouteille(it.id)}
                      disabled={enregistrement || !eNom.trim()}
                    >
                      Enregistrer la correction
                    </button>
                  </div>
                )}

                {/* avis existants */}
                {it.avis && it.avis.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.filet}`, padding: "12px 16px", display: "grid", gap: 10 }}>
                    {it.avis.map((a, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...fontCaps, fontSize: 10, color: C.teal, letterSpacing: "0.16em" }}>{a.par}</span>
                          {a.note > 0 && (
                            <span style={{ color: OCRE, fontWeight: 700, fontSize: 13 }}>{a.note}/10</span>
                          )}
                        </div>
                        {a.texte && (
                          <p style={{ ...fontSerifIt, color: C.gris, fontSize: 14, margin: "4px 0 0" }}>{a.texte}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* saisie d'un avis */}
                {avisOuvert === it.id && (
                  <div style={{ borderTop: `1px solid ${C.filet}`, padding: 16, background: C.nuit + "66" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10 }}>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={aNote || 1}
                        onChange={(e) => setANote(Number(e.target.value))}
                        style={{ flex: 1, accentColor: C.teal, cursor: "pointer" }}
                        aria-label="Note de 1 à 10"
                      />
                      <span
                        style={{
                          ...fontCaps,
                          fontSize: 18,
                          letterSpacing: "0.06em",
                          color: aNote > 0 ? OCRE : C.grisFonce,
                          minWidth: 64,
                          textAlign: "right",
                        }}
                      >
                        {aNote > 0 ? `${aNote}/10` : "—"}
                      </span>
                    </div>
                    <textarea
                      style={{ ...champ, minHeight: 64, resize: "vertical", marginBottom: 10 }}
                      placeholder="Votre commentaire de dégustation…"
                      value={aTexte}
                      onChange={(e) => setATexte(e.target.value)}
                    />
                    <button
                      style={{ ...boutonPlein, padding: "9px 18px", fontSize: 12 }}
                      onClick={() => publierAvis(it.id)}
                      disabled={enregistrement || !aTexte.trim() || aNote === 0}
                    >
                      {enregistrement ? "Publication…" : "Publier l'avis"}
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {/* zoom étiquette */}
      {zoom && (
        <div
          onClick={() => setZoom(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(8,17,30,0.94)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
            zIndex: 50,
            padding: 20,
          }}
        >
          <img src={zoom} alt="Étiquette en grand" style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: 14 }} />
        </div>
      )}

      <footer style={{ borderTop: `1px solid ${C.filet}`, padding: "16px 20px", textAlign: "center" }}>
        <span style={{ ...fontCaps, fontSize: 9, color: C.grisFonce, letterSpacing: "0.26em" }}>
          FIDAL NOTAIRES · L'ABUS D'ALCOOL EST DANGEREUX POUR LA SANTÉ
        </span>
      </footer>
    </div>
  );
}
