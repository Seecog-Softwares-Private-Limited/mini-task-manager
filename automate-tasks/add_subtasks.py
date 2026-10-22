#!/usr/bin/env python3
"""
Adds the OpsPick restaurant screens/features as subtasks under the existing task
"Create/Update Tasks+Recurring Tasks." and attaches one screenshot to each.

Same rules as the team prompt:
  1. GET /tasks/{TASK}
  2. Append the new items to the EXISTING subtasks array (never send only new items)
  3. PATCH /tasks/{TASK} with { "subtasks": existing + new }   (one PATCH for all)
  4. POST /attachments/upload  entityType=SUBTASK, entityId=<new subtask id>, taskId=<parent id>

Safe to re-run: subtasks whose title already exists are not added again, and images
already uploaded (listed in progress.json) are skipped.

Usage:
  python3 add_subtasks.py --dry-run     # shows what would be added, changes nothing
  python3 add_subtasks.py               # adds subtasks, then uploads screenshots
  python3 add_subtasks.py --batch 1     # adds them one PATCH at a time (if the server rejects a big PATCH)
"""
import json, os, sys, uuid, subprocess, urllib.request, urllib.error, datetime

API = "http://200.97.172.61:3000/api/v1"
ORG = "08f8b6f5-3b9e-40cf-abe5-57d3ea71e509"
TASK = "ba8e8e70-8235-405d-8f06-5b8134cc8c0f"
ASSIGNEE = "0dad08e6-bc95-41e3-aec9-2b74c7c7ca5c"   # Pankaj Kumar Agarwal
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIwZGFkMDhlNi1iYzk1LTQxZTMtYWVjOS0yYjc0YzdjN2NhNWMiLCJlbWFpbCI6InBhbmthamt1bWFyYWdhcndhbDQwQGdtYWlsLmNvbSIsInJvbGVzIjpbXSwiaWF0IjoxNzkyNjc5NzEwLCJleHAiOjE3OTMyODQ1MTB9.XvWrq2t9ExTIRtMp1dGLjBvzsKrS5kefEJXyQOnaMnU"
DUE_DATE, DUE_TIME = "2026-10-23", "16:00"
PARENT_TITLE = "Create/Update Tasks+Recurring Tasks."

HERE = os.path.dirname(os.path.abspath(__file__))
DRY = "--dry-run" in sys.argv
BATCH = int(sys.argv[sys.argv.index("--batch") + 1]) if "--batch" in sys.argv else 0   # 0 = all in one PATCH
AUTH = {"Authorization": f"Bearer {TOKEN}", "X-Organization-Id": ORG}


def call(method, path, data=None):
    headers = dict(AUTH)
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    req = urllib.request.Request(API + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"STOP: {method} {path} failed with HTTP {e.code}. Server says:\n{detail[:3000]}\nNothing was saved by this call.")


items = json.load(open(os.path.join(HERE, "subtasks.json")))
progress_path = os.path.join(HERE, "progress.json")
progress = json.load(open(progress_path)) if os.path.exists(progress_path) else {}

# 1. GET
parent = call("GET", f"/tasks/{TASK}")
existing = list(parent.get("subtasks") or [])
if parent.get("title") != PARENT_TITLE:
    raise SystemExit(f"Wrong parent task: {parent.get('title')}")
if len(existing) < 50:
    raise SystemExit(f"Refusing to save; expected a large checklist, got {len(existing)}")
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
backup = os.path.join(HERE, f"parent_backup_{stamp}.json")
json.dump(parent, open(backup, "w"), indent=1, ensure_ascii=False)
print(f"Parent OK: {len(existing)} subtasks. Backup saved: {backup}")

by_title = {s.get("title"): s for s in existing}
new = []
for it in items:
    if it["title"] in by_title:
        continue
    sid = str(uuid.uuid4())
    s = {
        "id": sid,
        "title": it["title"][:200],
        "completed": False,
        "status": "TODO",
        "priority": "MEDIUM",
        "assigneeId": ASSIGNEE,
        "assigneeIds": [ASSIGNEE],
        "dueDate": DUE_DATE,
        "dueTime": DUE_TIME,
    }
    if it["description"].strip():
        s["description"] = it["description"][:10000]
    new.append(s)
    by_title[it["title"]] = s

print(f"To add: {len(new)} new subtasks ({len(items) - len(new)} already present).")
if DRY:
    for s in new:
        print("  +", s["title"])
    raise SystemExit("Dry run: nothing changed.")

# The GET returns server-managed fields (e.g. updatedBy, assignedAt) that the PATCH
# validator does not accept. Remove exactly the fields the server names, then send
# the SAME full checklist again. Nothing else in any subtask is changed.
STRIP = set()
def patch_clean(full):
    import re
    for attempt in range(6):
        body = {"subtasks": [{k: v for k, v in x.items() if k not in STRIP} for x in full]}
        req = urllib.request.Request(API + f"/tasks/{TASK}", data=json.dumps(body).encode(), method="PATCH",
                                     headers=dict(AUTH, **{"Content-Type": "application/json"}))
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                if STRIP:
                    print(f"  (left out server-managed fields: {', '.join(sorted(STRIP))})")
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            detail = e.read().decode(errors="replace")
            bad = set(re.findall(r"subtasks\.\d+\.property (\w+) should not exist", detail))
            other = [m for m in re.findall(r'"([^"]+)"', detail) if "should not exist" not in m and m not in ("message", "error", "statusCode", "Bad Request")]
            if e.code == 400 and bad and not (bad <= STRIP):
                STRIP.update(bad)
                print(f"  server does not accept {', '.join(sorted(bad))}; retrying the full checklist without them")
                continue
            raise SystemExit(f"STOP: PATCH failed with HTTP {e.code}. Server says:\n{detail[:6000]}\nNothing was saved by this call.")
    raise SystemExit("STOP: PATCH still rejected after removing server-managed fields. Nothing was saved.")

# 2-3. PATCH with existing + new. With --batch N, new items go in groups of N,
# re-reading the full checklist before every PATCH so nothing existing is ever dropped.
def patch_group(group):
    cur = call("GET", f"/tasks/{TASK}")
    base = list(cur.get("subtasks") or [])
    if len(base) < len(existing):
        raise SystemExit(f"STOP: checklist shrank to {len(base)}. Restore from {backup}.")
    have = {x.get("title") for x in base}
    group = [g for g in group if g["title"] not in have]
    if not group:
        return base
    updated = patch_clean(base + group)
    after = updated.get("subtasks") or []
    after_ids = {x.get("id") for x in after}
    missing = [x.get("id") for x in base if x.get("id") not in after_ids]
    if missing:
        raise SystemExit(f"STOP: {len(missing)} existing subtasks missing after PATCH. Restore from {backup}.")
    if len(after) != len(base) + len(group):
        raise SystemExit(f"STOP: expected {len(base) + len(group)} subtasks after PATCH, got {len(after)}.")
    print(f"PATCH OK: subtaskCount {len(base)} -> {len(after)}")
    return after

if new:
    size = BATCH or len(new)
    for i in range(0, len(new), size):
        patch_group(new[i:i + size])
else:
    print("Nothing new to PATCH.")

# 4. Upload one screenshot per subtask
for it in items:
    s = by_title[it["title"]]
    sid = s["id"]
    if progress.get(sid):
        continue
    image = os.path.join(HERE, "images", it["image"])
    out = subprocess.check_output([
        "curl", "-sS", "--fail-with-body", "-X", "POST", f"{API}/attachments/upload",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", f"X-Organization-Id: {ORG}",
        "-F", f"file=@{image}",
        "-F", "entityType=SUBTASK",
        "-F", f"entityId={sid}",
        "-F", f"taskId={TASK}",
    ], text=True)
    att = json.loads(out)
    if not att.get("id"):
        raise SystemExit(f"STOP: upload failed for {it['title']}: {out[:300]}")
    progress[sid] = att.get("id")
    json.dump(progress, open(progress_path, "w"), indent=1)
    print(f"  image ok  {it['image']}  ->  {it['title'][:70]}")

print(json.dumps({"ok": True, "parentTitle": PARENT_TITLE, "added": len(new),
                  "imagesUploaded": len(progress), "dueDate": DUE_DATE, "dueTime": DUE_TIME,
                  "assignee": "Pankaj Kumar Agarwal"}, indent=2))
