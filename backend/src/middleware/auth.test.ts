import { describe, it, expect, vi } from 'vitest';
import { authenticateToken, authorizeRoles, AuthRequest } from './auth';
import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

vi.mock('jsonwebtoken');
vi.mock('../lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ locked: false }),
    },
  },
}));

describe('Auth Middleware', () => {
  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext: NextFunction = vi.fn();

  describe('authenticateToken', () => {
    it('should return 401 if no authorization header is present', () => {
      const req = { headers: {} } as AuthRequest;
      const res = mockResponse();

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Access token missing' });
    });

    it('should return 401 if token is invalid', () => {
      const req = { headers: { authorization: 'Bearer invalid-token' } } as AuthRequest;
      const res = mockResponse();
      
      vi.mocked(jwt.verify).mockImplementation((token, secret, callback: any) => {
        callback(new Error('Invalid'), null);
      });

      authenticateToken(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    it('should call next and set req.user if token is valid', async () => {
      const user = { userId: 1, role: 'ADMIN' };
      const req = { headers: { authorization: 'Bearer valid-token' } } as AuthRequest;
      const res = mockResponse();
      
      vi.mocked(jwt.verify).mockImplementation((token, secret, callback: any) => {
        callback(null, user);
      });

      authenticateToken(req, res, mockNext);

      // Wait for async callback (await prisma.user.findUnique) to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(req.user).toEqual(user);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorizeRoles', () => {
    it('should return 403 if user role is not allowed', () => {
      const req = { user: { role: 'USER' } } as AuthRequest;
      const res = mockResponse();
      const middleware = authorizeRoles('ADMIN');

      middleware(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized role' });
    });

    it('should call next if user role is allowed', () => {
      const req = { user: { role: 'ADMIN' } } as AuthRequest;
      const res = mockResponse();
      const middleware = authorizeRoles('ADMIN', 'SUPER_ADMIN');

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
