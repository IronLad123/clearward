import os
import sys
import uvicorn
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)
from app.main import app
if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    uvicorn.run(app, host='127.0.0.1', port=port, log_level='info')
