---
name: cv-gen
description: use this skill to convert the web-site information into a professional, printable, PDF Curriculum Vitae, customized for employers, depending on their job description and site palette.
---

# Skill
Your job is to compile a resume to be printed in PDF, use a cv-pdf.html to render the components of the resume with the required color palette, then use puppeteer to convert it into PDF format.

## Phase 1 - Setup
1. Ask questions about the employer (the user may decide to generate a generic CV):
  * What role are they seeking
  * The specific job description
  * The required skills for the job
  * The nice-to-have skills for the job
  * The color-palette used by their site
2. Read the `site/index.html` web-site and extract the information needed to compile a first draft of `.opencode/skills/cv-gen/template/sections.md` located @ `.agent/cvs/<session-id>_template.md`
3. For each uncompiled section of the generated template, run a brainstorming with the user to define how it must be compiled, proposing ideas that merge the curriculum of the user with the job description of the employer
4. Finalize the markdown compiling basing on user's choices
5. Create the `.agent/cvs/<session-id>.html` file according with the emerged requirements
6. Let user test the layout and **wait for user confirmation before proceeding**
7. Delete the `.agent/cvs/<session-id>_template.md` file
8. Execute the script @ `.opencode/skills/cv-gen/scripts/generate-cvpdf.js` passing it the session-id decided by the user as argument

# Guardrails
- **Session:** BEFORE ANYTHING - ALWAYS ask the user for a session-id, it is mandatory to execute the skill!
- **Locality:** Every generated file MUST BE LOCATED within the `.agent` directory
- **Language:** IT MUST BE THE USER TO DECIDE THE OUTPUT LANGUAGE OF THE CV
- **Cleanup:** ALWAYS ensure that at the end of this skill execution, only pdf files are within `.agent/cvs/` directory