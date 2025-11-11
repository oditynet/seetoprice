// background.js
browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]  
})

// Функция для определения валюты
function detectCurrency(priceText) {
  if (!priceText) return 'RUB';
  
  if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
  if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
  if (priceText.includes('₸')) return 'KZT';
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
  if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
  if (priceText.includes('сом')) return 'KGS';
  if (priceText.includes('сум')) return 'UZS';
  if (priceText.includes('с.')) return 'TJS';
  if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
  if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
  if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
  if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
  if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
  if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
  if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
  
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
    'KGS': 'сом',
    'UZS': 'сум',
    'TJS': 'с.',
    'CZK': 'Kč',
    'PLN': 'zł',
    'RON': 'lei',
    'BGN': 'лв',
    'HUF': 'Ft',
    'SEK': 'kr',
    'CHF': 'CHF'
  };
  return symbols[currency] || '₽';
}

function normalizePrice(priceText) {
  if (!priceText) return null;
  
  // Удаляем только пробелы, сохраняем запятые
  let normalized = priceText.replace(/\s/g, '');
  
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

function parseOzonPrice(document) {
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

function parseVseinstrumentiPrice(document) {
  try {
    //console.log('Parsing vseinstrumenti price...');
    
    const priceSelectors = [
      '.-no-margin_fsyzi_50',
      '.cztff3 > .BVPC2X',
      '[class*="price"]',
      '.product-price',
      '.current-price',
      '.product-card-price'
    ];
    
    let currentPrice = null;
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || element.innerText;
        if (priceText && /\d/.test(priceText)) {
          //console.log('Found vseinstrumenti element with selector:', selector, 'Text:', priceText);
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

async function getWilbPrice(document) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve({price: null, currency: null, error: 'Timeout'});
    }, 10000);

    try {
      const checkElement = () => {
        const priceContainers = [
          '[class*="priceBlockPriceWrapWallet"]',
          '[class*="priceBlockPriceWrap--"]',
          '.price-block'
        ];
        
        let priceContainer = null;
        for (const selector of priceContainers) {
          priceContainer = document.querySelector(selector);
          if (priceContainer) {
            break;
          }
        }
        
        if (priceContainer) {
          const containerText = priceContainer.textContent || priceContainer.innerText;
          const priceLines = containerText.split('\n').filter(line => line.trim());
          
          let mainPrice = null;
          let mainCurrency = 'RUB';
          
          for (const line of priceLines) {
            const trimmed = line.trim();
            if (/\d/.test(trimmed) && (trimmed.includes('₽') || trimmed.includes('р.') || trimmed.includes('₸') || trimmed.includes('BYN') || trimmed.includes('֏') || trimmed.includes('сом') || trimmed.includes('сум') || trimmed.includes('с.') || trimmed.includes('$') || trimmed.includes('€'))) {
              mainPrice = trimmed;
              mainCurrency = detectCurrency(trimmed);
              break;
            }
          }
          
          if (mainPrice) {
            clearTimeout(timeout);
            resolve({
              price: normalizePrice(mainPrice),
              currency: mainCurrency
            });
          } else {
            setTimeout(checkElement, 700);
          }
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

        // Проверяем что item существует
        if (!item || !item.url) {
          //console.log(`Пропускаем ${itemId}: нет данных`);
          continue;
        }

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

        if (url.hostname.includes('ozon.ru')) {
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseOzonPrice.toString()})(document)`
          });
          priceData = result;
          
          if (priceData && priceData.currency !== item.currency) {
            //console.log(`Пропускаем Ozon: валюта товара (${priceData.currency}) не совпадает с сохраненной (${item.currency})`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('wildberries.ru')) {
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${getWilbPrice.toString()})(document)`
          });
          priceData = result;
          
          if (priceData && priceData.currency !== item.currency) {
            //console.log(`Пропускаем WB: валюта товара (${priceData.currency}) не совпадает с сохраненной (${item.currency})`);
            await browser.tabs.remove(tab.id);
            continue;
          }
          
        } else if (url.hostname.includes('vseinstrumenti.ru')) {
          const [result] = await browser.tabs.executeScript(tab.id, {
            code: `(${parseVseinstrumentiPrice.toString()})(document)`
          });
          priceData = result;
          
          // Для vseinstrumenti.ru всегда используем рубли
          if (priceData && priceData.price) {
            const finalPrice = priceData.price + ' ₽';
            
            if (finalPrice && finalPrice !== item.currentPrice) {
              await updatePrice(itemId, finalPrice, null, historylen);
              sendPriceAlert(item, finalPrice, tgToken, tgId);
            }
          }
          await browser.tabs.remove(tab.id);
          continue;
          
        } else {
          const [currentPrice] = await browser.tabs.executeScript(tab.id, {
            code: `document.querySelector('${item.selector}')?.textContent`
          });
          
          if (currentPrice) {
            const currency = detectCurrency(currentPrice);
            if (currency !== item.currency) {
              //console.log(`Пропускаем другой сайт: валюта товара (${currency}) не совпадает с сохраненной (${item.currency})`);
              await browser.tabs.remove(tab.id);
              continue;
            }
            
            priceData = { 
              price: normalizePrice(currentPrice),
              currency: currency
            };
          }
        }

        await browser.tabs.remove(tab.id);

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

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "seetoprice") return

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

    await browser.storage.local.set({
      [itemId]: {
        url: tab.url,
        selector,
        originalPrice: normalizedPrice + ' ' + currencySymbol,
        currentPrice: normalizedPrice + ' ' + currencySymbol,
        currency: currency,
        lastChecked: Date.now(),
        priceHistory: []
      }
    });

    const notificationId = await browser.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${normalizedPrice} ${currencySymbol}\nМагазин: ${domain}\nВалюта: ${currency}`,
      iconUrl: "../icons/icon48.png"
    });
    setTimeout(() => {
      browser.notifications.clear(notificationId);
    }, 2000);

  } catch (error) {
    console.error('Ошибка при добавлении товара:', error);
    handleError(error);
  }
});

async function updatePrice(itemId, newPrice, previousPrice = null, historylen) {
  try {
    const result = await browser.storage.local.get(itemId);
    const item = result[itemId];
    
    if (!item) {
      //console.error(`Товар ${itemId} не найден`);
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
      title: "Цена изменилась!",
      message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
      iconUrl: "../icons/icon48.png"
    });
    setTimeout(() => {
      browser.notifications.clear(notificationId);
    }, 2000);
  } catch (error) {
    console.error('Ошибка в sendPriceAlert:', error);
  }
}

// Таймер автообновления
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
    title: "Ошибка",
    message: error.message ? error.message.substring(0, 100) : 'Неизвестная ошибка'
  });
}
