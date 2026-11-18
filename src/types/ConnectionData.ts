export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface ConnectionData {
    slippi: ConnectionState;
    obs: ConnectionState;
    startgg: ConnectionState;
}
