// Relais d'images officielles : beaucoup de sites bloquent l'affichage direct
// (hotlinking). On récupère l'image côté serveur et on la sert nous-mêmes.
export default async function handler(req, res) {
  try {
    const u = req.query?.u;
    if (!u || !/^https:\/\//.test(u)) return res.status(400).end();

    const r = await fetch(u, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
      redirect: "follow",
    });
    if (!r.ok) return res.status(404).end();

    const type = r.headers.get("content-type") || "";
    if (!type.startsWith("image/")) return res.status(415).end();

    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 5 * 1024 * 1024) return res.status(413).end();

    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800");
    res.status(200).send(buf);
  } catch {
    res.status(404).end();
  }
}
