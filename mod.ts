/**
 * The type of the packet
 * @enum {number} LOGIN - Login packet type 
 * @enum {number} COMMAND - Command packet type
 * @enum {number} MULTIPACKET - Multiple packets expected
 */
export enum PacketType {
  LOGIN = 3,
  COMMAND = 2,
  MULTIPACKET = 0
}

export interface Packet {
  requestId: number;
  type: number;
  payload: string;
  length: number;
}

/**
 * A simple Minecraft RCON client
 * @module
 */
export class RCON {

  #client: Deno.TcpConn | null = null;;

  /**
   * Connect to a RCON server
   * @param {string} host The host of the RCON server 
   * @param {numbeR} port The port of the RCON server
   * @returns {Promise<void>}
   */
  async connect(host: string, port: number): Promise<void> {
    try {
      this.#client = await Deno.connect({ transport: "tcp", port, hostname: host });
    } catch (_error) {
      throw Error("Faild to connect to RCON server");
    }
  }

  /**
   * Send packet to the RCON server
   * @param {string} command The command to send to the RCON server
   * @param {PacketType} type The type of the packet, defaults to PacketType.COMMAND = 2
   * @throws {Error} If not connected to RCON server
   * @returns {Promise<Packet>}
   */
  async write(command: string, type: PacketType = PacketType.COMMAND): Promise<Packet> {
    this.#checkConnection()

    const requestId = this.#requestId();
    const packet = this.makePacket(command, requestId, type);

    await this.#client!.write(packet);

    return await this.#read();

  }

  /**
   * Read the response from the previous command packet
   * @throws {Error} If not connected to RCON server
   * @returns {Promise<Packet>}
   */
  async #read(): Promise<Packet> {
    this.#checkConnection()

    const buffer = new Uint8Array(4410);
    await this.#client!.read(buffer)

    const packet = this.decodePacket(buffer);

    return packet

  }

  /**
   * Allows you to send multiple commands at once
   * @param {string[]} commands Array of commands
   * @throws {Error} If not connected to RCON server
   * @returns Promise<Packet[]>
   */
  async multiCommand(commands: string[]): Promise<Packet[]> {
    this.#checkConnection()

    const readPackets: Packet[] = []
    for (const command of commands) {
      const packet = await this.write(command);
      readPackets.push(packet);
    }
    return readPackets;
  }

  /**
   * Sign in to the RCON server
   * @param password The password to login to the RCON server
   */
  async login(password: string) {
    const packet = await this.write(password, PacketType.LOGIN);
    if (packet.requestId === -1) {
      throw Error("Invalid password!");
    }
  }

  /**
   * Create a packet ready to be sent to the RCON server
   * @param {string} command 
   * @param {number} requestId 
   * @param {PacketType} type 
   * @returns {Uint8Array}
   */
  makePacket(command: string, requestId: number, type: PacketType): Uint8Array {
    const payloadBytes = new TextEncoder().encode(command);
    const length = 4 + 4 + payloadBytes.length + 2;

    const buffer = new Uint8Array(4 + length)
    const view = new DataView(buffer.buffer);

    view.setInt32(0, length, true);
    view.setInt32(4, requestId, true);
    view.setInt32(8, type, true);

    for (let i = 0; i < payloadBytes.length; i++) {
      view.setUint8(12 + i, payloadBytes[i]);
    }

    view.setUint8(12 + payloadBytes.length, 0);
    view.setUint8(12 + payloadBytes.length + 1, 0);

    return buffer;
  }

  /**
   * Decodes the buffer into a packet object
   * @param {Uint8Array} buffer 
   * @returns {Packet}
   */
  decodePacket(buffer: Uint8Array): Packet {
    const view = new DataView(buffer.buffer);
    const length = view.getInt32(0, true);
    const requestId = view.getInt32(4, true);
    const type = view.getInt32(8, true);
    const payload = new Uint8Array(buffer.buffer, 12, length - 10);
    const payloadString = new TextDecoder().decode(payload);

    return {
      length,
      requestId,
      type,
      payload: payloadString
    }
  }

  /**
   * Check if the client is connected to the RCON server
   */
  #checkConnection(): void {
    if (!this.#client) {
      throw Error("Not connected to RCON server");
    }
  }

  /**
   * Generates a request id
   * @returns {number} A random int32 number 
   */
  #requestId(): number {
    return Number.parseInt(Math.random().toString(2).substring(2, 32), 2);
  }

}


