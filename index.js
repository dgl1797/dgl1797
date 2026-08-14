let currentLang = 'en';
let currentTheme = 'dark'; // 'dark' | 'light'

// Lang toggle
function switchLang(lang) {
  currentLang = lang;
  document.getElementById('content-en').style.display = lang === 'en' ? 'block' : 'none';
  document.getElementById('content-it').style.display = lang === 'it' ? 'block' : 'none';
  document.getElementById('nav-en').style.display = lang === 'en' ? 'flex' : 'none';
  document.getElementById('nav-it').style.display = lang === 'it' ? 'flex' : 'none';
  document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('active', b.dataset.lang === lang));
  document.documentElement.lang = lang;

  const birth = document.getElementById('p-birth');
  if (lang === 'en') {
    birth.innerHTML = '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 17 Mar 1997 · Italian';
  } else {
    birth.innerHTML = '<svg class="pc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 17 Mar 1997 · Italiano';
  }
}

// Theme toggle (dark terminal <-> light terminal)
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.classList.toggle('light-terminal', currentTheme === 'light');
  const dot = document.getElementById('theme-dot');
  dot.className = 'theme-dot ' + currentTheme;
  document.getElementById('theme-label').textContent = currentTheme === 'dark' ? 'theme' : 'theme';
}

// PDF download — two-column professional layout
function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const isEn = currentLang === 'en';

  const pageW = 210;
  const pageH = 297;
  const footerZone = 14;      // reserved space at bottom of every page
  const marginTop = 20;
  const marginRight = 16;

  // ---- two-column grid ----
  const sidebarW = 64;        // dark sidebar width
  const gutter = 8;           // gap between sidebar and main column
  const mainLeft = sidebarW + gutter;
  const mainRight = pageW - marginRight;
  const mainWidth = mainRight - mainLeft;

  const sidePad = 9;
  const sideX = sidePad;
  const sideMaxW = sidebarW - 2 * sidePad;

  let y = marginTop;   // main column cursor
  let sy = 22;          // sidebar cursor (sidebar content lives on page 1 only)

  const COLORS = {
    sidebarBg: [26, 26, 46],       // #1a1a2e
    accent: [37, 99, 235],         // #2563eb
    accentLight: [147, 197, 253],  // #93c5fd
    dark: [26, 26, 46],            // #1a1a2e
    gray: [85, 85, 85],            // #555
    text: [51, 51, 51],            // #333
    faint: [136, 136, 136],        // #888
    line: [222, 222, 222],
    white: [255, 255, 255],
    sideText: [226, 226, 236],
    sideFaint: [172, 172, 194],
    sideDivider: [72, 72, 104],
    sideLink: [147, 197, 253]
  };

  // ---------- low-level helpers ----------

  function setColor(setter, rgb) {
    setter(rgb[0], rgb[1], rgb[2]);
  }

  // Fills the dark sidebar band (plus a thin accent seam) on a given page.
  function drawSidebarBg(pageNum) {
    doc.setPage(pageNum);
    setColor(doc.setFillColor.bind(doc), COLORS.sidebarBg);
    doc.rect(0, 0, sidebarW, pageH, 'F');
    setColor(doc.setFillColor.bind(doc), COLORS.accent);
    doc.rect(sidebarW, 0, 1, pageH, 'F');
  }

  function checkPageBreak(neededHeight) {
    if (y + neededHeight > pageH - footerZone) {
      doc.addPage();
      drawSidebarBg(doc.internal.getNumberOfPages());
      y = marginTop;
      return true;
    }
    return false;
  }

  // ---------- main column helpers ----------

  function addText(text, opts = {}) {
    const {
      bold = false,
      italic = false,
      fontSize = 10,
      color = COLORS.text,
      gap = 4,
      maxWidth = mainWidth,
      align = 'left',
      x = mainLeft
    } = opts;
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.42;
    checkPageBreak(lines.length * lineHeight + gap);
    doc.text(lines, x, y, { align, maxWidth });
    y += lines.length * lineHeight + gap;
    return y;
  }

  // Section header: accent tab + title + underline, spans the main column.
  function addSectionHeader(title) {
    checkPageBreak(18);
    y += 3;
    setColor(doc.setFillColor.bind(doc), COLORS.accent);
    doc.rect(mainLeft, y - 3.6, 2.4, 4.6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    setColor(doc.setTextColor.bind(doc), COLORS.dark);
    doc.text(title.toUpperCase(), mainLeft + 5, y);
    y += 2.5;
    setColor(doc.setDrawColor.bind(doc), COLORS.line);
    doc.setLineWidth(0.35);
    doc.line(mainLeft, y, mainRight, y);
    y += 6;
  }

  // Job / degree header row: bold title left, date range right-aligned
  // on the same baseline so entries read cleanly as a timeline.
  function addEntryHeader(title, dateRange, minFollowing = 12) {
    checkPageBreak(9 + minFollowing);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(doc.setTextColor.bind(doc), COLORS.dark);
    const titleLines = doc.splitTextToSize(title, mainWidth - 40);
    doc.text(titleLines, mainLeft, y);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    setColor(doc.setTextColor.bind(doc), COLORS.accent);
    doc.text(dateRange, mainRight, y, { align: 'right' });
    y += titleLines.length * 4 + 3.5;
  }

  // Bullet line with a hanging indent so wrapped text aligns under the
  // first word instead of under the bullet glyph.
  function addBullet(text, opts = {}) {
    const { fontSize = 8, color = COLORS.text, gap = 1.6 } = opts;
    const bulletIndent = 4.2;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, mainWidth - bulletIndent);
    const lineHeight = fontSize * 0.42;
    checkPageBreak(lines.length * lineHeight + gap);
    doc.text('•', mainLeft, y);
    doc.text(lines, mainLeft + bulletIndent, y);
    y += lines.length * lineHeight + gap;
  }

  // Clickable link (main column) — accent underlined text instead of raw URL.
  function addLink(text, url, opts = {}) {
    const {
      fontSize = 8.5,
      color = COLORS.accent,
      bold = false,
      x = mainLeft,
      yPos = y
    } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const width = doc.getTextWidth(text);
    doc.textWithLink(text, x, yPos, { url });
    setColor(doc.setDrawColor.bind(doc), color);
    doc.setLineWidth(0.25);
    doc.line(x, yPos + 0.8, x + width, yPos + 0.8);
    return width;
  }

  function addSubLabel(text, minFollowing = 6) {
    checkPageBreak(6 + minFollowing);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setColor(doc.setTextColor.bind(doc), COLORS.accent);
    doc.text(text, mainLeft, y);
    y += 4.2;
  }

  // ---------- sidebar helpers (content lives on page 1, which is short by design) ----------

  function sideText(text, opts = {}) {
    const {
      bold = false, italic = false, fontSize = 8.5,
      color = COLORS.sideText, gap = 3
    } = opts;
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, sideMaxW);
    const lineHeight = fontSize * 0.42;
    doc.text(lines, sideX, sy);
    sy += lines.length * lineHeight + gap;
  }

  function sideHeading(text) {
    sy += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    setColor(doc.setTextColor.bind(doc), COLORS.accentLight);
    doc.text(text.toUpperCase(), sideX, sy);
    sy += 2.5;
    setColor(doc.setDrawColor.bind(doc), COLORS.sideDivider);
    doc.setLineWidth(0.3);
    doc.line(sideX, sy, sidebarW - sidePad, sy);
    sy += 5;
  }

  function sideDivider() {
    sy += 1;
    setColor(doc.setDrawColor.bind(doc), COLORS.sideDivider);
    doc.setLineWidth(0.2);
    doc.line(sideX, sy, sidebarW - sidePad, sy);
    sy += 5;
  }

  function sideLink(text, url, opts = {}) {
    const { fontSize = 8.5, color = COLORS.sideLink, gap = 3 } = opts;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, sideMaxW);
    doc.textWithLink(lines[0], sideX, sy, { url });
    setColor(doc.setDrawColor.bind(doc), color);
    doc.setLineWidth(0.2);
    const w = doc.getTextWidth(lines[0]);
    doc.line(sideX, sy + 0.8, sideX + w, sy + 0.8);
    sy += fontSize * 0.42 + gap;
  }

  // ================= SIDEBAR (left column) =================

  drawSidebarBg(1);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  setColor(doc.setTextColor.bind(doc), COLORS.white);
  const nameLines = doc.splitTextToSize('Luca Di Giacomo', sideMaxW);
  doc.text(nameLines, sideX, sy);
  sy += nameLines.length * 7 + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(doc.setTextColor.bind(doc), COLORS.accentLight);
  const titleLines = doc.splitTextToSize('AI & Data Specialist | M.Sc. Artificial Intelligence & Data Engineering', sideMaxW);
  doc.text(titleLines, sideX, sy);
  sy += titleLines.length * 3.9 + 5;

  sideDivider();

  sideLink('(+39) 3405133275', 'tel:+393405133275', { fontSize: 8.5 });
  sideLink('digiacomoluca1797@gmail.com', 'mailto:digiacomoluca1797@gmail.com', { fontSize: 8.5 });
  sideLink(isEn ? 'personal website' : 'sito personale', 'https://dgl1797.github.io/dgl1797/', { fontSize: 8.5 });
  sideLink('LinkedIn', 'https://www.linkedin.com/in/luca-di-giacomo-78267a38b', { fontSize: 8.5 });
  sideText(
    isEn ? 'Date of birth: March 17, 1997   |   Nationality: Italian' : 'Data di nascita: 17 Marzo 1997   |   Nazionalità: Italiana',
    { fontSize: 8, color: COLORS.sideFaint, gap: 2 }
  );

  sideDivider();

  sideHeading(isEn ? 'Technical Skills' : 'Competenze Tecniche');
  if (isEn) {
    sideText('Software Engineering', { fontSize: 8.5, bold: true, color: COLORS.accentLight, gap: 2 });
    sideText('SQL, Node.js, Spring Boot, FastAPI, Flask, Java, JavaScript/TypeScript, Git, Docker, React.js, Angular, Python, C/C++, MySQL, MongoDB, Redis, Neo4j, Qdrant.', { fontSize: 7.5, gap: 4 });
    sideText('Artificial Intelligence', { fontSize: 8.5, bold: true, color: COLORS.accentLight, gap: 2 });
    sideText('Machine Learning, Deep Learning, Pandas, NumPy, Scikit-learn, OpenCV, LLM, Computer Vision, NLP, RAG, Coding Agents (Skills, Tools, MCP, Prompt Engineering), Agent Development Frameworks (LangGraph).', { fontSize: 7.5, gap: 2 });
  } else {
    sideText('Software Engineering', { fontSize: 8.5, bold: true, color: COLORS.accentLight, gap: 2 });
    sideText('SQL, Node.js, Springboot, Fastapi, Flask, Java, Javascript/Typescript, Git, Docker, React.js, Angular, Python, C/C++, MySQL, MongoDB, Redis, Neo4j, Qdrant.', { fontSize: 7.5, gap: 4 });
    sideText('Artificial Intelligence', { fontSize: 8.5, bold: true, color: COLORS.accentLight, gap: 2 });
    sideText('Machine Learning, Deep Learning, Pandas, Numpy, Scikit-learn, OpenCV, LLM, Computer Vision, NLP, RAG, Coding Agents (Skills, Tools, MCP, Prompt Engineering), Agent Development Frameworks (LangGraph).', { fontSize: 7.5, gap: 2 });
  }

  sideDivider();

  sideHeading(isEn ? 'Soft Skills' : 'Competenze Trasversali');
  sideText(
    isEn
      ? 'Teamwork, Executive Communication, Adaptability, Critical Thinking, Cross-functional Collaboration, Problem Solving, Creativity.'
      : 'Teamwork, Comunicazione dei risultati, Flessibilità, Pensiero critico, Collaborazione cross-funzionale, Problem Solving, Creatività.',
    { fontSize: 7.5, gap: 2 }
  );

  sideDivider();

  sideHeading(isEn ? 'Languages' : 'Competenze Linguistiche');
  sideText(
    isEn ? 'Italian: C2 (Native)   |   English: C1 (Advanced)' : 'Italiano: C2 (Madrelingua)   |   Inglese: C1 (Livello Avanzato)',
    { fontSize: 8, gap: 2 }
  );

  // GDPR notice, pinned near the bottom of the sidebar
  const gdprText = isEn
    ? 'I authorize the processing of my personal data in accordance with Italian Legislative Decree 196/2003 and Regulation (EU) 2016/679 (GDPR).'
    : 'Autorizzo il trattamento dei miei dati personali ai sensi del d. lgs. 196/2003 e del GDPR 679/16.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  setColor(doc.setTextColor.bind(doc), COLORS.sideFaint);
  const gdprLines = doc.splitTextToSize(gdprText, sideMaxW);
  const gdprH = gdprLines.length * 6.5 * 0.42;
  doc.text(gdprLines, sideX, pageH - 10 - gdprH);

  // ================= MAIN COLUMN (right) =================

  addSectionHeader(isEn ? 'Professional Summary' : 'Profilo Professionale');
  if (isEn) {
    addText('AI & Software Engineer with a solid academic background from Politecnico di Torino (B.Sc. in Computer Engineering) and the University of Pisa (M.Sc. in Artificial Intelligence and Data Engineering). I combine advanced Software Engineering competencies with AI Engineering expertise. Backed by experience in both IT consulting and product development, I have built strong problem-solving abilities, a collaborative mindset, and high adaptability.', { fontSize: 8.5, color: COLORS.text, gap: 4 });
  } else {
    addText('AI & Software Engineer con un solido background accademico tra il Politecnico di Torino (Laurea Triennale in Ingegneria Informatica) e l\'Università di Pisa (Laurea Magistrale in Artificial Intelligence and Data Engineering). Unisco competenze avanzate di Software Engineering e di AI Engineering. Grazie all\'esperienza maturata tra consulenza e sviluppo di prodotto, ho affinato spiccate capacità di problem solving, attitudine al lavoro di squadra e un\'elevata flessibilità.', { fontSize: 8.5, color: COLORS.text, gap: 4 });
  }

  addSectionHeader(isEn ? 'Work Experience' : 'Esperienza Lavorativa');

  addEntryHeader(
    'DATA & AI SPECIALIST — Deloitte NextHub S.r.l. S.B.',
    isEn ? 'Jan 2026 – Present' : 'Gen 2026 – Presente'
  );
  if (isEn) {
    addBullet('Data Analysis & Data Science: Advanced analytical tasks focused on forecasting and clustering algorithms. [Python, Pandas, NumPy, Plotly, Statsmodels, Scikit-learn]');
    addBullet('Automation: Script development to automate and optimize internal team workflows. [Python, Streamlit, Pandas]');
    addBullet('GenAI Technical Support: Maintaining and optimizing the Knowledge Base for internal agentic systems. [HTML, CSS, JavaScript, Markdown]');
    addBullet('Prompt Engineering: Designing prompts, skills, and context frameworks for GenAI integration in EDP systems. [Markdown, Python, Databricks]');
    addBullet('Work Organization & Management: Managing concurrent tasks within Agile/SCRUM framework. [MS Teams, MS Tasks, MS SharePoint]', { gap: 4 });
  } else {
    addBullet('Data Analysis & Data Science: Task di analisi avanzata orientati a forecasting e clustering. [Python, Pandas, NumPy, Plotly, Statsmodels, Scikit-learn]');
    addBullet('Automation: Sviluppo di script per automazione ed efficientamento di processi interni. [Python, Streamlit, Pandas]');
    addBullet('GenAI Technical Support: Supporto per Knowledge Base di sistemi agentici interni. [HTML, CSS, JavaScript, Markdown]');
    addBullet('Prompt Engineering: Creazione di prompt, skills e contesti per GenAI in EDP. [Markdown, Python, Databricks]');
    addBullet('Work Organization & Management: Gestione task multipli in Agile/SCRUM. [MS Teams, MS Task, MS SharePoint]', { gap: 4 });
  }

  addEntryHeader(
    isEn ? 'FULL STACK DEVELOPER (Internship & Freelance) — Fragments S.r.l.' : 'STAGE E COLLABORAZIONE — FULL STACK DEVELOPER — Fragments S.r.l.',
    isEn ? 'Mar 2021 – Dec 2021' : 'Mar 2021 – Dic 2021'
  );
  if (isEn) {
    addBullet('Serverless Web Applications on AWS and Node.js. [React, Redux, Axios, Lambda Functions, RESTful APIs, MySQL, MongoDB]');
    addBullet('Unit testing and bug fixing on management software. [Jest, JavaScript, TypeScript]');
    addBullet('Agile/SCRUM development. [Jira, Slack, GitHub, GitHub Actions]', { gap: 4 });
  } else {
    addBullet('Web App Serverless su AWS e Node.js. [React, Redux, Axios, Lambda Functions, RESTful APIs, MySQL, MongoDB]');
    addBullet('Unit testing e bugfixing su prodotto gestionale. [Jest, JavaScript, TypeScript]');
    addBullet('Sviluppo Agile/SCRUM. [Jira, Slack, GitHub, GitHub Actions]', { gap: 4 });
  }

  // ---------- education ----------

  addSectionHeader(isEn ? 'Education & Training' : 'Istruzione e Formazione');

  addEntryHeader(
    isEn ? 'M.Sc. in Artificial Intelligence and Data Engineering (LM-32)' : 'Laurea Magistrale in Artificial Intelligence and Data Engineering (LM-32)',
    isEn ? 'Aug 2021 – Oct 2025' : 'Ago 2021 – Ott 2025',
    24 // institution/grade line, thesis line, project link and sub-label follow
  );
  addText(isEn ? 'University of Pisa   |   Final Grade: 108/110' : 'Università di Pisa   |   Valutazione: 108/110', { fontSize: 8, color: COLORS.gray, gap: 2 });
  addText(isEn ? 'Thesis: Model Weight Learning as a Novel Paradigm in Computer Vision' : 'Tesi: Model Weight Learning as a Novel Paradigm in Computer Vision', { fontSize: 8, italic: true, color: COLORS.text, gap: 2 });
  addLink(isEn ? 'Key Projects' : 'Progetti', 'https://github.com/dgl1797/University-of-Pisa-Projects', { fontSize: 9, color: COLORS.accent, bold: true });
  y += 6.5;

  const aiProjectsEn = [
    'FPA-Augmented Classification: Data Mining pipeline for Frequent Pattern extraction. [Jupyter, Scikit-learn, Imblearn, SMOTE, mlxtend, Flask, React]',
    'Super Resolution for Computer Vision: Deep Learning architectures including SRGAN. [PyTorch, TensorFlow, Google Colab]',
    'NLP Search Engine: High-performance search over MS-MARCO corpus. [Java]',
    'Research Paper RAG System: End-to-end RAG web app with Vector Search. [OpenAI API, Svelte, FastAPI, MongoDB, Qdrant]',
    'Thesis: Autoencoder for weight-injection enabling zero-shot knowledge integration. [PyTorch, CUDA, Hydra, W&B, Hugging Face]'
  ];
  const swProjectsEn = [
    'Playlist Management Social Network: Social platform with real-time recommendation. [Express.js, TypeScript, React, Redux, Redis, MongoDB, Neo4j]',
    'Mobile Sensing for Road Quality: Smartphone telemetry + GCP pipeline. [Kotlin, Android Studio, Node.js, Google Cloud Run, Firebase]',
    'Distributed Chat System: Distributed web with Erlang microservice. [Erlang, Java, JSP, HTML, CSS, MySQL, Nginx]',
    'IoT System for Industrial Monitoring: End-to-end with MQTT/CoAP, Grafana. [Java, MQTT, CoAP, Grafana, MySQL, Contiki-NG]'
  ];
  const aiProjectsIt = [
    'FPA-Augmented Classification: Pipeline Data Mining per Frequent Pattern. [Jupyter, Scikit-learn, Imblearn, SMOTE, mlxtend, Flask, React]',
    'Super Resolution per Computer Vision: Architetture Deep Learning incluso SRGAN. [PyTorch, TensorFlow, Google Colab]',
    'NLP Search Engine: Motore di ricerca su MS-MARCO. [Java]',
    'Research Paper RAG System: Web app RAG con Vector Search. [OpenAI API, Svelte, FastAPI, MongoDB, Qdrant]',
    'Tesi: Autoencoder per weight-injection zero-shot. [PyTorch, CUDA, Hydra, W&B, Hugging Face]'
  ];
  const swProjectsIt = [
    'Social Network per Playlist: Raccomandazione in tempo reale. [Express.js, TypeScript, React, Redux, Redis, MongoDB, Neo4j]',
    'Mobile Sensing: Telemetria smartphone + GCP. [Kotlin, Android Studio, Node.js, Google Cloud Run, Firebase]',
    'Distributed Chat System: Architettura distribuita con Erlang. [Erlang, Java, JSP, HTML, CSS, MySQL, Nginx]',
    'IoT System: Monitoraggio con MQTT/CoAP, Grafana. [Java, MQTT, CoAP, Grafana, MySQL, Contiki-NG]'
  ];
  const aiProjects = isEn ? aiProjectsEn : aiProjectsIt;
  const swProjects = isEn ? swProjectsEn : swProjectsIt;

  addSubLabel('AI Engineering', 8);
  aiProjects.forEach(p => addBullet(p, { fontSize: 7.5 }));
  y += 1;
  addSubLabel('Software Engineering', 8);
  swProjects.forEach(p => addBullet(p, { fontSize: 7.5 }));
  y += 2;

  addEntryHeader(
    isEn ? 'B.Sc. in Computer Engineering (L-8)' : 'Laurea Triennale in Ingegneria Informatica (L-8)',
    isEn ? 'Sep 2015 – Jul 2021' : 'Set 2015 – Lug 2021',
    22 // institution line + sub-label + first bullet all belong together
  );
  addText(isEn ? 'Politecnico di Torino' : 'Politecnico di Torino', { fontSize: 8, color: COLORS.gray, gap: 3 });
  addSubLabel(isEn ? 'Key Coursework' : 'Esami principali', 8);
  if (isEn) {
    addBullet('Algorithms and Data Structures: Optimization, complexity analysis, practical implementation. [C/C++]', { fontSize: 7.5 });
    addBullet('Databases: Relational algebra and SQL with web project. [SQL, JS, HTML, CSS]', { fontSize: 7.5 });
    addBullet('Object-Oriented Programming: Software Engineering, OOP. [UML, Java]', { fontSize: 7.5 });
    addBullet('Operating Systems: OS fundamentals and multi-thread programming. [C/C++]', { fontSize: 7.5 });
    addBullet('Computer Networks: ISO/OSI communication protocols.', { fontSize: 7.5, gap: 4 });
  } else {
    addBullet('Algoritmi e Strutture Dati: Principali algoritmi, ottimizzazione e complessità computazionale. [C/C++]', { fontSize: 7.5 });
    addBullet('Basi di Dati: Algebra relazionale e RDBMs SQL con progetto pratico. [SQL, JS, HTML, CSS]', { fontSize: 7.5 });
    addBullet('Programmazione a Oggetti: Software Engineering, Ciclo di vita, OOP. [UML, Java]', { fontSize: 7.5 });
    addBullet('Sistemi Operativi: Sistemi operativi e multi-thread programming. [C/C++]', { fontSize: 7.5 });
    addBullet('Reti di Calcolatori: Protocolli di comunicazione ISO/OSI.', { fontSize: 7.5, gap: 4 });
  }

  // ---------- footer (page numbers, added last across every page) ----------

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.faint);
    doc.text('Luca Di Giacomo — Curriculum Vitae', mainLeft, pageH - 9);
    doc.text(`${i} / ${totalPages}`, mainRight, pageH - 9, { align: 'right' });
  }

  doc.save('Luca_Di_Giacomo_Resume_' + (isEn ? 'EN' : 'IT') + '.pdf');
}