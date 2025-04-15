let lastPriceData = null;

if(window.location.hostname.includes('ozon.ru')) {
  document.addEventListener('contextmenu', (e) => {
    const priceElement = e.target.closest('[data-widget*="Price"]');
    if(priceElement) {
      chrome.runtime.sendMessage({
        action: "setOzonPrice",
        element: priceElement.outerHTML
      });
    }
  });
}

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

  const price = targetElement.textContent.trim();
  const priceParts = price.split('₽').map(p => p.trim()).filter(p => p !== '');
  const discountIndex = priceParts.findIndex(p => p.includes('Выгода'));
  
  const finalPrice = discountIndex !== -1 && priceParts.length > discountIndex + 1
    ? `${priceParts[discountIndex + 1]} ₽`
    : `${priceParts[0]} ₽`;

  lastPriceData = {
    selector: getSelector(targetElement),
    price: finalPrice
  };
}, true);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if(request.action === "getPriceData") {
    sendResponse(lastPriceData);
    lastPriceData = null;
    return true;
  }
});