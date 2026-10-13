"""Extract the user's macOS Earth wallpaper collection into local web images."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AERIALS = Path.home() / 'Library/Application Support/com.apple.wallpaper/aerials'
OUTPUT = ROOT / 'frontend/public/earth'
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((AERIALS / 'manifest/entries.json').read_text())
assets = [item for item in manifest['assets'] if '55B7C95D-CEAF-4FD8-ADEF-F5BC657D8F6D' in item['categories']]
assets.sort(key=lambda item: (item['accessibilityLabel'] != 'Caribbean Day', item.get('preferredOrder', 0), item['id']))

def prepare(pair):
    index, asset = pair
    local = AERIALS / 'videos' / (asset['id'] + '.mov')
    source = str(local) if local.exists() else asset['url-4K-SDR-240FPS']
    destination = OUTPUT / f'earth-{index + 1:02d}.jpg'
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', '12', '-i', source, '-frames:v', '1', '-vf', 'scale=1920:-2', '-q:v', '3', str(destination)], check=True, capture_output=True, timeout=90)
    print(f"Prepared {index + 1}/22: {asset['accessibilityLabel']}", flush=True)
    return {'src': f'/earth/{destination.name}', 'label': asset['accessibilityLabel'], 'sourceId': asset['id'], 'frameSeconds': 12, 'source': 'macOS Earth wallpaper video', 'cachedVideo': local.exists()}

with ThreadPoolExecutor(max_workers=3) as pool:
    gallery = list(pool.map(prepare, enumerate(assets)))
catalog_path = OUTPUT / 'catalog.json'
previous = json.loads(catalog_path.read_text()) if catalog_path.exists() else {}
catalog_path.write_text(json.dumps({'dark': gallery, 'light': previous.get('light', [])}, indent=2) + '\n')
print('Earth catalog saved with all 22 views.', flush=True)
