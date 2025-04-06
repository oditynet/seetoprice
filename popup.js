document.addEventListener('DOMContentLoaded', async () => {
  const itemsContainer = document.getElementById('items');
  
  const renderItems = async () => {
    try {
      const items = await browser.storage.local.get();
      itemsContainer.innerHTML = '';
      
      if (!items || Object.keys(items).length === 0) {
        itemsContainer.innerHTML = '<div class="empty">Нет отслеживаемых цен</div>';
        return;
      }

      itemsContainer.innerHTML = Object.entries(items)
        .map(([url, data]) => {
          try {
            return `
              <div class="item">
                <a href="${data.url}">Товар</a>
                <div class="price">${data.originalPrice || 'Цена не определена'}</div>
                <div class="price">${data.currentPrice || 'Цена не определена'}</div>
                <button class="delete-btn" data-url="${encodeURIComponent(url)}">×</button>
              </div>
            `;
          } catch (e) {
            console.error(`Ошибка обработки URL ${url}:`, e);
            return ''; // Пропускаем некорректные записи
          }
        })
        .join('');

      // Обработчики удаления
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const url = decodeURIComponent(btn.dataset.url);
          await browser.storage.local.remove(url);
          await renderItems(); // Перерисовываем список
        });
      });

    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      itemsContainer.innerHTML = `
        <div class="error">
          Ошибка загрузки. Попробуйте обновить страницу.
        </div>
      `;
    }
  };

  await renderItems();
});