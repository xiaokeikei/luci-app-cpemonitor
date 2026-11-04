"""Run with a local ucode runtime; tests use no network or device state."""
import json, pathlib, subprocess, sys, tempfile
parser = pathlib.Path(__file__).resolve().parents[1] / "root/usr/lib/cpemonitor/carrier-history.uc"
runtime = sys.argv[1] if len(sys.argv)>1 else "ucode"
rows=[]
for ts,carrier,rx,tx,ali in [(100,None,0,0,10),(110,1,100,20,20),(120,1,200,30,-1),(130,3,400,40,40),(140,6,50,5,-1)]:
 row=[ts,0,0,1,2,-1,-1,-1,ali,100 if ali<0 else 0,30,0,0,0,-999,-999,-999,0]
 if carrier is not None: row += [carrier,rx,tx]
 rows.append(row)
with tempfile.NamedTemporaryFile(mode="w",suffix=".csv",delete=False) as f:
 path=f.name
 for r in rows: f.write(",".join(map(str,r))+"\n")
try:
 def query(carrier,limit=5000): return json.loads(subprocess.check_output([runtime,str(parser),path,"90","150",str(limit),str(carrier)]))
 all=query(-1); mobile=query(1); legacy=query(0)
 assert len(all["rows"])==5 and len(mobile["rows"])==2 and len(legacy["rows"])==1
 m=next(x for x in all["carriers"] if x["id"]==1)
 assert (m["download"],m["upload"],m["count"])==(300,50,2),m
 assert m["aliyun_avg"]==20 and m["aliyun_loss"]==50,m
 assert next(x for x in all["carriers"] if x["id"]==0)["unaccounted"]==1
 assert query(1,1)["carriers"]==mobile["carriers"],"report must precede downsampling"
 print("PASS carrier bytes, raw loss, legacy history, filter and independent global report")
finally: pathlib.Path(path).unlink()
