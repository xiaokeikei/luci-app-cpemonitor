"""Synthetic MU300 cache only; never include SIM or device identity."""
import json, pathlib, subprocess, sys
parser = pathlib.Path(__file__).resolve().parents[1] / 'root/usr/lib/cpemonitor/mu300.uc'
sample = {'ts': 200, 'reg': {'stat': 1}, 'sig': {'rsrp': -88, 'rsrq': -9, 'sinr': 17},
          'lte': {'band': 3}, 'nr': {'band': 78}, 'ident': {'iccid': 'synthetic-only'}}
def parse(data):
    return json.loads(subprocess.check_output([sys.argv[1], str(parser), '210'], input=json.dumps(data).encode()))
result = parse(sample)
assert result['rsrp'] == -88 and result['sinr'] == 17
assert [c['band'] for c in result['carriers']] == ['B3', 'n78']
assert 'ident' not in result and 'synthetic-only' not in json.dumps(result)
assert parse({**sample, 'ts': 1})['carriers'] == []
assert parse({**sample, 'reg': {'stat': 0}})['carriers'] == []
assert parse({})['rsrp'] == -999
assert parse(None)['rsrp'] == -999
print('PASS MU300 signals, serving bands, stale/disconnected caches and identity exclusion')
