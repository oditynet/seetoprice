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
  return priceText.replace(/[^\d]/g, '');
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

// Основная функция проверки цен
async function checkPrices() {
  try {
    const items = await chrome.storage.local.get();
    let historylen, tgToken, tgId;
    
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

        console.log(`Проверка цены для: ${item.url}`);

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
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                const priceElement = document.querySelector('[data-widget="webPrice"] span');
                let currentPrice = null;
                let currency = 'RUB';

                if (priceElement) {
                  const rawPrice = priceElement.textContent;
                  currentPrice = rawPrice.replace(/[^\d]/g, '');
                  // Определяем валюту для Ozon
                  if (rawPrice.includes('$')) currency = 'USD';
                  else if (rawPrice.includes('€')) currency = 'EUR';
                  else if (rawPrice.includes('₸')) currency = 'KZT';
                  else if (rawPrice.includes('BYN')) currency = 'BYN';
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Ozon parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else if (url.hostname.includes('wildberries.ru')) {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                const priceBlock = document.querySelector('.price-block__wallet') || 
                                 document.querySelector('.price-block__final-price') ||
                                 document.querySelector('.price-block');
                
                let currentPrice = null;
                let currency = 'RUB';

                if (priceBlock) {
                  const priceText = priceBlock.textContent || priceBlock.innerText;
                  const priceMatch = priceText.match(/(\d[\d\s]*)\s*[₽$€₸]/);
                  if (priceMatch) {
                    currentPrice = priceMatch[1].replace(/\s/g, '');
                    // Определяем валюту для Wildberries
                    if (priceText.includes('$')) currency = 'USD';
                    else if (priceText.includes('€')) currency = 'EUR';
                    else if (priceText.includes('₸')) currency = 'KZT';
                    else if (priceText.includes('BYN')) currency = 'BYN';
                  }
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Wildberries parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else if (url.hostname.includes('petrovich.ru')) {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                const priceElement = document.querySelector('.product-price__current') ||
                                   document.querySelector('.price');
                
                let currentPrice = null;
                let currency = 'RUB';

                if (priceElement) {
                  const priceText = priceElement.textContent;
                  const priceMatch = priceText.match(/([\d\s]+)[₽$€₸]/);
                  if (priceMatch) {
                    currentPrice = priceMatch[1].replace(/\s/g, '');
                    if (priceText.includes('$')) currency = 'USD';
                    else if (priceText.includes('€')) currency = 'EUR';
                  }
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Petrovich parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else if (url.hostname.includes('vseinstrumenti.ru')) {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                let currentPrice = null;
                let currency = 'RUB';

                const currentPriceElement = document.querySelector('[data-qa="price-now"]');
                
                if (currentPriceElement) {
                  const priceText = currentPriceElement.textContent.trim();
                  const priceMatch = priceText.match(/(\d+)\s*[₽$€₸]/);
                  if (priceMatch) {
                    currentPrice = priceMatch[1];
                    if (priceText.includes('$')) currency = 'USD';
                    else if (priceText.includes('€')) currency = 'EUR';
                  }
                }

                if (!currentPrice) {
                  const mainPriceBlock = document.querySelector('.MZu-SS');
                  if (mainPriceBlock) {
                    const priceText = mainPriceBlock.textContent;
                    const priceMatch = priceText.match(/(\d+)\s*[₽$€₸]/);
                    if (priceMatch) {
                      currentPrice = priceMatch[1];
                      if (priceText.includes('$')) currency = 'USD';
                      else if (priceText.includes('€')) currency = 'EUR';
                    }
                  }
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Vseinstrumenti parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else if (url.hostname.includes('lemanapro.ru')) {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                const priceElement = document.querySelector('.product-price__current') || 
                                   document.querySelector('.price');
                
                let currentPrice = null;
                let currency = 'RUB';

                if (priceElement) {
                  const priceText = priceElement.textContent;
                  currentPrice = priceText.replace(/[^\d]/g, '');
                  if (priceText.includes('$')) currency = 'USD';
                  else if (priceText.includes('€')) currency = 'EUR';
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Lemanapro parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else if (url.hostname.includes('auto.ru')) {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: () => {
              try {
                const priceElement = document.querySelector('.OfferPriceCaption__price') ||
                                   document.querySelector('.OfferPrice__price');
                
                let currentPrice = null;
                let currency = 'RUB';

                if (priceElement) {
                  const priceText = priceElement.textContent;
                  currentPrice = priceText.replace(/[^\d]/g, '');
                  if (priceText.includes('$')) currency = 'USD';
                  else if (priceText.includes('€')) currency = 'EUR';
                }

                return {
                  price: currentPrice,
                  currency: currency
                };
              } catch(e) {
                console.error('Auto.ru parse error:', e);
                return null;
              }
            }
          });
          priceData = result[0]?.result;
        }
        else {
          const result = await chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: (selector) => {
              const element = document.querySelector(selector);
              if (element) {
                const priceText = element.textContent;
                let currency = 'RUB';
                if (priceText.includes('$')) currency = 'USD';
                else if (priceText.includes('€')) currency = 'EUR';
                else if (priceText.includes('₸')) currency = 'KZT';
                else if (priceText.includes('BYN')) currency = 'BYN';
                
                return {
                  price: priceText.replace(/[^\d]/g, ''),
                  currency: currency
                };
              }
              return null;
            },
            args: [item.selector]
          });
          priceData = result[0]?.result;
        }

        await chrome.tabs.remove(tab.id);

        console.log(`Результат парсинга для ${itemId}:`, priceData);

        if (priceData && priceData.price) {
          const currencySymbol = getCurrencySymbol(priceData.currency);
          const finalPrice = priceData.price + ' ' + currencySymbol;

          const normalizedCurrentPrice = normalizePrice(item.currentPrice);
          const normalizedFinalPrice = normalizePrice(finalPrice);
          
          console.log(`Сравнение цен: ${normalizedCurrentPrice} vs ${normalizedFinalPrice}`);

          if (normalizedFinalPrice && normalizedCurrentPrice !== normalizedFinalPrice) {
            console.log(`Цена изменилась: ${item.currentPrice} -> ${finalPrice}`);
            await updatePrice(itemId, finalPrice, null, historylen);
            sendPriceAlert(item, finalPrice, tgToken, tgId);
          } else {
            console.log(`Цена не изменилась: ${item.currentPrice}`);
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

// Контекстное меню
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "seetoprice") return;

  try {
    console.log('Context menu clicked on tab:', tab.url);
    
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        action: "getPriceData"
      });
    } catch (error) {
      console.log('Content script not loaded, trying to inject...');
      throw new Error("Не удалось загрузить скрипт на страницу. Обновите страницу и попробуйте снова.");
    }

    console.log('Context menu price data:', response);

    if (!response || !response.selector || !response.price) {
      throw new Error("Не удалось определить элемент с ценой");
    }

    const currency = detectCurrency(response.price);
    const currencySymbol = getCurrencySymbol(currency);
    const normalizedPrice = normalizePrice(response.price);

    console.log('Normalized price:', normalizedPrice);

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

    await chrome.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${normalizedPrice} ${currencySymbol}\nМагазин: ${domain}\nВалюта: ${currency}`,
      iconUrl: "icons/icon48.png"
    });

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
    
    const originalPriceNum = parseFloat(normalizePrice(originalPrice));
    const newPriceNum = parseFloat(normalizePrice(newPrice));
    
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
    
    await chrome.notifications.create({
      type: "basic",
      title: "Цена изменилась!",
      message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
      iconUrl: "icons/icon48.png"
    });
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
