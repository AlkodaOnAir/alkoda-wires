/* ═══════════════════════════════════════════════════════════════
   brands.js — Base de marques AV/Broadcast/IT
   Chaque entrée : { cat, aliases[] }
   cat = id de catégorie (DEFAULT_CATS)
   Pour ajouter une marque : ajouter une entrée dans BRANDS_DB
   Les marques apprises par l'utilisateur sont dans LEARNED_BRANDS
   (sauvegardées via localStorage)
═══════════════════════════════════════════════════════════════ */

const BRANDS_DB = {
  // ── Switchers / Mixers vidéo ─────────────────────────────────
  'Blackmagic':       { cat: 'switcher', aliases: ['Blackmagic Design', 'BMD'] },
  'ATEM':             { cat: 'switcher', aliases: [] },
  'Roland':           { cat: 'switcher', aliases: ['Roland Pro A/V'] },
  'Datavideo':        { cat: 'switcher', aliases: [] },
  'NewTek':           { cat: 'switcher', aliases: ['TriCaster'] },
  'TriCaster':        { cat: 'switcher', aliases: [] },
  'vMix':             { cat: 'switcher', aliases: [] },
  'SKAARHOJ':         { cat: 'switcher', aliases: [] },
  'Panasonic':        { cat: 'switcher', aliases: [] },
  'FOR-A':            { cat: 'switcher', aliases: ['FORA'] },
  'Grass Valley':     { cat: 'switcher', aliases: ['GV', 'Miranda'] },
  'Ross Video':       { cat: 'switcher', aliases: ['Ross'] },
  'Broadcast Pix':    { cat: 'switcher', aliases: [] },
  'Barco':            { cat: 'switcher', aliases: [] },
  'Kramer':           { cat: 'switcher', aliases: [] },

  // ── Capture ──────────────────────────────────────────────────
  'Elgato':           { cat: 'capture', aliases: ['El Gato'] },
  'Magewell':         { cat: 'capture', aliases: ['Mage Well'] },
  'Epiphan':          { cat: 'capture', aliases: ['Epiphan Video'] },
  'AVerMedia':        { cat: 'capture', aliases: ['Avermedia'] },
  'Hauppauge':        { cat: 'capture', aliases: [] },
  'Razer':            { cat: 'capture', aliases: [] },
  'Geniatech':        { cat: 'capture', aliases: [] },
  'Leadtek':          { cat: 'capture', aliases: [] },
  'Yuan':             { cat: 'capture', aliases: [] },
  'Decimator':        { cat: 'capture', aliases: [] },

  // ── Conversion / Encodeurs / Décodeurs ───────────────────────
  'Teradek':          { cat: 'conversion', aliases: [] },
  'LiveU':            { cat: 'conversion', aliases: [] },
  'Haivision':        { cat: 'conversion', aliases: [] },
  'Matrox':           { cat: 'conversion', aliases: [] },
  'Kiloview':         { cat: 'conversion', aliases: [] },
  'Vidiu':            { cat: 'conversion', aliases: ['VidiU'] },
  'Visionary Solutions': { cat: 'conversion', aliases: ['VSI'] },
  'Vitec':            { cat: 'conversion', aliases: [] },
  'tvONE':            { cat: 'conversion', aliases: ['TV One'] },
  'Analog Way':       { cat: 'conversion', aliases: [] },
  'Gefen':            { cat: 'conversion', aliases: [] },

  // ── Caméras ──────────────────────────────────────────────────
  'Sony':             { cat: 'camera', aliases: [] },
  'Canon':            { cat: 'camera', aliases: [] },
  'Nikon':            { cat: 'camera', aliases: [] },
  'Fujifilm':         { cat: 'camera', aliases: ['Fuji'] },
  'JVC':              { cat: 'camera', aliases: [] },
  'Ikegami':          { cat: 'camera', aliases: [] },
  'PTZOptics':        { cat: 'camera', aliases: ['PTZ Optics'] },
  'Marshall':         { cat: 'camera', aliases: ['Marshall Electronics'] },
  'Zcam':             { cat: 'camera', aliases: ['Z Cam'] },
  'RED':              { cat: 'camera', aliases: ['Red Digital Cinema'] },
  'ARRI':             { cat: 'camera', aliases: ['Arri'] },
  'Atomos':           { cat: 'camera', aliases: [] },
  'Vaddio':           { cat: 'camera', aliases: [] },
  'Lumens':           { cat: 'camera', aliases: [] },
  'HuddleCamHD':     { cat: 'camera', aliases: ['HuddleCam'] },
  'AVer':             { cat: 'camera', aliases: [] },
  'BirdDog':          { cat: 'camera', aliases: ['Bird Dog'] },
  'DJI':              { cat: 'camera', aliases: [] },
  'GoPro':            { cat: 'camera', aliases: ['Go Pro'] },
  'Insta360':         { cat: 'camera', aliases: [] },

  // ── Audio ────────────────────────────────────────────────────
  'Focusrite':        { cat: 'audio', aliases: ['Scarlett'] },
  'MOTU':             { cat: 'audio', aliases: [] },
  'RME':              { cat: 'audio', aliases: [] },
  'Yamaha':           { cat: 'audio', aliases: [] },
  'Behringer':        { cat: 'audio', aliases: [] },
  'PreSonus':         { cat: 'audio', aliases: ['Pre Sonus'] },
  'Mackie':           { cat: 'audio', aliases: [] },
  'Allen & Heath':    { cat: 'audio', aliases: ['Allen and Heath', 'A&H'] },
  'Rode':             { cat: 'audio', aliases: ['Røde'] },
  'Sennheiser':       { cat: 'audio', aliases: [] },
  'Shure':            { cat: 'audio', aliases: [] },
  'Audio-Technica':   { cat: 'audio', aliases: ['Audio Technica', 'AT'] },
  'AKG':              { cat: 'audio', aliases: [] },
  'Neumann':          { cat: 'audio', aliases: [] },
  'Zoom':             { cat: 'audio', aliases: [] },
  'Tascam':           { cat: 'audio', aliases: [] },
  'Steinberg':        { cat: 'audio', aliases: [] },
  'Universal Audio':  { cat: 'audio', aliases: ['UA', 'UAD'] },
  'Apogee':           { cat: 'audio', aliases: [] },
  'AVID':             { cat: 'audio', aliases: [] },
  'DiGiCo':           { cat: 'audio', aliases: [] },
  'Soundcraft':       { cat: 'audio', aliases: [] },
  'QSC':              { cat: 'audio', aliases: [] },
  'Crown':            { cat: 'audio', aliases: [] },
  'Lectrosonics':     { cat: 'audio', aliases: [] },
  'Wisycom':          { cat: 'audio', aliases: [] },
  'Zaxcom':           { cat: 'audio', aliases: [] },
  'Sound Devices':    { cat: 'audio', aliases: ['SoundDevices'] },
  'Genelec':          { cat: 'audio', aliases: [] },
  'Adam Audio':       { cat: 'audio', aliases: ['ADAM'] },
  'Yamaha':           { cat: 'audio', aliases: [] },
  'Audient':          { cat: 'audio', aliases: [] },
  'IK Multimedia':    { cat: 'audio', aliases: ['IK'] },
  'BOSS':             { cat: 'audio', aliases: [] },
  'TC Electronic':    { cat: 'audio', aliases: ['TC-Helicon'] },
  'dbx':              { cat: 'audio', aliases: [] },
  'Klark Teknik':     { cat: 'audio', aliases: [] },
  'Midas':            { cat: 'audio', aliases: [] },
  'Neve':             { cat: 'audio', aliases: ['AMS Neve'] },

  // ── Réseau ───────────────────────────────────────────────────
  'GL.iNet':          { cat: 'network', aliases: ['GLiNet', 'GL-iNet', 'glinet', 'GL iNet'] },
  'Cisco':            { cat: 'network', aliases: [] },
  'Netgear':          { cat: 'network', aliases: [] },
  'Ubiquiti':         { cat: 'network', aliases: ['Unifi', 'UniFi'] },
  'TP-Link':          { cat: 'network', aliases: ['TPLink', 'TP Link'] },
  'MikroTik':         { cat: 'network', aliases: ['Mikrotik'] },
  'Aruba':            { cat: 'network', aliases: [] },
  'Juniper':          { cat: 'network', aliases: [] },
  'D-Link':           { cat: 'network', aliases: ['DLink'] },
  'Zyxel':            { cat: 'network', aliases: [] },
  'Meraki':           { cat: 'network', aliases: [] },

  // ── Ordinateurs ──────────────────────────────────────────────
  'Apple':            { cat: 'computer', aliases: ['Mac', 'MacBook', 'iMac', 'Mac Pro', 'Mac Mini'] },
  'Dell':             { cat: 'computer', aliases: [] },
  'HP':               { cat: 'computer', aliases: ['Hewlett-Packard', 'Hewlett Packard'] },
  'Lenovo':           { cat: 'computer', aliases: ['ThinkPad', 'IdeaPad'] },
  'ASUS':             { cat: 'computer', aliases: ['Asus'] },
  'MSI':              { cat: 'computer', aliases: [] },
  'Microsoft':        { cat: 'computer', aliases: ['Surface'] },
  'Acer':             { cat: 'computer', aliases: [] },
  'Gigabyte':         { cat: 'computer', aliases: [] },

  // ── Écrans / Moniteurs ───────────────────────────────────────
  'LG':               { cat: 'display', aliases: [] },
  'Samsung':          { cat: 'display', aliases: [] },
  'BenQ':             { cat: 'display', aliases: [] },
  'EIZO':             { cat: 'display', aliases: [] },
  'NEC':              { cat: 'display', aliases: [] },
  'SmallHD':          { cat: 'display', aliases: ['Small HD'] },
  'Lilliput':         { cat: 'display', aliases: [] },
  'TVLogic':          { cat: 'display', aliases: ['TV Logic'] },
  'Flanders Scientific': { cat: 'display', aliases: ['FSI'] },
  'Postium':          { cat: 'display', aliases: [] },
  'ikan':             { cat: 'display', aliases: ['Ikan'] },
  'Viewsonic':        { cat: 'display', aliases: ['ViewSonic'] },
  'AOC':              { cat: 'display', aliases: [] },
  'Philips':          { cat: 'display', aliases: [] },

  // ── Stockage ─────────────────────────────────────────────────
  'WD':               { cat: 'storage', aliases: ['Western Digital'] },
  'Seagate':          { cat: 'storage', aliases: [] },
  'SanDisk':          { cat: 'storage', aliases: ['San Disk'] },
  'LaCie':            { cat: 'storage', aliases: [] },
  'G-Technology':     { cat: 'storage', aliases: ['G-Tech', 'G Tech'] },
  'OWC':              { cat: 'storage', aliases: ['Other World Computing'] },
  'Synology':         { cat: 'storage', aliases: [] },
  'QNAP':             { cat: 'storage', aliases: [] },
  'Buffalo':          { cat: 'storage', aliases: [] },
  'Crucial':          { cat: 'storage', aliases: [] },
  'Kingston':         { cat: 'storage', aliases: [] },
  'Sabrent':          { cat: 'storage', aliases: [] },
  'ProGrade':         { cat: 'storage', aliases: ['Pro Grade'] },
  'Angelbird':        { cat: 'storage', aliases: [] },

  // ── Alimentation ─────────────────────────────────────────────
  'APC':              { cat: 'power', aliases: ['American Power Conversion'] },
  'Eaton':            { cat: 'power', aliases: [] },
  'CyberPower':       { cat: 'power', aliases: ['Cyber Power'] },
  'Tripp Lite':       { cat: 'power', aliases: ['Tripplite'] },
  'Furman':           { cat: 'power', aliases: [] },
  'Voltcraft':        { cat: 'power', aliases: [] },

  // ── USB / Hubs ───────────────────────────────────────────────
  'Anker':            { cat: 'usb', aliases: [] },
  'Belkin':           { cat: 'usb', aliases: [] },
  'CalDigit':         { cat: 'usb', aliases: ['Cal Digit'] },
  'Plugable':         { cat: 'usb', aliases: [] },
  'Satechi':          { cat: 'usb', aliases: [] },
  'HyperDrive':       { cat: 'usb', aliases: ['Hyper Drive'] },
  'j5create':         { cat: 'usb', aliases: [] },
  'StarTech':         { cat: 'usb', aliases: ['Star Tech'] },

  // ── Rack ─────────────────────────────────────────────────────
  'Middle Atlantic':  { cat: 'rack', aliases: [] },
  'Gator':            { cat: 'rack', aliases: [] },
  'SKB':              { cat: 'rack', aliases: [] },
  'Pelican':          { cat: 'rack', aliases: [] },
  'Raxxess':          { cat: 'rack', aliases: [] },
  'Penn Elcom':       { cat: 'rack', aliases: [] },

  // ── Externe / Divers AV ──────────────────────────────────────
  'Extron':           { cat: 'external', aliases: [] },
  'Crestron':         { cat: 'external', aliases: [] },
  'AMX':              { cat: 'external', aliases: [] },
  'Biamp':            { cat: 'external', aliases: [] },
  'Shinybow':         { cat: 'external', aliases: [] },
  'Atlona':           { cat: 'external', aliases: [] },
  'Lightware':        { cat: 'external', aliases: [] },
  'DVDO':             { cat: 'external', aliases: [] },
  'Key Digital':      { cat: 'external', aliases: ['KeyDigital'] },
  'Just Add Power':   { cat: 'external', aliases: ['JAP', 'Just Add'] },
  'Zeevee':           { cat: 'external', aliases: ['ZeeVee'] },
};

// ── Base apprise (persistée en localStorage) ─────────────────
let LEARNED_BRANDS = {};
try {
  LEARNED_BRANDS = JSON.parse(localStorage.getItem('wires-learned-brands') || '{}');
} catch { LEARNED_BRANDS = {}; }

function _saveLearnedBrands() {
  localStorage.setItem('wires-learned-brands', JSON.stringify(LEARNED_BRANDS));
}

// ── Détection de marque ───────────────────────────────────────
// Retourne { brand, cat } ou null
function detectBrand(fullName) {
  if (!fullName.trim()) return null;
  const lower = fullName.toLowerCase();

  // Chercher dans la base principale + aliases
  for (const [brand, info] of Object.entries(BRANDS_DB)) {
    const toCheck = [brand, ...info.aliases];
    for (const name of toCheck) {
      if (lower.startsWith(name.toLowerCase())) {
        return { brand, cat: info.cat };
      }
    }
  }

  // Chercher dans la base apprise
  for (const [brand, info] of Object.entries(LEARNED_BRANDS)) {
    if (lower.startsWith(brand.toLowerCase())) {
      return { brand, cat: info.cat };
    }
  }

  return null;
}

// ── Apprendre une nouvelle marque ────────────────────────────
// Appelé quand l'utilisateur confirme un appareil de marque inconnue
function learnBrand(fullName, cat) {
  const words = fullName.trim().split(/\s+/);
  if (words.length < 2) return;  // pas de modèle séparable = on n'apprend rien

  // La marque = premier mot (ou deux si le second est court et non un modèle)
  const brand = words[0];
  if (BRANDS_DB[brand] || LEARNED_BRANDS[brand]) return;  // déjà connue

  LEARNED_BRANDS[brand] = { cat };
  _saveLearnedBrands();
}

// ── Short name intelligent (priorité modèle) ─────────────────
function smartShortName(fullName) {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  if (words.length === 1) return words[0].substring(0, 10);

  const detection = detectBrand(fullName);
  let modelWords;

  if (detection) {
    // Savoir combien de mots compose la marque détectée
    const brandWords = detection.brand.split(/\s+/).length;
    modelWords = words.slice(brandWords);
  } else {
    // Pas de marque connue → ignorer le premier mot
    modelWords = words.slice(1);
  }

  if (!modelWords.length) return words[0].substring(0, 10);

  const joined = modelWords.join(' ');
  if (joined.length <= 12) return joined;

  const two = modelWords.slice(0, 2).join(' ');
  if (two.length <= 12) return two;

  return modelWords[0].substring(0, 10);
}
