"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const auth_1 = require("../middleware/auth");
const socket_1 = require("../lib/socket");
const router = express_1.default.Router();
const SUPERVISOR_ROLES = ['SUPER_ADMIN', 'ADMIN', 'CLUB_MANAGER', 'OPERATIONS_MANAGER', 'HOUSEKEEPING_SUPERVISOR'];
// ─── TASK MASTER ───────────────────────────────────────────────
router.get('/tasks', auth_1.authenticateToken, async (req, res) => {
    try {
        const { category, isDeepClean } = req.query;
        const where = {};
        if (category)
            where.category = category;
        if (isDeepClean !== undefined)
            where.isDeepClean = isDeepClean === 'true';
        const tasks = await prisma_1.default.housekeepingTask.findMany({ where, orderBy: { name: 'asc' } });
        res.json(tasks);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/tasks', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { name, category, description, floor, isPeriodic, frequencyDays, isDeepClean } = req.body;
        if (!name)
            return res.status(400).json({ message: 'Name is required' });
        const task = await prisma_1.default.housekeepingTask.create({
            data: { name, category, description, floor, isPeriodic, frequencyDays, isDeepClean },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'TASK_CREATED', task });
        res.status(201).json(task);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/tasks/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { name, category, description, floor, isPeriodic, frequencyDays, isDeepClean, isActive } = req.body;
        const task = await prisma_1.default.housekeepingTask.update({
            where: { id: Number(req.params.id) },
            data: { name, category, description, floor, isPeriodic, frequencyDays, isDeepClean, isActive },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'TASK_UPDATED', task });
        res.json(task);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/tasks/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.housekeepingTaskInstance.updateMany({ where: { taskId: Number(req.params.id) }, data: { taskId: 0 } });
        await prisma_1.default.housekeepingTask.delete({ where: { id: Number(req.params.id) } });
        (0, socket_1.emitEvent)('housekeeping', { action: 'TASK_DELETED', id: Number(req.params.id) });
        res.json({ message: 'Task deleted' });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── ALLOCATIONS ──────────────────────────────────────────────
router.get('/allocations', auth_1.authenticateToken, async (req, res) => {
    try {
        const { date, employeeId, floor } = req.query;
        const where = {};
        if (date) {
            const d = new Date(date);
            where.date = { gte: new Date(d.setHours(0, 0, 0, 0)), lte: new Date(d.setHours(23, 59, 59, 999)) };
        }
        if (employeeId)
            where.employeeId = Number(employeeId);
        if (floor)
            where.floor = floor;
        if (req.user.role === 'HOUSEKEEPING_EXECUTIVE') {
            where.employeeId = req.user.userId;
        }
        const allocations = await prisma_1.default.housekeepingAllocation.findMany({
            where,
            include: { employee: { select: { id: true, name: true } }, instances: { include: { task: true } } },
            orderBy: { date: 'desc' },
        });
        res.json(allocations);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/allocations', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { employeeId, floor, area, shift, date, startTime, endTime, taskIds, specification } = req.body;
        if (!employeeId || !floor || !area || !date) {
            return res.status(400).json({ message: 'employeeId, floor, area, and date are required' });
        }
        const allocation = await prisma_1.default.housekeepingAllocation.create({
            data: {
                employeeId: Number(employeeId),
                floor,
                area,
                shift: shift || 'MORNING',
                date: new Date(date),
                startTime,
                endTime,
                specification: specification || null,
            },
        });
        if (taskIds && taskIds.length > 0) {
            const tasks = await prisma_1.default.housekeepingTask.findMany({ where: { id: { in: taskIds.map(Number) } } });
            await prisma_1.default.housekeepingTaskInstance.createMany({
                data: tasks.map(t => ({
                    allocationId: allocation.id,
                    taskId: t.id,
                    employeeId: Number(employeeId),
                    floor,
                    area,
                    priority: t.category,
                })),
            });
        }
        const full = await prisma_1.default.housekeepingAllocation.findUnique({
            where: { id: allocation.id },
            include: { employee: { select: { id: true, name: true } }, instances: { include: { task: true } } },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'ALLOCATION_CREATED', allocation: full });
        res.status(201).json(full);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/allocations/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { floor, area, shift, startTime, endTime } = req.body;
        const allocation = await prisma_1.default.housekeepingAllocation.update({
            where: { id: Number(req.params.id) },
            data: { floor, area, shift, startTime, endTime },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'ALLOCATION_UPDATED', allocation });
        res.json(allocation);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.delete('/allocations/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        await prisma_1.default.housekeepingTaskInstance.deleteMany({ where: { allocationId: Number(req.params.id) } });
        await prisma_1.default.housekeepingAllocation.delete({ where: { id: Number(req.params.id) } });
        (0, socket_1.emitEvent)('housekeeping', { action: 'ALLOCATION_DELETED', id: Number(req.params.id) });
        res.json({ message: 'Allocation deleted' });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── TASK INSTANCES ───────────────────────────────────────────
router.get('/instances/my', auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'HOUSEKEEPING_EXECUTIVE') {
            return res.status(403).json({ message: 'Only housekeeping executives can view their tasks' });
        }
        const instances = await prisma_1.default.housekeepingTaskInstance.findMany({
            where: { employeeId: req.user.userId },
            include: { task: true, allocation: true },
            orderBy: [{ priority: 'asc' }, { assignedAt: 'desc' }],
        });
        res.json(instances);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/instances/:id/start', auth_1.authenticateToken, async (req, res) => {
    try {
        const instance = await prisma_1.default.housekeepingTaskInstance.findUnique({ where: { id: Number(req.params.id) } });
        if (!instance)
            return res.status(404).json({ message: 'Task instance not found' });
        if (instance.employeeId !== req.user.userId)
            return res.status(403).json({ message: 'Unauthorized' });
        if (instance.status !== 'PENDING')
            return res.status(400).json({ message: 'Task already started or completed' });
        const updated = await prisma_1.default.housekeepingTaskInstance.update({
            where: { id: Number(req.params.id) },
            data: { status: 'IN_PROGRESS', startedAt: new Date() },
            include: { task: true },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'INSTANCE_STARTED', instance: updated });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/instances/:id/complete', auth_1.authenticateToken, async (req, res) => {
    try {
        const { remarks, photoUrl } = req.body;
        const instance = await prisma_1.default.housekeepingTaskInstance.findUnique({ where: { id: Number(req.params.id) } });
        if (!instance)
            return res.status(404).json({ message: 'Task instance not found' });
        if (instance.employeeId !== req.user.userId)
            return res.status(403).json({ message: 'Unauthorized' });
        if (instance.status === 'COMPLETED')
            return res.status(400).json({ message: 'Task already completed' });
        const updated = await prisma_1.default.housekeepingTaskInstance.update({
            where: { id: Number(req.params.id) },
            data: { status: 'COMPLETED', completedAt: new Date(), remarks, photoUrl },
            include: { task: true },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'INSTANCE_COMPLETED', instance: updated });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.get('/instances', auth_1.authenticateToken, async (req, res) => {
    try {
        const { status, employeeId, floor, date } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (employeeId)
            where.employeeId = Number(employeeId);
        if (floor)
            where.floor = floor;
        if (date) {
            const d = new Date(date);
            const start = new Date(d.setHours(0, 0, 0, 0));
            const end = new Date(d.setHours(23, 59, 59, 999));
            where.assignedAt = { gte: start, lte: end };
        }
        if (req.user.role === 'HOUSEKEEPING_EXECUTIVE') {
            where.employeeId = req.user.userId;
        }
        const instances = await prisma_1.default.housekeepingTaskInstance.findMany({
            where,
            include: { task: true, allocation: true, employee: { select: { id: true, name: true } } },
            orderBy: [{ priority: 'asc' }, { assignedAt: 'desc' }],
        });
        res.json(instances);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/instances/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { status, remarks, photoUrl } = req.body;
        const instance = await prisma_1.default.housekeepingTaskInstance.findUnique({ where: { id: Number(req.params.id) } });
        if (!instance)
            return res.status(404).json({ message: 'Task instance not found' });
        if (req.user.role === 'HOUSEKEEPING_EXECUTIVE' && instance.employeeId !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        const data = {};
        if (status)
            data.status = status;
        if (remarks)
            data.remarks = remarks;
        if (photoUrl)
            data.photoUrl = photoUrl;
        if (status === 'IN_PROGRESS')
            data.startedAt = new Date();
        if (status === 'COMPLETED')
            data.completedAt = new Date();
        const updated = await prisma_1.default.housekeepingTaskInstance.update({
            where: { id: Number(req.params.id) },
            data,
            include: { task: true },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'INSTANCE_UPDATED', instance: updated });
        res.json(updated);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── DEEP CLEANING ────────────────────────────────────────────
router.get('/deep-cleaning', auth_1.authenticateToken, async (req, res) => {
    try {
        const records = await prisma_1.default.housekeepingDeepCleaning.findMany({ orderBy: { date: 'desc' } });
        res.json(records);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.post('/deep-cleaning', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { floor, date, startTime, endTime, assignedTo } = req.body;
        if (!floor || !date)
            return res.status(400).json({ message: 'Floor and date are required' });
        const record = await prisma_1.default.housekeepingDeepCleaning.create({
            data: { floor, date: new Date(date), startTime, endTime, assignedTo: assignedTo ? JSON.stringify(assignedTo) : null },
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'DEEP_CLEANING_CREATED', record });
        res.status(201).json(record);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
router.patch('/deep-cleaning/:id', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const { startTime, endTime, status, assignedTo, photos } = req.body;
        const data = {};
        if (startTime)
            data.startTime = startTime;
        if (endTime)
            data.endTime = endTime;
        if (status)
            data.status = status;
        if (assignedTo)
            data.assignedTo = JSON.stringify(assignedTo);
        if (photos)
            data.photos = JSON.stringify(photos);
        const record = await prisma_1.default.housekeepingDeepCleaning.update({
            where: { id: Number(req.params.id) },
            data,
        });
        (0, socket_1.emitEvent)('housekeeping', { action: 'DEEP_CLEANING_UPDATED', record });
        res.json(record);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── DASHBOARD ────────────────────────────────────────────────
router.get('/dashboard', auth_1.authenticateToken, async (req, res) => {
    try {
        const where = {};
        if (req.user.role === 'HOUSEKEEPING_EXECUTIVE') {
            where.employeeId = req.user.userId;
        }
        const total = await prisma_1.default.housekeepingTaskInstance.count({ where });
        const completed = await prisma_1.default.housekeepingTaskInstance.count({ where: { ...where, status: 'COMPLETED' } });
        const inProgress = await prisma_1.default.housekeepingTaskInstance.count({ where: { ...where, status: 'IN_PROGRESS' } });
        const pending = await prisma_1.default.housekeepingTaskInstance.count({ where: { ...where, status: 'PENDING' } });
        const overdue = await prisma_1.default.housekeepingTaskInstance.count({ where: { ...where, status: 'OVERDUE' } });
        const deepCleaningCount = await prisma_1.default.housekeepingDeepCleaning.count();
        const floorCompletion = await prisma_1.default.housekeepingTaskInstance.groupBy({
            by: ['floor'],
            _count: { id: true },
            where: { ...where },
        });
        const completionByFloor = await Promise.all(floorCompletion.map(async (f) => {
            const done = await prisma_1.default.housekeepingTaskInstance.count({
                where: { ...where, floor: f.floor, status: 'COMPLETED' },
            });
            return { floor: f.floor, total: f._count.id, completed: done };
        }));
        const employeeStats = await prisma_1.default.housekeepingTaskInstance.groupBy({
            by: ['employeeId'],
            _count: { id: true },
            where: { ...where },
        });
        const employeeCompletion = await Promise.all(employeeStats.map(async (e) => {
            const done = await prisma_1.default.housekeepingTaskInstance.count({
                where: { ...where, employeeId: e.employeeId, status: 'COMPLETED' },
            });
            const emp = await prisma_1.default.user.findUnique({ where: { id: e.employeeId }, select: { name: true } });
            return { employeeId: e.employeeId, name: emp?.name || 'Unknown', total: e._count.id, completed: done };
        }));
        const kpi = total > 0 ? Math.round((completed / total) * 100) : 0;
        res.json({
            total, completed, inProgress, pending, overdue, deepCleaningCount,
            floorCompletion: completionByFloor,
            employeePerformance: employeeCompletion,
            kpi,
        });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── OVERDUE ──────────────────────────────────────────────────
router.get('/overdue', auth_1.authenticateToken, async (req, res) => {
    try {
        const where = { status: { in: ['PENDING', 'IN_PROGRESS'] } };
        if (req.user.role === 'HOUSEKEEPING_EXECUTIVE') {
            where.employeeId = req.user.userId;
        }
        const now = new Date();
        const instances = await prisma_1.default.housekeepingTaskInstance.findMany({
            where,
            include: { task: true, employee: { select: { id: true, name: true } } },
            orderBy: [{ priority: 'asc' }, { assignedAt: 'asc' }],
        });
        const overdueList = instances
            .filter(i => {
            if (!i.dueTime)
                return false;
            const [h, m] = i.dueTime.split(':').map(Number);
            const due = new Date(i.assignedAt);
            due.setHours(h, m, 0, 0);
            return now > due;
        })
            .map(i => ({
            id: i.id,
            task: i.task.name,
            floor: i.floor,
            area: i.area,
            assignedTo: i.employee.name,
            dueTime: i.dueTime,
            priority: i.priority,
            overdueBy: Math.round((now.getTime() - new Date(i.assignedAt).getTime()) / 60000) + ' min',
        }));
        res.json(overdueList);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── EMPLOYEES ────────────────────────────────────────────────
router.get('/employees', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        const employees = await prisma_1.default.user.findMany({
            where: { role: { name: 'HOUSEKEEPING_EXECUTIVE' } },
            select: { id: true, name: true, email: true, status: true },
            orderBy: { name: 'asc' },
        });
        res.json(employees);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── FLOOR TEMPLATES ──────────────────────────────────────────
router.get('/floor-templates', auth_1.authenticateToken, async (req, res) => {
    try {
        const { floor } = req.query;
        const where = {};
        if (floor)
            where.floor = floor;
        const templates = await prisma_1.default.housekeepingFloorTemplate.findMany({ where, orderBy: [{ floor: 'asc' }, { area: 'asc' }] });
        res.json(templates);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── ALLOCATE FROM TEMPLATE ───────────────────────────────────
router.post('/allocations/from-template', auth_1.authenticateToken, (0, auth_1.authorizeRoles)(...SUPERVISOR_ROLES), async (req, res) => {
    try {
        let { employeeId, floors, floor, shift, date, startTime, endTime, specification, templateIds } = req.body;
        // Accept single floor (legacy) or array of floors
        if (!floors)
            floors = floor ? [floor] : [];
        if (!employeeId || floors.length === 0 || !date)
            return res.status(400).json({ message: 'employeeId, floors, and date are required' });
        let templates;
        if (templateIds && Array.isArray(templateIds) && templateIds.length > 0) {
            templates = await prisma_1.default.housekeepingFloorTemplate.findMany({ where: { id: { in: templateIds.map(Number) } } });
        }
        else {
            templates = await prisma_1.default.housekeepingFloorTemplate.findMany({ where: { floor: { in: floors } } });
        }
        if (templates.length === 0)
            return res.status(400).json({ message: 'No templates found' });
        const allocations = [];
        for (const tmpl of templates) {
            const allocation = await prisma_1.default.housekeepingAllocation.create({
                data: {
                    employeeId: Number(employeeId),
                    floor: tmpl.floor,
                    area: tmpl.area,
                    shift: shift || 'MORNING',
                    date: new Date(date),
                    startTime,
                    endTime,
                    specification: specification || null,
                },
            });
            const taskNames = JSON.parse(tmpl.tasks);
            const tasks = await prisma_1.default.housekeepingTask.findMany({
                where: { name: { in: taskNames } },
            });
            if (tasks.length > 0) {
                await prisma_1.default.housekeepingTaskInstance.createMany({
                    data: tasks.map(t => ({
                        allocationId: allocation.id,
                        taskId: t.id,
                        employeeId: Number(employeeId),
                        floor: tmpl.floor,
                        area: tmpl.area,
                        priority: t.category,
                    })),
                });
            }
            const full = await prisma_1.default.housekeepingAllocation.findUnique({
                where: { id: allocation.id },
                include: { employee: { select: { id: true, name: true } }, instances: { include: { task: true } } },
            });
            allocations.push(full);
        }
        (0, socket_1.emitEvent)('housekeeping', { action: 'BULK_ALLOCATION', count: allocations.length, floors });
        res.status(201).json(allocations);
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ─── SEED ─────────────────────────────────────────────────────
router.post('/seed', auth_1.authenticateToken, (0, auth_1.authorizeRoles)('SUPER_ADMIN'), async (req, res) => {
    try {
        const { seedHousekeeping } = require('../seed/housekeeping');
        const result = await seedHousekeeping();
        res.json({ message: 'Housekeeping data seeded', result });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
// ─── REPORTS ──────────────────────────────────────────────────
router.get('/reports', auth_1.authenticateToken, async (req, res) => {
    try {
        const { type, startDate, endDate, employeeId } = req.query;
        const where = {};
        if (startDate)
            where.assignedAt = { ...where.assignedAt, gte: new Date(startDate) };
        if (endDate)
            where.assignedAt = { ...where.assignedAt, lte: new Date(endDate) };
        if (employeeId)
            where.employeeId = Number(employeeId);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        if (type === 'daily') {
            where.assignedAt = { gte: today, lte: todayEnd };
        }
        const instances = await prisma_1.default.housekeepingTaskInstance.findMany({
            where,
            include: { task: true, employee: { select: { id: true, name: true } } },
            orderBy: { assignedAt: 'desc' },
        });
        const total = instances.length;
        const completed = instances.filter(i => i.status === 'COMPLETED').length;
        const pending = instances.filter(i => i.status === 'PENDING').length;
        const inProgress = instances.filter(i => i.status === 'IN_PROGRESS').length;
        const overdue = instances.filter(i => i.status === 'OVERDUE').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        // Employee performance
        const empMap = new Map();
        for (const inst of instances) {
            const eid = inst.employeeId;
            if (!empMap.has(eid)) {
                empMap.set(eid, { name: inst.employee.name, total: 0, completed: 0, missed: 0 });
            }
            const e = empMap.get(eid);
            e.total++;
            if (inst.status === 'COMPLETED')
                e.completed++;
            if (inst.status === 'OVERDUE')
                e.missed++;
        }
        // Floor report
        const floorMap = new Map();
        for (const inst of instances) {
            if (!floorMap.has(inst.floor))
                floorMap.set(inst.floor, { total: 0, completed: 0 });
            const f = floorMap.get(inst.floor);
            f.total++;
            if (inst.status === 'COMPLETED')
                f.completed++;
        }
        res.json({
            summary: { total, completed, pending, inProgress, overdue, completionRate },
            instances,
            employeePerformance: Array.from(empMap.entries()).map(([id, data]) => ({ employeeId: id, ...data, completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 })),
            floorReport: Array.from(floorMap.entries()).map(([floor, data]) => ({ floor, ...data, completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0 })),
        });
    }
    catch {
        res.status(500).json({ message: 'Internal server error' });
    }
});
exports.default = router;
