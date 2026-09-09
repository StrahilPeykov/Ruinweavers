import {createServer} from "vite";
import {createWsRelayServer} from "@trystero-p2p/ws-relay/server";
const relay=createWsRelayServer({host:"127.0.0.1",port:4174});
await relay.ready;
const server=await createServer();await server.listen();server.printUrls();
console.log("Local WebRTC signaling: ws://127.0.0.1:4174 (gameplay travels peer-to-peer)");
for(const signal of ["SIGINT","SIGTERM"])process.once(signal,async()=>{await server.close();await relay.close();process.exit(0);});
