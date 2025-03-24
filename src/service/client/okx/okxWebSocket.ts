// 
import { conerr, conlog } from "@/utils/bchelper";
import { WebSocket, MessageEvent, ErrorEvent } from 'ws';

export class OkxSocketClient {
    private socket: WebSocket | null = null;
    private endpoint!: string;
    private onOpen!: () => void;
    private onMessage!: (event: MessageEvent) => Promise<void>;
    private onClose!: () => void;
    private onError!: (event: ErrorEvent) => void;
    // 最后调用时间
    private lastMessageTime: number = 0;
    // 心跳间隔ms
    private heatbeatInterval: number = 21000;
    // 心跳定时器
    private heartbeatTimer: any;

    constructor(endpoint: string, onOpen: () => void, onMessage: (event: MessageEvent) => Promise<void>, onClose: () => void, onError: (event: ErrorEvent) => void) {
        this.endpoint = endpoint;
        this.onOpen = onOpen;
        this.onMessage = onMessage;
        this.onClose = onClose;
        this.onError = onError;
    }

    public async connect(): Promise<void> {
        this.socket = new WebSocket(this.endpoint);

        this.socket.onopen = () => {
            this.lastMessageTime = Date.now();
            this.startHeartbeat();
            this.onOpen();
        };

        this.socket.onmessage = async (event: MessageEvent) => {
            this.lastMessageTime = Date.now();
            if (event.data === "pong") {
                // conlog(`received message pong , endpoint: ${this.endpoint}`);
                return;
            }
            await this.onMessage(event);
        };

        this.socket.onclose = () => {
            clearInterval(this.heartbeatTimer);
            this.onClose();
        };

        this.socket.onerror = (event: ErrorEvent) => {
            this.lastMessageTime = Date.now();
            this.onError(event);
        };
    }

    public async send(message: any) {
        if (this.socket?.readyState !== WebSocket.OPEN) {
            conerr(`websocket ${this.endpoint} is not open.`);
            return;
        }
        const msg = JSON.stringify(message);
        // conlog(`sending ${this.endpoint} message: ${msg}`)
        this.socket.send(msg);
    }

    public async close() {
        this.socket?.close();
    }

    // 心跳机制
    startHeartbeat = () => {
        this.heartbeatTimer = setInterval(() => {
            if (Date.now() - this.lastMessageTime > this.heatbeatInterval) {
                // conlog(`heartbeat timer triged, lastMessageTime: ${this.lastMessageTime}, endpoint: ${this.endpoint}`);
                this.socket?.send("ping");
            }
        }, this.heatbeatInterval / 3);
    }
}