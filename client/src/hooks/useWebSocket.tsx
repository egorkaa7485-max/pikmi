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

    // Build WebSocket URL using current window location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      isManualCloseRef.current = false;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Always update - the useEffect will handle deduplication
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
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Exponential backoff, max 10s
          
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
        // Don't reload page on error, just log it
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
    }
  }, []); // Empty deps - use refs for gameId

  const send = useCallback((type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  }, []);

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true; // Mark as manual close to prevent reconnection
    reconnectAttemptsRef.current = 0;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (wsRef.current) {
      // Remove all event listeners to prevent reconnection
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
    if (!gameId) {
      disconnect();
      return;
    }
    
    // Small delay to ensure cleanup from previous gameId completes
    const timeoutId = setTimeout(() => {
      connect();
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]); // Only depend on gameId, connect/disconnect are stable

  return {
    isConnected,
    lastMessage,
    send,
    disconnect
  };
}

export function useGameEvents(gameId: string, userId: string, username: string) {
  const { isConnected, lastMessage, send } = useWebSocket(gameId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [players, setPlayers] = useState<Array<{ userId: string; username: string }>>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ userId: string; username: string; message: string }>>([]);

  const hasJoinedRef = useRef(false);
  
  useEffect(() => {
    if (isConnected && gameId && userId && !hasJoinedRef.current) {
      hasJoinedRef.current = true;
      send('join_game', { gameId, userId, username });
    }
    
    // Reset join flag when gameId or userId changes
    return () => {
      hasJoinedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, gameId, userId]);

  const lastMessageRef = useRef<string>('');
  
  useEffect(() => {
    if (!lastMessage) return;
    
    // Prevent processing the same message twice by comparing stringified versions
    const messageStr = JSON.stringify(lastMessage);
    if (lastMessageRef.current === messageStr) return;
    lastMessageRef.current = messageStr;

    const { type, payload } = lastMessage;

    switch (type) {
      case 'player_joined':
        setPlayers((prev) => {
          // Avoid duplicates
          if (prev.some(p => p.userId === payload.userId)) {
            return prev;
          }
          return [...prev, { userId: payload.userId, username: payload.username }];
        });
        break;

      case 'player_left':
        setPlayers((prev) => prev.filter((p) => p.userId !== payload.userId));
        break;

      case 'game_started':
        setGameState(payload);
        // Update players from game state
        if (payload.players && Array.isArray(payload.players)) {
          setPlayers(payload.players.map(p => ({ userId: p.id, username: p.username })));
        }
        break;

      case 'game_update':
        setGameState(payload);
        // Update players from game state
        if (payload.players && Array.isArray(payload.players)) {
          setPlayers(payload.players.map(p => ({ userId: p.id, username: p.username })));
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
    beat
  };
}