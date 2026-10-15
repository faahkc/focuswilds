import net from 'node:net'
import tls from 'node:tls'
import { syncBuiltinESMExports } from 'node:module'

// Unit tests must never spend cloud quota, including through SDK sockets.
const blocked = () => { throw new Error('Network is disabled in unit tests') }
globalThis.fetch = async () => blocked()
net.connect = blocked
net.createConnection = blocked
net.Socket.prototype.connect = blocked
tls.connect = blocked
syncBuiltinESMExports()
