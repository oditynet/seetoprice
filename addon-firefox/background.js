// background.js
browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]  
})

async function sendTelegramMessage(text,tgToken,tgId) {
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
    // Поиск основной цены
    const priceElement = document.querySelector('[data-widget="webPrice"] span');
    const oldPriceElement = document.querySelector('[data-widget="webOldPrice"] span');
    
    let currentPrice = null;
    let previousPrice = null;

    if (priceElement) {
      currentPrice = priceElement.textContent
        .replace(/[^\d]/g, '')
        .trim();
    }

    if (oldPriceElement) {
      previousPrice = oldPriceElement.textContent
        .replace(/[^\d]/g, '')
        .trim();
    }

    return {
      price: currentPrice,
      previousPrice: previousPrice
    };
  } catch (e) {
    console.error('Ozon parse error:', e);
    return null;
  }
}
async function getWilbPrice(document) {
  await new Promise(resolve => {
    const checkElement = () => {
      const element = document.querySelector('.price-block');
    //  const oldelement = document.querySelector('.price-block__old-price');
      if (element) return resolve(element);
      setTimeout(checkElement, 100);
    };
    checkElement();
  });
  return {price: document.querySelector('.price-block').innerText};
}

// Обновленная функция проверки цен
async function checkPrices() {
  const items = await browser.storage.local.get();
  let historylen;
  let tgToken;
  let tgId;
  for (const [itemId, item] of Object.entries(items)) {
    try {
      //TIME not used
      if( itemId === "settings"){
        historylen=item.checkHistory;
        tgToken=item.tgToken;
        tgId=item.tgId;
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

      // Определяем тип сайта
      const url = new URL(item.url);
      let priceData = null;

      if (url.hostname.includes('ozon.ru')) {
        // Для Ozon используем специальный парсер
        const [result] = await browser.tabs.executeScript(tab.id, {
          code: `(${parseOzonPrice.toString()})(document)`
        });
        priceData = result;
        
      } else if(url.hostname.includes('wildberries.ru')) {
          const [result] = await browser.tabs.executeScript(tab.id, {
          code: `(${getWilbPrice.toString()})(document)`
        });
        priceData = result;
//        console.log("QQQ "+priceData.price);

      } else {
        // Стандартный парсер для других сайтов
        const [currentPrice] = await browser.tabs.executeScript(tab.id, {
          code: `document.querySelector('${item.selector}')?.textContent`
        });
        priceData = { price: currentPrice };
      }

      await browser.tabs.remove(tab.id);

      // Обработка полученных данных
      if (priceData) {
        let finalPrice;
        //console.warn(priceData.price);
        const priceParts = (priceData.price || '').trim().split('₽')
          .map(p => p.trim())
          .filter(p => p !== '');

        if (url.hostname.includes('ozon.ru')) {
          // Специальная обработка для Ozon
          finalPrice = priceData.price ? `${priceData.price} ₽` : null;
          const previousPrice = priceData.previousPrice ? `${priceData.previousPrice} ₽` : null;
          
          if (previousPrice && previousPrice !== item.previousPrice) { 
            await updatePrice(itemId, finalPrice, previousPrice,historylen);
          }
        }else if (url.hostname.includes('wildberries.ru')) {  
//          console.log("q1 "+ priceParts[0]);
          finalPrice = priceParts[0].replace(/[^\d]/g, '')+' ₽';
          const previousPrice = priceParts[2] ? priceParts[2].replace(/[^\d]/g, '')+' ₽' : priceParts[1].replace(/[^\d]/g, '')+' ₽';
          
          //if (previousPrice && previousPrice !== item.previousPrice) { 
    //        await updatePrice(itemId, finalPrice, previousPrice,historylen);
    //    }
        } else {
          // Стандартная обработка
          const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
          finalPrice = discountIndex !== -1 ? 
            `${priceParts[discountIndex + 1]}`.replace(/[^\d]/g, '').trim()+' ₽' : 
            `${priceParts[0]}`.replace(/[^\d]/g, '').trim()+' ₽';
        }
        //console.log("item.prev= "+item.previousPrice+" item.cur="+item.currentPrice +" fin="+finalPrice);
        if (finalPrice && finalPrice === item.currentPrice) {
          await updatePrice(itemId, finalPrice, priceData.previousPrice,historylen);
          sendPriceAlert(item, finalPrice,tgToken,tgId);
        }
      }

    } catch (error) {
      console.error(`Ошибка проверки ${itemId}:`, error);
    }
  }
}

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "seetoprice") return

  try {
    // Получаем данные о цене через контент-скрипт
    const { selector, price } = await browser.tabs.sendMessage(tab.id, {
      action: "getPriceData"
    })

    if (!selector || !price) {
      throw new Error("Не удалось определить элемент с ценой")
    }

    // Сохраняем данные с привязкой к домену
    const domain = new URL(tab.url).hostname
    const itemId = `${domain}_${Date.now()}`

  await browser.storage.local.set({
  [itemId]: {
    url: tab.url,
    selector,
    originalPrice: price.replace(/[^\d]/g, '').trim()+' ₽',
    currentPrice: price.replace(/[^\d]/g, '').trim()+' ₽',
    lastChecked: Date.now(),
    priceHistory: [] // Инициализируем пустую историю
  }
  });
    const notificationId = await browser.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${price}\nМагазин: ${domain}`,
      iconUrl: "../icons/icon48.png"
    });
    setTimeout(() => {
    browser.notifications.clear(notificationId);
  }, 2000);

  } catch (error) {
    handleError(error)
  }
})

async function updatePrice(itemId, newPrice, previousPrice = null,historylen) {
  const item = await browser.storage.local.get(itemId);
 
  const originalPrice = item[itemId].originalPrice; 
  let updateData;
  if  (originalPrice.replace(/[^\d]/g, '').trim() >= newPrice.replace(/[^\d]/g, '').trim()  )
  {
  updateData = {
    ...item[itemId],
    currentPrice: newPrice,
    lastChecked: Date.now(),
     hasNewChange: true, // Добавляем флаг
    priceHistory: [...(item[itemId].priceHistory || []).slice(-historylen), 
      { price: '-'+newPrice, timestamp: Date.now() }]
  };
  }else
  {
  updateData = {
    ...item[itemId],
    currentPrice: newPrice,
    lastChecked: Date.now(),
     hasNewChange: true, // Добавляем флаг
    priceHistory: [...(item[itemId].priceHistory || []).slice(-historylen), 
      { price: '+'+newPrice, timestamp: Date.now() }]
  };
  }

  if (previousPrice) {
    updateData.previousPrice = previousPrice;
  }

  await browser.storage.local.set({ [itemId]: updateData });
}

async function sendPriceAlert(item, newPrice,tgToken,tgId) {
 
 browser.browserAction.setIcon({
    path: {
      "48": "icons/icon48_alert.png"
    }
  });
  sendTelegramMessage('Магазин: '+item.url+'\nБыло: '+item.originalPrice+'\nСтало: '+newPrice,tgToken,tgId)
  .then(() => console.log('Сообщение отправлено'))
  .catch(error => console.error('Ошибка:', error.message));
  
   const notificationId = await browser.notifications.create({
    type: "basic",
    title: "Цена изменилась!",
    message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
    iconUrl: "../icons/icon48.png"
  });
  setTimeout(() => {
    browser.notifications.clear(notificationId);
  }, 2000);
}
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    browser.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
  }
});
// Запускаем проверку каждые 10 минут
browser.alarms.create("priceCheck", { periodInMinutes: 0.3 }) // ТОЛЬКО для дебага теперь
browser.alarms.onAlarm.addListener(checkPrices)

// Обработчик ошибок
function handleError(error) {
  console.error("Ошибка:", error)
  browser.notifications.create({
    type: "basic",
    title: "Ошибка",
    message: error.message.substring(0, 100)
  })
}