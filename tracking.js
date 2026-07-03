/* ==========================================================================
   tracking.js — вспомогательный слой для практики GTM / GA4 / Meta CAPI
   --------------------------------------------------------------------------
   Здесь НЕТ настроенной аналитики — это полигон. Все действия пользователя
   пушатся в window.dataLayer, чтобы ты в GTM ловил их через триггеры
   "Custom Event" и настраивал теги GA4 / Google Ads / Meta.

   Как использовать в GTM:
   - Variable: Data Layer Variable → ecommerce.items, value, currency и т.д.
   - Trigger: Custom Event → add_to_cart / begin_checkout / purchase /
     generate_lead / file_download / video_start ...
   ========================================================================== */

// Инициализация dataLayer (GTM создаёт его сам, но подстрахуемся)
window.dataLayer = window.dataLayer || [];

function dlPush(eventName, payload) {
  var data = Object.assign({ event: eventName }, payload || {});
  window.dataLayer.push(data);
  // Дублируем в консоль — удобно проверять что событие ушло
  console.log('[dataLayer]', eventName, data);
}

/* ---------- Простейшая корзина в памяти (для ecommerce-практики) ---------- */
var CART_KEY = '__politep_cart';
function getCart() {
  try { return JSON.parse(sessionStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}
function saveCart(cart) {
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}
function updateCartBadge() {
  var cart = getCart();
  var count = cart.reduce(function (n, i) { return n + i.quantity; }, 0);
  document.querySelectorAll('[data-cart-count]').forEach(function (el) {
    el.textContent = count;
  });
}

/* ---------- GA4-style ecommerce события ---------- */

function trackViewItem(item) {
  dlPush('view_item', {
    ecommerce: { currency: 'RUB', value: item.price, items: [item] }
  });
}

function addToCart(item) {
  var cart = getCart();
  var existing = cart.find(function (i) { return i.item_id === item.item_id; });
  if (existing) { existing.quantity += 1; }
  else { cart.push(Object.assign({ quantity: 1 }, item)); }
  saveCart(cart);

  dlPush('add_to_cart', {
    ecommerce: { currency: 'RUB', value: item.price, items: [Object.assign({ quantity: 1 }, item)] }
  });

  // Мини-уведомление
  showToast('Добавлено в заявку: ' + item.item_name);
}

/* ---------- view_cart (страница корзины) ---------- */
function trackViewCart() {
  var cart = getCart();
  if (cart.length === 0) return;
  var value = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);
  dlPush('view_cart', {
    ecommerce: { currency: 'RUB', value: value, items: cart }
  });
}

/* ---------- Переход из корзины к оплате ----------
   Важно: purchase НЕ отправляется здесь. Мы только:
   1) шлём begin_checkout
   2) сохраняем "отложенный заказ" в sessionStorage
   3) переходим на thank-you.html
   Само событие purchase уйдёт только при ЗАГРУЗКЕ thank-you.html —
   это соответствует стандарту GA4: покупка = факт показа Thank You page. */
var PENDING_ORDER_KEY = '__politep_pending_order';

function goToThankYou() {
  var cart = getCart();
  if (cart.length === 0) { showToast('Корзина пуста — добавьте товары'); return; }
  var value = cart.reduce(function (s, i) { return s + i.price * i.quantity; }, 0);

  dlPush('begin_checkout', {
    ecommerce: { currency: 'RUB', value: value, items: cart }
  });

  var pendingOrder = {
    txnId: 'T' + Date.now(),
    value: value,
    items: cart
  };
  sessionStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(pendingOrder));
  window.location.href = 'thank-you.html';
}

/* ---------- Финализация покупки на Thank You странице ---------- */
function finalizePendingPurchase() {
  var raw = sessionStorage.getItem(PENDING_ORDER_KEY);
  if (!raw) return null;

  var order;
  try { order = JSON.parse(raw); } catch (e) { return null; }

  dlPush('purchase', {
    ecommerce: {
      transaction_id: order.txnId,
      currency: 'RUB',
      value: order.value,
      tax: Math.round(order.value * 0.2),
      shipping: 0,
      items: order.items
    }
  });

  sessionStorage.removeItem(PENDING_ORDER_KEY);
  sessionStorage.removeItem(CART_KEY);
  updateCartBadge();
  return order;
}

/* ---------- Лид-форма (generate_lead) ---------- */
function submitLeadForm(formEl) {
  var type = (formEl.querySelector('input[name="client_type"]:checked') || {}).value || 'unknown';
  dlPush('generate_lead', {
    currency: 'RUB',
    value: 0,
    lead_type: type,
    form_id: formEl.id || 'contact-form'
  });
  return true;
}

/* ---------- Прочие события: скачивание, видео, исходящие ссылки ---------- */
function trackFileDownload(fileName) {
  dlPush('file_download', { file_name: fileName, file_extension: 'pdf' });
}
function trackOutbound(url) {
  dlPush('click_outbound', { outbound_url: url });
}

/* ---------- Toast ---------- */
function showToast(msg) {
  var t = document.getElementById('__toast');
  if (!t) {
    t = document.createElement('div');
    t.id = '__toast';
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#22262A;color:#fff;padding:14px 24px;border-radius:2px;font-weight:600;z-index:9999;border-left:4px solid #F2A900;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity .3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t.__timer);
  t.__timer = setTimeout(function () { t.style.opacity = '0'; }, 2200);
}

/* ---------- Навешивание обработчиков после загрузки ---------- */
document.addEventListener('DOMContentLoaded', function () {
  updateCartBadge();

  // Бургер-меню
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () { nav.classList.toggle('open'); });
  }

  // Все исходящие ссылки
  document.querySelectorAll('a.external-link').forEach(function (a) {
    a.addEventListener('click', function () { trackOutbound(a.href); });
  });

  // Кнопки скачивания
  document.querySelectorAll('[data-download]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      trackFileDownload(btn.getAttribute('data-download'));
      showToast('Скачивание: ' + btn.getAttribute('data-download'));
    });
  });

  // Кнопки "в заявку" (add to cart)
  document.querySelectorAll('[data-add-to-cart]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      addToCart({
        item_id: btn.dataset.itemId,
        item_name: btn.dataset.itemName,
        item_category: btn.dataset.itemCategory,
        price: parseFloat(btn.dataset.price)
      });
    });
  });

  // (кнопка "в корзину/оплатить" теперь обрабатывается напрямую на cart.html)

  // view_item на странице товара
  var pd = document.getElementById('product-detail');
  if (pd) {
    trackViewItem({
      item_id: pd.dataset.itemId,
      item_name: pd.dataset.itemName,
      item_category: pd.dataset.itemCategory,
      price: parseFloat(pd.dataset.price),
      quantity: 1
    });
  }

  // CTA-кнопки с data-cta — общее событие для практики click-триггеров
  document.querySelectorAll('[data-cta]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      dlPush('cta_click', { cta_id: btn.dataset.cta, cta_text: btn.textContent.trim() });
    });
  });
});
