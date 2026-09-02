// background.js — добавьте этот обработчик

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    // Существующие обработчики остаются...
    
    // НОВЫЙ: проверка одного товара
    if (message.action === "checkSingleItem" && message.itemId) {
        console.log(`[checkSingleItem] Проверка товара ${message.itemId}`);
        try {
            await checkSingleItem(message.itemId);
            sendResponse({ success: true });
        } catch (e) {
            console.error('[checkSingleItem] Ошибка:', e);
            sendResponse({ success: false, error: e.message });
        }
        return true; // Для асинхронного ответа
    }
    
    // НОВЫЙ: получение всех товаров для popup
    if (message.action === "getAllItems") {
        try {
            const storage = await browser.storage.local.get();
            sendResponse(storage);
        } catch (e) {
            sendResponse({ error: e.message });
        }
        return true;
    }
});

// Функция для проверки одного товара
async function checkSingleItem(itemId) {
    console.log(`[checkSingleItem] Начало проверки ${itemId}`);
    
    try {
        const result = await browser.storage.local.get(itemId);
        const item = result[itemId];
        
        if (!item || !item.url) {
            console.error(`[checkSingleItem] Товар ${itemId} не найден`);
            return;
        }
        
        // Открываем вкладку и проверяем цену
        let tab = await browser.tabs.create({
            url: item.url,
            active: false
        });
        
        await new Promise(resolve => {
            const listener = (tabId, info) => {
                if (tabId === tab.id && info.status === 'complete') {
                    browser.tabs.onUpdated.removeListener(listener);
                    resolve();
                }
            };
            browser.tabs.onUpdated.addListener(listener);
            
            // Таймаут на случай, если страница не загрузилась
            setTimeout(() => {
                browser.tabs.onUpdated.removeListener(listener);
                resolve();
            }, 15000);
        });
        
        // Парсим цену в зависимости от сайта
        const url = new URL(item.url);
        let priceData = null;
        
        if (url.hostname.includes('ozon.ru')) {
            const [result] = await browser.tabs.executeScript(tab.id, {
                code: `(${parseOzonPrice.toString()})(document)`
            });
            priceData = result;
        } else if (url.hostname.includes('wildberries.ru')) {
            priceData = await getWilbPrice(tab.id);
        } else if (url.hostname.includes('vseinstrumenti.ru')) {
            const [result] = await browser.tabs.executeScript(tab.id, {
                code: `(${parseVseinstrumentiPrice.toString()})(document)`
            });
            priceData = result;
        } else {
            // Универсальный парсер
            const [result] = await browser.tabs.executeScript(tab.id, {
                code: `document.querySelector('${item.selector}')?.textContent`
            });
            if (result) {
                const currency = detectCurrency(result);
                priceData = {
                    price: normalizePrice(result),
                    currency: currency
                };
            }
        }
        
        await browser.tabs.remove(tab.id);
        
        if (priceData && priceData.price) {
            const currencySymbol = getCurrencySymbol(priceData.currency || 'RUB');
            const newPrice = priceData.price + ' ' + currencySymbol;
            
            if (newPrice !== item.currentPrice) {
                // Цена изменилась
                const historylen = (await browser.storage.local.get('settings'))?.settings?.checkHistory || 10;
                await updatePrice(itemId, newPrice, null, historylen);
                
                // Отправляем уведомление
                const tgToken = (await browser.storage.local.get('settings'))?.settings?.tgToken;
                const tgId = (await browser.storage.local.get('settings'))?.settings?.tgId;
                sendPriceAlert(item, newPrice, tgToken, tgId);
                
                console.log(`[checkSingleItem] Цена обновлена: ${newPrice}`);
            } else {
                console.log(`[checkSingleItem] Цена не изменилась: ${newPrice}`);
            }
        }
        
    } catch (e) {
        console.error(`[checkSingleItem] Ошибка:`, e);
        throw e;
    }
}
