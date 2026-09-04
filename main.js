/* ==========================================================================
   Smoke & Chill — main.js
   Vanilla JS, no build step. Sections:
     0. CONFIG & PRICING (edit here)
     1. Utilities
     2. Theme toggle
     3. Header / nav / scroll effects
     4. Scroll reveal & counters
     5. Quiz calculator
     6. Lead form (validation, phone mask, submit)
     7. Telegram delivery — STUB (see sendLead)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     0. CONFIG & PRICING — единственное место, которое нужно править
     ------------------------------------------------------------------ */
  const CONFIG = {
    brand: 'Smoke & Chill',
    currency: 'BYN',
    telegramUser: 'smokeandchill',      // используется в ссылках-фолбэках
    phoneDisplay: '+375 (29) 000-00-00',

    // Отправка заявки. Пока используется заглушка (mode: 'stub').
    // Когда будете готовы подключить Telegram — см. функцию sendLead() ниже.
    lead: {
      mode: 'stub',                     // 'stub' | 'telegram'
      throttleMs: 30 * 1000,            // защита от повторных отправок
    },
  };

  const PRICING = {
    // Цена за один кальян на всё мероприятие (табак + уголь + мундштуки), BYN
    tiers: {
      standard:  { label: 'Standard',  perHookah: 45 },
      premium:   { label: 'Premium',   perHookah: 60 },
      exclusive: { label: 'Exclusive', perHookah: 80 },
    },
    // Работа кальянщика
    master: {
      ratePerHour: 35,        // BYN / час за одного мастера
      minHours: 3,
      hookahsPerMaster: 8,    // один мастер обслуживает до 8 кальянов
    },
    // Коэффициент за формат мероприятия
    formats: {
      birthday:  { label: 'День рождения', factor: 1.0 },
      wedding:   { label: 'Свадьба',       factor: 1.15 },
      corporate: { label: 'Корпоратив',    factor: 1.10 },
      party:     { label: 'Вечеринка',     factor: 1.0 },
      private:   { label: 'Частный вечер', factor: 1.0 },
    },
    // Доп. услуги
    extras: {
      fruit:     { label: 'Фруктовые чаши',    type: 'perHookah', price: 25 },
      lounge:    { label: 'Lounge-зона',       type: 'flat',      price: 150 },
      dresscode: { label: 'Мастер в дресс-коде', type: 'perMaster', price: 40 },
      outcity:   { label: 'Выезд за Минск',    type: 'flat',      price: 60 },
    },
    guestsPerHookah: 5,   // рекомендация для авторасчёта
    roundTo: 5,           // округление итога, BYN
    rangeSpread: 0.15,    // верхняя граница диапазона: +15%
  };

  /* ------------------------------------------------------------------
     1. Utilities
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtMoney = (n) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + '\u00A0' + CONFIG.currency;

  const roundTo = (n, step) => Math.round(n / step) * step;

  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let toastTimer;
  function showToast(text, ms = 3200) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), ms);
  }

  /* ------------------------------------------------------------------
     2. Theme
     ------------------------------------------------------------------ */
  function initTheme() {
    const root = document.documentElement;
    const btn = $('#themeToggle');
    const stored = localStorage.getItem('theme');
    const systemLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    // Тёмная по умолчанию; светлая — только если пользователь сам выбрал или у него системная светлая
    const initial = stored || (systemLight ? 'light' : 'dark');
    apply(initial);

    btn && btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      apply(next);
      localStorage.setItem('theme', next);
    });

    function apply(theme) {
      root.setAttribute('data-theme', theme);
      const meta = $('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0e0e11' : '#faf8f4');
    }
  }

  /* ------------------------------------------------------------------
     3. Header, burger, active nav, to-top
     ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#header');
    const burger = $('#burger');
    const nav = $('#nav');
    const toTop = $('#toTop');

    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 10);
      toTop && toTop.classList.toggle('is-visible', y > 600);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    toTop && toTop.addEventListener('click', () =>
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));

    // burger
    const closeNav = () => {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
      document.body.style.overflow = '';
    };
    burger.addEventListener('click', () => {
      const open = !nav.classList.contains('is-open');
      nav.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    $$('.nav__link', nav).forEach((a) => a.addEventListener('click', closeNav));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNav(); });
    document.addEventListener('click', (e) => {
      if (nav.classList.contains('is-open') && !nav.contains(e.target) && !burger.contains(e.target)) closeNav();
    });

    // active link highlighting
    const links = $$('.nav__link');
    const sections = links
      .map((a) => $(a.getAttribute('href')))
      .filter(Boolean);
    if ('IntersectionObserver' in window && sections.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return;
          links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
        });
      }, { rootMargin: '-40% 0px -55% 0px' });
      sections.forEach((s) => io.observe(s));
    }
  }

  /* ------------------------------------------------------------------
     4. Scroll reveal + counters
     ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
      runCounters();
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    items.forEach((el) => io.observe(el));

    // counters in hero
    const stats = $('.hero__stats');
    if (stats) {
      const cio = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) { runCounters(); cio.disconnect(); }
      }, { threshold: 0.4 });
      cio.observe(stats);
    }
  }

  function runCounters() {
    $$('[data-counter]').forEach((el) => {
      const target = parseFloat(el.dataset.counter);
      const decimals = parseInt(el.dataset.decimals || '0', 10);
      const suffix = el.dataset.suffix || '';
      if (prefersReducedMotion) { el.textContent = target.toFixed(decimals) + suffix; return; }
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------
     5. Quiz calculator
     ------------------------------------------------------------------ */
  const quizState = {
    step: 1,
    total: 5,
    result: null, // last computed estimate (object)
  };

  function readQuizForm() {
    const fmt = ($('input[name="format"]:checked') || {}).value || 'birthday';
    const tier = ($('input[name="tier"]:checked') || {}).value || 'standard';
    const guests = parseInt($('#guests').value, 10);
    const hookahs = parseInt($('#hookahs').value, 10);
    const hours = parseInt($('#hours').value, 10);
    const extras = $$('input[name="extras"]:checked').map((i) => i.value);
    return { format: fmt, tier, guests, hookahs, hours, extras };
  }

  function calculate(data) {
    const tier = PRICING.tiers[data.tier];
    const format = PRICING.formats[data.format];
    const hours = Math.max(PRICING.master.minHours, data.hours);
    const masters = Math.max(1, Math.ceil(data.hookahs / PRICING.master.hookahsPerMaster));

    const hookahCost = tier.perHookah * data.hookahs;
    const masterCost = PRICING.master.ratePerHour * hours * masters;

    let extrasCost = 0;
    const extrasBreakdown = [];
    data.extras.forEach((key) => {
      const ex = PRICING.extras[key];
      if (!ex) return;
      let cost = 0;
      if (ex.type === 'perHookah') cost = ex.price * data.hookahs;
      else if (ex.type === 'perMaster') cost = ex.price * masters;
      else cost = ex.price;
      extrasCost += cost;
      extrasBreakdown.push({ key, label: ex.label, cost });
    });

    const subtotal = (hookahCost + masterCost) * format.factor + extrasCost;
    const min = roundTo(subtotal, PRICING.roundTo);
    const max = roundTo(subtotal * (1 + PRICING.rangeSpread), PRICING.roundTo);

    return {
      ...data,
      hours,
      masters,
      tierLabel: tier.label,
      formatLabel: format.label,
      hookahCost,
      masterCost,
      extrasBreakdown,
      extrasCost,
      min,
      max,
    };
  }

  function initQuiz() {
    const quiz = $('#quiz');
    if (!quiz) return;

    const steps = $$('.quiz__step', quiz);
    const prevBtn = $('#quizPrev');
    const nextBtn = $('#quizNext');
    const nav = $('#quizNav');
    const progress = $('#quizProgress');
    const stepNum = $('#quizStepNum');
    const livePrice = $('#quizLivePrice');
    const guests = $('#guests');
    const hookahs = $('#hookahs');
    const hours = $('#hours');
    let hookahsTouched = false;

    $('#quizStepTotal').textContent = String(quizState.total);

    // fill prices in markup
    Object.entries(PRICING.tiers).forEach(([key, t]) => {
      $$(`[data-tier-price="${key}"]`).forEach((el) => (el.textContent = `${t.perHookah} ${CONFIG.currency} / кальян`));
      $$(`[data-tier-price-raw="${key}"]`).forEach((el) => (el.textContent = `${t.perHookah} ${CONFIG.currency}`));
    });
    Object.entries(PRICING.extras).forEach(([key, ex]) => {
      const unit = ex.type === 'perHookah' ? ' / кальян' : ex.type === 'perMaster' ? ' / мастер' : '';
      $$(`[data-extra-price="${key}"]`).forEach((el) => (el.textContent = `+${ex.price} ${CONFIG.currency}${unit}`));
    });
    $$('[data-master-rate]').forEach((el) => (el.textContent = `${PRICING.master.ratePerHour} ${CONFIG.currency}`));

    // range visuals
    const paintRange = (input) => {
      const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
      input.style.setProperty('--pct', pct + '%');
    };
    const updateOutputs = () => {
      $('#guestsOut').textContent = guests.value;
      $('#hookahsOut').textContent = hookahs.value;
      $('#hoursOut').textContent = `${hours.value} ч`;
      [guests, hookahs, hours].forEach(paintRange);
    };

    guests.addEventListener('input', () => {
      if (!hookahsTouched) {
        const rec = Math.max(1, Math.round(guests.value / PRICING.guestsPerHookah));
        hookahs.value = Math.min(parseInt(hookahs.max, 10), rec);
      }
      updateOutputs(); updateLive();
    });
    hookahs.addEventListener('input', () => { hookahsTouched = true; updateOutputs(); updateLive(); });
    hours.addEventListener('input', () => { updateOutputs(); updateLive(); });
    $$('input[name="format"], input[name="tier"], input[name="extras"]', quiz)
      .forEach((i) => i.addEventListener('change', updateLive));

    function updateLive() {
      const r = calculate(readQuizForm());
      livePrice.textContent = `от ${fmtMoney(r.min)}`;
    }

    function render() {
      steps.forEach((s) => s.classList.toggle('is-active', s.dataset.step === String(quizState.step)));
      const isResult = quizState.step === 'result';
      nav.style.display = isResult ? 'none' : '';
      if (!isResult) {
        stepNum.textContent = String(quizState.step);
        progress.style.width = (quizState.step / quizState.total) * 100 + '%';
        prevBtn.disabled = quizState.step === 1;
        const last = quizState.step === quizState.total;
        nextBtn.innerHTML = last
          ? 'Рассчитать <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'
          : 'Далее <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
      } else {
        progress.style.width = '100%';
        stepNum.textContent = String(quizState.total);
      }
    }

    function showResult() {
      const r = calculate(readQuizForm());
      quizState.result = r;
      $('#resultPrice').textContent = `${fmtMoney(r.min)} – ${fmtMoney(r.max)}`;

      const rows = [
        ['Формат', r.formatLabel],
        ['Гостей', String(r.guests)],
        ['Кальянов', `${r.hookahs} × ${PRICING.tiers[r.tier].perHookah} ${CONFIG.currency}`],
        ['Табак', r.tierLabel],
        ['Кальянщик', `${r.masters} ${plural(r.masters, 'мастер', 'мастера', 'мастеров')} · ${r.hours} ч`],
      ];
      if (r.extrasBreakdown.length) {
        rows.push(['Доп. услуги', r.extrasBreakdown.map((e) => e.label).join(', ')]);
      }
      $('#resultSummary').innerHTML = rows
        .map(([k, v]) => `<li><span>${escapeHtml(k)}</span><span>${escapeHtml(v)}</span></li>`)
        .join('');

      // sync into lead form
      const calcBox = $('#formCalcSummary');
      const calcVal = $('#formCalcValue');
      if (calcBox && calcVal) {
        calcVal.textContent = `${fmtMoney(r.min)} – ${fmtMoney(r.max)}`;
        calcBox.hidden = false;
      }

      quizState.step = 'result';
      render();
    }

    nextBtn.addEventListener('click', () => {
      if (quizState.step === quizState.total) { showResult(); return; }
      quizState.step += 1;
      render();
    });
    prevBtn.addEventListener('click', () => {
      if (quizState.step > 1) { quizState.step -= 1; render(); }
    });
    $('#quizRestart').addEventListener('click', () => {
      quizState.step = 1;
      render();
      quiz.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    });
    $('#resultToForm').addEventListener('click', () => {
      setTimeout(() => { const n = $('#name'); n && n.focus({ preventScroll: true }); }, 700);
    });

    // keyboard: Enter on quiz advances (except inside inputs that need it)
    quiz.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && quizState.step !== 'result' && e.target.tagName !== 'BUTTON') {
        e.preventDefault();
        nextBtn.click();
      }
    });

    updateOutputs();
    updateLive();
    render();
  }

  /* ------------------------------------------------------------------
     6. Lead form
     ------------------------------------------------------------------ */
  function initForm() {
    const form = $('#leadForm');
    if (!form) return;

    const nameEl = $('#name');
    const phoneEl = $('#phone');
    const consentEl = $('#consent');
    const submitBtn = $('#submitBtn');
    const status = $('#formStatus');
    const dateEl = $('#date');

    // date: not in the past
    if (dateEl) dateEl.min = new Date().toISOString().slice(0, 10);

    // phone mask: +375 (XX) XXX-XX-XX
    phoneEl.addEventListener('input', onPhoneInput);
    phoneEl.addEventListener('focus', () => { if (!phoneEl.value) phoneEl.value = '+375 ('; });
    phoneEl.addEventListener('blur', () => { if (phoneEl.value === '+375 (') phoneEl.value = ''; });

    function onPhoneInput(e) {
      const input = e.target;
      let digits = input.value.replace(/\D/g, '');
      if (digits.startsWith('375')) digits = digits.slice(3);
      else if (digits.startsWith('80')) digits = digits.slice(2);
      digits = digits.slice(0, 9);
      let out = '+375 (';
      if (digits.length > 0) out += digits.slice(0, 2);
      if (digits.length >= 2) out += ') ';
      if (digits.length > 2) out += digits.slice(2, 5);
      if (digits.length > 5) out += '-' + digits.slice(5, 7);
      if (digits.length > 7) out += '-' + digits.slice(7, 9);
      input.value = out;
    }

    const isPhoneValid = (v) => v.replace(/\D/g, '').length === 12; // 375 + 9 digits

    const setError = (field, msg) => {
      const wrap = field.closest('.field') || field.closest('.checkbox');
      const err = $(`[data-error-for="${field.id}"]`);
      if (wrap) wrap.classList.toggle('is-invalid', Boolean(msg));
      if (err) err.textContent = msg || '';
      if (msg) field.setAttribute('aria-invalid', 'true'); else field.removeAttribute('aria-invalid');
    };

    [nameEl, phoneEl].forEach((el) => el.addEventListener('input', () => setError(el, '')));
    consentEl.addEventListener('change', () => setError(consentEl, ''));

    function validate() {
      let ok = true;
      if (nameEl.value.trim().length < 2) { setError(nameEl, 'Введите имя (минимум 2 символа)'); ok = false; }
      if (!isPhoneValid(phoneEl.value)) { setError(phoneEl, 'Введите корректный номер: +375 (XX) XXX-XX-XX'); ok = false; }
      if (!consentEl.checked) { setError(consentEl, 'Нужно согласие на обработку данных'); ok = false; }
      return ok;
    }

    function setStatus(type, html) {
      status.className = 'form__status' + (type ? ` is-${type}` : '');
      status.innerHTML = html || '';
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', '');

      // honeypot
      if (form.elements.website && form.elements.website.value) {
        setStatus('success', 'Спасибо! Заявка принята.');
        return;
      }

      if (!validate()) {
        const firstInvalid = $('.is-invalid input', form);
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      // throttle
      const last = parseInt(localStorage.getItem('leadSentAt') || '0', 10);
      if (Date.now() - last < CONFIG.lead.throttleMs) {
        setStatus('error', 'Вы уже отправили заявку. Подождите немного перед повторной отправкой.');
        return;
      }

      const payload = collectPayload();
      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;

      try {
        await sendLead(payload);
        localStorage.setItem('leadSentAt', String(Date.now()));
        setStatus('success', 'Заявка отправлена! Мы свяжемся с вами в течение 15 минут.');
        showToast('Заявка принята — скоро свяжемся!');
        form.reset();
        const calcBox = $('#formCalcSummary');
        if (calcBox && !quizState.result) calcBox.hidden = true;
      } catch (err) {
        console.error('[lead] send failed:', err);
        setStatus('error',
          `Не удалось отправить заявку. Напишите нам напрямую: <a href="https://t.me/${CONFIG.telegramUser}" target="_blank" rel="noopener">@${CONFIG.telegramUser}</a> или позвоните ${escapeHtml(CONFIG.phoneDisplay)}.`);
      } finally {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }
    });

    function collectPayload() {
      const fd = new FormData(form);
      return {
        name: String(fd.get('name') || '').trim(),
        phone: String(fd.get('phone') || '').trim(),
        date: String(fd.get('date') || ''),
        messenger: String(fd.get('messenger') || ''),
        comment: String(fd.get('comment') || '').trim(),
        calc: quizState.result,           // may be null if quiz not completed
        page: location.href,
        sentAt: new Date().toISOString(),
      };
    }
  }

  /* ------------------------------------------------------------------
     7. Lead delivery
     ------------------------------------------------------------------
     formatLeadMessage() уже собирает готовый текст для Telegram (HTML-разметка).
     sendLead() сейчас — ЗАГЛУШКА: логирует сообщение в консоль и имитирует
     сетевую задержку. Для реальной интеграции:

       1) Установите CONFIG.lead.mode = 'telegram'
       2) Реализуйте ветку 'telegram' ниже (fetch на ваш прокси или Bot API)

     ВАЖНО: не размещайте токен бота в этом файле на публичном хостинге —
     используйте прокси (Cloudflare Worker / Google Apps Script / serverless).
     ------------------------------------------------------------------ */
  function formatLeadMessage(p) {
    const lines = [];
    lines.push(`<b>🔥 Новая заявка — ${escapeHtml(CONFIG.brand)}</b>`);
    lines.push('');
    lines.push(`👤 <b>Имя:</b> ${escapeHtml(p.name)}`);
    lines.push(`📞 <b>Телефон:</b> ${escapeHtml(p.phone)}`);
    lines.push(`💬 <b>Связь:</b> ${escapeHtml(messengerLabel(p.messenger))}`);
    if (p.date) lines.push(`📅 <b>Дата:</b> ${escapeHtml(formatDate(p.date))}`);
    if (p.comment) lines.push(`📝 <b>Комментарий:</b> ${escapeHtml(p.comment)}`);

    if (p.calc) {
      const c = p.calc;
      lines.push('');
      lines.push('<b>🧮 Расчёт с сайта</b>');
      lines.push(`• Формат: ${escapeHtml(c.formatLabel)}`);
      lines.push(`• Гостей: ${c.guests}`);
      lines.push(`• Кальянов: ${c.hookahs} (${escapeHtml(c.tierLabel)})`);
      lines.push(`• Мастеров: ${c.masters} × ${c.hours} ч`);
      if (c.extrasBreakdown.length) {
        lines.push(`• Доп.: ${c.extrasBreakdown.map((e) => escapeHtml(e.label)).join(', ')}`);
      }
      lines.push(`• <b>Итого: ${fmtMoney(c.min)} – ${fmtMoney(c.max)}</b>`);
    }

    lines.push('');
    lines.push(`<i>${escapeHtml(p.page)}</i>`);
    return lines.join('\n');
  }

  function messengerLabel(v) {
    return { call: 'Позвонить', telegram: 'Telegram', viber: 'Viber', whatsapp: 'WhatsApp' }[v] || v;
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  async function sendLead(payload) {
    const text = formatLeadMessage(payload);

    if (CONFIG.lead.mode === 'telegram') {
      // TODO: интеграция с Telegram.
      // Пример вызова через прокси (рекомендуется):
      //
      //   const res = await fetch('https://your-worker.example.workers.dev/lead', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ text, parse_mode: 'HTML' }),
      //   });
      //   if (!res.ok) throw new Error('Proxy responded ' + res.status);
      //   return res.json();
      //
      throw new Error('Telegram delivery is not configured yet');
    }

    // ---- STUB ----
    // eslint-disable-next-line no-console
    console.info('[lead][stub] message that would be sent to Telegram:\n' + text);
    await new Promise((r) => setTimeout(r, 900)); // имитация сети
    return { ok: true, stub: true };
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHeader();
    initReveal();
    initQuiz();
    initForm();
    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  });
})();
