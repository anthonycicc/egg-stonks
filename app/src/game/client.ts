import {GameState} from 'stonks/game/state';

import { nanoid } from 'nanoid';

export interface EventHandlers {
  OnConnect?: () => void;
  StateUpdate?: (state: GameState) => void;
  PlayerUpdate?: (playerID: string) => void;
  OnClose?: () => void;
  OnError?: (error: ErrorMsg) => void;
}
type SocketEnvelope = StateUpdate | WhoamiUpdate | ErrorUpdate | UnknownUpdate;

export interface ErrorMsg {
  ID: string;
  Message: string;
}

interface UnknownUpdate {
  ts: string;
  type: string;
  payload: never;
}

interface StateUpdate {
  ts: string;
  type: "state";
  payload: GameState;
}

interface WhoamiUpdate {
  ts: string;
  type: "whoami";
  payload: string;
}

interface ErrorUpdate {
  ts: string;
  type: "error";
  payload: string;
}

export class SocketClient {
  socket: WebSocket
  gameID: string
  clientID: string
  delegate: EventHandlers


  constructor(id: string, clientID: string, handler: EventHandlers) {
    this.delegate = handler;
    this.clientID = clientID;

    let a = new URL(document.URL);
    a.protocol = "ws";
    a.pathname = `/game/${id}/join`;

    this.socket = new WebSocket(a.toString());
    // Right now redirect all websocket failures to landing
    this.socket.addEventListener('open', (event) => { this.onOpen(event); })
    this.socket.addEventListener('error', (event) => { this.onError(event); })
    this.socket.addEventListener('message', (event) => { this.onMessage(event); })
    this.socket.addEventListener('close', (event) => { this.onClose(event); })
  }

  onOpen(event: Event) {
    console.log("Socket onopen", event)
    this.delegate.OnConnect();
  }

  onMessage(event: MessageEvent) {
    console.log("Socket onmessage", event);
    let update: SocketEnvelope = JSON.parse(event.data);
    switch (update.type) {
      case "state":
        this.delegate.StateUpdate(update.payload as GameState);
        break;
      case "whoami":
        this.delegate.PlayerUpdate(update.payload as string);
        break;
      case "error":
        const err = {
          ID: nanoid(),
          Message: update.payload,
        }
        this.delegate.OnError(err);
        break;
      default:
        console.error("Unknown socket event type:", update.type)
    }
  }

  onError(event: Event) {
    console.log("Socket error", event);
    this.delegate.OnError({
      ID: "404",
      Message: "Socket error, refresh?",
    })
  }

  onClose(event: CloseEvent) {
    console.log("Socket closed", event);
    this.delegate.OnClose()
  }

  Send(action: string, payload: any) {
    const envelope = {
      action,
      payload,
    }
    this.socket.send(JSON.stringify(envelope))
  }

  Close() {
    console.log("Closing socket")
    this.socket.close();
  }

  JoinGame(name: string) {
    this.Send("join", {
      client_id: this.clientID,
      name: name,
    })
  }

  StartGame() {
    this.Send("start", {})
  }

  BuyStonk(stonk: string, quantity: number) {
    this.Send("transact", {
      stonk,
      quantity,
    })
  }

  SellStonk(stonk: string, quantity: number) {
    this.Send("transact", {
      stonk,
      quantity: -quantity,
    })
  }

  FinishBuy() {
    this.Send("hodl", {})
  }

  RevealRoll(mask: boolean[]) {
    this.Send("reveal-roll", mask)
  }

  ApplyRoll() {
    this.Send("apply-roll", {})
  }
}
