// Netlify Function: GET /api/skin?name=<minecraft username>
// Looks up the player's current skin from Mojang and returns the skin PNG
// (same-origin, cached), with the arm model in the x-skin-model header.
const NAME_RE = /^[A-Za-z0-9_]{1,16}$/;

const text = (msg, status) =>
  new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=60" } });

export default async (req) => {
  const name = (new URL(req.url).searchParams.get("name") || "").trim();
  if (!NAME_RE.test(name)) return text("Invalid Minecraft username.", 400);

  try {
    const profileRes = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`);
    if (profileRes.status !== 200) return text("Player not found.", 404);
    const { id } = await profileRes.json();

    const sessionRes = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${id}`);
    if (!sessionRes.ok) return text("Couldn't read the player's profile.", 502);
    const session = await sessionRes.json();
    const prop = (session.properties || []).find((p) => p.name === "textures");
    if (!prop) return text("Player has no skin set.", 404);

    const textures = JSON.parse(Buffer.from(prop.value, "base64").toString("utf8")).textures || {};
    const skin = textures.SKIN;
    if (!skin || !skin.url) return text("Player has no skin set.", 404);

    const imgRes = await fetch(skin.url.replace(/^http:/, "https:"));
    if (!imgRes.ok) return text("Couldn't download the skin.", 502);
    const png = await imgRes.arrayBuffer();

    return new Response(png, {
      status: 200,
      headers: {
        "content-type": "image/png",
        "x-skin-model": skin.metadata && skin.metadata.model === "slim" ? "slim" : "classic",
        "access-control-expose-headers": "x-skin-model",
        "cache-control": "public, max-age=600",
        "netlify-cdn-cache-control": "public, durable, s-maxage=3600, stale-while-revalidate=86400",
        "netlify-vary": "query=name",
      },
    });
  } catch (err) {
    console.error(err);
    return text("Skin lookup failed.", 502);
  }
};

export const config = { path: "/api/skin" };
