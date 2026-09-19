import json
import os

_current_dir = os.path.dirname(os.path.abspath(__file__))
_json_path = os.path.join(_current_dir, "full_seed_data.json")

FULL_SEED_DATA = {"contacts": [], "messages": []}

if os.path.exists(_json_path):
    try:
        with open(_json_path, "r", encoding="utf-8") as _f:
            FULL_SEED_DATA = json.load(_f)
    except Exception as _e:
        print(f"Error loading full_seed_data.json: {_e}")
