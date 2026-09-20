function _notifyParentWhenReady(){
  const startedAt=Date.now();
  const maxWaitMs=15000;
  const notify=()=>{
    document.body.dataset.demoReady="1";
    if(window.parent&&window.parent!==window){
      window.parent.postMessage({type:"wires-demo-ready"},"*");
    }
  };
  const check=()=>{
    const canvasRoot=document.getElementById("canvas-root");
    const nodes=[...document.querySelectorAll("#nodes-layer .node")];
    const cables=[...document.querySelectorAll("#cables-svg .cable-visual")];
    const images=[...document.querySelectorAll("#nodes-layer .node img")];
    const imagesReady=images.every(img=>img.complete&&img.naturalWidth>0);
    if(canvasRoot&&nodes.length>0&&cables.length>0&&imagesReady){
      requestAnimationFrame(()=>requestAnimationFrame(notify));
      return;
    }
    if(Date.now()-startedAt>maxWaitMs){
      notify();
      return;
    }
    setTimeout(check,120);
  };
  requestAnimationFrame(()=>requestAnimationFrame(check));
}
function _showStartupScreen(){
  const e=document.getElementById("startup-screen");
  e&&e.classList.add("hidden");
  loadState(window.DEMO_PROJECT_DATA);
  window.electronAPI&&window.electronAPI.setProjectOpen(!0);
  _notifyParentWhenReady();
}
const _realSetLang=setLang;
setLang=function(e){_realSetLang("en")};
const LICENSE={init:async()=>({isPro:!0,hasKey:!0,isExpired:!1}),initUI:()=>{},isPro:()=>!0,gate:(e,t)=>t(),showGate:()=>{},showPaywall:()=>{},getStatus:()=>({isPro:!0,hasKey:!0,isExpired:!1})};

// --- stubs démo web : modules about-ui.js / export.js / update.js omis du bundle ---
// (sans ça, app.js bootstrap plante sur ABOUT.init()/initExportDialog() avant initFileIO,
// ou sur _checkForUpdate() juste après — un appel non gardé, contrairement à
// initExportMenu() qui teste déjà typeof avant de s'exécuter)
const ABOUT={init:()=>{}};
function initExportDialog(){}
function _checkForUpdate(){}

// locales.js donne des chemins relatifs à l'app réelle (assets/search/...) ;
// cette page vit un niveau plus bas (renderer-web-demo/), d'où le préfixe.
// Patché ici plutôt que dans locales.js : fichier partagé avec Search/Wires,
// jamais touché pour un besoin propre à cette démo.
for(const lang of ['en','fr','es']){
  const l=WIRES_LOCALES.renderer[lang];
  if(l&&l.search_logo_src) l.search_logo_src='../renderer/'+l.search_logo_src;
}


// ── Recherche d'image en ligne : indisponible dans cette demo ────────────────
// Elle passe par une fenetre Electron dediee, absente d'une page web. Sans ce
// garde-fou le visiteur ouvre une fenetre qui ne peut aboutir. On neutralise donc
// le bouton plutot que de le laisser promettre ce qui ne marchera pas.
// L'infobulle traduite est retiree, sinon le prochain changement de langue la
// reecrirait par-dessus la notre.
function _demoDisableImageSearch() {
  var btn = document.getElementById('pick-image-search');
  if (!btn || btn.dataset.demoDisabled === '1') return;
  btn.dataset.demoDisabled = '1';
  btn.disabled = true;
  btn.removeAttribute('data-i18n-title');
  btn.title = 'Online image search is not available in this demo';
  btn.style.cursor = 'not-allowed';
  btn.style.opacity = '0.4';
  btn.style.filter = 'grayscale(1)';
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }, true);
}
_demoDisableImageSearch();
document.addEventListener('DOMContentLoaded', _demoDisableImageSearch);


// ── Scan du reseau : indisponible dans cette demo ────────────────────────────
// Le bouton « Scanner le reseau » (#ip-ipaddr-scan, panel.js) interroge le reseau
// local par Electron : une page web n'y a aucun acces, le bouchon repond toujours
// rien et le visiteur clique dans le vide. On le neutralise comme la recherche
// d'image en ligne (voir _demoDisableImageSearch plus haut).
// Il est RECREE a chaque ouverture du panneau d'information : d'ou une regle de
// style, qui s'applique a toutes ses versions futures, et un blocage a la capture
// plutot qu'un reglage pose une seule fois au chargement.
// Securite anti-regression : window._xDemoNetworkScan = true -> bouton laisse actif.
function _demoDisableNetworkScan() {
  if (window._xDemoNetworkScan === true) return;
  if (!document.getElementById('demo-no-netscan')) {
    const style = document.createElement('style');
    style.id = 'demo-no-netscan';
    style.textContent = '#ip-ipaddr-scan{opacity:.4;filter:grayscale(1);cursor:not-allowed}';
    (document.head || document.documentElement).appendChild(style);
  }
  const vise = e => e.target && e.target.closest && e.target.closest('#ip-ipaddr-scan');
  const bloquer = e => {
    const b = vise(e);
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  document.addEventListener('pointerdown', bloquer, true);
  document.addEventListener('mousedown', bloquer, true);
  document.addEventListener('click', bloquer, true);
  document.addEventListener('pointerover', e => {
    const b = vise(e);
    if (b && !b.title) b.title = 'Network scan is not available in this demo';
  }, true);
}
_demoDisableNetworkScan();
document.addEventListener('DOMContentLoaded', _demoDisableNetworkScan);
