// src/feathers.js
import { io } from 'socket.io-client';
import feathers from '@feathersjs/feathers';
import socketio from '@feathersjs/socketio-client';
import auth from '@feathersjs/authentication-client';

// Socket.io
const socket = io(
  import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production'
    ? 'https://svrapi.agglo.local'
    : 'http://localhost:3000'),
  {
    transports: ['websocket'],
    withCredentials: true,
  }
);

//  Feathers client
const feathersClient = feathers()
  .configure(socketio(socket))
  .configure(auth({ storage: window.localStorage }));

export { feathersClient };
