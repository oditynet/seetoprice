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

// Генератор мягких цветов для сайтов
function generateSiteColor(domain) {
  const colorMap = {};
  
  if (colorMap[domain]) {
    return colorMap[domain];
  }
  
  // Генерируем мягкие цвета на основе хеша домена
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Мягкие пастельные цвета
  const hue = Math.abs(hash % 360);
  
  // Генерируем мягкие оттенки (более светлые)
const saturation = 30 + Math.abs(hash % 15); // 30-45% (было 40-60%)
const lightness = 90 + Math.abs(hash % 8);   // 90-98% (было 85-95%)
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  colorMap[domain] = color;
  
  return color;
}

// Получение имени сайта из URL
function getSiteName(url) {
  try {
    const domain = new URL(url).hostname;
    // Убираем www и получаем основное имя домена
    return domain.replace(/^www\./, '');
  } catch (e) {
    return 'other';
  }
}

// Получение порядка сортировки сайтов
function getSiteOrder(url) {
  const siteName = getSiteName(url);
  const siteOrder = {
    'ozon.ru': 1,
    'wildberries.ru': 2,
    'vseinstrumenti.ru': 3,
    'lemanapro.ru': 4,
    'petrovich.ru': 5,
    'auto.ru': 6
  };

  return siteOrder[siteName] || 7;
}

// Загрузка и применение темы при открытии аддона
/*async function loadTheme() {
  try {
    const { settings } = await browser.storage.local.get('settings');

    console.log('Настройки из хранилища:', settings); // ОТЛАДКА
    
    const theme = settings?.theme || 'light';
    console.log('Применяем тему:', theme); // ОТЛАДКА
    
    // Устанавливаем значение в селект
    const themeSelect = document.getElementById('theme');
    if (themeSelect) {
      themeSelect.value = theme;
      console.log('Установлено значение селекта:', themeSelect.value); // ОТЛАДКА
    }
  } catch (error) {
    console.error('Ошибка загрузки темы:', error);
  }
}*/
async function loadTheme() {
  try {
    const { settings } = await browser.storage.local.get('settings');
    const theme = settings?.theme || 'light';
    
    // Применяем тему к документу
    document.documentElement.setAttribute('data-theme', theme);
    
    // Ждем полной загрузки DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
          themeSelect.value = theme;
        }
      });
    } else {
      // DOM уже загружен
      const themeSelect = document.getElementById('theme');
      if (themeSelect) {
        themeSelect.value = theme;
      }
    }
  } catch (error) {
    console.error('Ошибка загрузки темы:', error);
  }
}

// Сохранение темы
async function saveTheme(theme) {
  try {
    const { settings } = await browser.storage.local.get('settings');
    await browser.storage.local.set({
      settings: {
        ...settings,
        theme: theme
      }
    });
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('Ошибка сохранения темы:', error);
  }
}


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

/*function getProductNameFromUrl(url) {
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
}*/

function getProductNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    // Специальная обработка для auto.ru
    if (url.includes('auto.ru')) {
      // Для auto.ru берем марку и модель из пути
      // Пример: /cars/used/sale/peugeot/traveller/1130122557-8ca69577/
      const brand = pathParts[4] || ''; // peugeot
      const model = pathParts[5] || ''; // traveller
      
      if (brand && model) {
        // Преобразуем в читаемый формат: Peugeot Traveller
        const formattedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
        const formattedModel = model.charAt(0).toUpperCase() + model.slice(1);
        return `${formattedBrand} ${formattedModel}`;
      }
    }
    
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
  const themeSelect = document.getElementById('theme');
  
  // Загружаем тему при открытии
  await loadTheme();
  
  const body = document.body;
  
  // Загрузка сохраненных настроек
  const { settings } = await browser.storage.local.get('settings');
  if(!settings)
  {
  try{
  await browser.storage.local.set({ settings: { checkInterval: 10, checkHistory: 5, tgToken:'', tgId: '', theme: 'light'  }  });
  } catch (error) {
  console.error('Ошибка сохранения настроек history:', error);
  }
  }
  //console.log('tg '+tgToken.value);
  
  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;
  tgToken.value = settings?.tgToken || '';
  themeSelect.value = settings?.theme || 'light';
  
/*  if(tgToken.value != '')
    tgId.value = await findTelegramChatId(tgToken.value);
  else
    tgId.value = '';
*/

if(tgToken.value && tgToken.value.trim() !== '') {
    try {
        tgId.value = await findTelegramChatId(tgToken.value);
    } catch (error) {
        console.error('Ошибка получения chat ID:', error);
        tgId.value = 'Ошибка: ' + error.message;
    }
} else {
    tgId.value = '';
}

  // Обработчик кнопки настроек
  settingsButton.addEventListener('click', () => {
  
    settingsContainer.classList.toggle('visible');
    adjustPopupHeight();
  });

  // Обработчик сохранения
  saveButton.addEventListener('click', async () => {
  
    const themeSelect = document.getElementById('theme').value;
    await saveTheme(themeSelect);
    
    await browser.storage.local.set({
      settings: {
      
        checkInterval: parseInt(checkIntervalInput.value) || 10,
        checkHistory: parseInt(checkHistoryInput.value) || 5,
        tgToken: tgToken.value || '',
        tgId: await findTelegramChatId(tgToken.value) || '',
        theme: themeSelect || 'light',
      }
    });
    
    // Обновляем интервал проверки
    browser.runtime.sendMessage({
      action: "updateInterval",
      interval: parseInt(checkIntervalInput.value),
      history: parseInt(checkHistoryInput.value),
      tgToken: tgToken.value,
      tgId: tgToken ? tgId.value : '',
      theme: themeSelect
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

      // Группируем элементы по сайтам
      const siteGroups = {};
      
      Object.entries(items)
        .filter(([id]) => id !== 'settings')
        .forEach(([id, data]) => {
          const siteName = getSiteName(data.url);
          if (!siteGroups[siteName]) {
            siteGroups[siteName] = [];
          }
          siteGroups[siteName].push({ id, data });
        });

      // Сортируем группы сайтов
      const sortedSiteGroups = Object.entries(siteGroups).sort(([siteA], [siteB]) => {
        const orderA = getSiteOrder(siteA);
        const orderB = getSiteOrder(siteB);
        return orderA - orderB;
      });

      // Перебор групп сайтов
      for (const [siteName, siteItems] of sortedSiteGroups) {
        // Создаем контейнер для группы сайта
        const siteGroupDiv = document.createElement('div');
        siteGroupDiv.className = 'site-group';
        
        // Заголовок сайта
        const siteHeader = document.createElement('div');
        siteHeader.className = 'site-header';
        siteHeader.textContent = siteName;
        siteHeader.style.backgroundColor = generateSiteColor(siteName);
        
        // Контейнер для товаров сайта
        const siteItemsContainer = document.createElement('div');
        siteItemsContainer.className = 'site-items';
        
        // Перебор товаров в группе
        for (const { id, data } of siteItems) {
          try {
            // Создаем основные элементы
            const itemDiv = document.createElement('div');
            itemDiv.className = `site-item${data.hasNewChange ? ' highlight' : ''}`;
            itemDiv.dataset.id = id;
            itemDiv.style.backgroundColor = generateSiteColor(siteName);

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

            siteItemsContainer.appendChild(itemDiv);
          } catch (e) {
            console.error('Error rendering item:', e);
          }
        }
        
        // Добавляем группу сайта в фрагмент
        siteGroupDiv.appendChild(siteHeader);
        siteGroupDiv.appendChild(siteItemsContainer);
        fragment.appendChild(siteGroupDiv);
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
    /*  document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const scrollPosition = itemsContainer.scrollTop;
          
          await browser.storage.local.remove(btn.dataset.id);
          await renderItems();
          
          itemsContainer.scrollTop = scrollPosition;
        });
      });
      */
      
      
      document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const itemElement = btn.closest('.site-item');
    const siteGroup = btn.closest('.site-group');
    const itemId = btn.dataset.id;
    
    // Удаляем из хранилища
    await browser.storage.local.remove(itemId);
    
    // Удаляем элемент из DOM
    itemElement.remove();
    
    // Если в группе не осталось товаров, удаляем всю группу
    if (siteGroup.querySelectorAll('.site-item').length === 0) {
      siteGroup.remove();
    }
    
    // Если вообще не осталось товаров, показываем сообщение
    if (document.querySelectorAll('.site-item').length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty';
      emptyDiv.textContent = 'Нет отслеживаемых товаров';
      itemsContainer.appendChild(emptyDiv);
    }
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
  
  // Обработка подсветки измененных цен
  document.querySelectorAll('.site-item').forEach(async (item) => {
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
