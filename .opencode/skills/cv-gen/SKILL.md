---
name: cv-gen
description: use this skill when asked to generate a CV to convert the web-site information into a professional, printable, PDF Resume, customized for employers and user needs.
---

# Skill
Your job is to compile a resume to be printed in PDF, use a cv-pdf.html to render the components of the resume with the required color palette, then use puppeteer to convert it into PDF format.

## Phase 1 - Setup
Run a brainstorming with the user to understand:
* What role are they are applying for
* Specific job details and description
* The required skills for the job if any
* The nice-to-have skills for the job if any
* The desired layout of the CV
* The desired color-palette for the CV
* Other details relevant to generate a professional CV (photo, personal information to be shared, etc...)

## Phase 2 - Resume Generation
1. Read the `site/index.html` web-site to get an overview of the user information that are relevant to the setup phase
2. Read the `.opencode/skills/cv-gen/template/sections.md` template to understand the sections that the user wants to include in the CV
3. For each section of the template: 
  - show the user a draft of the section, then wait for a feedback.
  - add the section in the HTML representing a 1-to-1 copy of the final PDF @ `.agent/cvs/<session-id>.html`
  - advance to the next section of the template and repeat the step 3 until all sections are covered
4. Let the user test the layout and **wait for user confirmation before proceeding**
5. Execute the script @ `.opencode/skills/cv-gen/scripts/generate-cvpdf.js` passing it the session-id decided by the user as argument

# Guardrails
- **Session:** BEFORE ANYTHING - ALWAYS ask the user for a session-id, it is mandatory to execute the skill!
- **Locality:** Every generated file MUST BE LOCATED within the `.agent` directory
- **Language:** IT MUST BE THE USER TO DECIDE THE OUTPUT LANGUAGE OF THE CV
- **Cleanup:** ALWAYS ensure that at the end of this skill execution, only pdf files are within `.agent/cvs/` directory
- **Professionality:** ALWAYS use professional layouts strictly following the professionality rules below:
  * ALWAYS Use A4 format directly in the HTML reproducing a 1-to-1 copy of the final PDF
  * NEVER break page in the middle of a section, readability is a MUST
- **Legality:** NEVER invent information that are not in the web-site only to accomodate the job-descriptions. EVERYTHING YOU WRITE MUST BE EITHER AN INFO ASKED TO THE USER OR EXTRACTED FROM THE WEB-SITE, IT IS ESSENTIAL TO NOT FALL IN LEGAL ISSUES!