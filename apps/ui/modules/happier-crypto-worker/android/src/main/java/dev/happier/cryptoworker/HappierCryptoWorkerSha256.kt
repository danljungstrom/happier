package dev.happier.cryptoworker

import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.typedarray.TypedArray
import java.nio.ByteBuffer
import java.security.MessageDigest

/** Incremental SHA-256 whose state lives natively; JS feeds it chunks it already holds. */
class HappierCryptoWorkerSha256 : SharedObject() {
  private val state = Sha256State()

  fun update(chunk: TypedArray) = state.update(chunk.toDirectBuffer())

  fun digestHex(): String = state.digestHex()
}

/** Digest state kept apart from the JS-bound shared object so it can be checked on the JVM. */
internal class Sha256State {
  private val digest = MessageDigest.getInstance("SHA-256")
  private var finalized = false

  fun update(chunk: ByteBuffer) {
    check(!finalized) { "model_pack_hasher_finalized" }
    digest.update(chunk)
  }

  fun digestHex(): String {
    check(!finalized) { "model_pack_hasher_finalized" }
    finalized = true
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
