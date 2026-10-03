#!/usr/bin/env python3
"""
RedGIFs Video Downloader
Descargador de videos de RedGIFs en calidad HD y SD.
"""

import os
import re
import sys
import time
import argparse
import requests
from typing import Optional, Dict, Any, List

# Asegurar compatibilidad de consola UTF-8 en Windows
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.redgifs.com/',
    'Origin': 'https://www.redgifs.com'
}

class RedGifsDownloader:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.token = None
        self.token_expiry = 0

    def get_token(self) -> str:
        """Obtiene o renueva el token temporal de autenticación."""
        now = time.time()
        if self.token and now < self.token_expiry:
            return self.token

        url = 'https://api.redgifs.com/v2/auth/temporary'
        try:
            resp = self.session.get(url, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get('token')
                # Renovar cada 25 minutos
                self.token_expiry = now + 1500
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                return self.token
            else:
                raise Exception(f"Error al obtener token de RedGIFs: HTTP {resp.status_code}")
        except Exception as e:
            print(f"[Error de autenticación]: {e}")
            raise

    @staticmethod
    def extract_id(url_or_id: str) -> str:
        """Extrae el ID limpio de un enlace o texto."""
        text = url_or_id.strip()
        m = re.search(r'redgifs\.com/(?:watch|ifr)/([a-zA-Z0-9_-]+)', text, re.IGNORECASE)
        if m:
            return m.group(1).lower()
        clean = text.split('/')[-1].split('?')[0].split('#')[0]
        return clean.lower()

    def get_video_info(self, url_or_id: str) -> Dict[str, Any]:
        """Obtiene los metadatos completos y enlaces directos de descarga."""
        gif_id = self.extract_id(url_or_id)
        if not gif_id:
            raise ValueError("ID o URL inválida de RedGIFs.")

        self.get_token()
        url = f'https://api.redgifs.com/v2/gifs/{gif_id}'
        
        resp = self.session.get(url, timeout=10)
        if resp.status_code == 404:
            raise ValueError(f"El video con ID '{gif_id}' no existe o ha sido eliminado.")
        elif resp.status_code != 200:
            raise Exception(f"Error al consultar el video: HTTP {resp.status_code}")

        data = resp.json()
        gif = data.get('gif') or {}
        urls = gif.get('urls') or {}

        return {
            'id': gif.get('id') or gif_id,
            'title': (gif.get('tags') and ", ".join(gif.get('tags')[:3])) or gif.get('id') or 'Video RedGIFs',
            'userName': gif.get('userName') or 'Anónimo',
            'duration': round(float(gif.get('duration') or 0), 1),
            'views': gif.get('views') or 0,
            'likes': gif.get('likes') or 0,
            'tags': gif.get('tags') or [],
            'hd_url': urls.get('hd') or urls.get('sd') or '',
            'sd_url': urls.get('sd') or urls.get('hd') or '',
            'poster_url': urls.get('poster') or urls.get('thumbnail') or '',
            'thumbnail_url': urls.get('thumbnail') or urls.get('poster') or '',
            'watch_url': f"https://www.redgifs.com/watch/{gif_id}"
        }

    def download_video(self, url_or_id: str, output_dir: str = "downloads", quality: str = "hd", progress_callback=None) -> Dict[str, Any]:
        """
        Descarga el video MP4 en el directorio especificado.
        quality: 'hd' o 'sd'
        """
        info = self.get_video_info(url_or_id)
        download_url = info['hd_url'] if quality == 'hd' and info['hd_url'] else info['sd_url']

        if not download_url:
            raise Exception("No se encontró URL de descarga disponible.")

        os.makedirs(output_dir, exist_ok=True)

        user_prefix = re.sub(r'[^a-zA-Z0-9_-]', '', info['userName'])
        filename = f"{user_prefix}_{info['id']}_{quality}.mp4" if user_prefix else f"{info['id']}_{quality}.mp4"
        filepath = os.path.join(output_dir, filename)

        # Descarga con streaming
        resp = self.session.get(download_url, stream=True, timeout=20)
        resp.raise_for_status()

        total_size = int(resp.headers.get('content-length', 0))
        downloaded = 0

        with open(filepath, 'wb') as f:
            for chunk in resp.iter_content(chunk_size=65536):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback and total_size > 0:
                        progress_callback(downloaded, total_size)

        return {
            'success': True,
            'filename': filename,
            'filepath': os.path.abspath(filepath),
            'filesize_bytes': downloaded,
            'filesize_mb': round(downloaded / (1024 * 1024), 2),
            'video_info': info
        }

    def search_videos(self, query: str, count: int = 18, page: int = 1) -> List[Dict[str, Any]]:
        """Busca videos en RedGIFs por término clave o etiqueta."""
        self.get_token()
        url = 'https://api.redgifs.com/v2/gifs/search'
        params = {
            'search_text': query,
            'count': count,
            'page': page
        }
        resp = self.session.get(url, params=params, timeout=10)
        if resp.status_code != 200:
            return []

        data = resp.json()
        gifs = data.get('gifs', [])
        results = []
        for g in gifs:
            urls = g.get('urls', {})
            results.append({
                'id': g.get('id'),
                'title': ", ".join(g.get('tags', [])[:3]) or g.get('id'),
                'userName': g.get('userName') or 'Anónimo',
                'duration': round(float(g.get('duration') or 0), 1),
                'views': g.get('views') or 0,
                'hd_url': urls.get('hd') or '',
                'sd_url': urls.get('sd') or '',
                'thumbnail_url': urls.get('thumbnail') or urls.get('poster') or '',
                'watch_url': f"https://www.redgifs.com/watch/{g.get('id')}"
            })
        return results


def cli_main():
    parser = argparse.ArgumentParser(description="Descargador de videos de RedGIFs")
    parser.add_argument("url", nargs="?", help="URL o ID del video en RedGIFs (ej: https://www.redgifs.com/watch/ejemplo)")
    parser.add_argument("-q", "--quality", choices=["hd", "sd"], default="hd", help="Calidad del video (hd o sd, por defecto hd)")
    parser.add_argument("-o", "--output", default="downloads", help="Directorio de descarga (por defecto: downloads/)")
    parser.add_argument("-f", "--file", help="Archivo de texto con múltiples enlaces para descargar por lotes")
    parser.add_argument("-s", "--search", help="Buscar videos en RedGIFs por término")
    args = parser.parse_args()

    client = RedGifsDownloader()

    if args.search:
        print(f"\n🔍 Buscando videos para '{args.search}' en RedGIFs...")
        results = client.search_videos(args.search, count=10)
        if not results:
            print("No se encontraron resultados.")
            return
        print(f"Encontrados {len(results)} videos:")
        for idx, r in enumerate(results, 1):
            print(f"{idx}. [{r['id']}] por {r['userName']} ({r['duration']}s) - {r['watch_url']}")
        return

    urls_to_download = []
    if args.file:
        if os.path.exists(args.file):
            with open(args.file, 'r', encoding='utf-8') as f:
                urls_to_download = [line.strip() for line in f if line.strip()]
        else:
            print(f"Error: El archivo '{args.file}' no existe.")
            return
    elif args.url:
        urls_to_download = [args.url]
    else:
        # Prompt interactivo
        print("========================================")
        print("  REDGIFS VIDEO DOWNLOADER - CLI")
        print("========================================")
        inp = input("Introduce la URL o ID del video: ").strip()
        if inp:
            urls_to_download = [inp]
        else:
            print("No se introdujo ninguna URL.")
            return

    for url in urls_to_download:
        print(f"\n📥 Procesando: {url}")
        try:
            info = client.get_video_info(url)
            print(f"🎬 Video: {info['id']} | Creador: {info['userName']} | Duración: {info['duration']}s")
            print(f"⏳ Descargando en calidad {args.quality.upper()}...")
            
            def print_progress(downloaded, total):
                percent = int((downloaded / total) * 100)
                bar = '█' * (percent // 4) + '-' * (25 - (percent // 4))
                sys.stdout.write(f"\r[{bar}] {percent}% ({downloaded // (1024*1024)}MB / {total // (1024*1024)}MB)")
                sys.stdout.flush()

            res = client.download_video(url, output_dir=args.output, quality=args.quality, progress_callback=print_progress)
            print(f"\n✅ ¡Descargado con éxito!: {res['filename']} ({res['filesize_mb']} MB)")
            print(f"📁 Guardado en: {res['filepath']}")
        except Exception as e:
            print(f"\n❌ Error al descargar {url}: {e}")

if __name__ == '__main__':
    cli_main()
