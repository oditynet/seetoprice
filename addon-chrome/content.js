// content.js
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
  
  let normalized = priceText.replace(/\s/g, '');
  
  const priceMatch = normalized.match(/(\d+[,.]?\d*)/);
  if (priceMatch) {
    normalized = priceMatch[0];
  }
  
  return normalized;
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
      
      const priceSelectors = [
        '.-no-margin_fsyzi_50',
        '.cztff3 > .BVPC2X',
        '[class*="price"]',
        '.product-price',
        '.current-price',
        '.product-card-price'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text && /\d/.test(text)) {
            priceElement = element;
            price = text;
            break;
          }
        }
      }
      
      if (priceElement && price) {
        const normalizedPrice = normalizePrice(price);
        
        lastPriceData = {
          selector: getSelector(priceElement),
          price: normalizedPrice + ' ₽'
        };
        
        console.log('Vseinstrumenti price found:', lastPriceData);
        return;
      }
    }

    // Общая логика для других сайтов
    const targetElement = e.target.closest('[data-qa="product-price"], .price, [itemprop="price"]') || e.target;
    
    const rawPrice = targetElement.textContent.trim();
    const currency = detectCurrency(rawPrice);
    const currencySymbol = getCurrencySymbol(currency);
    const normalizedPrice = normalizePrice(rawPrice);

    if (normalizedPrice && normalizedPrice.length > 0) {
      lastPriceData = {
        selector: getSelector(targetElement),
        price: normalizedPrice + ' ' + currencySymbol
      };

    } else {
      console.log('No valid price found');
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
