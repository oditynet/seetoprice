// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Находим элементы
    const fileInput = document.getElementById('fileInput');
    const closeButton = document.getElementById('closeButton');
    
    // Добавляем обработчики
    fileInput.addEventListener('change', handleFileImport);
    closeButton.addEventListener('click', closeTab);
});

async function handleFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const text = await file.text();
        const itemsToImport = JSON.parse(text);
        
        const existingItems = await chrome.storage.local.get();
        const existingUrls = new Set();
        
        Object.values(existingItems).forEach(item => {
            if (item && item.url) {
                existingUrls.add(item.url);
            }
        });
        
        let importedCount = 0;
        let skippedCount = 0;
        
        for (const [id, data] of Object.entries(itemsToImport)) {
            if (data.url && existingUrls.has(data.url)) {
                skippedCount++;
                continue;
            }
            
            await chrome.storage.local.set({ [id]: data });
            importedCount++;
            
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
}

function closeTab() {
    chrome.tabs.getCurrent().then(tab => {
        chrome.tabs.remove(tab.id);
    });
}

function showStatus(message, type) {
    const statusEl = document.getElementById('status');
    statusEl.innerHTML = message;
    statusEl.className = `status ${type}`;
}
