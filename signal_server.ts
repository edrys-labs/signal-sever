// signal_server_broadcast.ts

import { serve } from 'https://deno.land/std@0.196.0/http/server.ts'

// Global map to store BroadcastChannels per room
const broadcastChannels: Map<string, BroadcastChannel> = new Map()

serve((req) => {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || 'default'

  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Yjs WebRTC Signaling Server with BroadcastChannel', {
      status: 200,
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  // Retrieve or create a BroadcastChannel for the room
  let broadcast = broadcastChannels.get(room)
  if (!broadcast) {
    broadcast = new BroadcastChannel(`room_${room}`)
    broadcastChannels.set(room, broadcast)
  }

  // Handler for incoming WebSocket messages
  socket.onmessage = (event) => {
    // Broadcast the message to all other clients in the room
    broadcast.postMessage(event.data)
  }

  // Handler for messages from the BroadcastChannel
  const onBroadcastMessage = (event: MessageEvent) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(event.data)
    }
  }

  // Listen to the BroadcastChannel
  broadcast.addEventListener('message', onBroadcastMessage)

  // Cleanup when the WebSocket is closed
  socket.onclose = () => {
    broadcast?.removeEventListener('message', onBroadcastMessage)
    // Optionally remove the BroadcastChannel if no clients are connected
    // This requires tracking the number of clients per room
  }

  // Handle WebSocket errors
  socket.onerror = (err) => {
    console.error('WebSocket error:', err)
    socket.close()
    broadcast?.removeEventListener('message', onBroadcastMessage)
  }

  return response
})
