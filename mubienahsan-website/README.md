# mubienahsan.com — email capture & lead magnet delivery

A drop-in email capture system: a **popup** plus a **prominent inline form**,
both feeding a double opt-in Brevo list that delivers the lead-magnet PDF.

Built to be portable — it is plain HTML/CSS/JS and one serverless function, so
it works on a static site or inside Next.js without changes.

---

## Files

| File | What it is |
|---|---|
| `api/subscribe.js` | Serverless function. Takes an email, asks Brevo to send the confirmation email. |
| `static/capture.js` | The widget. Renders the popup **and** the inline form. No dependencies. |
| `static/thank-you.html` | Post-confirmation landing page with the download button. |
| `static/the-first-build.pdf` | The lead magnet itself. |

### Where the files go

This matters and it is easy to get wrong. The `static/` folder here is a
container, **not** the destination folder name — put its contents where your
project actually serves files from.

**If your site is a flat static project** (the layout `fable-landingpage`
uses — `index.html` at the root, no framework):

```
your-project/
  index.html
  api/subscribe.js          <- from api/
  capture.js                <- from static/
  thank-you.html            <- from static/
  the-first-build.pdf       <- from static/
  vercel.json
```

**If your site is Next.js:**

```
your-project/
  pages/api/subscribe.js    <- from api/  (or app/api/subscribe/route.js)
  public/capture.js         <- from static/
  public/thank-you.html     <- from static/
  public/the-first-build.pdf
```

Either way the files must end up served at `/capture.js`,
`/thank-you.html` and `/the-first-build.pdf`. **Load the site and open
`/capture.js` in the browser before wiring anything else up** — if that
404s, the script tag will fail silently and no form will ever appear.

---

## Why double opt-in

You're in Canada, so **CASL** applies, and it is stricter than US CAN-SPAM. It
requires express consent, sender identification including a physical mailing
address, and a working unsubscribe. Penalties are real.

So the flow is:

```
visitor submits email
   -> Brevo sends a confirmation email
      -> visitor clicks confirm
         -> added to the list  (this click is your consent record)
            -> redirected to /thank-you.html
               -> PDF available on the page AND emailed by the welcome automation
```

The contact is **not** added to your list until they confirm. That is what makes
the consent defensible, and it keeps the PDF away from typo'd and hostile
addresses. The cost is a small drop in raw signups; the benefit is a list that
actually opens your mail.

---

## Setup

### 1. Brevo — make a new list

**Do not reuse list #3.** That is Fable / ScenarioLab's waitlist. Mixing
audiences pollutes both and damages your sender reputation when people who
signed up for one mark the other as spam.

Contacts → Lists → **Create a list** → name it `mubienahsan.com — newsletter`.
Note the numeric list ID.

### 2. Brevo — authenticate the sending domain

This is the step that makes mail arrive instead of landing in spam. Senders &
IPs → Domains → add `mubienahsan.com`, then add the DKIM, SPF and DMARC records
Brevo shows you at your DNS provider. Wait for all three to verify.

You cannot skip this by sending from a Gmail address — a free-webmail `From`
fails DMARC alignment and Gmail and Yahoo's bulk-sender rules will reject or
spam-folder it.

Set the sender to **`hello@mubienahsan.com`** and forward that mailbox to your
personal inbox so you aren't managing a second one.

### 3. Brevo — the confirmation email template

Campaigns → Templates → new template, type **Double opt-in confirmation**. It
must contain the `{{ doubleoptin }}` confirmation link. Keep it to two lines:
who you are and what they'll get. Note the numeric template ID.

### 4. Brevo — the welcome automation

Automations → new → trigger *contact added to list* → action *send email*.
That email delivers the PDF **as a link, not an attachment** — attachments hurt
deliverability and get stripped by corporate filters.

### 5. Environment variables

Set these on your host (Vercel → Settings → Environment Variables). Never commit
them.

| Variable | Value |
|---|---|
| `BREVO_API_KEY` | Your Brevo v3 API key |
| `BREVO_LIST_ID` | The list ID from step 1 |
| `BREVO_DOI_TEMPLATE_ID` | The template ID from step 3 |
| `CONFIRM_REDIRECT_URL` | `https://mubienahsan.com/thank-you.html` |
| `ALLOWED_ORIGINS` | `https://mubienahsan.com,https://www.mubienahsan.com` |

### 6. The PDF

Already in place at `static/the-first-build.pdf` (409 KB, 8 pages). The
thank-you page links to it. Point the welcome automation at
`https://mubienahsan.com/the-first-build.pdf` too.

### 7. Install on the site

One tag, before `</body>`:

```html
<script src="/capture.js" defer
        data-endpoint="/api/subscribe"
        data-delay="20"
        data-accent="#1C2B4A"
        data-heading="The First Build — free"
        data-button="Send me the guide"></script>
```

And the inline form — put this high on the page, in the hero:

```html
<div data-capture-inline></div>
```

That's it. The popup arms itself; the inline form mounts itself.

---

## Configuration

Every option is a `data-` attribute on the script tag, so copy changes never
require editing JavaScript.

| Attribute | Default | Notes |
|---|---|---|
| `data-endpoint` | `/api/subscribe` | Where the form posts |
| `data-delay` | `20` | Seconds before the popup opens. `-1` disables the timer |
| `data-exit-intent` | `true` | Also open when the pointer leaves the top of the window |
| `data-popup` | `true` | `false` gives you the inline form only |
| `data-accent` | `#1C2B4A` | Button and focus-ring colour |
| `data-heading` / `data-subheading` | — | Popup copy (defaults pitch *The First Build*) |
| `data-button` / `data-placeholder` | — | Form copy |
| `data-success` | — | Shown after a successful submit |
| `data-consent` | — | The fine print under the button |

Open the popup from a nav link:

```html
<a href="#" onclick="mahCapture.open(); return false">Subscribe</a>
```

---

## Behaviour worth knowing

- **The popup asks once.** After someone subscribes or dismisses it, it never
  interrupts them again — the choice is remembered in `localStorage`.
- **Storage failures are non-fatal.** In Safari private mode or behind a cookie
  blocker, every storage call is wrapped; worst case the popup asks again.
- **The popup is accessible.** Real dialog semantics, focus moves in on open and
  returns on close, Escape closes, Tab is trapped inside, and the animation is
  dropped for anyone with reduced-motion set.
- **Bots hit a honeypot.** A hidden field they fill and people never see. When
  it's filled the endpoint returns success without doing anything — telling a bot
  it failed just invites a retry.
- **Signup source is tracked.** Each contact gets `SIGNUP_SOURCE` of `popup` or
  `inline`, so you can see in Brevo which one is actually working.
- **Existing subscribers get the same message as everyone else.** The endpoint
  never reveals whether an address is already on the list.
- **CORS is pinned** to `ALLOWED_ORIGINS`, unlike the Fable endpoint which is
  open to `*`.

---

## Before you send

- [ ] DKIM, SPF and DMARC all verified in Brevo
- [ ] Physical mailing address in the email footer — **required by CASL**
- [ ] Working unsubscribe link in every send
- [ ] Test the full loop with a real address: submit → confirm → redirect → PDF
- [ ] Confirm the PDF link works from the email, not just the thank-you page

---

## Standing constraints

Per the approval terms for this project:

- No employer resources are used here, and nothing in this stack touches them.
- **No employer is named** anywhere on the site, in the sender identity, in the
  welcome email, or in the footer. This is deliberate — do not add a
  "views are my own" line either, since that implies the association it disclaims.
- No client referrals in either direction.
- **Approval requires annual renewal.** Next review: **September 2027.**
