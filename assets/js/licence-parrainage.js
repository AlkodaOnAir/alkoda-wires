// Parrainage (1.6.0, 09-10) : la phrase sous les offres ouvre le panneau qui glisse de la droite ;
// il se ferme par sa croix, un clic à côté ou Échap.
(function () {
  var lien = document.getElementById('lic-parrain-lien');
  var panneau = document.getElementById('lic-parrain');
  var voile = document.getElementById('lic-parrain-voile');
  var fermer = document.getElementById('lic-parrain-fermer');
  if (!lien || !panneau || !voile || !fermer) return;
  var minuteur = null;

  function ouvrir() {
    clearTimeout(minuteur);
    voile.hidden = false;
    void voile.offsetWidth;
    voile.classList.add('ouvert');
    panneau.classList.add('ouvert');
    panneau.setAttribute('aria-hidden', 'false');
    lien.setAttribute('aria-expanded', 'true');
    fermer.focus({ preventScroll: true });
  }

  function clore() {
    if (!panneau.classList.contains('ouvert')) return;
    panneau.classList.remove('ouvert');
    voile.classList.remove('ouvert');
    panneau.setAttribute('aria-hidden', 'true');
    lien.setAttribute('aria-expanded', 'false');
    minuteur = setTimeout(function () { voile.hidden = true; }, 300);
    lien.focus({ preventScroll: true });
  }

  lien.addEventListener('click', function () { if (panneau.classList.contains('ouvert')) clore(); else ouvrir(); });
  fermer.addEventListener('click', clore);
  voile.addEventListener('click', clore);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') clore(); });
})();
