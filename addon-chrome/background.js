// background.js для Chrome (полностью рабочий)

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "seetoprice",
    title: "Отслеживать цену",
    contexts: ["all"]
  });
});

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (для background) ==========

function detectCurrency(priceText) {
  if (!priceText) return 'RUB';
  
  if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
  if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
  if (priceText.includes('₸')) return 'KZT';
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
  if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
  if (priceText.includes('сом') || priceText.includes('с')) return 'KGS';
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

function getCurrencySymbol(currency) {
  const symbols = {
    'RUB': '₽',
    'BYN': 'BYN', 
    'KZT': '₸',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏',
    'KGS': 'с',
    'UZS': 'UZS',
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
  return symbols[currency] || '₽';
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

async function sendTelegramMessage(text, tgToken, tgId) {
  if (!tgToken || !tgId) {
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
      throw new Error(data.description || 'Unknown Telegram API error');
    }

    return data;
  } catch (error) {
    console.error('Telegram send error:', error);
    throw error;
  }
}

// ========== ФУНКЦИИ ПАРСИНГА (выполняются в контексте страницы) ==========

function parseOzonPrice() {
  // ВСЕ вспомогательные функции ОБЯЗАТЕЛЬНО внутри!
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом') || priceText.includes('с')) return 'KGS';
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

  try {
    const priceElement = document.querySelector('[data-widget="webPrice"] span');
    const oldPriceElement = document.querySelector('[data-widget="webOldPrice"] span');
    
    let currentPrice = null;
    let previousPrice = null;
    let currency = null;

    if (priceElement) {
      const rawPrice = priceElement.textContent;
      currentPrice = normalizePrice(rawPrice);
      currency = detectCurrency(rawPrice);
    }

    if (oldPriceElement) {
      const rawOldPrice = oldPriceElement.textContent;
      previousPrice = normalizePrice(rawOldPrice);
      if (!currency) {
        currency = detectCurrency(rawOldPrice);
      }
    }

    // Проверка статуса скидки
    const discountWidget = document.querySelector('[data-widget="foundCheaperText"]');
    let discountStatus = null;
    
    if (discountWidget) {
      const widgetText = discountWidget.textContent || '';
      if (widgetText.includes('Скидка одобрена')) discountStatus = 'approved';
      else if (widgetText.includes('Скидка отклонена')) discountStatus = 'rejected';
      else if (widgetText.includes('%') || widgetText.includes('—')) discountStatus = 'pending';
      else if (widgetText.includes('Скидка запрошена')) discountStatus = 'requested';
      else if (widgetText.includes('Хочу скидку')) discountStatus = 'available';
    }

    return {
      price: currentPrice,
      previousPrice: previousPrice,
      currency: currency || 'RUB',
      discountStatus: discountStatus
    };
  } catch (e) {
    console.error('Ozon parse error:', e);
    return null;
  }
}

function parseVseinstrumentiPrice() {
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

  try {
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
        if (priceText && /\d/.test(priceText)) {
          currentPrice = normalizePrice(priceText);
          break;
        }
      }
    }

    return {
      price: currentPrice,
      currency: 'RUB'
    };
  } catch (e) {
    console.error('Vseinstrumenti parse error:', e);
    return null;
  }
}

function parseLemanaproPrice() {
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

  try {
    const priceElement = document.querySelector('.product-price__current, .price, .product-card-price');
    
    let currentPrice = null;
    
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText;
      const priceMatch = priceText.match(/([\d\s,]+)₽/);
      if (priceMatch) {
        currentPrice = normalizePrice(priceMatch[1]);
      } else {
        currentPrice = normalizePrice(priceText);
      }
    }

    return {
      price: currentPrice,
      currency: 'RUB'
    };
  } catch (e) {
    console.error('Lemanapro parse error:', e);
    return null;
  }
}

function parsePetrovichPrice() {
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

  try {
    const priceElements = document.querySelectorAll('.price, .product-price, [class*="price"]');
    
    let currentPrice = null;
    
    for (const element of priceElements) {
      const priceText = element.textContent || element.innerText;
      if (priceText.includes('₽') && /\d/.test(priceText)) {
        const priceMatch = priceText.match(/([\d\s,]+)₽/);
        if (priceMatch) {
          currentPrice = normalizePrice(priceMatch[1]);
          break;
        }
      }
    }

    if (!currentPrice) {
      const cardPriceElement = document.querySelector('.price-card, .product-card-price');
      if (cardPriceElement) {
        const priceText = cardPriceElement.textContent || cardPriceElement.innerText;
        currentPrice = normalizePrice(priceText);
      }
    }

    return {
      price: currentPrice,
      currency: 'RUB'
    };
  } catch (e) {
    console.error('Petrovich parse error:', e);
    return null;
  }
}

function parseAutoRuPrice() {
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
      for (const element of elements) {
        const priceText = element.textContent || element.innerText;
        
        if (priceText.includes('₽') && /\d/.test(priceText)) {
          const priceMatch = priceText.match(/([\d\s,]+)₽/);
          if (priceMatch) {
            currentPrice = normalizePrice(priceMatch[1]);
            break;
          }
        }
      }
      if (currentPrice) break;
    }

    return {
      price: currentPrice,
      currency: 'RUB'
    };
  } catch (e) {
    console.error('Auto.ru parse error:', e);
    return null;
  }
}

function parseWildberriesPrice() {
  // ВСЕ вспомогательные функции ОБЯЗАТЕЛЬНО внутри!
  function detectCurrency(priceText) {
    if (!priceText) return 'RUB';
    if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
    if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
    if (priceText.includes('₸')) return 'KZT';
    if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
    if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
    if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
    if (priceText.includes('сом') || priceText.includes('с')) return 'KGS';
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

  try {
    // ПРОВЕРКА НА БЛОКИРОВКУ VPN
    if (document.querySelector('.blockedPage--rnFSU')) {
      console.log('⚠️ [WB] Обнаружена блокировка VPN!');
      return { vpnBlocked: true };
    }

    console.log('Парсинг Wildberries...');
    
    // Приоритетные селекторы для поиска цены
    const priceSelectors = [
      'ins.price-block__final-price',
      '.price-block__final-price',
      '.price-block__wallet span',
      '.price-block__wallet',
      '.price-block',
      '[class*="final-price"]'
    ];

    let priceElement = null;
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        if (text && /\d/.test(text) && /[₽$€₸]/.test(text)) {
          if (!element.matches('[class*="old"], del, s, [class*="sale"]')) {
            priceElement = element;
            console.log('Найден элемент цены по селектору:', selector, text);
            break;
          }
        }
      }
    }

    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText;
      const currency = detectCurrency(priceText);
      const price = normalizePrice(priceText);
      
      console.log('Успешно распарсена цена:', price, currency);
      
      return {
        price: price,
        currency: currency
      };
    }

    // Если не нашли по селекторам, ищем в блоках с ценами
    console.log('Поиск цены в блоках...');
    const priceBlocks = document.querySelectorAll('[class*="price-block"], [class*="PriceBlock"]');
    
    for (const block of priceBlocks) {
      const numbers = [];
      const text = block.textContent || block.innerText;
      const matches = text.match(/(\d[\d\s]*)\s*[₽$€₸]/g);
      
      if (matches) {
        for (const match of matches) {
          const numMatch = match.match(/(\d[\d\s]*)/);
          if (numMatch) {
            const num = parseInt(numMatch[1].replace(/\s/g, ''));
            numbers.push({ num, text: match });
          }
        }
      }
      
      if (numbers.length > 0) {
        numbers.sort((a, b) => b.num - a.num);
        const mainPrice = numbers[0].text;
        const currency = detectCurrency(mainPrice);
        const price = normalizePrice(mainPrice);
        
        console.log('Найдена основная цена:', mainPrice);
        
        return {
          price: price,
          currency: currency
        };
      }
    }

    console.log('Цена не найдена');
    return null;

  } catch (error) {
    console.error('Ошибка парсинга Wildberries:', error);
    return null;
  }
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ПРОВЕРКИ ==========

async function checkPrices() {
  try {
    const items = await chrome.storage.local.get();
    let historylen = 5;
    let tgToken = '';
    let tgId = '';
    
    for (const [itemId, item] of Object.entries(items)) {
      let tab = null;

      try {
        if (itemId === "settings") {
          historylen = item.checkHistory || 5;
          tgToken = item.tgToken || '';
          tgId = item.tgId || '';
          continue; 
        }

        if (!item || !item.url) {
          continue;
        }

        console.log(`[checkPrices] Проверка: ${item.url}`);

        tab = await chrome.tabs.create({
          url: item.url,
          active: false
        });

        await new Promise(resolve => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          });
        });

        await new Promise(resolve => setTimeout(resolve, 3000));

        const url = new URL(item.url);
        let priceData = null;

        // ========== ПАРСИНГ ПО САЙТАМ ==========

        if (url.hostname.includes('ozon.ru')) {
          console.log('[checkPrices] Сайт: Ozon.ru');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseOzonPrice
          });
          priceData = results[0]?.result;
          console.log('[checkPrices] Данные Ozon:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            console.log(`[checkPrices] Валюта не совпадает, пропускаем`);
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('wildberries.ru')) {
          console.log('[checkPrices] Сайт: Wildberries.ru');
          
          // ИНЖЕКЦИЯ КОДА (как в старой версии)
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (document.querySelector('.blockedPage--rnFSU')) {
                return "VPN_BLOCKED";
              }
              
              const priceElements = document.querySelectorAll('ins, [class*="price"]');
              for (const el of priceElements) {
                if (el.querySelector('ins') || el.closest('del, s, strike')) continue;
                const text = el.textContent.trim();
                if (text.includes('₽')) {
                  const cleanText = text.split('₽')[0];
                  const digits = cleanText.replace(/[^\d]/g, '');
                  if (digits && digits.length >= 2 && digits.length <= 7) {
                    return parseInt(digits, 10);
                  }
                }
              }
              return null;
            }
          });
          
          const executedResult = results[0]?.result;
          console.log('[checkPrices] Результат WB:', executedResult);

          if (executedResult === "VPN_BLOCKED") {
            console.log('⚠️ [checkPrices] Wildberries заблокирован VPN!');
            
            chrome.notifications.create('wb-vpn-notification', {
              type: 'basic',
              iconUrl: chrome.runtime.getURL('icons/icon48.png'),
              title: 'Wildberries: Доступ ограничен',
              message: 'Расширение не может проверить цены, так как Wildberries заблокировал страницу. Пожалуйста, выключите VPN.',
              priority: 2
            });

            await chrome.tabs.remove(tab.id);
            continue;
          }

          if (executedResult) {
            const finalPrice = String(executedResult) + ' ₽';
            console.log(`[checkPrices] Цена: "${finalPrice}"`);
            
            if (finalPrice !== item.currentPrice) {
              console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}"`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          } else {
            console.log('[checkPrices] Цена не найдена');
          }

          await chrome.tabs.remove(tab.id);
          continue;
          
        } else if (url.hostname.includes('vseinstrumenti.ru')) {
          console.log('[checkPrices] Сайт: Vseinstrumenti.ru');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseVseinstrumentiPrice
          });
          priceData = results[0]?.result;
          console.log('[checkPrices] Данные Vseinstrumenti:', priceData);
          
        } else if (url.hostname.includes('lemanapro.ru')) {
          console.log('[checkPrices] Сайт: Lemanapro.ru');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseLemanaproPrice
          });
          priceData = results[0]?.result;
          console.log('[checkPrices] Данные Lemanapro:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('petrovich.ru')) {
          console.log('[checkPrices] Сайт: Petrovich.ru');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parsePetrovichPrice
          });
          priceData = results[0]?.result;
          console.log('[checkPrices] Данные Petrovich:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('auto.ru')) {
          console.log('[checkPrices] Сайт: Auto.ru');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseAutoRuPrice
          });
          priceData = results[0]?.result;
          console.log('[checkPrices] Данные Auto.ru:', priceData);
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else {
          console.log('[checkPrices] Сайт: Другой (по селектору)');
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (selector) => {
              function detectCurrency(priceText) {
                if (!priceText) return 'RUB';
                if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
                if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
                if (priceText.includes('₸')) return 'KZT';
                if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
                if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
                if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
                if (priceText.includes('сом') || priceText.includes('с')) return 'KGS';
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
              const element = document.querySelector(selector);
              if (element) {
                const priceText = element.textContent;
                return {
                  price: normalizePrice(priceText),
                  currency: detectCurrency(priceText)
                };
              }
              return null;
            },
            args: [item.selector]
          });
          priceData = results[0]?.result;
        }

        await chrome.tabs.remove(tab.id);

        if (priceData && priceData.price) {
          const currencySymbol = getCurrencySymbol(priceData.currency);
          const finalPrice = priceData.price + ' ' + currencySymbol;
          const previousPrice = priceData.previousPrice ? priceData.previousPrice + ' ' + currencySymbol : null;

          if (finalPrice && finalPrice !== item.currentPrice) {
            console.log(`[checkPrices] Цена изменилась! Было: "${item.currentPrice}", Стало: "${finalPrice}"`);
            await updatePrice(itemId, finalPrice, previousPrice, historylen);
            sendPriceAlert(item, finalPrice, tgToken, tgId);
          }
        }

      } catch (error) {
        console.error(`[checkPrices] Ошибка проверки :`);
        if (tab) {
          try { await chrome.tabs.remove(tab.id); } catch (e) {}
        }
      }
    }
  } catch (error) {
    console.error('[checkPrices] Ошибка:', error);
  }
}
// ========== ОБРАБОТЧИК КОНТЕКСТНОГО МЕНЮ ==========

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "seetoprice") return;

  try {
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: "getPriceData"
      });
    } catch (error) {
      throw new Error("Не удалось загрузить скрипт на страницу. Обновите страницу и попробуйте снова.");
    }

    if (!response || !response.selector || !response.price) {
      throw new Error("Не удалось определить элемент с ценой");
    }

    const currency = detectCurrency(response.price);
    const currencySymbol = getCurrencySymbol(currency);
    const normalizedPrice = normalizePrice(response.price);

    const domain = new URL(tab.url).hostname;
    const itemId = `${domain}_${Date.now()}`;

    // Проверяем статус скидки для Ozon
    let discountStatus = null;
    if (domain.includes('ozon.ru')) {
      try {
        const discountCheck = await chrome.tabs.sendMessage(tab.id, {
          action: "checkOzonDiscount"
        });
        if (discountCheck && discountCheck.exists) {
          const text = discountCheck.text || '';
          if (text.includes('Скидка одобрена')) discountStatus = 'approved';
          else if (text.includes('Скидка отклонена')) discountStatus = 'rejected';
          else if (text.includes('%') || text.includes('—')) discountStatus = 'pending';
          else if (text.includes('Скидка запрошена')) discountStatus = 'requested';
          else if (text.includes('Хочу скидку')) discountStatus = 'available';
        }
      } catch (e) {}
    }

    const newItem = {
      url: tab.url,
      selector: response.selector,
      originalPrice: normalizedPrice + ' ' + currencySymbol,
      currentPrice: normalizedPrice + ' ' + currencySymbol,
      currency: currency,
      lastChecked: Date.now(),
      priceHistory: [],
      discountStatus: discountStatus,
      discountAvailable: discountStatus === 'available',
      discountRequested: discountStatus === 'requested' || discountStatus === 'pending'
    };

    await chrome.storage.local.set({
      [itemId]: newItem
    });

    const notificationId = await chrome.notifications.create({
      type: "basic",
      title: "✅ Начато отслеживание",
      message: `Цена: ${normalizedPrice} ${currencySymbol}\nМагазин: ${domain}`,
      iconUrl: "icons/icon48.png"
    });

    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 3000);

  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    chrome.notifications.create({
      type: "basic",
      title: "❌ Ошибка",
      message: error.message || "Не удалось добавить товар",
      iconUrl: "icons/icon48.png"
    });
  }
});

// ========== ФУНКЦИИ ОБНОВЛЕНИЯ ЦЕНЫ ==========

async function updatePrice(itemId, newPrice, previousPrice = null, historylen) {
  try {
    const result = await chrome.storage.local.get(itemId);
    const item = result[itemId];
    
    if (!item) return;
    
    const currency = item.currency || 'RUB';
    const originalPrice = item.originalPrice; 
    
    const originalPriceNum = parseFloat(originalPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    const newPriceNum = parseFloat(newPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    
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
    }

    if (previousPrice) {
      updateData.previousPrice = previousPrice;
    }

    await chrome.storage.local.set({ [itemId]: updateData });
  } catch (error) {
    console.error('Ошибка в updatePrice:', error);
  }
}

async function sendPriceAlert(item, newPrice, tgToken, tgId) {
  try {
    chrome.action.setIcon({
      path: {
        "48": "icons/icon48_alert.png"
      }
    });
    
    if (tgToken && tgId) {
      sendTelegramMessage('Магазин: ' + item.url + '\nБыло: ' + item.originalPrice + '\nСтало: ' + newPrice, tgToken, tgId)
        .then(() => console.log('Сообщение отправлено'))
        .catch(error => console.error('Ошибка Telegram:', error.message));
    }
    
    const notificationId = await chrome.notifications.create({
      type: "basic",
      title: "Цена изменилась!",
      message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
      iconUrl: "icons/icon48.png"
    });
    
    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 2000);
  } catch (error) {
    console.error('Ошибка в sendPriceAlert:', error);
  }
}

// ========== ОБРАБОТЧИК УВЕДОМЛЕНИЙ ==========

// Закрываем уведомление при клике на него
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId === 'wb-vpn-notification') {
    chrome.notifications.clear(notificationId);
  }
});

// ========== ТАЙМЕР АВТООБНОВЛЕНИЯ ==========

chrome.alarms.create("priceCheck", { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "priceCheck") {
    checkPrices();
  }
});

// ========== ОБРАБОТЧИК СООБЩЕНИЙ ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateInterval") {
    chrome.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
    sendResponse({ success: true });
    return true;
  }
  return false;
});

console.log('[BACKGROUND] Скрипт загружен (Chrome)');
