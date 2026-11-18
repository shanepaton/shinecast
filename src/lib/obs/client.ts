import type { ConnectionState } from "../../types/ConnectionData";
import type { ObsData } from "../../types/ObsData";

// Talks to OBS's built-in WebSocket server (OBS 28 and later, protocol version 5). OBS says hello, and if it has a
// password it includes a challenge. The client answers by identifying itself with a hash of the password and challenge.
// After that it can send requests, which OBS answers with a response carrying the same id.

type Report = (state: ConnectionState, error?: string) => void;
interface Pending {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timer: ReturnType<typeof setTimeout>;
}

// The kinds of message in the protocol.
const HELLO = 0;
const IDENTIFY = 1;
const IDENTIFIED = 2;
const REQUEST = 6;
const RESPONSE = 7;

const TIMEOUT = 8000; // how long to wait for OBS before giving up
const AUTH_FAILED = 4009; // the close code OBS uses for a wrong password

let socket: WebSocket | undefined; // the connection being made or held
let ready: WebSocket | undefined; // that connection once OBS has accepted us, which is when requests can be made
const pending = new Map<string, Pending>();

const sha256 = (text: string) => crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
const base64 = (bytes: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(bytes)));

async function authenticate(password: string, { challenge, salt }: { challenge: string; salt: string }) {
    const secret = base64(await sha256(password + salt));
    return base64(await sha256(secret + challenge));
}

// Finishes a request: with the data OBS sent back, or with an error.
function settle(id: string, outcome: { data: unknown } | { error: Error }) {
    const request = pending.get(id);
    if (!request) return;
    pending.delete(id);
    clearTimeout(request.timer);
    if ("error" in outcome) request.reject(outcome.error);
    else request.resolve(outcome.data);
}

export function connectObs({ ip, port, password }: ObsData, report: Report) {
    disconnectObs();
    report("connecting");

    let ws: WebSocket;
    try {
        ws = new WebSocket(`ws://${ip.trim()}:${port}`, "obswebsocket.json");
    } catch {
        return report("error", "Enter OBS's IP address and port");
    }
    socket = ws;

    let identified = false;
    const giveUp = setTimeout(() => ws.close(), TIMEOUT);

    ws.onmessage = async ({ data }) => {
        const { op, d } = JSON.parse(data);
        if (op === HELLO) {
            const authentication = d.authentication && { authentication: await authenticate(password, d.authentication) };
            ws.send(JSON.stringify({ op: IDENTIFY, d: { rpcVersion: 1, ...authentication } }));
        } else if (op === IDENTIFIED) {
            identified = true;
            ready = ws;
            clearTimeout(giveUp);
            report("connected");
        } else if (op === RESPONSE) {
            const { requestId, requestStatus, responseData } = d;
            const refused = new Error(requestStatus.comment ?? "OBS refused the request");
            settle(requestId, requestStatus.result ? { data: responseData } : { error: refused });
        }
    };

    // An error is always followed by a close, and the close is what reports it.
    ws.onclose = ({ code }) => {
        clearTimeout(giveUp);
        if (ready === ws) ready = undefined;
        for (const id of [...pending.keys()]) settle(id, { error: new Error("OBS disconnected") });
        if (socket !== ws) return; // closed on purpose, or replaced by a newer connection

        socket = undefined;
        if (identified) return report("disconnected");
        const unreachable = "Couldn't reach OBS. Check the address and port, and that its WebSocket server is on.";
        report("error", code === AUTH_FAILED ? "OBS rejected the password" : unreachable);
    };
}

export function disconnectObs() {
    const old = socket;
    socket = undefined; // so closing it isn't reported as a failure
    ready = undefined;
    old?.close();
}

// Asks OBS something and waits for its answer.
export function request<T>(type: string, data?: object): Promise<T> {
    const ws = ready;
    if (!ws) return Promise.reject(new Error("OBS isn't connected"));

    return new Promise((resolve, reject) => {
        const id = crypto.randomUUID();
        const timer = setTimeout(() => settle(id, { error: new Error("OBS didn't answer") }), TIMEOUT);
        pending.set(id, { resolve: (answer) => resolve(answer as T), reject, timer });
        ws.send(JSON.stringify({ op: REQUEST, d: { requestType: type, requestId: id, ...(data && { requestData: data }) } }));
    });
}
