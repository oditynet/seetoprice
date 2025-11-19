document.getElementById('fileInput').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const itemsToImport = JSON.parse(text);
        
        // Получаем существующие товары
        const existingItems = await browser.storage.local.get();
        const existingUrls = new Set();
        
        // Собираем все существующие URL
        Object.values(existingItems).forEach(item => {
            if (item && item.url) {
                existingUrls.add(item.url);
            }
        });
        
        let importedCount = 0;
        let skippedCount = 0;
        
        // Импортируем товары
        for (const [id, data] of Object.entries(itemsToImport)) {
            // Проверяем есть ли товар с таким URL
            if (data.url && existingUrls.has(data.url)) {
                skippedCount++;
                continue;
            }
            
            // Добавляем новый товар
            await browser.storage.local.set({ [id]: data });
            importedCount++;
            
            // Добавляем URL в множество существующих
            if (data.url) {
                existingUrls.add(data.url);
            }
        }
        
        let statusMessage = `Успешно импортировано: ${importedCount} товаров`;
        if (skippedCount > 0) {
            statusMessage += `<br>Пропущено дублей: ${skippedCount} товаров`;
        }
        
        showStatus(statusMessage, 'success');
        
    } catch (error) {
        showStatus('Ошибка: неверный формат файла', 'error');
    }
});

// Закрыть вкладку
function closeTab() {
    browser.tabs.getCurrent().then(tab => {
        browser.tabs.remove(tab.id);
    });
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = message;
    statusEl.className = `status ${type}`;
}