// Identification de l'étiquette : vision Claude + recherche web
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
        max_tokens: 1200,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } },
              {
                type: "text",
                text:
                  "Voici la photo de l'étiquette d'une bouteille de vin. Lis tout ce qui est écrit dessus, " +
                  "puis identifie la référence exacte du vin en t'aidant si nécessaire d'une recherche web " +
                  "(producteur, cuvée, appellation officielle, millésime, couleur, région). " +
                  'Réponds UNIQUEMENT avec un objet JSON de la forme exacte : ' +
                  '{"nom":"Domaine/Château + cuvée","appellation":"appellation officielle","millesime":"AAAA",' +
                  '"couleur":"rouge|blanc|rosé|effervescent","region":"région viticole","producteur":"nom du producteur",' +
                  '"confiance":"haute|moyenne|basse"}. ' +
                  "Mets une chaîne vide pour tout champ illisible ou incertain. Pas de backticks, pas de texte autour.",
              },
            ],
          },
        ],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await reponse.json();

    // Diagnostics détaillés dans les logs Vercel
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
