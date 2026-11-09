// Новый заказ -> сообщение артисту в Telegram.
const crypto = require('crypto');
const CONFIG = require('../public/config.js');

// Проверка подписи данных мини-аппа: так мы знаем, что заказ пришёл
// из Telegram от этого человека, а не подделан запросом со стороны.
function verifyInitData(initData, botToken) {
    if (!initData || !botToken) return null;
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheck = [...params.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
    const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const check = crypto.createHmac('sha256', secret).update(dataCheck).digest('hex');
    if (check !== hash) return null;
    try { return JSON.parse(params.get('user') || 'null'); } catch { return null; }
}

// Страница может лежать на другом хостинге (в России), а приём заказов здесь.
// Тогда браузер шлёт запрос с чужого адреса, и ему нужно явно разрешить это.
const ALLOWED_ORIGINS = [CONFIG.siteUrl, 'https://arcane.tigratime.ru']
    .filter(Boolean).map(u => u.replace(/\/+$/, ''));

function allowCors(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
    }
}

const clip = (s, n) => String(s || '').trim().slice(0, n);

module.exports = async (req, res) => {
    allowCors(req, res);
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).end();

    const BOT_TOKEN = process.env.BOT_TOKEN;
    const OWNER_CHAT_ID = process.env.OWNER_CHAT_ID;
    if (!BOT_TOKEN || !OWNER_CHAT_ID) {
        console.error('Не заданы BOT_TOKEN / OWNER_CHAT_ID');
        return res.status(500).json({ ok: false });
    }

    const body = req.body || {};
    const song = clip(body.song, 200);
    const greeting = clip(body.greeting, 1000);
    if (!song || !greeting) return res.status(400).json({ ok: false });

    const verified = verifyInitData(body.initData, BOT_TOKEN);
    const user = verified || body.user || {};
    const name = clip(user.first_name, 64) || 'Гость';
    const username = user.username ? '@' + clip(user.username, 64) : '(без username)';

    let text = `НОВЫЙ ЗАКАЗ — ${CONFIG.name}\n\n`;
    text += `Кто заказал: ${name} ${username}\n`;
    if (user.id) text += `ID: ${user.id}\n`;
    const contact = clip(body.contact, 100);
    if (contact) text += `Связаться: ${contact}\n`;
    if (!verified) text += `(заказ с сайта, не из Telegram)\n`;
    text += `\nПесня: ${song}\n`;
    text += `\nПоздравление:\n${greeting}\n`;
    text += `\nК оплате: ${CONFIG.price} ₽ — заказ оформлен, проверьте, пришла ли оплата`;

    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: OWNER_CHAT_ID, text }),
    });
    if (!r.ok) {
        console.error('Telegram:', r.status, await r.text());
        return res.status(502).json({ ok: false });
    }
    res.status(200).json({ ok: true });
};
