let lastPriceData = null;

// Обработчик контекстного меню
document.addEventListener('contextmenu', (e) => {
  const targetElement = e.target.closest('[data-qa="product-price"], .price, [itemprop="price"]') || e.target;
  
  const getSelector = (el) => {
    const path = [];
    while(el && el !== document.body) {
      let selector = el.tagName.toLowerCase();
      
      if(el.dataset.qa) {
        selector += `[data-qa="${el.dataset.qa}"]`;
        path.unshift(selector);
        break;
      }
      
      if(el.id) {
        selector += `#${el.id}`;
        path.unshift(selector);
        break;
      }
      
      if(el.classList.length > 0) {
        const priceClasses = Array.from(el.classList).filter(c => 
          c.toLowerCase().includes('price') || 
          c.toLowerCase().includes('cost')
        );
        if(priceClasses.length > 0) {
          selector += '.' + priceClasses.join('.');
          path.unshift(selector);
          break;
        }
      }
      
      path.unshift(selector);
      el = el.parentElement;
    }
    return path.join(' > ');
  };

  const price = targetElement.textContent.trim()
//    .replace(/[^\d₽]/g, ' ')
//    .replace(/\s+/g, ' ')
//    .trim();


   const priceParts = price.split('₽')
     .map(p => p.trim())
     .filter(p => p !== '');

   let finalPrice;

   // Ищем индекс элемента с "Выгода"
   const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
   
   if (discountIndex !== -1 && priceParts.length > discountIndex + 1) {
     // Если нашли "Выгода" и есть следующий элемент - берем его
      finalPrice = `${priceParts[discountIndex + 1]} ₽`;
   } else {
     // Иначе берем первый элемент
     finalPrice = `${priceParts[0]} ₽`;
   }

  lastPriceData = {
    selector: getSelector(targetElement),
      price: finalPrice
  };
}, true);

// Обработчик сообщений
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if(request.action === "getPriceElementInfo") {
    sendResponse(lastPriceData);
    lastPriceData = null;
    return true;
  }
  if(request.action === "getPriceData") {
    sendResponse(lastPriceData);
    lastPriceData = null;
    return true;
  }
});