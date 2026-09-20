/* ============================================================
   CV PDF generator — renders the passed HTML filename argument with Puppeteer and produces one A4 PDF

   Usage: npm run generate:pdf -f filename (from the script directory @ `.opencode/skills/cv-gen/scripts`)
   ============================================================ */

"use strict";

const fileindex = process.argv.indexOf("-f");
const filename = fileindex !== -1 ? process.argv[fileindex+1] : null;
if (!filename) {
  console.error("Error: The value of argument -f doesn't exist within the .agent directory");
  process.exit(1);
}

const path = require("path");
const { pathToFileURL } = require("url");
const puppeteer = require("puppeteer");
const fs = require("fs")

const CV_PAGE = path.resolve(__dirname, "..", "..", "..", "..", ".agent", "cvs", `${filename}.html`,);
const OUT_DIR = path.resolve(__dirname, "..", "..", "..", "..", ".agent", "cvs", `Luca-Di-Giacomo-CV-${filename}.pdf`);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(CV_PAGE).href, {waitUntil: "networkidle0"});

    const outPath = path.join(OUT_DIR);
    await page.pdf({
      path: outPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });

    await page.close();
    fs.unlinkSync(CV_PAGE);
    console.log("Generated:", outPath);
  } finally {
    await browser.close();
  }

  console.log("Done.");
})().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});