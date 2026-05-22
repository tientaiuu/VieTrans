import requests, io
from PIL import Image

img = Image.new('RGB', (512, 48), color=(200, 200, 200))
buf = io.BytesIO()
img.save(buf, 'JPEG')
buf.seek(0)

print('Uploading to backend...')
try:
    r = requests.post('http://localhost:8000/api/upload',
                      files={'file': ('test.jpg', buf, 'image/jpeg')},
                      timeout=180)
    print('Status:', r.status_code)
    data = r.json()
    print('Full response:', data)
except Exception as e:
    print('ERROR:', e)
