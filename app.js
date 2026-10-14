// ===================== DATA =====================
const ESEMPIO_ID = '__esempio__';
const STORAGE_KEY = 'myRestaurants';

// ===================== AUTO-ESCLUSIONE SVILUPPATORE =====================
// Marca questo dispositivo come "sviluppatore" per NON contarti nei dati Umami.
// Attivazione una-tantum tramite URL (basta aprirlo una volta su ogni tuo device):
//   https://ristomemo.netlify.app/?sviluppatore=1   → questo dispositivo NON viene tracciato
//   https://ristomemo.netlify.app/?sviluppatore=0   → riattiva il tracciamento
// NB: il flag vive in localStorage; se cancelli i dati del browser va rifatto.
(function gestisciFlagSviluppatore() {
  try {
    const p = new URLSearchParams(window.location.search).get('sviluppatore');
    if (p === '1') localStorage.setItem('sono_sviluppatore', 'si');
    if (p === '0') localStorage.removeItem('sono_sviluppatore');
  } catch (e) {}
})();
function _sonoSviluppatore() {
  try { return localStorage.getItem('sono_sviluppatore') === 'si'; }
  catch (e) { return false; }
}

function getRestaurants() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveRestaurants(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
}

// ===================== SICUREZZA: TESTO SEMPRE "SOLO TESTO" =====================
// Tutto ciò che arriva dall'utente o da fuori (backup, QR, file) è un DATO, mai codice.
// esc() trasforma i caratteri speciali in modo che il browser li mostri come semplice testo.
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const LIMITI = {
  nome: 120, citta: 200, telefono: 40, note: 2000,
  tag: 30, nTag: 20, maxRistoranti: 2000, maxFileBytes: 5 * 1024 * 1024
};
const GIORNI_VALIDI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const ID_VALIDO = /^[A-Za-z0-9_.-]{1,40}$/;

// Pulisce un testo: solo stringhe, niente caratteri di controllo, lunghezza massima.
function _testo(v, max, ammettiACapo) {
  if (typeof v !== 'string') {
    if (typeof v === 'number' && isFinite(v)) v = String(v); else return '';
  }
  v = ammettiACapo
    ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    : v.replace(/[\u0000-\u001F\u007F]/g, ' ');
  return v.trim().slice(0, max);
}

function _numeroOnull(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return (typeof n === 'number' && isFinite(n)) ? n : null;
}

let _idCounter = 0;
function _nuovoId() {
  _idCounter++;
  return Date.now() + _idCounter;
}

// Ritorna un ristorante "pulito" oppure null se non utilizzabile.
// opz.conservativo = true: non scarta nulla per mancanza di nome (usato sui dati già salvati).
function sanitizzaRistorante(raw, opz) {
  opz = opz || {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  let nome = _testo(raw.name, LIMITI.nome);
  if (!nome) {
    if (!opz.conservativo) return null;
    nome = 'Senza nome';
  }

  // id: numero finito oppure stringa semplice; altrimenti se ne crea uno nuovo
  let id = raw.id;
  const idOk = (typeof id === 'number' && isFinite(id)) ||
               (typeof id === 'string' && ID_VALIDO.test(id));
  if (!idOk || (id === ESEMPIO_ID && !opz.conservativo)) id = _nuovoId();

  let rating = parseInt(raw.rating, 10);
  if (!isFinite(rating)) rating = 0;
  rating = Math.max(0, Math.min(5, rating));

  const tags = [];
  if (Array.isArray(raw.tags)) {
    raw.tags.forEach(t => {
      const s = _testo(t, LIMITI.tag);
      if (s && !tags.includes(s) && tags.length < LIMITI.nTag) tags.push(s);
    });
  }

  const chiusura = [];
  if (Array.isArray(raw.chiusura)) {
    raw.chiusura.forEach(g => {
      if (GIORNI_VALIDI.includes(g) && !chiusura.includes(g)) chiusura.push(g);
    });
  }

  const out = {
    id: id,
    name: nome,
    citta: _testo(raw.citta, LIMITI.citta),
    telefono: _testo(raw.telefono, LIMITI.telefono),
    rating: rating,
    note: _testo(raw.note, LIMITI.note, true),
    tags: tags,
    chiusura: chiusura,
    preferito: raw.preferito === true
  };
  // campi facoltativi dei vecchi formati: tenuti solo se sono testo/numero valido
  ['regione', 'indirizzo', 'cucina'].forEach(k => {
    const s = _testo(raw[k], LIMITI.citta);
    if (s) out[k] = s;
  });
  const lat = _numeroOnull(raw._lat), lng = _numeroOnull(raw._lng);
  if (lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
    out._lat = lat; out._lng = lng;
  }
  return out;
}

// Pulisce un elenco intero. Ritorna { validi, scartati }. Gli id doppi vengono rigenerati.
function sanitizzaElenco(lista, opz) {
  const validi = [];
  let scartati = 0;
  const visti = new Set();
  (Array.isArray(lista) ? lista : []).forEach(raw => {
    if (validi.length >= LIMITI.maxRistoranti) { scartati++; return; }
    const r = sanitizzaRistorante(raw, opz);
    if (!r) { scartati++; return; }
    if (visti.has(String(r.id))) r.id = _nuovoId();
    visti.add(String(r.id));
    validi.push(r);
  });
  return { validi: validi, scartati: scartati };
}

// Numero di telefono utilizzabile in un link "tel:" (solo cifre e +)
function _telHref(t) {
  return String(t || '').replace(/[^\d+]/g, '');
}

// ===================== WIZARD RIMOSSO =====================

// ===================== TABS =====================
function showTab(id, el) {
  ['aggiungi','cerca','backup','guida'].forEach(t => {
    document.getElementById('tab-' + t).style.display = 'none';
  });
  document.getElementById('tab-' + id).style.display = 'block';
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
if (id === 'cerca') aggiornaLista();
  if (id === 'guida') aggiornaStatCollezione();
  if (id === 'backup') { aggiornaStatistiche(); aggiornaInfoBackup(); }
}

// ===================== SCROLL TO TOP =====================
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;
  // Mostra solo nei tab aggiungi e cerca
  const tabAggiungi = document.getElementById('tab-aggiungi');
  const tabCerca = document.getElementById('tab-cerca');
  const tabGuida = document.getElementById('tab-guida');
  const tabBackup = document.getElementById('tab-backup');
  const tabVisible = (tabAggiungi && tabAggiungi.style.display !== 'none') ||
                     (tabCerca && tabCerca.style.display !== 'none') ||
                     (tabGuida && tabGuida.style.display !== 'none') ||
                     (tabBackup && tabBackup.style.display !== 'none');
  if (window.scrollY > 200 && tabVisible) {
    btn.classList.add('show');
  } else {
    btn.classList.remove('show');
  }
});


function aggiornaProgress() {
  const step1 = document.getElementById('f-nome')?.value.trim().length > 0
             || document.getElementById('f-citta')?.value.trim().length > 0
             || document.getElementById('f-telefono')?.value.trim().length > 0;
  const step2 = selectedTags.size > 0 || document.getElementById('f-note')?.value.trim().length > 0;
  const step3 = document.querySelectorAll('.giorno-cb:checked').length > 0;

  // Cerchi
  setStep('ps1', 'pl1', true,  step1); // done appena step1 compilato
  setStep('ps2', 'pl2', step1, step2 || step3);
  setStep('ps3', 'pl3', step1 && step2, step3);

  // Linee
  const l1 = document.getElementById('pline1');
  const l2 = document.getElementById('pline2');
  const lw1 = l1 ? l1.closest('.progress-line') : null;
  // Linea 1→2: avanza su nome+città, telefono = nero+grassetto
  const hasNome = document.getElementById('f-nome')?.value.trim().length > 0;
  const hasCitta = document.getElementById('f-citta')?.value.trim().length > 0;
  const hasTel = document.getElementById('f-telefono')?.value.trim().length > 0;
  const compilati = [hasNome, hasCitta].filter(Boolean).length;
  if (l1) {
    const pct1 = compilati / 2 * 100;
    l1.style.width = pct1 + '%';
    if (step2) {
      // Step 2 completato: linea 1→2 sempre verde
      l1.style.background = 'var(--green)';
      if (lw1) lw1.classList.remove('thick');
    } else if (pct1 === 100 && hasTel) {
      // Step 1 completo + telefono: nero grassetto
      l1.style.background = '#1a1a1a';
      if (lw1) lw1.classList.add('thick');
    } else if (pct1 === 100) {
      // Step 1 completo senza telefono: verde
      l1.style.background = 'var(--green)';
      if (lw1) lw1.classList.remove('thick');
    } else {
      // In avanzamento: rossa
      l1.style.background = 'var(--red)';
      if (lw1) lw1.classList.remove('thick');
    }
  }
  if (l2) {
    const full2 = step1 && step2;
    l2.style.width = full2 ? '100%' : '0%';
    l2.style.background = (full2 && step3) ? 'var(--green)' : 'var(--red)';
  }

  // Linea 3→4 e cerchio Salva
  const l3 = document.getElementById('pline3');
  const c4 = document.getElementById('ps4');
  const pl4 = document.getElementById('pl4');
  if (l3) {
    l3.style.width = step3 ? '100%' : '0%';
    l3.style.background = 'var(--green)';
  }
  if (c4 && pl4) {
    if (step1) {
      c4.className = 'progress-circle save';
      pl4.className = 'progress-label save';
    } else {
      c4.className = 'progress-circle';
      pl4.className = 'progress-label';
    }
  }

}

function setStep(circleId, labelId, reached, done) {
  const c = document.getElementById(circleId);
  const l = document.getElementById(labelId);
  if (!c || !l) return;
  c.classList.toggle('active', reached && !done);
  c.classList.toggle('done', done);
  c.textContent = done ? '✓' : circleId.replace('ps','');
  l.classList.toggle('active', reached || done);
  l.classList.toggle('done', done);
}


let selectedStar = 0;
function setStar(v) {
  selectedStar = v;
  document.querySelectorAll('.star-btn').forEach(btn => {
    btn.classList.toggle('on', parseInt(btn.dataset.v) <= v);
  });
}


// ===================== ETICHETTE =====================
let selectedTags = new Set();

function togglePreset(btn, valore) {
  if (selectedTags.has(valore)) {
    selectedTags.delete(valore);
    btn.classList.remove('selected');
  } else {
    selectedTags.add(valore);
    btn.classList.add('selected');
  }
  renderTagsSelected();
  aggiornaProgress();
}

function aggiungiTagCustom() {
  const inp = document.getElementById('tagCustomInput');
  const val = inp.value.trim();
  if (!val) return;
  selectedTags.add(val);
  inp.value = '';
  renderTagsSelected();
  aggiornaProgress();
}

function rimuoviTag(valore) {
  selectedTags.delete(valore);
  // deseleziona preset se esiste
  document.querySelectorAll('.tag-preset').forEach(btn => {
    if (btn.textContent.trim() === valore) btn.classList.remove('selected');
  });
  renderTagsSelected();
  aggiornaProgress();
}

function renderTagsSelected() {
  const container = document.getElementById('tagsSelected');
  if (selectedTags.size === 0) { container.innerHTML = ''; return; }
  // Il testo viene inserito come testo (mai come codice) e il valore del tag
  // viaggia in un attributo data-*, quindi qualsiasi carattere è sicuro.
  container.innerHTML = '';
  [...selectedTags].forEach(t => {
    const chip = document.createElement('span');
    chip.className = 'tag-selected-chip';
    chip.appendChild(document.createTextNode(t + ' '));
    const btn = document.createElement('button');
    btn.className = 'tag-remove';
    btn.title = 'Rimuovi';
    btn.textContent = '✕';
    btn.dataset.tag = t;
    btn.addEventListener('click', () => rimuoviTag(btn.dataset.tag));
    chip.appendChild(btn);
    container.appendChild(chip);
  });
}

function resetTags() {
  selectedTags.clear();
  document.querySelectorAll('.tag-preset').forEach(b => b.classList.remove('selected'));
  renderTagsSelected();
}

// ===================== MODIFICA =====================
let editingId = null;

function modificaRistorante(id) {
  const arr = getRestaurants();
  const r = arr.find(x => String(x.id) === String(id));
  if (!r) return;

  editingId = id;

  // Vai al tab aggiungi
  showTab('aggiungi', document.getElementById('tab-btn-aggiungi'));

  // Precompila campi base
  document.getElementById('f-nome').value = r.name || '';
  document.getElementById('f-citta').value = r.citta || '';
  document.getElementById('f-telefono').value = r.telefono || '';
  document.getElementById('f-note').value = r.note || '';

  // Stelle
  setStar(r.rating || 0);

  // Tag
  selectedTags = new Set(r.tags || []);
  document.querySelectorAll('.tag-preset').forEach(btn => {
    btn.classList.toggle('selected', selectedTags.has(btn.textContent.trim()));
  });
  renderTagsSelected();

  // Giorni di chiusura — se array vuoto seleziona "Nessuna"
  document.querySelectorAll('.giorno-cb').forEach(cb => {
    if (cb.value === 'Nessuna') {
      cb.checked = (r.chiusura || []).length === 0;
    } else {
      cb.checked = (r.chiusura||[]).includes(cb.value);
    }
    cb.closest('.check-item').classList.toggle('checked', cb.checked);
  });

  // Cambia aspetto bottone salva
  const btn = document.getElementById('btnSave');
  btn.textContent = '✏️ Aggiorna Ristorante';
  btn.style.background = 'linear-gradient(135deg, #f39c12, #e67e22)';

  // Aggiungi bottone Annulla modifica
  if (!document.getElementById('btnCancelEdit')) {
    const cancel = document.createElement('button');
    cancel.id = 'btnCancelEdit';
    cancel.textContent = '✕ Annulla modifica';
    cancel.style.cssText = 'width:100%;padding:12px;background:none;border:2px solid #ddd;border-radius:14px;font-family:Nunito,sans-serif;font-weight:700;font-size:15px;color:#888;cursor:pointer;margin-top:8px;';
    cancel.onclick = annullaModifica;
    btn.parentNode.insertBefore(cancel, btn.nextSibling);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
  showNotif('✏️ Modifica in corso…', '');
}

function annullaModifica() {
  editingId = null;
  resetForm();
  const btn = document.getElementById('btnSave');
  btn.textContent = '💾 Salva Ristorante';
  btn.style.background = '';
  const cancel = document.getElementById('btnCancelEdit');
  if (cancel) cancel.remove();
  aggiornaProgress(); // resetta la barra
  window.scrollTo({ top: 0, behavior: 'smooth' }); // torna su
}


function salvaRistorante(forzaSalvataggio = false) {
  const nome     = document.getElementById('f-nome').value.trim();
  const citta    = document.getElementById('f-citta').value.trim();
  const telefono = document.getElementById('f-telefono').value.trim();
  const tags     = [...selectedTags];
  const chiusura = [];
  document.querySelectorAll('.giorno-cb:checked').forEach(cb => {
    if (cb.value !== 'Nessuna') chiusura.push(cb.value);
  });
  const giorniSelezionati = document.querySelectorAll('.giorno-cb:checked').length > 0;

  // ---- Validazione ----
  let errori = [];
  const mostraErrore = (id, errId, cond) => {
    const el = document.getElementById(errId);
    const input = document.getElementById(id);
    if (cond) {
      if (el) el.classList.add('show');
      if (input) input.classList.add('errore');
      errori.push(errId);
    } else {
      if (el) el.classList.remove('show');
      if (input) input.classList.remove('errore');
    }
  };

  mostraErrore('f-nome',  'err-nome',  !nome);
  mostraErrore('f-citta', 'err-citta', !citta);

  // Etichette
  const errTags = document.getElementById('err-tags');
  if (tags.length === 0) {
    if (errTags) errTags.classList.add('show');
    errori.push('err-tags');
  } else {
    if (errTags) errTags.classList.remove('show');
  }

  // Giorni
  const errGiorni = document.getElementById('err-giorni');
  if (!giorniSelezionati) {
    if (errGiorni) errGiorni.classList.add('show');
    errori.push('err-giorni');
  } else {
    if (errGiorni) errGiorni.classList.remove('show');
  }

  if (errori.length > 0) {
    // Messaggio globale con link al primo campo mancante
    const nomiCampi = {
      'err-nome': 'Nome ristorante',
      'err-citta': 'Città / Via',
      'err-telefono': 'Telefono',
      'err-tags': 'Etichette',
      'err-giorni': 'Giorni di chiusura'
    };
    const lista = errori.map(e => `• ${nomiCampi[e]}`).join('<br>');
    const msg = document.getElementById('validazioneMsg');
    msg.innerHTML = `⚠️ Compila i campi obbligatori:<br>${lista}`;
    msg.classList.add('show');
    // Scroll al primo errore
    const primoId = errori[0].replace('err-', 'f-');
    const primoEl = document.getElementById(primoId) || document.getElementById('tagsSelected') || document.getElementById('giorniGrid');
    if (primoEl) primoEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Nasconde messaggio errore se tutto ok
  document.getElementById('validazioneMsg').classList.remove('show');

  const r = {
    id:       editingId || Date.now(),
    name:     nome,
    citta:    citta,
    telefono: telefono,
    rating:   selectedStar,
    note:     document.getElementById('f-note').value.trim(),
    tags:     tags,
    chiusura: chiusura
  };

  let arr = getRestaurants().filter(x => x.id !== ESEMPIO_ID);

  // Controllo duplicati solo su nuovo inserimento
  if (!editingId && !forzaSalvataggio) {
    const nomeLower  = nome.toLowerCase();
    const cittaLower = citta.toLowerCase();
    const duplicati  = arr.filter(x => {
      const stessoNome  = x.name.toLowerCase() === nomeLower;
      const stessaCitta = !cittaLower || !x.citta || x.citta.toLowerCase().includes(cittaLower) || cittaLower.includes(x.citta.toLowerCase());
      return stessoNome && stessaCitta;
    });
    if (duplicati.length > 0) {
      mostraModaleDuplicati(duplicati, r);
      return;
    }
  }

  if (editingId) {
    arr = arr.map(x => String(x.id) === String(editingId) ? r : x);
    showNotif('✅ Aggiornato!', 'success');
  } else {
    arr.unshift(r);
    showNotif('🔥 Salvato! Non lo dimenticherai più', 'success');
  }

  saveRestaurants(arr);
  aggiornaStatCollezione();
  annullaModifica();



  setTimeout(() => {
    showTab('cerca', document.getElementById('tab-btn-cerca'));
    aggiornaLista();
  }, 700);
}

function resetForm() {
  document.getElementById('f-nome').value = '';
  document.getElementById('f-citta').value = '';
  document.getElementById('f-telefono').value = '';
  document.getElementById('f-note').value = '';
  selectedStar = 0;
  document.querySelectorAll('.star-btn').forEach(b => b.classList.remove('on'));
  resetTags();
  document.querySelectorAll('.giorno-cb').forEach(cb => {
    cb.checked = false;
    cb.closest('.check-item').classList.remove('checked');
  });
  // Pulisci errori
  document.querySelectorAll('.campo-errore').forEach(e => e.classList.remove('show'));
  document.querySelectorAll('.form-input.errore').forEach(e => e.classList.remove('errore'));
  const msg = document.getElementById('validazioneMsg');
  if (msg) msg.classList.remove('show');
}

// ===================== PREFERITI =====================
let filtroPreferiti = false;

function toggleFiltroPreferiti() {
  filtroPreferiti = !filtroPreferiti;
  const btn = document.getElementById('btnFiltroPreferiti');
  btn.classList.toggle('active', filtroPreferiti);
  btn.textContent = filtroPreferiti ? '❤️ Solo preferiti' : '🤍 Solo preferiti';
  aggiornaLista();
}

function togglePreferito(id) {
  const arr = getRestaurants();
  const idx = arr.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return;
  arr[idx].preferito = !arr[idx].preferito;
  saveRestaurants(arr);
  aggiornaLista();
  showNotif(arr[idx].preferito ? '❤️ Aggiunto ai preferiti' : '🤍 Rimosso dai preferiti', 'success');
}

// ===================== CERCA PER TAG =====================
function cercaPerTag(tag) {
  // Vai al tab cerca
  showTab('cerca', document.getElementById('tab-btn-cerca'));
  // Imposta il tag nel campo ricerca
  const input = document.getElementById('searchInput');
  input.value = tag;
  aggiornaLista();
  // Scroll in cima
  window.scrollTo({ top: 0, behavior: 'smooth' });
}


// ===================== RESET FILTRI =====================
// ===================== MODALE DUPLICATI =====================
function mostraModaleDuplicati(duplicati, nuovoRecord) {
  const existing = document.getElementById('modaleDuplicati');
  if (existing) existing.remove();

  const lista = duplicati.map(d => `
    <div class="modal-dup-card">
      <strong>🍽️ ${esc(d.name)}</strong>
      <span>📍 ${esc(d.citta || '—')} ${d.rating ? '· ' + '⭐'.repeat(Math.max(0, Math.min(5, parseInt(d.rating) || 0))) : ''}</span>
    </div>
  `).join('');

  const html = `
    <div class="modal-overlay" id="modaleDuplicati">
      <div class="modal-box">
        <div class="modal-header">⚠️ Possibile duplicato</div>
        <div class="modal-body">
          <p>Esiste già un ristorante con lo stesso nome${duplicati[0].citta ? ' e città' : ''}:</p>
          ${lista}
          <p>Vuoi salvarlo comunque o annullare?</p>
        </div>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-cancel" onclick="chiudiModaleDuplicati()">✕ Annulla</button>
          <button class="modal-btn modal-btn-save" onclick="chiudiModaleDuplicati(); salvaRistorante(true)">💾 Salva comunque</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function chiudiModaleDuplicati() {
  const m = document.getElementById('modaleDuplicati');
  if (m) m.remove();
}

// ===================== COOKIE BANNER =====================
function chiudiCookieBanner() {
  document.getElementById('cookieBanner').style.display = 'none';
  localStorage.setItem('cookieOk', '1');
}

function mostraCookieBannerSeNecessario() {
  if (!localStorage.getItem('cookieOk')) {
    setTimeout(() => {
      document.getElementById('cookieBanner').style.display = 'block';
    }, 1500);
  }
}

// ===================== RESET FILTRI =====================
function resetTuttiFiltri() {
  const input = document.getElementById('searchInput');
  if (input) input.value = '';
  filtroPreferiti = false;
  const btnFav = document.getElementById('btnFiltroPreferiti');
  if (btnFav) { btnFav.classList.remove('active'); btnFav.textContent = '🤍 Solo preferiti'; }
  resetFiltroGiorno();
  aggiornaLista();
}

const GIORNI_IT = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
let giornoFiltroAttivo = ''; // stringa giorno es. "Sabato", o '' per nessun filtro

function filtraGiorno(fonte) {
  if (fonte === 'oggi') {
    const oggi = GIORNI_IT[new Date().getDay()];
    giornoFiltroAttivo = oggi;
    document.getElementById('giornoSelect').value = oggi;
  } else {
    giornoFiltroAttivo = document.getElementById('giornoSelect').value;
  }
  aggiornaStyleFiltroGiorno();
  aggiornaLista();
}

function resetFiltroGiorno() {
  giornoFiltroAttivo = '';
  document.getElementById('giornoSelect').value = '';
  aggiornaStyleFiltroGiorno();
  aggiornaLista();
}

function aggiornaStyleFiltroGiorno() {
  const btnOggi = document.getElementById('btnOggi');
  const btnReset = document.getElementById('btnResetGiorno');
  const oggi = GIORNI_IT[new Date().getDay()];

  if (giornoFiltroAttivo) {
    btnOggi.style.cssText += ';border-color:' + (giornoFiltroAttivo === oggi ? 'var(--red)' : 'var(--border)') + ';color:' + (giornoFiltroAttivo === oggi ? 'var(--red)' : 'var(--muted)') + ';background:' + (giornoFiltroAttivo === oggi ? 'var(--tag-bg)' : '#fff');
    btnReset.style.display = 'block';
  } else {
    btnOggi.style.borderColor = 'var(--border)';
    btnOggi.style.color = 'var(--muted)';
    btnOggi.style.background = '#fff';
    btnReset.style.display = 'none';
  }
}


function aggiornaLista() {
  const q = (document.getElementById('searchInput')?.value || '').toLowerCase();
  const arr = getRestaurants();
  const termini = q.split(/[\s,;]+/).map(t => t.trim()).filter(t => t.length > 0);

  // Filtro testuale
  let filtered = arr.filter(r => {
    if (!q) return true;
    const full = [r.name, r.citta, r.regione, r.indirizzo, r.note, r.cucina, ...(r.tags||[])].join(' ').toLowerCase();
    return termini.every(t => full.includes(t));
  });

  // Filtro preferiti
  if (filtroPreferiti) {
    filtered = filtered.filter(r => r.preferito === true);
  }

  // Filtro giorno — logica INVERTITA: escludo chi ha quel giorno come chiusura
  const avviso = document.getElementById('avvisoGiorni');
  if (giornoFiltroAttivo) {
    const senzaInfo = filtered.filter(r => (r.chiusura||[]).length === 0 && r.id !== ESEMPIO_ID);
    filtered = filtered.filter(r => !(r.chiusura||[]).includes(giornoFiltroAttivo));
    if (avviso) {
      if (senzaInfo.length > 0) {
        avviso.style.display = 'block';
        avviso.innerHTML = `⚠️ <strong>${senzaInfo.length} ristorante${senzaInfo.length > 1 ? 'i' : ''}</strong> non ha${senzaInfo.length > 1 ? 'nno' : ''} il giorno di chiusura compilato — potrebbero essere chiusi.`;
      } else {
        avviso.style.display = 'none';
      }
    }
  } else {
    if (avviso) avviso.style.display = 'none';
  }

  const hdr  = document.getElementById('listHeader');
  const list = document.getElementById('restaurantsList');

  // Mostra bottone reset solo se c'è almeno un filtro attivo
  const haFiltri = q.length > 0 || filtroPreferiti || giornoFiltroAttivo !== '';
  const resetWrap = document.getElementById('resetFiltriWrap');
  if (resetWrap) resetWrap.style.display = haFiltri ? 'block' : 'none';

  // Contatore contestuale
  const contatore = document.getElementById('contatoreRistoranti');
  const totale = arr.length;
  if (contatore) {
    if (totale === 0) {
      contatore.textContent = '';
    } else if (!haFiltri) {
      contatore.textContent = '📦 ' + totale + (totale !== 1 ? ' ristoranti' : ' ristorante') + ' salvat' + (totale !== 1 ? 'i' : 'o');
    } else {
      contatore.innerHTML = '🔍 <strong style="color:var(--red)">' + filtered.length + '</strong> di ' + totale + (totale !== 1 ? ' ristoranti' : ' ristorante');
    }
  }

  if (arr.length === 0) {
    hdr.textContent = '';
    list.innerHTML = `<div class="empty"><div class="emoji">🍽️</div><p>Nessun ristorante ancora.<br>Vai su <strong>Aggiungi</strong> per iniziare!</p></div>`;
    return;
  }

  hdr.textContent = '';

  if (filtered.length === 0) {
    list.innerHTML = `<div class="no-results">Nessun risultato${filtroPreferiti ? ' tra i preferiti' : ''}${giornoFiltroAttivo ? ' aperto ' + giornoFiltroAttivo : ''}${q ? ' per "' + esc(q) + '"' : ''}.</div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const isEsempio = r.id === ESEMPIO_ID;
    // Tutto ciò che viene dai dati passa da esc(); le azioni usano data-* e non onclick inline
    const sid = esc(r.id);
    const cuore = r.preferito ? '❤️' : '🤍';
    const stelle = `<div class="card-stars">${[1,2,3,4,5].map(n =>
      `<button class="card-star-btn ${(r.rating||0) >= n ? 'on' : ''}" data-azione="stella" data-id="${sid}" data-n="${n}" title="${n} stelle">⭐</button>`
    ).join('')}</div>`;
    const tags = (r.tags||[]).map(t => `<span class="tag clickable" data-azione="tag" data-tag="${esc(t)}">${esc(t)}</span>`).join('');
    const chiusuraTesto = (r.chiusura||[]).length > 0
      ? '🔒 Chiuso: ' + r.chiusura.map(esc).join(' · ')
      : '';
    const telHref = _telHref(r.telefono);
    const telInfo = r.telefono
      ? `<a href="tel:${esc(telHref)}" style="display:inline-flex;align-items:center;gap:6px;background:#f0fff4;border:1.5px solid #28a745;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;color:#1a6b30;text-decoration:none;margin-top:6px;">📞 ${esc(r.telefono)}</a>`
      : (!isEsempio ? `<div style="font-size:11px;color:#f39c12;font-weight:700;margin-top:6px;cursor:pointer;" data-azione="modifica" data-id="${sid}">📞 Telefono non inserito — tocca ✏️ per aggiungerlo</div>` : '');
    return `
      <div class="restaurant-card ${isEsempio ? 'card-example' : ''}">
        ${isEsempio ? '<div class="example-badge">✨ Esempio</div>' : ''}

        <!-- HEADER COLORATO -->
        <div class="card-header-band">
          <div class="card-name">${esc(r.name)}</div>
          <div class="card-location">📍 ${esc(r.citta || '—')}</div>
        </div>

        <!-- CORPO: stelle + tutte le icone a destra -->
        <div class="card-delete-row">
          ${stelle}
          <div class="card-actions">
            ${!isEsempio ? `<button class="fav-btn" data-azione="preferito" data-id="${sid}" title="Preferito">${cuore}</button>` : ''}
            ${!isEsempio ? `<button class="action-btn" data-azione="modifica" data-id="${sid}" title="Modifica">✏️</button>` : ''}
            ${!isEsempio ? `<button class="action-btn" data-azione="condividi" data-id="${sid}" title="Invia">↗️</button>` : ''}
            <button class="action-btn delete" data-azione="elimina" data-id="${sid}" title="Elimina">🗑️</button>
          </div>
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        ${telInfo}
        ${r.note ? `<div class="card-note">"${esc(r.note)}"</div>` : ''}

        <!-- FOOTER -->
        <div class="card-footer-band">
          <span style="font-size:11px;color:var(--muted);font-style:italic;">${chiusuraTesto}</span>
          ${!isEsempio && r.citta ? `<button class="btn-mappa" data-azione="mappa" data-id="${sid}">🗺️ Mappa</button>` : '<span></span>'}
        </div>
        ${!isEsempio && r.citta ? `
        <div class="card-map-wrap" id="map-${sid}">
          <iframe
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            src="https://maps.google.com/maps?q=${encodeURIComponent((r.name||'') + ', ' + (r.citta||''))}&output=embed&z=15"
          ></iframe>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

// ===================== AZIONI DELLE SCHEDE E DEI POPUP (un solo ascoltatore) =====================
// Le schede e i popup non usano più onclick="..." con dati dentro: ogni bottone porta
// data-azione + data-id, e qui sotto un solo ascoltatore lo smista alla funzione giusta.
document.addEventListener('click', function (e) {
  const el = e.target.closest && e.target.closest('[data-azione]');
  if (!el) return;
  const id = el.dataset.id;
  switch (el.dataset.azione) {
    case 'stella':       setRatingCard(id, parseInt(el.dataset.n, 10)); break;
    case 'tag':          cercaPerTag(el.dataset.tag); break;
    case 'modifica':     modificaRistorante(id); break;
    case 'preferito':    togglePreferito(id); break;
    case 'condividi':    condividiRistorante(id); break;
    case 'elimina':      eliminaRistorante(id); break;
    case 'mappa':        toggleMappa(id, el); break;
    case 'condividi-testo': condividiTesto(id); break;
    case 'esporta-json': esportaJSON(id); break;
    case 'mostra-qr':    mostraQR(id); break;
    case 'chiudi':       document.getElementById(el.dataset.target)?.remove(); break;
    case 'conferma-elimina': chiudiModaleElimina(); eseguiEliminazione(id); break;
    case 'annulla-elimina':  chiudiModaleElimina(); break;
    case 'conferma-ripristino': confermaRipristino(); break;
    case 'annulla-ripristino':  chiudiModaleRipristino(); break;
  }
});


function aggiornaStatCollezione() {
  const arr = getRestaurants().filter(r => r.id !== ESEMPIO_ID);
  document.getElementById('statCollezione').style.display = 'block';
  if (arr.length === 0) {
    document.getElementById('statNRisto').textContent = '0';
    document.getElementById('statNCitta').textContent = '0';
    document.getElementById('statNPref').textContent = '0';
    return;
  }
  document.getElementById('statNRisto').textContent = arr.length;
  // Città uniche — prima parola dopo eventuale virgola o l'intera stringa
  const citta = new Set(arr.map(r => {
    const c = (r.citta || '').trim();
    // Prende solo la parte dopo la virgola se presente (es. "Via Flaminia, Roma" → "Roma")
    const parts = c.split(',');
    return parts[0].trim().toLowerCase();
  }).filter(Boolean));
  document.getElementById('statNCitta').textContent = citta.size;
  document.getElementById('statNPref').textContent = arr.filter(r => r.preferito).length;
}

// ===================== VICINI =====================
// geocodificaSilenzioso rimossa — sostituita da GPS dispositivo
function toggleMappa(id, btn) {
  const wrap = document.getElementById('map-' + id);
  if (!wrap) return;
  const isOpen = wrap.classList.toggle('open');
  btn.textContent = isOpen ? '🗺️ Chiudi mappa' : '🗺️ Mappa';
}

function copiaEmailContatto() {
  const email = 'help.enricosarri@gmail.com';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email).then(() => {
      showNotif('📋 Email copiata!', 'success');
    }).catch(() => {
      showNotif('📋 Copia: help.enricosarri@gmail.com', 'success');
    });
  } else {
    showNotif('📋 Copia: help.enricosarri@gmail.com', 'success');
  }
}


function copiaEmailPayPal() {
  const email = 'enricosarri69@gmail.com';
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(email).then(() => {
      showNotif('📋 Email PayPal copiata!', 'success');
    }).catch(() => {
      showNotif('📋 Copia: enricosarri69@gmail.com', 'success');
    });
  } else {
    showNotif('📋 Copia: enricosarri69@gmail.com', 'success');
  }
}

function consigliaApp() {
  const testo = encodeURIComponent('🍽️✨ Ho creato un\'app per chi ama mangiare bene!\n\nQuante volte hai dimenticato il nome di quel ristorante fantastico? 😅\nCosì ho costruito RistoMemo.\n\n📌 Salvi i locali con voto e note personali\n🔍 Filtri per città, cucina e voto\n📴 Offline, niente account, niente abbonamenti\n🚫 Zero pubblicità\n💯 Completamente GRATIS\n\nLa uso ogni volta che mangio fuori 👇\nhttps://ristomemo.netlify.app/installa.html');
  window.open('https://wa.me/?text=' + testo, '_blank');
}
function condividiRistorante(id) {
  const r = getRestaurants().find(x => String(x.id) === String(id));
  if (!r) return;
  const overlay = document.createElement('div');
  overlay.id = 'modalCondividi';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:800;font-size:16px;margin-bottom:4px;">↗️ Condividi ristorante</p>
      <p style="font-size:13px;color:#666;margin-bottom:18px;">🍽️ <strong>${esc(r.name)}</strong></p>
      <button data-azione="condividi-testo" data-id="${esc(r.id)}" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--red),var(--red-dark));color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:8px;">📤 Condividi come testo</button>
      <button data-azione="esporta-json" data-id="${esc(r.id)}" style="width:100%;padding:12px;background:#6c757d;color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:8px;">📦 Esporta file JSON</button>
      <button data-azione="mostra-qr" data-id="${esc(r.id)}" style="width:100%;padding:12px;background:#0066cc;color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:16px;">📷 Mostra QR Code</button>
      <button data-azione="chiudi" data-target="modalCondividi" style="width:100%;padding:10px;background:#f8f9fa;color:#333;border:2px solid #dee2e6;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Annulla</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function condividiTesto(id) {
  document.getElementById('modalCondividi')?.remove();
  const r = getRestaurants().find(x => String(x.id) === String(id));
  if (!r) return;
  const stelle = r.rating ? '⭐'.repeat(r.rating) : '';
  const tags = (r.tags||[]).join(', ');
  const testo = [
    `🍽️ ${r.name}`,
    r.citta ? `📍 ${r.citta}` : '',
    stelle || '',
    r.telefono ? `📞 ${r.telefono}` : '',
    tags ? `🏷️ ${tags}` : '',
    r.note ? `💬 ${r.note}` : '',
    r.chiusura?.length ? `🔒 Chiuso: ${r.chiusura.join(', ')}` : '',
    '  ',
    `💡 Uso RistoMemo per non dimenticare i posti dove si mangia bene — è gratis e funziona anche offline.`,
    `👉 https://ristomemo.netlify.app/installa.html`
  ].filter(Boolean).join('\n');
  if (navigator.share) {
    navigator.share({ title: r.name, text: testo }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(testo).then(() => {
      showNotif('📋 Copiato negli appunti!', 'success');
    }).catch(() => {
      showNotif('📤 Condivisione non supportata', 'error');
    });
  }
}

function esportaJSON(id) {
  document.getElementById('modalCondividi')?.remove();
  const r = getRestaurants().find(x => String(x.id) === String(id));
  if (!r) return;
  const payload = { tipo: 'ristomemo_singolo', versione: '1', ristorante: r };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ristomemo_${r.name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'').toLowerCase() || 'ristorante'}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showNotif('📦 File JSON scaricato!', 'success');
}

// ===================== QR GENERATI NELL'APP =====================
// Il QR si disegna qui, con la libreria nel sito (lib/qrcode.min.js): nessuna richiesta
// a siti esterni e funziona anche senza rete. Ritorna un SVG pronto, oppure '' se fallisce.
function qrSvg(testo, ecc, margine) {
  try {
    if (typeof qrcode !== 'function') return '';
    const q = qrcode(0, ecc || 'L');
    q.addData(String(testo));
    q.make();
    return q.createSvgTag({ cellSize: 4, margin: margine == null ? 16 : margine, scalable: true });
  } catch (e) {
    return '';
  }
}

const URL_APP = 'https://ristomemo.netlify.app/installa.html';

function disegnaQRIntestazione() {
  const el = document.getElementById('headerQR');
  if (el) el.innerHTML = qrSvg(URL_APP, 'L', 0);
}

function mostraQRApp() {
  const url = URL_APP;
  const overlay = document.createElement('div');
  overlay.id = 'modalQRApp';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:300px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:900;font-size:17px;margin-bottom:4px;">🍽️ RistoMemo</p>
      <p style="font-size:12px;color:#666;margin-bottom:16px;">Scansiona per installare l'app gratis</p>
      <div role="img" aria-label="QR RistoMemo" style="width:240px;height:240px;margin:0 auto 16px;border-radius:8px;background:#fff;">${qrSvg(url, 'M') || '<p style="font-size:12px;color:#c0392b;padding-top:100px;">QR non disponibile</p>'}</div>
      <p style="font-size:11px;color:#888;margin-bottom:16px;">Gratuita · Offline · Nessun account</p>
      <button onclick="document.getElementById('modalQRApp').remove()" style="width:100%;padding:10px;background:linear-gradient(135deg,var(--red),var(--red-dark));color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Chiudi</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

function mostraQR(id) {

  document.getElementById('modalCondividi')?.remove();
  const r = getRestaurants().find(x => String(x.id) === String(id));
  if (!r) return;

const payload = JSON.stringify({
    t:'rm1', n: r.name,
    c: (r.citta||'').slice(0,30),
    r: r.rating||0,
    o: (r.note||'').slice(0,80),
    g: (r.tags||[]).slice(0,3),
    p: (r.telefono||'').slice(0,20)
  });

  const overlay = document.createElement('div');
  overlay.id = 'modalQR';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:320px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:800;font-size:16px;margin-bottom:4px;">📷 QR Code</p>
      <p style="font-size:13px;color:#666;margin-bottom:16px;">🍽️ <strong>${esc(r.name)}</strong></p>
      <div id="qrImg" role="img" aria-label="QR Code" style="width:220px;height:220px;margin:0 auto 16px;border-radius:8px;background:#fff;"></div>
      <p style="font-size:11px;color:#888;margin-bottom:16px;">Fai uno screenshot e fallo scansionare per importare il ristorante in RistoMemo</p>
      <button data-azione="chiudi" data-target="modalQR" style="width:100%;padding:10px;background:#f8f9fa;color:#333;border:2px solid #dee2e6;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Chiudi</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  const svg = qrSvg(payload, 'L');
  document.getElementById('qrImg').innerHTML = svg ||
    '<p style="font-size:12px;color:#c0392b;padding-top:90px;">QR non disponibile: i dati sono troppo lunghi</p>';
}

function importaQR() {
  const overlay = document.createElement('div');
  overlay.id = 'modalImportaQR';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:20px;max-width:360px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:800;font-size:16px;margin-bottom:4px;">📷 Importa da QR</p>
      <p style="font-size:12px;color:#666;margin-bottom:14px;">Inquadra il QR Code del ristorante</p>
      <video id="qrVideo" style="width:100%;max-width:300px;border-radius:10px;background:#000;" playsinline></video>
      <canvas id="qrVideoCanvas" style="display:none;"></canvas>
      <p id="qrStatus" style="font-size:12px;color:#666;margin-top:10px;min-height:18px;">Avvio camera...</p>
      <button onclick="stopImportaQR()" style="margin-top:14px;width:100%;padding:10px;background:#f8f9fa;color:#333;border:2px solid #dee2e6;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Annulla</button>
    </div>`;
  document.body.appendChild(overlay);
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
    .then(stream => {
      window._qrStream = stream;
      const video = document.getElementById('qrVideo');
      video.srcObject = stream;
      video.play();
      document.getElementById('qrStatus').textContent = 'Inquadra il QR Code...';
      const canvas = document.getElementById('qrVideoCanvas');
      const ctx = canvas.getContext('2d');
      function tick() {
        window._qrRafId = requestAnimationFrame(tick);
        if (!video || video.readyState < 2) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = (typeof jsQR === 'function') ? jsQR(img.data, img.width, img.height) : null;
        if (code) {
          try {
            const payload = JSON.parse(code.data);

         if ((payload.tipo === 'ristomemo_singolo' && payload.ristorante) || payload.t === 'rm1') {
              stopImportaQR();
              elaboraRistoranteImportato(payload.ristorante || payload);


            } else {
              document.getElementById('qrStatus').textContent = '⚠️ QR non riconosciuto come ristorante RistoMemo';
            }
          } catch(e) {
            document.getElementById('qrStatus').textContent = '⚠️ QR non valido';
          }
        }
      }
      tick();
    })
    .catch(() => {
      const s = document.getElementById('qrStatus');
      if (s) s.textContent = '❌ Camera non disponibile o permesso negato';
    });
}

function stopImportaQR() {
  if (window._qrStream) { window._qrStream.getTracks().forEach(t => t.stop()); window._qrStream = null; }
  if (window._qrRafId) { cancelAnimationFrame(window._qrRafId); window._qrRafId = null; }
  document.getElementById('modalImportaQR')?.remove();
}

function elaboraRistoranteImportato(raw) {
  // Supporta sia formato compatto {t,n,c,r,o,g} che formato esteso {ristorante:{...}}
  // Il contenuto arriva da fuori: viene SEMPRE ripulito prima di essere salvato.
  if (!raw || typeof raw !== 'object') {
    showNotif('⚠️ Dati del ristorante non validi', 'error');
    return;
  }
  const grezzo = raw.t === 'rm1' ? {
    name: raw.n, citta: raw.c||'', rating: raw.r||0,
    note: raw.o||'', tags: raw.g||[], chiusura: [], telefono: raw.p||''
  } : raw;

  const r = sanitizzaRistorante(grezzo);
  if (!r) {
    showNotif('⚠️ Ristorante non valido: manca il nome', 'error');
    return;
  }

  const arr = getRestaurants();
  const dup = arr.find(x =>
    x.name?.toLowerCase() === r.name.toLowerCase() &&
    (x.citta?.toLowerCase() === r.citta.toLowerCase() || (!x.citta && !r.citta))
  );
  if (dup) { showNotif('⚠️ Ristorante già presente nella collezione', 'error'); return; }
  r.id = _nuovoId();
  arr.push(r);

  saveRestaurants(arr);
  aggiornaLista();
  aggiornaStatCollezione();
  showNotif(`✅ "${r.name}" importato!`, 'success');
  showTab('cerca', document.querySelector('[data-tab="cerca"]'));
}

function setRatingCard(id, valore) {
  const arr = getRestaurants();
  const idx = arr.findIndex(x => String(x.id) === String(id));
  if (idx === -1) return;
  // Se tocca la stessa stella già selezionata, azzera
  arr[idx].rating = arr[idx].rating === valore ? 0 : valore;
  saveRestaurants(arr);
  aggiornaLista();
}

function eliminaRistorante(id) {
  const r = getRestaurants().find(x => String(x.id) === String(id));
  const nome = r ? r.name : 'questa scheda';
  const existing = document.getElementById('modaleElimina');
  if (existing) existing.remove();
  const html = `
    <div class="modal-overlay" id="modaleElimina">
      <div class="modal-box">
        <div class="modal-header" style="background:linear-gradient(135deg,var(--red),var(--red-dark));">🗑️ Conferma eliminazione</div>
        <div class="modal-body">
          <p>Stai per eliminare <strong style="color:var(--text);">${esc(nome)}</strong>.</p>
          <p>L'operazione non è reversibile. Vuoi procedere?</p>
        </div>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-cancel" data-azione="annulla-elimina">✕ Annulla</button>
          <button class="modal-btn modal-btn-save" data-azione="conferma-elimina" data-id="${esc(id)}">🗑️ Elimina</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function chiudiModaleElimina() {
  const m = document.getElementById('modaleElimina');
  if (m) m.remove();
}

function eseguiEliminazione(id) {
  const arr = getRestaurants().filter(r => String(r.id) !== String(id));
  saveRestaurants(arr);
  aggiornaLista();
  showNotif('🗑️ Eliminato', 'error');
}

// ===================== TERMINI =====================
// Versione dei Termini e della Privacy: deve essere uguale a TERMS_VERSION in terms.html.
// Quando cambi i Termini o la Privacy, cambia questa data in entrambi i file:
// chi ha già accettato rivedrà la pagina dei Termini una volta.
const TERMS_VERSION = '2026-10-14';

function mostraTerminiSeNecessario() {
  if (localStorage.getItem('terminiAccettati') !== TERMS_VERSION) {
    window.location.replace('terms.html');
  }
}

// ===================== INSTALL BANNER =====================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
  if (!localStorage.getItem('installBannerChiuso')) {
    setTimeout(() => {
      document.getElementById('installBanner').style.display = 'block';
    }, 3000);
  }
});

function chiudiInstallBanner() {
  document.getElementById('installBanner').style.display = 'none';
  localStorage.setItem('installBannerChiuso', '1');
}

// Su iOS mostra banner solo una volta
function checkIOSInstall() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone;
  if (isIOS && !isStandalone && !localStorage.getItem('installBannerChiuso')) {
    setTimeout(() => {
      document.getElementById('installBanner').style.display = 'block';
    }, 3000);
  }
}

// ===================== BACKUP EMAIL =====================
function sendBackupEmail() {
  const arr = getRestaurants().filter(r => r.id !== ESEMPIO_ID);
  if (arr.length === 0) { showNotif('⚠️ Nessun ristorante da salvare', 'error'); return; }

  const backup = { version: '2.0', timestamp: new Date().toISOString(), data: arr };
  const json = JSON.stringify(backup, null, 2);
  const fileName = `ristomemo_backup_${new Date().toISOString().slice(0,10)}.json`;
  const blob = new Blob([json], { type: 'application/json' });

  const subject = encodeURIComponent(`🍽️ Backup RistoMemo – ${new Date().toLocaleDateString('it-IT')}`);
  const body = encodeURIComponent(`Backup RistoMemo del ${new Date().toLocaleDateString('it-IT')}.\n\n${arr.length} ristoranti salvati.\n\nPer ripristinare: apri RistoMemo → Backup → Ripristina da file.`);
  const mailtoLink = `mailto:?subject=${subject}&body=${body}`;

  // Prova Web Share API con file (iOS 15+ / Android)
  const file = new File([blob], fileName, { type: 'application/json' });
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ title: 'Backup RistoMemo', files: [file] })
      .then(() => {
        localStorage.setItem('lastBackupDate', new Date().toISOString());
        aggiornaInfoBackup();
        showNotif('📧 Backup condiviso!', 'success');
      })
      .catch(() => fallbackBackup(blob, fileName, mailtoLink));
  } else {
    fallbackBackup(blob, fileName, mailtoLink);
  }
}

function fallbackBackup(blob, fileName, mailtoLink) {
  // Download file
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  // Apri client email
  setTimeout(() => { window.location.href = mailtoLink; }, 600);
  localStorage.setItem('lastBackupDate', new Date().toISOString());
  aggiornaInfoBackup();
  showNotif('💾 File scaricato — allégalo alla tua email!', 'success');
}

function controllaPromemoriaBackup() {
  const GIORNI = 7;
  const MS = GIORNI * 24 * 60 * 60 * 1000;
  const banner = document.getElementById('backupReminder');
  if (!banner) return;

  // Se non ci sono ristoranti (escluso esempio) non mostrare
  const arr = getRestaurants().filter(r => r.id !== ESEMPIO_ID);
  if (arr.length === 0) return;

  // Se l'utente ha chiuso il banner di recente, aspetta 7 giorni
  const dismissed = localStorage.getItem('backupReminderDismissed');
  if (dismissed && Date.now() - parseInt(dismissed) < MS) return;

  const last = localStorage.getItem('lastBackupDate');
  const scaduto = !last || (Date.now() - new Date(last).getTime() > MS);
  if (scaduto) banner.classList.add('show');
}

function chiudiBannerBackup() {
  const banner = document.getElementById('backupReminder');
  if (banner) banner.classList.remove('show');
  localStorage.setItem('backupReminderDismissed', Date.now().toString());
}

function vaiAlBackup() {
  chiudiBannerBackup();
  showTab('backup', document.getElementById('tab-btn-backup'));
}

function aggiornaInfoBackup() {
  const banner = document.getElementById('backupReminder');
  if (banner) banner.classList.remove('show');
  const last = localStorage.getItem('lastBackupDate');
  const el = document.getElementById('backupInfo');
  if (el) {
    el.textContent = last
      ? `Ultimo backup: ${new Date(last).toLocaleDateString('it-IT')} alle ${new Date(last).toLocaleTimeString('it-IT', {hour:'2-digit',minute:'2-digit'})}`
      : 'Ultimo backup: mai effettuato';
  }
}

// ===================== STATISTICHE =====================
function aggiornaStatistiche() {
  const arr = getRestaurants().filter(r => r.id !== ESEMPIO_ID);
  const totEl = document.getElementById('statTotale');
  const medEl = document.getElementById('statMedia');
  if (totEl) totEl.textContent = arr.length;
  if (medEl) {
    const conRating = arr.filter(r => r.rating > 0);
    medEl.textContent = conRating.length > 0
      ? (conRating.reduce((s, r) => s + r.rating, 0) / conRating.length).toFixed(1) + ' ⭐'
      : '—';
  }
}


function esportaBackup() {
  const arr = getRestaurants().filter(r => r.id !== ESEMPIO_ID);
  const blob = new Blob([JSON.stringify(arr, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ristomemo_backup_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  showNotif('✅ Backup esportato', 'success');
}
// ===================== MIGRAZIONE FORMATO VECCHIO =====================
function migraVecchioFormato(arr) {
  const TUTTI_GIORNI = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];

  const mapAmbiente = {
    'Città Urbana': '🏙️ Città', 'Sul Lago': '🏞️ Lago',
    'In Campagna': '🌾 Campagna', 'In Montagna': '🏔️ Montagna',
    'Sul Mare': '🌊 Mare', 'Paesino': '🏡 Paese',
  };
  const mapTipologia = {
    'Rustico': '🏚️ Rustico', 'Elegante': '✨ Elegante',
    'Caminetto a Legna': '🔥 Caminetto', 'Gestione del Caminetto': '🔥 Caminetto',
    'Agriturismo': '🌾 Campagna',
  };
  const mapServizi = {
    'Parcheggio Interno': '🚗 Parcheggio',
  };
  const mapCucina = {
    'Italiana': '🇮🇹 Italiano completo', 'Pesce': '🐟 Pesce',
    'Carne': '🥩 Carne', 'Pizza': '🍕 Pizza',
  };

  return arr.map(r => {
    // Se ha già il formato nuovo (ha tags array) — non toccare
    if (Array.isArray(r.tags) && !r.ambiente) return r;

    const _a = v => Array.isArray(v) ? v : [];
    const tags = new Set(_a(r.tags));
    _a(r.ambiente).forEach(v => { const t = mapAmbiente[v];  if (t) tags.add(t); });
    _a(r.tipologia).forEach(v => { const t = mapTipologia[v]; if (t) tags.add(t); });
    _a(r.servizi).forEach(v => { const t = mapServizi[v];   if (t) tags.add(t); });
    if (typeof r.cucina === 'string' && Object.prototype.hasOwnProperty.call(mapCucina, r.cucina)) { const t = mapCucina[r.cucina]; if (t) tags.add(t); }

    // Giorni aperti → giorni chiusi
    const giorniAperti = _a(r.giorni);
    const chiusura = Array.isArray(r.chiusura) ? r.chiusura : TUTTI_GIORNI.filter(g => !giorniAperti.includes(g));

    // Note + chiusure testuali
    let note = String(r.note || r.notes || '').trim();
    if (typeof r.chiusure === 'string' && r.chiusure.trim()) {
      note = note ? note + '\n⚠️ ' + r.chiusure.trim() : '⚠️ ' + r.chiusure.trim();
    }

    const cittaCompleta = [r.citta, r.indirizzo].filter(Boolean).join(', ');

    return {
      id:        r.id,
      name:      r.name,
      citta:     cittaCompleta,
      telefono:  r.telefono || '',
      rating:    r.rating ? parseInt(r.rating) || 0 : 0,
      note:      note,
      tags:      [...tags],
      chiusura:  chiusura,
      preferito: r.preferito || false,
      _lat:      r._lat || r.lat || null,
      _lng:      r._lng || r.lon || r.lng || null,
    };
  });
}

// File di ripristino in attesa di conferma (già ripulito)
let _ripristinoInAttesa = null;

function importaBackup(e) {
  const input = e.target;
  const file = input.files && input.files[0];
  if (!file) return;
  if (file.size > LIMITI.maxFileBytes) {
    showNotif('❌ File troppo grande per essere un backup', 'error');
    input.value = '';
    return;
  }
  const fr = new FileReader();
  fr.onload = ev => {
    input.value = ''; // permette di scegliere di nuovo lo stesso file
    try {
      const parsed = JSON.parse(ev.target.result);

      // File di un SINGOLO ristorante (come da Guida): si aggiunge, non sostituisce
      if (parsed && !Array.isArray(parsed) && parsed.tipo === 'ristomemo_singolo' && parsed.ristorante) {
        elaboraRistoranteImportato(parsed.ristorante);
        return;
      }

      // Gestisce formato array diretto [...] e formato annidato {version, data:[...]}
      let data = Array.isArray(parsed) ? parsed : (parsed && parsed.data) || null;

      if (!data || !Array.isArray(data)) {
        showNotif('❌ File non valido o formato non riconosciuto', 'error');
        return;
      }

      // Si lavora solo su oggetti veri; il resto viene saltato dal controllo successivo
      const nTotale = data.length;
      data = data.filter(r => r && typeof r === 'object' && !Array.isArray(r));
      data = data.map(r => ({ ...r, _lat: r._lat || r.lat || null, _lng: r._lng || r.lon || r.lng || null }));

      // Migrazione automatica se contiene campi vecchi (ambiente, tipologia, ecc.)
      const haFormatoVecchio = data.some(r => r.ambiente || r.tipologia || r.notes);
      if (haFormatoVecchio) data = migraVecchioFormato(data);

      const pulito = sanitizzaElenco(data);
      const scartati = pulito.scartati + (nTotale - data.length);
      if (pulito.validi.length === 0) {
        showNotif('❌ Nessun ristorante valido nel file', 'error');
        return;
      }
      mostraModaleRipristino(pulito.validi, scartati);
    } catch(err) {
      showNotif('❌ File non valido', 'error');
    }
  };
  fr.onerror = () => { input.value = ''; showNotif('❌ Impossibile leggere il file', 'error'); };
  fr.readAsText(file);
}

function mostraModaleRipristino(validi, scartati) {
  chiudiModaleRipristino();
  _ripristinoInAttesa = validi;
  const attuali = getRestaurants().filter(r => r.id !== ESEMPIO_ID).length;
  const plur = (n, s, p) => n + ' ' + (n === 1 ? s : p);
  const html = `
    <div class="modal-overlay" id="modaleRipristino">
      <div class="modal-box">
        <div class="modal-header">⚠️ Sostituire i tuoi ristoranti?</div>
        <div class="modal-body">
          <p>Nell'app ci sono <strong>${attuali}</strong> ${attuali === 1 ? 'ristorante' : 'ristoranti'}.</p>
          <p>
            Il file ne contiene <strong>${validi.length}</strong> validi.
            ${scartati > 0 ? `<br><span style="font-size:12px;color:#888;">${plur(scartati, 'voce rovinata verrà saltata', 'voci rovinate verranno saltate')}.</span>` : ''}
          </p>
          <p>Se continui, quelli attuali verranno sostituiti.</p>
        </div>
        <div class="modal-buttons">
          <button class="modal-btn modal-btn-cancel" data-azione="annulla-ripristino">✕ Annulla</button>
          <button class="modal-btn modal-btn-save" data-azione="conferma-ripristino">⬆️ Sostituisci</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
}

function chiudiModaleRipristino() {
  document.getElementById('modaleRipristino')?.remove();
  _ripristinoInAttesa = null;
}

function confermaRipristino() {
  const validi = _ripristinoInAttesa;
  document.getElementById('modaleRipristino')?.remove();
  _ripristinoInAttesa = null;
  if (!validi || validi.length === 0) return;
  saveRestaurants(validi);
  aggiornaLista();
  aggiornaStatistiche();
  aggiornaStatCollezione();
  showNotif('✅ Ripristinati: ' + validi.length + (validi.length === 1 ? ' ristorante' : ' ristoranti'), 'success');
}

// ===================== NOTIFICA =====================

let notifTimer;
function showNotif(msg, type='success') {
  const el = document.getElementById('notif');
  el.textContent = msg;
  el.className = 'notif show ' + type;
  clearTimeout(notifTimer);
  notifTimer = setTimeout(() => el.className = 'notif', 2800);
}

// ===================== INIT =====================
window.addEventListener('DOMContentLoaded', () => {

  // Early user flag — grandfather per futuro piano PRO
  if (!localStorage.getItem('ristomemo_early_user')) {
    localStorage.setItem('ristomemo_early_user', '1');
  }

  // ---- MIGRAZIONE AUTOMATICA dal vecchio formato FREE ----
  // Controlla i dati esistenti in localStorage e li converte se sono vecchio formato
  (function migraLocalStorageSeNecessario() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return;

      // Controlla se almeno un record ha il vecchio formato
      const haVecchioFormato = arr.some(r => r.ambiente || r.tipologia || r.notes !== undefined && r.note === undefined);
      
      // Migra formato vecchio se necessario
      if (haVecchioFormato) {
        const migrati = migraVecchioFormato(arr);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrati));
        console.log('[RistoMemo] Migrazione automatica completata:', migrati.length, 'ristoranti');
        return;
      }

      // Migra coordinate mancanti (lat/lon → _lat/_lng) anche su formato già nuovo
      const haCoordVecchie = arr.some(r => (r.lat || r.lon) && !r._lat && !r._lng);
      if (haCoordVecchie) {
        const migrati = arr.map(r => ({
          ...r,
          _lat: r._lat || r.lat || null,
          _lng: r._lng || r.lon || r.lng || null,
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrati));
        console.log('[RistoMemo] Migrazione coordinate completata:', migrati.filter(r=>r._lat).length, 'con coordinate');
      }
    } catch(e) {
      console.warn('[RistoMemo] Errore migrazione automatica:', e);
    }
  })();

  // ---- RIPULITURA DI SICUREZZA (una volta all'avvio) ----
  // Ricontrolla i ristoranti già salvati: se qualche campo non è nella forma prevista
  // (es. arrivato da un vecchio backup), lo riporta a una forma sicura.
  // Prima di cambiare qualcosa, conserva una copia dei dati originali.
  (function ripulisciDatiSalvati() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      const pulito = sanitizzaElenco(arr.map(r => (r && typeof r === 'object' && !Array.isArray(r)) ? r : null), { conservativo: true });
      const nuovo = JSON.stringify(pulito.validi);
      // Record non-oggetto vengono tolti (scartati > 0); il resto viene solo normalizzato
      if (nuovo !== JSON.stringify(arr)) {
        try { localStorage.setItem(STORAGE_KEY + '_prima_pulizia', raw); } catch (e) {}
        localStorage.setItem(STORAGE_KEY, nuovo);
        console.log('[RistoMemo] Dati salvati ricontrollati e sistemati:', pulito.validi.length, 'ristoranti');
      }
    } catch (e) {
      console.warn('[RistoMemo] Controllo dati salvati non riuscito:', e);
    }
  })();

  // Tab buttons via addEventListener — più robusto degli onclick inline
  document.getElementById('tab-btn-guida').addEventListener('click', function() { showTab('guida', this); });
  document.getElementById('tab-btn-aggiungi').addEventListener('click', function() { showTab('aggiungi', this); });
  document.getElementById('tab-btn-cerca').addEventListener('click', function() { showTab('cerca', this); });
  document.getElementById('tab-btn-backup').addEventListener('click', function() { showTab('backup', this); });

  // Evidenzia check-item al cambio
  document.querySelectorAll('.check-item input').forEach(cb => {
    cb.addEventListener('change', function() {
      cb.closest('.check-item').classList.toggle('checked', cb.checked);
    });
  });

  // Progress bar — aggancia agli input
  document.getElementById('f-nome').addEventListener('input', aggiornaProgress);
  document.getElementById('f-citta').addEventListener('input', aggiornaProgress);
  document.getElementById('f-telefono').addEventListener('input', aggiornaProgress);
  document.getElementById('f-note').addEventListener('input', aggiornaProgress);
  document.querySelectorAll('.giorno-cb').forEach(cb => {
    cb.addEventListener('change', aggiornaProgress);
  });

  aggiornaProgress(); // stato iniziale
  disegnaQRIntestazione();

  aggiornaLista();
 aggiornaInfoBackup();
  aggiornaStatCollezione();
  controllaPromemoriaBackup();
  checkIOSInstall();
  mostraCookieBannerSeNecessario();

  mostraTerminiSeNecessario();

  // Se arrivo da terms.html dopo accettazione, apro tab Guida
  if (window.location.hash === '#guida') {
    history.replaceState(null, '', window.location.pathname);
    showTab('guida', document.getElementById('tab-btn-guida'));
  }
});

// ===================== SERVICE WORKER =====================
(function() {
  if (!('serviceWorker' in navigator)) return;
  const host = location.hostname;
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.indexOf('claudeusercontent') !== -1) return;

  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./service-worker.js').then(function(reg) {
      console.log('SW registrato:', reg.scope);

      // Rileva nuovo SW in attesa
      reg.addEventListener('updatefound', function() {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', function() {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // C'è una nuova versione disponibile — mostra notifica
            mostraNotificaAggiornamento(newWorker);
          }
        });
      });
    }).catch(function(err) {
      console.warn('SW:', err.message);
    });

    // Ricarica automatica dopo che il nuovo SW ha preso controllo
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function() {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
})();

function mostraNotificaAggiornamento(newWorker) {
  window._pendingWorker = newWorker; // serve al bottone "Aggiorna"
  // Rimuovi eventuale notifica precedente
  const existing = document.getElementById('updateBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'updateBanner';
  banner.style.cssText = 'position:fixed;bottom:20px;left:12px;right:12px;max-width:480px;margin:0 auto;background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:14px 16px;border-radius:16px;z-index:9999;display:flex;align-items:center;justify-content:space-between;gap:12px;box-shadow:0 6px 24px rgba(0,0,0,0.25);font-family:Nunito,sans-serif;animation:sheetUp 0.3s ease;';
  banner.innerHTML = `
    <span style="font-size:13px;font-weight:700;flex:1;">🔄 Nuova versione disponibile!</span>
    <button onclick="this.closest('#updateBanner').remove()" style="background:rgba(255,255,255,0.2);border:none;color:white;padding:6px 10px;border-radius:8px;font-family:Nunito,sans-serif;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;">Dopo</button>
    <button onclick="aggiornaApp()" style="background:white;color:#667eea;border:none;padding:6px 12px;border-radius:8px;font-family:Nunito,sans-serif;font-weight:800;font-size:12px;cursor:pointer;white-space:nowrap;">Aggiorna</button>
  `;
  document.body.appendChild(banner);
}

function aggiornaApp() {
  // Chiede al nuovo service worker di attivarsi (con entrambi i messaggi che conosce)
  const w = window._pendingWorker;
  if (w) {
    try {
      w.postMessage({ type: 'SKIP_WAITING' });
      w.postMessage({ action: 'skipWaiting' });
    } catch (e) {}
  }
  // Il service worker si attiva da solo e ricarica la pagina; per sicurezza,
  // se entro mezzo secondo non è successo nulla, ricarica comunque.
  document.getElementById('updateBanner')?.remove();
  setTimeout(() => window.location.reload(), 500);
}

// ===================== TRACCIAMENTO PWA (Umami) =====================
// Aggiunto per capire quanti utenti installano e riaprono RistoMemo
// come app installata, oltre alle semplici visite alla pagina.

// Invia un evento a Umami solo se lo script è pronto.
function _tracciaUmami(nome) {
  // Se questo dispositivo è marcato come sviluppatore, non traccio nulla.
  // Ritorno true così l'eventuale ciclo di retry si ferma subito.
  if (_sonoSviluppatore()) return true;
  if (window.umami && typeof window.umami.track === 'function') {
    window.umami.track(nome);
    return true;
  }
  return false;
}

// 1) Momento dell'installazione (Android / Chrome / Edge desktop).
//    NB: su iPhone questo evento NON esiste (Apple non lo lancia).
window.addEventListener('appinstalled', function () {
  _tracciaUmami('pwa-installata');
});

// 2) App aperta come installata (funziona anche su iPhone).
//    È il dato più utile: misura chi USA davvero l'app, non solo chi passa.
window.addEventListener('load', function () {
  var installata =
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
    window.navigator.standalone === true;
  if (!installata) return;

  // Umami è asincrono: riprovo per ~5 secondi finché non è pronto.
  var tentativi = 0;
  var attesa = setInterval(function () {
    if (_tracciaUmami('pwa-aperta-installata') || ++tentativi > 20) {
      clearInterval(attesa);
    }
  }, 250);
});
