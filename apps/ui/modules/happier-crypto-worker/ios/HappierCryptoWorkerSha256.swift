import CryptoKit
import ExpoModulesCore

/// Incremental SHA-256 whose state lives natively; JS feeds it chunks it already holds.
final class HappierCryptoWorkerSha256: SharedObject {
  struct FinalizedError: Error, CustomStringConvertible {
    var description: String { "model_pack_hasher_finalized" }
  }

  private var hasher = SHA256()
  private var finalized = false

  func update(_ chunk: TypedArray) throws {
    guard !finalized else { throw FinalizedError() }
    hasher.update(bufferPointer: UnsafeRawBufferPointer(start: chunk.rawPointer, count: chunk.byteLength))
  }

  func digestHex() throws -> String {
    guard !finalized else { throw FinalizedError() }
    finalized = true
    return hasher.finalize().map { String(format: "%02x", $0) }.joined()
  }
}
