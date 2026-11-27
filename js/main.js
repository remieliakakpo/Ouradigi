/* Ouradigi : script principal du site (menu, thème, animations, monnaie, vidéo, formulaire WhatsApp).
   Aucune clé, aucun mot de passe, aucune donnée personnelle n'est stockée ici. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  function chaque(sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); }

  // --- Mode clair / sombre : mémorise le choix, sinon suit le système
  var sombreSysteme = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  var btnTheme = document.querySelector('.theme-btn');
  if (btnTheme) btnTheme.addEventListener('click', function () {
    var actuel = root.getAttribute('data-theme') || (sombreSysteme.matches ? 'dark' : 'light');
    var nouveau = actuel === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', nouveau);
    try { localStorage.setItem('ouradigi-theme', nouveau); } catch (e) {}
  });

  // --- Menu mobile
  // (se ferme avec Échap, en touchant ailleurs, ou en choisissant une rubrique)
  var btn = document.querySelector('.menu-btn'), menu = document.getElementById('menu-mobile');
  function etatMenu(ouvert) {
    menu.classList.toggle('ouvert', ouvert);
    btn.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
    btn.setAttribute('aria-label', ouvert ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  if (btn && menu) {
    btn.addEventListener('click', function () { etatMenu(!menu.classList.contains('ouvert')); });
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) { a.addEventListener('click', function () { etatMenu(false); }); });
    document.addEventListener('keydown', function (e) { if ((e.key === 'Escape' || e.key === 'Esc') && menu.classList.contains('ouvert')) { etatMenu(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (menu.classList.contains('ouvert') && !menu.contains(e.target) && !btn.contains(e.target)) etatMenu(false); });
  }

  // --- Apparition des blocs au défilement
  var blocs = document.querySelectorAll('.revele');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('vu'); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    blocs.forEach(function (b) { io.observe(b); });
  } else { blocs.forEach(function (b) { b.classList.add('vu'); }); }

  // --- Menu : rubrique active (pastille jaune qui glisse) + barre de progression
  var entete = document.querySelector('.entete');
  var barre = document.querySelector('.progression span');
  var liens = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var indic = document.querySelector('.nav .indic');
  var sections = liens.map(function (a) { return document.getElementById((a.getAttribute('href') || '').slice(1)); });
  var contact = document.getElementById('contact');
  function placerIndic(a) {
    if (!indic) return;
    if (!a) { indic.style.opacity = 0; return; }
    indic.style.opacity = 1; indic.style.width = a.offsetWidth + 'px';
    indic.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  var enAttente = false;
  function majDefilement() {
    enAttente = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    if (entete) entete.classList.toggle('defile', y > 40);
    if (barre) barre.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    var actif = null;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < window.innerHeight * 0.4) actif = liens[i]; });
    if (actif && contact && contact.getBoundingClientRect().top < window.innerHeight * 0.4) actif = null;
    liens.forEach(function (a) { a.classList.toggle('actif', a === actif); });
    placerIndic(actif);
  }
  // une seule mise à jour par image affichée (défilement plus fluide sur téléphone)
  function demander() { if (!enAttente) { enAttente = true; (window.requestAnimationFrame || setTimeout)(majDefilement); } }
  window.addEventListener('scroll', demander, { passive: true });
  window.addEventListener('resize', demander);
  majDefilement();



  // --- Accueil : points lumineux
  var ciel = document.querySelector('.ciel');
  for (var i = 0; ciel && i < 14; i++) {
    var e = document.createElement('span');
    e.className = 'etoile' + (i % 3 === 0 ? ' bl' : '');
    e.style.left = (Math.random() * 100) + '%'; e.style.top = (Math.random() * 100) + '%';
    e.style.setProperty('--t', (2 + Math.random() * 3).toFixed(2) + 's');
    e.style.setProperty('--dl', (-Math.random() * 4).toFixed(2) + 's');
    ciel.appendChild(e);
  }

  // --- Halo qui suit la souris sur les cartes
  chaque('.carte', function (c) {
    c.addEventListener('pointermove', function (ev) { var b = c.getBoundingClientRect(); c.style.setProperty('--mx', (ev.clientX - b.left) + 'px'); c.style.setProperty('--my', (ev.clientY - b.top) + 'px'); });
  });


  // --- Vidéo motion design : miniature affichée, lecture avec le son au clic (rien n'est téléchargé avant)
  (function () {
    var v = document.getElementById('motion-ouradigi'), b = document.getElementById('motion-son');
    if (!v || !b) return;
    function charger() { var s = v.querySelector('source'); if (s && !s.getAttribute('src')) { s.src = s.getAttribute('data-src'); v.load(); } }
    b.addEventListener('click', function () { charger(); v.controls = true; b.hidden = true; v.play().catch(function () {}); });
    function revenir() { v.controls = false; v.load(); b.hidden = false; } // revient sur la miniature
    v.addEventListener('ended', revenir);
    v.addEventListener('error', function () { b.hidden = false; v.controls = false; }, true); // vidéo introuvable : on garde la miniature
  })();

  // --- Monnaie du visiteur : FCFA pour les pays de l'UEMOA, euros ailleurs
  // 1) estimation immédiate par le fuseau horaire de l'appareil
  // 2) confirmation par le pays de l'adresse IP (service gratuit, sans clé)
  // 3) si rien ne marche : euros. Tester avec ?zone=fcfa ou ?zone=eur dans l'adresse.
  // Le pays est gardé 7 jours sur l'appareil : un seul appel par visiteur et par semaine,
  // sans cookie, sans envoyer l'adresse de la page (no-referrer) et abandonné après 3 secondes.
  var UEMOA = ['TG','BJ','BF','CI','GW','ML','NE','SN'];
  var FUSEAUX_UEMOA = ['Africa/Lome','Africa/Porto-Novo','Africa/Ouagadougou','Africa/Abidjan','Africa/Bissau','Africa/Bamako','Africa/Niamey','Africa/Dakar'];
  var zoneActuelle = 'eur', paysVisiteur = '';
  function appliquerZone(z, anim) {
    zoneActuelle = z === 'fcfa' ? 'fcfa' : 'eur';
    chaque('[data-fcfa]', function (el) {
      var t = el.getAttribute(zoneActuelle === 'fcfa' ? 'data-fcfa' : 'data-eur');
      if (!t || el.textContent === t) return;
      el.textContent = t;
      if (anim) { el.classList.remove('prix-change'); void el.offsetWidth; el.classList.add('prix-change'); }
    });
  }
  var forcee = (location.search.match(/[?&]zone=(fcfa|eur)/) || [])[1];
  if (forcee) { appliquerZone(forcee, false); }
  else {
    var fuseau = ''; try { fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) {}
    appliquerZone(FUSEAUX_UEMOA.indexOf(fuseau) > -1 ? 'fcfa' : 'eur', false);
    var CLE_PAYS = 'ouradigi-pays', DUREE = 7 * 24 * 3600 * 1000;
    function codeValide(c) { return typeof c === 'string' && /^[A-Za-z]{2}$/.test(c) ? c.toUpperCase() : ''; }
    var memo = '';
    try { var m = JSON.parse(localStorage.getItem(CLE_PAYS) || 'null'); if (m && Date.now() - m.t < DUREE) memo = codeValide(m.c); } catch (e) {}
    function selonPays(code, garder) {
      code = codeValide(code); if (!code) return;
      paysVisiteur = code;
      appliquerZone(UEMOA.indexOf(code) > -1 ? 'fcfa' : 'eur', true);
      if (garder) { try { localStorage.setItem(CLE_PAYS, JSON.stringify({ c: code, t: Date.now() })); } catch (e) {} }
    }
    function chercher(url, lire) {
      var ctl = window.AbortController ? new AbortController() : null;
      var minuterie = setTimeout(function () { if (ctl) ctl.abort(); }, 3000);
      var options = { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' };
      if (ctl) options.signal = ctl.signal;
      return fetch(url, options)
        .then(function (r) { clearTimeout(minuterie); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) { var c = codeValide(d && lire(d)); if (!c) throw new Error('pays inconnu'); return c; },
              function (err) { clearTimeout(minuterie); throw err; });
    }
    if (memo) selonPays(memo, false);
    else if (window.fetch && window.JSON) {
      chercher('https://get.geojs.io/v1/ip/country.json', function (d) { return d.country; })
        .catch(function () { return chercher('https://ipapi.co/json/', function (d) { return d.country_code; }); })
        .then(function (c) { selonPays(c, true); })
        .catch(function () { /* on garde l'estimation par fuseau, sinon euros */ });
    }
  }

  // --- Boutons « Demander un devis » liés à un service : préremplit le formulaire
  var champService = document.getElementById('champ-service');
  chaque('[data-service]', function (el) {
    el.addEventListener('click', function () {
      if (!champService) return;
      var v = el.getAttribute('data-service');
      if (!Array.prototype.some.call(champService.options, function (o) { return o.value === v; })) return;
      champService.value = v;
      champService.classList.remove('champ-flash'); void champService.offsetWidth; champService.classList.add('champ-flash');
    });
  });

  // --- Formulaire : ouvre WhatsApp avec la demande déjà rédigée.
  // Rien n'est envoyé à un serveur : le texte est nettoyé (caractères invisibles retirés,
  // longueur limitée) puis encodé dans le lien WhatsApp. Il n'est jamais injecté dans la page.
  var NUMERO_WHATSAPP = '22898000493';
  var form = document.getElementById('form-devis');
  function propre(valeur, max) {
    return String(valeur || '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      .replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n')
      .trim().slice(0, max);
  }
  function ouvrir(url) {
    var w = null;
    try { w = window.open(url, '_blank'); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e) {} } else { window.location.href = url; } // fenêtre bloquée : on ouvre dans l'onglet
  }
  var dernierEnvoi = 0;
  if (form) form.addEventListener('submit', function (e) {
    e.preventDefault();
    var erreur = document.getElementById('erreur-form');
    var nom = propre(form.nom.value, 80).replace(/\n/g, ' ');
    if (nom.length < 2) { if (erreur) erreur.hidden = false; form.nom.setAttribute('aria-invalid', 'true'); form.nom.focus(); return; }
    if (erreur) erreur.hidden = true;
    form.nom.removeAttribute('aria-invalid');
    if (Date.now() - dernierEnvoi < 3000) return; // évite les doubles clics
    dernierEnvoi = Date.now();
    var entreprise = propre(form.entreprise.value, 100).replace(/\n/g, ' ');
    var service = form.service.value;
    if (!Array.prototype.some.call(form.service.options, function (o) { return o.value === service; })) service = 'Autre demande';
    var besoin = propre(form.message.value, 1000);
    var zone = (zoneActuelle === 'fcfa' ? 'Afrique de l\'Ouest (FCFA)' : 'International (euros)') + (paysVisiteur ? ' - pays : ' + paysVisiteur : '');
    var lignes = ['Bonjour Ouradigi, je souhaite un devis.', '', 'Nom : ' + nom];
    if (entreprise) lignes.push('Entreprise : ' + entreprise);
    lignes.push('Service : ' + service, 'Zone : ' + zone);
    if (besoin) lignes.push('', 'Mon besoin : ' + besoin);
    ouvrir('https://wa.me/' + NUMERO_WHATSAPP + '?text=' + encodeURIComponent(lignes.join('\n')));
  });

  var annee = document.getElementById('annee');
  if (annee) annee.textContent = String(new Date().getFullYear());
})();
