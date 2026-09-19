window.electronAPI={licenseStatus:async()=>({isPro:!1,hasKey:!1,isExpired:!1}),onLicenseInvalidated:()=>{},recentsRead:async()=>[],autosaveRead:async()=>null,recentsWrite:async()=>{},recentsLoadFile:async()=>null,userCatsRead:async()=>({customCats:[],nativeOverrides:{},customCableTypes:[],cableColorOverrides:{},cableDashOverrides:{},nativeCatColors:{}}),userCatsWrite:async()=>{},userlibRead:async()=>[],userlibWrite:async()=>{},onFullscreenChange:()=>{},onMenuAction:()=>{},onAppClosing:()=>{},setSaveEnabled:()=>{},setTitle:()=>{},setProjectOpen:()=>{},setMenuLang:()=>{},confirmClose:()=>{},autosaveWrite:async()=>{},saveFile:async()=>!1,saveDialog:async()=>null,openDialog:async()=>null,logAppend:async()=>{},pickExportPath:async()=>null,exportPdf:async()=>{},pickHtmlSavePath:async()=>null,exportHtmlZip:async()=>{},exportPatchlistPdf:async()=>{},licenseActivate:async()=>({success:!1,error:"Not available in this demo"}),licenseDeactivate:async()=>({success:!1}),openExternal:async()=>{},pickExe:async()=>null,openWithApp:async()=>null,readFileB64:async()=>null,pickImage:async()=>null,openHelp:()=>{},exitFullscreen:()=>{},beep:()=>{}};


// ── Import d'une image depuis l'ordinateur du visiteur ────────────────────────
// Le bouchon renvoyait toujours "rien" : le bouton Parcourir ne faisait donc jamais
// rien dans la demo. Le navigateur remplace ici le dialogue natif d'Electron, et
// renvoie EXACTEMENT ce que l'application attend (l'image encodee en texte), si bien
// que le code de Wires n'a pas besoin d'etre touche.
// L'image ne quitte jamais le navigateur du visiteur : rien n'est envoye nulle part.
window.electronAPI.pickImage = function () {
  return new Promise(function (resolve) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/avif,image/gif,image/bmp';
    input.style.display = 'none';
    document.body.appendChild(input);

    var done = false;
    function finish(value) {
      if (done) return;
      done = true;
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(value);
    }

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) { finish(null); return; }
      var reader = new FileReader();
      reader.onload  = function () { finish(String(reader.result)); };
      reader.onerror = function () { finish(null); };
      reader.readAsDataURL(file);
    });

    // Un dialogue de fichiers ferme sans rien choisir n'emet aucun evenement : le
    // retour du focus sur la page est le seul signal disponible. Le delai laisse
    // l'evenement "change" arriver en premier quand un fichier A ete choisi.
    window.addEventListener('focus', function () {
      setTimeout(function () {
        if (!input.files || input.files.length === 0) finish(null);
      }, 500);
    }, { once: true });

    input.click();
  });
};
