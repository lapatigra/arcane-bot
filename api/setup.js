// Подключение бота к сайту одной ссылкой: открыть <адрес сайта>/api/setup.
// Токен берётся из настроек Vercel (BOT_TOKEN), вручную его никуда вставлять не нужно.
// Безопасно открывать сколько угодно раз: вебхук всегда ставится на этот же сайт.
module.exports = async (req, res) => {
    const token = process.env.BOT_TOKEN;
    // Адрес сайта берём из самого запроса — по нему страницу и открыли, опечатки тут не бывает.
    const site = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
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

    const hook = await call('setWebhook', { url: `${site}/api/webhook`, allowed_updates: ['message'] });
    const menu = await call('setChatMenuButton', {
        menu_button: { type: 'web_app', text: 'Заказать песню', web_app: { url: site } },
    });

    res.status(hook.ok ? 200 : 500).send(
        `Бот: @${me.result.username}\n` +
        `Сайт: ${site}\n` +
        `Подключение к сайту: ${hook.ok ? 'готово' : 'ошибка — ' + hook.description}\n` +
        `Кнопка меню: ${menu.ok ? 'готово' : 'ошибка — ' + menu.description}\n\n` +
        (hook.ok ? `Откройте https://t.me/${me.result.username} и нажмите Start.` : '')
    );
};
