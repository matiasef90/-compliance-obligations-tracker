import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


class CryptoError(Exception):
    pass


def encrypt(plaintext: str, key: bytes) -> str:
    try:
        nonce = os.urandom(12)
        ciphertext = AESGCM(key).encrypt(nonce, plaintext.encode(), None)
        return base64.b64encode(nonce + ciphertext).decode()
    except Exception as exc:
        raise CryptoError("Encryption failed") from exc


def decrypt(ciphertext: str, key: bytes) -> str:
    try:
        data = base64.b64decode(ciphertext)
        nonce, ct = data[:12], data[12:]
        return AESGCM(key).decrypt(nonce, ct, None).decode()
    except Exception as exc:
        raise CryptoError("Decryption failed") from exc
