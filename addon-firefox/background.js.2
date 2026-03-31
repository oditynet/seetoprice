// background.js
console.log('[BACKGROUND] Скрипт загружен');

browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]  
});

function detectCurrency(priceText) {
  console.log(`[detectCurrency] Входные данные: "${priceText}"`);
  if (!priceText) {
    console.log('[detectCurrency] Пустой текст, возвращаем RUB');
    return 'RUB';
  }
  
  let result = 'RUB';
  if (priceText.includes('₽') || priceText.includes('руб')) result = 'RUB';
  else if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) result = 'BYN';
  else if (priceText.includes('₸')) result = 'KZT';
  else if (priceText.includes('$') || priceText.includes('USD')) result = 'USD';
  else if (priceText.includes('€') || priceText.includes('EUR')) result = 'EUR';
  else if (priceText.includes('֏') || priceText.includes('драм')) result = 'AMD';
  else if (priceText.includes('сом')) result = 'KGS';
  else if (priceText.includes('сум') || priceText.includes('UZS')) result = 'UZS';
  else if (priceText.includes('с.')) result = 'TJS';
  else if (priceText.includes('Kč') || priceText.includes('кр')) result = 'CZK';
  else if (priceText.includes('zł') || priceText.includes('зл')) result = 'PLN';
  else if (priceText.includes('lei') || priceText.includes('лей')) result = 'RON';
  else if (priceText.includes('лв') || priceText.includes('lv')) result = 'BGN';
  else if (priceText.includes('Ft') || priceText.includes('фт')) result = 'HUF';
  else if (priceText.includes('kr') || priceText.includes('кр')) result = 'SEK';
  else if (priceText.includes('CHF') || priceText.includes('фр')) result = 'CHF';
  else if (priceText.includes('₪')) result = 'ILS';
  else if (priceText.includes('₼')) result = 'AZN';
  else if (priceText.includes('₾')) result = 'GEL';
  
  console.log(`[detectCurrency] Результат: "${result}" для текста "${priceText}"`);
  return result;
}

function getCurrencySymbol(currency) {
  console.log(`[getCurrencySymbol] Входная валюта: "${currency}"`);
  const symbols = {
    'RUB': '₽',
    'BYN': 'ƃ', 
    'KZT': '₸',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏',
    'KGS': 'сом',
    'UZS': 'сум',
    'TJS': 'с.',
    'CZK': 'Kč',
    'PLN': 'zł',
    'RON': 'lei',
    'BGN': 'лв',
    'HUF': 'Ft',
    'SEK': 'kr',
    'CHF': 'CHF',
    'ILS': '₪',
    'AZN': '₼',
    'GEL': '₾'
  };
  const result = symbols[currency] || '₽';
  console.log(`[getCurrencySymbol] Результат: "${result}"`);
  return result;
}

function normalizePrice(priceText) {
  console.log(`[normalizePrice] Входной текст: "${priceText}"`);
  if (!priceText) {
    console.log('[normalizePrice] Пустой текст, возвращаем null');
    return null;
  }
  
  let normalized = priceText
    .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
    .replace(/[^\d.,-]/g, '');
  console.log(`[normalizePrice] После удаления символов: "${normalized}"`);
  
  const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
  if (priceMatch) {
    normalized = priceMatch[0];
    console.log(`[normalizePrice] Извлечено число: "${normalized}"`);
  } else {
    console.log(`[normalizePrice] Число не найдено`);
  }
  
  return normalized;
}

async function sendTelegramMessage(text, tgToken, tgId) {
  console.log(`[sendTelegramMessage] Отправка в Telegram, длина текста: ${text.length}`);
  if (!tgToken || !tgId) {
    console.error('[sendTelegramMessage] Ошибка: Telegram настройки не найдены');
    throw new Error('Telegram настройки не найдены!');
  }
  const apiUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: tgId,
        text: text,
        parse_mode: 'HTML'
      }),
    });

    const data = await response.json();
    
    if (!data.ok) {
      console.error(`[sendTelegramMessage] Ошибка API: ${data.description}`);
      throw new Error(data.description || 'Unknown Telegram API error');
    }
    
    console.log('[sendTelegramMessage] Сообщение успешно отправлено');
    return data;
  } catch (error) {
    console.error('[sendTelegramMessage] Ошибка:', error);
    throw error;
  }
}

function parseOzonPrice(document) {
  console.log('[parseOzonPrice] Начинаем парсинг Ozon');
  try {
    const priceSelectors = [
      '[data-widget="webPrice"] .tsHeadline600Large',
      '.pdp_b8h .tsHeadline600Large',
      '.pdp_hb9 .tsHeadline600Large',
      '[data-widget="webPrice"] span'
    ];
    
    let currentPrice = null;
    let priceElement = null;
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const rawPrice = element.textContent.trim();
        console.log(`[parseOzonPrice] Найден элемент по селектору "${selector}", текст: "${rawPrice}"`);
        if (rawPrice && /\d/.test(rawPrice)) {
          priceElement = element;
          currentPrice = normalizePrice(rawPrice);
          console.log(`[parseOzonPrice] Нормализованная цена: "${currentPrice}"`);
          break;
        }
      }
    }
    
    const oldPriceSelectors = [
      '[data-widget="webOldPrice"] span',
      '.pdp_b3i.pdp_bi4.pdp_ib2',
      '.tsBody400Small'
    ];
    
    let previousPrice = null;
    for (const selector of oldPriceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const rawOldPrice = element.textContent;
        console.log(`[parseOzonPrice] Найдена старая цена по селектору "${selector}": "${rawOldPrice}"`);
        if (rawOldPrice && /\d/.test(rawOldPrice)) {
          previousPrice = normalizePrice(rawOldPrice);
          console.log(`[parseOzonPrice] Нормализованная старая цена: "${previousPrice}"`);
          break;
        }
      }
    }
    
    let currency = 'RUB';
    if (priceElement) {
      currency = detectCurrency(priceElement.textContent);
      console.log(`[parseOzonPrice] Определена валюта: "${currency}"`);
    }
    
    const discountWidget = document.querySelector('[data-widget="foundCheaperText"]');
    let discountStatus = null;
    
    if (discountWidget) {
      const widgetText = discountWidget.textContent || '';
      console.log(`[parseOzonPrice] Найден виджет скидки: "${widgetText}"`);
      
      if (widgetText.includes('Скидка одобрена')) discountStatus = 'approved';
      else if (widgetText.includes('Скидка отклонена')) discountStatus = 'rejected';
      else if (widgetText.includes('%') || widgetText.includes('—')) discountStatus = 'pending';
      else if (widgetText.includes('Скидка запрошена')) discountStatus = 'requested';
      else if (widgetText.includes('Хочу скидку')) discountStatus = 'available';
      
      console.log(`[parseOzonPrice] Статус скидки: "${discountStatus}"`);
    }

    const result = {
      price: currentPrice,
      previousPrice: previousPrice,
      currency: currency || 'RUB',
      discountStatus: discountStatus
    };
    console.log(`[parseOzonPrice] Результат:`, result);
    return result;
    
  } catch (e) {
    console.error('[parseOzonPrice] Ошибка:', e);
    return null;
  }
}

function parseVseinstrumentiPrice(document) {
  console.log('[parseVseinstrumentiPrice] Начинаем парсинг Vseinstrumenti');
  try {
    const outOfStockElement = document.querySelector('.quhdQv p._typography_5vy1f_47._text_5vy1f_54._v2_5vy1f_16._5jOGud');
    if (outOfStockElement && outOfStockElement.textContent.includes('Нет в наличии')) {
      console.log('[parseVseinstrumentiPrice] Товар отсутствует в наличии');
      return {
        price: null,
        previousPrice: null,
        currency: 'RUB',
        isOutOfStock: true
      };
    }
  
    const priceSelectors = [
      '.-no-margin_fsyzi_50',
      '.cztff3 > .BVPC2X',
      '[class*="price"]',
      '.product-price',
      '.current-price',
      '.product-card-price',
      '[data-behavior="price-now"]',
      '[data-qa="price-now"]',
      '.MZu-SS',
      '.ljRWE3 p',
      '.price-item.js-price-item',
      '.current-price',
      '[itemprop="price"]',
      '[class*="price"][class*="now"]',
      '[class*="Price"][class*="current"]'
    ];
    
    let currentPrice = null;
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        console.log(`[parseVseinstrumentiPrice] Найден элемент "${selector}", текст: "${priceText}"`);
        if (priceText && /\d/.test(priceText)) {
          currentPrice = normalizePrice(priceText);
          console.log(`[parseVseinstrumentiPrice] Нормализованная цена: "${currentPrice}"`);
          break;
        }
      }
    }

    const result = {
      price: currentPrice,
      currency: 'RUB'
    };
    console.log(`[parseVseinstrumentiPrice] Результат:`, result);
    return result;
  } catch (e) {
    console.error('[parseVseinstrumentiPrice] Ошибка:', e);
    return null;
  }
}

function parseLemanaproPrice(document) {
  console.log('[parseLemanaproPrice] Начинаем парсинг Lemanapro');
  try {
    const priceElement = document.querySelector('.product-price__current, .price, .product-card-price');
    
    let currentPrice = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText;
      console.log(`[parseLemanaproPrice] Найден элемент, текст: "${priceText}"`);
      const priceMatch = priceText.match(/([\d\s,]+)₽/);
      if (priceMatch) {
        currentPrice = normalizePrice(priceMatch[1]);
        console.log(`[parseLemanaproPrice] Нормализованная цена из матча: "${currentPrice}"`);
      } else {
        currentPrice = normalizePrice(priceText);
        console.log(`[parseLemanaproPrice] Нормализованная цена из текста: "${currentPrice}"`);
      }
    } else {
      console.log('[parseLemanaproPrice] Элемент с ценой не найден');
    }

    const result = {
      price: currentPrice,
      currency: 'RUB'
    };
    console.log(`[parseLemanaproPrice] Результат:`, result);
    return result;
  } catch (e) {
    console.error('[parseLemanaproPrice] Ошибка:', e);
    return null;
  }
}

function parsePetrovichPrice(document) {
  console.log('[parsePetrovichPrice] Начинаем парсинг Petrovich');
  try {
    const priceElements = document.querySelectorAll( '[data-test="product-gold-price"]','.gold-price', '.PriceContentWrapper-sc-jgbo00', '.price, .product-price, [class*="price"]');
    
    let currentPrice = null;
    
    for (const element of priceElements) {
      const priceText = element.textContent || element.innerText;
      console.log(`[parsePetrovichPrice] Проверяем элемент, текст: "${priceText}"`);
      if (priceText.includes('₽') && /\d/.test(priceText)) {
        const priceMatch = priceText.match(/([\d\s,]+)₽/);
        if (priceMatch) {
          currentPrice = normalizePrice(priceMatch[1]);
          console.log(`[parsePetrovichPrice] Нормализованная цена: "${currentPrice}"`);
          break;
        }
      }
    }

    if (!currentPrice) {
      const cardPriceElement = document.querySelector('.price-card, .product-card-price');
      if (cardPriceElement) {
        const priceText = cardPriceElement.textContent || cardPriceElement.innerText;
        console.log(`[parsePetrovichPrice] Альтернативный элемент, текст: "${priceText}"`);
        currentPrice = normalizePrice(priceText);
        console.log(`[parsePetrovichPrice] Нормализованная цена: "${currentPrice}"`);
      }
    }

    const result = {
      price: currentPrice,
      currency: 'RUB'
    };
    console.log(`[parsePetrovichPrice] Результат:`, result);
    return result;
  } catch (e) {
    console.error('[parsePetrovichPrice] Ошибка:', e);
    return null;
  }
}

function parseAutoRuPrice(document) {
  console.log('[parseAutoRuPrice] Начинаем парсинг Auto.ru');
  try {
    const priceSelectors = [
      '.OfferPriceCaption__price',
      '.OfferPrice__price',
      '[class*="price"]',
      '.CardPrice'
    ];
    
    let currentPrice = null;
    
    for (const selector of priceSelectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`[parseAutoRuPrice] Селектор "${selector}", найдено элементов: ${elements.length}`);
      for (const element of elements) {
        const priceText = element.textContent || element.innerText;
        console.log(`[parseAutoRuPrice] Текст элемента: "${priceText}"`);
        
        if (priceText.includes('₽') && /\d/.test(priceText)) {
          const priceMatch = priceText.match(/([\d\s,]+)₽/);
          if (priceMatch) {
            currentPrice = normalizePrice(priceMatch[1]);
            console.log(`[parseAutoRuPrice] Нормализованная цена: "${currentPrice}"`);
            break;
          }
        }
      }
      if (currentPrice) break;
    }

    const result = {
      price: currentPrice,
      currency: 'RUB'
    };
    console.log(`[parseAutoRuPrice] Результат:`, result);
    return result;
  } catch (e) {
    console.error('[parseAutoRuPrice] Ошибка:', e);
    return null;
  }
}

async function getWilbPrice(document) { // 3 типа цены. не забудь!
  console.log('[getWilbPrice] Начинаем парсинг Wildberries');
  console.log('[getWilbPrice] URL:', document.location.href);
  
  // Тип 1: Цена WB Кошелька (самая выгодная) - 3 цены
  const findWalletPrice = () => {
    const walletPriceElement = document.querySelector('.priceBlockWalletPrice--RJGuT h2');
    if (walletPriceElement) {
      const priceText = walletPriceElement.textContent.trim();
      if (priceText && /\d/.test(priceText)) {
        console.log(`[getWilbPrice] ✅ Тип 1 (WB Кошелек): "${priceText}"`);
        return { 
          price: normalizePrice(priceText), 
          currency: detectCurrency(priceText),
          type: 'wallet'
        };
      }
    }
    return null;
  };
  
  // Тип 2: Обычная цена с кнопкой WB Кошелька - 3 цены (но берем обычную)
  // Тип 3: Только обычная цена - 2 цены
  const findRegularPrice = () => {
    const selectors = [
      '.priceBlockFinalPrice--iToZR',           // основной селектор
      'ins.priceBlockFinalPrice--iToZR',        // с тегом ins
      '[class*="priceBlockFinalPrice"]',        // любой класс содержащий priceBlockFinalPrice
      '.price-block__final-price',              // альтернативный
      '[class*="finalPrice"]',                  // любой класс с finalPrice
      '.product-price__current',                // общий селектор цены
      '[data-testid="price"]'                   // data атрибут
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        if (priceText && /\d/.test(priceText)) {
          // Проверяем, что это не цена WB Кошелька (она внутри кнопки)
          const isWalletPrice = element.closest('.priceBlockWalletPrice--RJGuT');
          if (!isWalletPrice) {
            console.log(`[getWilbPrice] ✅ Тип 2/3 (обычная цена): "${priceText}"`);
            return { 
              price: normalizePrice(priceText), 
              currency: detectCurrency(priceText),
              type: 'regular'
            };
          }
        }
      }
    }
    return null;
  };
  
  // Тип 4: Только одна цена (без скидки)
  const findSinglePrice = () => {
    const selectors = [
      '.priceBlockFinalPrice--iToZR',
      'ins[class*="priceBlockFinalPrice"]',
      '.product-price__current',
      '[class*="finalPrice"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        if (priceText && /\d/.test(priceText)) {
          console.log(`[getWilbPrice] ✅ Тип 4 (одиночная цена): "${priceText}"`);
          return { 
            price: normalizePrice(priceText), 
            currency: detectCurrency(priceText),
            type: 'single'
          };
        }
      }
    }
    return null;
  };
  
  // ========== ЛОГИКА ПАРСИНГА ==========
  
  // 1. Сначала ищем цену WB Кошелька (самая выгодная)
  let result = findWalletPrice();
  if (result) {
    console.log('[getWilbPrice] Используем цену WB Кошелька');
    return { price: result.price, currency: result.currency };
  }
  
  // 2. Если нет WB Кошелька, ждем его появление (до 7 секунд)
//  console.log('[getWilbPrice] Ждем появление цены WB Кошелька (до 10 сек)...');
  for (let i = 0; i < 75; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findWalletPrice();
    if (result) {
      console.log(`[getWilbPrice] Цена WB Кошелька найдена через ${(i+1)*200}мс`);
      return { price: result.price, currency: result.currency };
    }
  }
  
  // 3. Ищем обычную цену (с учетом, что может быть кнопка WB Кошелька)
  console.log('[getWilbPrice] Ищем обычную цену...');
  result = findRegularPrice();
  if (result) {
    console.log('[getWilbPrice] Используем обычную цену');
    return { price: result.price, currency: result.currency };
  }
  
  // 4. Ждем появления обычной цены (до 6 секунд)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findRegularPrice();
    if (result) {
      console.log(`[getWilbPrice] Обычная цена найдена через ${(i+1)*200}мс`);
      return { price: result.price, currency: result.currency };
    }
  }
  
  // 5. Ищем одиночную цену (без скидки)
  console.log('[getWilbPrice] Ищем одиночную цену...');
  result = findSinglePrice();
  if (result) {
    console.log('[getWilbPrice] Используем одиночную цену');
    return { price: result.price, currency: result.currency };
  }
  
  // 6. Ждем одиночную цену (до 6 секунд)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findSinglePrice();
    if (result) {
      console.log(`[getWilbPrice] Одиночная цена найдена через ${(i+1)*200}мс`);
      return { price: result.price, currency: result.currency };
    }
  }
  
  console.log('[getWilbPrice] ❌ Цена не найдена');
  return { price: null, currency: null };
}

async function checkPrices() {
  console.log('\n========== [checkPrices] НАЧАЛО ПРОВЕРКИ ==========');
//  console.log(`[checkPrices] Время: ${new Date().toISOString()}`);
  
  try {
    const items = await browser.storage.local.get();
    console.log(`[checkPrices] Загружено элементов из хранилища: ${Object.keys(items).length}`);
    
    let historylen;
    let tgToken;
    let tgId;
    let pageUrl = null;
    
    for (const [itemId, item] of Object.entries(items)) {
      console.log(`\n--- [checkPrices] Обработка товара: ${itemId} ---`);
      
      try {
        if (itemId === "settings") {
          console.log('[checkPrices] Найдены настройки:', { 
            checkHistory: item.checkHistory, 
            hasTgToken: !!item.tgToken, 
            hasTgId: !!item.tgId 
          });
          historylen = item.checkHistory;
          tgToken = item.tgToken;
          tgId = item.tgId;
          continue; 
        }

        if (!item || !item.url) {
          console.log(`[checkPrices] Пропуск: нет URL для ${itemId}`);
          continue;
        }

        console.log(`[checkPrices] URL товара: ${item.url}`);
        console.log(`[checkPrices] Текущая цена в хранилище: "${item.currentPrice}"`);
        console.log(`[checkPrices] Оригинальная цена: "${item.originalPrice}"`);
        console.log(`[checkPrices] Валюта: "${item.currency}"`);

        console.log('[checkPrices] Создаем вкладку...');
        
        
         pageUrl = new URL(item.url);
        const tab = await browser.tabs.create({
          url: item.url,
          active: false,
          discarded: false
        });
        console.log(`[checkPrices] Вкладка создана, ID: ${tab.id}`);

// ========== ДЛЯ WILDBERRIES: БЛОКИРУЕМ НЕНУЖНЫЕ РЕСУРСЫ ==========
/*        // 👇 Используем pageUrl, а не url
        if (pageUrl.hostname.includes('wildberries.ru')) {
          console.log('[checkPrices] Настройка блокировки ресурсов для Wildberries');
          
          const listener = (details) => {
            // Блокируем всё, что не нужно для получения цены
            const blockTypes = ["image", "stylesheet", "font", "media"];
            const blockDomains = [
              // 'static-basket-01.wbbasket.ru',
             // 'basket-',
             // 'images.wbstatic.net'
             'a.wb.ru',
             'chat-prod.wildberries.ru'
            ];
            
            if (blockTypes.includes(details.type)) {
              console.log(`[checkPrices] Блокируем ${details.type}: ${details.url}`);
              //return { cancel: true };
            }
            
            if (blockDomains.some(domain => details.url.includes(domain))) {
              console.log(`[checkPrices] Блокируем домен: ${details.url}`);
            //  return { cancel: true };
            }
            
            if (details.url.match(/\.(webp|png|gif|svg|css|woff2?|ttf|eot)(\?|$)/i))
             {
              console.log(`[checkPrices] Блокируем по расширению: ${details.url}`);
            //  return { cancel: true };
            }
            
            return {};
          };
          
          browser.webRequest.onBeforeRequest.addListener(
            listener,
            { 
              urls: [
                "*://*.wildberries.ru/*",
                "*://*.wbbasket.ru/*", 
                "*://*.wbstatic.net/*"
              ] 
            },
            ["blocking"]
          );
          
          tab.blockingListener = listener;
        }
*/


        await new Promise(resolve => 
          browser.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              console.log(`[checkPrices] Вкладка ${tabId} загружена`);
              browser.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          })
        );

        const url = new URL(item.url);
        let priceData = null;

        // ========== ПАРСИНГ ПО САЙТАМ ==========
        
        if (url.hostname.includes('ozon.ru')) {
          console.log('[checkPrices] Сайт: Ozon.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseOzonPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Ozon:', priceData);
          




    
      // ========== ОБНОВЛЯЕМ СТАТУС СКИДКИ В ХРАНИЛИЩЕ ==========
  if (priceData && priceData.discountStatus) {
    console.log(`[checkPrices] Обновляем статус скидки: "${priceData.discountStatus}" для ${itemId}`);
    
    // Получаем текущий товар из хранилища
    const currentItem = await browser.storage.local.get(itemId);
    const updatedItem = {
      ...currentItem[itemId],
      discountStatus: priceData.discountStatus,
      discountAvailable: priceData.discountStatus === 'available',
      discountRequested: priceData.discountStatus === 'requested' || priceData.discountStatus === 'pending'
    };
    
    await browser.storage.local.set({ [itemId]: updatedItem });
    console.log(`[checkPrices] ✅ Статус скидки обновлен на: ${priceData.discountStatus}`);
  } else {
    console.log('[checkPrices] Статус скидки не найден на странице');
  }
    
    
          
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price +' '+ currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('wildberries.ru')) {
          console.log('[checkPrices] Сайт: Wildberries.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${getWilbPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Wildberries:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price +' '+ currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('vseinstrumenti.ru')) {
          console.log('[checkPrices] Сайт: Vseinstrumenti.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseVseinstrumentiPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Vseinstrumenti:', priceData);
          
          if (priceData && priceData.isOutOfStock) {
            console.log('[checkPrices] Товар отсутствует в наличии');
            const updatedItem = { ...item, isOutOfStock: true };
            await browser.storage.local.set({ [itemId]: updatedItem });
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const finalPrice = priceData.price + ' ₽';
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('lemanapro.ru')) {
          console.log('[checkPrices] Сайт: Lemanapro.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseLemanaproPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Lemanapro:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price + ' '+ currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('petrovich.ru')) {
          console.log('[checkPrices] Сайт: Petrovich.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parsePetrovichPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Petrovich:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price +' '+ currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('auto.ru')) {
          console.log('[checkPrices] Сайт: Auto.ru');
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseAutoRuPrice.toString()})(document)`
          });
          priceData = result;
          console.log('[checkPrices] Получены данные с Auto.ru:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price +' ' + currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else {
          console.log('[checkPrices] Сайт: Другой (по селектору)');
          const [currentPrice] = await browser.tabs.executeScript(tab.id, {
            code: `document.querySelector('${item.selector}')?.textContent`
          });
          
          console.log(`[checkPrices] Получена цена по селектору "${item.selector}": "${currentPrice}"`);
          
          if (currentPrice) {
            const currency = detectCurrency(currentPrice);
            console.log(`[checkPrices] Определена валюта: "${currency}"`);
            if (currency !== item.currency) {
              console.log(`[checkPrices] Валюта не совпадает: ${currency} vs ${item.currency}, пропускаем`);
              await browser.tabs.remove(tab.id);
              continue;
            }
            priceData = { 
              price: normalizePrice(currentPrice),
              currency: currency
            };
            console.log(`[checkPrices] Нормализованная цена: "${priceData.price}"`);
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price + ' '+currencySymbol;
            console.log(`[checkPrices] Сформирована финальная цена: "${finalPrice}"`);
            console.log(`[checkPrices] Сравнение: "${finalPrice}" === "${item.currentPrice}"? ${finalPrice === item.currentPrice}`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } else {
              console.log('[checkPrices] Цена не изменилась');
            }
          } else {
            console.log('[checkPrices] Цена не найдена на странице');
          }
          
          await browser.tabs.remove(tab.id);
          continue;
        }

      } catch (error) {
        console.error(`[checkPrices] Ошибка проверки ${itemId}:`, error);
        
        try {
          if (tab) {
            console.log(`[checkPrices] Закрываем вкладку ${tab.id}`);
            await browser.tabs.remove(tab.id);
          }
        } catch (e) {
          console.error('[checkPrices] Ошибка при закрытии вкладки:', e);
        }
      }
    }
  } catch (error) {
    console.error('[checkPrices] Ошибка в checkPrices:', error);
  }
  console.log('\n========== [checkPrices] ЗАВЕРШЕНИЕ ПРОВЕРКИ ==========\n');
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  console.log(`[contextMenus] Клик по меню: ${info.menuItemId}`);
  
  if (info.menuItemId === "seetoprice") {
    console.log('[contextMenus] Добавление товара в отслеживание');
    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        action: "getPriceData"
      });

      console.log('[contextMenus] Ответ от content script:', response);

      if (!response || !response.selector || !response.price) {
        throw new Error("Не удалось определить элемент с ценой");
      }

      const { selector, price } = response;
      console.log(`[contextMenus] Селектор: "${selector}", цена: "${price}"`);
      
      const currency = detectCurrency(price);
      const currencySymbol = getCurrencySymbol(currency);
      const normalizedPrice = normalizePrice(price);
      console.log(`[contextMenus] Валюта: "${currency}", символ: "${currencySymbol}", нормализованная цена: "${normalizedPrice}"`);

      const domain = new URL(tab.url).hostname;
      const itemId = `${domain}_${Date.now()}`;
      console.log(`[contextMenus] ID товара: "${itemId}"`);

      const newItem = {
        url: tab.url,
        selector,
        originalPrice: normalizedPrice +' '+ currencySymbol,
        currentPrice: normalizedPrice + ' '+currencySymbol,
        currency: currency,
        lastChecked: Date.now(),
        priceHistory: []
      };
      console.log(`[contextMenus] Сохраняемый товар:`, newItem);

      if (domain.includes('ozon.ru')) {
        console.log('[contextMenus] Проверка скидки Ozon');
        try {
          const discountCheck = await browser.tabs.sendMessage(tab.id, {
            action: "checkOzonDiscount"
          });
          
          console.log('[contextMenus] Результат проверки скидки:', discountCheck);
          
          if (discountCheck && discountCheck.exists) {
            const text = discountCheck.text || '';
            
            if (text.includes('Скидка одобрена')) {
              newItem.discountStatus = 'approved';
              newItem.discountAvailable = false;
              newItem.discountRequested = false;
            } else if (text.includes('Скидка отклонена')) {
              newItem.discountStatus = 'rejected';
              newItem.discountAvailable = false;
              newItem.discountRequested = false;
            } else if (text.includes('%') || text.includes('—')) {
              newItem.discountStatus = 'pending';
              newItem.discountAvailable = false;
              newItem.discountRequested = true;
            } else if (text.includes('Скидка запрошена')) {
              newItem.discountStatus = 'requested';
              newItem.discountAvailable = false;
              newItem.discountRequested = true;
            } else if (text.includes('Хочу скидку')) {
              newItem.discountStatus = 'available';
              newItem.discountAvailable = true;
              newItem.discountRequested = false;
            }
            console.log(`[contextMenus] Статус скидки: "${newItem.discountStatus}"`);
          }
        } catch (e) {
          console.log('[contextMenus] Не удалось проверить скидку при добавлении:', e.message);
        }
      }

      await browser.storage.local.set({ [itemId]: newItem });
      console.log('[contextMenus] Товар сохранен в хранилище');

      const notificationId = await browser.notifications.create({
        type: "basic",
        title: "✅ Начато отслеживание",
        message: `Цена: ${normalizedPrice} ${currencySymbol}\nМагазин: ${domain}`,
        iconUrl: "icons/icon48.png"
      });
      
      setTimeout(() => {
        browser.notifications.clear(notificationId);
      }, 3000);

    } catch (error) {
      console.error('[contextMenus] Ошибка при добавлении товара:', error);
      browser.notifications.create({
        type: "basic",
        title: "❌ Ошибка",
        message: error.message || "Не удалось добавить товар",
        iconUrl: "icons/icon48.png"
      });
    }
    return;
  }
  
  if (info.menuItemId === "ozon-discount") {
    console.log('[contextMenus] Запрос скидки Ozon');
    try {
      const result = await browser.tabs.sendMessage(tab.id, {
        action: "clickOzonDiscount"
      });
      
      console.log('[contextMenus] Результат клика по скидке:', result);
      
      if (result && result.success) {
        browser.notifications.create({
          type: "basic",
          title: "Скидка запрошена",
          message: "Кнопка 'Хочу скидку' нажата. Статус обновится при следующей проверке.",
          iconUrl: "icons/icon48.png"
        });
        
        const items = await browser.storage.local.get();
        for (const [itemId, item] of Object.entries(items)) {
          if (itemId !== "settings" && item.url === tab.url) {
            console.log(`[contextMenus] Обновляем статус скидки для ${itemId}`);
            await browser.storage.local.set({
              [itemId]: {
                ...item,
                discountStatus: 'requested',
                discountAvailable: false,
                discountRequested: true
              }
            });
            break;
          }
        }
        
      } else {
        browser.notifications.create({
          type: "basic",
          title: "❌ Ошибка",
          message: result?.error || "Не удалось нажать кнопку скидки",
          iconUrl: "icons/icon48.png"
        });
      }
    } catch (error) {
      console.error('[contextMenus] Ошибка при запросе скидки:', error);
      browser.notifications.create({
        type: "basic",
        title: "❌ Ошибка",
        message: error.message || "Не удалось запросить скидку",
        iconUrl: "icons/icon48.png"
      });
    }
  }
});

async function updatePrice(itemId, newPrice, previousPrice = null, historylen) {
  console.log(`[updatePrice] Начало обновления цены для ${itemId}`);
  console.log(`[updatePrice] Новая цена: "${newPrice}"`);
  console.log(`[updatePrice] История: ${historylen}`);
  
  try {
    const result = await browser.storage.local.get(itemId);
    const item = result[itemId];
    
    if (!item) {
      console.log(`[updatePrice] Товар ${itemId} не найден в хранилище`);
      return;
    }
    
    console.log(`[updatePrice] Текущие данные товара:`, {
      currentPrice: item.currentPrice,
      originalPrice: item.originalPrice,
      currency: item.currency
    });
    
    const currency = detectCurrency(newPrice);
    const originalPrice = item.originalPrice;
    
    // Получаем числовые значения для сравнения
    const originalPriceNum = parseFloat(originalPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    const newPriceNum = parseFloat(newPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    
    console.log(`[updatePrice] Числовые значения: Оригинал: ${originalPriceNum}, Новая: ${newPriceNum}`);
    console.log(`[updatePrice] Цена ${originalPriceNum >= newPriceNum ? 'снизилась' : 'повысилась'}`);
    
    let updateData;
    if (originalPriceNum >= newPriceNum) {
      updateData = {
        ...item,
        currentPrice: newPrice,
        currency: currency,
        lastChecked: Date.now(),
        hasNewChange: true,
        priceHistory: [...(item.priceHistory || []).slice(-historylen), 
          { price: '-' + newPrice, timestamp: Date.now() }]
      };
      console.log(`[updatePrice] Цена снизилась, добавляем в историю со знаком "-"`);
    } else {
      updateData = {
        ...item,
        currentPrice: newPrice,
        currency: currency,
        lastChecked: Date.now(),
        hasNewChange: true,
        priceHistory: [...(item.priceHistory || []).slice(-historylen), 
          { price: '+' + newPrice, timestamp: Date.now() }]
      };
      console.log(`[updatePrice] Цена повысилась, добавляем в историю со знаком "+"`);
    }

    if (item.discountStatus) {
      updateData.discountStatus = item.discountStatus;
      updateData.discountAvailable = item.discountAvailable;
      updateData.discountRequested = item.discountRequested;
      console.log(`[updatePrice] Сохраняем статус скидки: ${item.discountStatus}`);
    }

    if (previousPrice) {
      updateData.previousPrice = previousPrice;
      console.log(`[updatePrice] Предыдущая цена: ${previousPrice}`);
    }

    await browser.storage.local.set({ [itemId]: updateData });
    console.log(`[updatePrice] Цена успешно обновлена для ${itemId}`);
    
  } catch (error) {
    console.error('[updatePrice] Ошибка:', error);
  }
}

async function sendPriceAlert(item, newPrice, tgToken, tgId) {
  console.log(`[sendPriceAlert] Отправка оповещения о смене цены`);
  console.log(`[sendPriceAlert] URL: ${item.url}`);
  console.log(`[sendPriceAlert] Старая цена: ${item.originalPrice}, Новая: ${newPrice}`);
  
  try {
    browser.browserAction.setIcon({
      path: {
        "48": "icons/icon48_alert.png"
      }
    });
    
    if (tgToken && tgId) {
      console.log('[sendPriceAlert] Отправка в Telegram');
      const message = 'Магазин: ' + item.url + '\nБыло: ' + item.originalPrice + '\nСтало: ' + newPrice;
      sendTelegramMessage(message, tgToken, tgId)
        .then(() => console.log('[sendPriceAlert] Сообщение в Telegram отправлено'))
        .catch(error => console.error('[sendPriceAlert] Ошибка Telegram:', error.message));
    } else {
      console.log('[sendPriceAlert] Telegram не настроен, пропускаем');
    }
    
    const notificationId = await browser.notifications.create({
      type: "basic",
      title: "Цена изменилась!",
      message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
      iconUrl: "icons/icon48.png"
    });
    console.log(`[sendPriceAlert] Уведомление создано, ID: ${notificationId}`);
    
    setTimeout(() => {
      browser.notifications.clear(notificationId);
      console.log(`[sendPriceAlert] Уведомление ${notificationId} закрыто`);
    }, 2000);
  } catch (error) {
    console.error('[sendPriceAlert] Ошибка:', error);
  }
}

browser.alarms.create("priceCheck", { periodInMinutes: 10 }); 
 console.log('[BACKGROUND] Аларм "priceCheck" создан с интервалом 10 минуты');

browser.alarms.onAlarm.addListener((alarm) => {
  console.log(`[alarm] Сработал аларм: ${alarm.name}`);
  if (alarm.name === "priceCheck") {
    checkPrices();
  }
});

browser.runtime.onMessage.addListener((message) => {
  console.log(`[runtime] Получено сообщение:`, message);
  if (message.action === "updateInterval") {
    console.log(`[runtime] Обновление интервала проверки на ${message.interval} минут`);
    browser.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
  }
});

function handleError(error) {
  console.error("[handleError] Ошибка:", error);
  browser.notifications.create({
    type: "basic",
    title: "❌ Ошибка",
    message: error.message ? error.message.substring(0, 100) : 'Неизвестная ошибка',
    iconUrl: "icons/icon48.png"
  });
}

console.log('[BACKGROUND] Скрипт полностью загружен и инициализирован');
