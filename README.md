# BaconedXD — Minecraft Staff Portfolio

An aqua, pixel-art staff portfolio designed as a dive: visitors start at the water's surface and scroll down to the sea floor.
It has a password-protected **live dashboard** at `/dashboard`.
Edits made in the dashboard save straight to your Netlify site — no re-uploading files.

```
public/
  index.html          ← the portfolio
  dashboard.html      ← the editor  (yoursite.netlify.app/dashboard)
  content.json        ← default content (used until you first save from the dashboard)
  assets/             ← styles + scripts
netlify/functions/
  content.mjs         ← saves/loads content with Netlify Blobs
netlify.toml          ← tells Netlify where everything is
package.json
```

---

## Deploy on Netlify (with live saving)

> ⚠️ **Don't use drag-and-drop for this.** Drag-and-drop only uploads static files, so the
> save function won't run and the dashboard falls back to "Offline" mode. Use GitHub (easiest)
> or the Netlify CLI.

### Option A — GitHub (recommended, works from a phone too)

1. Create a new repository on GitHub (e.g. `baconedxd-portfolio`).
2. Upload **everything in this folder** to it (keep the folder structure — `public/`,
   `netlify/`, `netlify.toml`, `package.json`). On github.com: *Add file → Upload files*,
   then drag the contents in.
3. In Netlify: **Add new project → Import an existing project → GitHub** → pick the repo.
   Netlify reads `netlify.toml` automatically — leave the build settings as they are and deploy.
4. Set your dashboard password: **Project configuration → Environment variables → Add a variable**
   - Key: `ADMIN_PASSWORD`
   - Value: a long password only you know
5. Go to **Deploys → Trigger deploy → Deploy project** so the password takes effect.
6. Open `https://<your-site>.netlify.app/dashboard`, log in, edit, press **Save**. Done —
   the public page updates instantly.

Every time you push to GitHub, Netlify redeploys automatically. Your dashboard edits are stored
separately (in Netlify Blobs), so redeploying never wipes them.

### Option B — Netlify CLI

```bash
npm install
npx netlify-cli login
npx netlify-cli init            # create/link a site
npx netlify-cli env:set ADMIN_PASSWORD "your-long-password"
npx netlify-cli deploy --prod
```

---

## Using the dashboard

| Tab | What you can change |
| --- | --- |
| **Profile** | Name, Minecraft username (skin + head), custom avatar, tagline, yellow splash text, status message, Discord username + ID, button text, About text (each paragraph becomes a chat message) |
| **Experience** | Add / edit / reorder / delete roles (shown as item tooltips): server, IP, role, members, category, current or past, past badge (e.g. *Resigned*), dates, description, server icon. Current roles get the enchantment shimmer and an advancement pop-up |
| **Categories** | Management & Staffing titles, subtitles, hotbar names, icons, or add more categories |
| **Skills** | Skills shown like enchantments, levels I to V |
| **Stats** | Up to 4 item stacks under your name, each with an icon. Auto-counters: `{servers}` `{members}` `{current}` `{past}` `{roles:management}` `{roles:staffing}` |
| **Sections & Text** | Show/hide/reorder sections (Y-levels follow the order), headings, hotbar names and icons, contact text + extra buttons, footer, browser tab title, Google description |
| **Theme** | Presets (Aqua, Tropical, Monument, Frozen), every water colour from sky to abyss, text colours, font (Monocraft built in), text size, effects on/off |
| **Backup & JSON** | Download/import a backup, undo the last save, reset to defaults, raw JSON editing |

- The preview on the right updates as you type. On a phone, tap **Preview**.
- **Ctrl/Cmd + S** saves.
- Every save keeps the previous version — *Backup & JSON → Load previous save* to undo.
- In About text: blank line = new paragraph, `**word**` = highlighted.

## Notes

- **Skin:** the page draws BaconedXD's real Minecraft skin in pixels. `netlify/functions/skin.mjs` looks it up live
  from Minecraft by username (cached for an hour), so a new skin shows up automatically. If that lookup isn't
  available, it uses the backup skin file saved in the dashboard (his current skin is already set).
  To show a different picture instead, set *Custom picture instead of skin* in the Profile tab.
- **Changing the password:** edit `ADMIN_PASSWORD` in Netlify and redeploy.
- **Forgot to set the password?** The login screen tells you `ADMIN_PASSWORD isn't set`.
- **Without the function** (e.g. drag-and-drop): the dashboard still works in *Offline* mode —
  "Save" downloads `content.json`; replace `public/content.json` with it and redeploy.
- Test locally with `npx netlify-cli dev` (uses a local sandbox store, not your live data).
- Font: [Monocraft](https://github.com/IdreesInc/Monocraft) by Idrees Hassan, SIL Open Font License (`public/assets/fonts/Monocraft-OFL.txt`).
