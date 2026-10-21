// Lies etwas Wunderbares — eine Karte pro Text, der Hintergrund folgt den Farben des Textes.
// Funktionsweise nach readsomethingwonderful.com, siehe ../analyse/ANALYSE_rsw.md.

(() => {
  const eintraege = window.EINTRAEGE || []
  const karten = document.getElementById('karten')
  const info = document.getElementById('info')
  const hg = [document.getElementById('hg1'), document.getElementById('hg2')]
  const hinweis = document.getElementById('hinweis')

  const SCHWARZ = 'var(--schwarz)'
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

  // ---------- Aufbau ----------

  eintraege.forEach((e, i) => {
    e.slug = kurzname(e)

    const karte = document.createElement('section')
    karte.className = 'karte'
    karte.dataset.idx = i
    karte.id = e.slug
    karte.innerHTML = `
      <div class="kopf">
        <h2 class="titel">${text(e.titel)}</h2>
        <p class="autor">${text(zeile(e))}</p>
      </div>
      <a href="${text(e.url)}" target="_blank" rel="noopener" aria-label="${text(e.titel)} von ${text(e.autor)} lesen">
        <img src="${text(e.bild)}" alt="Seite: ${text(e.titel)}" width="1158" height="1428"
             ${i < 2 ? '' : 'loading="lazy"'} decoding="async">
      </a>`
    karten.append(karte)

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

  const aktiviere = i => {
    if (i === aktiv) return
    aktiv = i
    const e = eintraege[i]
    setzeHintergrund(e)
    info.querySelectorAll('.eintrag').forEach(el => el.classList.toggle('aktiv', Number(el.dataset.idx) === i))
    document.title = `${e.titel} – Lies etwas Wunderbares`
    history.replaceState(null, '', `#${e.slug}`)
  }

  // Wie im Original: erst wenn eine Karte zu 95 % sichtbar ist, nach 100 ms Ruhe.
  let warte
  const beobachter = new IntersectionObserver(
    eintraege_ => {
      eintraege_.forEach(b => {
        if (b.isIntersecting) {
          clearTimeout(warte)
          warte = setTimeout(() => aktiviere(Number(b.target.dataset.idx)), 100)
        }
      })
    },
    { threshold: 0.95 },
  )

  // Karte wächst leicht, je mehr von ihr zu sehen ist.
  const groesse = new IntersectionObserver(
    eintraege_ => eintraege_.forEach(b => b.target.style.setProperty('--sichtbar', b.intersectionRatio.toFixed(3))),
    { threshold: Array.from({ length: 21 }, (_, n) => n / 20) },
  )

  karten.querySelectorAll('.karte').forEach(k => {
    beobachter.observe(k)
    groesse.observe(k.querySelector('img'))
  })

  // ---------- Bedienung ----------

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

  // ---------- Start ----------

  const ziel = decodeURIComponent(location.hash.slice(1))
  const start = Math.max(0, eintraege.findIndex(e => e.slug === ziel))
  if (eintraege.length) {
    aktiviere(start)
    if (start > 0) document.getElementById(eintraege[start].slug).scrollIntoView({ behavior: 'instant', block: 'start' })
  }
})()
