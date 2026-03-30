// content.js
let lastPriceData = null;

// Функция для определения валюты
function detectCurrency(priceText) {
  if (!priceText) return 'RUB';
  
  if (priceText.includes('₽') || priceText.includes('руб')) return 'RUB';
  if (priceText.includes('BYN') || priceText.includes('р.') || priceText.includes('ƃ')) return 'BYN';
  if (priceText.includes('₸')) return 'KZT';
  if (priceText.includes('$') || priceText.includes('USD')) return 'USD';
  if (priceText.includes('€') || priceText.includes('EUR')) return 'EUR';
  if (priceText.includes('֏') || priceText.includes('драм')) return 'AMD';
  if (priceText.includes('сом')/* || priceText.includes('с')*/) return 'KGS';
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
//    'ƃ': 'BYN',
    'BYN': 'ƃ', 
    'KZT': '₸',
    'USD': '$',
    'EUR': '€',
    'AMD': '֏',
    'KGS': 'сом',
    'UZS': 'сум',
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
  
  let normalized = priceText
    .replace(/[\s\u2000-\u200F\u202F\u205F\u3000]/g, '')
    .replace(/[^\d.,-]/g, '');
  
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

// Функция для проверки статуса скидки
function checkOzonDiscountStatus() {
  const widget = document.querySelector('[data-widget="foundCheaperText"]');
  if (!widget) return { exists: false };
  
  const text = widget.textContent || '';
  return {
    exists: true,
    text: text
  };
}

// Функция для нажатия на кнопку "Хочу скидку"
async function clickOzonDiscountButton() {
  if (!window.location.hostname.includes('ozon.ru')) {
    return { success: false, error: 'Не Ozon сайт' };
  }
  
  const widget = document.querySelector('[data-widget="foundCheaperText"]');
  if (!widget) {
    return { success: false, error: 'Кнопка не найдена' };
  }
  
  const button = widget.querySelector('button');
  if (!button) {
    return { success: false, error: 'Элемент button не найден' };
  }
  
  try {
    button.click();
    console.log('Кнопка "Хочу скидку" нажата');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      success: true, 
      message: 'Кнопка нажата'
    };
  } catch (error) {
    console.error('Ошибка при нажатии на кнопку:', error);
    return { success: false, error: error.message };
  }
}

// Обработчик контекстного меню
document.addEventListener('contextmenu', (e) => {
  try {
    if (window.location.hostname.includes('vseinstrumenti.ru')) {
      let priceElement = null;
      let price = null;
      /*
      const priceSelectors = [
        '.-no-margin_fsyzi_50',
        '.cztff3 > .BVPC2X',
        '[class*="price"]',
        '.product-price',
        '.current-price',
        '.product-card-price',
        '[data-qa="price-now"]'
      ];*/
      const priceSelectors = [
      '[data-qa="new-price"]',                    // основной селектор для актуальной цены
      '[data-behavior="price-now"]',              // альтернативный
      '[data-qa="price-discount"]',               // цена со скидкой (иногда другая)
      '.-no-margin_fsyzi_50',                     // старый селектор
      '.cztff3 > .BVPC2X',                        // старый селектор
      '[class*="price"]',                         // общий поиск
      '.product-price',                           // общий
      '.current-price',                           // общий
      '.product-card-price',                      // общий
      '[data-behavior="price-now"]',              // поведенческий
      '.MZu-SS',                                  // старый
      '.ljRWE3 p',                                // старый
      '.price-item.js-price-item',                // старый
      '[itemprop="price"]',                       // schema.org
      '[class*="price"][class*="now"]',           // комбинация
      '[class*="Price"][class*="current"]'        // комбинация
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
    } else if (window.location.hostname.includes('petrovich.ru')) {
      let priceElement = null;
      let price = null;
      
      const priceSelectors = [
        '[data-test="product-gold-price"] .PriceContentWrapper-sc-jgbo00',
        '[data-test="product-retail-price"] .PriceContentWrapper-sc-jgbo00',
        '.PriceContentWrapper-sc-jgbo00',
        '.price',
        '.product-price',
        '[class*="price"]'
      ];
      
      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent || element.innerText;
          if (text && text.includes('₽') && /\d/.test(text)) {
            priceElement = element;
            price = text;
            console.log('Found petrovich price with selector:', selector, 'Text:', text);
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
        
        console.log('Petrovich price found:', lastPriceData);
        return;
      }
    } else {
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
    }
  } catch (error) {
    console.error('Error in contextmenu handler:', error);
    lastPriceData = null;
  }
}, true);

// Обработчик сообщений
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "clickOzonDiscount") {
    clickOzonDiscountButton().then(sendResponse);
    return true;
  }
  
  if (request.action === "checkOzonDiscount") {
    const status = checkOzonDiscountStatus();
    sendResponse(status);
    return true;
  }
  
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


function addWeekdaysToDeliveryDates() {
  // Проверяем, что мы на странице заказов Ozon
  if (!window.location.hostname.includes('ozon.ru') || 
      !window.location.pathname.includes('/my/orderlist')) {
    return;
  }
  
  const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const months = {
    'января': 0, 'февраля': 1, 'марта': 2, 'апреля': 3,
    'мая': 4, 'июня': 5, 'июля': 6, 'августа': 7,
    'сентября': 8, 'октября': 9, 'ноября': 10, 'декабря': 11
  };
  
  const processedElements = new WeakSet();
  let processedCount = 0;
  
  // Функция для добавления дня недели к дате
function addWeekday(element) {
  let text = element.textContent.trim();
  
  // Пропускаем если уже есть день недели
  /*if (text.includes('(') || /[а-я]{2,}/.test(text) && 
      (text.includes('пн') || text.includes('вт') || text.includes('ср') || 
       text.includes('чт') || text.includes('пт') || text.includes('сб') || text.includes('вс'))) {
    return false;
  }*/
  
  // Формат: "До 8 апреля" (В пути, В службе доставки)
  let match = text.match(/До\s+(\d+)\s+([а-я]+)/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];
    
    if (month !== undefined) {
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, month, day);
      const weekday = weekdays[date.getDay()];
      
      const newText = `До ${day} (${weekday}) ${monthName}`;
      element.textContent = newText;
      return true;
    }
  }
  
  // Формат: "Ожидаем 31 марта" (Передаём в доставку)
  match = text.match(/Ожидаем\s+(\d+)\s+([а-я]+)/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];
    
    if (month !== undefined) {
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, month, day);
      const weekday = weekdays[date.getDay()];
      
      const newText = `Ожидаем ${day} (${weekday}) ${monthName}`;
      element.textContent = newText;
      return true;
    }
  }
  
  // Формат: "2–10 апреля" (В пути, В службе доставки)
  match = text.match(/(\d+)\s*[–-]\s*(\d+)\s+([а-я]+)/);
  if (match) {
    const startDay = parseInt(match[1]);
    const endDay = parseInt(match[2]);
    const monthName = match[3].toLowerCase();
    const month = months[monthName];
    
    if (month !== undefined) {
      const currentYear = new Date().getFullYear();
      let startDate = new Date(currentYear, month, startDay);
      let endDate = new Date(currentYear, month, endDay);
      
      if (endDate < startDate) {
        endDate = new Date(currentYear, month + 1, endDay);
      }
      
      const startWeekday = weekdays[startDate.getDay()];
      const endWeekday = weekdays[endDate.getDay()];
      
      const newText = `${startDay} (${startWeekday}) – ${endDay} (${endWeekday}) ${monthName}`;
      element.textContent = newText;
      return true;
    }
  }
  
  // Формат: "31 марта" (без префикса)
  match = text.match(/^(\d+)\s+([а-я]+)$/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const month = months[monthName];
    
    if (month !== undefined) {
      const currentYear = new Date().getFullYear();
      const date = new Date(currentYear, month, day);
      const weekday = weekdays[date.getDay()];
      
      const newText = `${day} (${weekday}) ${monthName}`;
      element.textContent = newText;
      return true;
    }
  }
  
  return false;
}  
  // Ищем все элементы с классом tsCompactControl500Medium
  // Это класс для всех дат доставки
  const dateSelectors = [
  '.tsCompactControl500Medium',
  '.tsCompact500Medium',
  '.tsHeadline550Medium',
  '.tsControl500Medium'
];
const allDateElements = document.querySelectorAll(dateSelectors.join(','));
//  const allDateElements = document.querySelectorAll('.tsCompactControl500Medium');
  
  allDateElements.forEach(element => {
    if (processedElements.has(element)) return;
    
    const text = element.textContent.trim();
    
    // Проверяем, что это дата (содержит цифры и месяц)
    if (/\d/.test(text) && 
        (text.includes('января') || text.includes('февраля') || text.includes('марта') || 
         text.includes('апреля') || text.includes('мая') || text.includes('июня') || 
         text.includes('июля') || text.includes('августа') || text.includes('сентября') || 
         text.includes('октября') || text.includes('ноября') || text.includes('декабря'))) {
      
      if (addWeekday(element)) {
        processedElements.add(element);
        processedCount++;
        console.log(`Добавлен день недели для: "${text}" -> "${element.textContent}"`);
      }
    }
  });
  
  if (processedCount > 0) {
    console.log(`✅ Добавлены дни недели для ${processedCount} элементов`);
  } else {
    console.log('ℹ️ Не найдено элементов для добавления дней недели');
  }
}

// Запуск с задержками для динамической загрузки
if (window.location.pathname.includes('/my/orderlist')) {
  function safeRun() {
    try {
      addWeekdaysToDeliveryDates();
    } catch(e) {
      console.error('Error in addWeekdaysToDeliveryDates:', e);
    }
  }
  
  // Запускаем несколько раз с задержкой
  setTimeout(safeRun, 1300);
  
  // Наблюдатель за изменениями DOM
  const observer = new MutationObserver(() => {
    safeRun();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}