import { conversationCamera } from './conversation-camera.js';

// These desks face north: the south overview sees the workers' backs.
// Use the open aisle beside each chair, with no actor or furniture movement.
export function officeChatCamera(game, place) {
  conversationCamera(game, place, {
    mio: { yaw: -2.9, elev: 30, seated: true },
    emi: { yaw: 2.9, elev: 30, seated: true },
  });
}
