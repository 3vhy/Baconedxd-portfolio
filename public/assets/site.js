/* BaconedXD portfolio — "The Dive". Renders from content (live API → content.json fallback). */
(function () {
  "use strict";

  const PREVIEW = new URLSearchParams(location.search).has("preview");
  const app = document.getElementById("app");
  const icon = (n, s) => window.PixelIcons.svg(n, s);
  const BIOMES = ["ocean", "lukewarm_ocean", "warm_ocean", "deep_lukewarm_ocean", "deep_ocean", "deep_cold_ocean", "deep_frozen_ocean"];
  let BASE = {};
  let CURRENT = {};
  let points = [];

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  function merge(base, over) {
    if (over === undefined || over === null) return base;
    if (!isObj(base) || !isObj(over)) return over;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = merge(base[k], over[k]);
    return out;
  }
  function safeUrl(u) {
    try { const x = new URL(u, location.href); return ["http:", "https:", "mailto:"].includes(x.protocol) ? x.href : "#"; }
    catch { return "#"; }
  }
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
  function hash(str) { let h = 2166136261; for (const c of String(str)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function initials(name) {
    const caps = String(name || "").match(/[A-Z0-9]/g);
    return ((caps && caps.length >= 2 ? caps.slice(0, 2).join("") : String(name || "?").slice(0, 2)) || "?").toUpperCase();
  }
  function tile(name, cls = "") {
    const hue = 175 + (hash(name) % 40) - 20;
    return `<div class="tile ${cls}" style="display:grid;place-items:center;font-weight:700;color:#fff;text-shadow:2px 2px 0 rgba(0,0,0,.45);border:3px solid var(--ink);box-shadow:inset 4px 4px 0 rgba(255,255,255,.22),inset -4px -4px 0 rgba(0,0,0,.3);background:hsl(${hue} 60% 36%)" aria-hidden="true">${esc(initials(name))}</div>`;
  }
  const roman = (n) => ["", "I", "II", "III", "IV", "V"][Math.max(0, Math.min(5, Number(n) || 0))];
  const fmtMembers = (e) => (Number(e.members) || 0).toLocaleString("en-US") + (e.membersPlus ? "+" : "");
  const copyText = (addr) => String(addr || "").split(/\s+\/\s+|\s+/)[0];
  const discordUrl = (p) => (p.discordId ? `https://discord.com/users/${encodeURIComponent(p.discordId)}` : "#");
  function compact(v) {
    const m = String(v).match(/^([\d,]+)(\+?)$/);
    if (!m) return v;
    const n = parseInt(m[1].replace(/,/g, ""), 10);
    if (n < 10000) return v;
    return (n / 1000).toFixed(n % 1000 ? 1 : 0).replace(/\.0$/, "") + "k" + m[2];
  }
  function tokens(c, str) {
    const ex = c.experience || [];
    const total = ex.reduce((s, e) => s + (Number(e.members) || 0), 0);
    const map = {
      servers: String(ex.length),
      members: total.toLocaleString("en-US") + (ex.some((e) => e.membersPlus) ? "+" : ""),
      current: String(ex.filter((e) => e.status === "current").length),
      past: String(ex.filter((e) => e.status !== "current").length),
    };
    return String(str ?? "").replace(/\{(\w+)(?::([\w-]+))?\}/g, (m, key, arg) =>
      key === "roles" ? String(ex.filter((e) => e.category === arg).length) : key in map ? map[key] : m);
  }

  /* ---------- pixel textures ---------- */
  function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
  const texCache = {};
  function makeTex(key, size, paint) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement("canvas"); c.width = c.height = size;
    paint(c.getContext("2d"), size);
    return (texCache[key] = `url(${c.toDataURL()})`);
  }
  const noiseTex = () => makeTex("noise", 32, (x, n) => {
    const r = seeded(11);
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
      const v = r();
      if (v < .22) { x.fillStyle = "rgba(255,255,255,.05)"; x.fillRect(i, y, 1, 1); }
      else if (v > .8) { x.fillStyle = "rgba(0,20,40,.07)"; x.fillRect(i, y, 1, 1); }
    }
  });
  const prismarineTex = () => makeTex("prismarine", 16, (x, n) => {
    const r = seeded(5), cols = ["#5fb9ab", "#4fa597", "#6dc9ba", "#3f8f85", "#7fd6c6"];
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * (r() < .7 ? 3 : 5))]; x.fillRect(i, y, 1, 1); }
    x.fillStyle = "#33776f"; x.fillRect(0, 7, 16, 1); x.fillRect(7, 0, 1, 7); x.fillRect(12, 8, 1, 8); x.fillRect(3, 8, 1, 8);
  });
  const sandTex = () => makeTex("sand", 16, (x, n) => {
    const r = seeded(9), cols = ["#e8d79c", "#dcc988", "#f0e3b2", "#d1bc77"];
    for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) { x.fillStyle = cols[Math.floor(r() * 4)]; x.fillRect(i, y, 1, 1); }
  });
  function kelp(seed, h) {
    const r = seeded(seed + 3); let rects = ""; let x = 3;
    for (let y = 0; y < h; y += 3) {
      if (r() < .4) x = Math.max(2, Math.min(4, x + (r() < .5 ? -1 : 1)));
      rects += `<rect x="${x}" y="${y}" width="2" height="3" fill="#3f9440"/>`;
      if (r() < .35) rects += `<rect x="${r() < .5 ? x - 2 : x + 2}" y="${y + 1}" width="2" height="2" fill="#5fb84a"/>`;
    }
    return `<svg class="kelp k${seed}" viewBox="0 0 8 ${h}" width="32" height="${h * 4}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
  }

  /* ---------- theme ---------- */
  const FONT_URLS = { "Press Start 2P": "Press+Start+2P", "VT323": "VT323", "Silkscreen": "Silkscreen:wght@400;700", "Pixelify Sans": "Pixelify+Sans:wght@400..700", "Jersey 10": "Jersey+10", "Tiny5": "Tiny5" };
  function loadFonts(t) {
    const fams = [...new Set([t.headingFont, t.bodyFont])].filter((f) => FONT_URLS[f]);
    let l = document.getElementById("gfonts");
    if (!fams.length) { if (l) l.remove(); return; }
    const href = "https://fonts.googleapis.com/css2?" + fams.map((f) => "family=" + FONT_URLS[f]).join("&") + "&display=swap";
    if (!l) { l = document.createElement("link"); l.id = "gfonts"; l.rel = "stylesheet"; document.head.append(l); }
    if (l.getAttribute("href") !== href) l.setAttribute("href", href);
  }
  function bubbles(on) {
    let b = document.querySelector(".bubbles");
    if (!on) { if (b) b.remove(); return; }
    if (b) return;
    b = document.createElement("div"); b.className = "bubbles";
    for (let i = 0; i < 9; i++) {
      const s = document.createElement("i");
      s.style.left = (hash("b" + i) % 96) + 2 + "%";
      s.style.animationDuration = 16 + (hash("d" + i) % 14) + "s";
      s.style.animationDelay = -(hash("e" + i) % 24) + "s";
      b.append(s);
    }
    document.body.prepend(b);
  }
  function applyTheme(t) {
    const r = document.documentElement.style;
    const map = { sky: "--sky", shallow: "--shallow", lagoon: "--lagoon", deep: "--deep", abyss: "--abyss", ink: "--ink", accent: "--accent", accent2: "--accent-2", text: "--text", muted: "--muted", gold: "--gold", current: "--current", past: "--past", attr: "--attr" };
    for (const [k, v] of Object.entries(map)) if (t[k]) r.setProperty(v, t[k]);
    const fam = (f) => (f ? `"${f}", ui-monospace, monospace` : "");
    if (t.headingFont) r.setProperty("--font-head", fam(t.headingFont));
    if (t.bodyFont) r.setProperty("--font-body", fam(t.bodyFont));
    r.setProperty("--body-size", (Number(t.bodySize) || 17) + "px");
    r.setProperty("--noise", t.texture === false ? "none" : noiseTex());
    r.setProperty("--prismarine", prismarineTex());
    r.setProperty("--sand", sandTex());
    document.body.classList.toggle("no-waves", t.waves === false);
    const tc = document.querySelector('meta[name="theme-color"]'); if (tc && t.sky) tc.content = t.sky;
    loadFonts(t);
    bubbles(t.bubbles !== false);
  }

  /* ---------- sections ---------- */
  const ymark = (id) => { const p = points.find((x) => x.id === id); return p ? `<span class="ymark">Y: ${p.y}</span>` : ""; };
  function zoneHead(id, title, subtitle) {
    return `<header class="zone-head">${ymark(id)}<div><h2>${esc(title)}</h2>${subtitle ? `<p>${esc(subtitle)}</p>` : ""}</div></header>`;
  }

  /* ---------- real Minecraft skin, drawn from the skin texture ---------- */
  const skinCache = new Map();
  const NAME_RE = /^[A-Za-z0-9_]{1,16}$/;
  function probe(url) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im.naturalWidth === 64 && (im.naturalHeight === 64 || im.naturalHeight === 32) ? { url, legacy: im.naturalHeight === 32 } : null);
      im.onerror = () => res(null);
      im.src = url;
    });
  }
  // 1) live lookup through /api/skin  2) saved skin file  3) null (falls back to mc-heads)
  function resolveSkin(p) {
    const key = [p.minecraftUsername, p.skinUrl, p.skinModel].join("|");
    if (!skinCache.has(key)) skinCache.set(key, (async () => {
      if (NAME_RE.test(p.minecraftUsername || "")) {
        try {
          const r = await fetch(`/api/skin?name=${encodeURIComponent(p.minecraftUsername)}`);
          if (r.ok && (r.headers.get("content-type") || "").startsWith("image/")) {
            const model = r.headers.get("x-skin-model") === "slim" ? "slim" : "classic";
            const ok = await probe(URL.createObjectURL(await r.blob()));
            if (ok) return { ...ok, model };
          }
        } catch {}
      }
      if (p.skinUrl) {
        const ok = await probe(safeUrl(p.skinUrl));
        if (ok) return { ...ok, model: p.skinModel === "slim" ? "slim" : "classic" };
      }
      return null;
    })());
    return skinCache.get(key);
  }
  // one face of one body part, positioned on a grid and cut from the 64×64 (or 64×32) sheet
  function part(sx, sy, w, h, x, y, H, GW, GH, flip) {
    const pos = (a, total, size) => (total === size ? 0 : (a / (total - size)) * 100);
    return `<i style="left:${(x / GW) * 100}%;top:${(y / GH) * 100}%;width:${(w / GW) * 100}%;height:${(h / GH) * 100}%;` +
      `background-size:${(64 / w) * 100}% ${(H / h) * 100}%;background-position:${pos(sx, 64, w)}% ${pos(sy, H, h)}%${flip ? ";transform:scaleX(-1)" : ""}"></i>`;
  }
  function skinHtml(sk, kind) {
    const H = sk.legacy ? 32 : 64;
    const style = `--skin:url(&quot;${esc(sk.url)}&quot;)`;
    if (kind === "head") {
      return `<span class="mcskin head" style="${style}">${part(8, 8, 8, 8, 0, 0, H, 8, 8)}${part(40, 8, 8, 8, 0, 0, H, 8, 8)}</span>`;
    }
    const a = sk.model === "slim" ? 3 : 4;
    const P = (sx, sy, w, h, x, y, flip) => part(sx, sy, w, h, x, y, H, 16, 32, flip);
    let html = P(8, 8, 8, 8, 4, 0) + P(20, 20, 8, 12, 4, 8) + P(44, 20, a, 12, 4 - a, 8) + P(4, 20, 4, 12, 4, 20);
    if (sk.legacy) {
      html += P(44, 20, a, 12, 12, 8, true) + P(4, 20, 4, 12, 8, 20, true);
    } else {
      html += P(36, 52, a, 12, 12, 8) + P(20, 52, 4, 12, 8, 20);
      html += P(20, 36, 8, 12, 4, 8) + P(44, 36, a, 12, 4 - a, 8) + P(52, 52, a, 12, 12, 8) + P(4, 36, 4, 12, 4, 20) + P(4, 52, 4, 12, 8, 20);
    }
    html += P(40, 8, 8, 8, 4, 0); // hat layer on top
    return `<span class="mcskin body" style="${style}" role="img" aria-label="Minecraft skin">${html}</span>`;
  }
  function mcHeadsImg(p, kind) {
    if (!NAME_RE.test(p.minecraftUsername || "")) return tile(p.name, kind === "head" ? "head" : "skin");
    const u = encodeURIComponent(p.minecraftUsername);
    return kind === "head"
      ? `<img class="head pixelated" src="https://mc-heads.net/avatar/${u}/32" alt="" width="32" height="32" data-fallback="${esc(p.name)}" data-cls="head" style="width:32px;height:32px">`
      : `<img class="skin pixelated" src="https://mc-heads.net/player/${u}/168" alt="${esc(p.name)}'s Minecraft skin" width="168" data-fallback="${esc(p.name)}" data-cls="skin">`;
  }
  function customImg(p, kind) {
    const src = esc(safeUrl(p.avatarUrl));
    return kind === "head"
      ? `<img class="head pixelated" src="${src}" alt="" width="32" height="32" data-fallback="${esc(p.name)}" data-cls="head" style="width:32px;height:32px;object-fit:cover">`
      : `<img class="skin pixelated" src="${src}" alt="${esc(p.name)}" width="168" data-fallback="${esc(p.name)}" data-cls="skin">`;
  }
  const skinMount = (p, kind) => p.avatarUrl ? customImg(p, kind) : `<span class="skin-mount ${kind}" data-kind="${kind}"></span>`;
  function wireFallbacks(root) {
    root.querySelectorAll("img[data-fallback]").forEach((img) => img.addEventListener("error", () => {
      const d = document.createElement("div");
      d.innerHTML = tile(img.dataset.fallback, img.dataset.cls || "");
      const t = d.firstChild;
      if (img.dataset.cls === "head") { t.style.width = t.style.height = "32px"; t.style.fontSize = "11px"; }
      img.replaceWith(t);
    }, { once: true }));
  }
  function mountSkins(p) {
    if (p.avatarUrl || !app.querySelector(".skin-mount")) return;
    resolveSkin(p).then((sk) => {
      app.querySelectorAll(".skin-mount").forEach((m) => {
        m.innerHTML = sk ? skinHtml(sk, m.dataset.kind) : mcHeadsImg(p, m.dataset.kind);
        m.classList.add("ready");
        wireFallbacks(m);
      });
    });
  }

  const B = {};
  B.hero = (c) => {
    const p = c.profile || {};
    const first = (c.categories || [])[0];
    const statsOn = (c.sections || []).some((s) => s.id === "stats" && s.visible !== false);
    const stats = statsOn ? (c.stats || []).filter((s) => s.label || s.value) : [];
    return `<section class="hero" id="top">
      <div class="rays" aria-hidden="true"><i></i><i></i><i></i></div>
      <div class="wrap">
        <div class="hero-grid">
          <div>
            <div class="title-wrap"><h1 class="title">${esc(p.name)}</h1>${p.splash ? `<span class="splash" aria-hidden="true">${esc(p.splash)}</span>` : ""}</div>
            <div>${p.showStatus !== false && p.status ? `<p class="status">${esc(p.status)}</p>` : ""}</div>
            ${p.tagline ? `<p class="tagline">${esc(p.tagline)}</p>` : ""}
            <div class="hero-actions">
              ${p.primaryButton && first ? `<a class="mc-btn" href="#cat-${esc(first.id)}">${esc(p.primaryButton)}</a>` : ""}
              ${p.secondaryButton && p.discordId ? `<a class="mc-btn alt" href="${esc(discordUrl(p))}" target="_blank" rel="noopener">${esc(p.secondaryButton)}</a>` : ""}
            </div>
            ${p.discordUsername || p.discordId ? `<p class="handle">
              ${p.discordUsername ? `<span>Discord <b>${esc(p.discordUsername)}</b> <button type="button" data-copy="${esc(p.discordUsername)}">copy</button></span>` : ""}
              ${p.discordId ? `<span>ID <b>${esc(p.discordId)}</b> <button type="button" data-copy="${esc(p.discordId)}">copy</button></span>` : ""}
            </p>` : ""}
          </div>
          <div class="player">
            <span class="nametag">${esc(p.name)}</span>
            ${skinMount(p, "body")}
            <div class="pedestal"></div>
          </div>
        </div>
        ${stats.length ? `<div class="stacks" aria-label="Stats">${stats.map((s) => {
          const v = tokens(c, s.value);
          return `<div class="stack"><span class="slot">${icon(s.icon || "gem", 36)}<span class="count${String(compact(v)).length > 4 ? " long" : ""}">${esc(compact(v))}</span></span><span class="lbl">${esc(s.label)}<span class="sr-only">: ${esc(v)}</span></span></div>`;
        }).join("")}</div>` : ""}
      </div>
    </section>`;
  };
  B.stats = () => ""; // stats live inside the hero as item stacks

  B.about = (c, s) => {
    const p = c.profile || {};
    const paras = String(c.about || "").split(/\n\s*\n/).filter((x) => x.trim());
    return `<section class="zone" id="about"><div class="wrap">${zoneHead("about", s.title, s.subtitle)}
      <div class="zone-body"><div class="chat">
        <p class="sys">${esc(p.name)} joined the game</p>
        ${paras.map((x) => `<p><span class="who">&lt;${esc(p.name)}&gt;</span> ${inline(x.trim())}</p>`).join("")}
        ${p.discordId ? `<a class="say" href="${esc(discordUrl(p))}" target="_blank" rel="noopener">Say hi on Discord</a>` : ""}
      </div></div></div></section>`;
  };

  function tipCard(e) {
    const cur = e.status === "current";
    const iconHtml = e.iconUrl
      ? `<img class="pixelated" src="${esc(safeUrl(e.iconUrl))}" alt="" width="56" height="56" data-fallback="${esc(e.server)}">`
      : tile(e.server);
    return `<article class="tip ${cur ? "current" : "past"}">
      <div class="tip-head"><div class="tip-icon">${iconHtml}</div>
        <div><h3 class="tip-role">${esc(e.role)}</h3><p class="tip-server">${esc(e.server)}</p></div></div>
      ${e.description ? `<p class="tip-lore">${esc(e.description)}</p>` : ""}
      <ul class="tip-attrs">
        <li class="gray">When on staff:</li>
        <li class="attr">+${esc(fmtMembers(e))} members</li>
        ${e.address ? `<li class="attr"><button class="addr" type="button" data-copy="${esc(copyText(e.address))}" title="Copy server address">${esc(e.address)}</button></li>` : ""}
        ${e.period ? `<li class="gray">${esc(e.period)}</li>` : ""}
        <li class="${cur ? "on" : "off"}">${cur ? "Currently on staff" : esc(e.note || "Past role")}</li>
      </ul>
    </article>`;
  }
  B.categories = (c) => (c.categories || []).map((cat) => {
    const items = (c.experience || []).filter((e) => e.category === cat.id);
    const sorted = [...items.filter((e) => e.status === "current"), ...items.filter((e) => e.status !== "current")];
    return `<section class="zone" id="cat-${esc(cat.id)}"><div class="wrap">${zoneHead("cat-" + cat.id, cat.title, cat.subtitle)}
      <div class="zone-body">${sorted.length ? `<div class="tips">${sorted.map(tipCard).join("")}</div>` : `<p class="empty">No roles here yet.</p>`}</div>
    </div></section>`;
  }).join("");

  B.skills = (c, s) => (c.skills || []).length ? `<section class="zone" id="skills"><div class="wrap">${zoneHead("skills", s.title, s.subtitle)}
    <div class="zone-body"><div class="enchants">${c.skills.map((k) => {
      const lv = Math.max(0, Math.min(5, Number(k.level) || 0));
      return `<div class="ench"><span class="slot">${icon(k.icon || "ebook", 34)}</span><div>
        <h3>${esc(k.name)}${lv ? ` <span>${roman(lv)}</span>` : ""}</h3>
        ${k.desc ? `<p>${esc(k.desc)}</p>` : ""}
        ${lv ? `<div class="pips" aria-label="Level ${lv} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= lv ? "on" : ""}"></i>`).join("")}</div>` : ""}
      </div></div>`;
    }).join("")}</div></div></div></section>` : "";

  B.contact = (c, s) => {
    const p = c.profile || {}, ct = c.contact || {};
    const links = (ct.links || []).filter((l) => l.label && l.url);
    return `<section class="floor" id="contact">
      <div class="wrap connect">
        ${ymark("contact")}
        <h2>${esc(s.title)}</h2>
        ${ct.text ? `<p>${esc(ct.text)}</p>` : ""}
        ${p.discordUsername ? `<div class="field"><label>Discord username</label><div class="box">${esc(p.discordUsername)}</div></div>` : ""}
        <div class="row">
          ${p.discordId ? `<a class="mc-btn wide" href="${esc(discordUrl(p))}" target="_blank" rel="noopener">Message on Discord</a>` : ""}
          ${p.discordUsername ? `<button class="mc-btn alt" type="button" data-copy="${esc(p.discordUsername)}">Copy username</button>` : ""}
          ${links.map((l) => `<a class="mc-btn alt" href="${esc(safeUrl(l.url))}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}
        </div>
      </div>
      <div class="seabed" aria-hidden="true">${kelp(1, 34)}${kelp(2, 24)}${kelp(3, 30)}${kelp(4, 20)}<div class="sand"></div></div>
    </section>`;
  };

  /* ---------- depth points: Y levels, hotbar, readout ---------- */
  function buildPoints(c, secs) {
    const list = [];
    for (const s of secs) {
      if (s.id === "hero") list.push({ id: "top", anchor: "top", label: s.navLabel || "Surface", icon: s.icon || "player" });
      else if (s.id === "categories") (c.categories || []).forEach((cat) => list.push({ id: "cat-" + cat.id, anchor: "cat-" + cat.id, label: cat.navLabel || cat.title, icon: cat.icon || "star" }));
      else if (["about", "skills", "contact"].includes(s.id)) list.push({ id: s.id, anchor: s.id, label: s.navLabel || s.title, icon: s.icon || "star" });
    }
    const n = Math.max(1, list.length - 1);
    list.forEach((p, i) => { p.y = Math.round(63 - (i * 122) / n); p.biome = BIOMES[Math.min(BIOMES.length - 1, Math.round((i * (BIOMES.length - 1)) / n))]; });
    return list;
  }
  function hud(c) {
    const t = c.theme || {};
    const bar = points.filter((p) => p.label).map((p) => `<a href="#${esc(p.anchor)}" data-point="${esc(p.id)}" aria-label="${esc(p.label)}">${icon(p.icon, 30)}</a>`).join("");
    return `<nav class="hotbar" aria-label="Sections">${bar}</nav><div class="hotbar-name" aria-hidden="true"></div>
      ${t.depthReadout !== false ? `<div class="readout" aria-hidden="true">Y: <b class="ry">63</b><br>Biome: <b class="rb">minecraft:ocean</b></div>` : ""}`;
  }
  let activeId = null, nameTimer;
  function onScroll() {
    if (!points.length) return;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    let act = points[0];
    for (const p of points) { const el = document.getElementById(p.anchor); if (el && el.getBoundingClientRect().top <= vh * 0.4) act = p; }
    if (window.scrollY >= max - 4) act = points[points.length - 1];
    const ry = document.querySelector(".readout .ry"), rb = document.querySelector(".readout .rb");
    if (ry) ry.textContent = Math.round(63 - (window.scrollY / max) * 122);
    if (rb) rb.textContent = "minecraft:" + act.biome;
    document.querySelectorAll(".hotbar a").forEach((a) => a.classList.toggle("on", a.dataset.point === act.id));
    if (activeId !== null && activeId !== act.id) {
      const n = document.querySelector(".hotbar-name");
      if (n) { n.textContent = act.label; n.classList.add("show"); clearTimeout(nameTimer); nameTimer = setTimeout(() => n.classList.remove("show"), 1400); }
    }
    activeId = act.id;
  }
  let ticking = false;
  window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; onScroll(); }); } }, { passive: true });
  window.addEventListener("resize", onScroll);

  /* ---------- advancement toasts (once per page load) ---------- */
  let toastsShown = false;
  function advancements(c) {
    if (toastsShown || (c.theme || {}).toasts === false) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    toastsShown = true;
    const cats = Object.fromEntries((c.categories || []).map((x) => [x.id, x.icon]));
    const list = (c.experience || []).filter((e) => e.status === "current").slice(0, 3);
    if (!list.length) return;
    const el = document.createElement("div");
    el.className = "adv"; el.setAttribute("role", "status");
    document.body.append(el);
    let i = 0;
    const next = () => {
      if (i >= list.length) { el.classList.remove("show"); setTimeout(() => el.remove(), 600); return; }
      const e = list[i++];
      el.innerHTML = `<span class="slot">${icon(cats[e.category] || "star", 32)}</span><b>Advancement made!</b><span>${esc(e.role)} at ${esc(e.server)}</span>`;
      el.classList.add("show");
      setTimeout(() => { el.classList.remove("show"); setTimeout(next, 500); }, 3200);
    };
    setTimeout(next, 900);
  }

  /* ---------- render ---------- */
  function render(c) {
    CURRENT = c;
    applyTheme(c.theme || {});
    if (c.meta) {
      if (c.meta.title) document.title = c.meta.title;
      const d = document.querySelector('meta[name="description"]'); if (d && c.meta.description) d.content = c.meta.description;
    }
    const secs = (c.sections || []).filter((s) => s.visible !== false);
    points = buildPoints(c, secs);
    const p = c.profile || {};
    let html = `<header class="sky"><a class="brand" href="#top">${skinMount(p, "head")}<span>${esc(p.name)}</span></a>
      <span class="sun" aria-hidden="true"></span><span class="cloud c1" aria-hidden="true"></span><span class="cloud c2" aria-hidden="true"></span>
      <div class="waves" aria-hidden="true"></div></header><main>`;
    for (const s of secs) if (B[s.id]) html += B[s.id](c, s);
    html += `</main><footer class="footer">${esc(c.footer)}</footer>` + hud(c);
    app.innerHTML = html;
    wireFallbacks(app);
    mountSkins(p);
    activeId = null; onScroll();
    advancements(c);
  }

  /* ---------- copy ---------- */
  let toastTimer;
  function toast(msg) {
    const t = document.getElementById("toast"); if (!t) return;
    t.innerHTML = msg; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
  }
  document.addEventListener("click", async (ev) => {
    const b = ev.target.closest("[data-copy]"); if (!b) return;
    const val = b.getAttribute("data-copy");
    try { await navigator.clipboard.writeText(val); toast(`<b>[Copied]</b> ${esc(val)}`); }
    catch { toast(`Couldn't copy. Here it is: ${esc(val)}`); }
  });

  /* ---------- load ---------- */
  async function getJson(url) {
    try {
      const r = await fetch(url, { cache: "no-store" });
      if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return null;
      return await r.json();
    } catch { return null; }
  }
  async function init() {
    const [base, live] = await Promise.all([getJson("content.json"), getJson("/api/content")]);
    BASE = base || {};
    render(merge(BASE, live && live.content));
    if (PREVIEW && window.parent !== window) {
      window.addEventListener("message", (e) => {
        if (e.origin !== location.origin || !e.data || e.data.type !== "portfolio:preview") return;
        const y = window.scrollY;
        render(merge(BASE, e.data.content));
        window.scrollTo(0, y);
      });
      window.parent.postMessage({ type: "portfolio:ready" }, location.origin);
    }
  }
  init();
})();
