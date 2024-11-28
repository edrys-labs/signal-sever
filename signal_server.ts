// signal_server_broadcast.ts

import { serve } from 'https://deno.land/std@0.196.0/http/server.ts'

serve((req) => {
  const { searchParams } = new URL(req.url)
  const room = searchParams.get('room') || 'default'

  if (req.headers.get('upgrade') !== 'websocket') {
    return new Response('Yjs WebRTC Signaling Server with BroadcastChannel', {
      status: 200,
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)

  // Create a unique channel name for each room
  const channelName = `room_${room}`
  const broadcast = new BroadcastChannel(channelName)

  socket.onmessage = (event) => {
    // Broadcast the message to other instances
    broadcast.postMessage({
      data: event.data,
    })
  }

  // Listen for messages from other instances
  broadcast.onmessage = (event) => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(event.data.data)
    }
  }

  socket.onclose = () => {
    broadcast.close()
  }

  socket.onerror = (err) => {
    console.error('WebSocket error:', err)
    socket.close()
    broadcast.close()
  }

  return response
})
