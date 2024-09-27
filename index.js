/** @module Logger */

const DEFAULT_LEVELS = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  unspecified: 70,
};

const API_URL = 'https://api.telegram.org/bot';

/**
 * Отправляет сообщение в Telegram
 * @param {number} chatId - идентификатор чата
 * @param {string} botToken - токен бота
 * @param {string} message - текст сообщения
 * @param {Object} [extra={}] - дополнительные параметры - https://core.telegram.org/bots/api#sendmessage
 * @return {Promise<Object>} - результат вызова метода
 * @throws {Error} - если не удалось отправить сообщение
 */
const sendMsgToTg = async (chatId, botToken, message, extra = {}) => {
  const method = 'sendMessage';
  const url = `${API_URL}${botToken}/${method}`;
  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    ...extra,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
  });

  if (response.ok) {
    const data = await response.json();
    const { ok, result, error_code, description } = data;

    if (ok) return result;

    throw new Error(`${error_code}: ${description}`);
  }

  const { status, statusText } = response;
  throw new Error(`${status}: ${statusText}`);
};

/**
 * для подготовки сообщения для Yandex.Cloud Logging
 * @param {string} level уровень лога
 * @param {string} msg сообщение
 * @param {string} label подпись
 * @returns {{level: string, message: string}} сообщение
 */
const prepareMessageForYC = (level, msg, label = null) => {
  const levels = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARN',
    error: 'ERROR',
    fatal: 'FATAL',
    trace: 'TRACE',
  };

  const prepared = {
    level: levels[level] || 'UNSPECIFIED',
    message: msg,
  };

  if (prepared.message instanceof Error) {
    prepared.message = msg.name + ': ' + msg.message + '\n' + msg.stack;
  }
  if (typeof prepared.message === 'object') {
    prepared.message = JSON.stringify(msg, null, 2);
  }

  if (label !== null) {
    prepared.message = label + ':>> ' + prepared.message;
  }

  return prepared;
};

/**
 * для подготовки сообщения для консоли
 * @param {string} level уровень лога
 * @param {string} msg сообщение
 * @param {string} label подпись
 * @returns {string} сообщение
 */
const prepareMessageForConsole = (level, msg, label = null) => {
  if (msg instanceof Error) {
    msg = msg.name + ': ' + msg.message + '\n' + msg.stack;
  }

  if (typeof msg === 'object') {
    msg = JSON.stringify(msg, null, 2);
  }

  const COLORS = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7,
  };
  const ANSI = {
    b: 1, // bold (increased intensity)
    f: 2, // faint (decreased intensity)
    i: 3, // italic
    u: 4, // underline
    l: 5, // blink slow
    h: 6, // blink rapid
    n: 7, // negative
    c: 8, // conceal
    s: 9, // strikethrough
  };
  const esc = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
  const colorCode = (color, background = false) =>
    background ? '4' + COLORS[color] : '3' + COLORS[color];
  const levels = {
    debug: colorCode('blue'),
    info: colorCode('green'),
    warn: colorCode('yellow'),
    error: colorCode('red'),
    fatal: colorCode('red', true),
    trace: colorCode('cyan'),
    unspecified: colorCode('magenta'),
  };

  const date = new Date().toLocaleString();
  const escLabel = label !== null ? `${esc(ANSI['u'], label)}:>> ` : '';
  const message = `${date}: ${esc(
    levels[level],
    level.toUpperCase()
  )}: ${escLabel} ${msg}`;

  return message;
};

/**
 * @class
 * debug: отладочные сообщения, не выводятся в prod
 * info: все ожидаемые события, учет которых запланирован.
 * warn: неожиданные/подозрительные события - иначе говоря аномалии, после которых еще возможно продолжение работы приложения.
 * error: событие, после которого невозможно дальнейшее выполнение программы.
 * fatal: событие, требующее по-настоящему немедленного вмешательства.
 * trace: трассировка до места вызова.
 */
class Logger {
  #runtime;
  #handler;
  #header;
  #level;
  #chatId;
  #botToken;
  #extra;

  constructor(options = {}) {
    const { runtime, header, level, chatId, botToken, extra } = options;
    this.#runtime = runtime || 'yc';
    this.#handler =
      runtime === 'local' ? prepareMessageForConsole : prepareMessageForYC;
    this.#header = header;
    this.#level = DEFAULT_LEVELS[level] || DEFAULT_LEVELS['debug'];
    this.#chatId = chatId;
    this.#botToken = botToken;
    this.#extra = extra || {};
  }

  /**
   * Создает экземпляр Logger
   * @param {Object} options - настройки
   * @param {String} [options.runtime=yc] - runtime, где будет использоваться logger (yc - для yandex cloud, local - для локальной машины), по умолчанию `yc`
   * @param {String} [options.header] - заголовок для сообщений в телеграм
   * @param {String} [options.level=debug] - уровень логирования, по умолчанию `debug`
   * @param {Number} [options.chatId] - идентификатор группы телеграм для отправки ошибок
   * @param {String} [options.botToken] - токен бота телеграм для отправки ошибок
   * @return {Logger} - экземпляр Logger
   */
  static create(options = {}) {
    return new Logger(options);
  }

  #log(level, msg, label = undefined) {
    if (this.#level <= DEFAULT_LEVELS[level])
      console.log(this.#handler(level, msg, label));
  }

  /**
   * выводит трассировку до сообщения
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  trace(msg, label = undefined) {
    const level = 'trace';
    this.#log(level, msg, label);
  }

  /**
   * выводит сообщения для отладки
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  debug(msg, label = undefined) {
    const level = 'debug';
    this.#log(level, msg, label);
  }

  /**
   * выводит информационные сообщения
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  info(msg, label = undefined) {
    const level = 'info';
    this.#log(level, msg, label);
  }

  /**
   * выводит предупреждения
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  warn(msg, label = undefined) {
    const level = 'warn';
    this.#log(level, msg, label);
  }

  /**
   * выводит ошибки
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  error(msg, label = undefined) {
    const level = 'error';
    this.#log(level, msg, label);
  }

  /**
   * выводит сообщение о фатальной ошибке
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   */
  fatal(msg, label = undefined) {
    const level = 'fatal';
    this.#log(level, msg, label);
  }

  /**
   * Отправляет сообщение в Telegram
   * @param {String} msg - текст сообщения
   * @param {String} [label=undefined] - текст подписи к сообщению
   * @return {Promise<void>}
   */
  async sendToTg(msg, label = undefined) {
    const level = 'unspecified';
    this.#log(level, msg, label);

    try {
      let preparedMsg = msg;

      if (preparedMsg instanceof Error) {
        preparedMsg = msg.name + ': ' + msg.message;
      }

      if (typeof preparedMsg === 'object') {
        preparedMsg = JSON.stringify(msg, null, 2);
      }

      if (label) {
        preparedMsg = `${label}:>> ${preparedMsg}`;
      }

      if (this.#header) {
        preparedMsg = `${this.#header}\n\n${preparedMsg}`;
      }

      await sendMsgToTg(this.#chatId, this.#botToken, preparedMsg, this.#extra);
    } catch (error) {
      this.error(error);
    }
  }
}

module.exports = Logger.create;
