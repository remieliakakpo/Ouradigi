/* Ouradigi : applique le thème choisi avant l'affichage (évite un flash blanc/noir) */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var t = null;
  try { t = localStorage.getItem('ouradigi-theme'); } catch (e) {}
  if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
})();
