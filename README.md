# Smoke Craft — лендинг кальянного кейтеринга (Минск)

Статический адаптивный лендинг без сборщиков: `index.html`, `style.css`, `main.js`.
Тёмная премиум-тема (Dark Mode / Premium Lounge), mobile-first, работает напрямую с GitHub Pages.

## Запуск локально

Откройте `index.html` в браузере или поднимите статический сервер:

```bash
python -m http.server 8080
# или
npx serve .
```

## Публикация на GitHub Pages

1. Запушьте файлы в ветку `main`.
2. Settings → Pages → Source: **Deploy from a branch**, Branch: `main` / `/ (root)`.
3. Через 1–2 минуты сайт будет доступен по адресу `https://<user>.github.io/<repo>/`.

Файл `.nojekyll` отключает обработку Jekyll — оставьте его.

## Что и где править

| Что | Где |
|---|---|
| Телефон, Telegram, WhatsApp, режим отправки | `main.js` → объект `CONFIG` |
| Цены, ставки, коэффициенты, пакеты | `main.js` → объект `PRICING` |
| Контакты в разметке (тел., ссылки) | `index.html` (иконки мессенджеров, footer, sticky-bar) |
| Тексты, тарифы, отзывы, FAQ | `index.html` |
| Фото галереи и hero | `index.html` — теги `<img src="https://picsum.photos/...">` |

> Фото — временные заглушки с внешнего сервиса (picsum.photos). Замените `src` на реальные снимки с ваших мероприятий.

### Формула расчёта (гибрид «кальян × час»)

```
мастер: 1 мастер на каждые 8 кальянов, 100 BYN/час (мин. 2 ч)
сервис: 15 BYN за кальян за час (табак, уголь, мундштуки)
итог:   мастера × часы × 100  +  кальяны × часы × 15
вывод:  диапазон −0% / +15%, округление до 5 BYN
```

## Формы

Форма в Hero, квиз (4 шага) и основная форма заявки полностью рабочие:
валидация, маска `+375 (XX) XXX-XX-XX`, honeypot, защита от повторной
отправки, состояния загрузки/успеха/ошибки. К заявке прикладывается расчёт из квиза.

**Отправка в Telegram сейчас — заглушка** (`CONFIG.lead.mode = 'stub'`):
готовый текст сообщения выводится в консоль браузера (`[lead][stub] ...`).

## Подключение Telegram (через прокси)

Не храните токен бота в `main.js` на публичном хостинге — его увидит любой.
Используйте serverless-прокси, который сам добавит токен.

### 1. Cloudflare Worker

```js
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
    const { text } = await request.json();
    const url = `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.CHAT_ID, text, parse_mode: 'HTML' }),
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  },
};
```

Задайте переменные окружения `BOT_TOKEN` и `CHAT_ID` в настройках воркера
(Secrets). `CHAT_ID` своего канала/чата можно узнать у `@userinfobot`.

### 2. Включение на сайте

В `main.js`:

```js
lead: {
  mode: 'proxy',
  proxyUrl: 'https://<ваш-worker>.workers.dev',
  throttleMs: 30000,
}
```

Готовый текст (`buildTelegramMessage`) уже отформатирован под `parse_mode: HTML`.

## Структура

```
index.html   — разметка, 8 смысловых блоков + липкая плашка CTA
style.css    — токены темы, компоненты, адаптив (600 / 768 / 1024 / 1200)
main.js      — CONFIG, PRICING, квиз, валидация, отправка лида
.nojekyll    — для GitHub Pages
```

## Соответствие возрастному ограничению

Услуги предоставляются лицам старше 18 лет. Курение вредит вашему здоровью —
дисклеймер выведен в футере.
