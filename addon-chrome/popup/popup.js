// popup.js

/*async function findTelegramChatId(token, expectedMessage = '/start') {
  const apiUrl = `https://api.telegram.org/bot${token}/getUpdates`;
  if (token == '' || token == null || token == undefined) return '';
  console.log(token);
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Ошибка API Telegram');
    }

    // Ищем последнее сообщение с нужным текстом
    const update = data.result.reverse().find(u => 
      u.message?.text?.includes(expectedMessage)
    );

    if (!update) {
      throw new Error('Отправьте боту сообщение "' + expectedMessage + '"');
    }

    return update.message.chat.id;
    
  } catch (error) {
    console.error('Ошибка получения chatID:', error);
    throw error;
  }
}

*/


function getProductNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    let productPart = pathParts[2] || '';
    if (url.includes('avito.ru')) {
     productPart = pathParts[3] || '';
      } 

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

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    chrome.alarms.create("priceCheck", {
      History: message.history
    });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  const itemsContainer = document.getElementById('items');
  
  
  await chrome.action.setIcon({
    path: "../icons/icon48.png"
  });
  
  //priceChanged = true;
  
  const settingsButton = document.getElementById('settingsButton');
  const settingsContainer = document.getElementById('settingsContainer');
  const saveButton = document.getElementById('saveSettings');
  const checkIntervalInput = document.getElementById('checkInterval');
  const checkHistoryInput = document.getElementById('checkHistory');
//  const tgToken = document.getElementById('tgToken') ;
//  const tgId = document.getElementById('tgId');
  
  const body = document.body;

  // Загрузка сохраненных настроек
  const { settings } = await chrome.storage.local.get('settings');
  if(!settings)
  {
  try{
//  await chrome.storage.local.set({ settings: { checkInterval: 10, checkHistory: 5, tgToken:'', tgId: ''  }  });
  await chrome.storage.local.set({ settings: { checkInterval: 10, checkHistory: 5  }  });
  } catch (error) {
  console.error('Ошибка сохранения настроек history:', error);
  }
  }
//  console.log('tg '+tgToken.value);
  
  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;
  /*tgToken.value = settings?.tgToken || '';
  if(tgToken.value != '')
    tgId.value = await findTelegramChatId(tgToken.value);
  else
    tgId.value = '';
*/
  // Обработчик кнопки настроек
  settingsButton.addEventListener('click', () => {
    settingsContainer.classList.toggle('visible');
    adjustPopupHeight();
  });

  // Обработчик сохранения
  saveButton.addEventListener('click', async () => {
    await chrome.storage.local.set({
      settings: {
        checkInterval: parseInt(checkIntervalInput.value) || 10,
        checkHistory: parseInt(checkHistoryInput.value) || 5//,
        //tgToken: tgToken.value || '',
        //tgId: await findTelegramChatId(tgToken.value) || ''
      }
    });
    
    // Обновляем интервал проверки
    chrome.runtime.sendMessage({
      action: "updateInterval",
      interval: parseInt(checkIntervalInput.value),
      history: parseInt(checkHistoryInput.value),
      //tgToken: tgToken.value,
      //tgId: tgToken ? tgId.value : ''
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
      const items = await chrome.storage.local.get();
      let t_h;
      itemsContainer.innerHTML = '';

      if (!Object.keys(items).length) {
//        const element = document.getElementById('items');
//        element.textContent = '<div class="empty">Нет отслеживаемых товаров</div>';
//        document.body.appendChild(element);
        itemsContainer.innerHTML = '<div class="empty">Нет отслеживаемых товаров</div>';
        return;
      }
//      const element = document.getElementById('items');
//      element.textContent = await Promise.all(
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
            <div class="item ${data.hasNewChange ? 'highlight' : ''}" data-id="${id}">
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
  </div>
`;            
          } catch (e) {
            console.error('Error rendering item:', e);
            return '';
          }
        })
      ).then(html => html.join(''));
//      document.body.appendChild(element);

      // Обработчики удаления
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          await chrome.storage.local.remove(btn.dataset.id);
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
  
  
    document.querySelectorAll('.item').forEach(async (item) => {
      const id = item.dataset.id;
      const itemData = await chrome.storage.local.get(id);
      
      if (itemData[id]?.hasNewChange) {
        item.classList.add('highlight');
        
        // Таймер с правильным контекстом
        setTimeout(async () => {
          try {
            const currentData = await chrome.storage.local.get(id);
            if (currentData[id]) {
              await chrome.storage.local.set({
                [id]: {
                  ...currentData[id],
                  hasNewChange: false
                }
              });
              await updateItem(id); 
              item.classList.remove('highlight');
              
              // Обновляем список после изменения
             // await renderItems();
            }
          } catch (e) {
            console.error('Update error:', e);
          }
        }, 10000);
      }
    });
  
  
  
});