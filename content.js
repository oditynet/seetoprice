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

  const price = targetElement.textContent
    .replace(/[^\d₽]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  lastPriceData = {
    selector: getSelector(targetElement),
    price: price.match(/\d[\d\s]*₽?/)?.[0] || null
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