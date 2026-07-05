"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitEvent = exports.getIO = exports.initIO = void 0;
const socket_io_1 = require("socket.io");
let io;
const initIO = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL
                ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
                : '*',
            methods: ['GET', 'POST'],
        },
    });
    io.on('connection', (socket) => {
        console.log('Real-time connection established:', socket.id);
        // Join specialized rooms for targeted notifications
        socket.on('register_node', (data) => {
            if (data.userId) {
                const userRoom = `user_${data.userId}`;
                socket.join(userRoom);
                console.log(`[Socket] Registered User Node: ${userRoom}`);
            }
            if (data.affiliateId) {
                const affiliateRoom = `affiliate_${data.affiliateId}`;
                socket.join(affiliateRoom);
                console.log(`[Socket] Registered Affiliate Node: ${affiliateRoom}`);
            }
            if (data.role) {
                socket.join(`role_${data.role}`);
                console.log(`[Socket] Registered Role Node: role_${data.role}`);
            }
        });
        socket.on('disconnect', () => {
            console.log('Real-time connection terminated:', socket.id);
        });
    });
    return io;
};
exports.initIO = initIO;
const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};
exports.getIO = getIO;
const emitEvent = (event, data, target) => {
    if (!io)
        return;
    if (target) {
        if (target.userId) {
            io.to(`user_${target.userId}`).emit(event, data);
        }
        else if (target.affiliateId) {
            io.to(`affiliate_${target.affiliateId}`).emit(event, data);
        }
        else if (target.role) {
            io.to(`role_${target.role}`).emit(event, data);
        }
    }
    else {
        // Broadcast to all
        io.emit(event, data);
    }
};
exports.emitEvent = emitEvent;
