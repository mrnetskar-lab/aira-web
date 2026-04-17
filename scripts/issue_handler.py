import os, json, requests

GITHUB_EVENT_PATH = os.environ.get("GITHUB_EVENT_PATH")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
COPILOT_API_URL = os.environ.get("COPILOT_API_URL")
COPILOT_API_TOKEN = os.environ.get("COPILOT_API_TOKEN")

if not GITHUB_EVENT_PATH or not GITHUB_TOKEN:
    raise SystemExit(1)

with open(GITHUB_EVENT_PATH, "r", encoding="utf-8") as f:
    event = json.load(f)

issue = event.get("issue") or {}
repository = event.get("repository") or {}
if not issue or not repository:
    raise SystemExit(0)

owner = repository["owner"]["login"]
repo = repository["name"]
number = issue["number"]
title = issue["title"]
body = issue["body"]

comment_body = (
    "Hi — this repo has a Copilot/Claude assistant integration.

"
    "To request action, add a comment starting with  (e.g. ).

"
    "If COPILOT_API_URL and COPILOT_API_TOKEN are set, this issue will also be forwarded automatically."
)

resp = requests.post(
    f"https://api.github.com/repos/{owner}/{repo}/issues/{number}/comments",
    headers={"Authorization": f"token {GITHUB_TOKEN}", "Accept": "application/vnd.github+json"},
    json={"body": comment_body}
)
print("Posted comment:", resp.status_code)

if COPILOT_API_URL and COPILOT_API_TOKEN:
    try:
        r2 = requests.post(COPILOT_API_URL,
            headers={"Authorization": f"Bearer {COPILOT_API_TOKEN}", "Content-Type": "application/json"},
            json={"repository": f"{owner}/{repo}", "issue_number": number, "title": title, "body": body},
            timeout=15)
        print("Forwarded to endpoint:", r2.status_code)
    except Exception as e:
        print("Forward failed:", e)
