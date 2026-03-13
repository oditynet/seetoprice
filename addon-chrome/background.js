// background.js для Chrome

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "seetoprice",
    title: "Отслеживать цену",
    contexts: ["all"]
  });
});

// Функция для определения валюты
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
  
  // Удаляем все виды пробелов, сохраняем запятые и точки
  let normalized = priceText
    .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
    .replace(/[^\d.,-]/g, '');
  
  // Находим число с запятой (может быть с точкой или без)
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

function parseOzonPrice() {
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

    return {
      price: currentPrice,
      previousPrice: previousPrice,
      currency: currency || 'RUB'
    };
  } catch (e) {
    console.error('Ozon parse error:', e);
    return null;
  }
}

function parseVseinstrumentiPrice() {
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
  // Копируем необходимые функции внутрь выполняемого скрипта
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

  // Основная функция парсинга Wildberries
  try {
    console.log('Парсинг Wildberries...');
    
    // Приоритетные селекторы для поиска цены
    const priceSelectors = [
      // Основная финальная цена (самый надежный селектор)
      'ins.price-block__final-price',
      '.price-block__final-price',
      // Цена со скидкой (обычно отображается крупно)
      '.price-block__wallet span',
      '.price-block__wallet',
      // Общий блок с ценами
      '.price-block',
      // Альтернативные селекторы
      '[class*="final-price"]',
      '[class*="price-block"] span:not([class*="old"]):not([class*="sale"])'
    ];

    // Пробуем найти цену по приоритетным селекторам
    let priceElement = null;
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent || element.innerText;
        // Проверяем, что текст содержит число и символ валюты
        if (text && /\d/.test(text) && /[₽$€₸]/.test(text)) {
          // Проверяем, что это не старая цена (зачеркнутая или с классом old)
          if (!element.matches('[class*="old"], del, s, [class*="sale"]')) {
            priceElement = element;
            console.log('Найден элемент цены по селектору:', selector, text);
            break;
          }
        }
      }
    }

    // Если не нашли по селекторам, ищем в блоках с ценами
    if (!priceElement) {
      console.log('Поиск цены в блоках...');
      const priceBlocks = document.querySelectorAll('[class*="price-block"], [class*="PriceBlock"]');
      
      for (const block of priceBlocks) {
        // Ищем все числа в блоке
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
        
        // Если нашли числа, берем самое большое (основная цена)
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
    }

    // Если нашли элемент с ценой
    if (priceElement) {
      const priceText = priceElement.textContent || priceElement.innerText;
      const priceMatch = priceText.match(/(\d[\d\s]*)\s*[₽$€₸]/);
      
      if (priceMatch) {
        const currency = detectCurrency(priceText);
        const price = normalizePrice(priceMatch[0]);
        
        console.log('Успешно распарсена цена:', price, currency);
        
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

async function checkPrices() {
  try {
    const items = await chrome.storage.local.get();
    let historylen;
    let tgToken;
    let tgId;
    
    for (const [itemId, item] of Object.entries(items)) {
      try {
        if (itemId === "settings") {
          historylen = item.checkHistory;
          tgToken = item.tgToken;
          tgId = item.tgId;
          continue; 
        }

        if (!item || !item.url) {
          continue;
        }

        const tab = await chrome.tabs.create({
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

        // Даем время на выполнение JavaScript
        await new Promise(resolve => setTimeout(resolve, 3000));

        const url = new URL(item.url);
        let priceData = null;

        if (url.hostname.includes('ozon.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseOzonPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('wildberries.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseWildberriesPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('vseinstrumenti.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseVseinstrumentiPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.price) {
            const finalPrice = priceData.price + ' ₽';
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          }
          await chrome.tabs.remove(tab.id);
          continue;
          
        } else if (url.hostname.includes('lemanapro.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseLemanaproPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('petrovich.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parsePetrovichPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('auto.ru')) {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: parseAutoRuPrice
          });
          priceData = results[0]?.result;
          
          if (priceData && priceData.currency !== item.currency) {
            await chrome.tabs.remove(tab.id);
            continue;
          }
          
        } else {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (selector) => {
              const element = document.querySelector(selector);
              if (element) {
                const priceText = element.textContent;
                const currency = detectCurrency(priceText);
                return {
                  price: normalizePrice(priceText),
                  currency: currency
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
            await updatePrice(itemId, finalPrice, previousPrice, historylen);
            sendPriceAlert(item, finalPrice, tgToken, tgId);
          }
        }

      } catch (error) {
        console.error(`Ошибка проверки ${itemId}:`, error);
      }
    }
  } catch (error) {
    console.error('Ошибка в checkPrices:', error);
  }
}

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

    await chrome.storage.local.set({
      [itemId]: {
        url: tab.url,
        selector: response.selector,
        originalPrice: normalizedPrice + ' ' + currencySymbol,
        currentPrice: normalizedPrice + ' ' + currencySymbol,
        currency: currency,
        lastChecked: Date.now(),
        priceHistory: []
      }
    });

    const notificationId = await chrome.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${normalizedPrice} ${currencySymbol}\nМагазин: ${domain}\nВалюта: ${currency}`,
      iconUrl: "icons/icon48.png"
    });

    setTimeout(() => {
      chrome.notifications.clear(notificationId);
    }, 2000);

  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    handleError(error);
  }
});

async function updatePrice(itemId, newPrice, previousPrice = null, historylen) {
  try {
    const result = await chrome.storage.local.get(itemId);
    const item = result[itemId];
    
    if (!item) {
      return;
    }
    
    const currency = item.currency || 'RUB';
    const originalPrice = item.originalPrice; 
    let updateData;
    
    const originalPriceNum = parseFloat(originalPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    const newPriceNum = parseFloat(newPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    
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

// Таймер автообновления
chrome.alarms.create("priceCheck", { periodInMinutes: 10 });
chrome.alarms.onAlarm.addListener(checkPrices);

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    chrome.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
  }
});

function handleError(error) {
  console.error("Ошибка:", error);
  chrome.notifications.create({
    type: "basic",
    title: "Ошибка",
    message: error.message ? error.message.substring(0, 100) : 'Неизвестная ошибка',
    iconUrl: "icons/icon48.png"
  });
}
