Add subtasks to an existing task by its TITLE (no task id needed)

Backend endpoint (new): POST /ai/tasks/by-title/subtasks
Source:
  src/modules/ai/add-subtasks-by-title.service.ts
  src/modules/ai/ai.controller.ts
  src/modules/tasks/repositories/tasks.repository.ts  (findByTitleInOrganization)

NOT DEPLOYED YET. This only exists on the local branch. Build + deploy the
backend before any of the calls below will work against the live server.

--------------------------------------------------------------------------
Option A: run the script
--------------------------------------------------------------------------
  python3 add_subtasks_by_title.py --title "My task" \
      --email you@example.com --password '...' \
      --subtask "First new subtask" --subtask "Second new subtask"

  (or set API_EMAIL / API_PASSWORD env vars instead of --email/--password,
   and/or --subtasks-file some.json with ["title one", "title two"])

Safe to re-run: subtask titles that already exist on the task (case
insensitive) are skipped, not duplicated.

If the title matches more than one task in the organization, the server
replies with HTTP 409 and a list of candidates (taskId + projectId) -- rerun
with --project-id <uuid> to pick one.

--------------------------------------------------------------------------
Option B: raw curl, to paste into ChatGPT / Claude / Gemini / etc.
--------------------------------------------------------------------------
Give the chatbot your problem statement plus this block. Tell it to fill in
EMAIL, PASSWORD, TASK_TITLE and the subtasks array, then run both commands
in order (most AI chat tools with code execution can run curl directly).

  # 1. Get a token
  curl -s -X POST "http://200.97.172.61:3000/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"EMAIL","password":"PASSWORD"}'
  # -> save accessToken and organizationId from the response

  # 2. Add subtasks to the task with this exact title
  curl -s -X POST "http://200.97.172.61:3000/api/v1/ai/tasks/by-title/subtasks" \
    -H "Authorization: Bearer ACCESS_TOKEN" \
    -H "X-Organization-Id: ORGANIZATION_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "TASK_TITLE",
      "subtasks": [
        { "title": "..." },
        { "title": "...", "description": "optional" }
      ]
    }'

Response: { taskId, projectId, title, addedCount, skippedTitles, totalSubtasks }

Notes:
  - Title match is exact, case-insensitive.
  - Add "projectId": "<uuid>" to the body in step 2 if the title isn't
    unique across the organization (the 409 response lists candidates).
  - The access token from step 1 is a normal full-access session token --
    fine in your own terminal, don't paste it into a shared/public chat.
