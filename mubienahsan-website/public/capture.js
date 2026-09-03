/*!
 * mubienahsan.com — email capture widget
 * Renders (a) an inline form anywhere you put a mount point, and
 *         (b) a one-time popup, shown on a timer or on exit intent.
 *
 * Zero dependencies. Drop in with one tag:
 *
 *   <script src="/capture.js" defer
 *           data-endpoint="/api/subscribe"
 *           data-delay="20"
 *           data-accent="#1C2B4A"></script>
 *
 * Inline mount point (put this in your hero):
 *   <div data-capture-inline></div>
 *
 * Every string and colour below is overridable from those data-* attributes,
 * so copy changes never require touching this file.
 */
(function () {
  'use strict'

  var script = document.currentScript ||
    document.querySelector('script[src*="capture.js"]')
  if (!script) return

  function attr(name, fallback) {
    var v = script.getAttribute('data-' + name)
    return v === null || v === '' ? fallback : v
  }

  var CONFIG = {
    endpoint:    attr('endpoint', '/api/subscribe'),
    delay:       parseInt(attr('delay', '20'), 10) * 1000, // seconds -> ms
    exitIntent:  attr('exit-intent', 'true') !== 'false',
    popup:       attr('popup', 'true') !== 'false',
    accent:      attr('accent', '#1C2B4A'),
    heading:     attr('heading', 'The First Build — free'),
    subheading:  attr('subheading', 'Build an AI morning brief that writes itself. The real instructions, every decision behind them, and the parts I got wrong. No code required.'),
    button:      attr('button', 'Send me the guide'),
    success:     attr('success', 'Check your inbox — click the confirmation link and The First Build is on its way.'),
    placeholder: attr('placeholder', 'you@example.com'),
    consent:     attr('consent', "You'll also get new builds as I publish them. Free, always. Unsubscribe anytime.")
  }

  // ── suppression ───────────────────────────────────────────────────────────
  // The popup is a one-time ask. Once someone subscribes or dismisses it, it
  // never interrupts them again. Storage can throw (Safari private mode,
  // cookie blockers) so every access is guarded — a widget must never be the
  // reason a page breaks.
  var KEY_DONE = 'mah_subscribed'
  var KEY_SEEN = 'mah_popup_dismissed'

  function store(key, value) {
    try { localStorage.setItem(key, value || '1') } catch (e) {}
  }
  function stored(key) {
    try { return !!localStorage.getItem(key) } catch (e) { return false }
  }
  function suppressed() {
    return stored(KEY_DONE) || stored(KEY_SEEN)
  }

  var reduceMotion = false
  try {
    reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch (e) {}

  // ── styles ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('mah-capture-styles')) return
    var css = [
      '.mah-form{display:flex;flex-direction:column;gap:10px;width:100%;max-width:460px}',
      '.mah-row{display:flex;gap:8px;flex-wrap:wrap}',
      '.mah-input{flex:1 1 220px;min-width:0;padding:13px 14px;font:inherit;font-size:16px;',
      'border:1px solid #d9d2c7;border-radius:8px;background:#fff;color:#1a1a1a;}',
      '.mah-input:focus{outline:2px solid var(--mah-accent);outline-offset:1px;border-color:var(--mah-accent)}',
      '.mah-btn{padding:13px 22px;font:inherit;font-size:16px;font-weight:600;cursor:pointer;',
      'border:0;border-radius:8px;background:var(--mah-accent);color:#fff;white-space:nowrap}',
      '.mah-btn:hover:not(:disabled){filter:brightness(1.12)}',
      '.mah-btn:disabled{opacity:.6;cursor:default}',
      '.mah-note{font-size:12.5px;line-height:1.5;color:#6b6259;margin:0}',
      '.mah-msg{font-size:14.5px;line-height:1.55;margin:0}',
      '.mah-msg[data-tone="err"]{color:#b3261e}',
      '.mah-msg[data-tone="ok"]{color:#1f7a3d;font-weight:600}',
      '.mah-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}',
      // popup
      '.mah-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;',
      'justify-content:center;padding:20px;background:rgba(20,18,16,.55)}',
      '.mah-modal{position:relative;width:100%;max-width:470px;background:#fff;border-radius:14px;',
      'padding:30px 28px 26px;box-shadow:0 18px 50px rgba(0,0,0,.28);max-height:90vh;overflow:auto}',
      '.mah-title{margin:0 0 8px;font-size:23px;line-height:1.25;font-weight:700;color:#1a1a1a}',
      '.mah-sub{margin:0 0 18px;font-size:15px;line-height:1.6;color:#57504a}',
      '.mah-close{position:absolute;top:10px;right:12px;width:34px;height:34px;border:0;',
      'background:transparent;font-size:24px;line-height:1;color:#8a827a;cursor:pointer;border-radius:8px}',
      '.mah-close:hover{background:#f2eee8;color:#1a1a1a}',
      '.mah-close:focus-visible{outline:2px solid var(--mah-accent);outline-offset:2px}',
      reduceMotion ? '' : '@keyframes mah-in{from{opacity:0;transform:translateY(10px) scale(.985)}to{opacity:1;transform:none}}',
      reduceMotion ? '' : '.mah-modal{animation:mah-in .22s ease-out}',
      '@media(max-width:420px){.mah-btn,.mah-input{flex:1 1 100%}}'
    ].join('')
    var el = document.createElement('style')
    el.id = 'mah-capture-styles'
    el.textContent = ':root{--mah-accent:' + CONFIG.accent + '}' + css
    document.head.appendChild(el)
  }

  // ── form ──────────────────────────────────────────────────────────────────
  // `source` is passed straight through to Brevo as SIGNUP_SOURCE, so you can
  // see in the dashboard whether the popup or the hero form is doing the work.
  function buildForm(source, onDone) {
    var form = document.createElement('form')
    form.className = 'mah-form'
    form.noValidate = true

    var row = document.createElement('div')
    row.className = 'mah-row'

    var input = document.createElement('input')
    input.type = 'email'
    input.className = 'mah-input'
    input.placeholder = CONFIG.placeholder
    input.required = true
    input.autocomplete = 'email'
    input.setAttribute('aria-label', 'Email address')

    var btn = document.createElement('button')
    btn.type = 'submit'
    btn.className = 'mah-btn'
    btn.textContent = CONFIG.button

    // Honeypot. Hidden from people, irresistible to bots. Never autofilled
    // because autocomplete is off and it is out of the tab order.
    var hp = document.createElement('input')
    hp.type = 'text'
    hp.className = 'mah-hp'
    hp.tabIndex = -1
    hp.setAttribute('autocomplete', 'off')
    hp.setAttribute('aria-hidden', 'true')

    var msg = document.createElement('p')
    msg.className = 'mah-msg'
    msg.setAttribute('role', 'status')
    msg.setAttribute('aria-live', 'polite')

    var note = document.createElement('p')
    note.className = 'mah-note'
    note.textContent = CONFIG.consent

    row.appendChild(input)
    row.appendChild(btn)
    form.appendChild(row)
    form.appendChild(hp)
    form.appendChild(msg)
    form.appendChild(note)

    var busy = false

    form.addEventListener('submit', function (e) {
      e.preventDefault()
      if (busy) return

      var email = input.value.trim()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        msg.setAttribute('data-tone', 'err')
        msg.textContent = 'Please enter a valid email address.'
        input.focus()
        return
      }

      busy = true
      btn.disabled = true
      btn.textContent = 'Sending…'
      msg.removeAttribute('data-tone')
      msg.textContent = ''

      fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, source: source, website: hp.value })
      })
        .then(function (r) {
          return r.json().catch(function () { return {} })
        })
        .then(function (data) {
          if (!data || !data.success) throw new Error(data && data.error)
          store(KEY_DONE, email)
          row.style.display = 'none'
          note.style.display = 'none'
          msg.setAttribute('data-tone', 'ok')
          msg.textContent = CONFIG.success
          if (onDone) onDone()
        })
        .catch(function (err) {
          busy = false
          btn.disabled = false
          btn.textContent = CONFIG.button
          msg.setAttribute('data-tone', 'err')
          msg.textContent = (err && err.message) || 'Something went wrong. Please try again.'
        })
    })

    return { form: form, input: input }
  }

  // ── inline ────────────────────────────────────────────────────────────────
  function mountInline() {
    var targets = document.querySelectorAll('[data-capture-inline]')
    for (var i = 0; i < targets.length; i++) {
      if (targets[i].getAttribute('data-mah-mounted')) continue
      targets[i].setAttribute('data-mah-mounted', '1')
      targets[i].appendChild(buildForm('inline').form)
    }
    return targets.length
  }

  // ── popup ─────────────────────────────────────────────────────────────────
  var popupOpen = false

  function openPopup() {
    if (popupOpen || suppressed() || !CONFIG.popup) return
    popupOpen = true

    var lastFocused = document.activeElement

    var overlay = document.createElement('div')
    overlay.className = 'mah-overlay'

    var modal = document.createElement('div')
    modal.className = 'mah-modal'
    modal.setAttribute('role', 'dialog')
    modal.setAttribute('aria-modal', 'true')
    modal.setAttribute('aria-labelledby', 'mah-title')

    var close = document.createElement('button')
    close.className = 'mah-close'
    close.type = 'button'
    close.setAttribute('aria-label', 'Close')
    close.innerHTML = '&times;'

    var h = document.createElement('h2')
    h.className = 'mah-title'
    h.id = 'mah-title'
    h.textContent = CONFIG.heading

    var p = document.createElement('p')
    p.className = 'mah-sub'
    p.textContent = CONFIG.subheading

    var built = buildForm('popup')

    modal.appendChild(close)
    modal.appendChild(h)
    modal.appendChild(p)
    modal.appendChild(built.form)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)

    var prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function dismiss() {
      if (!popupOpen) return
      popupOpen = false
      store(KEY_SEEN)
      document.body.style.overflow = prevOverflow
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      document.removeEventListener('keydown', onKey, true)
      if (lastFocused && lastFocused.focus) lastFocused.focus()
    }

    // Focus trap. Without it, tabbing walks out of the dialog and into the page
    // behind it, which strands screen-reader and keyboard users.
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); return }
      if (e.key !== 'Tab') return
      var f = modal.querySelectorAll('button, input, a[href]')
      if (!f.length) return
      var first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    close.addEventListener('click', dismiss)
    overlay.addEventListener('mousedown', function (e) {
      if (e.target === overlay) dismiss()
    })
    document.addEventListener('keydown', onKey, true)

    setTimeout(function () { built.input.focus() }, 60)
  }

  function armPopup() {
    if (!CONFIG.popup || suppressed()) return

    if (CONFIG.delay >= 0) setTimeout(openPopup, CONFIG.delay)

    // Exit intent: pointer leaving through the top of the viewport reads as
    // "about to close the tab". Desktop only by nature - touch devices never
    // fire it, which is why the timer above is the real workhorse on mobile.
    if (CONFIG.exitIntent) {
      document.addEventListener('mouseout', function onOut(e) {
        if (e.clientY <= 0 && !e.relatedTarget) {
          document.removeEventListener('mouseout', onOut)
          openPopup()
        }
      })
    }
  }

  function init() {
    injectStyles()
    mountInline()
    armPopup()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

  // Escape hatch for a "Subscribe" link in your nav or footer:
  //   <a href="#" onclick="mahCapture.open();return false">Subscribe</a>
  window.mahCapture = { open: openPopup, mount: mountInline }
})();
