import { useEffect, useRef, useState, useCallback } from 'react';
import type { GameState } from '@shared/schema';

interface WebSocketMessage {
  type: string;
  payload: any;
}

export function useWebSocket(gameId?: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const isManualCloseRef = useRef(false);
  const gameIdRef = useRef(gameId);

  // Update gameId ref when it changes
  useEffect(() => {
    gameIdRef.current = gameId;
  }, [gameId]);

  const connect = useCallback(() => {
    const currentGameId = gameIdRef.current;
    if (!currentGameId) return;
    
    // Prevent multiple connections
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    try {
      // Build WebSocket URL - use the same domain/protocol as the page
      // In Replit, this automatically routes to the correct backend
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const hostname = window.location.hostname;
      const port = window.location.port;
      
      // Construct URL properly - include port if it's not default HTTP/HTTPS
      let wsUrl: string;
      if (port && port !== '80' && port !== '443') {
        wsUrl = `${protocol}//${hostname}:${port}/ws`;
      } else {
        wsUrl = `${protocol}//${hostname}/ws`;
      }

      console.log('Connecting to WebSocket:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isManualCloseRef.current = false;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;
        
        // Only reconnect if it wasn't a manual close and we still have a gameId
        if (!isManualCloseRef.current && gameIdRef.current && reconnectAttemptsRef.current < 5) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (gameIdRef.current && !isManualCloseRef.current) {
              console.log(`Attempting to reconnect... (attempt ${reconnectAttemptsRef.current})`);
              connect();
            }
          }, delay);
        } else if (reconnectAttemptsRef.current >= 5) {
          console.error('Max reconnection attempts reached');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, []);

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected, unable to send:', type);
    }
  }, []);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true;
    reconnectAttemptsRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      
      if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setLastMessage(null);
  }, []);

  useEffect(() => {
    connect();

    return () => {
      // Cleanup on unmount or gameId change
      if (wsRef.current) {
        // Don't disconnect on dependency change, just let it reconnect if needed
      }
    };
  }, [gameId, connect]);

  return { isConnected, lastMessage, send, disconnect };
}

interface Player {
  userId: string;
  username: string;
}

export function useGameEvents(gameId: string, userId: string, username: string) {
  const { isConnected, lastMessage, send, disconnect } = useWebSocket(gameId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Join game when connected
  useEffect(() => {
    if (isConnected && gameId) {
      send('join_game', { gameId, userId, username });
      console.log('Sent join_game message');
    }
  }, [isConnected, gameId, userId, username, send]);

  const lastMessageRef = useRef<string>('');
  
  useEffect(() => {
    if (!lastMessage) return;
    
    // Prevent processing the same message twice
    const messageStr = JSON.stringify(lastMessage);
    if (lastMessageRef.current === messageStr) return;
    lastMessageRef.current = messageStr;

    const { type, payload } = lastMessage;

    switch (type) {
      case 'player_joined':
        setPlayers((prev) => {
          if (prev.some((p) => p.userId === payload.userId)) {
            return prev;
          }
          return [...prev, { userId: payload.userId, username: payload.username }];
        });
        break;

      case 'player_left':
        setPlayers((prev) => prev.filter((p) => p.userId !== payload.userId));
        break;

      case 'game_state':
      case 'game_started':
      case 'game_update':
        setGameState(payload);
        if (payload.players && Array.isArray(payload.players)) {
          setPlayers(payload.players.map((p: any) => ({ userId: p.id, username: p.username })));
        }
        break;

      case 'chat_message':
        setChatMessages((prev) => [...prev, payload]);
        break;
    }
  }, [lastMessage]);

  const sendChatMessage = useCallback((message: string) => {
    send('chat_message', { gameId, userId, username, message });
  }, [send, gameId, userId, username]);

  const attack = useCallback((playerId: string, card: any) => {
    send('attack', { gameId, playerId, card });
  }, [send, gameId]);

  const defend = useCallback((playerId: string, card: any, tableCardIndex: number) => {
    send('defend', { gameId, playerId, card, tableCardIndex });
  }, [send, gameId]);

  const take = useCallback((playerId: string) => {
    send('take', { gameId, playerId });
  }, [send, gameId]);

  const beat = useCallback((playerId: string) => {
    send('beat', { gameId, playerId });
  }, [send, gameId]);

  return {
    isConnected,
    gameState,
    players,
    chatMessages,
    sendChatMessage,
    attack,
    defend,
    take,
    beat,
    disconnect,
  };
}
