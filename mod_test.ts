import { describe, it } from "jsr:@std/testing/bdd";
import { PacketType, RCON } from './mod.ts'
import { assertEquals, } from "jsr:@std/assert";

describe("packet creating and reading", () => {

  const rcon = new RCON();
  const requestId = 1234567;

  it("check packet type", () => {
    const loginType = PacketType.LOGIN;
    const loginPacket = rcon.makePacket("test_password", requestId, loginType);
    const readPacket = rcon.decodePacket(loginPacket);
    assertEquals(readPacket.type, loginType);

  })

  it("check packet id", () => {
    const helloPacket = rcon.makePacket("say Hello, world!", requestId, PacketType.COMMAND);
    const readPacket = rcon.decodePacket(helloPacket);
    assertEquals(readPacket.requestId, requestId);
  })

  it("check packet command", () => {
    const command = "set time 0";
    const timeCommand = rcon.makePacket(command, 1234567, PacketType.COMMAND);
    const readPacket = rcon.decodePacket(timeCommand);

    assertEquals(readPacket.payload, command);

  })

})
