# Политеп — тестовый сайт для практики веб-аналитики

Полигон для отработки GA4 + GTM + Google Ads conversions + Meta CAPI + Consent Mode.
Компания реальная по продукту (водоотводные лотки, плитка, бордюры), но контакты и цены — демонстрационные.

## Структура

| Файл | Что на нём тренировать |
|---|---|
| `index.html` | page_view, cta_click, video (YouTube embed), file_download, outbound links |
| `products.html` | каталог, add_to_cart |
| `product.html` | **view_item** (автоматически при загрузке) + add_to_cart + переход в корзину |
| `cart.html` | **view_cart** (автоматически при загрузке) + **begin_checkout** (клик «Оформить заказ») |
| `thank-you.html` | **purchase** — стреляет именно при загрузке этой страницы (стандарт GA4: покупка = факт показа Thank You page) |
| `contact.html` | **generate_lead** (с разделением организация / частное лицо), Thank You состояние формы |

**Путь покупателя:** `index.html` → `product.html` (view_item) → добавил в корзину (add_to_cart) → `cart.html` (view_cart) → «Оформить заказ» (begin_checkout) → `thank-you.html` (purchase).

## Куда вставлять GTM

В каждом файле есть два явных места:
- `<!-- GTM HEAD SNIPPET GOES HERE -->` — в `<head>`
- `<!-- GTM BODY SNIPPET GOES HERE -->` — сразу после `<body>`

Вставь туда два сниппета из своего GTM-контейнера — и всё заработает.

## Какие события уже пушатся в dataLayer

Всё это ты ловишь в GTM через триггер **Custom Event** и настраиваешь теги GA4 / Google Ads / Meta:

| Событие | Когда срабатывает | Данные в dataLayer |
|---|---|---|
| `cta_click` | клик по любой CTA-кнопке | cta_id, cta_text |
| `view_item` | загрузка страницы товара (`product.html`) | ecommerce.items, value, currency |
| `add_to_cart` | кнопка «Добавить в корзину» | ecommerce.items, value |
| `view_cart` | загрузка страницы корзины (`cart.html`), если в ней есть товары | ecommerce.items, value |
| `begin_checkout` | клик «Оформить заказ» на `cart.html` | ecommerce.items, value |
| `purchase` | загрузка `thank-you.html` после оформления заказа | ecommerce.transaction_id, value, tax, items |
| `generate_lead` | отправка формы контактов | lead_type (organization/individual), form_id |
| `file_download` | кнопки скачивания PDF | file_name, file_extension |
| `click_outbound` | внешние ссылки (class="external-link") | outbound_url |

Все события также логируются в консоль браузера (F12 → Console) с префиксом `[dataLayer]` — удобно проверять.

## Что можно настроить для практики каждого блока

**GA4 (базовый):** page_view автоматически, плюс кастомные события выше через GTM.

**GTM client-side:** триггеры на cta_click, add_to_cart, все ecommerce события.

**Conversion Tracking (Google Ads):** конверсия на `generate_lead` (лид с формы) и на `purchase` (заявка оформлена). Enhanced Conversions — на форме есть поля name/phone/email для хеширования.

**Server-side + Meta CAPI:** полная ecommerce-воронка (view_item → add_to_cart → view_cart → begin_checkout → purchase) для передачи через server container и Meta Conversions API. Event Deduplication тренируется на паре Pixel + CAPI для одного purchase.

**Consent Mode V2:** можно навесить CMP (Cookiebot) и проверить как события ведут себя до и после согласия.

## Как запустить

Локально — просто открыть `index.html` в браузере. Но для настоящей практики (GTM требует HTTPS и реальный домен) лучше залить на GitHub Pages:

1. Создать репозиторий на GitHub
2. Загрузить все файлы (Add file → Upload files)
3. Settings → Pages → Source: main branch → Save
4. Через пару минут будет URL вида `https://твой-логин.github.io/имя-репозитория`
5. Этот URL вставляешь в GA4 property и GTM

Готово — можно тренировать весь стек.
