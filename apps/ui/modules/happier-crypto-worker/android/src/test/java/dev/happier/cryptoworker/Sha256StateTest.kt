package dev.happier.cryptoworker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test
import java.nio.ByteBuffer

class Sha256StateTest {
  private fun hashChunks(vararg chunks: ByteBuffer): String {
    val state = Sha256State()
    chunks.forEach(state::update)
    return state.digestHex()
  }

  @Test
  fun matchesKnownDigests() {
    assertEquals("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", hashChunks())
    assertEquals(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      hashChunks(ByteBuffer.wrap("abc".toByteArray())),
    )
  }

  @Test
  fun hashesSplitChunksLikeOneBuffer() {
    // 1,000,000 x 'a' is the FIPS 180-2 long-message vector; split it like the installer's
    // 1 MB reads, with a short final chunk, through direct buffers as JSI passes them.
    val message = ByteArray(1_000_000) { 'a'.code.toByte() }
    val chunks = message.asList().chunked(262_144).map { part ->
      ByteBuffer.allocateDirect(part.size).apply { put(part.toByteArray()); flip() }
    }
    assertEquals(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
      hashChunks(*chunks.toTypedArray()),
    )
  }

  @Test
  fun rejectsUseAfterDigest() {
    val state = Sha256State()
    state.digestHex()
    assertThrows(IllegalStateException::class.java) { state.update(ByteBuffer.wrap(byteArrayOf(1))) }
    assertThrows(IllegalStateException::class.java) { state.digestHex() }
  }
}
