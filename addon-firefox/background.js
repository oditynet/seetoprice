// background.js
browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]  
});

//browser.contextMenus.create({
//  id: "ozon-discount",
//  title: "Запросить скидку на Ozon",
//  contexts: ["all"],
//  documentUrlPatterns: ["*://*.ozon.ru/*"]
//});

function detectCurrency(priceText) {
  if (!priceText) return 'RUB';
  
  if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
  if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
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
    'ƃ': 'BYN',
    'BYN': 'ƃ', 
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

function parseOzonPrice(document) {
  try {
    //console.log('Parsing ozon price...');
    
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
        if (rawPrice && /\d/.test(rawPrice)) {
          priceElement = element;
          currentPrice = normalizePrice(rawPrice);
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
        if (rawOldPrice && /\d/.test(rawOldPrice)) {
          previousPrice = normalizePrice(rawOldPrice);
          break;
        }
      }
    }
    
    let currency = 'RUB';
    if (priceElement) {
      currency = detectCurrency(priceElement.textContent);
    }
    
    const discountWidget = document.querySelector('[data-widget="foundCheaperText"]');
    let discountStatus = null;
    
    if (discountWidget) {
      const widgetText = discountWidget.textContent || '';
      //console.log('Текст виджета скидки:', widgetText);
      
      if (widgetText.includes('Скидка одобрена')) {
        discountStatus = 'approved';
      } else if (widgetText.includes('Скидка отклонена')) {
        discountStatus = 'rejected';
      } else if (widgetText.includes('%') || widgetText.includes('—')) {
        discountStatus = 'pending';
      } else if (widgetText.includes('Скидка запрошена')) {
        discountStatus = 'requested';
      } else if (widgetText.includes('Хочу скидку')) {
        discountStatus = 'available';
      }
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

function parseVseinstrumentiPrice(document) {
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

function parseLemanaproPrice(document) {
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

function parsePetrovichPrice(document) {
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

function parseAutoRuPrice(document) {
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

async function getWilbPrice(document) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({price: null, currency: null, error: 'Timeout'});
    }, 6000);

    try {
      const checkElement = () => {
        // Ищем цену в правильном месте
        const primaryPriceSelectors = [
          '.priceBlockWalletPrice--RJGuT h2',                    // Основная цена
          '.priceBlockWalletPrice--RJGuT .mo-button__text-content h2',
          'button[class*="priceBlockWalletPrice"] h2',           // Кнопка с ценой
          '[class*="priceBlockPriceWrap"] h2'                     // Любой h2 в блоке цены
        ];
        
        let mainPrice = null;
        let priceText = '';
        let currency = 'RUB';
        
        // Ищем цену
        for (const selector of primaryPriceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            priceText = element.textContent.trim();
            const priceMatch = priceText.match(/(\d[\d\s]*)/);
            if (priceMatch) {
              mainPrice = priceMatch[0];
              // Определяем валюту через существующую функцию
              currency = detectCurrency(priceText);
             // console.log('Найдена цена:', mainPrice, 'валюта:', currency);
              break;
            }
          }
        }
        
        if (mainPrice) {
          clearTimeout(timeout);
          resolve({
            price: normalizePrice(mainPrice),
            currency: currency
          });
        } else {
          setTimeout(checkElement, 700);
        }
      };
      
      checkElement();
      
    } catch (error) {
      console.error('WB price detection error:', error);
      clearTimeout(timeout);
      resolve({price: null, currency: null, error: error.toString()});
    }
  });
}


async function checkPrices() {
  try {
    const items = await browser.storage.local.get();
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

    //    console.log(`\n--- Проверка товара: ${itemId} ---`);
    //    console.log(`URL: ${item.url}`);

        const tab = await browser.tabs.create({
          url: item.url,
          active: false
        });

        await new Promise(resolve => 
          browser.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
              browser.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          })
        );

        const url = new URL(item.url);
        let priceData = null;

        // ========== ПАРСИНГ ПО САЙТАМ ==========
        
        if (url.hostname.includes('ozon.ru')) {
          // OZON
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseOzonPrice.toString()})(document)`
          });
          priceData = result;
          
          if (priceData) {
            // Обновление статуса скидки
            const updatedItem = { ...item };
            const oldStatus = item.discountStatus;
            
            if (priceData.discountStatus) {
              updatedItem.discountStatus = priceData.discountStatus;
              updatedItem.discountAvailable = priceData.discountStatus === 'available';
              updatedItem.discountRequested = priceData.discountStatus === 'requested' || priceData.discountStatus === 'pending';
              
              if (oldStatus !== priceData.discountStatus) {
                if (priceData.discountStatus === 'approved') {
                  updatedItem.hasNewDiscount = true;
                  browser.notifications.create({
                    type: "basic",
                    title: "🎉 Скидка одобрена!",
                    message: `Ваша скидка на товар одобрена!`,
                    iconUrl: "icons/icon48.png"
                  });
                  
                  if (tgToken && tgId) {
                    sendTelegramMessage(
                      `🎉 *Скидка одобрена!*\n\nТовар: ${item.url}`,
                      tgToken, 
                      tgId
                    ).catch(e => console.error('Ошибка Telegram:', e));
                  }
                } else if (priceData.discountStatus === 'rejected') {
                  browser.notifications.create({
                    type: "basic",
                    title: "❌ Скидка отклонена",
                    message: `К сожалению, скидка не одобрена.`,
                    iconUrl: "icons/icon48.png"
                  });
                } else if (priceData.discountStatus === 'available' && oldStatus === 'approved') {
                  browser.notifications.create({
                    type: "basic",
                    title: "🔄 Скидка истекла",
                    message: `Можно запросить новую скидку.`,
                    iconUrl: "icons/icon48.png"
                  });
                }
              }
            } else {
              delete updatedItem.discountStatus;
              delete updatedItem.discountAvailable;
              delete updatedItem.discountRequested;
            }
            
            await browser.storage.local.set({ [itemId]: updatedItem });
          }
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ OZON
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;
            const previousPrice = priceData.previousPrice ? priceData.previousPrice + ' ' + currencySymbol : null;

        //    console.log(`Ozon: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
        //      console.log(`✅ Цена Ozon изменилась!`);
              await updatePrice(itemId, finalPrice, previousPrice, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } 
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('wildberries.ru')) {
          // WILDBERRIES
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${getWilbPrice.toString()})(document)`
          });
          priceData = result;
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ WILDBERRIES
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;

        //    console.log(`Wildberries: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              //console.log(`✅ Цена Wildberries изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } 
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('vseinstrumenti.ru')) {
          // VSEINSTRUMENTI
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseVseinstrumentiPrice.toString()})(document)`
          });
          priceData = result;
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ VSEINSTRUMENTI
          if (priceData && priceData.price) {
            const finalPrice = priceData.price + ' ₽';
            
        //    console.log(`Vseinstrumenti: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`✅ Цена Vseinstrumenti изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('lemanapro.ru')) {
          // LEMANAPRO
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseLemanaproPrice.toString()})(document)`
          });
          priceData = result;
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ LEMANAPRO
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;

        //    console.log(`Lemanapro: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`✅ Цена Lemanapro изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('petrovich.ru')) {
          // PETROVICH
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parsePetrovichPrice.toString()})(document)`
          });
          priceData = result;
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ PETROVICH
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;

        //    console.log(`Petrovich: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`✅ Цена Petrovich изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } 
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else if (url.hostname.includes('auto.ru')) {
          // AUTO.RU
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseAutoRuPrice.toString()})(document)`
          });
          priceData = result;
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ AUTO.RU
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;

        //    console.log(`Auto.ru: текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`✅ Цена Auto.ru изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          }
          
          await browser.tabs.remove(tab.id);
          continue;

        } else {
          // ДРУГИЕ САЙТЫ (по селектору)
          const [currentPrice] = await browser.tabs.executeScript(tab.id, {
            code: `document.querySelector('${item.selector}')?.textContent`
          });
          
          if (currentPrice) {
            const currency = detectCurrency(currentPrice);
            priceData = { 
              price: normalizePrice(currentPrice),
              currency: currency
            };
          }
          
          // СРАВНЕНИЕ ЦЕН ДЛЯ ДРУГИХ САЙТОВ
          if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const finalPrice = priceData.price + ' ' + currencySymbol;

        //    console.log(`Другой сайт (${url.hostname}): текущая="${item.currentPrice}", новая="${finalPrice}"`);
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              console.log(`✅ Цена изменилась!`);
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            } 
          }
          
          await browser.tabs.remove(tab.id);
          continue;
        }

      } catch (error) {
        console.error(`Ошибка проверки ${itemId}:`, error);
      }
    }
  } catch (error) {
    console.error('Ошибка в checkPrices:', error);
  }
}


browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "seetoprice") {
    try {
      const response = await browser.tabs.sendMessage(tab.id, {
        action: "getPriceData"
      });

      if (!response || !response.selector || !response.price) {
        throw new Error("Не удалось определить элемент с ценой");
      }

      const { selector, price } = response;
      
      const currency = detectCurrency(price);
      const currencySymbol = getCurrencySymbol(currency);
      const normalizedPrice = normalizePrice(price);

      const domain = new URL(tab.url).hostname;
      const itemId = `${domain}_${Date.now()}`;

      const newItem = {
        url: tab.url,
        selector,
        originalPrice: normalizedPrice + ' ' + currencySymbol,
        currentPrice: normalizedPrice + ' ' + currencySymbol,
        currency: currency,
        lastChecked: Date.now(),
        priceHistory: []
      };

      if (domain.includes('ozon.ru')) {
        try {
          const discountCheck = await browser.tabs.sendMessage(tab.id, {
            action: "checkOzonDiscount"
          });
          
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
          }
        } catch (e) {
          console.log('Не удалось проверить скидку при добавлении:', e.message);
        }
      }

      await browser.storage.local.set({ [itemId]: newItem });

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
      console.error('Ошибка при добавлении товара:', error);
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
    try {
      const result = await browser.tabs.sendMessage(tab.id, {
        action: "clickOzonDiscount"
      });
      
      if (result && result.success) {
        browser.notifications.create({
          type: "basic",
          title: "💰 Скидка запрошена",
          message: "Кнопка 'Хочу скидку' нажата. Статус обновится при следующей проверке.",
          iconUrl: "icons/icon48.png"
        });
        
        const items = await browser.storage.local.get();
        for (const [itemId, item] of Object.entries(items)) {
          if (itemId !== "settings" && item.url === tab.url) {
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
      console.error('Ошибка при запросе скидки:', error);
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
  try {
    const result = await browser.storage.local.get(itemId);
    const item = result[itemId];
    
    if (!item) {
      return;
    }
    
    const currency = item.currency || 'RUB';
    const originalPrice = item.originalPrice; 
    let updateData;
    
    const originalPriceNum = parseFloat(originalPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
    const newPriceNum = parseFloat(newPrice.replace(/[^\d,.]/g, '').replace(',', '.'));
//    console.log(`Сравнение цен: ${originalPrice} (${originalPriceNum}) vs ${newPrice} (${newPriceNum})`);
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

    if (item.discountStatus) {
      updateData.discountStatus = item.discountStatus;
      updateData.discountAvailable = item.discountAvailable;
      updateData.discountRequested = item.discountRequested;
    }

    if (previousPrice) {
      updateData.previousPrice = previousPrice;
    }

    await browser.storage.local.set({ [itemId]: updateData });
  } catch (error) {
    console.error('Ошибка в updatePrice:', error);
  }
}

async function sendPriceAlert(item, newPrice, tgToken, tgId) {
  try {
    browser.browserAction.setIcon({
      path: {
        "48": "icons/icon48_alert.png"
      }
    });
    
    if (tgToken && tgId) {
      sendTelegramMessage('Магазин: ' + item.url + '\nБыло: ' + item.originalPrice + '\nСтало: ' + newPrice, tgToken, tgId)
      .then(() => console.log('Сообщение отправлено'))
      .catch(error => console.error('Ошибка Telegram:', error.message));
    }
    
    const notificationId = await browser.notifications.create({
      type: "basic",
      title: "💰 Цена изменилась!",
      message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
      iconUrl: "icons/icon48.png"
    });
    setTimeout(() => {
      browser.notifications.clear(notificationId);
    }, 2000);
  } catch (error) {
    console.error('Ошибка в sendPriceAlert:', error);
  }
}

browser.alarms.create("priceCheck", { periodInMinutes: 10 });
browser.alarms.onAlarm.addListener(checkPrices);

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    browser.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
  }
});

function handleError(error) {
  console.error("Ошибка:", error);
  browser.notifications.create({
    type: "basic",
    title: "❌ Ошибка",
    message: error.message ? error.message.substring(0, 100) : 'Неизвестная ошибка',
    iconUrl: "icons/icon48.png"
  });
}
