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

function generateSiteColor(domain) {
  const colorMap = {};
  if (colorMap[domain]) return colorMap[domain];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  const saturation = 25 + Math.abs(hash % 12);
  const lightness = 90 + Math.abs(hash % 8);
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  colorMap[domain] = color;
  return color;
}

function getSiteName(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (e) {
    return 'other';
  }
}

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

async function loadTheme() {
  try {
    const { settings } = await browser.storage.local.get('settings');
    const theme = settings?.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const themeSelect = document.getElementById('theme');
    if (themeSelect) themeSelect.value = theme;
  } catch (error) {
    console.error('Ошибка загрузки темы:', error);
  }
}

async function saveTheme(theme) {
  try {
    const { settings } = await browser.storage.local.get('settings');
    await browser.storage.local.set({ settings: { ...settings, theme } });
    document.documentElement.setAttribute('data-theme', theme);
  } catch (error) {
    console.error('Ошибка сохранения темы:', error);
  }
}

async function saveGroupState(groupName, isExpanded) {
  try {
    const { settings = {} } = await browser.storage.local.get('settings');
    if (!settings.groupStates) settings.groupStates = {};
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

function getProductNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    if (url.includes('auto.ru')) {
      const brand = pathParts[4] || '';
      const model = pathParts[5] || '';
      if (brand && model) {
        return `${brand.charAt(0).toUpperCase() + brand.slice(1)} ${model.charAt(0).toUpperCase() + model.slice(1)}`;
      }
    }
    let productPart = pathParts[2] || '';
    if (url.includes('avito.ru')) productPart = pathParts[3] || '';
    if (productPart.length > 30) productPart = productPart.substring(0, 27) + '...';
    return decodeURIComponent(productPart).replace(/%30/g, ' ').replace(/\s+/g, ' ').trim();
  } catch (e) {
    return 'Товар';
  }
}

async function requestDiscount(url, itemId, itemData) {
  try {
    const tab = await browser.tabs.create({ url, active: true });
    await new Promise(resolve => {
      browser.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === 'complete') {
          browser.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      });
    });
    await new Promise(resolve => setTimeout(resolve, 1400));
    const result = await browser.tabs.sendMessage(tab.id, { action: "clickOzonDiscount" });
    if (result && result.success) {
      await browser.storage.local.set({
        [itemId]: { ...itemData, discountStatus: 'requested', discountAvailable: false, discountRequested: true }
      });
      setTimeout(() => browser.tabs.remove(tab.id), 400);
      return true;
    } else {
      setTimeout(() => browser.tabs.remove(tab.id), 1000);
      return false;
    }
  } catch (error) {
    console.error('Ошибка при запросе скидки:', error);
    return false;
  }
}

async function exportToFile() {
  const items = JSON.parse(localStorage.getItem('allItems') || '{}');
  const checkboxes = document.querySelectorAll('.export-checkbox:checked');
  const selectedItems = {};
  checkboxes.forEach(checkbox => {
    const id = checkbox.dataset.id;
    if (items[id]) selectedItems[id] = items[id];
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
  browser.tabs.create({ url: browser.runtime.getURL('import.html') });
}

function selectAllItems() {
  document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = true);
}

function deselectAllItems() {
  document.querySelectorAll('.export-checkbox').forEach(cb => cb.checked = false);
}

function renderImportExportItems(items) {
  const container = document.getElementById('importExportItems');
  container.innerHTML = '';
  const filtered = Object.entries(items).filter(([id]) => id !== 'settings');
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: #667; padding: 10px;">Нет товаров для экспорта</div>';
    return;
  }
  filtered.forEach(([id, data]) => {
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
    browser.alarms.create("priceCheck", { periodInMinutes: message.interval });
  }
});

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[popup] DOMContentLoaded — старт');
  const itemsContainer = document.getElementById('items');
  await browser.browserAction.setIcon({ path: { "48": "../icons/icon48.png" } });

  const settingsButton = document.getElementById('settingsButton');
  const importExportButton = document.getElementById('importExportButton');
  const settingsContainer = document.getElementById('settingsContainer');
  const importExportContainer = document.getElementById('importExportContainer');
  const saveButton = document.getElementById('saveSettings');
  const checkIntervalInput = document.getElementById('checkInterval');
  const checkHistoryInput = document.getElementById('checkHistory');
  const themeSelect = document.getElementById('theme');
  const selectAllBtn = document.getElementById('selectAllBtn');
  const deselectAllBtn = document.getElementById('deselectAllBtn');
  const exportBtn = document.getElementById('exportBtn');
  const importBtn = document.getElementById('importBtn');

  await loadTheme();
  const body = document.body;

  const { settings } = await browser.storage.local.get('settings');
  if (!settings) {
    await browser.storage.local.set({
      settings: { checkInterval: 10, checkHistory: 5, tgToken: '', tgId: '', theme: 'light', groupStates: {} }
    });
  }

  checkIntervalInput.value = settings?.checkInterval || 10;
  checkHistoryInput.value = settings?.checkHistory || 5;
  themeSelect.value = settings?.theme || 'light';

  settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsContainer.classList.toggle('visible');
    if (settingsContainer.classList.contains('visible')) importExportContainer.classList.remove('visible');
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

  selectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); selectAllItems(); });
  deselectAllBtn.addEventListener('click', (e) => { e.stopPropagation(); deselectAllItems(); });
  exportBtn.addEventListener('click', (e) => { e.stopPropagation(); exportToFile(); });
  importBtn.addEventListener('click', (e) => { e.stopPropagation(); importFromFile(); });

  saveButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const themeVal = document.getElementById('theme').value;
    await saveTheme(themeVal);
    const currentSettings = await browser.storage.local.get('settings');
    const currentGroupStates = currentSettings.settings?.groupStates || {};
    await browser.storage.local.set({
      settings: {
        checkInterval: parseInt(checkIntervalInput.value) || 10,
        checkHistory: parseInt(checkHistoryInput.value) || 5,
        theme: themeVal || 'light',
        groupStates: currentGroupStates
      }
    });
    browser.runtime.sendMessage({
      action: "updateInterval",
      interval: parseInt(checkIntervalInput.value),
      history: parseInt(checkHistoryInput.value),
      theme: themeVal
    });
    settingsContainer.classList.remove('visible');
    adjustPopupHeight();
  });

  function adjustPopupHeight() {
    const baseHeight = 450;
    const settingsHeight = settingsContainer.offsetHeight;
    const importExportHeight = importExportContainer.offsetHeight;
    let additionalHeight = 0;
    if (settingsContainer.classList.contains('visible')) additionalHeight = settingsHeight;
    else if (importExportContainer.classList.contains('visible')) additionalHeight = importExportHeight;
    body.style.height = `${baseHeight + additionalHeight}px`;
  }

  adjustPopupHeight();

  const renderItems = async () => {
    try {
      while (itemsContainer.firstChild) itemsContainer.removeChild(itemsContainer.firstChild);

      const items = await browser.storage.local.get();
      let historyLimit = 5;
      if (items.settings) historyLimit = items.settings.checkHistory || 5;

      const groupStates = await loadGroupStates();
      const fragment = document.createDocumentFragment();

      const siteGroups = {};
      Object.entries(items)
        .filter(([id]) => id !== 'settings')
        .forEach(([id, data]) => {
          const siteName = getSiteName(data.url);
          if (!siteGroups[siteName]) siteGroups[siteName] = [];
          siteGroups[siteName].push({ id, data });
        });

      const sortedSiteGroups = Object.entries(siteGroups).sort(([siteA], [siteB]) => getSiteOrder(siteA) - getSiteOrder(siteB));

      for (const [siteName, siteItems] of sortedSiteGroups) {
        if (siteItems.length === 0) continue;

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
            itemDiv.className = `site-item${data.hasNewChange ? ' highlight' : ''}${data.hasNewDiscount ? ' discount-highlight' : ''}`;
            itemDiv.dataset.id = id;
            itemDiv.style.backgroundColor = generateSiteColor(siteName);
            itemDiv.style.position = 'relative';

            const link = document.createElement('a');
            link.className = 'product-link';
            link.href = escapeHTML(data.url);
            link.target = '_blank';
            link.textContent = escapeHTML(getProductNameFromUrl(data.url));

            if (data.isOutOfStock || data.isSoldOut) {
              link.style.color = '#dc3545';
              link.style.fontWeight = 'bold';
              link.title = 'Товар закончился';
              const outOfStockBadge = document.createElement('span');
              outOfStockBadge.textContent = ' ⛔';
              outOfStockBadge.style.color = '#dc3545';
              outOfStockBadge.style.fontSize = '14px';
              link.appendChild(outOfStockBadge);
            }

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

            // ========== БЛОК СТАТИСТИКИ РЕЙТИНГА ==========
            const ratingStatsEl = document.createElement('div');
            ratingStatsEl.className = 'rating-stats';
            ratingStatsEl.style.display = data.ratingStats ? 'block' : 'none';
            ratingStatsEl.style.marginTop = '4px';
            ratingStatsEl.style.padding = '4px 6px';
            ratingStatsEl.style.background = 'rgba(0,91,255,0.01)';
            ratingStatsEl.style.borderLeft = '3px solid rgba(0, 91, 255, 0.01)';
            ratingStatsEl.style.borderRadius = '4px';
            ratingStatsEl.style.fontSize = '11px';
            ratingStatsEl.style.lineHeight = '1.35';

            if (data.ratingStats) {
              const l1 = document.createElement('div');
              l1.className = 'rating-line1';
              l1.style.color = '#7a9bc4';//'#005bff';
              l1.style.fontWeight = 'bold';
              l1.textContent = data.ratingStats.line1;

              /*const l2 = document.createElement('div');
              l2.className = 'rating-line2';
              l2.style.color = '#c98a8a';//'#0a0';
              l2.style.fontWeight = 'bold';
              l2.textContent = data.ratingStats.line2;*/
              
              
               const l2 = document.createElement('div');
              l2.className = 'rating-line2';
              l2.style.color = '#8fbf8f';//'#0a0';
              l2.style.fontWeight = 'bold';

              // Разбиваем строку:
              const line2Text = data.ratingStats.line2 || '';
              //const match = line2Text.match(/^(.*?:\s*)([\d.,]+)(\s*\|\|.*)$/);
                const match = line2Text.match(/^(.*?:\s*)([\d.,]+)(.*)$/);
              if (match) {
                const before = document.createElement('span');
                before.textContent = match[1];          
                before.style.color = '#8fbf8f';

                const num = document.createElement('span');
                num.textContent = match[2];             // "4.20"
                num.style.color = '#c00';               // ← цвет числа
                num.style.fontWeight = 'bold';
                num.style.fontSize = '13px';            // чуть крупнее

                const after = document.createElement('span');
                after.textContent = match[3];           // " || 5★..."
                after.style.color = '#8fbf8f';

                l2.append(before, num, after);
              } else {
                l2.textContent = line2Text;
              }
              

              ratingStatsEl.append(l1, l2);
            }

            // ========== БЛОК N-ГРАММ (сворачиваемый) ==========
            const gramsWrap = document.createElement('div');
            gramsWrap.className = 'grams-wrap';
            gramsWrap.style.marginTop = '4px';
            gramsWrap.style.display = 'none';

            const raw = data.ratingStats?.raw;
            console.log('[popup] товар', id, 'raw:', raw);
            const hasGrams =
              raw &&
              (raw.top3Grams && raw.top3Grams.length);
            console.log('[popup] товар', id, 'hasGrams:', hasGrams);

            if (hasGrams) {
              gramsWrap.style.display = 'block';

              const gramsToggle = document.createElement('button');
              gramsToggle.textContent = 'Показать частые фразы ▸';
              gramsToggle.style.width = '100%';
              gramsToggle.style.textAlign = 'left';
              gramsToggle.style.border = 'none';
              gramsToggle.style.background = 'rgba(0,91,255,0.06)';
              gramsToggle.style.padding = '3px 6px';
              gramsToggle.style.borderRadius = '4px';
              gramsToggle.style.cursor = 'pointer';
              gramsToggle.style.fontSize = '11px';
              gramsToggle.style.color = '#5a8fd6';//'#005bff';
              gramsToggle.style.fontWeight = 'bold';
              gramsToggle.style.marginBottom = '2px';

              const gramsContent = document.createElement('div');
              gramsContent.style.display = 'none';
              gramsContent.style.padding = '4px 6px';
              gramsContent.style.background = 'rgba(0,91,255,0.03)';
              gramsContent.style.borderLeft = '3px solid rgba(0, 91, 255, 0.15)';
              gramsContent.style.borderRadius = '4px';
              gramsContent.style.fontSize = '11px';
              gramsContent.style.lineHeight = '1.4';

              const renderGramList = (title, arr, limit) => {
                if (!arr || arr.length === 0) return null;
                const block = document.createElement('div');
                block.style.marginBottom = '4px';

                const h = document.createElement('div');
                h.style.fontWeight = 'bold';
                h.style.color = '#c00';
                h.style.marginBottom = '2px';
                h.textContent = title;
                block.appendChild(h);

                arr.slice(0, limit).forEach((item, i) => {
                  const row = document.createElement('div');
                  row.style.color = '#333';
                  row.textContent = `${i + 1}. «${item.phrase}» — ${item.reviews} отз.`;
                  block.appendChild(row);
                });

                return block;
              };

              const g3 = renderGramList('Топ-6 фраз из 3 слов (1★):', raw.top3Grams, 6);

              if (g3) gramsContent.appendChild(g3);

              gramsToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isOpen = gramsContent.style.display !== 'none';
                if (isOpen) {
                  gramsContent.style.display = 'none';
                  gramsToggle.textContent = 'Показать частые фразы ▸';
                } else {
                  gramsContent.style.display = 'block';
                  gramsToggle.textContent = 'Скрыть частые фразы ▾';
                }
              });

              gramsWrap.appendChild(gramsToggle);
              gramsWrap.appendChild(gramsContent);
            }

            // ========== ИСТОРИЯ ИЗМЕНЕНИЙ ==========
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

            historySection.append(historyTitle, historyList);

            // ========== КОНТЕЙНЕР КНОПОК ==========
            const buttonsContainer = document.createElement('div');
            buttonsContainer.style.position = 'absolute';
            buttonsContainer.style.top = '3px';
            buttonsContainer.style.right = '10px';
            buttonsContainer.style.display = 'flex';
            buttonsContainer.style.gap = '5px';
            buttonsContainer.style.zIndex = '10';
            buttonsContainer.style.alignItems = 'center';

            // --- Кнопка скидки ---
            if (siteName.includes('ozon.ru')) {
              if (!data.discountStatus && !data.discountAvailable && !data.discountRequested) {
                // нет статуса
              } else {
                const discountBtn = document.createElement('button');
                discountBtn.style.width = '18px';
                discountBtn.style.height = '16px';
                discountBtn.style.border = 'none';
                discountBtn.style.borderRadius = '4px';
                discountBtn.style.cursor = 'pointer';
                discountBtn.style.display = 'flex';
                discountBtn.style.alignItems = 'center';
                discountBtn.style.justifyContent = 'center';
                discountBtn.style.fontSize = '14px';
                discountBtn.style.fontWeight = 'bold';
                discountBtn.style.padding = '0';
                discountBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';

                if (data.discountStatus === 'approved' || data.discountStatus === 'received') {
                  discountBtn.style.backgroundColor = '#28a745';
                  discountBtn.style.color = 'white';
                  discountBtn.title = 'Скидка получена';
                  discountBtn.disabled = true;
                  discountBtn.textContent = '✓';
                  discountBtn.style.fontSize = '16px';
                  buttonsContainer.appendChild(discountBtn);
                } else if (data.discountStatus === 'rejected') {
                  discountBtn.style.backgroundColor = '#dc3545';
                  discountBtn.style.color = 'white';
                  discountBtn.title = 'Скидка отклонена';
                  discountBtn.disabled = false;
                  discountBtn.textContent = '✗';
                  discountBtn.style.fontSize = '14px';
                  buttonsContainer.appendChild(discountBtn);
                } else if (data.discountStatus === 'requested' || data.discountRequested) {
                  discountBtn.style.backgroundColor = '#ffc107';
                  discountBtn.style.color = '#000';
                  discountBtn.title = 'Скидка запрошена';
                  discountBtn.disabled = false;
                  discountBtn.textContent = '⏳';
                  buttonsContainer.appendChild(discountBtn);
                } else if (data.discountStatus === 'available' || data.discountAvailable) {
                  discountBtn.style.backgroundColor = 'transparent';
                  discountBtn.style.color = '#666';
                  discountBtn.style.border = '1px solid #ccc';
                  discountBtn.title = 'Запросить скидку';
                  discountBtn.textContent = '%';
                  discountBtn.disabled = false;

                  discountBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const originalText = discountBtn.textContent;
                    discountBtn.disabled = true;
                    discountBtn.textContent = '⏳';
                    discountBtn.title = 'Запрос отправляется...';
                    const success = await requestDiscount(data.url, id, data);
                    if (success) {
                      discountBtn.style.backgroundColor = '#ffc107';
                      discountBtn.style.color = '#000';
                      discountBtn.style.border = 'none';
                      discountBtn.textContent = '⏳';
                      discountBtn.title = 'Скидка запрошена';
                      discountBtn.disabled = false;
                    } else {
                      discountBtn.disabled = false;
                      discountBtn.textContent = originalText;
                      discountBtn.title = 'Запросить скидку (ошибка)';
                    }
                  });

                  buttonsContainer.appendChild(discountBtn);
                }
              }
            }

            // --- Кнопка «Посчитать рейтинг» ---
            if (siteName.includes('ozon.ru')) {
              const ratingBtn = document.createElement('button');
              ratingBtn.style.width = 'auto';
              ratingBtn.style.height = '16px';
              ratingBtn.style.border = '1px solid #ccc';
              ratingBtn.style.borderRadius = '4px';
              ratingBtn.style.cursor = 'pointer';
              ratingBtn.style.fontSize = '10px';
              ratingBtn.style.padding = '0 4px';
              ratingBtn.style.background = '#fff';
              ratingBtn.style.color = '#333';
              ratingBtn.style.whiteSpace = 'nowrap';
              ratingBtn.style.display = 'flex';
              ratingBtn.style.alignItems = 'center';
              ratingBtn.style.justifyContent = 'center';
              ratingBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
              ratingBtn.textContent = data.ratingStats ? '↻' : '★';
              ratingBtn.title = data.ratingStats ? 'Пересчитать рейтинг (нажмите ещё раз для остановки)' : 'Посчитать рейтинг';

              ratingBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                e.preventDefault();
                const { [id]: current } = await browser.storage.local.get(id);
                const isRunning = window.__ratingRunning === id;

                if (isRunning) {
                  ratingBtn.textContent = '…';
                  ratingBtn.disabled = true;
                  await browser.runtime.sendMessage({ action: 'stopRatingCalc' });
                  window.__ratingRunning = null;
                  ratingBtn.disabled = false;
                  ratingBtn.textContent = current?.ratingStats ? '↻' : '★';
                  ratingBtn.title = 'Посчитать рейтинг';
                  return;
                }

                window.__ratingRunning = id;
                ratingBtn.textContent = '⏳';
                ratingBtn.disabled = true;
                ratingBtn.title = 'Идёт подсчёт… нажмите, чтобы остановить';
                setTimeout(() => { ratingBtn.disabled = false; }, 300);

                try {
                  const res = await browser.runtime.sendMessage({ action: 'calcOzonRatingForItem', itemId: id, url: data.url });
                  window.__ratingRunning = null;
                  ratingBtn.disabled = false;

                  if (res && res.success) {
                    ratingBtn.textContent = '↻';
                    ratingBtn.title = 'Пересчитать рейтинг';
                    const statsEl = itemDiv.querySelector('.rating-stats');
                    if (statsEl) {
                      const { [id]: fresh } = await browser.storage.local.get(id);
                      const rs = fresh?.ratingStats;
                      if (rs) {
                        statsEl.innerHTML = '';
                        const l1 = document.createElement('div');
                        l1.className = 'rating-line1';
                        l1.style.color = '#005bff';
                        l1.style.fontWeight = 'bold';
                        l1.textContent = rs.line1;
                        const l2 = document.createElement('div');
                        l2.className = 'rating-line2';
                        l2.style.color = '#0a0';
                        l2.style.fontWeight = 'bold';
                        l2.textContent = rs.line2;
                        statsEl.append(l1, l2);
                        statsEl.style.display = 'block';
                      }
                    }
                  } else {
                    ratingBtn.textContent = current?.ratingStats ? '↻' : '★';
                    ratingBtn.title = 'Ошибка: ' + (res?.error || 'неизвестно');
                  }
                } catch (err) {
                  window.__ratingRunning = null;
                  ratingBtn.disabled = false;
                  ratingBtn.textContent = current?.ratingStats ? '↻' : '★';
                  ratingBtn.title = 'Ошибка: ' + err.message;
                }
              });

              buttonsContainer.appendChild(ratingBtn);
            }

            // --- Кнопка удаления ---
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

            deleteBtn.addEventListener('click', async (e) => {
              e.stopPropagation();
              e.preventDefault();
              const itemElement = deleteBtn.closest('.site-item');
              const siteGroup = deleteBtn.closest('.site-group');
              const siteHeader = siteGroup.querySelector('.site-header');
              const siteNameEl = siteHeader.querySelector('span:not(.toggle-icon):not(.item-count)');
              const siteName = siteNameEl ? siteNameEl.textContent : '';
              const itemId = deleteBtn.dataset.id;
              await browser.storage.local.remove(itemId);
              if (itemElement) itemElement.remove();
              const itemCountEl = siteGroup.querySelector('.item-count');
              const remainingItems = siteGroup.querySelectorAll('.site-item').length;
              if (itemCountEl) itemCountEl.textContent = `(${remainingItems})`;
              if (remainingItems === 0) {
                siteGroup.remove();
                if (siteName) await removeGroupState(siteName);
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

            buttonsContainer.appendChild(deleteBtn);

            // ========== СБОРКА КАРТОЧКИ ==========
            itemDiv.append(
              link,
              createPriceRow('Исходная цена:', data.originalPrice),
              createPriceRow('Текущая цена:', data.currentPrice),
              ratingStatsEl,
              gramsWrap,
              historySection,
              buttonsContainer
            );

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
      console.log('[popup] renderItems завершён, items:', document.querySelectorAll('.site-item').length);
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
  console.log('[popup] после await renderItems');

  // Обработка подсветки измененных цен
  document.querySelectorAll('.site-item').forEach(async (item) => {
    const id = item.dataset.id;
    const itemData = await browser.storage.local.get(id);

    if (itemData[id]?.hasNewChange) {
      item.classList.add('highlight');
      setTimeout(async () => {
        try {
          const currentData = await browser.storage.local.get(id);
          if (currentData[id]) {
            await browser.storage.local.set({ [id]: { ...currentData[id], hasNewChange: false } });
            item.classList.remove('highlight');
          }
        } catch (e) {
          console.error('Update error:', e);
        }
      }, 10000);
    }

    if (itemData[id]?.hasNewDiscount) {
      item.classList.add('discount-highlight');
      setTimeout(async () => {
        try {
          const currentData = await browser.storage.local.get(id);
          if (currentData[id]) {
            await browser.storage.local.set({ [id]: { ...currentData[id], hasNewDiscount: false } });
            item.classList.remove('discount-highlight');
          }
        } catch (e) {
          console.error('Error resetting discount highlight:', e);
        }
      }, 10000);
    }
  });
});
