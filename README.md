<a name="readme-top"></a>
<div align="center">
    
<br>
    
# seetoprice

<!-- SHIELD GROUP -->

[![][github-stars-shield]][github-stars-link]
[![][github-license-shield]][github-license-shield]<br/>

Addon for firefox (https://addons.mozilla.org/firefox/downloads/file/4469502/d15151e3563243ae9309-1.0.3.xpi)

<a name="readme-left"></a>
<div align="left">

Плагин для firefox браузера для слежения за динамикой цен на сайтая www.vseinstrumenti.ru и www.ozon.ru. Вы заходите на страницу желаемой вещи(это важно) и правой клавишей кликаете по цене(это важно). В меню выбираете "отслеживать цену" и товар помещается в список. Список можно увидел в панели аддонов. Обновление цены происходит каждые 10 минут и в случае изменения цен вам будет выдано уведомление.

В теории вы можете поставить маркер и на цену, и на скидку и на начальную цену и на другие числа на странице.

Структура директории следующая:
```
your-addon.zip
├── manifest.json
├── background.js (если используется)
├── content.js (если используется)
├── icons/
│   └── icon48.png
│   └── del.png
└── popup/
    ├── popup.html
    └── popup.js
```
Для сборки нужно сохранить структуру и запаровать все файлы и папки ZIP, а 

Для теста можете попробовать режим разработчика:
```
about:debugging#/runtime/this-firefox
```
<img src="https://github.com/oditynet/seetoprice/blob/main/video.gif" title="example" width="800" />

<!-- SHIELDS GROUP -->

[github-stars-shield]: https://img.shields.io/github/stars/oditynet/seetoprice?style=flat-square&logo=github&labelColor=black&color=508CF9
[github-stars-link]: https://github.com/oditynet/seetoprice/stargazers
[github-license-shield]: https://img.shields.io/github/license/oditynet/seetoprice?style=flat-square&logo=github&labelColor=black&color=508CF9
