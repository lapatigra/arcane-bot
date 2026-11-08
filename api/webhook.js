// Ответ бота на /start: приветствие и кнопка, открывающая мини-апп.
const CONFIG = require('../public/config.js');

module.exports = async (req, res) => {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    const msg = req.body?.message;

    if (msg?.text?.startsWith('/start')) {
        const name = msg.from?.first_name || 'друг';
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: msg.chat.id,
                text: `Привет, ${name}!\n\nЗдесь можно заказать песню с поздравлением — ${CONFIG.name} исполнит её вживую.\n\nНажми кнопку, чтобы выбрать песню.`,
                reply_markup: {
                    inline_keyboard: [[{
                        text: `Заказать песню — ${CONFIG.price} ₽`,
                        // адрес сайта = тот, на который Telegram прислал этот запрос
                        web_app: { url: `https://${req.headers['x-forwarded-host'] || req.headers.host}` },
                    }]],
                },
            }),
        });
    }
    res.status(200).json({ ok: true });
};
