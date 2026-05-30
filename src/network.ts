import { Peer, DataConnection } from 'peerjs';
import { Participant, RaceOutcome } from './types';

export class PeerNetworkManager {
  peer: Peer | null = null;
  connections: Record<string, DataConnection> = {};
  role: 'host' | 'client' | null = null;
  myInfo: Participant;
  participants: Participant[] = [];
  
  // Callbacks for UI updates
  onParticipantsChange: (participants: Participant[]) => void = () => {};
  onGameStartReceived: (mapId: string, gameMode: string) => void = () => {};
  onOutcomeReceived: (outcome: RaceOutcome) => void = () => {};
  onConnectionStatus: (status: string) => void = () => {};
  onPeerError: (err: string) => void = () => {};

  constructor(playerName: string) {
    this.myInfo = {
      peerId: '',
      name: playerName || '플레이어',
      role: 'client',
      isReady: false,
      kartId: 'pink_thunder',
    };
  }

  // Initialize network
  init(role: 'host' | 'client', roomIdAttempt?: string) {
    try {
      this.role = role;
      
      // Destroy existing peer if any
      this.cleanup();

      // Configure PeerJS to connect to public free cloud server
      const peerId = role === 'host' && roomIdAttempt ? `kart-room-${roomIdAttempt}` : undefined;
      
      this.peer = new Peer(peerId || '', {
        debug: 1, // Minimize warning logs to avoid console bloat
      });

      this.peer.on('open', (id) => {
        this.myInfo.peerId = id;
        this.myInfo.role = role;
        
        if (role === 'host') {
          this.participants = [this.myInfo];
          this.onParticipantsChange([...this.participants]);
          this.onConnectionStatus(`방이 생성되었습니다! 코드: ${id.replace('kart-room-', '')}`);
        } else {
          this.onConnectionStatus(`서버에 접속되었습니다. 방에 연결을 탐색중...`);
          if (roomIdAttempt) {
            this.connectToHost(`kart-room-${roomIdAttempt}`);
          }
        }
      });

      this.peer.on('connection', (conn) => {
        if (this.role !== 'host') {
          conn.close();
          return;
        }
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS Error details:', err);
        let msg = '원인 불명의 오류가 발생했습니다.';
        if (err.type === 'peer-unavailable') {
          msg = '해당 참여 코드의 방을 찾을 수 없습니다. 올바른 방 번호인지 확인해주세요.';
        } else if (err.type === 'unavailable-id') {
          msg = '해당 방 번호가 이미 사용 중입니다. 다른 방 번호를 입력해주세요.';
        }
        this.onPeerError(msg);
      });

    } catch (e) {
      this.onPeerError('P2P 초기화 중 에러 발생: ' + String(e));
    }
  }

  // Client connects to Host
  connectToHost(hostPeerId: string) {
    if (!this.peer) return;
    
    const conn = this.peer.connect(hostPeerId);
    this.handleIncomingConnection(conn);
  }

  // Handle data-exchange for Host & Client connections
  handleIncomingConnection(conn: DataConnection) {
    const peerId = conn.peer;
    this.connections[peerId] = conn;

    conn.on('open', () => {
      this.onConnectionStatus(`연결 성공: ${peerId}`);
      
      if (this.role === 'client') {
        // Send our registration info to host
        this.sendToHost({
          type: 'register',
          payload: this.myInfo,
        });
      }
    });

    conn.on('data', (data: any) => {
      this.handleIncomingData(peerId, data);
    });

    conn.on('close', () => {
      this.handleDisconnect(peerId);
    });

    conn.on('error', () => {
      this.handleDisconnect(peerId);
    });
  }

  // Inbound messages dispatcher
  handleIncomingData(senderPeerId: string, msg: { type: string; payload: any }) {
    if (!msg || !msg.type) return;

    switch (msg.type) {
      case 'register':
        if (this.role === 'host') {
          // Add/Update participant
          const p: Participant = {
            ...msg.payload,
            peerId: senderPeerId,
            role: 'client',
          };
          
          this.participants = this.participants.filter(item => item.peerId !== senderPeerId);
          this.participants.push(p);
          this.broadcastParticipants();
        }
        break;

      case 'sync-participants':
        if (this.role === 'client') {
          this.participants = msg.payload;
          this.onParticipantsChange([...this.participants]);
        }
        break;

      case 'update-player-state':
        if (this.role === 'host') {
          this.participants = this.participants.map(p => {
            if (p.peerId === senderPeerId) {
              return { ...p, ...msg.payload };
            }
            return p;
          });
          this.broadcastParticipants();
        }
        break;

      case 'start-game':
        if (this.role === 'client') {
          this.onGameStartReceived(msg.payload.mapId, msg.payload.gameMode);
        }
        break;

      case 'race-telemetry':
        if (this.role === 'host') {
          this.participants = this.participants.map(p => {
            if (p.peerId === senderPeerId) {
              return { 
                ...p, 
                currentLap: msg.payload.currentLap, 
                currentSpeed: msg.payload.currentSpeed 
              };
            }
            return p;
          });
          this.onParticipantsChange([...this.participants]);
        }
        break;

      case 'submit-outcome':
        if (this.role === 'host') {
          const outcome: RaceOutcome = {
            ...msg.payload,
            peerId: senderPeerId,
          };
          
          this.participants = this.participants.map(p => {
            if (p.peerId === senderPeerId) {
              return { ...p, lastOutcome: outcome };
            }
            return p;
          });

          this.broadcastParticipants();
          this.onOutcomeReceived(outcome);
        }
        break;
    }
  }

  // Handle client or host disconnection
  handleDisconnect(peerId: string) {
    delete this.connections[peerId];
    if (this.role === 'host') {
      this.participants = this.participants.filter(p => p.peerId !== peerId);
      this.broadcastParticipants();
    } else {
      this.onConnectionStatus('방장과의 연결이 끊어졌습니다.');
    }
  }

  // Broadcast peer states to all clients (Host-only)
  broadcastParticipants() {
    this.broadcast({
      type: 'sync-participants',
      payload: this.participants,
    });
    this.onParticipantsChange([...this.participants]);
  }

  // Client updates identity / ready status
  updateMyStatus(props: Partial<Participant>) {
    this.myInfo = { ...this.myInfo, ...props };
    if (this.role === 'host') {
      this.participants = this.participants.map(p => {
        if (p.peerId === this.myInfo.peerId) {
          return { ...p, ...props };
        }
        return p;
      });
      this.broadcastParticipants();
    } else {
      this.sendToHost({
        type: 'update-player-state',
        payload: props,
      });
    }
  }

  // Tell all participants the race has started
  hostStartGame(mapId: string, gameMode: string) {
    if (this.role !== 'host') return;
    this.broadcast({
      type: 'start-game',
      payload: { mapId, gameMode },
    });
  }

  // Report final results of student clients to teacher host
  clientSubmitOutcome(outcome: Omit<RaceOutcome, 'peerId'>) {
    if (this.role !== 'client') return;
    this.sendToHost({
      type: 'submit-outcome',
      payload: outcome,
    });
  }

  // Client sends live telemetry during game active
  clientSendTelemetry(currentLap: number, currentSpeed: number) {
    if (this.role !== 'client') return;
    this.sendToHost({
      type: 'race-telemetry',
      payload: { currentLap, currentSpeed },
    });
  }

  // Send packet to Host
  private sendToHost(data: any) {
    const hostConn = Object.values(this.connections)[0];
    if (hostConn && hostConn.open) {
      hostConn.send(data);
    }
  }

  // Send packet to all clients
  private broadcast(data: any) {
    Object.values(this.connections).forEach(conn => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  // Full network termination
  cleanup() {
    Object.values(this.connections).forEach(c => c.close());
    this.connections = {};
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {}
      this.peer = null;
    }
    this.participants = [];
    this.role = null;
  }
}
