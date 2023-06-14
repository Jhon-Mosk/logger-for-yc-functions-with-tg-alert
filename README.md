Позволяет выводить в лог яндекса сообщения используя уровни яндекса.

Подключение: `const log = require("logger-for-yc-functions-with-tg-alert")(module, 'Заголовок для сообщения в тг');`.

Вид в логе: Дата, Время | Уровень | путь до вызова лога:>> | подпись к сообщению, если указана:>> | ваше сообщение

Если нет переменной окружения `NODE_ENV=dev`, то сообщения уровня debug выводиться не будут

Для отправки сообщений в телеграм:

-   требуется установить telegraf
-   требуется в переменных окружения указать:
    -   TG_INFO_BOT_TOKEN - токен тг бота для отправки информационных сообщений
    -   TG_ERROR_GROUP_ID - идентификатор группы телеграм для информирования об ошибках
-   при создании класса указать заголовок сообщения (название функции)
-   TG_INFO_BOT добавить в группу TG_ERROR_GROUP

### Вид сообщения в тг

##### заголовок сообщения

ERROR: 2023-06-13T09:12:24 UTC [/.../.../.../index.js] подпись к сообщению:>> сообщение
