// Identification de l'étiquette : vision Claude + recherche web
// Retourne aussi la note d'un grand guide et une photo officielle si trouvées.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST uniquement" });
  try {
    const { image } = req.body || {};
    if (!image) return res.status(400).json({ error: "image manquante" });
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error("identify: ANTHROPIC_API_KEY absente de l'environnement");
      return res.status(500).json({ error: "clé API manquante" });
    }

    const reponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text:
                  "Voici la photo de l'étiquette d'une bouteille de vin. Lis tout ce qui est écrit dessus, " +
                  "puis identifie la référence exacte du vin grâce à une recherche web " +
                  "(producteur, cuvée, appellation officielle, millésime, couleur, région). " +
                  "Cherche aussi sur le web : 1) la note publiée par un guide reconnu, dans cet ordre de priorité : " +
                  "Guide Hachette des vins d'abord, puis Wine Advocate/Parker, puis RVF ou Bettane+Desseauve, puis Wine Spectator/Jancis Robinson " +
                  "(idéalement ce millésime, sinon un millésime proche en le précisant) ; " +
                  "2) le prix moyen constaté en euros (Wine-Searcher, iDealwine, cavistes en ligne) pour ce vin et ce format ; " +
                  "3) l'URL directe (https, finissant souvent par .jpg/.png/.webp) d'une photo officielle de la bouteille " +
                  "(site du domaine, caviste en ligne, importateur). " +
                  'Réponds UNIQUEMENT avec un objet JSON de la forme exacte : ' +
                  '{"nom":"Domaine/Château + cuvée","appellation":"appellation officielle","millesime":"AAAA",' +
                  '"couleur":"rouge|blanc|rosé|effervescent","region":"région viticole","producteur":"nom du producteur",' +
                  '"guide":"nom du guide (ex. Wine Advocate, RVF, Hachette)","noteGuide":"note telle que publiée (ex. 92/100, 16,5/20, ★★)",' +
                  '"commentaireGuide":"très court résumé du commentaire du guide, reformulé dans tes propres mots, 15 mots maximum, jamais de citation littérale",' +
                  '"prixMoyen":"prix moyen constaté, format court (ex. 25 €, 8-10 €, 120 €)",' +
                  '"accords":"2 ou 3 accords mets-vins, très courts (ex. gibier, fromages affinés)",' +
                  '"apogee":"fenêtre de dégustation conseillée (ex. 2026-2032, ou : à boire dès maintenant)",' +
                  '"photoUrl":"URL https directe de l\'image officielle","confiance":"haute|moyenne|basse"}. ' +
                  "Mets une chaîne vide pour tout champ introuvable ou incertain — ne jamais inventer une note ni une URL. " +
                  "Pas de backticks, pas de texte autour.",
              },
            ],
          },
        ],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    // Lire en texte d'abord pour pouvoir logger même si ce n'est pas du JSON
    const brut = await reponse.text();
    let data;
    try {
      data = JSON.parse(brut);
    } catch {
      console.error("identify: réponse non-JSON, statut", reponse.status, "—", brut.slice(0, 300));
      return res.status(500).json({ error: "réponse inattendue d'Anthropic", statut: reponse.status });
    }

    if (!reponse.ok || data.error) {
      console.error("identify: Anthropic", reponse.status, JSON.stringify(data.error || data).slice(0, 400));
      return res.status(500).json({ error: "appel Anthropic refusé", detail: data.error?.message || reponse.status });
    }

    const texte = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .replace(/```json|```/g, "");
    const m = texte.match(/\{[\s\S]*\}/);
    if (!m) {
      console.error("identify: pas de JSON dans la réponse —", texte.slice(0, 300));
      return res.status(200).json({});
    }
    res.status(200).json(JSON.parse(m[0]));
  } catch (e) {
    console.error("identify:", e.message);
    res.status(500).json({ error: "Identification impossible" });
  }
}
