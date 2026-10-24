---
description: restarts completely from zero, completely deleting .agent directory and site files
---

`$ARGUMENTS`

## Workflow
1. Delete all files within `site/*.*`
2. Delete the directory `.agent` and everything that is inside it
3. Brainstorm with the user to get his personal data that must be included in the website or check if the data are already passed as `$ARGUMENTS`
4. Produce a `DATA.md` file within `.agent/DATA.md` containing all the info that must be included in the website
5. Proceed with the standard loop within `AGENTS.md`

## Advices
- ALWAYS advice the user when the personal data the user may want to include are particularly sensitive to be published on a website (telephone number; email; passwords; link to repositories that may expose private keys, etc...)
- ALWAYS offer an alternative whenever the user wants to include dangerous information rather than just discarding the possibility (for example: use a mailing service that guards your email while redirecting messages to it)