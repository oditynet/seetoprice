// background.js
browser.contextMenus.create({
  id: "seetoprice",
  title: "Отслеживать цену",
  contexts: ["all"]
});

browser.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "seetoprice") return;

  try {
    // Получаем данные о цене через контент-скрипт
    const { selector, price } = await browser.tabs.sendMessage(tab.id, {
      action: "getPriceData"
    });

    if (!selector || !price) {
      throw new Error("Не удалось определить элемент с ценой");
    }

    // Сохраняем данные с привязкой к домену
    const domain = new URL(tab.url).hostname;
    const itemId = `${domain}_${Date.now()}`;

    await browser.storage.local.set({
      [itemId]: {
        url: tab.url,
        selector,
        originalPrice: price,
        currentPrice: price,
        lastChecked: Date.now()
      }
    });

    browser.notifications.create({
      type: "basic",
      title: "Начато отслеживание",
      message: `Цена: ${price}\nМагазин: ${domain}`,
      iconUrl: "/icons/icon48.png"
    });

  } catch (error) {
    handleError(error);
  }
});

// Проверка цен
async function checkPrices() {
  const items = await browser.storage.local.get();

  for (const [itemId, item] of Object.entries(items)) {
    try {
      // Открываем страницу в фоновом режиме
      const tab = await browser.tabs.create({
        url: item.url,
        active: false
      });

      // Ждем полной загрузки страницы
      await new Promise(resolve => 
        browser.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            browser.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        })
      );

      // Получаем текущую цену
      const [currentPrice] = await browser.tabs.executeScript(tab.id, {
        code: `
            document.querySelector('${item.selector}')?.textContent
        `
      });
      await browser.tabs.remove(tab.id);

   const priceParts = currentPrice.split('₽')
     .map(p => p.trim())
     .filter(p => p !== '');

   let finalPrice;

   // Ищем индекс элемента с "Выгода"
   const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
  // sendPriceAlert(item,discountIndex);
   if (discountIndex !== -1 && priceParts.length > discountIndex + 1) {
     // Если нашли "Выгода" и есть следующий элемент - берем его
      finalPrice = `${priceParts[discountIndex + 1]} ₽`;
   } else {
     // Иначе берем первый элемент
     finalPrice = `${priceParts[0]} ₽`;
   }
      // Сравниваем цены
      if (finalPrice && finalPrice !== item.currentPrice) { //!==
        await updatePrice(itemId, finalPrice);
        sendPriceAlert(item,finalPrice);
      }

    } catch (error) {
      console.error(`Ошибка проверки ${itemId}:`, error);
    }
  }
}

async function updatePrice(itemId, newPrice) {
  console.log(newPrice)
  const item = await browser.storage.local.get(itemId);
  await browser.storage.local.set({
    [itemId]: {
      ...item[itemId],
      currentPrice: newPrice,
      lastChecked: Date.now()
    }
  });
}

function sendPriceAlert(item, newPrice) {
  browser.notifications.create({
    type: "basic",
    title: "Цена изменилась!",
    message: `Магазин: ${new URL(item.url).hostname}\nБыло: ${item.originalPrice}\nСтало: ${newPrice}`,
    iconUrl: "/icons/icon48.png"
  });
}

// Запускаем проверку каждые 10 минут
browser.alarms.create("priceCheck", { periodInMinutes: 10 });
browser.alarms.onAlarm.addListener(checkPrices);

// Обработчик ошибок
function handleError(error) {
  console.error("Ошибка:", error);
  browser.notifications.create({
    type: "basic",
    title: "Ошибка",
    message: error.message.substring(0, 100)
  });
}