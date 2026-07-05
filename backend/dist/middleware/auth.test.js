"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const auth_1 = require("./auth");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
vitest_1.vi.mock('jsonwebtoken');
vitest_1.vi.mock('../lib/prisma', () => ({
    default: {
        user: {
            findUnique: vitest_1.vi.fn().mockResolvedValue({ locked: false }),
        },
    },
}));
(0, vitest_1.describe)('Auth Middleware', () => {
    const mockResponse = () => {
        const res = {};
        res.status = vitest_1.vi.fn().mockReturnValue(res);
        res.json = vitest_1.vi.fn().mockReturnValue(res);
        return res;
    };
    const mockNext = vitest_1.vi.fn();
    (0, vitest_1.describe)('authenticateToken', () => {
        (0, vitest_1.it)('should return 401 if no authorization header is present', () => {
            const req = { headers: {} };
            const res = mockResponse();
            (0, auth_1.authenticateToken)(req, res, mockNext);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ message: 'Access token missing' });
        });
        (0, vitest_1.it)('should return 401 if token is invalid', () => {
            const req = { headers: { authorization: 'Bearer invalid-token' } };
            const res = mockResponse();
            vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockImplementation((token, secret, callback) => {
                callback(new Error('Invalid'), null);
            });
            (0, auth_1.authenticateToken)(req, res, mockNext);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(401);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
        });
        (0, vitest_1.it)('should call next and set req.user if token is valid', async () => {
            const user = { userId: 1, role: 'ADMIN' };
            const req = { headers: { authorization: 'Bearer valid-token' } };
            const res = mockResponse();
            vitest_1.vi.mocked(jsonwebtoken_1.default.verify).mockImplementation((token, secret, callback) => {
                callback(null, user);
            });
            (0, auth_1.authenticateToken)(req, res, mockNext);
            // Wait for async callback (await prisma.user.findUnique) to complete
            await new Promise(resolve => setTimeout(resolve, 0));
            (0, vitest_1.expect)(req.user).toEqual(user);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
        });
    });
    (0, vitest_1.describe)('authorizeRoles', () => {
        (0, vitest_1.it)('should return 403 if user role is not allowed', () => {
            const req = { user: { role: 'USER' } };
            const res = mockResponse();
            const middleware = (0, auth_1.authorizeRoles)('ADMIN');
            middleware(req, res, mockNext);
            (0, vitest_1.expect)(res.status).toHaveBeenCalledWith(403);
            (0, vitest_1.expect)(res.json).toHaveBeenCalledWith({ message: 'Unauthorized role' });
        });
        (0, vitest_1.it)('should call next if user role is allowed', () => {
            const req = { user: { role: 'ADMIN' } };
            const res = mockResponse();
            const middleware = (0, auth_1.authorizeRoles)('ADMIN', 'SUPER_ADMIN');
            middleware(req, res, mockNext);
            (0, vitest_1.expect)(mockNext).toHaveBeenCalled();
        });
    });
});
