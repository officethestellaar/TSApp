"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const push_1 = require("../lib/push");
const router = express_1.default.Router();
router.post('/token', auth_1.authenticateToken, async (req, res) => {
    try {
        const { token, platform } = req.body;
        if (!token) {
            return res.status(400).json({ message: 'Token is required' });
        }
        const userId = req.user?.userId;
        const memberId = req.user?.role === 'MEMBER' ? userId : undefined;
        const staffId = req.user?.role !== 'MEMBER' ? userId : undefined;
        (0, push_1.saveToken)(token, staffId, memberId, platform || 'ios');
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to register token' });
    }
});
router.delete('/token', auth_1.authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        if (token)
            (0, push_1.removeToken)(token);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to remove token' });
    }
});
exports.default = router;
