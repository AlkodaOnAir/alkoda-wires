/* ═══════════════════════════════════════════════════════════════
   partage.js — la page d'un lien Wires Cloud (alkoda-wires.com/partage.html#jeton)
   Wires by Alkoda © 2026

   1.6.0, sa demande du 07-10 : le propriétaire d'un projet Wires Cloud crée un
   lien dans Wires (Exporter → « Lien Wires Cloud ») et l'envoie à qui il veut.
   Cette page montre le nom du projet, le pseudo du propriétaire et la date de
   fin du lien, avec deux boutons : « Charger le projet » (un fichier .wires
   complet, images comprises) et « Télécharger Wires ».

   Serveur : la fonction wires-partage de Search (voir, charger), ouverte à ce
   seul site. Le jeton est après le # : le navigateur ne l'envoie jamais de
   lui-même ; la page le passe dans le corps de ses demandes.

   ⚠️ FICHIER ASSEMBLÉ par assembler_partage.py (D:\Sandbox\site-partage-src) :
   modifier partage.source.js, jamais partage.js. Le code qui refait le projet
   est recopié TEL QUEL de Wires (cloud-depot.js, library.js), comme dans
   l'onglet Cloud de la page de statistiques.
═══════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  const SERVEUR = 'https://isputddtxoaxmjdxuxlt.supabase.co/functions/v1/wires-partage';
  // Publique par conception (Search, contrat section 2) : elle voyage déjà dans Wires.
  const CLE_PUBLIQUE = 'sb_publishable_dLHpjz7_xtzeb_Fonamzbg_PqvMNo48';
  const FORMAT_DOCUMENT = 'wires-cloud-document';
  const VERSION_DOCUMENT = 1;

  // Recopiées TELLES QUELLES par assembler_partage.py — ne pas les retoucher ici :
  //   cloud-depot.js : FACES, SUFFIXES, estImageEmbarquee, estInterne, octetsDeDataUrl, _ascii, formatReel, _empreinteOctets, empreinte, _recadrer, reconstruireFace, reconstruireProjet ;
  //   library.js     : detourageIsole, _removeBgCanvas.
  // `global` y désigne ce dont elles se servent dans la fenêtre de Wires ;
  // `_rmbgCanvas` est la référence que laisse le détourage (privée à library.js).
  const WiresFormat = (function () {
    const global = { document: window.document, crypto: window.crypto, Image: window.Image };
    let _rmbgCanvas = null;

    // Les champs d'image d'un appareil, par face. L'arrière n'existe pas sur
    // les appareils créés avant la 1.5.0 : on parcourt ce qu'on trouve, jamais
    // une paire supposée.
    //
    // Dans le DOCUMENT déposé, une image qui a quitté le document est
    // remplacée par son empreinte :
    //   `<f>_ref`      l'originale ;
    //   `<f>_det_ref`  la détourée, envoyée TELLE QUELLE.
    // Et la détourée qui n'a pas voyagé se refait selon :
    //   `<f>_rejouer`  tolérance et recadrage, vérifiés au dépôt ;
    //   `<f>_idem`     c'est l'originale elle-même (icône, forme…).
    // Une image restée dans le document garde simplement son champ habituel.
    // Le marqueur d'origine `<f>_src` reste un champ ordinaire de l'appareil.
    const FACES = [
      { cle: 'img',     detouree: 'img',     originale: 'img_original',     src: 'img_src',     tol: 'rmbg_tol',     crop: 'rmbg_crop',     forme: 'shape' },
      { cle: 'imgRear', detouree: 'imgRear', originale: 'imgRear_original', src: 'imgRear_src', tol: 'rmbg_tolRear', crop: 'rmbg_cropRear', forme: 'shapeRear' },
    ];

    const SUFFIXES = ['_ref', '_det_ref', '_rejouer', '_idem'];

    function estImageEmbarquee(v) {
      return typeof v === 'string' && v.startsWith('data:');
    }

    // ⛔ Le pseudo-appareil « Internet » porte une icône interne de Wires, pas
    // une image d'utilisateur : il reste dans le document tel quel, sans rien
    // envoyer. ⚠️ Surtout ne pas lui retirer son image : elle est écrite à sa
    // création (nodes.js) et jamais recalculée au chargement — un projet
    // revenu sans elle l'afficherait vide.
    // ⚠️ Son identifiant est un uuid ordinaire (nodes.js) : seuls `cat` et
    // `virtual` le désignent. Tester `id === 'internet'` ne l'écartait jamais —
    // relevé par Search le 2026-10-01.
    function estInterne(noeud) {
      return noeud && (noeud.cat === 'internet' || noeud.virtual === true);
    }

    function octetsDeDataUrl(dataUrl) {
      const virgule = dataUrl.indexOf(',');
      if (virgule < 0) throw new Error('cloud-depot : data URL sans virgule.');
      const entete = dataUrl.slice(0, virgule);
      const corps  = dataUrl.slice(virgule + 1);
      if (!/;base64/i.test(entete)) {
        return new TextEncoder().encode(decodeURIComponent(corps));
      }
      const binaire = atob(corps);
      const out = new Uint8Array(binaire.length);
      for (let i = 0; i < binaire.length; i++) out[i] = binaire.charCodeAt(i);
      return out;
    }

    function _ascii(o, debut, fin) {
      return String.fromCharCode.apply(null, o.subarray(debut, fin));
    }

    // Le format RÉEL d'une image, lu dans ses premiers octets. Mêmes règles que
    // le contrôle du serveur et que `isValidatedAvif` dans Search : ce qui passe
    // ici, le serveur l'acceptera. null : l'image reste dans le document.
    function formatReel(o) {
      if (o.length >= 8 && o[0] === 0x89 && _ascii(o, 1, 4) === 'PNG'
          && o[4] === 0x0D && o[5] === 0x0A && o[6] === 0x1A && o[7] === 0x0A) return 'image/png';
      if (o.length >= 3 && o[0] === 0xFF && o[1] === 0xD8 && o[2] === 0xFF) return 'image/jpeg';
      if (o.length >= 12 && _ascii(o, 0, 4) === 'RIFF' && _ascii(o, 8, 12) === 'WEBP') return 'image/webp';
      if (o.length >= 16 && _ascii(o, 4, 8) === 'ftyp') {
        const taille = o[0] * 0x1000000 + (o[1] << 16) + (o[2] << 8) + o[3];
        const fin = Math.min(taille > 0 ? taille : o.length, o.length);
        const marque = _ascii(o, 8, 12);
        if (marque === 'avif' || marque === 'avis') return 'image/avif';
        for (let i = 16; i + 4 <= fin; i += 4) {
          const compatible = _ascii(o, i, i + 4);
          if (compatible === 'avif' || compatible === 'avis') return 'image/avif';
        }
      }
      return null;
    }

    // SHA-256 des OCTETS BRUTS du fichier, pas de la chaîne base64 : le
    // serveur recalcule l'empreinte sur les octets reçus et refuse tout écart.
    async function _empreinteOctets(octets) {
      if (!global.crypto || !global.crypto.subtle) {
        throw new Error('cloud-depot : crypto.subtle indisponible ici.');
      }
      const condense = await global.crypto.subtle.digest('SHA-256', octets);
      return Array.from(new Uint8Array(condense)).map(o => o.toString(16).padStart(2, '0')).join('');
    }

    async function empreinte(dataUrl) {
      return _empreinteOctets(octetsDeDataUrl(dataUrl));
    }

    // Recadre le canvas issu du détourage, avec les mêmes arrondis que
    // `_applyCrop`. ⚠️ Source = le canvas, jamais un PNG rechargé : l'aller-
    // retour abîme les pixels à demi transparents du fondu de contour (mesuré :
    // jusqu'à 8 % des pixels d'une image).
    function _recadrer(canvas, crop, natW, natH) {
      const r = Math.round;
      const out = global.document.createElement('canvas');
      out.width  = r(crop.w * natW);
      out.height = r(crop.h * natH);
      out.getContext('2d').drawImage(canvas, r(-crop.x * natW), r(-crop.y * natH), r(natW), r(natH));
      return out.toDataURL('image/png');
    }

    /**
     * Refait l'image détourée d'une face.
     *
     * @param {number|null} tolerance  la valeur du CURSEUR (`rmbg_tol`).
     *   ⚠️ Wires la DOUBLE avant de l'appliquer (`tol * 2`, library.js, depuis
     *   la 1.4.0). Absente → 0 ; si ce n'était pas la bonne valeur, la
     *   vérification au dépôt l'a vu et la face voyage telle quelle.
     * @param {boolean} forme  forme générique : l'image reste telle quelle.
     */
    async function reconstruireFace(originale, tolerance, crop, forme) {
      if (typeof originale !== 'string' || !originale) return null;
      if (forme) return originale;
      // Par `detourageIsole` (library.js), jamais `_removeBgCanvas` en direct :
      // celui-ci laisse une référence globale dont la fenêtre Configuration
      // image se sert ; l'enveloppe la remet en place.
      if (typeof global.detourageIsole !== 'function') {
        throw new Error('cloud-depot : detourageIsole absent (library.js non chargé ?).');
      }
      const r = await global.detourageIsole(originale, (Number(tolerance) || 0) * 2);
      if (!crop) return r.dataUrl;
      return _recadrer(r.canvas, crop, r.natW, r.natH);
    }

    /**
     * Refait un projet complet à partir de ce qui a été déposé.
     *
     * @param {function} fournirImage  `({ empreinte, chemin }) => Promise<dataUrl>`.
     *   Le seul point qui touche au réseau. ⚠️ Passe par le processus
     *   principal : le rendu n'a pas le droit de faire un appel réseau.
     * @returns {{projet, manquantes}}  une image qu'on n'a pas pu obtenir est
     *   LISTÉE, jamais ignorée : un projet revenu incomplet doit se voir.
     *   `quoi` dit laquelle : sans 'detouree' la face s'affiche quand même,
     *   mais sa tolérance ne pourra plus être re-réglée.
     */
    async function reconstruireProjet(doc, fournirImage) {
      const projet = JSON.parse(JSON.stringify(doc || {}));
      const manquantes = [];
      const recues = new Map(); // une image partagée par dix appareils n'est demandée qu'une fois

      const obtenir = (emp, chemin) => {
        if (!recues.has(emp)) {
          recues.set(emp, (async () => {
            try {
              const dataUrl = await fournirImage({ empreinte: emp, chemin: chemin || null });
              // ⛔ Chaque image reçue est vérifiée contre son empreinte : une
              // image qui n'est pas EXACTEMENT celle déposée n'entre jamais
              // dans le projet.
              return (estImageEmbarquee(dataUrl) && await empreinte(dataUrl) === emp) ? dataUrl : null;
            } catch (e) {
              return null;
            }
          })());
        }
        return recues.get(emp);
      };

      for (const noeud of (projet.nodes || [])) {
        if (estInterne(noeud)) continue;

        for (const f of FACES) {
          const ref     = noeud[f.cle + '_ref'];
          const detRef  = noeud[f.cle + '_det_ref'];
          const rejouer = noeud[f.cle + '_rejouer'] === true;
          const idem    = noeud[f.cle + '_idem'] === true;
          for (const s of SUFFIXES) delete noeud[f.cle + s];

          const face = f.cle === 'img' ? 'avant' : 'arriere';
          const manque = quoi => manquantes.push({ noeud: noeud.id, nom: noeud.name || '', face, quoi });

          // L'originale : restée dans le document, ou à aller chercher.
          if (ref) {
            const o = await obtenir(ref, noeud[f.src]);
            if (o) noeud[f.originale] = o; else manque('originale');
          }
          const originale = noeud[f.originale];

          // La détourée : restée dans le document, envoyée, ou à refaire.
          if (detRef) {
            const d = await obtenir(detRef, null);
            if (d) noeud[f.detouree] = d; else manque('detouree');
          } else if (idem || rejouer) {
            let d = null;
            if (estImageEmbarquee(originale)) {
              try {
                d = idem ? originale
                  : await reconstruireFace(originale, noeud[f.tol], noeud[f.crop] || null, !!noeud[f.forme]);
              } catch (e) {
                d = null;
              }
            }
            if (d) noeud[f.detouree] = d; else manque('detouree');
          }
        }
      }

      return { projet, manquantes };
    }

    // ── Détourage SANS effet de bord ──────────────────────────────
    //
    // Pour reconstruire un projet repris en ligne : on refait l'image détourée à
    // partir de l'originale, de la tolérance et du recadrage.
    //
    // ⚠️ `_removeBgCanvas` laisse derrière lui une référence globale au canvas
    // (`_rmbgCanvas`), dont `_applyCrop` se sert comme source. Une reconstruction
    // en arrière-plan écraserait donc ce que la fenêtre Configuration image a sous
    // la main, et le prochain recadrage porterait sur la mauvaise image. On remet
    // la valeur en place.
    //
    // Doit vivre ICI : `_rmbgCanvas` est privée au fichier, une enveloppe posée
    // ailleurs ne pourrait pas la restaurer.
    async function detourageIsole(dataUrl, tolerance) {
      const sauve = _rmbgCanvas;
      try {
        const r = await _removeBgCanvas(dataUrl, Number(tolerance) || 0);
        // ⚠️ On rend AUSSI le canvas, et c'est essentiel : le recadrage doit
        // travailler dessus directement, comme le fait `_applyCrop`. Passer par un
        // PNG intermédiaire ferait perdre de la précision aux pixels à demi
        // transparents du fondu de contour (un canvas range la transparence sous
        // une forme interne, l'aller-retour la convertit deux fois). Mesuré le
        // 2026-10-01 : jusqu'à 8 % des pixels d'une image détourée en étaient
        // affectés.
        return Object.assign({}, r, { canvas: _rmbgCanvas });
      } finally {
        _rmbgCanvas = sauve;
      }
    }

    // ── Algorithme suppression fond (canvas) — retourne dataUrl + bbox ──
    function _removeBgCanvas(dataUrl, tolerance) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const W = img.width, H = img.height;
          const canvas = document.createElement('canvas');
          canvas.width = W; canvas.height = H;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const imageData = ctx.getImageData(0, 0, W, H);
          const data = imageData.data;

          // Flood fill depuis les 4 bords — supprime uniquement les pixels contigus au contour
          const visited = new Uint8Array(W * H);
          const queue = [];

          const colorDist = (i, r, g, b) => {
            const dr = data[i] - r, dg = data[i+1] - g, db = data[i+2] - b;
            return Math.sqrt(dr*dr + dg*dg + db*db);
          };

          // Estimer la couleur de fond depuis tout le pourtour (pas seulement les 4
          // coins) et prendre la médiane — un fond studio avec un léger dégradé ou
          // une ombre portée pouvait rendre 4 coins non représentatifs de tout le
          // bord, laissant des zones de fond hors tolérance donc jamais supprimées.
          // Un pixel de bord déjà transparent (marge pré-existante dans le fichier
          // importé) est exclu de l'échantillon : sinon il tire la médiane vers le
          // noir (RGB à 0 sur un pixel transparent), et un vrai fond blanc devient
          // alors à une distance de couleur hors de portée de toute tolérance.
          const edgeR = [], edgeG = [], edgeB = [];
          const sampleEdge = i => {
            if (data[i+3] === 0) return;
            edgeR.push(data[i]); edgeG.push(data[i+1]); edgeB.push(data[i+2]);
          };
          for (let x = 0; x < W; x++) {
            sampleEdge(x*4);
            sampleEdge(((H-1)*W+x)*4);
          }
          for (let y = 1; y < H-1; y++) {
            sampleEdge((y*W)*4);
            sampleEdge((y*W+(W-1))*4);
          }
          const median = arr => { const s = arr.slice().sort((a,b)=>a-b); return s[Math.floor(s.length/2)]; };
          const bgR = edgeR.length ? median(edgeR) : 255;
          const bgG = edgeG.length ? median(edgeG) : 255;
          const bgB = edgeB.length ? median(edgeB) : 255;

          // Amorcer la file avec tous les pixels de bord qui ressemblent au fond
          const enqueue = (x, y) => {
            const idx = y * W + x;
            if (visited[idx]) return;
            const i = idx * 4;
            if (data[i+3] === 0 || colorDist(i, bgR, bgG, bgB) < tolerance) {
              visited[idx] = 1;
              queue.push(idx);
            }
          };
          for (let x = 0; x < W; x++) { enqueue(x, 0); enqueue(x, H-1); }
          for (let y = 1; y < H-1; y++) { enqueue(0, y); enqueue(W-1, y); }

          // BFS
          let qi = 0;
          while (qi < queue.length) {
            const idx = queue[qi++];
            data[idx*4+3] = 0;  // rendre transparent
            const x = idx % W, y = Math.floor(idx / W);
            if (x > 0)   enqueue(x-1, y);
            if (x < W-1) enqueue(x+1, y);
            if (y > 0)   enqueue(x, y-1);
            if (y < H-1) enqueue(x, y+1);
          }

          // Fondu sur le contour : les pixels juste à l'extérieur de la zone
          // supprimée reçoivent une transparence progressive au lieu d'un cran
          // net, sur quelques pixels de profondeur — adoucit le contour crénelé
          // et mange le liseré résiduel des pixels d'anti-crénelage de la photo
          // d'origine, sans jamais toucher aux pixels franchement opaques (loin
          // au-delà de tolerance+FEATHER).
          const FEATHER = 40;    // largeur du dégradé, en distance de couleur au-delà de la tolérance
          const FEATHER_PX = 3;  // profondeur du dégradé, en pixels autour du contour
          const inFeather = new Uint8Array(W * H);
          let ring = queue;
          for (let pass = 0; pass < FEATHER_PX && ring.length; pass++) {
            const next = [];
            for (const idx of ring) {
              const x = idx % W, y = Math.floor(idx / W);
              const cand = [];
              if (x > 0)   cand.push(idx - 1);
              if (x < W-1) cand.push(idx + 1);
              if (y > 0)   cand.push(idx - W);
              if (y < H-1) cand.push(idx + W);
              for (const nIdx of cand) {
                if (visited[nIdx] || inFeather[nIdx]) continue;
                const i = nIdx * 4;
                if (data[i+3] === 0) continue;
                const dist = colorDist(i, bgR, bgG, bgB);
                if (dist < tolerance + FEATHER) {
                  const factor = Math.max(0, Math.min(1, (dist - tolerance) / FEATHER));
                  data[i+3] = Math.round(data[i+3] * factor);
                  inFeather[nIdx] = 1;
                  next.push(nIdx);
                }
              }
            }
            ring = next;
          }

          ctx.putImageData(imageData, 0, 0);

          // Garder une référence au canvas pour le crop synchrone
          _rmbgCanvas = canvas;

          // Bounding box des pixels visibles — même seuil que _alphaBBFromCanvas
          // (ignore les pixels quasi transparents) : sans ça, ce rognage gardait
          // toute trace d'opacité même infime, un halo invisible à l'œil mais
          // au-dessus du seuil utilisé par l'occlusion des câbles (cables.js).
          let minX = W, minY = H, maxX = 0, maxY = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              if (data[(y * W + x) * 4 + 3] > 8) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
              }
            }
          }
          const bbox = (minX <= maxX && minY <= maxY)
            ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
            : { x: 0, y: 0, w: W, h: H };

          resolve({ dataUrl: canvas.toDataURL('image/png'), bbox, natW: W, natH: H });
        };
        img.onerror = reject;
        img.src = dataUrl;
      });
    }

    global.detourageIsole = detourageIsole;
    return { FACES, SUFFIXES, estImageEmbarquee, estInterne, octetsDeDataUrl, formatReel, empreinte, reconstruireFace, reconstruireProjet, detourageIsole };
  })();

  // ── Le serveur ──
  async function appelerServeur(action, jeton) {
    let r;
    try {
      r = await fetch(SERVEUR + '?action=' + action, {
        method: 'POST',
        headers: { apikey: CLE_PUBLIQUE, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jeton }),
      });
    } catch (e) {
      return { ok: false, code: 'reseau' };
    }
    try { return await r.json(); } catch (e) { return { ok: false, code: 'erreur_serveur' }; }
  }

  function enDataUrl(octets) {
    const type = WiresFormat.formatReel(octets);
    if (!type) return Promise.reject(new Error('format inconnu'));
    return new Promise((ok, ko) => {
      const lecteur = new FileReader();
      lecteur.onload = () => ok(lecteur.result);
      lecteur.onerror = () => ko(lecteur.error);
      lecteur.readAsDataURL(new Blob([octets], { type }));
    });
  }

  // Un fichier du lien, par un simple GET — jamais par la mémoire du navigateur (voir la page
  // de statistiques, 03-10). `progres` reçoit le nombre d'octets lus.
  async function lireFichier(lien, progres) {
    const r = await fetch(lien, { cache: 'reload' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const octets = new Uint8Array(await r.arrayBuffer());
    if (progres) progres(octets.length);
    return octets;
  }

  // Le projet entier, comme Wires le reconstruit : le document, puis chaque image, vérifiée
  // contre son empreinte. Une image illisible n'empêche pas le reste : l'appareil garde sa place.
  async function reconstruire(fichiers, progres) {
    const octetsDoc = await lireFichier(fichiers.document.lien, progres);
    const enveloppe = JSON.parse(new TextDecoder().decode(octetsDoc));
    if (!enveloppe || enveloppe.format !== FORMAT_DOCUMENT || !enveloppe.projet) throw Object.assign(new Error('document'), { code: 'document_invalide' });
    if (!(enveloppe.version <= VERSION_DOCUMENT)) throw Object.assign(new Error('document'), { code: 'document_trop_recent' });
    const parEmpreinte = new Map((fichiers.images || []).map(im => [im.empreinte, im]));
    const { projet, manquantes } = await WiresFormat.reconstruireProjet(enveloppe.projet, async ({ empreinte }) => {
      const im = parEmpreinte.get(empreinte);
      if (!im || !im.lien) throw new Error('sans lien');
      return enDataUrl(await lireFichier(im.lien, progres));
    });
    return { projet, manquantes };
  }

  // Le fichier .wires, écrit comme Wires l'écrit : son titre est le nom du projet.
  function fichierWires(projet, nom) {
    const p = Object.assign({}, projet, { meta: Object.assign({}, projet.meta, { title: nom }) });
    return new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  }

  function nomDeFichier(nom) {
    const propre = String(nom || 'projet').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100);
    return (propre || 'projet') + '.wires';
  }

  // ── La page ──
  function monter(options) {
    const racine = document.getElementById('partage');
    if (!racine) return;
    const serveur = (options && options.serveur) || appelerServeur;
    let textes = {};
    try { textes = JSON.parse(racine.dataset.textes || '{}'); } catch (e) {}
    const t = (cle, valeurs) => Object.entries(valeurs || {}).reduce(
      (s, [k, v]) => s.replace('$' + k, () => String(v)), textes[cle] || cle);
    const langue = document.documentElement.lang || 'en';
    const dateLongue = iso => {
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString(langue === 'fr' ? 'fr-FR' : langue === 'es' ? 'es-ES' : 'en-GB',
        { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const $ = sel => racine.querySelector(sel);
    const nom = $('.ps-nom'), par = $('.ps-par'), fin = $('.ps-fin'), etat = $('.ps-etat');
    const charger = $('.ps-charger');
    const jeton = decodeURIComponent((location.hash || '').replace(/^#/, '').trim());

    const dire = (texte, sorte) => {
      etat.textContent = texte || '';
      etat.hidden = !texte;
      etat.className = 'ps-etat' + (sorte ? ' ps-' + sorte : '');
    };
    const refus = r => {
      if (r && r.code === 'lien_invalide') return t('invalid');
      if (r && r.code === 'trop_de_demandes') return t('busy', { m: Math.max(1, Math.ceil((Number(r.reessayerDans) || 60) / 60)) });
      return t('error');
    };
    const invalide = texte => {
      racine.classList.add('ps-invalide');
      nom.textContent = '';
      par.textContent = '';
      fin.textContent = '';
      charger.disabled = true;
      dire(texte, 'refus');
    };

    // Changer de langue : la page de l'autre langue, AVEC le jeton (le changement sur place du
    // site, language-navigation.js, perdrait le # et la page remplie par ce script).
    document.addEventListener('click', e => {
      const a = e.target.closest('a.lang-opt[href]');
      if (!a || !jeton) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const url = new URL(a.getAttribute('href'), location.href);
      url.hash = encodeURIComponent(jeton);
      location.assign(url.href);
    }, true);

    if (!jeton) { invalide(t('invalid')); return; }
    racine.classList.add('ps-attente');
    dire(t('loading'));

    (async () => {
      const r = await serveur('voir', jeton);
      racine.classList.remove('ps-attente');
      if (!r || !r.ok) { invalide(refus(r)); return; }
      nom.textContent = r.nom || '';
      par.textContent = t('shared_by', { p: r.proprietaire || '?' });
      fin.textContent = t('until', { d: dateLongue(r.expireLe) });
      document.title = (r.nom ? r.nom + ' — ' : '') + document.title;
      charger.disabled = false;
      dire('');
    })();

    let enCours = false;
    charger.addEventListener('click', async () => {
      if (enCours) return;
      enCours = true;
      charger.disabled = true;
      dire(t('progress', { n: 0 }));
      try {
        const r = await serveur('charger', jeton);
        if (!r || !r.ok) { dire(refus(r), 'refus'); return; }
        const total = (r.document && r.document.octets || 0)
          + (r.images || []).reduce((s, im) => s + (Number(im.octets) || 0), 0);
        let lus = 0;
        const progres = n => {
          lus += n;
          if (total > 0) dire(t('progress', { n: Math.min(99, Math.round(lus * 100 / total)) }));
        };
        const { projet } = await reconstruire(r, progres);
        const fichier = nomDeFichier(r.nom);
        const url = URL.createObjectURL(fichierWires(projet, r.nom || ''));
        const a = document.createElement('a');
        a.href = url;
        a.download = fichier;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        dire(t('done', { f: fichier }), 'fait');
        global.__partageDernier = { fichier, projet };   // pour le banc d'essai
      } catch (e) {
        dire(t('error'), 'refus');
      } finally {
        enCours = false;
        charger.disabled = racine.classList.contains('ps-invalide');
      }
    });
  }

  global.Partage = { monter, reconstruire, fichierWires, _wires: WiresFormat };
  // Le banc d'essai monte la page lui-même, avec un faux serveur.
  if (!global.__partageManuel) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => monter());
    else monter();
  }
})(window);
