import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import userRouter from './user';

const mockUserScreenAccess = vi.hoisted(() => ({
  findMany: vi.fn(),
  findUnique: vi.fn(),
  createMany: vi.fn(),
  deleteMany: vi.fn(),
}));

const mockUser = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

const mockAuthUser = vi.hoisted(() => ({
  userId: 1,
  role: 'SUPER_ADMIN' as string,
  name: 'Test SuperAdmin',
}));

vi.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { ...mockAuthUser };
    next();
  },
  authorizeRoles: () => (_req: any, _res: any, next: any) => next(),
  authorizePermission: () => (_req: any, _res: any, next: any) => next(),
  AuthRequest: {} as any,
}));

vi.mock('../lib/prisma', () => ({
  default: {
    user: mockUser,
    userScreenAccess: mockUserScreenAccess,
  },
}));

vi.mock('../lib/socket', () => ({
  emitEvent: vi.fn(),
}));

const app = express();
app.use(express.json());
app.use('/api/users', userRouter);

describe('Screen Permission Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.userId = 1;
    mockAuthUser.role = 'SUPER_ADMIN';
  });

  describe('GET /api/users/screens', () => {
    it('should return all screens for SUPER_ADMIN', async () => {
      const res = await request(app).get('/api/users/screens');
      expect(res.status).toBe(200);
      expect(res.body.allScreens).toBeDefined();
      expect(res.body.userScreens).toEqual([]);
      expect(res.body.isSuperAdmin).toBe(true);
    });

    it('should return user screens for non-admin', async () => {
      mockAuthUser.userId = 2;
      mockAuthUser.role = 'STAFF';

      mockUserScreenAccess.findMany.mockResolvedValue([
        { screenKey: 'members', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      ]);

      const res = await request(app).get('/api/users/screens');
      expect(res.status).toBe(200);
      expect(res.body.userScreens).toHaveLength(1);
      expect(res.body.userScreens[0].screenKey).toBe('members');
      expect(res.body.isSuperAdmin).toBe(false);
    });

    it('should filter out all-false screen entries', async () => {
      mockAuthUser.userId = 3;
      mockAuthUser.role = 'STAFF';

      mockUserScreenAccess.findMany.mockResolvedValue([
        { screenKey: 'members', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
        { screenKey: 'inventory', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      ]);

      const res = await request(app).get('/api/users/screens');
      expect(res.status).toBe(200);
      expect(res.body.userScreens).toHaveLength(1);
      expect(res.body.userScreens[0].screenKey).toBe('members');
    });
  });

  describe('GET /api/users/:id/screens/permissions', () => {
    it('should return granular permissions for a user', async () => {
      mockUserScreenAccess.findMany.mockResolvedValue([
        { screenKey: 'members', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
        { screenKey: 'billing', canCreate: false, canRead: true, canUpdate: false, canDelete: false },
      ]);

      const res = await request(app).get('/api/users/5/screens/permissions');
      expect(res.status).toBe(200);
      expect(res.body.allScreens).toBeDefined();
      expect(res.body.permissions.members).toBeDefined();
      expect(res.body.permissions.members.canCreate).toBe(true);
      expect(res.body.permissions.members.canRead).toBe(true);
      expect(res.body.permissions.billing.canRead).toBe(true);
    });

    it('should filter out all-false entries from permissions', async () => {
      mockUserScreenAccess.findMany.mockResolvedValue([
        { screenKey: 'members', canCreate: false, canRead: false, canUpdate: false, canDelete: false },
      ]);

      const res = await request(app).get('/api/users/5/screens/permissions');
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.permissions)).toHaveLength(0);
    });
  });

  describe('PUT /api/users/:id/screens/permissions', () => {
    beforeEach(() => {
      mockUser.findUnique.mockResolvedValue({ id: 5, role: { name: 'STAFF' } });
    });

    it('should grant a screen with permissions', async () => {
      mockUserScreenAccess.deleteMany.mockResolvedValue({ count: 0 });
      mockUserScreenAccess.createMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .put('/api/users/5/screens/permissions')
        .send({
          screens: {
            members: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Granular permissions updated');
      expect(mockUserScreenAccess.deleteMany).toHaveBeenCalledWith({ where: { userId: 5 } });
      expect(mockUserScreenAccess.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 5, screenKey: 'members', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
        ],
      });
    });

    it('should revoke all screens by sending no active permissions', async () => {
      mockUserScreenAccess.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .put('/api/users/5/screens/permissions')
        .send({
          screens: {
            members: { canCreate: false, canRead: false, canUpdate: false, canDelete: false },
          },
        });

      expect(res.status).toBe(200);
      expect(mockUserScreenAccess.deleteMany).toHaveBeenCalled();
      expect(mockUserScreenAccess.createMany).not.toHaveBeenCalled();
    });

    it('should handle multiple screens with different permissions', async () => {
      mockUserScreenAccess.deleteMany.mockResolvedValue({ count: 0 });
      mockUserScreenAccess.createMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .put('/api/users/5/screens/permissions')
        .send({
          screens: {
            members: { canCreate: true, canRead: true, canUpdate: false, canDelete: false },
            inventory: { canCreate: false, canRead: true, canUpdate: true, canDelete: false },
            billing: { canCreate: false, canRead: false, canUpdate: false, canDelete: false }, // should be filtered out
          },
        });

      expect(res.status).toBe(200);
      expect(mockUserScreenAccess.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 5, screenKey: 'members', canCreate: true, canRead: true, canUpdate: false, canDelete: false },
          { userId: 5, screenKey: 'inventory', canCreate: false, canRead: true, canUpdate: true, canDelete: false },
        ],
      });
    });

    it('should not modify SUPER_ADMIN target', async () => {
      mockUser.findUnique.mockResolvedValueOnce({ id: 1, role: { name: 'SUPER_ADMIN' } });

      const res = await request(app)
        .put('/api/users/1/screens/permissions')
        .send({ screens: { members: { canCreate: true, canRead: true, canUpdate: false, canDelete: false } } });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Super admin has unrestricted access');
      expect(mockUserScreenAccess.deleteMany).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid request body', async () => {
      const res = await request(app)
        .put('/api/users/5/screens/permissions')
        .send({ screens: 'not-an-object' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/users/:id/screens', () => {
    it('should return filtered screen list', async () => {
      mockUserScreenAccess.findMany.mockResolvedValue([
        { screenKey: 'members', canCreate: false, canRead: true, canUpdate: true, canDelete: false },
      ]);

      const res = await request(app).get('/api/users/5/screens');
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].screenKey).toBe('members');
    });
  });

  describe('PUT /api/users/:id/screens (legacy)', () => {
    beforeEach(() => {
      mockUser.findUnique.mockResolvedValue({ id: 5, role: { name: 'STAFF' } });
    });

    it('should grant screens via legacy endpoint', async () => {
      mockUserScreenAccess.deleteMany.mockResolvedValue({ count: 0 });
      mockUserScreenAccess.createMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .put('/api/users/5/screens')
        .send({ screenKeys: ['members', 'billing'] });

      expect(res.status).toBe(200);
      expect(mockUserScreenAccess.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 5, screenKey: 'members' },
          { userId: 5, screenKey: 'billing' },
        ],
      });
    });

    it('should revoke all screens with empty array', async () => {
      mockUserScreenAccess.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .put('/api/users/5/screens')
        .send({ screenKeys: [] });

      expect(res.status).toBe(200);
      expect(mockUserScreenAccess.deleteMany).toHaveBeenCalled();
      expect(mockUserScreenAccess.createMany).not.toHaveBeenCalled();
    });
  });
});
