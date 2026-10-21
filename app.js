// Lies etwas Wunderbares — eine Karte pro Text, der Hintergrund folgt den Farben des Textes.
// Funktionsweise nach readsomethingwonderful.com (Analyse im intern-Repo: analyse/ANALYSE_rsw.md).
//
// Endlos: Die Texte werden in zufälliger Reihenfolge als „Runde“ angehängt; kurz vor dem Ende
// kommt die nächste Runde dazu, nach dem letzten Text folgt also wieder der erste.
// Links die Titelliste wie im Original: alle Titel vielfach wiederholt (nach oben und unten endlos),
// beim Textwechsel springt sie sofort, sodass Hintergrund, Angaben rechts und der weiße Titel links
// gleichzeitig wechseln. Die Helligkeit hängt an der Position im sichtbaren Bereich der Liste.

(() => {
  const eintraege = window.EINTRAEGE || []
  const karten = document.getElementById('karten')
  const info = document.getElementById('info')
  const liste = document.getElementById('liste')
  const listeInnen = document.getElementById('liste-innen')
  const hg = [document.getElementById('hg1'), document.getElementById('hg2')]
  const hinweis = document.getElementById('hinweis')

  const ZUFALL = true // false = Reihenfolge wie in texte.json
  const SCHWARZ = 'var(--schwarz)'
  // Helligkeit nach Platz im sichtbaren Bereich der Liste (Original: nth-child-Regeln); danach unsichtbar.
  const STUFEN = [0, 0.4, 0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.2, 0.1, 0.1, 0.1, 0.05, 0.05]
  const LINK_SYMBOL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>'

  const text = s => String(s ?? '').replace(/[&<>"]/g, z => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[z])

  const kurzname = e =>
    (e.slug || `${e.autor}-${e.titel}`)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

  const zeile = e => [e.autor, e.jahr].filter(Boolean).join(' • ')

  const mischen = a => {
    const b = [...a]
    for (let i = b.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [b[i], b[j]] = [b[j], b[i]]
    }
    return b
  }

  eintraege.forEach(e => { e.slug = kurzname(e) })
  if (!eintraege.length) return

  // ---------- Reihenfolge ----------

  // Ein Link auf einen Text (#slug) beginnt mit genau diesem Text, der Rest folgt gemischt.
  const ziel = decodeURIComponent(location.hash.slice(1))
  const alle = eintraege.map((_, i) => i)
  const startIdx = eintraege.findIndex(e => e.slug === ziel)
  let reihenfolge = ZUFALL ? mischen(alle) : alle
  if (startIdx >= 0) {
    const pos = reihenfolge.indexOf(startIdx)
    reihenfolge = [...reihenfolge.slice(pos), ...reihenfolge.slice(0, pos)]
  }

  const folge = [] // Position → Index in eintraege, wächst mit jeder Runde

  // ---------- Angaben rechts (einmal pro Text) ----------

  eintraege.forEach((e, i) => {
    const angaben = document.createElement('div')
    angaben.className = 'eintrag'
    angaben.dataset.idx = i
    angaben.innerHTML = `
      ${e.jahr ? `<p class="jahr">${text(e.jahr)}</p>` : ''}
      <h2 class="titel">${text(e.titel)}</h2>
      <p class="autor">${text(e.autor)}</p>
      ${e.empfohlen ? `<p class="empfohlen">empfohlen von ${text(e.empfohlen)}</p>` : ''}
      <div class="knoepfe">
        <button class="knopf symbol" data-teilen="${i}" aria-label="Link kopieren">${LINK_SYMBOL}</button>
        <a class="knopf" href="${text(e.url)}" target="_blank" rel="noopener">Lesen</a>
      </div>`
    info.append(angaben)
  })

  // ---------- Karten (eine Runde nach der anderen) ----------

  const beobachter = new IntersectionObserver(
    b => b.forEach(x => {
      if (x.isIntersecting) {
        clearTimeout(beobachter.warte)
        beobachter.warte = setTimeout(() => aktiviere(Number(x.target.dataset.pos)), 100)
      }
    }),
    { threshold: 0.95 }, // wie im Original: erst wenn die Karte fast ganz zu sehen ist, nach 100 ms Ruhe
  )

  const groesse = new IntersectionObserver(
    b => b.forEach(x => x.target.style.setProperty('--sichtbar', x.intersectionRatio.toFixed(3))),
    { threshold: Array.from({ length: 21 }, (_, n) => n / 20) },
  )

  const runde = () => {
    const karteFrag = document.createDocumentFragment()
    for (const i of reihenfolge) {
      const pos = folge.length
      folge.push(i)
      const e = eintraege[i]

      const karte = document.createElement('section')
      karte.className = 'karte'
      karte.dataset.pos = pos
      karte.innerHTML = `
        <div class="kopf">
          <h2 class="titel">${text(e.titel)}</h2>
          <p class="autor">${text(zeile(e))}</p>
        </div>
        <a href="${text(e.url)}" target="_blank" rel="noopener" aria-label="${text(e.titel)} von ${text(e.autor)} lesen">
          <img src="${text(e.bild)}" alt="Seite: ${text(e.titel)}" width="1158" height="1428"
               ${pos < 2 ? '' : 'loading="lazy"'} decoding="async">
        </a>`
      karteFrag.append(karte)
      beobachter.observe(karte)
      groesse.observe(karte.querySelector('img'))
    }
    karten.append(karteFrag)
  }

  // Zwei Runden zum Start; jede weitere kommt, wenn man sich dem Ende der letzten nähert.
  runde()
  runde()

  // ---------- Hintergrund überblenden ----------

  let aktiv = -1
  let sichtbar = 0 // welche der beiden Ebenen gerade zu sehen ist

  const setzeHintergrund = e => {
    const verlauf = `linear-gradient(180deg, ${e.farbe_start || SCHWARZ} 0%, ${e.farbe_ende || SCHWARZ} 100%)`
    const neu = 1 - sichtbar
    hg[neu].style.setProperty('--background', verlauf)
    hg[neu].style.setProperty('--opacity', '1')
    hg[sichtbar].style.setProperty('--opacity', '0')
    sichtbar = neu
  }

  // ---------- Titelliste links ----------

  const n = reihenfolge.length
  const WDH = Math.max(5, Math.ceil(300 / n)) | 1 // ungerade Zahl an Wiederholungen
  const MITTE = Math.floor(WDH / 2)
  const titel = []
  {
    const frag = document.createDocumentFragment()
    for (let k = 0; k < WDH * n; k++) {
      const t = document.createElement('button')
      t.className = 'listen-titel'
      t.textContent = eintraege[reihenfolge[k % n]].titel
      t.tabIndex = -1
      t.dataset.k = k
      frag.append(t)
      titel.push(t)
    }
    listeInnen.append(frag)
  }

  let oben = [] // offsetTop jedes Titels, für schnelles Suchen
  let rundenHoehe = 0
  const vermessen = () => {
    oben = titel.map(t => t.offsetTop)
    rundenHoehe = oben[n] - oben[0]
  }

  const listenPos = pos => MITTE * n + (pos % n)

  let gefaerbt = []
  const faerbeListe = () => {
    if (!oben.length) return
    const y = liste.scrollTop
    let lo = 0, hi = titel.length - 1 // erster Titel, der unten über die Oberkante ragt
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (oben[mid] + titel[mid].offsetHeight > y) hi = mid
      else lo = mid + 1
    }
    for (const t of gefaerbt) t.style.removeProperty('--hell')
    gefaerbt = titel.slice(lo, lo + STUFEN.length)
    gefaerbt.forEach((t, rang) => t.style.setProperty('--hell', STUFEN[rang]))
  }

  let aktiverTitel = null
  const listeNachfuehren = () => {
    const t = titel[listenPos(aktiv)]
    aktiverTitel?.classList.remove('aktiv')
    t.classList.add('aktiv')
    aktiverTitel = t
    if (oben.length) liste.scrollTop = oben[listenPos(aktiv)] // sofort, wie im Original
    faerbeListe()
  }

  // Beim eigenen Scrollen: Helligkeit neu verteilen und unbemerkt um eine Runde versetzen,
  // wenn man sich einem Ende nähert – so geht es in beide Richtungen endlos weiter.
  let rahmen = 0
  liste.addEventListener('scroll', () => {
    if (rahmen) return
    rahmen = requestAnimationFrame(() => {
      rahmen = 0
      if (rundenHoehe > 0) {
        if (liste.scrollTop < rundenHoehe) liste.scrollTop += rundenHoehe * MITTE
        else if (liste.scrollTop > rundenHoehe * (WDH - 2)) liste.scrollTop -= rundenHoehe * MITTE
      }
      faerbeListe()
    })
  }, { passive: true })

  const aktiviere = pos => {
    if (pos === aktiv) return
    aktiv = pos
    const i = folge[pos]
    const e = eintraege[i]
    setzeHintergrund(e)
    info.querySelectorAll('.eintrag').forEach(el => el.classList.toggle('aktiv', Number(el.dataset.idx) === i))
    listeNachfuehren()
    document.title = `${e.titel} – Lies etwas Wunderbares`
    history.replaceState(null, '', `#${e.slug}`)
    if (pos > folge.length - eintraege.length) runde()
  }

  // ---------- Bedienung ----------

  const springe = pos => karten.querySelector(`.karte[data-pos="${pos}"]`)?.scrollIntoView({ block: 'start' })

  // Klick auf einen Titel: so viele Texte vor oder zurück, wie er vom aktuellen entfernt steht.
  liste.addEventListener('click', ev => {
    const t = ev.target.closest('.listen-titel')
    if (!t) return
    let ziel = aktiv + (Number(t.dataset.k) - listenPos(aktiv))
    if (ziel < 0) ziel = ((ziel % n) + n) % n
    while (ziel > folge.length - 2) runde()
    springe(ziel)
  })

  const blaettere = richtung =>
    document.body.scrollBy({ top: richtung * window.innerHeight * 0.8544, behavior: 'smooth' })

  document.addEventListener('keydown', ev => {
    if (ev.target.closest('dialog, input, textarea')) return
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown' || ev.key === 'PageDown') { ev.preventDefault(); blaettere(1) }
    if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp' || ev.key === 'PageUp') { ev.preventDefault(); blaettere(-1) }
  })

  const zeigeHinweis = t => {
    hinweis.textContent = t
    hinweis.classList.add('sichtbar')
    clearTimeout(zeigeHinweis.t)
    zeigeHinweis.t = setTimeout(() => hinweis.classList.remove('sichtbar'), 1800)
  }

  info.addEventListener('click', async ev => {
    const k = ev.target.closest('[data-teilen]')
    if (!k) return
    const e = eintraege[Number(k.dataset.teilen)]
    const adresse = `${location.origin}${location.pathname}#${e.slug}`
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: e.titel, text: `${e.titel} – ${e.autor}`, url: adresse })
      } else {
        await navigator.clipboard.writeText(adresse)
        zeigeHinweis('Link kopiert')
      }
    } catch {
      /* Teilen abgebrochen */
    }
  })

  const ueber = document.getElementById('ueber')
  document.getElementById('hilfe-knopf').addEventListener('click', () => ueber.showModal())
  ueber.addEventListener('click', ev => { if (ev.target === ueber) ueber.close() })

  // ---------- Empfehlung einreichen (per Web3Forms als E-Mail) ----------

  const formular = document.getElementById('empfehlung')
  const status = document.getElementById('empfehlung-status')
  formular.addEventListener('submit', async ev => {
    ev.preventDefault()
    const schluessel = (window.EINSTELLUNGEN || {}).web3formsSchluessel
    if (!schluessel) {
      status.textContent = 'Das Formular ist noch nicht eingerichtet. Bald geht es.'
      return
    }
    const daten = new FormData(formular)
    if (daten.get('botcheck')) return // Feld ist für Menschen unsichtbar; ausgefüllt hat es nur ein Bot
    daten.append('access_key', schluessel)
    daten.append('subject', `Empfehlung: ${daten.get('text') || daten.get('link')}`)
    daten.append('from_name', 'Lies etwas Wunderbares')
    const knopf = formular.querySelector('.senden')
    knopf.disabled = true
    status.textContent = 'Wird gesendet …'
    try {
      const antwort = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: daten })
      const ergebnis = await antwort.json()
      if (!ergebnis.success) throw new Error(ergebnis.message)
      formular.reset()
      status.textContent = 'Danke! Deine Empfehlung ist angekommen.'
    } catch {
      status.textContent = 'Das hat leider nicht geklappt. Versuch es später noch einmal.'
    } finally {
      knopf.disabled = false
    }
  })

  // ---------- Start ----------

  vermessen()
  aktiviere(0)
  document.fonts?.ready.then(() => { vermessen(); listeNachfuehren() })
  addEventListener('resize', () => { vermessen(); listeNachfuehren() })
})()
