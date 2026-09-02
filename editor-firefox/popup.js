// popup.js - Аддон-редактор для SeeToPrice

let allData = {};
let isConnected = false;
let SEETOPRICE_ID = '';

// ===== ЗАГРУЗКА СОХРАНЁННОГО ID =====

async function loadSeetopriceId() {
    try {
        const result = await browser.storage.local.get('seetopriceId');
        if (result.seetopriceId) {
            SEETOPRICE_ID = result.seetopriceId;
            document.getElementById('seetopriceId').value = SEETOPRICE_ID;
            console.log('[Editor] Загружен ID:', SEETOPRICE_ID);
            return true;
        }
        return false;
    } catch (e) {
        console.error('[Editor] Ошибка загрузки ID:', e);
        return false;
    }
}

async function saveSeetopriceId(id) {
    try {
        await browser.storage.local.set({ seetopriceId: id });
        SEETOPRICE_ID = id;
        console.log('[Editor] Сохранён ID:', id);
        showToast('✅ ID сохранён', 'success');
        return true;
    } catch (e) {
        showToast('❌ Ошибка сохранения ID: ' + e.message, 'error');
        return false;
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

function updateStatus(connected) {
    const el = document.getElementById('connectionStatus');
    isConnected = connected;
    if (connected) {
        el.textContent = '🟢 Онлайн';
        el.className = 'status online';
    } else {
        el.textContent = '🔴 Офлайн';
        el.className = 'status offline';
    }
}

function getDomain(url) {
    try { return new URL(url).hostname.replace('www.', ''); } 
    catch { return url; }
}

function formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

function isBooleanField(key) {
    const bools = ['discountAvailable', 'discountRequested', 'isOutOfStock', 'isSoldOut', 'hasNewChange'];
    return bools.includes(key);
}

function isSelectField(key) {
    return key === 'discountStatus';
}

function getSelectOptions(key) {
    if (key === 'discountStatus') {
        return ['', 'available', 'approved', 'rejected', 'requested', 'pending'];
    }
    return [];
}

// ===== БЕЗОПАСНОЕ СОЗДАНИЕ ЭЛЕМЕНТОВ =====

function createParamRow(key, value, id, readonly) {
    const row = document.createElement('div');
    row.className = 'param-row';
    
    const label = document.createElement('span');
    label.className = 'key';
    label.textContent = key + ':';
    row.appendChild(label);
    
    const isBool = isBooleanField(key);
    const isSelect = isSelectField(key);
    
    if (isSelect) {
        const select = document.createElement('select');
        select.dataset.id = id;
        select.dataset.field = key;
        const options = getSelectOptions(key);
        for (const opt of options) {
            const option = document.createElement('option');
            option.value = opt;
            option.textContent = opt || '—';
            if (opt === value) option.selected = true;
            select.appendChild(option);
        }
        row.appendChild(select);
    } else if (isBool) {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.dataset.id = id;
        checkbox.dataset.field = key;
        checkbox.checked = !!value;
        row.appendChild(checkbox);
        
        const status = document.createElement('span');
        status.style.cssText = 'font-size:10px;color:#6a6a6a;';
        status.textContent = value ? 'true' : 'false';
        row.appendChild(status);
    } else if (key === 'priceHistory' && (typeof value === 'object' || String(value).length > 100)) {
        const textarea = document.createElement('textarea');
        textarea.dataset.id = id;
        textarea.dataset.field = key;
        if (readonly) textarea.readOnly = true;
        textarea.textContent = formatValue(value);
        row.appendChild(textarea);
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.id = id;
        input.dataset.field = key;
        if (readonly) input.readOnly = true;
        input.value = formatValue(value);
        row.appendChild(input);
    }
    
    if (readonly) {
        const badge = document.createElement('span');
        badge.className = 'type-badge';
        badge.textContent = '🔒';
        row.appendChild(badge);
    }
    
    return row;
}

function createItemCard(id, item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.dataset.id = id;
    
    const idEl = document.createElement('div');
    idEl.className = 'item-id';
    idEl.textContent = '🔑 ' + id;
    card.appendChild(idEl);
    
    const domain = document.createElement('div');
    domain.className = 'domain';
    domain.textContent = '🔗 ' + getDomain(item.url);
    card.appendChild(domain);
    
    const fields = Object.keys(item).sort();
    for (const key of fields) {
        const readonly = ['url', 'lastChecked'].includes(key);
        const row = createParamRow(key, item[key], id, readonly);
        card.appendChild(row);
    }
    
    // JSON view
    /*const jsonRow = document.createElement('div');
    jsonRow.className = 'param-row';
    const jsonLabel = document.createElement('span');
    jsonLabel.className = 'key';
    jsonLabel.textContent = 'RAW:';
    jsonRow.appendChild(jsonLabel);
    const jsonDiv = document.createElement('div');
    jsonDiv.className = 'json-view';
    jsonDiv.textContent = JSON.stringify(item, null, 2);
    jsonRow.appendChild(jsonDiv);
    card.appendChild(jsonRow);
    */
    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.dataset.id = id;
    saveBtn.textContent = '💾 Сохранить';
    saveBtn.addEventListener('click', () => saveItem(id));
    actions.appendChild(saveBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.dataset.id = id;
    deleteBtn.textContent = '🗑️ Удалить';
    deleteBtn.addEventListener('click', async () => {
        if (confirm(`Удалить товар "${id}"?`)) {
            await callSeetoprice('deleteItem', { itemId: id });
            showToast('🗑️ Удалено', 'success');
            await loadData();
        }
    });
    actions.appendChild(deleteBtn);
    
    card.appendChild(actions);
    return card;
}

// ===== ОБЩЕНИЕ С SEETOPRICE =====

async function callSeetoprice(action, params = {}) {
    if (!SEETOPRICE_ID) {
        throw new Error('ID аддона SeeToPrice не задан! Укажите его в поле выше.');
    }
    
    try {
        const message = { action, ...params };
        console.log('[Editor] → SeeToPrice (' + SEETOPRICE_ID + '):', message);
        
        const response = await browser.runtime.sendMessage(SEETOPRICE_ID, message);
        console.log('[Editor] ← SeeToPrice:', response);
        
        if (response && response.success) {
            updateStatus(true);
            return response;
        } else {
            throw new Error(response?.error || 'Неизвестная ошибка');
        }
    } catch (error) {
        console.error('[Editor] Ошибка связи с SeeToPrice:', error);
        updateStatus(false);
        
        if (error.message.includes('Could not establish connection')) {
            showToast('❌ SeeToPrice не отвечает! Проверьте ID и что аддон запущен.', 'error');
        } else {
            showToast('❌ Ошибка: ' + error.message, 'error');
        }
        throw error;
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====

async function loadData() {
    const container = document.getElementById('itemsList');
    
    if (!SEETOPRICE_ID) {
        container.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="icon">⚠️</span>
            Укажите ID аддона SeeToPrice в поле выше<br>
            <small>Нажмите "Сохранить" и затем "Загрузить данные"</small>
        `;
        container.appendChild(empty);
        return;
    }
    
    try {
        container.innerHTML = '';
        const loading = document.createElement('div');
        loading.className = 'loading';
        loading.innerHTML = `
            <span class="spinner">⏳</span><br>
            Загрузка данных из SeeToPrice...
        `;
        container.appendChild(loading);
        
        const response = await callSeetoprice('getAllData');
        allData = response.data || {};
        
        const items = {};
        const settings = {};
        for (const [key, value] of Object.entries(allData)) {
            if (key === 'settings') {
                settings[key] = value;
            } else if (value && typeof value === 'object' && value.url) {
                items[key] = value;
            }
        }
        
        renderItems(items);
        renderSettings(settings);
        showToast(`✅ Загружено ${Object.keys(items).length} товаров`, 'success');
        
    } catch (error) {
        container.innerHTML = '';
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="icon">🚫</span>
            Не удалось загрузить данные<br>
            <small>${error.message}</small>
        `;
        container.appendChild(empty);
    }
}

// ===== РЕНДЕРИНГ ТОВАРОВ =====

function renderItems(items) {
    const container = document.getElementById('itemsList');
    container.innerHTML = '';
    const entries = Object.entries(items);
    
    if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="icon">📭</span>
            Нет товаров<br>
            <small>Добавьте товары через SeeToPrice (ПКМ → Отслеживать цену)</small>
        `;
        container.appendChild(empty);
        return;
    }
    
    for (const [id, item] of entries) {
        const card = createItemCard(id, item);
        container.appendChild(card);
    }
}

// ===== РЕНДЕРИНГ НАСТРОЕК =====

function renderSettings(settingsData) {
    const container = document.getElementById('settingsList');
    container.innerHTML = '';
    const settings = settingsData?.settings || null;
    
    if (!settings || Object.keys(settings).length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.innerHTML = `
            <span class="icon">⚙️</span>
            Настройки не найдены
        `;
        container.appendChild(empty);
        return;
    }
    
    const card = document.createElement('div');
    card.className = 'item-card';
    
    const idEl = document.createElement('div');
    idEl.className = 'item-id';
    idEl.textContent = '⚙️ Настройки SeeToPrice';
    card.appendChild(idEl);
    
    for (const [key, value] of Object.entries(settings)) {
        const row = document.createElement('div');
        row.className = 'param-row';
        
        const label = document.createElement('span');
        label.className = 'key';
        label.textContent = key + ':';
        row.appendChild(label);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.dataset.settingsKey = key;
        input.value = formatValue(value);
        row.appendChild(input);
        
        card.appendChild(row);
    }
    
    const actions = document.createElement('div');
    actions.className = 'actions';
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn-save';
    saveBtn.id = 'saveSettingsBtn';
    saveBtn.textContent = '💾 Сохранить настройки';
    saveBtn.addEventListener('click', async () => {
        const newSettings = {};
        card.querySelectorAll('input[data-settings-key]').forEach(input => {
            const key = input.dataset.settingsKey;
            newSettings[key] = input.value;
        });
        try {
            await callSeetoprice('setSettings', { settings: newSettings });
            showToast('✅ Настройки сохранены', 'success');
            await loadData();
        } catch (error) {
            showToast('❌ Ошибка: ' + error.message, 'error');
        }
    });
    actions.appendChild(saveBtn);
    card.appendChild(actions);
    
    container.appendChild(card);
}

// ===== СОХРАНЕНИЕ ТОВАРА =====

async function saveItem(id) {
    try {
        const card = document.querySelector(`.item-card[data-id="${id}"]`);
        if (!card) return;
        
        const response = await callSeetoprice('getItem', { itemId: id });
        const current = response.data;
        if (!current) {
            showToast('❌ Товар не найден', 'error');
            return;
        }
        
        const updated = { ...current };
        
        card.querySelectorAll('input[data-field]').forEach(input => {
            const field = input.dataset.field;
            if (isBooleanField(field)) {
                updated[field] = input.checked;
            } else {
                const value = input.value.trim();
                updated[field] = value || '';
            }
        });
        
        card.querySelectorAll('select[data-id]').forEach(select => {
            const field = select.dataset.field;
            updated[field] = select.value || '';
        });
        
        card.querySelectorAll('textarea[data-id]').forEach(textarea => {
            const field = textarea.dataset.field;
            const value = textarea.value.trim();
            if (field === 'priceHistory') {
                try {
                    updated[field] = JSON.parse(value);
                } catch (e) {
                    showToast(`⚠️ Ошибка JSON в ${field}`, 'error');
                }
            }
        });
        
        updated.lastEdited = Date.now();
        
        await callSeetoprice('setItem', { itemId: id, itemData: updated });
        showToast(`✅ Сохранено: ${id}`, 'success');
        await loadData();
        
    } catch (error) {
        showToast('❌ Ошибка: ' + error.message, 'error');
    }
}

// ===== ЭКСПОРТ =====

async function exportData() {
    try {
        const response = await callSeetoprice('getAllData');
        const json = JSON.stringify(response.data, null, 2);
        
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `seetoprice_data_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('✅ Экспортировано', 'success');
    } catch (error) {
        showToast('❌ Ошибка: ' + error.message, 'error');
    }
}

// ===== ИМПОРТ =====

function importData() {
    document.getElementById('fileInput').click();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (typeof data !== 'object') {
            throw new Error('Неверный формат');
        }
        
        if (confirm(`Импортировать ${Object.keys(data).length} записей? Это перезапишет текущие данные!`)) {
            await callSeetoprice('clearAll');
            
            let count = 0;
            for (const [key, value] of Object.entries(data)) {
                if (key === 'settings') {
                    await callSeetoprice('setSettings', { settings: value });
                } else if (value && value.url) {
                    await callSeetoprice('setItem', { itemId: key, itemData: value });
                    count++;
                }
            }
            
            showToast(`✅ Импортировано ${count} товаров`, 'success');
            await loadData();
        }
        
    } catch (error) {
        showToast('❌ Ошибка: ' + error.message, 'error');
    }
    
    e.target.value = '';
});

// ===== ОЧИСТКА =====

async function clearAll() {
    if (confirm('⚠️ Удалить ВСЕ данные из SeeToPrice?')) {
        if (confirm('Вы уверены? Это необратимо!')) {
            await callSeetoprice('clearAll');
            showToast('🗑️ Все данные удалены', 'success');
            await loadData();
        }
    }
}

// ===== ВКЛАДКИ =====

document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const tabId = btn.dataset.tab;
        document.getElementById('tab-' + tabId).classList.add('active');
    });
});

// ===== КНОПКИ =====

document.addEventListener('DOMContentLoaded', async () => {
    await loadSeetopriceId();
    if (SEETOPRICE_ID) {
        await loadData();
    }
});

document.getElementById('saveIdBtn').addEventListener('click', async () => {
    const id = document.getElementById('seetopriceId').value.trim();
    if (id) {
        await saveSeetopriceId(id);
        await loadData();
    } else {
        showToast('❌ Введите ID аддона', 'error');
    }
});

document.getElementById('btnLoad').addEventListener('click', loadData);
document.getElementById('btnExport').addEventListener('click', exportData);
document.getElementById('btnImport').addEventListener('click', importData);
document.getElementById('btnClearAll').addEventListener('click', clearAll);

// Нажатие Enter в поле ID
document.getElementById('seetopriceId').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('saveIdBtn').click();
    }
});

console.log('[SeeToPrice Editor] Загружен');
