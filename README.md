# Smoke & Chill — лендинг кальянного кейтеринга

Статический адаптивный лендинг без сборщиков: `index.html`, `style.css`, `main.js`.
Работает напрямую с GitHub Pages.

## Запуск локально

Откройте `index.html` в браузере или запустите любой статический сервер:

```bash
python -m http.server 8080
# или
npx serve .
```

## Публикация на GitHub Pages

1. Создайте репозиторий и запушьте файлы в ветку `main`.
2. Settings → Pages → Source: **Deploy from a branch**, Branch: `main` / `/ (root)`.
3. Через 1–2 минуты сайт будет доступен по адресу `https://<user>.github.io/<repo>/`.

Файл `.nojekyll` отключает обработку Jekyll — оставьте его.

## Что и где править

| Что | Где |
|---|---|
| Цены, тарифы, коэффициенты, доп. услуги | `main.js` → объект `PRICING` |
| Название, валюта, Telegram-юзернейм, телефон | `main.js` → объект `CONFIG` |
| Контакты в разметке (тел., ссылки) | `index.html` → секция `#contacts`, hero, footer |
| Тексты, отзывы, FAQ | `index.html` |
| Цвета темы | `style.css` → `[data-theme="dark"]` / `[data-theme="light"]` |

## Форма заявки

Форма полностью рабочая: валидация, маска `+375 (XX) XXX-XX-XX`, honeypot,
защита от повторной отправки, состояния загрузки/успеха/ошибки.
К заявке автоматически прикладывается расчёт из калькулятора.

**Отправка в Telegram сейчас — заглушка.** Готовый текст сообщения
выводится в консоль браузера (`[lead][stub] ...`).

Чтобы подключить Telegram:

1. В `main.js` → `CONFIG.lead.mode` поменяйте `'stub'` на `'telegram'`.
2. В функции `sendLead()` реализуйте ветку `mode === 'telegram'` —
   там уже есть пример `fetch` на прокси.
3. Не храните токен бота в `main.js` на публичном хостинге: используйте
   прокси (Cloudflare Worker / Google Apps Script / любой serverless),
   который добавит токен и вызовет `api.telegram.org/bot<TOKEN>/sendMessage`.
