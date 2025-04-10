// popup.js
function getProductNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    let productPart = pathParts[2] || '';

    // Сокращаем до 30 символов
    if (productPart.length > 30) {
      productPart = productPart.substring(0, 27) + '...';
    }

    // Декодируем URI-компоненты
    return decodeURIComponent(productPart)
      .replace(/%30/g, ' ') // Заменяем %30 на пробелы
      .replace(/\s+/g, ' ')
      .trim();

  } catch (e) {
    console.error('Error parsing product name:', e);
    return 'Товар';
  }
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    browser.alarms.create("priceCheck", {
      History: message.history
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const itemsContainer = document.getElementById('items');
  
  
  await browser.browserAction.setIcon({
    path: {
      "48": "../icons/icon48.png"
    }
  });
  
  //priceChanged = true;
  
  const settingsButton = document.getElementById('settingsButton');
  const settingsContainer = document.getElementById('settingsContainer');
  const saveButton = document.getElementById('saveSettings');
  const checkIntervalInput = document.getElementById('checkInterval');
  const checkHistoryInput = document.getElementById('checkHistory');
  const body = document.body;

  // Загрузка сохраненных настроек
  const { settings } = await browser.storage.local.get('settings');
  if(!settings)
  {
  try{
  await browser.storage.local.set({ settings: { checkInterval: 10, checkHistory: 5  }  });
  } catch (error) {
  console.error('Ошибка сохранения настроек history:', error);
  }
  }
  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;

  // Обработчик кнопки настроек
  settingsButton.addEventListener('click', () => {
    settingsContainer.classList.toggle('visible');
    adjustPopupHeight();
  });

  // Обработчик сохранения
  saveButton.addEventListener('click', async () => {
    await browser.storage.local.set({
      settings: {
        checkInterval: parseInt(checkIntervalInput.value) || 10,
        checkHistory: parseInt(checkHistoryInput.value) || 5
      }
    });
    
    // Обновляем интервал проверки
    browser.runtime.sendMessage({
      action: "updateInterval",
      interval: parseInt(checkIntervalInput.value),
      history: parseInt(checkHistoryInput.value)
    });
    
    settingsContainer.classList.remove('visible');
    adjustPopupHeight();
  });

  // Автоматическая регулировка высоты
  function adjustPopupHeight() {
    const baseHeight = 450;
    const settingsHeight = settingsContainer.offsetHeight;
    body.style.height = settingsContainer.classList.contains('visible') 
      ? `${baseHeight + settingsHeight}px`
      : `${baseHeight}px`;
  }

  // Инициализация высоты
  adjustPopupHeight();
  
  
  
  const renderItems = async () => {
    try {
      const items = await browser.storage.local.get();
      let t_h;
      itemsContainer.innerHTML = '';

      if (!Object.keys(items).length) {
        itemsContainer.innerHTML = '<div class="empty">Нет отслеживаемых товаров</div>';
        return;
      }

      itemsContainer.innerHTML = await Promise.all(
        Object.entries(items).map(async ([id, data]) => {
          try {
          //TIME not used
           if (id === "settings")
           {
                t_h=data.checkHistory;
        	return ;
            }
            const productName = getProductNameFromUrl(data.url);
            return `
  <div class="item">
    <a href="${data.url}" class="product-link" target="_blank">${productName}</a>
    <div class="price-row">
      <span class="price-label">Исходная цена:</span>
      <span class="price-value">${data.originalPrice || 'N/A'}</span>
    </div>
    <div class="price-row">
      <span class="price-label">Текущая цена:</span>
      <span class="price-value">${data.currentPrice || 'N/A'}</span>
    </div>
    <div class="history">
      <div class="history-title">История изменений:</div>
      <ul class="history-list">
        ${(data.priceHistory || []).slice().reverse().slice(0, t_h ?? 5).map(entry => `
          <li class="history-item">
            <span class="history-time">${new Date(entry.timestamp).toLocaleString()}</span>
            <span class="history-price">${entry.price}</span>
          </li>
        `).join('')}
      </ul>
    </div>
    <button class="delete-btn" data-id="${id}"><img src="../icons/del.png" alt="Удалить"></button>
  </div>
`;            
          } catch (e) {
            console.error('Error rendering item:', e);
            return '';
          }
        })
      ).then(html => html.join(''));

      // Обработчики удаления
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await browser.storage.local.remove(btn.dataset.id);
          await renderItems();
        });
      });

    } catch (error) {
      console.error('Ошибка:', error);
      itemsContainer.innerHTML = `
        <div class="error">
          Ошибка загрузки списка<br>
          ${error.message}
        </div>
      `;
    }
  };

  await renderItems();
});