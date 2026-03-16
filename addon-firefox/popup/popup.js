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
  
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const hue = Math.abs(hash % 360);
  const saturation = 30 + Math.abs(hash % 15);
  const lightness = 90 + Math.abs(hash % 8);
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  colorMap[domain] = color;
  
  return color;
}

// Получение имени сайта из URL
function getSiteName(url) {
  try {
    const domain = new URL(url).hostname;
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
async function loadTheme() {
  try {
    const { settings } = await browser.storage.local.get('settings');
    const theme = settings?.theme || 'light';
    
    document.documentElement.setAttribute('data-theme', theme);
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
          themeSelect.value = theme;
        }
      });
    } else {
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

// Функции для работы с состоянием групп
async function saveGroupState(groupName, isExpanded) {
  try {
    const { settings = {} } = await browser.storage.local.get('settings');
    
    if (!settings.groupStates) {
      settings.groupStates = {};
    }
    settings.groupStates[groupName] = isExpanded;
    
    await browser.storage.local.set({ settings });
  } catch (error) {
    console.error('Ошибка сохранения состояния группы:', error);
  }
}

async function loadGroupStates() {
  try {
    const { settings = {} } = await browser.storage.local.get('settings');
    return settings.groupStates || {};
  } catch (error) {
    console.error('Ошибка загрузки состояния групп:', error);
    return {};
  }
}

async function removeGroupState(groupName) {
  try {
    const { settings = {} } = await browser.storage.local.get('settings');
    
    if (settings.groupStates && settings.groupStates[groupName]) {
      delete settings.groupStates[groupName];
      await browser.storage.local.set({ settings });
    }
  } catch (error) {
    console.error('Ошибка удаления состояния группы:', error);
  }
}

async function findTelegramChatId(token, expectedMessage = '/start') {
  const apiUrl = `https://api.telegram.org/bot${token}/getUpdates`;
  if (token == '' || token == null || token == undefined) return '';
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.description || 'Ошибка API Telegram');
    }

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
    
    if (url.includes('auto.ru')) {
      const brand = pathParts[4] || '';
      const model = pathParts[5] || '';
      
      if (brand && model) {
        const formattedBrand = brand.charAt(0).toUpperCase() + brand.slice(1);
        const formattedModel = model.charAt(0).toUpperCase() + model.slice(1);
        return `${formattedBrand} ${formattedModel}`;
      }
    }
    
    let productPart = pathParts[2] || '';
    if (url.includes('avito.ru')) {
      productPart = pathParts[3] || '';
    } 

    if (productPart.length > 30) {
      productPart = productPart.substring(0, 27) + '...';
    }

    return decodeURIComponent(productPart)
      .replace(/%30/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  } catch (e) {
    console.error('Error parsing product name:', e);
    return 'Товар';
  }
}

// Функция для запроса скидки
async function requestDiscount(url, itemId, itemData) {
  try {
    const tab = await browser.tabs.create({
      url: url,
      active: true
    });

    await new Promise(resolve => 
      browser.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      })
    );

    await new Promise(resolve => setTimeout(resolve, 2000));

    const result = await browser.tabs.sendMessage(tab.id, {
      action: "clickOzonDiscount"
    });

    if (result.success) {
      // Получаем текст кнопки после нажатия
      const textResult = await browser.tabs.sendMessage(tab.id, {
        action: "getDiscountText"
      });
      
      // Обновляем статус в storage
      await browser.storage.local.set({
        [itemId]: {
          ...itemData,
          discountStatus: 'requested',
          discountAvailable: false,
          discountRequested: true,
          discountText: textResult?.text || 'Скидка запрошена'
        }
      });
      
      setTimeout(() => {
        browser.tabs.remove(tab.id);
      }, 3000);
      
      return true;
    } else {
      console.error('Ошибка при нажатии:', result.error);
      setTimeout(() => {
        browser.tabs.remove(tab.id);
      }, 2000);
      return false;
    }
    
  } catch (error) {
    console.error('Ошибка при запросе скидки:', error);
    return false;
  }
}



// Экспорт в файл
async function exportToFile() {
  const items = JSON.parse(localStorage.getItem('allItems') || '{}');
  const checkboxes = document.querySelectorAll('.export-checkbox:checked');
  const selectedItems = {};
  
  checkboxes.forEach(checkbox => {
    const id = checkbox.dataset.id;
    if (items[id]) {
      selectedItems[id] = items[id];
    }
  });
  
  if (Object.keys(selectedItems).length === 0) {
    alert('Не выбрано ни одного товара для экспорта');
    return;
  }
  
  try {
    const dataStr = JSON.stringify(selectedItems, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'seetoprice.json';
    link.click();
    URL.revokeObjectURL(url);
    
  } catch (error) {
    alert('Ошибка экспорта');
  }
}

function importFromFile() {
  browser.tabs.create({
    url: browser.runtime.getURL('import.html')
  });
}

function selectAllItems() {
  document.querySelectorAll('.export-checkbox').forEach(checkbox => {
    checkbox.checked = true;
  });
}

function deselectAllItems() {
  document.querySelectorAll('.export-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
}

function renderImportExportItems(items) {
  const container = document.getElementById('importExportItems');
  container.innerHTML = '';
  
  if (Object.keys(items).filter(id => id !== 'settings').length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #667; padding: 10px;">Нет товаров для экспорта</div>';
    return;
  }
  
  Object.entries(items)
    .filter(([id]) => id !== 'settings')
    .forEach(([id, data]) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'import-item';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = true;
      checkbox.dataset.id = id;
      checkbox.className = 'export-checkbox';
      
      const itemInfo = document.createElement('div');
      itemInfo.className = 'import-item-info';
      
      const nameDiv = document.createElement('div');
      nameDiv.className = 'import-item-name';
      nameDiv.textContent = getProductNameFromUrl(data.url);
      
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'import-item-details';
      detailsDiv.textContent = `${data.currentPrice} • ${new URL(data.url).hostname}`;
      
      itemInfo.appendChild(nameDiv);
      itemInfo.appendChild(detailsDiv);
      
      itemDiv.appendChild(checkbox);
      itemDiv.appendChild(itemInfo);
      container.appendChild(itemDiv);
    });
}

browser.runtime.onMessage.addListener((message) => {
  if (message.action === "updateInterval") {
    browser.alarms.create("priceCheck", {
      periodInMinutes: message.interval
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
  
  const settingsButton = document.getElementById('settingsButton');
  const importExportButton = document.getElementById('importExportButton');
  const settingsContainer = document.getElementById('settingsContainer');
  const importExportContainer = document.getElementById('importExportContainer');
  const saveButton = document.getElementById('saveSettings');
  const checkIntervalInput = document.getElementById('checkInterval');
  const checkHistoryInput = document.getElementById('checkHistory');
  const tgToken = document.getElementById('tgToken');
  const tgId = document.getElementById('tgId');
  const themeSelect = document.getElementById('theme');
  
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  await loadTheme();
  
  const body = document.body;
  
  const { settings } = await browser.storage.local.get('settings');
  if(!settings) {
    try {
      await browser.storage.local.set({ 
        settings: { 
          checkInterval: 10, 
          checkHistory: 5, 
          tgToken:'', 
          tgId: '', 
          theme: 'light',
          groupStates: {}
        }  
      });
    } catch (error) {
      console.error('Ошибка сохранения настроек history:', error);
    }
  }
  
  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;
  tgToken.value = settings?.tgToken || '';
  themeSelect.value = settings?.theme || 'light';
  
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

  settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsContainer.classList.toggle('visible');
    if (settingsContainer.classList.contains('visible')) {
      importExportContainer.classList.remove('visible');
    }
    adjustPopupHeight();
  });

  importExportButton.addEventListener('click', (e) => {
    e.stopPropagation();
    importExportContainer.classList.toggle('visible');
    if (importExportContainer.classList.contains('visible')) {
      settingsContainer.classList.remove('visible');
      browser.storage.local.get().then(allItems => {
        localStorage.setItem('allItems', JSON.stringify(allItems));
        renderImportExportItems(allItems);
      });
    }
    adjustPopupHeight();
  });

  selectAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    selectAllItems();
  });
  
  deselectAllBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deselectAllItems();
  });
  
  exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportToFile();
  });
  
  importBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    importFromFile();
  });

  saveButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const themeSelect = document.getElementById('theme').value;
    await saveTheme(themeSelect);
    
    const currentSettings = await browser.storage.local.get('settings');
    const currentGroupStates = currentSettings.settings?.groupStates || {};
    
    await browser.storage.local.set({
      settings: {
        checkInterval: parseInt(checkIntervalInput.value) || 10,
        checkHistory: parseInt(checkHistoryInput.value) || 5,
        tgToken: tgToken.value || '',
        tgId: await findTelegramChatId(tgToken.value) || '',
        theme: themeSelect || 'light',
        groupStates: currentGroupStates
      }
    });
    
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

  function adjustPopupHeight() {
    const baseHeight = 450;
    const settingsHeight = settingsContainer.offsetHeight;
    const importExportHeight = importExportContainer.offsetHeight;
    
    let additionalHeight = 0;
    if (settingsContainer.classList.contains('visible')) {
      additionalHeight = settingsHeight;
    } else if (importExportContainer.classList.contains('visible')) {
      additionalHeight = importExportHeight;
    }
    
    body.style.height = `${baseHeight + additionalHeight}px`;
  }

  adjustPopupHeight();
  
  const renderItems = async () => {
    const itemsContainer = document.getElementById('items');
    
    try {
      while (itemsContainer.firstChild) {
        itemsContainer.removeChild(itemsContainer.firstChild);
      }

      const items = await browser.storage.local.get();
      let historyLimit = 5;

      if (items.settings) {
        historyLimit = items.settings.checkHistory || 5;
      }

      const groupStates = await loadGroupStates();
      const fragment = document.createDocumentFragment();

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

      const sortedSiteGroups = Object.entries(siteGroups).sort(([siteA], [siteB]) => {
        const orderA = getSiteOrder(siteA);
        const orderB = getSiteOrder(siteB);
        return orderA - orderB;
      });

      for (const [siteName, siteItems] of sortedSiteGroups) {
        if (siteItems.length === 0) {
          continue;
        }

        const siteGroupDiv = document.createElement('div');
        siteGroupDiv.className = 'site-group';
        
        const isInitiallyExpanded = groupStates[siteName] !== false;
        
        const siteHeader = document.createElement('div');
        siteHeader.className = 'site-header';
        siteHeader.style.backgroundColor = generateSiteColor(siteName);
        
        const toggleIcon = document.createElement('span');
        toggleIcon.className = 'toggle-icon';
        toggleIcon.textContent = isInitiallyExpanded ? '▼' : '▶';
        toggleIcon.style.marginRight = '8px';
        toggleIcon.style.cursor = 'pointer';
        toggleIcon.style.fontSize = '12px';
        
        const siteNameSpan = document.createElement('span');
        siteNameSpan.textContent = siteName;
        siteNameSpan.style.cursor = 'pointer';
        siteNameSpan.style.flex = '1';
        
        const itemCount = document.createElement('span');
        itemCount.className = 'item-count';
        itemCount.textContent = `(${siteItems.length})`;
        itemCount.style.marginLeft = '8px';
        itemCount.style.fontSize = '12px';
        itemCount.style.opacity = '0.7';
        
        siteHeader.appendChild(toggleIcon);
        siteHeader.appendChild(siteNameSpan);
        siteHeader.appendChild(itemCount);
        
        const siteItemsContainer = document.createElement('div');
        siteItemsContainer.className = 'site-items';
        siteItemsContainer.style.display = isInitiallyExpanded ? 'block' : 'none';
        
        for (const { id, data } of siteItems) {
          try {
            const itemDiv = document.createElement('div');
            itemDiv.className = `site-item${data.hasNewChange ? ' highlight' : ''}`;
            itemDiv.dataset.id = id;
            itemDiv.style.backgroundColor = generateSiteColor(siteName);
            itemDiv.style.position = 'relative';

            const link = document.createElement('a');
            link.className = 'product-link';
            link.href = escapeHTML(data.url);
            link.target = '_blank';
            link.textContent = escapeHTML(getProductNameFromUrl(data.url));
            
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

            const historySection = document.createElement('div');
            historySection.className = 'history';
            
            const historyTitle = document.createElement('div');
            historyTitle.className = 'history-title';
            historyTitle.textContent = 'История изменений';
            
            const historyList = document.createElement('ul');
            historyList.className = 'history-list';

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

            // Контейнер для кнопок (справа)
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.position = 'absolute';
            buttonsContainer.style.top = '1px';
            buttonsContainer.style.right = '10px';
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '5px';
            buttonsContainer.style.zIndex = '10';

            // Кнопка скидки (только для Ozon)

if (siteName.includes('ozon.ru')) {
  const discountBtn = document.createElement('button');
  discountBtn.style.width = '18px';
  discountBtn.style.height = '16px';
  discountBtn.style.border = '1px solid #ccc';
  discountBtn.style.borderRadius = '4px';
  discountBtn.style.cursor = 'pointer';
  discountBtn.style.display = 'flex';
  discountBtn.style.alignItems = 'center';
  discountBtn.style.justifyContent = 'center';
  discountBtn.style.fontSize = '14px';
  discountBtn.style.fontWeight = 'bold';
  discountBtn.style.padding = '0';
  discountBtn.style.lineHeight = '1';
  discountBtn.style.backgroundColor = 'transparent';
  discountBtn.style.color = '#666';
  
  // Состояние 1: Скидка отклонена (красная)
  if (data.discountStatus === 'rejected') {
    discountBtn.style.backgroundColor = '#dc3545';
    discountBtn.style.color = 'white';
    discountBtn.style.border = 'none';
    discountBtn.title = 'Скидка отклонена';
    discountBtn.disabled = true;
    discountBtn.style.opacity = '0.8';
    discountBtn.textContent = '✗';
    discountBtn.style.fontSize = '14px';
    buttonsContainer.appendChild(discountBtn);
  }
  // Состояние 2: Скидка получена (зеленая)
  else if (data.discountStatus === 'received' || 
           (data.discountText && data.discountText.includes('Скидка запрошена —'))) {
    discountBtn.style.backgroundColor = '#28a745';
    discountBtn.style.color = 'white';
    discountBtn.style.border = 'none';
    discountBtn.title = data.discountText || 'Скидка получена';
    discountBtn.disabled = true;
    discountBtn.style.opacity = '0.8';
    discountBtn.textContent = '✓';
    discountBtn.style.fontSize = '16px';
    buttonsContainer.appendChild(discountBtn);
  }
  // Состояние 3: Скидка запрошена, ожидается (желтая)
  else if (data.discountStatus === 'requested' || 
           data.discountRequested === true ||
           (data.discountText && data.discountText.includes('Скидка запрошена'))) {
    discountBtn.style.backgroundColor = '#ffc107';
    discountBtn.style.color = '#000';
    discountBtn.style.border = 'none';
    discountBtn.title = data.discountText || 'Скидка запрошена, ожидается ответ';
    discountBtn.disabled = true;
    discountBtn.style.opacity = '0.8';
    discountBtn.textContent = '⏳';
    buttonsContainer.appendChild(discountBtn);
  }
  // Состояние 4: Кнопка доступна (без цвета, с контуром)
  else if (data.discountAvailable === true || 
           data.discountStatus === 'available' ||
           (data.discountText && data.discountText.includes('Хочу скидку'))) {
    discountBtn.title = 'Запросить скидку';
    discountBtn.textContent = '%';
    discountBtn.style.backgroundColor = 'transparent';
    discountBtn.style.color = '#666';
    discountBtn.style.border = '1px solid #ccc';
    
    discountBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      discountBtn.disabled = true;
      discountBtn.style.opacity = '0.5';
      discountBtn.textContent = '⏳';
      discountBtn.title = 'Запрос отправляется...';
      
      const success = await requestDiscount(data.url, id, data);
      
      if (success) {
        discountBtn.style.backgroundColor = '#ffc107';
        discountBtn.style.color = '#000';
        discountBtn.style.border = 'none';
        discountBtn.title = 'Скидка запрошена, ожидается ответ';
        discountBtn.textContent = '⏳';
        discountBtn.style.opacity = '0.8';
      } else {
        discountBtn.disabled = false;
        discountBtn.style.opacity = '1';
        discountBtn.style.backgroundColor = 'transparent';
        discountBtn.style.color = '#666';
        discountBtn.style.border = '1px solid #ccc';
        discountBtn.textContent = '%';
        discountBtn.title = 'Запросить скидку (ошибка, попробуйте снова)';
      }
    });
    
    buttonsContainer.appendChild(discountBtn);
  }
  // Состояние 5: Кнопки нет - ничего не добавляем
}	    
	    
            // Кнопка удаления
            const deleteBtn = document.createElement('button');
            deleteBtn.style.width = '18px';
            deleteBtn.style.height = '16px';
            deleteBtn.style.border = 'none';
            deleteBtn.style.background = 'none';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.style.display = 'flex';
            deleteBtn.style.alignItems = 'center';
            deleteBtn.style.justifyContent = 'center';
            deleteBtn.style.padding = '0';
            deleteBtn.dataset.id = id;

            const deleteIcon = document.createElement('img');
            deleteIcon.src = '../icons/del.png';
            deleteIcon.alt = 'Удалить';
            deleteIcon.style.width = '16px';
            deleteIcon.style.height = '16px';
            deleteIcon.style.opacity = '0.6';
            deleteBtn.appendChild(deleteIcon);

            buttonsContainer.appendChild(deleteBtn);

            itemDiv.append(
              link,
              createPriceRow('Исходная цена:', data.originalPrice),
              createPriceRow('Текущая цена:', data.currentPrice),
              historySection,
              buttonsContainer
            );
            historySection.append(historyTitle, historyList);

            siteItemsContainer.appendChild(itemDiv);
          } catch (e) {
            console.error('Error rendering item:', e);
          }
        }
        
        siteHeader.addEventListener('click', (e) => {
          if (e.target.closest('button')) return;
          
          const isExpanded = siteItemsContainer.style.display !== 'none';
          const newState = !isExpanded;
          
          if (newState) {
            siteItemsContainer.style.display = 'block';
            toggleIcon.textContent = '▼';
          } else {
            siteItemsContainer.style.display = 'none';
            toggleIcon.textContent = '▶';
          }
          
          saveGroupState(siteName, newState);
        });
        
        siteGroupDiv.appendChild(siteHeader);
        siteGroupDiv.appendChild(siteItemsContainer);
        fragment.appendChild(siteGroupDiv);
      }

      if (fragment.childElementCount === 0) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty';
        emptyDiv.textContent = 'Нет отслеживаемых товаров';
        emptyDiv.style.textAlign = 'center';
        emptyDiv.style.padding = '20px';
        emptyDiv.style.color = '#668';
        fragment.appendChild(emptyDiv);
      }

      itemsContainer.appendChild(fragment);

      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const itemElement = btn.closest('.site-item');
          const siteGroup = btn.closest('.site-group');
          const siteHeader = siteGroup.querySelector('.site-header');
          const siteName = siteHeader.querySelector('span:not(.toggle-icon):not(.item-count)').textContent;
          const itemId = btn.dataset.id;
          
          await browser.storage.local.remove(itemId);
          
          itemElement.remove();
          
          const itemCount = siteGroup.querySelector('.item-count');
          const remainingItems = siteGroup.querySelectorAll('.site-item').length;
          itemCount.textContent = `(${remainingItems})`;
          
          if (remainingItems === 0) {
            siteGroup.remove();
            await removeGroupState(siteName);
          }
          
          const allItems = document.querySelectorAll('.site-item');
          if (allItems.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'empty';
            emptyDiv.textContent = 'Нет отслеживаемых товаров';
            emptyDiv.style.textAlign = 'center';
            emptyDiv.style.padding = '20px';
            emptyDiv.style.color = '#668';
            itemsContainer.appendChild(emptyDiv);
          }
        });
      });

    } catch (error) {
      console.error('Ошибка:', error);
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error';
      errorDiv.textContent = `Ошибка загрузки: ${error.message}`;
      errorDiv.style.color = 'red';
      errorDiv.style.padding = '10px';
      errorDiv.style.textAlign = 'center';
      itemsContainer.appendChild(errorDiv);
    }
  };
  
  await renderItems();  
  
  document.querySelectorAll('.site-item').forEach(async (item) => {
    const id = item.dataset.id;
    const itemData = await browser.storage.local.get(id);
    
    if (itemData[id]?.hasNewChange) {
      item.classList.add('highlight');
      
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
