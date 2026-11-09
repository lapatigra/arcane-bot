// Подключение бота к сайту одной ссылкой: открыть <адрес сайта>/api/setup.
// Токен берётся из настроек Vercel (BOT_TOKEN), вручную его никуда вставлять не нужно.
// Безопасно открывать сколько угодно раз: вебхук всегда ставится на этот же сайт.
const CONFIG = require('../public/config.js');

module.exports = async (req, res) => {
    const token = process.env.BOT_TOKEN;
    // Вебхук ставим на адрес, по которому открыли эту страницу (до него Telegram точно дойдёт,
    // если открылось у нас). Кнопки для гостей ведут на siteUrl из настроек.
    const host = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
    const site = (CONFIG.siteUrl || host).replace(/\/+$/, '');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');

    if (!token) return res.status(500).send('Не задан BOT_TOKEN в настройках Vercel (и после добавления нужен Redeploy).');

    const call = async (method, params) => {
        const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params || {}),
        });
        return r.json();
    };

    const me = await call('getMe');
    if (!me.ok) {
        return res.status(400).send(
            'Telegram не узнал токен (' + (me.description || 'ошибка') + ').\n' +
            'Проверьте BOT_TOKEN в Vercel: его надо скопировать из @BotFather целиком ' +
            '(цифры, двоеточие и длинный хвост), сохранить и сделать Redeploy.'
        );
    }

    const hook = await call('setWebhook', { url: `${host}/api/webhook`, allowed_updates: ['message'] });
    const info = hook.ok ? null : await call('getWebhookInfo');
    const menu = await call('setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'Заказать песню', web_app: { url: site } },
    });

    res.status(hook.ok ? 200 : 500).send(
        `Бот: @${me.result.username}\n` +
        `Сайт: ${site}\n` +
        `Приём сообщений бота: ${hook.ok ? 'готово (' + host + ')'
            : 'не переключился (' + hook.description + ')' +
              (info?.result?.url ? `, работает прежний: ${info.result.url}` : '')}\n` +
        `Кнопка меню: ${menu.ok ? 'готово' : 'ошибка — ' + menu.description}\n\n` +
        `Откройте https://t.me/${me.result.username} и нажмите Start.`
    );
};
