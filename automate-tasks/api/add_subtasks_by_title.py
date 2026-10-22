#!/usr/bin/env python3
"""
Adds subtasks to an existing task by its TITLE (no task id needed).

Uses the new endpoint:  POST /ai/tasks/by-title/subtasks
Backend source: src/modules/ai/add-subtasks-by-title.service.ts

Two calls happen under the hood:
  1. POST /auth/login            -> accessToken, organizationId
  2. POST /ai/tasks/by-title/subtasks
       { "title": "...", "projectId": "...optional...", "subtasks": [{"title": "...", "description": "...optional..."}] }

Rules enforced server-side:
  - Title match is exact (case-insensitive). If more than one task in the org
    shares that title, the server returns the candidates (taskId + projectId)
    -- rerun with --project-id to pick one.
  - Subtask titles that already exist on the task (case-insensitive) are
    skipped, not duplicated. Safe to re-run.

Usage:
  # subtasks given on the command line
  python3 add_subtasks_by_title.py --title "Launch checklist" \\
      --subtask "Book the venue" --subtask "Send invites"

  # subtasks from a JSON file: either ["Title one", "Title two"]
  # or [{"title": "Title one", "description": "optional"}]
  python3 add_subtasks_by_title.py --title "Launch checklist" --subtasks-file new.json

  # disambiguate when the title isn't unique
  python3 add_subtasks_by_title.py --title "Launch checklist" --project-id <uuid> --subtask "..."

Credentials and server, in order of preference:
  --email / --password / --api-base / --project-id   (CLI flags)
  API_EMAIL / API_PASSWORD / API_BASE / API_PROJECT_ID (env vars)
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request

DEFAULT_API_BASE = "http://200.97.172.61:3000/api/v1"


def call(api_base, method, path, data=None, token=None, org_id=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if org_id:
        headers["X-Organization-Id"] = org_id
    body = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode()
    req = urllib.request.Request(api_base + path, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise SystemExit(f"STOP: {method} {path} failed with HTTP {e.code}.\n{detail[:3000]}")


def load_subtasks(args):
    items = []
    for t in args.subtask or []:
        items.append({"title": t})
    if args.subtasks_file:
        raw = json.load(open(args.subtasks_file))
        for it in raw:
            if isinstance(it, str):
                items.append({"title": it})
            else:
                entry = {"title": it["title"]}
                if it.get("description"):
                    entry["description"] = it["description"]
                items.append(entry)
    if not items:
        raise SystemExit("No subtasks given. Use --subtask \"...\" (repeatable) and/or --subtasks-file file.json")
    return items


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--title", required=True, help="Exact title of the task to add subtasks to")
    p.add_argument("--project-id", default=os.environ.get("API_PROJECT_ID"), help="Narrow the search when the title isn't unique")
    p.add_argument("--subtask", action="append", help="A new subtask title. Repeat for more than one.")
    p.add_argument("--subtasks-file", help="JSON file: list of titles, or list of {title, description}")
    p.add_argument("--email", default=os.environ.get("API_EMAIL"))
    p.add_argument("--password", default=os.environ.get("API_PASSWORD"))
    p.add_argument("--api-base", default=os.environ.get("API_BASE", DEFAULT_API_BASE))
    args = p.parse_args()

    if not args.email or not args.password:
        raise SystemExit("Need --email/--password, or set API_EMAIL / API_PASSWORD env vars.")

    subtasks = load_subtasks(args)

    login = call(args.api_base, "POST", "/auth/login", {"email": args.email, "password": args.password})
    token = login.get("accessToken")
    org_id = login.get("organizationId")
    if not token or not org_id:
        raise SystemExit(f"STOP: login response missing accessToken/organizationId: {login}")

    body = {"title": args.title, "subtasks": subtasks}
    if args.project_id:
        body["projectId"] = args.project_id

    result = call(args.api_base, "POST", "/ai/tasks/by-title/subtasks", body, token=token, org_id=org_id)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
