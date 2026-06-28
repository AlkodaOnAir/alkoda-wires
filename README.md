# Wires Website

This folder contains a standalone product website for Wires, designed as the official software showcase rather than a documentation page.

## Structure

- `index.html` - main product site with hero, workflow, features, use cases, license comparison, activation screenshot, resources, FAQ and CTA.
- `assets/css/site.css` - visual system, responsive layout, placeholders and Wires product illustrations.
- `assets/js/site.js` - configurable Download Wires link, multilingual strings and mobile navigation.
- `terms-of-service-wires.html` - local Terms of Service page.
- `refund-policy-wires.html` - local Refund Policy page.
- `MANUAL_FR.V3.docx` - supplied user guide, linked from the resources section.
- `Logos/` - Wires logo and favicon assets.

## UX Architecture

The page follows a product discovery path:

1. Immediate positioning: Wires is a desktop app for AV signal flow, not a drawing tool.
2. Visual proof: the hero shows a Wires-like interface with devices, routes, filters and animated signals.
3. Workflow: build devices, connect cables, animate routes, export/share.
4. Feature confidence: key professional features are grouped around signal clarity.
5. Media readiness: hero video, screenshots and six quick-start tutorial slots are already integrated.
6. Use cases: broadcast, live production, corporate AV, church AV, streaming and integration.
7. Conversion: Download Wires, then activate Pro in the same application with a license key.
8. Resources: manual, FAQ, local legal pages, release notes placeholder and future tutorials.

## Configuring The Download Link

Edit `assets/js/site.js`:

```js
const WIRES_LINKS = {
  download: "#download-wires"
};
```

Replace `download` with the final installer URL or download page. Wires Free and Wires Pro are the same application; Pro is unlocked inside Wires by entering a license key.

## Multilingual System

The main page uses the same principle as the Alkoda reference site:

- visible text is marked in `index.html` with `data-i18n="key"`;
- placeholder labels such as video badges use `data-i18n-label="key"`;
- translations live in `assets/js/site.js` inside `STRINGS.en`, `STRINGS.fr` and `STRINGS.es`;
- `setLang(lang)` updates the page, the HTML language, the title, SEO description, Open Graph metadata and localized activation screenshot;
- the selected language is stored in `localStorage` under `wires_lang`;
- the language selector uses the same dropdown flag pattern as the reference pages, extended to three languages.

## Media To Produce

- Hero video: 60 to 90 seconds showing project creation, devices, cabling, route animation, filters and export.
- Quick Start 1: create or open a project.
- Quick Start 2: add a device.
- Quick Start 3: remove background, crop and place ports.
- Quick Start 4: connect cables.
- Quick Start 5: create and animate signal routes.
- Quick Start 6: export HTML, PDF and pack list.
- Screenshot: main canvas with a complex AV setup.
- Screenshot: routes panel with multi-segment route and split.
- Screenshot: image editor with background removal and port placement.
- Screenshot: interactive HTML export.
- Optional: short loop for the hero background once real app capture is available.

## Design Notes

The design keeps the Alkoda On Air identity: dark broadcast atmosphere, night blue surfaces, cyan accents, rounded cards, restrained animation, Inter and Share Tech Mono typography. The content is written for professional trust and technical clarity, with SEO terms integrated naturally for AV diagram software, signal flow software, broadcast diagrams, cable planning and signal routing.

The site is intentionally static and autonomous. It has no dependency on Alkoda On Air pages and all legal/resource links point to local Wires files.
