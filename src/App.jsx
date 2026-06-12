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

function compresserImage(file, maxDim = 900, qualite = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const cv = document.createElement("canvas");
        cv.width = width;
        cv.height = height;
        cv.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(cv.toDataURL("image/jpeg", qualite));
      };
      img.onerror = () => reject(new Error("Image illisible"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Lecture impossible"));
    reader.readAsDataURL(file);
  });
}

function moyenne(avis) {
  const notes = (avis || []).filter((a) => a.note > 0);
  if (notes.length === 0) return null;
  return notes.reduce((s, a) => s + a.note, 0) / notes.length;
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

/* ---------- étoiles 1 à 10 ---------- */

function Etoiles({ note, surChoix = null, taille = 17 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const active = i < Math.round(note);
        return (
          <span
            key={i}
            onClick={surChoix ? () => surChoix(i + 1) : undefined}
            style={{
              fontSize: taille,
              lineHeight: 1,
              cursor: surChoix ? "pointer" : "default",
              color: active ? C.teal : "#2B405C",
              userSelect: "none",
            }}
            role={surChoix ? "button" : undefined}
            aria-label={surChoix ? `Note ${i + 1} sur 10` : undefined}
          >
            ★
          </span>
        );
      })}
    </span>
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

  const triés = [...items].sort((a, b) => {
    if (tri === "aimes") return (b.likes || 0) - (a.likes || 0);
    if (tri === "notes") return (moyenne(b.avis) || 0) - (moyenne(a.avis) || 0);
    return b.date - a.date;
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

        {/* tris */}
        <nav style={{ display: "flex", gap: 8, marginTop: 22, flexWrap: "wrap" }}>
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
        </nav>
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
                    {[fInfos.region, fInfos.couleur].filter(Boolean).length > 0
                      ? " : " + [fInfos.region, fInfos.couleur].filter(Boolean).join(" · ")
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
        ) : triés.length === 0 ? (
          <div style={{ ...tuile, padding: "50px 20px", textAlign: "center" }}>
            <PictoCave taille={52} couleur={C.tealDim} />
            <p style={{ ...fontSerifIt, color: C.gris, fontSize: 17, margin: "18px 0 6px" }}>La masse à partager est vide.</p>
            <p style={{ color: C.grisFonce, fontSize: 13, margin: 0 }}>Soyez le premier à faire rapport d'une bouteille.</p>
          </div>
        ) : (
          triés.map((it) => {
            const moy = moyenne(it.avis);
            return (
              <article key={it.id} style={{ ...tuile, overflow: "hidden" }}>
                <div style={{ display: "flex", gap: 16, padding: 16 }}>
                  <img
                    src={it.photo}
                    alt={it.nom}
                    onClick={() => setZoom(it.photo)}
                    style={{
                      width: 92,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: `1px solid ${C.filet}`,
                      cursor: "zoom-in",
                      flexShrink: 0,
                      background: C.nuit,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ ...fontCaps, fontSize: 14, letterSpacing: "0.14em", margin: "2px 0 2px", color: C.blanc }}>
                      {it.nom}
                    </h3>
                    {it.detail && (
                      <p style={{ ...fontSerifIt, color: C.gris, fontSize: 14, margin: "0 0 4px" }}>{it.detail}</p>
                    )}
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
                    {moy !== null ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <Etoiles note={moy} taille={15} />
                        <span style={{ color: OCRE, fontWeight: 700, fontSize: 14 }}>
                          {moy.toFixed(1).replace(".", ",")}/10
                        </span>
                        <span style={{ color: C.grisFonce, fontSize: 12 }}>· {it.avis.length} avis</span>
                      </div>
                    ) : (
                      <span style={{ color: C.grisFonce, fontSize: 12 }}>Pas encore d'avis</span>
                    )}
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
                  <button
                    style={{ ...boutonLigne, padding: "7px 14px", fontSize: 10, marginLeft: "auto" }}
                    onClick={() => {
                      setAvisOuvert(avisOuvert === it.id ? null : it.id);
                      setANote(0);
                      setATexte("");
                    }}
                  >
                    {avisOuvert === it.id ? "Annuler" : "Homologuer"}
                  </button>
                </div>

                {/* avis existants */}
                {it.avis && it.avis.length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.filet}`, padding: "12px 16px", display: "grid", gap: 10 }}>
                    {it.avis.map((a, i) => (
                      <div key={i}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...fontCaps, fontSize: 10, color: C.teal, letterSpacing: "0.16em" }}>{a.par}</span>
                          {a.note > 0 && <Etoiles note={a.note} taille={12} />}
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
                    <div style={{ marginBottom: 10 }}>
                      <Etoiles note={aNote} surChoix={setANote} taille={22} />
                      <span style={{ color: C.gris, fontSize: 13, marginLeft: 10 }}>
                        {aNote > 0 ? `${aNote}/10` : "Notez de 1 à 10"}
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
                      {enregistrement ? "Homologation…" : "Homologuer"}
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
