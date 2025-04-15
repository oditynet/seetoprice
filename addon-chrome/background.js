chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "seetoprice",
    title: "Отслеживать цену",
    contexts: ["all"]
  });
});

/*async function sendTelegramMessage(text, token, chatId) {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`HTTP error ${xhr.status}: ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Network error'));
    };

    xhr.send(JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }));
  });
}*/

function parseOzonPrice(document) {
  try {
    const priceElement = document.querySelector('[data-widget="webPrice"] span');
    const oldPriceElement = document.querySelector('[data-widget="webOldPrice"] span');
    
    return {
      price: priceElement?.textContent.replace(/[^\d]/g, '').trim(),
      previousPrice: oldPriceElement?.textContent.replace(/[^\d]/g, '').trim()
    };
  } catch (e) {
    console.error('Ozon parse error:', e);
    return null;
  }
}

async function getWilbPrice(document) {
  await new Promise(resolve => {
    const checkElement = () => {
      if (document.querySelector('.price-block')) resolve();
      else setTimeout(checkElement, 100);
    };
    checkElement();
  });
  return {price: document.querySelector('.price-block').innerText};
}

async function checkPrices() {
  const items = await chrome.storage.local.get();
  let historylen, tgToken, tgId;
  
  for (const [itemId, item] of Object.entries(items)) {
    try {
      if(itemId === "settings") {
        historylen = item.checkHistory;
        tgToken = item.tgToken;
        tgId = item.tgId;
        continue;
      }

      const tab = await chrome.tabs.create({url: item.url, active: false});
      
      await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if(tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      const url = new URL(item.url);
      let priceData = null;

      if(url.hostname.includes('ozon.ru')) {
         const result = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      try {
        return {
          price: document.querySelector('[data-widget="webPrice"] span')?.textContent,
          previousPrice: document.querySelector('[data-widget="webOldPrice"] span')?.textContent
        };
      } catch(e) {
        return null;
      }
    }
  });
  priceData = result[0]?.result;
  //console.log(priceData.price +' ' +priceData.previousPrice);
      }
       else if(url.hostname.includes('wildberries.ru')) {

 const result = await chrome.scripting.executeScript({
    target: {tabId: tab.id},
    func: () => {
      return new Promise(resolve => {
        const checkInterval = setInterval(() => {
          const priceElem = document.querySelector('.price-block');
          if(priceElem) {
            clearInterval(checkInterval);
            resolve({
              price: priceElem.innerText.trim()
            });
          }
        }, 100);
      });
    }
  });
  priceData = result[0]?.result;

//console.log(priceData.price +' ' +priceData.previousPrice);
      }
      else {
        const result = await chrome.scripting.executeScript({
          target: {tabId: tab.id},
          func: selector => document.querySelector(selector)?.textContent,
          args: [item.selector]
        });
        priceData = {price: result[0]?.result};
      }

      await chrome.tabs.remove(tab.id);
     // console.log(priceData.price +' !!! ' +priceData.previousPrice);
       if(priceData) {
        let finalPrice;
        const priceParts = (priceData.price || '').trim().split('₽')
          .map(p => p.trim()).filter(p => p !== '');

        if(url.hostname.includes('ozon.ru')) {
         // finalPrice = priceData.price ? `${priceData.price} ₽` : null;
          //const previousPrice = priceData.previousPrice ? `${priceData.previousPrice} ₽` : null;
          finalPrice = priceParts[0].replace(/[^\d]/g, '') + ' ₽';
          /*if(previousPrice && previousPrice !== item.previousPrice) {
            await updatePrice(itemId, finalPrice, previousPrice, historylen);
          }*/
        }
        else if(url.hostname.includes('wildberries.ru')) {
          finalPrice = priceParts[0].replace(/[^\d]/g, '') + ' ₽';
          const previousPrice = priceParts[2] 
            ? priceParts[2].replace(/[^\d]/g, '') + ' ₽' 
            : priceParts[1].replace(/[^\d]/g, '') + ' ₽';
        }
        else {
          const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
          finalPrice = discountIndex !== -1 
            ? `${priceParts[discountIndex + 1]}`.replace(/[^\d]/g, '').trim() + ' ₽' 
            : `${priceParts[0]}`.replace(/[^\d]/g, '').trim() + ' ₽';
        }
        //console.log(finalPrice+ ' *** '+item.currentPrice);
        if(finalPrice && finalPrice !== item.currentPrice) {
          await updatePrice(itemId, finalPrice, priceData.previousPrice, historylen);
          sendPriceAlert(item, finalPrice, tgToken, tgId);
        }
      }
    } catch(error) {
      console.error(`Ошибка проверки ${itemId}:`, error);
    }
  }
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(info.menuItemId !== "seetoprice") return;

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {action: "getPriceData"});
    
    if(!response?.selector || !response?.price) {
      throw new Error("Не удалось определить элемент с ценой");
    }

    const domain = new URL(tab.url).hostname;
    const itemId = `${domain}_${Date.now()}`;

    await chrome.storage.local.set({
      [itemId]: {
        url: tab.url,
        selector: response.selector,
        originalPrice: response.price.replace(/[^\d]/g, '').trim() + ' ₽',
        currentPrice: response.price.replace(/[^\d]/g, '').trim() + ' ₽',
        lastChecked: Date.now(),
        priceHistory: []
      }
    });

    chrome.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${response.price}\nМагазин: ${domain}`,
      iconUrl: "icons/icon48.png"
    });
  } catch(error) {
    handleError(error);
  }
});

async function updatePrice(itemId, newPrice, previousPrice, historylen) {
  const item = await chrome.storage.local.get(itemId);
  const originalPrice = item[itemId].originalPrice;
  let updateData;

  if(originalPrice.replace(/[^\d]/g, '').trim() >= newPrice.replace(/[^\d]/g, '').trim()) {
    updateData = {
      ...item[itemId],
      currentPrice: newPrice,
      lastChecked: Date.now(),
      hasNewChange: true,
      priceHistory: [...(item[itemId].priceHistory || []).slice(-historylen), 
        {price: '-' + newPrice, timestamp: Date.now()}]
    };
  } else {
    updateData = {
      ...item[itemId],
      currentPrice: newPrice,
      lastChecked: Date.now(),
      hasNewChange: true,
      priceHistory: [...(item[itemId].priceHistory || []).slice(-historylen), 
        {price: '+' + newPrice, timestamp: Date.now()}]
    };
  }

  if(previousPrice) updateData.previousPrice = previousPrice;
  await chrome.storage.local.set({[itemId]: updateData});
}

async function sendPriceAlert(item, newPrice, tgToken, tgId) {
  chrome.action.setIcon({path: "icons/icon48_alert.png"});
  
//  sendTelegramMessage(`Магазин: ${item.url}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`, tgToken, tgId)
//    .catch(error => console.error('Ошибка:', error.message));

  chrome.notifications.create({
    type: "basic",
    title: "Цена изменилась!",
    message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
    iconUrl: "icons/icon48.png"
  });
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
      chrome.alarms.create("priceCheck", {
      periodInMinutes: message.interval
    });
  }
});

chrome.alarms.create("priceCheck", {periodInMinutes: 10});
chrome.alarms.onAlarm.addListener(checkPrices);

function handleError(error) {
  console.error("Ошибка:", error);
  chrome.notifications.create({
    type: "basic",
    title: "Ошибка",
    message: error.message.substring(0, 100)
  });
}
