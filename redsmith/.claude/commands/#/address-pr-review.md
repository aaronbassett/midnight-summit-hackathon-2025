---
allowed-tools: Bash(gh pr:*), Bash(gh api:*), Bash(git rev-parse:*)
description: Fetch the most recent Claude review on a PR and address any issues
---

# Address PR Review Issues

Follow these steps to help the user address issues from Claude's PR review:

## Step 1: Get PR Information

1. Check if `$ARGUMENTS` contains a PR number:
   - If yes, use that PR number
   - If no, get the current branch name with `git rev-parse --abbrev-ref HEAD`
   - Then find the PR for that branch with `gh pr view --json number,title,url`

2. Store the PR number, title, and URL for later use

## Step 2: Fetch Claude's Most Recent Review Comment

1. Fetch all comments on the PR using: `gh api repos/{owner}/{repo}/pulls/{pr_number}/comments`
2. Filter for comments by Claude (look for author login matching "claude" or similar)
3. Get the most recent comment's body text

## Step 3: Parse Issues by Priority

Parse the comment to extract issues grouped by priority level:

- Critical Issues
- High Priority Issues
- Medium Priority Issues
- Low Priority Issues

Each issue should have a title and description.

## Step 4: Ask User Which Issues to Address

For each priority level that has issues (starting with Critical, then High, then Medium, then Low):

1. If there are more than 4 issues at this level, select the 4 you deem most important based on:
   - Security vulnerabilities
   - Bugs that affect functionality
   - Issues that block other work
   - Impact on user experience

2. Use the AskUserQuestion tool with `multiSelect: true`:
   - Show issue title as the `label`
   - Show 1 sentence description in the `description`
   - Use appropriate `header` (e.g., "Critical", "High", "Medium", "Low")

3. After the user selects issues for this priority level, ask: "Do you have any additional instructions for how you want me to address these [priority level] issues?"

4. Store the selected issues and any additional instructions

## Step 5: Format and Display Response

Create a response in this exact format:

```
# {PR Number} - {PR Title}

View PR: {PR URL}

{2 sentence summary of Claude's review}

---

## 🔴 Critical Issues Doing

{list of selected critical issues}

{any additional instructions for critical issues}

## 🔴 Critical Issues Skipping

{list of unselected critical issues}

---

## ⚠️ High Priority Issues Doing

{list of selected high priority issues}

{any additional instructions for high priority issues}

## ⚠️ High Priority Issues Skipping

{list of unselected high priority issues}

---

## Medium Priority Issues Doing

{list of selected medium priority issues}

{any additional instructions for medium priority issues}

## Medium Priority Issues Skipping

{list of unselected medium priority issues}

---

## Low Priority Issues Doing

{list of selected low priority issues}

{any additional instructions for low priority issues}

## Low Priority Issues Skipping

{list of unselected low priority issues}

---
```

## Step 6: Ask Next Steps

Use the AskUserQuestion tool to ask:

**Question:** "Would you like me to:"
**Header:** "Next Steps"
**Options:**

- Label: "Fix the selected issues"
  Description: "I'll start working on fixing all the selected issues immediately"
- Label: "Create a plan for fixing"
  Description: "I'll create a detailed implementation plan using the TodoWrite tool"
- Label: "Something else"
  Description: "Provide custom instructions for what to do next"

**Important Notes:**

- Only show priority level sections that have issues (omit empty sections)
- If a priority level has no selected issues, you can omit the "Doing" subsection
- If a priority level has no skipped issues, you can omit the "Skipping" subsection
- Be careful when parsing the comment - Claude's review format may vary
- Handle cases where no Claude comment is found gracefully
