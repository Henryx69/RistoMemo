// ===================== DATA =====================
const ESEMPIO_ID = '__esempio__';
const STORAGE_KEY = 'myRestaurants';

function getRestaurants() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch(e) { return []; }
}
function saveRestaurants(arr) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
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
  container.innerHTML = [...selectedTags].map(t => `
    <span class="tag-selected-chip">
      ${t}
      <button class="tag-remove" data-tag="${t.replace(/"/g,'&quot;')}" title="Rimuovi">✕</button>
    </span>
  `).join('');
  // delegazione eventi per evitare bug con caratteri speciali nell'onclick
  container.querySelectorAll('.tag-remove').forEach(btn => {
    btn.addEventListener('click', () => rimuoviTag(btn.dataset.tag));
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
      <strong>🍽️ ${d.name}</strong>
      <span>📍 ${d.citta || '—'} ${d.rating ? '· ' + '⭐'.repeat(parseInt(d.rating)) : ''}</span>
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
    list.innerHTML = `<div class="no-results">Nessun risultato${filtroPreferiti ? ' tra i preferiti' : ''}${giornoFiltroAttivo ? ' aperto ' + giornoFiltroAttivo : ''}${q ? ' per "' + q + '"' : ''}.</div>`;
    return;
  }

  list.innerHTML = filtered.map(r => {
    const isEsempio = r.id === ESEMPIO_ID;
    const sid = String(r.id).replace(/'/g, "\\'");
    const cuore = r.preferito ? '❤️' : '🤍';
    const stelle = `<div class="card-stars">${[1,2,3,4,5].map(n =>
      `<button class="card-star-btn ${(r.rating||0) >= n ? 'on' : ''}" onclick="setRatingCard('${sid}',${n})" title="${n} stelle">⭐</button>`
    ).join('')}</div>`;
    const tags = (r.tags||[]).map(t => `<span class="tag clickable" onclick="cercaPerTag('${t.replace(/'/g,"\\'")}')">${t}</span>`).join('');
    const chiusuraInfo = (r.chiusura||[]).length > 0
      ? `<div style="font-size:12px;color:var(--muted);margin-top:6px;">🔒 Chiuso: ${r.chiusura.join(' · ')}</div>`
      : '';
    const telInfo = r.telefono
      ? `<a href="tel:${r.telefono}" style="display:inline-flex;align-items:center;gap:6px;background:#f0fff4;border:1.5px solid #28a745;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;color:#1a6b30;text-decoration:none;margin-top:6px;">📞 ${r.telefono}</a>`
      : (!isEsempio ? `<div style="font-size:11px;color:#f39c12;font-weight:700;margin-top:6px;cursor:pointer;" onclick="modificaRistorante('${sid}')">📞 Telefono non inserito — tocca ✏️ per aggiungerlo</div>` : '');
    return `
      <div class="restaurant-card ${isEsempio ? 'card-example' : ''}">
        ${isEsempio ? '<div class="example-badge">✨ Esempio</div>' : ''}

        <!-- HEADER COLORATO -->
        <div class="card-header-band">
          <div class="card-name">${r.name}</div>
          <div class="card-location">📍 ${r.citta || '—'}</div>
        </div>

        <!-- CORPO: stelle + tutte le icone a destra -->
        <div class="card-delete-row">
          ${stelle}
          <div class="card-actions">
            ${!isEsempio ? `<button class="fav-btn" onclick="togglePreferito('${sid}')" title="Preferito">${cuore}</button>` : ''}
            ${!isEsempio ? `<button class="action-btn" onclick="modificaRistorante('${sid}')" title="Modifica">✏️</button>` : ''}
            ${!isEsempio ? `<button class="action-btn" onclick="condividiRistorante('${sid}')" title="Invia">↗️</button>` : ''}
            <button class="action-btn delete" onclick="eliminaRistorante('${sid}')" title="Elimina">🗑️</button>
          </div>
        </div>
        ${tags ? `<div class="card-tags">${tags}</div>` : ''}
        ${telInfo}
        ${r.note ? `<div class="card-note">"${r.note}"</div>` : ''}

        <!-- FOOTER -->
        <div class="card-footer-band">
          <span style="font-size:11px;color:var(--muted);font-style:italic;">${chiusuraInfo ? chiusuraInfo.replace(/<[^>]+>/g,'') : ''}</span>
          ${!isEsempio && r.citta ? `<button class="btn-mappa" onclick="toggleMappa('${sid}', this)">🗺️ Mappa</button>` : '<span></span>'}
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
  const testo = encodeURIComponent('Uso questa app gratuita per salvare i ristoranti dove mangio bene 🍽️\nInstallala anche tu, è gratis e funziona offline:\nhttps://ristomemo.netlify.app/installa.html');
  window.open('https://wa.me/?text=' + testo, '_blank');
}
function condividiRistorante(id) {
  const r = getRestaurants().find(x => String(x.id) === String(id));
  if (!r) return;
  const nomeEsc = r.name.replace(/'/g, "\\'");
  const overlay = document.createElement('div');
  overlay.id = 'modalCondividi';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:340px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:800;font-size:16px;margin-bottom:4px;">↗️ Condividi ristorante</p>
      <p style="font-size:13px;color:#666;margin-bottom:18px;">🍽️ <strong>${r.name}</strong></p>
      <button onclick="condividiTesto('${id}')" style="width:100%;padding:12px;background:linear-gradient(135deg,var(--red),var(--red-dark));color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:8px;">📤 Condividi come testo</button>
      <button onclick="esportaJSON('${id}')" style="width:100%;padding:12px;background:#6c757d;color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:8px;">📦 Esporta file JSON</button>
      <button onclick="mostraQR('${id}')" style="width:100%;padding:12px;background:#0066cc;color:#fff;border:none;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;cursor:pointer;margin-bottom:16px;">📷 Mostra QR Code</button>
      <button onclick="document.getElementById('modalCondividi').remove()" style="width:100%;padding:10px;background:#f8f9fa;color:#333;border:2px solid #dee2e6;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Annulla</button>
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
  a.download = `ristomemo_${r.name.replace(/\s+/g,'_').replace(/[^a-zA-Z0-9_]/g,'').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotif('📦 File JSON scaricato!', 'success');
}

function mostraQRApp() {
  const url = 'https://ristomemo.netlify.app/installa.html';
  const overlay = document.createElement('div');
  overlay.id = 'modalQRApp';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:24px;max-width:300px;width:100%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.2);">
      <p style="font-weight:900;font-size:17px;margin-bottom:4px;">🍽️ RistoMemo</p>
      <p style="font-size:12px;color:#666;margin-bottom:16px;">Scansiona per installare l'app gratis</p>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&ecc=M&data=${encodeURIComponent(url)}" width="240" height="240" style="border-radius:8px;margin-bottom:16px;" alt="QR RistoMemo">
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
      <p style="font-size:13px;color:#666;margin-bottom:16px;">🍽️ <strong>${r.name}</strong></p>
      <img id="qrImg" style="width:220px;height:220px;margin-bottom:16px;border-radius:8px;" alt="QR Code">
      <p style="font-size:11px;color:#888;margin-bottom:16px;">Fai uno screenshot e fallo scansionare per importare il ristorante in RistoMemo</p>
      <button onclick="document.getElementById('modalQR').remove()" style="width:100%;padding:10px;background:#f8f9fa;color:#333;border:2px solid #dee2e6;border-radius:10px;font-family:Nunito,sans-serif;font-weight:700;font-size:13px;cursor:pointer;">✕ Chiudi</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('qrImg').src = 'https://api.qrserver.com/v1/create-qr-code/?size=220x220&ecc=L&data=' + encodeURIComponent(payload);
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
        const code = jsQR(img.data, img.width, img.height);
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

const r = raw.t === 'rm1' ? {
    name: raw.n, citta: raw.c||'', rating: raw.r||0,
    note: raw.o||'', tags: raw.g||[], chiusura: [], telefono: raw.p||''
  } : raw;

  const arr = getRestaurants();
  const dup = arr.find(x =>
    x.name?.toLowerCase() === r.name?.toLowerCase() &&
    (x.citta?.toLowerCase() === r.citta?.toLowerCase() || (!x.citta && !r.citta))
  );
  if (dup) { showNotif('⚠️ Ristorante già presente nella collezione', 'error'); return; }
  r.id = Date.now();
  arr.push(r);


  saveRestaurants(arr);
  aggiornaLista();
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
  const arr = getRestaurants().filter(r => String(r.id) !== String(id));
  saveRestaurants(arr);
  aggiornaLista();
  showNotif('🗑️ Eliminato', 'error');
}

// ===================== TERMINI =====================
function mostraTerminiSeNecessario() {
  if (!localStorage.getItem('terminiAccettati')) {
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

    const tags = new Set(r.tags || []);
    (r.ambiente  || []).forEach(v => { const t = mapAmbiente[v];  if (t) tags.add(t); });
    (r.tipologia || []).forEach(v => { const t = mapTipologia[v]; if (t) tags.add(t); });
    (r.servizi   || []).forEach(v => { const t = mapServizi[v];   if (t) tags.add(t); });
    if (r.cucina) { const t = mapCucina[r.cucina]; if (t) tags.add(t); }

    // Giorni aperti → giorni chiusi
    const giorniAperti = r.giorni || [];
    const chiusura = r.chiusura || TUTTI_GIORNI.filter(g => !giorniAperti.includes(g));

    // Note + chiusure testuali
    let note = (r.note || r.notes || '').trim();
    if (r.chiusure && r.chiusure.trim()) {
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

function importaBackup(e) {
  const file = e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = ev => {
    try {
      const parsed = JSON.parse(ev.target.result);

      // Gestisce formato array diretto [...] e formato annidato {version, data:[...]}
      let data = Array.isArray(parsed) ? parsed : (parsed.data || null);

      if (!data || !Array.isArray(data)) {
        showNotif('❌ File non valido o formato non riconosciuto', 'error');
        return;
      }

      // Migrazione automatica se contiene campi vecchi (ambiente, tipologia, ecc.)
      data = data.map(r => ({ ...r, _lat: r._lat || r.lat || null, _lng: r._lng || r.lon || r.lng || null }));
      const haFormatoVecchio = data.some(r => r.ambiente || r.tipologia || r.notes);
      if (haFormatoVecchio) {
        data = migraVecchioFormato(data);
        showNotif('✅ Importati e convertiti: ' + data.length + ' ristoranti', 'success');
      } else {
        showNotif('✅ Importati: ' + data.length + ' ristoranti', 'success');
      }

      saveRestaurants(data);
    } catch(err) {
      showNotif('❌ File non valido', 'error');
    }
  };
  fr.readAsText(file);
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
  if (window._pendingWorker) {
    window._pendingWorker.postMessage({ action: 'skipWaiting' });
  }
}
