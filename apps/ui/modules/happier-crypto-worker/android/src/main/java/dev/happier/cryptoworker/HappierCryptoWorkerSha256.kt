package dev.happier.cryptoworker

import expo.modules.kotlin.sharedobjects.SharedObject
import expo.modules.kotlin.typedarray.TypedArray
import java.security.MessageDigest

/** Incremental SHA-256 whose state lives natively; JS feeds it chunks it already holds. */
class HappierCryptoWorkerSha256 : SharedObject() {
  private val digest = MessageDigest.getInstance("SHA-256")
  private var finalized = false

  fun update(chunk: TypedArray) {
    check(!finalized) { "model_pack_hasher_finalized" }
    digest.update(chunk.toDirectBuffer())
  }

  fun digestHex(): String {
    check(!finalized) { "model_pack_hasher_finalized" }
    finalized = true
    return digest.digest().joinToString("") { "%02x".format(it) }
  }
}
