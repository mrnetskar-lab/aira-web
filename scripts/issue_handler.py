import os, json, requests

token = os.environ["GITHUB_TOKEN"]
event = json.load(open(os.environ.get("GITHUB_EVENT_PATH", "")))
issue = event.get("issue", {})
repo = event.get("repository", {})
if not issue or not repo:
    raise SystemExit(0)

owner = repo["owner"]["login"]
name = repo["name"]
number = issue["number"]

comment = (
    "Hi -- this repo has a Copilot/Claude assistant integration.\n\n"
    "To request action, add a comment starting with `copilot:`\n\n"
    "If COPILOT_API_URL and COPILOT_API_TOKEN are set, this issue will be forwarded automatically."
)

r = requests.post(
    f"https://api.github.com/repos/{owner}/{name}/issues/{number}/comments",
    headers={"Authorization": f"token {token}", "Accept": "application/vnd.github+json"},
    json={"body": comment}
)
print("Posted comment:", r.status_code)

api_url = os.environ.get("COPILOT_API_URL")
api_token = os.environ.get("COPILOT_API_TOKEN")
if api_url and api_token:
    try:
        r2 = requests.post(api_url,
            headers={"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"},
            json={"repository": f"{owner}/{name}", "issue_number": number,
                  "title": issue["title"], "body": issue["body"]}, timeout=15)
        print("Forwarded:", r2.status_code)
    except Exception as e:
        print("Forward failed:", e)
