import type { RecentRoom } from '../types';

interface LiveblocksRoom {
  type: 'room';
  id: string;
  lastConnectionAt: string;
  metadata?: Record<string, string>;
}

interface LiveblocksRoomsResponse {
  data: LiveblocksRoom[];
  nextCursor?: string;
}

const LIVEBLOCKS_API_URL = 'https://api.liveblocks.io/v2';

async function fetchWithAuth (endpoint: string): Promise<Response> {
  const secretKey = import.meta.env.VITE_LIVEBLOCKS_SECRET_KEY;

  if (!secretKey) {
    throw new Error('VITE_LIVEBLOCKS_SECRET_KEY is not configured');
  }

  return fetch(`${LIVEBLOCKS_API_URL}${endpoint}`, {
    'headers': {
      'Authorization': `Bearer ${secretKey}`
    }
  });
}

export async function getRooms (limit: number = 20): Promise<RecentRoom[]> {
  try {
    const response = await fetchWithAuth(`/rooms?limit=${limit}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch rooms: ${response.status}`);
    }

    const data: LiveblocksRoomsResponse = await response.json();

    return data.data.map((room) => ({
      'id': room.id,
      'lastAccessed': room.lastConnectionAt ? new Date(room.lastConnectionAt).getTime() : Date.now()
    }));
  } catch (error) {
    console.error('Failed to fetch rooms from Liveblocks:', error);
    return [];
  }
}

export async function getRoom (roomId: string): Promise<RecentRoom | null> {
  try {
    const response = await fetchWithAuth(`/rooms/${roomId}`);

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch room: ${response.status}`);
    }

    const room: LiveblocksRoom = await response.json();

    return {
      'id': room.id,
      'lastAccessed': room.lastConnectionAt ? new Date(room.lastConnectionAt).getTime() : Date.now()
    };
  } catch (error) {
    console.error('Failed to fetch room from Liveblocks:', error);
    return null;
  }
}

export async function searchRooms (query: string, limit: number = 10): Promise<RecentRoom[]> {
  try {
    const response = await fetchWithAuth(`/rooms?limit=${limit}&query=${encodeURIComponent(`roomId:^'${query}'`)}`);

    if (!response.ok) {
      throw new Error(`Failed to search rooms: ${response.status}`);
    }

    const data: LiveblocksRoomsResponse = await response.json();

    return data.data.map((room) => ({
      'id': room.id,
      'lastAccessed': room.lastConnectionAt ? new Date(room.lastConnectionAt).getTime() : Date.now()
    }));
  } catch (error) {
    console.error('Failed to search rooms from Liveblocks:', error);
    return [];
  }
}
