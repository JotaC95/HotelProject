import requests
import json
import sys

BASE_URL = "https://hotel-backend-ql8r.onrender.com/api"
LOGIN_URL = f"{BASE_URL}/login/"
IMPORT_URL = f"{BASE_URL}/housekeeping/import_json/"

USERNAME = "admin"
PASSWORD = "admin123"

def run_import():
    # 1. Login
    print(f"Logging in as {USERNAME}...")
    try:
        resp = requests.post(LOGIN_URL, json={'username': USERNAME, 'password': PASSWORD})
        resp.raise_for_status()
        token = resp.json().get('token')
        print(f"Login successful. Token: {token[:10]}...")
    except Exception as e:
        print(f"Login failed: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
        sys.exit(1)

    # 2. Load Data
    try:
        with open('new_data.json', 'r') as f:
            data = json.load(f)
        print("Loaded new_data.json")
    except Exception as e:
        print(f"Failed to load file: {e}")
        sys.exit(1)

    # 3. Upload
    print(f"Uploading to {IMPORT_URL}...")
    headers = {
        'Authorization': f'Token {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        resp = requests.post(IMPORT_URL, json=data, headers=headers)
        if resp.status_code == 200:
            print("Import Successful!")
            print(json.dumps(resp.json(), indent=2))
        else:
            print(f"Import Failed: {resp.status_code}")
            print(resp.text)
    except Exception as e:
        print(f"Request Error: {e}")

if __name__ == "__main__":
    run_import()
