"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveToken = saveToken;
exports.removeToken = removeToken;
exports.getTokensForUser = getTokensForUser;
exports.getAllTokens = getAllTokens;
exports.sendPushNotification = sendPushNotification;
exports.broadcastPush = broadcastPush;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const TOKENS_FILE = path_1.default.join(__dirname, '../../../data/push-tokens.json');
function ensureFile() {
    const dir = path_1.default.dirname(TOKENS_FILE);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    if (!fs_1.default.existsSync(TOKENS_FILE))
        fs_1.default.writeFileSync(TOKENS_FILE, '[]', 'utf-8');
}
function readTokens() {
    ensureFile();
    try {
        return JSON.parse(fs_1.default.readFileSync(TOKENS_FILE, 'utf-8'));
    }
    catch {
        return [];
    }
}
function writeTokens(tokens) {
    ensureFile();
    fs_1.default.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}
function saveToken(token, userId, memberId, platform = 'ios') {
    const tokens = readTokens().filter((t) => t.token !== token);
    tokens.push({ token, userId, memberId, platform, createdAt: new Date().toISOString() });
    writeTokens(tokens);
}
function removeToken(token) {
    const tokens = readTokens().filter((t) => t.token !== token);
    writeTokens(tokens);
}
function getTokensForUser(userId, memberId) {
    return readTokens()
        .filter((t) => (userId && t.userId === userId) || (memberId && t.memberId === memberId))
        .map((t) => t.token);
}
function getAllTokens() {
    return readTokens().map((t) => t.token);
}
async function sendPushNotification(token, title, body, data) {
    try {
        const message = {
            to: token,
            sound: 'default',
            title,
            body,
            data: data || {},
            priority: 'high',
        };
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        return await res.json();
    }
    catch (error) {
        console.error('[Push] Failed to send:', error);
    }
}
async function broadcastPush(title, body, data) {
    const tokens = getAllTokens();
    for (const token of tokens) {
        await sendPushNotification(token, title, body, data);
    }
}
