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

Because this is plain HTML, CSS, and JavaScript, no build step is required. Open index.html directly or serve the folder with any static-file server, for example:

    npx serve .

## Before launch

1. Confirm the opening days, phone number, exact map pin, payment policy, and business spelling.
2. Add approved, real photos of the storefront, interior, team, tools, and finished cuts; do not use stock or AI imagery.
3. Add the official Instagram URL once it is available.
4. Replace https://espartanosbarbershop.com/ in the canonical, Open Graph, sitemap, and robots.txt files if a different production domain is selected.
5. Connect the published domain to Google Search Console and submit sitemap.xml.

The site intentionally does not include prices, unverified rankings, fake reviews, autoplay media, newsletter popups, or account creation.

## Hiring form

The barber application form uses Netlify Forms. Before relying on it in production, make sure Forms -> Form detection is enabled in Netlify, deploy the site, confirm the `solicitud-barbero` form appears in the Forms dashboard, then add the intended email under Forms -> Submission notifications. Do not expose the recipient email on the public page.
