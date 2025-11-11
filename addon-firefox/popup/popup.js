// popup.js

const escapeHTML = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"']/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[tag] || tag));
};

async function findTelegramChatId(token, expectedMessage = '/start') {
  const apiUrl = `https://api.telegram.org/bot${token}/getUpdates`;
  if (token == '' || token == null || token == undefined) return '';
  //console.log(token);
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

// Функция для определения порядка сортировки по сайтам
function getSiteOrder(url) {
  if (url.includes('ozon.ru')) return 1;
  if (url.includes('wildberries.ru')) return 2;
  if (url.includes('vseinstrumenti.ru')) return 3;
  return 4; // Все остальные сайты
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
  const tgToken = document.getElementById('tgToken') ;
  const tgId = document.getElementById('tgId');
  
  const body = document.body;

  // Загрузка сохраненных настроек
  const { settings } = await browser.storage.local.get('settings');
  if(!settings)
  {
  try{
  await browser.storage.local.set({ settings: { checkInterval: 10, checkHistory: 5, tgToken:'', tgId: ''  }  });
  } catch (error) {
  console.error('Ошибка сохранения настроек history:', error);
  }
  }
  //console.log('tg '+tgToken.value);
  
  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;
  tgToken.value = settings?.tgToken || '';
  if(tgToken.value != '')
    tgId.value = await findTelegramChatId(tgToken.value);
  else
    tgId.value = '';

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
        checkHistory: parseInt(checkHistoryInput.value) || 5,
        tgToken: tgToken.value || '',
        tgId: await findTelegramChatId(tgToken.value) || ''
      }
    });
    
    // Обновляем интервал проверки
    browser.runtime.sendMessage({
      action: "updateInterval",
      interval: parseInt(checkIntervalInput.value),
      history: parseInt(checkHistoryInput.value),
      tgToken: tgToken.value,
      tgId: tgToken ? tgId.value : ''
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
  const itemsContainer = document.getElementById('items');
  
  try {
    // Очистка контейнера
    while (itemsContainer.firstChild) {
      itemsContainer.removeChild(itemsContainer.firstChild);
    }

    const items = await browser.storage.local.get();
    let historyLimit = 5;

    // Обработка настроек
    if (items.settings) {
      historyLimit = items.settings.checkHistory || 5;
    }

    // Создаем фрагмент для эффективного добавления элементов
    const fragment = document.createDocumentFragment();

    // Сортируем элементы по сайтам
    const sortedItems = Object.entries(items)
      .filter(([id]) => id !== 'settings')
      .sort(([idA, dataA], [idB, dataB]) => {
        const orderA = getSiteOrder(dataA.url);
        const orderB = getSiteOrder(dataB.url);
        return orderA - orderB;
      });

    // Перебор всех элементов
    for (const [id, data] of sortedItems) {
      try {
        // Создаем основные элементы
        const itemDiv = document.createElement('div');
        itemDiv.className = `item${data.hasNewChange ? ' highlight' : ''}`;
        itemDiv.dataset.id = id;

        // Ссылка на товар
        const link = document.createElement('a');
        link.className = 'product-link';
        link.href = escapeHTML(data.url);
        link.target = '_blank';
        link.textContent = escapeHTML(getProductNameFromUrl(data.url));
        
        // Ценовые блоки
        const createPriceRow = (label, price) => {
          const row = document.createElement('div');
          row.className = 'price-row';
          
          const labelSpan = document.createElement('span');
          labelSpan.className = 'price-label';
          labelSpan.textContent = label;
          
          const valueSpan = document.createElement('span');
          valueSpan.className = 'price-value';
          valueSpan.textContent = escapeHTML(price || 'N/A');
          
          row.append(labelSpan, valueSpan);
          return row;
        };

        // История изменений
        const historySection = document.createElement('div');
        historySection.className = 'history';
        
        const historyTitle = document.createElement('div');
        historyTitle.className = 'history-title';
        historyTitle.textContent = 'История изменений';
        
        const historyList = document.createElement('ul');
        historyList.className = 'history-list';

        // Добавляем элементы истории
        (data.priceHistory || []).slice().reverse().slice(0, historyLimit).forEach(entry => {
          const li = document.createElement('li');
          li.className = 'history-item';
          
          const timeSpan = document.createElement('span');
          timeSpan.className = 'history-time';
          timeSpan.textContent = new Date(entry.timestamp).toLocaleString();
          
          const priceSpan = document.createElement('span');
          priceSpan.className = 'history-price';
          priceSpan.textContent = escapeHTML(entry.price);
          
          li.append(timeSpan, priceSpan);
          historyList.appendChild(li);
        });

        // Кнопка удаления
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.dataset.id = id;
        
        const deleteIcon = document.createElement('img');
        deleteIcon.src = '../icons/del.png';
        deleteIcon.alt = 'Удалить';
        deleteBtn.appendChild(deleteIcon);

        // Собираем всю структуру
        itemDiv.append(
          link,
          createPriceRow('Исходная цена:', data.originalPrice),
          createPriceRow('Текущая цена:', data.currentPrice),
          historySection
        );
        historySection.append(historyTitle, historyList);
        itemDiv.appendChild(deleteBtn);

        fragment.appendChild(itemDiv);
      } catch (e) {
        console.error('Error rendering item:', e);
      }
    }

    // Если нет элементов
    if (fragment.childElementCount === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = 'Нет отслеживаемых товаров';
      fragment.appendChild(emptyDiv);
    }

    itemsContainer.appendChild(fragment);

    // Обработчики удаления
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        await browser.storage.local.remove(btn.dataset.id);
        await renderItems();
      });
    });

  } catch (error) {
    console.error('Ошибка:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = `Ошибка загрузки: ${error.message}`;
    itemsContainer.appendChild(errorDiv);
  }
};

  await renderItems();  
  
  
    document.querySelectorAll('.item').forEach(async (item) => {
      const id = item.dataset.id;
      const itemData = await browser.storage.local.get(id);
      
      if (itemData[id]?.hasNewChange) {
        item.classList.add('highlight');
        
        // Таймер с правильным контекстом
        setTimeout(async () => {
          try {
            const currentData = await browser.storage.local.get(id);
            if (currentData[id]) {
              await browser.storage.local.set({
                [id]: {
                  ...currentData[id],
                  hasNewChange: false
                }
              });
              item.classList.remove('highlight');
            }
          } catch (e) {
            console.error('Update error:', e);
          }
        }, 10000);
      }
    });
  
  
  
});
