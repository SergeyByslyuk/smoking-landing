/* ==========================================================================
   Smoke Craft — main.js
   Ванильный JS, без сборщиков. Разделы:
     0. CONFIG и PRICING — единственное место для правок цен и контактов
     1. Утилиты
     2. Header / меню / sticky
     3. Показ блоков при скролле
     4. Маска и валидация телефона
     5. Квиз-калькулятор (4 шага)
     6. Цены в тарифах
     7. Формы заявки
     8. Отправка в Telegram (заглушка + инструкция по прокси)
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     0a. CONFIG — контакты и режим отправки
     ------------------------------------------------------------------ */
  const CONFIG = {
    brand: 'Smoke Craft',
    currency: 'BYN',
    phoneDisplay: '+375 (29) 000-00-00',
    telegramUser: 'smokecraft',
    whatsappNumber: '375290000000',

    lead: {
      // 'stub' — заявка логируется в консоль (для разработки).
      // 'proxy' — POST на ваш прокси (Cloudflare Worker / Apps Script и т.п.).
      //           Токен бота хранится на прокси, а не в этом файле.
      mode: 'stub',
      proxyUrl: '',      // например: 'https://smokecraft-lead.workers.dev'
      throttleMs: 30000, // защита от повторных отправок
    },
  };

  /* ------------------------------------------------------------------
     0b. PRICING — цены и правила расчёта (гибрид «кальян × час»)
     ------------------------------------------------------------------ */
  const PRICING = {
    master: {
      ratePerHour: 100,     // BYN / час за одного мастера — «от 100 руб/час»
      hookahsPerMaster: 8,  // один мастер обслуживает до 8 кальянов
      minHours: 2,
    },
    hookahHourRate: 15,     // BYN за кальян за час (табак, уголь, мундштуки)
    roundTo: 5,             // округление итога, BYN
    rangeSpread: 0.15,      // верхняя граница диапазона: +15%

    formats: {
      wedding:   { label: 'Свадьба',         factor: 1.15 },
      corporate: { label: 'Корпоратив',      factor: 1.10 },
      birthday:  { label: 'День рождения',   factor: 1.0 },
      private:   { label: 'Частный вечер',   factor: 1.0 },
    },

    // Готовые пакеты для блока «Тарифы»
    plans: {
      light:    { hookahs: 3,  hours: 2, masters: 1 },
      standard: { hookahs: 6,  hours: 4, masters: 2 },
      vip:      { hookahs: 10, hours: 6, masters: 3 },
    },
  };

  /* ------------------------------------------------------------------
     1. Утилиты
     ------------------------------------------------------------------ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const fmtMoney = (n) =>
    new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n) + '\u00A0' + CONFIG.currency;

  const roundTo = (n, step) => Math.round(n / step) * step;
  const clamp = (n, min, max) => Math.min(Math.max(n, min), max);

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

  function smoothScrollTo(el) {
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  /* ------------------------------------------------------------------
     2. Header / меню
     ------------------------------------------------------------------ */
  function initHeader() {
    const header = $('#header');
    const burger = $('#burger');
    const nav = $('#nav');

    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const closeNav = () => {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Открыть меню');
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

    // Подсветка активного пункта меню
    const links = $$('.nav__link');
    const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
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
     3. Показ при скролле
     ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('.reveal');
    if (!('IntersectionObserver' in window) || prefersReducedMotion) {
      items.forEach((el) => el.classList.add('is-visible'));
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
  }

  /* ------------------------------------------------------------------
     4. Маска и валидация телефона (+375 (XX) XXX-XX-XX)
     ------------------------------------------------------------------ */
  const PHONE_DIGITS = 9;

  function formatPhone(raw) {
    if (!raw.replace(/\D/g, '')) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.startsWith('375')) digits = digits.slice(3);
    else if (digits.startsWith('80')) digits = digits.slice(2);
    digits = digits.slice(0, PHONE_DIGITS);

    let out = '+375';
    if (digits.length) out += ' (' + digits.slice(0, 2);
    if (digits.length >= 2) out += ')';
    if (digits.length > 2) out += ' ' + digits.slice(2, 5);
    if (digits.length > 5) out += '-' + digits.slice(5, 7);
    if (digits.length > 7) out += '-' + digits.slice(7, 9);
    return out;
  }

  const isPhoneValid = (value) => {
    let digits = String(value).replace(/\D/g, '');
    if (digits.startsWith('375')) digits = digits.slice(3);
    if (digits.startsWith('80')) digits = digits.slice(2);
    return digits.length === PHONE_DIGITS;
  };

  function attachPhoneMask(input) {
    if (!input) return;
    const apply = () => {
      const atEnd = input.selectionStart === input.value.length;
      input.value = formatPhone(input.value);
      if (atEnd) input.setSelectionRange(input.value.length, input.value.length);
    };
    input.addEventListener('input', apply);
    input.addEventListener('focus', () => { if (!input.value) input.value = '+375 '; });
    input.addEventListener('blur', () => { if (!/\d/.test(input.value.replace('375', ''))) input.value = ''; });
  }

  function setFieldError(key, message) {
    const box = $(`[data-error-for="${key}"]`);
    if (box) box.textContent = message || '';
    const field = box && box.closest('.field');
    if (field) field.classList.toggle('is-invalid', Boolean(message));
  }

  /* ------------------------------------------------------------------
     5. Квиз-калькулятор
     ------------------------------------------------------------------ */
  const quizState = { step: 1, total: 4, format: 'birthday', hookahs: 4, hours: 4, result: null };

  function calcEstimate(formatKey, hookahs, hours) {
    const p = PRICING;
    const masters = Math.max(1, Math.ceil(hookahs / p.master.hookahsPerMaster));
    const h = Math.max(hours, p.master.minHours);
    const base = masters * h * p.master.ratePerHour + hookahs * h * p.hookahHourRate;
    const factor = (p.formats[formatKey] || { factor: 1 }).factor;
    const total = roundTo(base * factor, p.roundTo);
    const max = roundTo(total * (1 + p.rangeSpread), p.roundTo);
    return { masters, hours: h, min: total, max };
  }

  function currentEstimate() {
    return calcEstimate(quizState.format, quizState.hookahs, quizState.hours);
  }

  function updateLivePrice() {
    const out = $('#quizLivePrice');
    if (!out) return;
    const { min } = currentEstimate();
    out.textContent = 'от ' + fmtMoney(min);
  }

  function renderQuizStep() {
    const isResult = quizState.step === 'result';
    $$('#quiz .quiz__step').forEach((el) => {
      el.classList.toggle('is-active', String(el.dataset.step) === String(quizState.step));
    });

    const progress = $('#quizProgress');
    if (progress) {
      const pct = isResult ? 100 : (quizState.step / quizState.total) * 100;
      progress.style.width = pct + '%';
    }
    const stepNum = $('#quizStepNum');
    if (stepNum) stepNum.textContent = isResult ? quizState.total : quizState.step;

    const nav = $('#quizNav');
    if (nav) nav.style.display = isResult ? 'none' : 'flex';

    $('#quizPrev').disabled = quizState.step === 1;
    $('#quizNextText').textContent = quizState.step === quizState.total ? 'Получить расчёт' : 'Далее';

    if (!isResult) updateLivePrice();
  }

  function readQuizInputs() {
    const format = $('input[name="format"]:checked', $('#quiz'));
    if (format) quizState.format = format.value;
    const hookahs = $('#hookahs');
    const hours = $('#hours');
    if (hookahs) quizState.hookahs = Number(hookahs.value);
    if (hours) quizState.hours = Number(hours.value);
  }

  function validateQuizStep() {
    if (quizState.step !== quizState.total) return true;
    let ok = true;
    const phone = $('#qPhone');
    const consent = $('#qConsent');
    if (!isPhoneValid(phone.value)) { setFieldError('qPhone', 'Введите номер в формате +375 (XX) XXX-XX-XX'); ok = false; }
    else setFieldError('qPhone', '');
    if (!consent.checked) { setFieldError('qConsent', 'Нужно согласие на обработку данных'); ok = false; }
    else setFieldError('qConsent', '');
    return ok;
  }

  function showQuizResult() {
    const est = currentEstimate();
    const fmt = PRICING.formats[quizState.format] || { label: 'Мероприятие' };
    const displayPrice = $('#resultPrice');
    if (displayPrice) displayPrice.textContent = fmtMoney(est.min) + ' – ' + fmtMoney(est.max);

    const summary = $('#resultSummary');
    if (summary) {
      summary.innerHTML = [
        `<li><b>Мероприятие:</b> ${escapeHtml(fmt.label)}</li>`,
        `<li><b>Кальяны:</b> ${quizState.hookahs}</li>`,
        `<li><b>Мастера:</b> ${est.masters} × ${est.hours} ч</li>`,
        `<li><b>Услуга:</b> работа мастера от ${PRICING.master.ratePerHour} BYN/час + сервис ${PRICING.hookahHourRate} BYN/кальян·час</li>`,
      ].join('');
    }

    quizState.result = {
      format: quizState.format,
      formatLabel: fmt.label,
      hookahs: quizState.hookahs,
      hours: est.hours,
      masters: est.masters,
      min: est.min,
      max: est.max,
    };
  }

  function initQuiz() {
    const hookahs = $('#hookahs');
    const hours = $('#hours');
    const hookahsOut = $('#hookahsOut');
    const hoursOut = $('#hoursOut');

    const sync = () => {
      readQuizInputs();
      if (hookahsOut) hookahsOut.textContent = hookahs.value;
      if (hoursOut) hoursOut.textContent = hours.value + ' ч';
      updateLivePrice();
    };
    hookahs && hookahs.addEventListener('input', sync);
    hours && hours.addEventListener('input', sync);
    $$('#quiz input[name="format"]').forEach((r) => r.addEventListener('change', () => { readQuizInputs(); updateLivePrice(); }));

    attachPhoneMask($('#qPhone'));

    $('#quizNext').addEventListener('click', () => {
      readQuizInputs();
      if (!validateQuizStep()) return;
      if (quizState.step === quizState.total) { submitQuiz(); return; }
      quizState.step += 1;
      renderQuizStep();
    });

    $('#quizPrev').addEventListener('click', () => {
      if (typeof quizState.step === 'number' && quizState.step > 1) {
        quizState.step -= 1;
        renderQuizStep();
      }
    });

    $('#quizRestart').addEventListener('click', () => {
      quizState.step = 1;
      quizState.result = null;
      renderQuizStep();
    });

    sync();
    renderQuizStep();
  }

  async function submitQuiz() {
    const btn = $('#quizNext');
    const payload = {
      source: 'quiz',
      name: ($('#qName').value || '').trim(),
      phone: $('#qPhone').value,
      messenger: $('#qMessenger').value,
      format: quizState.format,
      formatLabel: (PRICING.formats[quizState.format] || {}).label,
      hookahs: quizState.hookahs,
      hours: quizState.hours,
      estimate: Object.assign(currentEstimate(), {
        formatLabel: (PRICING.formats[quizState.format] || {}).label,
        hookahs: quizState.hookahs,
      }),
      page: location.href,
      sentAt: new Date().toISOString(),
    };

    btn.disabled = true;
    const prevText = $('#quizNextText').textContent;
    $('#quizNextText').textContent = 'Считаем…';
    try {
      await sendLead(payload);
      showQuizResult();
      quizState.step = 'result';
      renderQuizStep();
      showToast('Расчёт готов! Скоро свяжемся.');
    } catch (err) {
      console.error('[lead] send failed:', err);
      showToast('Не удалось отправить. Напишите в Telegram.');
    } finally {
      btn.disabled = false;
      $('#quizNextText').textContent = prevText;
    }
  }

  /* ------------------------------------------------------------------
     6. Цены в тарифах
     ------------------------------------------------------------------ */
  function initPlanPrices() {
    Object.keys(PRICING.plans).forEach((key) => {
      const el = $(`[data-plan-price="${key}"]`);
      if (!el) return;
      const plan = PRICING.plans[key];
      const price = plan.masters * plan.hours * PRICING.master.ratePerHour
        + plan.hookahs * plan.hours * PRICING.hookahHourRate;
      el.textContent = 'от ' + fmtMoney(roundTo(price, PRICING.roundTo));
    });
  }

  /* ------------------------------------------------------------------
     7. Формы
     ------------------------------------------------------------------ */
  function initHeroForm() {
    const form = $('#heroForm');
    if (!form) return;
    const input = $('#heroPhone');
    attachPhoneMask(input);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!isPhoneValid(input.value)) {
        setFieldError('heroPhone', 'Введите корректный номер телефона');
        input.focus();
        return;
      }
      setFieldError('heroPhone', '');
      const quizPhone = $('#qPhone');
      if (quizPhone) quizPhone.value = input.value;
      showToast('Телефон сохранён. Ответьте на 3 вопроса ниже.');
      smoothScrollTo($('#calculator'));
    });
  }

  function initLeadForm() {
    const form = $('#leadForm');
    if (!form) return;
    const submitBtn = $('#submitBtn');
    const status = $('#formStatus');
    attachPhoneMask($('#phone'));

    const setStatus = (type, html) => {
      if (!status) return;
      status.className = 'form__status' + (type ? ' is-' + type : '');
      status.innerHTML = html || '';
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      setStatus('', '');

      const name = $('#name').value.trim();
      const phone = $('#phone').value;
      const consent = $('#consent').checked;
      const honeypot = form.querySelector('[name="website"]').value;
      let ok = true;

      if (honeypot) return; // бот

      if (name.length < 2) { setFieldError('name', 'Укажите имя'); ok = false; } else setFieldError('name', '');
      if (!isPhoneValid(phone)) { setFieldError('phone', 'Введите номер в формате +375 (XX) XXX-XX-XX'); ok = false; } else setFieldError('phone', '');
      if (!consent) { setFieldError('consent', 'Нужно согласие на обработку данных'); ok = false; } else setFieldError('consent', '');
      if (!ok) return;

      const sentAt = Number(localStorage.getItem('leadSentAt') || 0);
      if (Date.now() - sentAt < CONFIG.lead.throttleMs) {
        setStatus('error', 'Заявка уже отправлена. Подождите немного.');
        return;
      }

      const payload = {
        source: 'form',
        name,
        phone,
        date: $('#date').value,
        messenger: $('#messenger').value,
        comment: $('#comment').value.trim(),
        estimate: quizState.result || null,
        page: location.href,
        sentAt: new Date().toISOString(),
      };

      submitBtn.classList.add('is-loading');
      submitBtn.disabled = true;
      try {
        await sendLead(payload);
        localStorage.setItem('leadSentAt', String(Date.now()));
        setStatus('success', 'Заявка отправлена! Свяжемся в течение 15 минут.');
        showToast('Заявка принята — скоро свяжемся!');
        form.reset();
      } catch (err) {
        console.error('[lead] send failed:', err);
        setStatus('error', `Не удалось отправить. Напишите в Telegram <a href="https://t.me/${CONFIG.telegramUser}" target="_blank" rel="noopener">@${CONFIG.telegramUser}</a> или позвоните ${escapeHtml(CONFIG.phoneDisplay)}.`);
      } finally {
        submitBtn.classList.remove('is-loading');
        submitBtn.disabled = false;
      }
    });
  }

  /* ------------------------------------------------------------------
     8. Отправка лида
     ------------------------------------------------------------------
     mode: 'stub'  — только лог в консоль (по умолчанию).
     mode: 'proxy' — POST на ваш прокси, который добавляет токен бота
                     и вызывает api.telegram.org/bot<TOKEN>/sendMessage.

     ВАЖНО: не храните токен бота в этом файле на публичном хостинге.
     Пример Cloudflare Worker и пошаговая инструкция — в README.md.
     ------------------------------------------------------------------ */
  function messengerLabel(v) {
    return { telegram: 'Telegram', whatsapp: 'WhatsApp', call: 'Звонок' }[v] || v;
  }

  function formatLeadMessage(p) {
    const lines = [];
    lines.push(`<b>🔥 Новая заявка — ${escapeHtml(CONFIG.brand)}</b>`);
    lines.push(`Источник: ${escapeHtml(p.source || '—')}`);
    lines.push('');
    if (p.name) lines.push(`👤 <b>Имя:</b> ${escapeHtml(p.name)}`);
    lines.push(`📞 <b>Телефон:</b> ${escapeHtml(p.phone)}`);
    if (p.messenger) lines.push(`💬 <b>Связь:</b> ${escapeHtml(messengerLabel(p.messenger))}`);
    if (p.date) lines.push(`📅 <b>Дата:</b> ${escapeHtml(p.date)}`);
    if (p.comment) lines.push(`📝 <b>Комментарий:</b> ${escapeHtml(p.comment)}`);

    const est = p.estimate;
    if (est) {
      lines.push('');
      lines.push('<b>🧮 Расчёт с сайта</b>');
      if (est.formatLabel) lines.push(`• Формат: ${escapeHtml(est.formatLabel)}`);
      if (est.hookahs) lines.push(`• Кальянов: ${est.hookahs}`);
      if (est.masters) lines.push(`• Мастеров: ${est.masters} × ${est.hours} ч`);
      if (est.min) lines.push(`• <b>Итого: ${fmtMoney(est.min)} – ${fmtMoney(est.max)}</b>`);
    }

    lines.push('');
    lines.push(`<i>${escapeHtml(p.page || '')}</i>`);
    return lines.join('\n');
  }

  // Готовый форматтер сообщения для Telegram (HTML).
  const buildTelegramMessage = formatLeadMessage;

  async function sendLead(payload) {
    const text = buildTelegramMessage(payload);

    if (CONFIG.lead.mode === 'proxy') {
      if (!CONFIG.lead.proxyUrl) throw new Error('CONFIG.lead.proxyUrl is empty');
      const res = await fetch(CONFIG.lead.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, parse_mode: 'HTML' }),
      });
      if (!res.ok) throw new Error('Proxy responded ' + res.status);
      return res.json();
    }

    // ---- STUB ----
    console.info('[lead][stub] сообщение, которое уйдёт в Telegram:\n' + text);
    await new Promise((r) => setTimeout(r, 700));
    return { ok: true, stub: true };
  }

  /* ------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    // Подстановка контактов из CONFIG
    $$('[data-contact-phone]').forEach((el) => {
      el.textContent = CONFIG.phoneDisplay;
      if (el.tagName === 'A') el.href = 'tel:' + CONFIG.phoneDisplay.replace(/\D/g, '');
    });

    initHeader();
    initReveal();
    initPlanPrices();
    initQuiz();
    initHeroForm();
    initLeadForm();

    const y = $('#year');
    if (y) y.textContent = String(new Date().getFullYear());
  });
})();
