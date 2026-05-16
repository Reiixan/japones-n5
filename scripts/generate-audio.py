#!/usr/bin/env python3
"""Genera MP3 pregrabados para todas las cadenas JP de los JSON de datos.

Usa el endpoint público de Google Translate TTS (sin API key). Idempotente:
mantiene un manifest.json y solo regenera lo que falta.

Uso:
    python3 scripts/generate-audio.py
"""
import json
import hashlib
import os
import sys
import time
import urllib.parse
import urllib.request
import urllib.error

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(REPO, 'data')
AUDIO_DIR = os.path.join(REPO, 'audio')
MANIFEST_PATH = os.path.join(AUDIO_DIR, 'manifest.json')

USER_AGENT = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
              '(KHTML, like Gecko) Chrome/124 Safari/537.36')
TTS_URL = 'https://translate.google.com/translate_tts'
SLEEP_BETWEEN = 0.35  # segundos, evita rate-limit


def hash_text(text: str) -> str:
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:16]


def fetch_mp3(text: str) -> bytes:
    params = urllib.parse.urlencode({
        'ie': 'UTF-8',
        'q': text,
        'tl': 'ja',
        'client': 'tw-ob',
    })
    req = urllib.request.Request(
        f'{TTS_URL}?{params}',
        headers={'User-Agent': USER_AGENT},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return r.read()


def load_json(name: str):
    with open(os.path.join(DATA_DIR, name), encoding='utf-8') as f:
        return json.load(f)


def collect_texts() -> list[str]:
    texts: set[str] = set()
    for fname in ('hiragana.json', 'katakana.json'):
        for item in load_json(fname):
            texts.add(item['kana'])
    for item in load_json('vocab-n5.json'):
        texts.add(item['kana'])
    for item in load_json('kanji-n5.json'):
        texts.add(item['example_reading'])
    for item in load_json('grammar-n5.json'):
        for ex in item['examples']:
            texts.add(ex['jp'])
    for item in load_json('particles.json'):
        sentence = ''.join(
            item['answer'] if p == '[  ]' else p for p in item['parts']
        )
        texts.add(sentence)
    for item in load_json('listening-n5.json'):
        texts.add(item['audio_text'])
    return sorted(texts)


def load_manifest() -> dict[str, str]:
    if not os.path.exists(MANIFEST_PATH):
        return {}
    with open(MANIFEST_PATH, encoding='utf-8') as f:
        return json.load(f)


def save_manifest(manifest: dict[str, str]) -> None:
    with open(MANIFEST_PATH, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2, sort_keys=True)


def main() -> int:
    os.makedirs(AUDIO_DIR, exist_ok=True)
    manifest = load_manifest()
    texts = collect_texts()
    print(f'Textos únicos: {len(texts)}')

    todo = [
        t for t in texts
        if t not in manifest
        or not os.path.exists(os.path.join(AUDIO_DIR, manifest[t]))
    ]
    print(f'Por generar: {len(todo)}')

    failures: list[tuple[str, str]] = []
    for i, text in enumerate(todo, 1):
        fname = f'{hash_text(text)}.mp3'
        out_path = os.path.join(AUDIO_DIR, fname)
        preview = text[:30] + ('…' if len(text) > 30 else '')
        try:
            data = fetch_mp3(text)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            failures.append((text, str(e)))
            print(f'  [{i}/{len(todo)}] FAIL {preview} — {e}')
            time.sleep(SLEEP_BETWEEN * 4)  # back off on error
            continue
        with open(out_path, 'wb') as fp:
            fp.write(data)
        manifest[text] = fname
        if i % 20 == 0:
            save_manifest(manifest)
        print(f'  [{i}/{len(todo)}] {preview} -> {fname} ({len(data)} B)')
        time.sleep(SLEEP_BETWEEN)

    save_manifest(manifest)
    print(f'\nManifest: {MANIFEST_PATH}')
    print(f'OK: {len(manifest)} / Failures: {len(failures)}')
    if failures:
        print('Re-ejecuta el script para reintentar los fallidos.')
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
