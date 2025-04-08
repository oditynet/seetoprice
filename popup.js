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

document.addEventListener('DOMContentLoaded', async () => {
  const itemsContainer = document.getElementById('items');
  
  const renderItems = async () => {
    try {
      const items = await browser.storage.local.get();
      itemsContainer.innerHTML = '';

      if (!Object.keys(items).length) {
        itemsContainer.innerHTML = '<div class="empty">Нет отслеживаемых товаров</div>';
        return;
      }

      itemsContainer.innerHTML = await Promise.all(
        Object.entries(items).map(async ([id, data]) => {
          try {
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
        ${(data.priceHistory || []).slice().reverse().slice(0, 5).map(entry => `
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