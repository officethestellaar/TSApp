import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: Server;

export const initIO = (server: HttpServer) => {
  io = new Server(server, {
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
    socket.on('register_node', (data: { userId: number, role: string, affiliateId?: number }) => {
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

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export const emitEvent = (event: string, data: any, target?: { userId?: number, role?: string, affiliateId?: number }) => {
  if (!io) return;

  if (target) {
    if (target.userId) {
      io.to(`user_${target.userId}`).emit(event, data);
    } else if (target.affiliateId) {
      io.to(`affiliate_${target.affiliateId}`).emit(event, data);
    } else if (target.role) {
      io.to(`role_${target.role}`).emit(event, data);
    }
  } else {
    // Broadcast to all
    io.emit(event, data);
  }
};
