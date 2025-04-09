<a name="readme-top"></a>
<div align="center">
    
<br>
    
# seetoprice

<!-- SHIELD GROUP -->

[![][github-stars-shield]][github-stars-link]
[![][github-license-shield]][github-license-shield]<br/>

Addon for firefox (https://addons.mozilla.org/firefox/downloads/file/4470967/d15151e3563243ae9309-1.0.4.2.xpi)

<a name="readme-left"></a>
<div align="left">

Плагин для firefox браузера для слежения за динамикой цен на сайтах www.vseinstrumenti.ru и www.ozon.ru (Всеинструменты и Озон). 

# Инструкция пользования 

1) Зайти на страницу желаемой вещи
2) Правой клавишей мыши кликнуть по цене
2.1) В меню выбираете "отслеживать цену" и товар помещается в список. Список можно увидел в панели аддонов. Обновление цены происходит каждые 10 минут и в случае изменения цен вам будет выдано уведомление.

В версии 1.0.4 добавлена история до 5 изменений с циклической перезаписью.
В версии 1.0.4.2 добавлена озможность  самому изменить колчество созраняемых записей в истории и время обновления цен

BUG: Иногда с Ozon первым уведомлением приходит та же сумма, но без проблов.

WARNING: Яндекс.маркет не поддерживается,так как они используют "антибот"

WARNING: Wildberries не поддерживает получение актуальной цены. Истории у вас не будет, но сам товар вы можете поместить в список без уведомления о смены цены.

Структура директории следующая:
```
seetoprice.zip
├── manifest.json
├── background.js
├── content.js
├── icons/
│   └── icon48.png
│   └── del.png
└── popup/
    ├── popup.html
    └── popup.js
```
Для сборки нужно сохранить структуру и запаровать все файлы и папки ZIP: zip -r ../seetoprice.zip *

Для теста можете попробовать режим разработчика:
```
about:debugging#/runtime/this-firefox
```
<img src="https://github.com/oditynet/seetoprice/blob/main/video.gif" title="example" width="800" />

<!-- SHIELDS GROUP -->

[github-stars-shield]: https://img.shields.io/github/stars/oditynet/seetoprice?style=flat-square&logo=github&labelColor=black&color=508CF9
[github-stars-link]: https://github.com/oditynet/seetoprice/stargazers
[github-license-shield]: https://img.shields.io/github/license/oditynet/seetoprice?style=flat-square&logo=github&labelColor=black&color=508CF9

И на последок фотография внешнего вида.

<br>

For example ver. 1.0.4
<img src="https://github.com/oditynet/seetoprice/blob/main/screen2.png" title="1.0.4" width="800" />
