# seetoprice
Addon for firefox (https://addons.mozilla.org/firefox/downloads/file/4469127/908f746f87a649358c2c-1.0.2.3.xpi)

Плагин для firefox браузера для слежения за динамикой цен на сайте www.vseinstrumenti.ru. Вы заходите на страницу желаемой вещи и правой клавишей кликаете по цене. Вменю выбираете меню и помещаете цену в список. Список можно увидел в панели аддонов. Одновление цены происходит каждые 10 минут и в случае изменения цен вам будет выдано уведомление.

Структура директории следующая:
```
your-addon.zip
├── manifest.json
├── background.js (если используется)
├── content.js (если используется)
├── icons/
│   └── icon48.png
└── popup/
    ├── popup.html
    └── popup.js
```
Для сборки нужно сохранить структуру и запаровать все файлы и папки ZIP

Для теста можете попробовать режим разработчика:
```
about:debugging#/runtime/this-firefox
```
<img src="https://github.com/oditynet/seetoprice/blob/main/screen1.png" title="example" width="500" />
