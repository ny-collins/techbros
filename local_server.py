#!/usr/bin/env python3
import os
import sys
import mimetypes
from http.server import HTTPServer, SimpleHTTPRequestHandler
import re

PORT = 8080
DIRECTORY = "public"

class RangeRequestHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path):
            return super().do_GET()

        if 'Range' in self.headers and os.path.exists(path):
            self.send_range_response(path)
        else:
            super().do_GET()

    def send_range_response(self, path):
        range_header = self.headers['Range']
        file_size = os.path.getsize(path)
        range_match = re.match(r'bytes=(\d+)-(\d+)?', range_header)
        
        if not range_match: return super().do_GET()
            
        first = int(range_match.group(1))
        last = range_match.group(2)
        last = int(last) if last else file_size - 1
            
        if first >= file_size:
            self.send_error(416, "Requested Range Not Satisfiable")
            return

        length = last - first + 1
        self.send_response(206)
        self.send_header('Content-Type', mimetypes.guess_type(path)[0])
        self.send_header('Content-Range', f'bytes {first}-{last}/{file_size}')
        self.send_header('Content-Length', str(length))
        self.send_header('Accept-Ranges', 'bytes')
        self.end_headers()
        
        with open(path, 'rb') as f:
            f.seek(first)
            self.wfile.write(f.read(length))

if __name__ == '__main__':
    if os.path.exists(DIRECTORY): os.chdir(DIRECTORY)
    print(f"🚀 TechBros Server: http://localhost:{PORT}")
    try: HTTPServer(('0.0.0.0', PORT), RangeRequestHandler).serve_forever()
    except KeyboardInterrupt: sys.exit(0)