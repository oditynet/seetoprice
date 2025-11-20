// content.js для Chrome
let lastPriceData = null;

// Функция для определения валюты
function detectCurrency(priceText) {
  if (!priceText) return 'RUB';
  
  if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
  if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('Br')) return 'BYN';
  if (priceText.includes('₸')) return 'KZT';
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
  if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
  if (priceText.includes('сом') || priceText.includes('с')) return 'KGS';
  if (priceText.includes('сум') || priceText.includes('UZS')) return 'UZS';
  if (priceText.includes('с.')) return 'TJS';
  if (priceText.includes('Kč') || priceText.includes('кр')) return 'CZK';
  if (priceText.includes('zł') || priceText.includes('зл')) return 'PLN';
  if (priceText.includes('lei') || priceText.includes('лей')) return 'RON';
  if (priceText.includes('лв') || priceText.includes('lv')) return 'BGN';
  if (priceText.includes('Ft') || priceText.includes('фт')) return 'HUF';
  if (priceText.includes('kr') || priceText.includes('кр')) return 'SEK';
  if (priceText.includes('CHF') || priceText.includes('фр')) return 'CHF';
  if (priceText.includes('₪')) return 'ILS';
  if (priceText.includes('₼')) return 'AZN';
  if (priceText.includes('₾')) return 'GEL';
  return 'RUB';
}

function getCurrencySymbol(currency) {
  const symbols = {
    'RUB': '₽',
    'BYN': 'BYN', 
    'KZT': '₸',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏',
    'KGS': 'с',
    'UZS': 'UZS',
    'TJS': 'с.',
    'CZK': 'Kč',
    'PLN': 'zł',
    'RON': 'lei',
    'BGN': 'лв',
    'HUF': 'Ft',
    'SEK': 'kr',
    'CHF': 'CHF',
    'ILS': '₪',
    'AZN': '₼',
    'GEL': '₾'
  };
  return symbols[currency] || '₽';
}

function normalizePrice(priceText) {
  if (!priceText) return null;
  return priceText.replace(/[^\d]/g, '');
}

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

// Обработчик контекстного меню
document.addEventListener('contextmenu', (e) => {
  try {
    // Специальная логика для vseinstrumenti.ru
    if (window.location.hostname.includes('vseinstrumenti.ru')) {
      let priceElement = null;
      let price = null;
      
      // Ищем основную текущую цену
      const currentPriceElement = document.querySelector('[data-qa="price-now"]');
      
      if (currentPriceElement) {
        const text = currentPriceElement.textContent.trim();
        const priceMatch = text.match(/(\d+)\s*[₽$€₸]/);
        if (priceMatch) {
          priceElement = currentPriceElement;
          const currency = detectCurrency(text);
          const currencySymbol = getCurrencySymbol(currency);
          price = priceMatch[1] + ' ' + currencySymbol;
        }
      }
      
      // Если не нашли, ищем в основном блоке
      if (!priceElement) {
        const mainPriceBlock = document.querySelector('.MZu-SS');
        if (mainPriceBlock) {
          const priceElements = mainPriceBlock.querySelectorAll('p, span');
          for (const element of priceElements) {
            const text = element.textContent.trim();
            if (text.includes('₽') || text.includes('$') || text.includes('€') || text.includes('₸')) {
              const priceMatch = text.match(/(\d+)\s*[₽$€₸]/);
              if (priceMatch) {
                const priceNum = parseInt(priceMatch[1]);
                if (priceNum > 100) {
                  priceElement = element;
                  const currency = detectCurrency(text);
                  const currencySymbol = getCurrencySymbol(currency);
                  price = priceNum + ' ' + currencySymbol;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (priceElement && price) {
        lastPriceData = {
          selector: getSelector(priceElement),
          price: price
        };
        return;
      }
    }

    // Общая логика для других сайтов
    const targetElement = e.target.closest('[data-qa="product-price"], .price, [itemprop="price"]') || e.target;
    
    const rawPrice = targetElement.textContent.trim();
    const currency = detectCurrency(rawPrice);
    const currencySymbol = getCurrencySymbol(currency);
    
    let normalizedPrice = normalizePrice(rawPrice);
    
    if (normalizedPrice && normalizedPrice.length > 0) {
      const firstNumberMatch = rawPrice.match(/(\d[\d\s,]*)\s*[₽р.$€₸]/);
      if (firstNumberMatch) {
        normalizedPrice = firstNumberMatch[1].replace(/[^\d]/g, '');
      }
      
      lastPriceData = {
        selector: getSelector(targetElement),
        price: normalizedPrice + ' ' + currencySymbol
      };
    } else {
      lastPriceData = null;
    }
  } catch (error) {
    console.error('Error in contextmenu handler:', error);
    lastPriceData = null;
  }
}, true);

// Обработчик сообщений
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    if (request.action === "getPriceElementInfo" || request.action === "getPriceData") {
      sendResponse(lastPriceData || null);
      lastPriceData = null;
      return true;
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    sendResponse(null);
  }
});
