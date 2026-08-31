"""Micro-benchmarks for CPU-bound auth primitives.

Password hashing is intentionally slow (bcrypt); these numbers document the
per-request auth cost and guard against accidental cost-factor regressions.
"""
from app.core.security import (
    create_access_token, decode_token, hash_password, verify_password,
)

_HASH = hash_password("correct horse battery staple")
_TOKEN = create_access_token("00000000-0000-0000-0000-000000000000")


def test_bench_hash_password(benchmark):
    benchmark(hash_password, "correct horse battery staple")


def test_bench_verify_password(benchmark):
    benchmark(verify_password, "correct horse battery staple", _HASH)


def test_bench_create_access_token(benchmark):
    benchmark(create_access_token, "00000000-0000-0000-0000-000000000000")


def test_bench_decode_token(benchmark):
    benchmark(decode_token, _TOKEN)
