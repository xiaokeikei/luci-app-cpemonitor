"""Build portable OpenWrt release assets using Python's standard library."""
import base64
import hashlib
import io
import pathlib
import re
import tarfile
import zipfile

BASE = pathlib.Path(__file__).resolve().parents[1]
VERSION = re.search(r"PKG_VERSION:=(\S+)", (BASE / "Makefile").read_text()).group(1)
RELEASE = re.search(r"PKG_RELEASE:=(\S+)", (BASE / "Makefile").read_text()).group(1)
OUT = BASE.parent / "versions" / ("v" + VERSION)
OUT.mkdir(parents=True, exist_ok=True)
EXECUTABLES = {"etc/init.d/cpemonitor", "usr/sbin/cpemonitord", "usr/libexec/rpcd/cpemonitor"}


def archive(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz", format=tarfile.GNU_FORMAT) as tar:
        for name, content, mode in files:
            info = tarfile.TarInfo("./" + name)
            info.size, info.mode, info.mtime = len(content), mode, 0
            tar.addfile(info, io.BytesIO(content))
    return buffer.getvalue()


def source_bytes(path):
    return path.read_bytes().replace(b"\r\n", b"\n")


root_files = [(p.relative_to(BASE / "root").as_posix(), source_bytes(p),
               0o755 if p.relative_to(BASE / "root").as_posix() in EXECUTABLES else 0o644)
              for p in sorted((BASE / "root").rglob("*")) if p.is_file()]
control = f"""Package: luci-app-cpemonitor
Version: {VERSION}-{RELEASE}
Architecture: all
Description: CPE traffic, system and 5G monitor for LuCI
Section: luci
Priority: optional
Maintainer: xiaokeikei
License: GPL-2.0-only
Depends: luci-base, rpcd, jsonfilter
""".encode()
postinst = b'''#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] || {
    /etc/init.d/cpemonitor enable
    /etc/init.d/cpemonitor restart
    rm -f /tmp/luci-indexcache /tmp/luci-indexcache.* /tmp/luci-modulecache/* 2>/dev/null
    /etc/init.d/rpcd restart
    /etc/init.d/uhttpd reload
}
exit 0
'''
prerm = b'#!/bin/sh\n[ -n "${IPKG_INSTROOT}" ] || /etc/init.d/cpemonitor stop\nexit 0\n'
control_tar = archive([("control", control, 0o644), ("conffiles", b"/etc/config/cpemonitor\n", 0o644),
                       ("postinst", postinst, 0o755), ("prerm", prerm, 0o755)])
data_tar = archive(root_files)
ipk = bytearray(b"!<arch>\n")
for name, content in [("debian-binary", b"2.0\n"), ("control.tar.gz", control_tar), ("data.tar.gz", data_tar)]:
    ipk.extend(f"{name + '/':<16}{0:<12}{0:<6}{0:<6}{'100644':<8}{len(content):<10}`\n".encode())
    ipk.extend(content)
    if len(content) % 2:
        ipk.extend(b"\n")
(OUT / f"luci-app-cpemonitor_{VERSION}-{RELEASE}_all.ipk").write_bytes(ipk)

payload = archive([("root/" + n, b, m) for n, b, m in root_files] +
                  [("install.sh", source_bytes(BASE / "install.sh"), 0o755)])
header = b'''#!/bin/sh
set -e
work=$(mktemp -d /tmp/cpemonitor-install.XXXXXX)
trap 'rm -rf "$work"' EXIT
line=$(awk '/^__PAYLOAD__$/{print NR+1;exit}' "$0")
tail -n +"$line" "$0" | base64 -d | tar -xzf - -C "$work"
sh "$work/install.sh"
exit 0
__PAYLOAD__
'''
(OUT / f"luci-app-cpemonitor-{VERSION}-{RELEASE}.run").write_bytes(header + base64.encodebytes(payload))
sources = [p for p in BASE.iterdir() if p.is_file() and p.suffix == ".md"]
sources += [BASE / n for n in ["Makefile", "LICENSE", "install.sh", "uninstall.sh", ".gitignore"]]
sources += [p for folder in ["root", "tools"] for p in (BASE / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts]
with zipfile.ZipFile(OUT / f"luci-app-cpemonitor-{VERSION}-{RELEASE}-source.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(sources):
        z.writestr("luci-app-cpemonitor/" + p.relative_to(BASE).as_posix(), source_bytes(p))
(OUT / f"RELEASE_NOTES-v{VERSION}.md").write_bytes(source_bytes(BASE / f"RELEASE_NOTES-v{VERSION}.md"))
assets = sorted(p for p in OUT.iterdir() if p.is_file() and p.name != "SHA256SUMS")
(OUT / "SHA256SUMS").write_text("".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in assets), encoding="utf-8")
print(OUT)
