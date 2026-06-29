import base64
import os

import pytest
from cryptography.exceptions import InvalidTag

from app.crypto import decrypt, encrypt

KEY = os.urandom(32)
WRONG_KEY = os.urandom(32)


def test_round_trip():
    plaintext = "30-12345678-9"
    assert decrypt(encrypt(plaintext, KEY), KEY) == plaintext


def test_encrypt_produces_different_ciphertext_each_call():
    plaintext = "30-12345678-9"
    ct1 = encrypt(plaintext, KEY)
    ct2 = encrypt(plaintext, KEY)
    assert ct1 != ct2


def test_encrypt_output_is_valid_base64():
    ct = encrypt("30-12345678-9", KEY)
    decoded = base64.b64decode(ct)
    assert len(decoded) > 12  # nonce(12) + at least tag(16)


def test_decrypt_wrong_key_raises():
    ct = encrypt("30-12345678-9", KEY)
    with pytest.raises(InvalidTag):
        decrypt(ct, WRONG_KEY)


def test_decrypt_corrupted_ciphertext_raises():
    ct = encrypt("30-12345678-9", KEY)
    raw = base64.b64decode(ct)
    corrupted = base64.b64encode(raw[:-1] + bytes([raw[-1] ^ 0xFF])).decode()
    with pytest.raises(InvalidTag):
        decrypt(corrupted, KEY)


def test_encrypt_unicode_plaintext():
    plaintext = "20-ñ1234567-0"
    assert decrypt(encrypt(plaintext, KEY), KEY) == plaintext
