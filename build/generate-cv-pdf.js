/* ============================================================
   CV PDF generator — renders site/assets/cv-page.html with Puppeteer
   and produces one A4 PDF per language in the site/assets/ folder:
     - site/assets/CV_Luca_Di_Giacomo_EN.pdf
     - site/assets/CV_Luca_Di_Giacomo_IT.pdf
   Usage: npm run generate:pdf (from the build/ directory)
   ============================================================ */

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");
const puppeteer = require("puppeteer");

const CV_PAGE = path.resolve(__dirname, "..", "site", "assets", "cv-page.html");
const OUT_DIR = path.resolve(__dirname, "..", "site", "assets");

const VERSIONS = [
  { lang: "en", hide: "cv-it", file: "CV_Luca_Di_Giacomo_EN.pdf" },
  { lang: "it", hide: "cv-en", file: "CV_Luca_Di_Giacomo_IT.pdf" },
];

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const version of VERSIONS) {
      const page = await browser.newPage();
      await page.goto(pathToFileURL(CV_PAGE).href, {
        waitUntil: "networkidle0",
      });

      // Keep only the requested language version
      await page.evaluate((hideId) => {
        const el = document.getElementById(hideId);
        if (!el) throw new Error("Element not found: " + hideId);
        el.style.display = "none";
      }, version.hide);

      const outPath = path.join(OUT_DIR, version.file);
      await page.pdf({
        path: outPath,
        format: "A4",
        printBackground: true,
        // Vertical margins apply to EVERY page (the .cv element padding
        // only pads the very start/end of the document flow).
        margin: { top: "11mm", right: "0", bottom: "11mm", left: "0" },
      });

      await page.close();
      console.log("Generated:", outPath);
    }
  } finally {
    await browser.close();
  }

  console.log("Done.");
})().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
