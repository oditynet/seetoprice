// background.js

// ========== НАСТРОЙКИ ОТЛАДКИ ==========
const DEBUG = 0;  // 1 - показывать логи, 0 - скрыть логи
// =====================================

if (DEBUG !== 1) {
  console.log = function() {};
  console.debug = function() {};
  console.info = function() {};
}


console.log('[BACKGROUND] Скрипт загружен');

browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]  
});


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
// ----- ТАКИХ 2 функции 3 клона тут Потому что функции, которые выполняются через browser.tabs.executeScript(), работают в изолированном контексте веб-страницы, а не в контексте расширения.
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом')) return 'KGS';
    if (priceText.includes('сум') || priceText.includes('UZS')) return 'UZS';
    if (priceText.includes('с.')) return 'TJS';
    if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
    if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
    if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
    if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
    if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
    if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
    if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
    if (priceText.includes('₪')) return 'ILS';
    if (priceText.includes('₼')) return 'AZN';
    if (priceText.includes('₾')) return 'GEL';
    return 'RUB';
  }
  
  function normalizePrice(priceText) {
    if (!priceText) return null;
    let normalized = priceText
      .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
      .replace(/[^\d.,-]/g, '');
    const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
    if (priceMatch) {
      normalized = priceMatch[0];
    }
    return normalized;
  }
  // ========== КОНЕЦ ВНУТРЕННИХ ФУНКЦИИ==========
  
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


async function getWilbPrice(document) {
  // ========== ВНУТРЕННИЕ ФУНКЦИИ ==========
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом')) return 'KGS';
    if (priceText.includes('сум') || priceText.includes('UZS')) return 'UZS';
    if (priceText.includes('с.')) return 'TJS';
    if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
    if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
    if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
    if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
    if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
    if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
    if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
    if (priceText.includes('₪')) return 'ILS';
    if (priceText.includes('₼')) return 'AZN';
    if (priceText.includes('₾')) return 'GEL';
    return 'RUB';
  }
  
  function normalizePrice(priceText) {
    if (!priceText) return null;
    let normalized = priceText
      .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
      .replace(/[^\d.,-]/g, '');
    const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
    if (priceMatch) {
      normalized = priceMatch[0];
    }
    return normalized;
  }
  // ========== КОНЕЦ ВНУТРЕННИХ ФУНКЦИЙ ==========
  
  console.log('[getWilbPrice] Начинаем парсинг Wildberries');
  console.log('[getWilbPrice] URL:', document.location.href);
  
  // Функции поиска
  const findWalletPrice = () => {
    const walletPriceElement = document.querySelector('.priceBlockWalletPrice--RJGuT h2');
    if (walletPriceElement) {
      const priceText = walletPriceElement.textContent.trim();
      if (priceText && /\d/.test(priceText)) {
        console.log(`[getWilbPrice] ✅ Цена WB Кошелька: "${priceText}"`);
        return { 
          price: normalizePrice(priceText), 
          currency: detectCurrency(priceText)
        };
      }
    }
    return null;
  };
  
  const findRegularPrice = () => {
    const selectors = [
      '.priceBlockFinalPrice--iToZR',
      'ins.priceBlockFinalPrice--iToZR',
      '[class*="priceBlockFinalPrice"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        if (priceText && /\d/.test(priceText)) {
          const isWalletPrice = element.closest('.priceBlockWalletPrice--RJGuT');
          if (!isWalletPrice) {
            console.log(`[getWilbPrice] ✅ Обычная цена: "${priceText}"`);
            return { 
              price: normalizePrice(priceText), 
              currency: detectCurrency(priceText)
            };
          }
        }
      }
    }
    return null;
  };
  
  const findSinglePrice = () => {
    const selectors = [
      '.priceBlockFinalPrice--iToZR',
      'ins[class*="priceBlockFinalPrice"]'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent.trim();
        if (priceText && /\d/.test(priceText)) {
          console.log(`[getWilbPrice] ✅ Одиночная цена: "${priceText}"`);
          return { 
            price: normalizePrice(priceText), 
            currency: detectCurrency(priceText)
          };
        }
      }
    }
    return null;
  };
  
  // ========== ОСНОВНАЯ ЛОГИКА ==========
  
  // 1. Сначала ищем цену WB Кошелька
  let result = findWalletPrice();
  if (result) {
    console.log('[getWilbPrice] Цена WB Кошелька найдена сразу');
    return result;
  }
  
  // 2. Ждем появления цены WB Кошелька (до 15 секунд)
  console.log('[getWilbPrice] Ждем появление цены WB Кошелька...');
  for (let i = 0; i < 75; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findWalletPrice();
    if (result) {
      console.log(`[getWilbPrice] ✅ Цена WB Кошелька найдена через ${(i+1)*200}мс`);
      return result;
    }
  }
  
  // 3. Если WB Кошелька нет — ищем обычную цену
  console.log('[getWilbPrice] Ищем обычную цену...');
  result = findRegularPrice();
  if (result) {
    console.log('[getWilbPrice] Используем обычную цену');
    return result;
  }
  
  // 4. Ждем обычную цену (до 6 секунд)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findRegularPrice();
    if (result) {
      console.log(`[getWilbPrice] Обычная цена найдена через ${(i+1)*200}мс`);
      return result;
    }
  }
  
  // 5. Ищем одиночную цену
  console.log('[getWilbPrice] Ищем одиночную цену...');
  result = findSinglePrice();
  if (result) {
    console.log('[getWilbPrice] Используем одиночную цену');
    return result;
  }
  
  // 6. Ждем одиночную цену (до 6 секунд)
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200));
    result = findSinglePrice();
    if (result) {
      console.log(`[getWilbPrice] Одиночная цена найдена через ${(i+1)*200}мс`);
      return result;
    }
  }
  
  console.log('[getWilbPrice] ❌ Цена не найдена');
  return { price: null, currency: null };
}

async function checkPrices() {
  console.log('\n========== [checkPrices] НАЧАЛО ПРОВЕРКИ ==========');
  
  try {
    const items = await browser.storage.local.get();
    console.log(`[checkPrices] Загружено элементов из хранилища: ${Object.keys(items).length}`);
    
    let historylen;
    let tgToken;
    let tgId;
    
    for (const [itemId, item] of Object.entries(items)) {
      let tab = null;
      
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
        
        tab = await browser.tabs.create({
          url: item.url,
          active: false
        });
        console.log(`[checkPrices] Вкладка создана, ID: ${tab.id}`);

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
          
          // Обновляем статус скидки в хранилище
          if (priceData && priceData.discountStatus) {
            console.log(`[checkPrices] Обновляем статус скидки: "${priceData.discountStatus}" для ${itemId}`);
            const currentItem = await browser.storage.local.get(itemId);
            const updatedItem = {
              ...currentItem[itemId],
              discountStatus: priceData.discountStatus,
              discountAvailable: priceData.discountStatus === 'available',
              discountRequested: priceData.discountStatus === 'requested' || priceData.discountStatus === 'pending'
            };
            await browser.storage.local.set({ [itemId]: updatedItem });
            console.log(`[checkPrices] ✅ Статус скидки обновлен на: ${priceData.discountStatus}`);
          }
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает: ${priceData.currency} vs ${item.currency}, пропускаем`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency);
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
        
        
// ========== НАСТРОЙКА БЛОКИРОВКИ РЕСУРСОВ ==========
  try {
    console.log('[checkPrices] Настройка блокировки ресурсов для Wildberries');
    
    const listener = (details) => {
    
    if (details.tabId !== tab.id) {
      return {}; // не блокируем другие вкладки
    }
      const url = details.url;
      
        if (url.includes('card.wb.ru') || url.includes('__internal/card')) {
    console.log(`[checkPrices] ✅ РАЗРЕШАЕМ API: ${url.substring(0, 80)}...`);
    return {};
  }
  
  // Разрешаем основной HTML и JS (обязательно)
  if (details.type === "main_frame" || details.type === "script") {
    console.log(`[checkPrices] ✅ РАЗРЕШАЕМ JS/HTML: ${url.substring(0, 80)}...`);
    return {};
  }
      
      // Блокируем аналитику
      if (url.includes('a.wb.ru')) {
        console.log(`[checkPrices] Блокируем аналитику: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем хранилище пользователя
      if (url.includes('user-storage-01dl.wb.ru')) {
        console.log(`[checkPrices] Блокируем user-storage: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем чаты
      if (url.includes('chat-prod.wildberries.ru') || url.includes('chat.wildberries.ru')) {
        console.log(`[checkPrices] Блокируем чат: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем изображения
      if (details.type === "image") {
        console.log(`[checkPrices] Блокируем изображение: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем CSS
     /* if (details.type === "stylesheet") {
        console.log(`[checkPrices] Блокируем CSS: ${url}`);
        return { cancel: true };
      }*/
      
      // Блокируем шрифты
      if (details.type === "font") {
        console.log(`[checkPrices] Блокируем шрифт: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем медиа
      if (details.type === "media") {
        console.log(`[checkPrices] Блокируем медиа: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем вебсокеты
      if (details.type === "websocket") {
        console.log(`[checkPrices] Блокируем websocket: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем SVG
      if (url.includes('.svg') || url.includes('data:image/svg')) {
        console.log(`[checkPrices] Блокируем SVG: ${url}`);
        return { cancel: true };
      }
      
      // Блокируем медиафайлы по расширению
      if (url.match(/\.(webp|png|jpg|jpeg|gif|ico|woff2?|ttf|eot)(\?|$)/i)) {
        console.log(`[checkPrices] Блокируем медиафайл: ${url}`);
        return { cancel: true };
      }
      
      // Разрешаем остальное
      console.log(`[checkPrices] Разрешаем: ${url.substring(0, 100)}...`);
      return {};
    };
    
    browser.webRequest.onBeforeRequest.addListener(
      listener,
      { 
        urls: [
          "*://*.wildberries.ru/*",
          "*://*.wbbasket.ru/*", 
          "*://*.wbstatic.net/*",
          "*://*.wbservice.ru/*"
        ] 
      },
      ["blocking"]
    );
    
    tab.blockingListener = listener;
    
  } catch (blockError) {
    console.error('[checkPrices] Ошибка настройки блокировки:', blockError);
          
}
        
        
        
        
        
        
        
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
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
            const finalPrice = priceData.price + ' ' + currencySymbol;
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
  // ========== ВНУТРЕННИЕ ФУНКЦИИ (обязательно!) ==========
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом')) return 'KGS';
    if (priceText.includes('сум') || priceText.includes('UZS')) return 'UZS';
    if (priceText.includes('с.')) return 'TJS';
    if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
    if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
    if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
    if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
    if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
    if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
    if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
    if (priceText.includes('₪')) return 'ILS';
    if (priceText.includes('₼')) return 'AZN';
    if (priceText.includes('₾')) return 'GEL';
    return 'RUB';
  }
  
  function normalizePrice(priceText) {
    if (!priceText) return null;
    let normalized = priceText
      .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
      .replace(/[^\d.,-]/g, '');
    const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
    if (priceMatch) {
      normalized = priceMatch[0];
    }
    return normalized;
  }
  // ========== КОНЕЦ ВНУТРЕННИХ ФУНКЦИЙ ==========



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
      console.log('[contextMenus] Уведомление создано, ID:', notificationId)
      
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
  // ========== ВНУТРЕННИЕ ФУНКЦИИ (обязательно!) ==========
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом')) return 'KGS';
    if (priceText.includes('сум') || priceText.includes('UZS')) return 'UZS';
    if (priceText.includes('с.')) return 'TJS';
    if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
    if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
    if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
    if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
    if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
    if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
    if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
    if (priceText.includes('₪')) return 'ILS';
    if (priceText.includes('₼')) return 'AZN';
    if (priceText.includes('₾')) return 'GEL';
    return 'RUB';
  }
  
  function normalizePrice(priceText) {
    if (!priceText) return null;
    let normalized = priceText
      .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
      .replace(/[^\d.,-]/g, '');
    const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
    if (priceMatch) {
      normalized = priceMatch[0];
    }
    return normalized;
  }
  // ========== КОНЕЦ ВНУТРЕННИХ ФУНКЦИЙ ==========




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
  
  if (message.action === "priceFound") {
    console.log(`[PriceHunter] Найдена цена в JS: ${message.data.price} ₽ (${message.data.priceType})`);
    console.log(`[PriceHunter] URL запроса: ${message.data.url}`);
  }
  
  if (message.action === "bestPriceFound") {
    console.log(`[PriceHunter] 🏆 ЛУЧШАЯ ЦЕНА: ${message.price} ₽ для товара ${message.nmId}`);
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

