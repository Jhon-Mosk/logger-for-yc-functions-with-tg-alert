# logger-for-yc-functions-with-tg-alert

Logger that uses [Yandex Cloud Logging](https://yandex.cloud/ru/services/logging) levels and allows you to send notifications to Telegram, without dependencies.

## Installation

```
npm install logger-for-yc-functions-with-tg-alert
```

## Usage

```js
const log = require('logger-for-yc-functions-with-tg-alert')({
  runtime: 'local',
  level: 'debug',
  header: 'Telegram message header',
  chatId: -1001234567890,
  botToken: "1234567890:DSfgfgweg43t34gegss34hu54u533gerg",
  extra: {
    parse_mode: 'HTML',
  },
});

const error = new Error('error');

log.debug('debug', 'label');
log.debug({ id: 1 }, 'label');
log.info('info', 'label');
log.warn('warn', 'label');
log.error('<error>&</error>', 'label');
log.error(error, 'label');
log.fatal('fatal', 'label');
log.trace('trace', 'label');
log.sendToTg('<code>&</code>', 'label');
log.sendToTg({ id: 1 }, 'label');
log.sendToTg(error, 'label');
log.sendToTg(14214, 'label');
```

- if `runtime = 'local'` is set, then the message will be formatted for output to the terminal
- `extra` - parameters for Telegram method [sendMessage](https://core.telegram.org/bots/api#sendmessage)
