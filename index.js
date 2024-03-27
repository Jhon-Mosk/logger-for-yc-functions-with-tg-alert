/** @module Logger */

const {
  env: { PWD },
} = require("node:process");

/**
 * требуется установить telegraf
 * требуется в переменных окружения указать:
 * TG_INFO_BOT_TOKEN - токен тг бота для отправки информационных сообщений
 * TG_ERROR_GROUP_ID - идентификатор группы телеграм для информирования об ошибках
 * при создании класса указать заголовок сообщения (название функции)
 * TG_INFO_BOT добавить в группу TG_ERROR_GROUP
 */

const { Telegraf } = require("telegraf");

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
  constructor(module = "unknown", header = "unknown") {
    if (module !== "unknown") {
      this.path = module.filename.slice(PWD.length + 1);
    } else {
      this.path = module;
    }
    this.header = header;
    this.bot = new Telegraf(process.env.TG_INFO_BOT_TOKEN);
  }

  /**
   * для экранирования специальных символов в markdownV2
   * спецсимолы которые требуется оставить экранировать с помощью 3 символов \
   * https://core.telegram.org/bots/api#markdownv2-style
   * @param {string} str исходная строка
   * @returns {string} строка с экранированными спецсимволами
   */
  #markdownV2EscapeSymbols = (str) =>
    str
      .replace(/_|\*|\[|\]|\(|\)|~|`|>|#|\+|-|=|'|\||{|}|\.|!/g, "\\$&")
      .replace(/\\\\/g, "");

  /**
   * для отправки сообщения в телеграм
   * @param {Number} groupId - идентификатор группы для отправки
   * @param {String} level - уровень записи
   * @param {String} msg - сообщение
   */
  #sendMessageToTg = async (groupId, level, msg) => {
    try {
      const escMsg = this.#markdownV2EscapeSymbols(
        `\\\*${this.header}\\\*\n\n\\\`${level}\\\`: ${JSON.stringify(msg)}`
      );
      await this.bot.telegram.sendMessage(groupId, escMsg, {
        parse_mode: "MarkdownV2",
      });
    } catch (error) {
      console.log("sendMessageToTgLoggerError:>> ", error);
    }
  };

  /**
   * для подготовки сообщения для Yandex.Cloud Logging
   * @param {string} level уровень лога
   * @param {string} msg сообщение
   * @param {string} label подпись
   * @returns {{level: string, message: string}} сообщение
   */
  #prepareMessageForYC = (level, msg, label = null) => {
    const levels = {
      debug: "DEBUG",
      info: "INFO",
      warn: "WARN",
      error: "ERROR",
      fatal: "FATAL",
      trace: "TRACE",
    };

    if (msg instanceof Error) {
      msg = msg.name + ": " + msg.message + "\n" + msg.stack;
    }

    if (typeof msg === "object") {
      msg = JSON.stringify(msg, null, 2);
    }

    const logMsg = {
      level: levels[level],
      message: `${this.path}:>> `,
    };

    if (label !== null) {
      logMsg.message += label + ":>> ";
    }

    logMsg.message += msg;

    return logMsg;
  };

  /**
   * для подготовки сообщения для консоли
   * @param {string} level уровень лога
   * @param {string} msg сообщение
   * @param {string} label подпись
   * @returns {string} сообщение
   */
  #prepareMessageForConsole = (level, msg, label = null) => {
    if (msg instanceof Error) {
      msg = msg.name + ": " + msg.message + "\n" + msg.stack;
    }

    if (typeof msg === "object") {
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
      background ? "4" + COLORS[color] : "3" + COLORS[color];
    const levels = {
      debug: colorCode("blue"),
      info: colorCode("green"),
      warn: colorCode("yellow"),
      error: colorCode("red"),
      fatal: colorCode("red", true),
      trace: colorCode("cyan"),
    };

    const date = new Date().toLocaleString();
    const escLabel = label !== null ? `${esc(ANSI["u"], label)}:>> ` : "";
    const message = `${date}: ${esc(
      levels[level],
      level.toUpperCase()
    )}: ${escLabel} ${msg}`;

    return message;
  };

  /**
   * выводит сообщения для отладки
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  debug(msg, label = null) {
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("debug", msg, label));
    } else if (process.env.NODE_ENV === "dev") {
      console.log(
        JSON.stringify(this.#prepareMessageForYC("debug", msg, label))
      );
    }
  }

  /**
   * выводит информационные сообщения
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  info(msg, label = null) {
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("info", msg, label));
    } else {
      console.log(
        JSON.stringify(this.#prepareMessageForYC("info", msg, label))
      );
    }
  }

  /**
   * выводит предупреждения
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  warn(msg, label = null) {
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("warn", msg, label));
    } else {
      console.log(
        JSON.stringify(this.#prepareMessageForYC("warn", msg, label))
      );
    }
  }

  /**
   * выводит ошибки
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  async error(msg, label = null) {
    const preparedMsg = this.#prepareMessageForYC("error", msg, label);
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("error", msg, label));
    } else {
      console.error(JSON.stringify(preparedMsg));
    }
    await this.#sendMessageToTg(
      process.env.TG_ERROR_GROUP_ID,
      preparedMsg.level,
      preparedMsg.message
    );
  }

  /**
   * выводит сообщение о фатальной ошибке
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  async fatal(msg, label = null) {
    const preparedMsg = this.#prepareMessageForYC("fatal", msg, label);
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("fatal", msg, label));
    } else {
      console.error(JSON.stringify(preparedMsg));
    }
    await this.#sendMessageToTg(
      process.env.TG_ERROR_GROUP_ID,
      preparedMsg.level,
      preparedMsg.message
    );
  }

  /**
   * выводит трассировку до сообщения
   * @param {String} msg - текст сообщения
   * @param {String} [label=null] - текст подписи к сообщению
   */
  trace(msg, label = null) {
    if (process.env.NODE_ENV === "local") {
      console.log(this.#prepareMessageForConsole("trace", msg, label));
    } else {
      console.log(
        JSON.stringify(this.#prepareMessageForYC("trace", msg, label))
      );
    }
  }
}

/**
 *
 * @param {module} module - модуль в котором вызван логгер
 * @param {module} header - заголовок для сообщения в тг
 * @returns {Logger} логгер
 */
const getLogger = (module, header) => new Logger(module, header);

module.exports = getLogger;
