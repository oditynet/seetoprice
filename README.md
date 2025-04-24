<a name="readme-top"></a>
<div align="center">
    Проект останавливаю,т.к. устал ждать когда в AMO начнут шевелиться, а в Chrome будет уплачено 5$
    
<br>
    
# seetoprice

<!-- SHIELD GROUP -->

[![][github-stars-shield]][github-stars-link]
[![][github-license-shield]][github-license-shield]<br/>

Addon for firefox !!! (https://addons.mozilla.org/firefox/downloads/file/4472104/d15151e3563243ae9309-1.1.1.xpi old version) 
https://addons.mozilla.org/ru/firefox/addon/seetoprice/


Addon for Chrome (I am not have a 5$)


<a name="readme-left"></a>
<div align="left">

Плагин для Firefox/Chrome браузера для слежения за динамикой цен на сайтах www.vseinstrumenti.ru,  www.ozon.ru, www.wildberries.ru,  www.avito.ru (Всеинструменты, Озон, (Вальберис, Авито с версии 1.2) ). 

# Инструкция пользования 

1) Зайти на страницу желаемой вещи
2) Правой клавишей мыши кликнуть по цене
3) В меню выбираете "отслеживать цену" и товар помещается в список. Список можно увидел в панели аддонов. Обновление цены происходит каждые 10 минут и в случае изменения цен вам будет выдано уведомление.
4) Скачайте готовый аддон из шапки данного руководства

# Change:
В версии 1.2.1.6: Устарены все недочеты AMO и XSS-уязвимости для firefox.

В версии 1.2.1.5: Устранена проблема с перелистыванием в начало страницы, а в версии chrome пришлось удалить поддержку telegram потому что там запрещены прямые обращения к серверу, а настроить CORS я не осилил пока.

В версии 1.2.1.4: Смена лицензии на GPL 3.0

В версии 1.2.1: Добавлена поддержка wildberries, Avito и отправка уведомлений в ваш Telegram канал.
  
В версии 1.1.1: Добавлено цветовое выделение цены в списке для удобства поиска в списке товаров.

В версии 1.1:
   - добавлены новые иконки
   - изменение иконок в браузере,если цена изменена (т.н. визуальное оповещение)
   - изменение истории с отображение динамики цены + или - 
   - устранены ошибки ложных срабатований.
     
В версии 1.0.4.2: добавлена возможность  самому изменить колчество созраняемых записей в истории и время обновления цен

В версии 1.0.4 добавлена история до 5 изменений с циклической перезаписью.

# Внимание

WARNING: Яндекс.маркет не поддерживается,так как они используют "антибот"

Для сборки:

```
web-ext sign --api-key="user:..." --api-secret="..." --source-dir . --channel="unlisted" --amo-metadata metadata.json -v
```

Для сборки нужно сохранить структуру и запаровать все файлы и папки ZIP(устаревшая): 

```
zip -r ../seetoprice.zip *
или
jpm xpi
```

для работы Телеграм вам нужно:
1) Напишите @BotFather в Telegram
2) Используйте команду /newbot
3) Получите токен вида 123456789:ABCdefGHIJKlmNoPQRsTUVwxyZ
4) Вставьте токен в аддон


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

<img src="https://github.com/oditynet/seetoprice/blob/main/screen2.png" title="1.0.4" width="800" />
