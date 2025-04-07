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
                <div class="price">${data.originalPrice || 'Цена не определена'}</div>
                <div class="price">${data.currentPrice || 'Цена не определена'}</div>
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