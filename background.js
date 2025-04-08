// background.js
browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]
})

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

// Обновленная функция проверки цен
async function checkPrices() {
  const items = await browser.storage.local.get();

  for (const [itemId, item] of Object.entries(items)) {
    try {
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
        const priceParts = (priceData.price || '').split('₽')
          .map(p => p.trim())
          .filter(p => p !== '');

        if (url.hostname.includes('ozon.ru')) {
          // Специальная обработка для Ozon
          finalPrice = priceData.price ? `${priceData.price} ₽` : null;
          const previousPrice = priceData.previousPrice ? `${priceData.previousPrice} ₽` : null;
          
          if (previousPrice && previousPrice !== item.previousPrice) { 
            await updatePrice(itemId, finalPrice, previousPrice);
          }
        } else {
          // Стандартная обработка
          const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
          finalPrice = discountIndex !== -1 ? 
            `${priceParts[discountIndex + 1]} ₽` : 
            `${priceParts[0]} ₽`;
        }

        if (finalPrice && finalPrice !== item.currentPrice) {
          await updatePrice(itemId, finalPrice, priceData.previousPrice);
          sendPriceAlert(item, finalPrice);
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
    originalPrice: price,
    currentPrice: price,
    lastChecked: Date.now(),
    priceHistory: [] // Инициализируем пустую историю
  }
  });

    browser.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${price}\nМагазин: ${domain}`,
      iconUrl: "../icons/icon48.png"
    })

  } catch (error) {
    handleError(error)
  }
})

async function updatePrice(itemId, newPrice, previousPrice = null) {
  const item = await browser.storage.local.get(itemId);
  const updateData = {
    ...item[itemId],
    currentPrice: newPrice,
    lastChecked: Date.now(),
    priceHistory: [...(item[itemId].priceHistory || []), 
      { price: newPrice, timestamp: Date.now() }]
  };

  if (previousPrice) {
    updateData.previousPrice = previousPrice;
  }

  await browser.storage.local.set({ [itemId]: updateData });
}

function sendPriceAlert(item, newPrice) {
  browser.notifications.create({
    type: "basic",
    title: "Цена изменилась!",
    message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
    iconUrl: "../icons/icon48.png"
  })
}

// Запускаем проверку каждые 10 минут
browser.alarms.create("priceCheck", { periodInMinutes: 10 })
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