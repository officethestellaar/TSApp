"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerWorkflow = void 0;
const axios_1 = __importDefault(require("axios"));
// The base URL for your n8n webhooks. 
// In production, this should be an environment variable.
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/';
/**
 * Triggers an external n8n workflow by sending an HTTP POST request.
 *
 * @param eventName The specific path of the n8n webhook (e.g., 'amc-approved')
 * @param payload The data object to send to the n8n workflow
 */
const triggerWorkflow = async (eventName, payload) => {
    if (!process.env.N8N_WEBHOOK_URL && process.env.NODE_ENV === 'production') {
        console.warn(`[n8n] Webhook URL not configured. Skipping event: ${eventName}`);
        return;
    }
    try {
        const url = `${N8N_WEBHOOK_URL.replace(/\/$/, '')}/${eventName}`;
        // Fire and forget - we don't want to block the main application thread
        axios_1.default.post(url, payload).catch(err => {
            console.error(`[n8n] Failed to trigger workflow '${eventName}':`, err.message);
        });
        console.log(`[n8n] Successfully dispatched event: ${eventName}`);
    }
    catch (error) {
        console.error(`[n8n] Critical error triggering workflow '${eventName}':`, error);
    }
};
exports.triggerWorkflow = triggerWorkflow;
