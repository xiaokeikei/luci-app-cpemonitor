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
EXECUTABLES = {"etc/init.d/cpemonitor", "usr/sbin/cpemonitord", "usr/sbin/cpemonitor-quota", "usr/libexec/rpcd/cpemonitor"}


def archive(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w:gz", format=tarfile.GNU_FORMAT) as tar:
        directories = {"."}
        for name, _, _ in files:
            parent = pathlib.PurePosixPath(name).parent
            directories.update(str(p) for p in [parent, *parent.parents])
        for name in sorted(directories, key=lambda p: (p.count("/"), p)):
            info = tarfile.TarInfo("./" if name == "." else "./" + name)
            info.type, info.mode, info.mtime = tarfile.DIRTYPE, 0o755, 0
            tar.addfile(info)
        for name, content, mode in files:
            info = tarfile.TarInfo("./" + name)
            info.size, info.mode, info.mtime = len(content), mode, 0
            tar.addfile(info, io.BytesIO(content))
    return buffer.getvalue()


def source_bytes(path):
    data = path.read_bytes()
    return data if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp"} else data.replace(b"\r\n", b"\n")


root_files = [(p.relative_to(BASE / "root").as_posix(), source_bytes(p),
               0o755 if p.relative_to(BASE / "root").as_posix() in EXECUTABLES else 0o644)
              for p in sorted((BASE / "root").rglob("*")) if p.is_file()]
htdocs_files = [("www/" + p.relative_to(BASE / "htdocs").as_posix(), source_bytes(p), 0o644)
                for p in sorted((BASE / "htdocs").rglob("*")) if p.is_file()]
control = f"""Package: luci-app-cpemonitor
Version: {VERSION}-{RELEASE}
Architecture: all
Description: CPE traffic, system and 5G monitor for LuCI
Section: luci
Priority: optional
Maintainer: xiaokeikei
License: GPL-2.0-only
Depends: luci-base, rpcd, jsonfilter, tc, kmod-ifb, kmod-sched-core, nftables-json, busybox, ucode, ucode-mod-fs
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
prerm = b'''#!/bin/sh
[ -n "${IPKG_INSTROOT}" ] || {
    /etc/init.d/cpemonitor stop
    tries=0
    while /etc/init.d/cpemonitor status >/dev/null 2>&1; do
        tries=$((tries + 1)); [ "$tries" -lt 30 ] || exit 1
        sleep 1
    done
}
exit 0
'''
control_tar = archive([("control", control, 0o644), ("conffiles", b"/etc/config/cpemonitor\n", 0o644),
                       ("postinst", postinst, 0o755), ("prerm", prerm, 0o755)])
data_tar = archive(root_files + htdocs_files)
# OpenWrt 24.10 ipkg-build uses a gzip-compressed tar outer container.
ipk = archive([("debian-binary", b"2.0\n", 0o644),
               ("data.tar.gz", data_tar, 0o644), ("control.tar.gz", control_tar, 0o644)])
(OUT / f"luci-app-cpemonitor_{VERSION}-{RELEASE}_all.ipk").write_bytes(ipk)

payload = archive([("root/" + n, b, m) for n, b, m in root_files] +
                  [("htdocs/" + n[len("www/"):], b, m) for n, b, m in htdocs_files] +
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
sources += [p for folder in ["root", "htdocs", "po", "tools", "docs", "tests"] for p in (BASE / folder).rglob("*") if p.is_file() and "__pycache__" not in p.parts]
with zipfile.ZipFile(OUT / f"luci-app-cpemonitor-{VERSION}-{RELEASE}-source.zip", "w", zipfile.ZIP_DEFLATED) as z:
    for p in sorted(sources):
        z.writestr("luci-app-cpemonitor/" + p.relative_to(BASE).as_posix(), source_bytes(p))
(OUT / f"RELEASE_NOTES-v{VERSION}.md").write_bytes(source_bytes(BASE / f"RELEASE_NOTES-v{VERSION}.md"))
for screenshot in sorted((BASE / "docs" / "images").glob(f"cpemonitor-v{VERSION}*.png")):
    (OUT / screenshot.name).write_bytes(screenshot.read_bytes())
assets = sorted(p for p in OUT.iterdir() if p.is_file() and p.name != "SHA256SUMS")
(OUT / "SHA256SUMS").write_text("".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in assets), encoding="utf-8")
print(OUT)
