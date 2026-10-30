# Espartano's Barbershop

A fast, static Spanish-language website for Espartano's Barbershop in Choluteca, Honduras.

## Structure

- trabaja-con-nosotros/ - Spanish hiring page and current vacancy
- trabaja-con-nosotros/barbero-con-experiencia/ - application form for the current vacancy
- gracias/ - form-submission confirmation page
- index.html — Spanish homepage (primary)
- css/style.css — shared responsive styling
- js/main.js — mobile navigation and small enhancements
- images/ — supplied brand artwork and site icon

## Local preview

The public pages are plain HTML, CSS, and JavaScript. The admin login bundles the official Identity SDK with `npm run build`. Use Netlify Dev for the Functions and Blobs endpoints; a static-file server can preview layout only:

    npx serve .

## Before launch

1. Confirm the opening days, phone number, exact map pin, payment policy, and business spelling.
2. Add approved, real photos of the storefront, interior, team, tools, and finished cuts; do not use stock or AI imagery.
3. Add the official Instagram URL once it is available.
4. Replace https://espartanosbarbershop.com/ in the canonical, Open Graph, sitemap, and robots.txt files if a different production domain is selected.
5. Connect the published domain to Google Search Console and submit sitemap.xml.

The site intentionally does not include prices, unverified rankings, fake reviews, autoplay media, newsletter popups, or account creation.

## Hiring form

The barber application form uses Netlify Forms. Form detection and submission notifications are configured in the Netlify dashboard. Do not expose the recipient email on the public page.

## Gallery administration

- Public gallery: `/nuestros-trabajos/`. Owner login: `/admin/galeria/` (Spanish only).
- Run `npm ci` then `npm run build` to bundle the official Identity SDK for the browser. No framework is used. Run `npm test` for server authorization and storage-operation checks.
- Netlify runs the build and deploys the two Functions automatically. The site-wide `gallery` Blobs store is created on first use and survives deployments. No API token or Git Gateway is required.
- Keep Identity registration **Invite only**. Manually invite Anthony first, accept the invitation on the site, and add the **gallery-editor** role to that Identity user in Netlify. Sign out and back in after assigning a role. Repeat for the business owner after testing. An invited user without that role cannot access photos in the dashboard or change anything.
- Invitation and recovery links landing on the homepage are forwarded to the gallery login. Photos can be JPEG/PNG/WebP up to 20 MB in the browser; they are resized to 1800px, re-encoded as JPEG to remove metadata, and must be under 3 MB on the server.
- After deploying, test invitation, login, upload, hide/publish, feature, edit, delete, password recovery, and logout with an authorized user. Local tests never disable authentication.
- Gallery changes are stored separately from Git; a Git rollback does not restore deleted photos. Keep originals in your own photo backup.
