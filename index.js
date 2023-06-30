/** @module Logger */

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
            this.path = module.filename.split("\\").slice(-2).join("\\");
        } else {
            this.path = module;
        }
        this.header = header;
    }

    /**
     * для отправки сообщения в телеграм
     * @param {Number} groupId - идентификатор группы для отправки
     * @param {String} level - уровень записи
     * @param {String} msg - сообщение
     */
    #sendMessageToTg = async (groupId, level, msg) => {
        const bot = new Telegraf(process.env.TG_INFO_BOT_TOKEN);

        try {
            await bot.telegram.sendMessage(
                groupId,
                `<b>${this.header}</b>\n\n<code>${level}</code>: ${JSON.stringify(msg)}`,
                {
                    parse_mode: "HTML",
                }
            );
        } catch (error) {
            console.log("sendMessageToTgLoggerError:>> ", error);
        }
    };

    /**
     * выводит сообщения для отладки
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    debug(msg, label = null) {
        if (msg instanceof Error) {
            msg = msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            msg = JSON.stringify(msg, null, 2);
        }

        if (process.env.NODE_ENV === "dev") {
            const logMsg = {
                level: "DEBUG",
                message: `${this.path}:>> `,
            };

            if (label !== null) {
                logMsg.message += label + ":>> ";
            }

            logMsg.message += msg;

            console.log(JSON.stringify(logMsg));
        }
    }

    /**
     * выводит информационные сообщения
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    info(msg, label = null) {
        if (msg instanceof Error) {
            msg = msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            msg = JSON.stringify(msg, null, 2);
        }

        const logMsg = {
            level: "INFO",
            message: `${this.path}:>> `,
        };

        if (label !== null) {
            logMsg.message += label + ":>> ";
        }

        logMsg.message += msg;

        console.log(JSON.stringify(logMsg));
    }

    /**
     * выводит предупреждения
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    warn(msg, label = null) {
        if (msg instanceof Error) {
            msg = msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            msg = JSON.stringify(msg, null, 2);
        }

        const logMsg = {
            level: "WARN",
            message: `${this.path}:>> `,
        };

        if (label !== null) {
            logMsg.message += label + ":>> ";
        }

        logMsg.message += msg;

        console.log(JSON.stringify(logMsg));
    }

    /**
     * выводит ошибки
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    async error(msg, label = null) {
        const logMsg = {
            level: "ERROR",
            message: `${this.path}:>> `,
        };

        if (label) {
            logMsg.message += label + ":>> ";
        }

        if (msg instanceof Error) {
            logMsg.message += msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            logMsg.message += JSON.stringify(msg, null, 2);
        } else {
            logMsg.message += msg;
        }

        console.error(JSON.stringify(logMsg));

        if (msg instanceof Error) {
            logMsg.message = logMsg.message.replace(/<|>|&/g, "");
        }

        await this.#sendMessageToTg(process.env.TG_ERROR_GROUP_ID, logMsg.level, logMsg.message);
    }

    /**
     * выводит сообщение о фатальной ошибке
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    async fatal(msg, label = null) {
        const logMsg = {
            level: "FATAL",
            message: `${this.path}:>> `,
        };

        if (label) {
            logMsg.message += label + ":>> ";
        }

        if (msg instanceof Error) {
            logMsg.message += msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            logMsg.message += JSON.stringify(msg, null, 2);
        } else {
            logMsg.message += msg;
        }

        console.error(JSON.stringify(logMsg));

        if (msg instanceof Error) {
            logMsg.message = logMsg.message.replace(/<|>|&/g, "");
        }

        await this.#sendMessageToTg(process.env.TG_ERROR_GROUP_ID, logMsg.level, logMsg.message);
    }

    /**
     * выводит трассировку до сообщения
     * @param {String} msg - текст сообщения
     * @param {String} [label=null] - текст подписи к сообщению
     */
    trace(msg, label = null) {
        if (msg instanceof Error) {
            msg = msg.name + ": " + msg.message + "\n" + msg.stack;
        }

        if (typeof msg === "object") {
            msg = JSON.stringify(msg, null, 2);
        }

        const logMsg = {
            level: "TRACE",
            message: `${this.path}:>> `,
        };

        if (label !== null) {
            logMsg.message += label + ":>> ";
        }

        logMsg.message += msg;

        console.log(JSON.stringify(logMsg));
    }
}

/**
 *
 * @param {module} module - модуль в котором вызван логгер
 * @param {module} header - заголовок для сообщения в тг
 * @returns {Logger} логгер
 */
const getLogger = (module, header) => {
    return new Logger(module, header);
};

module.exports = getLogger;
