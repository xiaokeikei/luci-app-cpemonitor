"""Run schema fixtures with ucode on an OpenWrt host or a local ucode runtime."""
import json
import pathlib
import subprocess
import sys

runtime = sys.argv[1] if len(sys.argv) > 1 else "ucode"
parser = str(pathlib.Path(__file__).resolve().parents[1] / "root/usr/lib/cpemonitor/bands.uc")
fixtures = [
    ({"modem_info": [{"key": "network_mode", "value": "NR5G-SA"}, {"key": "Band", "value": "41", "extra_info": "NR5G-SA"}]}, ["n41"]),
    ({"modem_info": [{"key": "network_mode", "value": "NR5G-NSA"}, {"key": "Band", "value": "3", "extra_info": "LTE"}, {"key": "Band (CA)", "value": "257", "extra_info": "CA-NR"}]}, ["B3", "n257"]),
    ({"modem_info": [{"key": "network_mode", "value": "NR5G-NSA"}, {"key": "Band", "value": "41"}, {"key": "supported_band", "value": "n28"}, {"key": "Band", "value": "78", "class": "Neighbor Cell", "extra_info": "NR"}]}, []),
    ({"carriers": [{"band": "B8", "rat": "LTE"}, {"band": "n79", "rat": "NR"}, {"band": "n28", "serving": False}]}, ["B8", "n79"]),
    ({"modem_info": [{"key": "network_mode", "value": "WCDMA"}, {"key": "Band", "value": "8"}]}, ["W8"]),
    ({"band": "n0"}, []),
    ({}, []),
]
for raw, expected in fixtures:
    output = subprocess.check_output([runtime, parser, "normalize", "123", "fixture", "60"], input=json.dumps(raw).encode())
    result = json.loads(output)
    assert result["modems"][0]["bands"] == expected, result
print("PASS: serving radio schemas, CA, ambiguous/unknown data and capability/neighbour exclusion")
