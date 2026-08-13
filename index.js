function downloadPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const isEn = currentLang === 'en';

  const pageW = 210;
  const pageH = 297;
  const margin = 18;
  const maxW = pageW - 2 * margin;
  const footerZone = 15; // reserved space at bottom of every page
  let y = margin;

  const COLORS = {
    headerBg: [23, 24, 43],        // #17182b deep navy
    accent: [37, 99, 235],         // #2563eb
    accentDark: [29, 78, 216],     // #1d4ed8
    accentLight: [219, 234, 254],  // #dbeafe
    accentBorder: [147, 197, 253], // #93c5fd
    chipFill: [238, 243, 255],     // #eef3ff
    panelBg: [248, 249, 252],      // #f8f9fc
    panelBorder: [227, 231, 238],  // #e3e7ee
    dark: [24, 26, 32],            // #181a20
    gray: [90, 96, 108],           // #5a606c
    text: [51, 55, 64],            // #333740
    faint: [140, 146, 158],        // #8c929e
    line: [220, 224, 232],         // #dce0e8
    white: [255, 255, 255]
  };
  const FONT = 'helvetica';

  // ---------- low-level helpers ----------

  function checkPageBreak(neededHeight) {
    if (y + neededHeight > pageH - footerZone) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  }

  function setColor(setter, rgb) {
    setter(rgb[0], rgb[1], rgb[2]);
  }

  function setFont(weight, size) {
    doc.setFont(FONT, weight);
    doc.setFontSize(size);
  }

  function addText(text, opts = {}) {
    const {
      bold = false,
      italic = false,
      fontSize = 10,
      color = COLORS.text,
      gap = 4,
      maxWidth = maxW,
      align = 'left',
      x = margin
    } = opts;
    const style = bold && italic ? 'bolditalic' : bold ? 'bold' : italic ? 'italic' : 'normal';
    doc.setFont(FONT, style);
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, maxWidth);
    const lineHeight = fontSize * 0.42;
    checkPageBreak(lines.length * lineHeight + gap);
    doc.text(lines, x, y, { align, maxWidth });
    y += lines.length * lineHeight + gap;
    return y;
  }

  // Section header: uppercase title + accent rule.
  function addSectionHeader(title) {
    checkPageBreak(18);
    y += 3.2;
    doc.setFont(FONT, 'bold');
    doc.setFontSize(11.5);
    setColor(doc.setTextColor.bind(doc), COLORS.dark);
    doc.text(title.toUpperCase(), margin, y);
    y += 2.4;
    setColor(doc.setDrawColor.bind(doc), COLORS.accent);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageW - margin, y);
    y += 5.6;
  }

  // Job / degree header row: bold title on the left, date on the right,
  // aligned on the same baseline.
  function addEntryHeader(title, dateRange, minFollowing = 12) {
    checkPageBreak(10 + minFollowing);
    setFont('normal', 7.5);
    const dw = doc.getTextWidth(dateRange);
    doc.setFont(FONT, 'bold');
    doc.setFontSize(9.5);
    setColor(doc.setTextColor.bind(doc), COLORS.dark);
    const titleLines = doc.splitTextToSize(title, maxW - dw - 6);
    doc.text(titleLines, margin, y);
    setColor(doc.setTextColor.bind(doc), COLORS.gray);
    doc.text(dateRange, pageW - margin, y, { align: 'right' });
    y += titleLines.length * 4 + 3.5;
  }

  // Bullet line with a small accent square marker and hanging indent.
  function addBullet(text, opts = {}) {
    const { fontSize = 8, color = COLORS.text, gap = 1.6 } = opts;
    const bulletIndent = 4.8;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(fontSize);
    setColor(doc.setTextColor.bind(doc), color);
    const lines = doc.splitTextToSize(text, maxW - bulletIndent);
    const lineHeight = fontSize * 0.42;
    checkPageBreak(lines.length * lineHeight + gap);
    setColor(doc.setFillColor.bind(doc), COLORS.accent);
    doc.rect(margin, y - 1.15, 1.1, 1.1, 'F');
    doc.text(lines, margin + bulletIndent, y);
    y += lines.length * lineHeight + gap;
  }

  // Clickable link with underlined shown text instead of the raw URL.
  function addLink(text, url, opts = {}) {
    const {
      fontSize = 8.5,
      color = COLORS.accent,
      bold = false,
      x = margin,
      yPos = y
    } = opts;
    doc.setFont(FONT, bold ? 'bold' : 'normal');
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
    setColor(doc.setFillColor.bind(doc), COLORS.accentDark);
    doc.rect(margin, y - 1.15, 2.6, 0.7, 'F');
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.5);
    setColor(doc.setTextColor.bind(doc), COLORS.accentDark);
    doc.text(text.toUpperCase(), margin + 3.8, y);
    y += 4.4;
  }

  // ---------- chips ----------

  // Splits items into wrapping rows within a given width (based on the
  // current font settings) without drawing anything.
  function measureChips(items, opts = {}) {
    const { fontSize = 7.5, maxWidth = maxW, gap = 2.4, padX = 2.4 } = opts;
    doc.setFont(FONT, 'normal');
    doc.setFontSize(fontSize);
    const markerW = 2.4;
    const widths = items.map(t => doc.getTextWidth(t) + markerW);
    const rows = [];
    let cur = [];
    let lineW = 0;
    items.forEach((t, i) => {
      const w = widths[i];
      if (cur.length && lineW + gap + w > maxWidth) {
        rows.push(cur);
        cur = [];
        lineW = 0;
      }
      cur.push(t);
      lineW += (lineW ? gap : 0) + w;
    });
    if (cur.length) rows.push(cur);
    const chipH = fontSize * 0.42 + 1.6;
    const rowGap = 1.6;
    return { rows, chipH, rowGap };
  }

  function drawChipRow(ids, x, rowTop, fontSize = 7.5) {
    const markerW = 2.4;
    const lineH = fontSize * 0.42;
    const baseline = rowTop + 1.2 + lineH * 0.78;
    let cx = x;
    ids.forEach(t => {
      setColor(doc.setFillColor.bind(doc), COLORS.accent);
      doc.rect(cx, baseline - 1.05, 0.9, 0.9, 'F');
      doc.setTextColor(...COLORS.text);
      doc.text(t, cx + markerW, baseline);
      cx += markerW + doc.getTextWidth(t) + 2.4;
    });
  }

  function renderChips(items, opts = {}) {
    const { fontSize = 7.5 } = opts;
    const m = measureChips(items, { fontSize, maxWidth: maxW });
    const chipsH = m.rows.length * m.chipH + (m.rows.length - 1) * m.rowGap;
    checkPageBreak(chipsH + 2);
    let rowTop = y;
    m.rows.forEach(row => {
      drawChipRow(row, margin, rowTop, fontSize);
      rowTop += m.chipH + m.rowGap;
    });
    y += chipsH + 2;
  }

  // Height of a labeled chip column (label + wrapped rows).
  function chipColumnHeight(items, colW) {
    const m = measureChips(items, { fontSize: 7.5, maxWidth: colW });
    return 5.2 + (m.rows.length * m.chipH + (m.rows.length - 1) * m.rowGap);
  }

  function addChipColumn(label, items, x, colW) {
    doc.setFont(FONT, 'bold');
    doc.setFontSize(8.2);
    setColor(doc.setTextColor.bind(doc), COLORS.dark);
    doc.text(label.toUpperCase(), x, y + 3);
    const m = measureChips(items, { fontSize: 7.5, maxWidth: colW });
    let rowTop = y + 5.2;
    m.rows.forEach(row => {
      drawChipRow(row, x, rowTop, 7.5);
      rowTop += m.chipH + m.rowGap;
    });
  }

  // ---------- content strings ----------

  const summary = isEn
    ? 'AI & Software Engineer with a solid academic background from Politecnico di Torino (B.Sc. in Computer Engineering) and the University of Pisa (M.Sc. in Artificial Intelligence and Data Engineering). I combine advanced Software Engineering competencies with AI Engineering expertise. Backed by experience in both IT consulting and product development, I have built strong problem-solving abilities, a collaborative mindset, and high adaptability.'
    : 'AI & Software Engineer con un solido background accademico tra il Politecnico di Torino (Laurea Triennale in Ingegneria Informatica) e l\'Universit\u00e0 di Pisa (Laurea Magistrale in Artificial Intelligence and Data Engineering). Unisco competenze avanzate di Software Engineering e di AI Engineering. Grazie all\'esperienza maturata tra consulenza e sviluppo di prodotto, ho affinato spiccate capacit\u00e0 di problem solving, attitudine al lavoro di squadra e un\'elevata flessibilit\u00e0.';

  const aiProjects = isEn ? [
    'FPA-Augmented Classification: Data Mining pipeline for Frequent Pattern extraction. [Jupyter, Scikit-learn, Imblearn, SMOTE, mlxtend, Flask, React]',
    'Super Resolution for Computer Vision: Deep Learning architectures including SRGAN. [PyTorch, TensorFlow, Google Colab]',
    'NLP Search Engine: High-performance search over MS-MARCO corpus. [Java]',
    'Research Paper RAG System: End-to-end RAG web app with Vector Search. [OpenAI API, Svelte, FastAPI, MongoDB, Qdrant]',
    'Thesis: Autoencoder for weight-injection enabling zero-shot knowledge integration. [PyTorch, CUDA, Hydra, W&B, Hugging Face]'
  ] : [
    'FPA-Augmented Classification: Pipeline Data Mining per Frequent Pattern. [Jupyter, Scikit-learn, Imblearn, SMOTE, mlxtend, Flask, React]',
    'Super Resolution per Computer Vision: Architetture Deep Learning incluso SRGAN. [PyTorch, TensorFlow, Google Colab]',
    'NLP Search Engine: Motore di ricerca su MS-MARCO. [Java]',
    'Research Paper RAG System: Web app RAG con Vector Search. [OpenAI API, Svelte, FastAPI, MongoDB, Qdrant]',
    'Tesi: Autoencoder per weight-injection zero-shot. [PyTorch, CUDA, Hydra, W&B, Hugging Face]'
  ];

  const swProjects = isEn ? [
    'Playlist Management Social Network: Social platform with real-time recommendation. [Express.js, TypeScript, React, Redux, Redis, MongoDB, Neo4j]',
    'Mobile Sensing for Road Quality: Smartphone telemetry + GCP pipeline. [Kotlin, Android Studio, Node.js, Google Cloud Run, Firebase]',
    'Distributed Chat System: Distributed web with Erlang microservice. [Erlang, Java, JSP, HTML, CSS, MySQL, Nginx]',
    'IoT System for Industrial Monitoring: End-to-end with MQTT/CoAP, Grafana. [Java, MQTT, CoAP, Grafana, MySQL, Contiki-NG]'
  ] : [
    'Social Network per Playlist: Raccomandazione in tempo reale. [Express.js, TypeScript, React, Redux, Redis, MongoDB, Neo4j]',
    'Mobile Sensing: Telemetria smartphone + GCP. [Kotlin, Android Studio, Node.js, Google Cloud Run, Firebase]',
    'Distributed Chat System: Architettura distribuita con Erlang. [Erlang, Java, JSP, HTML, CSS, MySQL, Nginx]',
    'IoT System: Monitoraggio con MQTT/CoAP, Grafana. [Java, MQTT, CoAP, Grafana, MySQL, Contiki-NG]'
  ];

  const swSkills = isEn
    ? ['SQL', 'Node.js', 'Spring Boot', 'FastAPI', 'Flask', 'Java', 'JavaScript/TypeScript', 'Git', 'Docker', 'React.js', 'Angular', 'Python', 'C/C++', 'MySQL', 'MongoDB', 'Redis', 'Neo4j', 'Qdrant']
    : ['SQL', 'Node.js', 'Springboot', 'Fastapi', 'Flask', 'Java', 'Javascript/Typescript', 'Git', 'Docker', 'React.js', 'Angular', 'Python', 'C/C++', 'MySQL', 'MongoDB', 'Redis', 'Neo4j', 'Qdrant'];

  const aiSkills = isEn
    ? ['Machine Learning', 'Deep Learning', 'Pandas', 'NumPy', 'Scikit-learn', 'OpenCV', 'LLM', 'Computer Vision', 'NLP', 'RAG', 'Coding Agents (Skills, Tools, MCP, Prompt Engineering)', 'Agent Dev Frameworks (LangGraph)']
    : ['Machine Learning', 'Deep Learning', 'Pandas', 'Numpy', 'Scikit-learn', 'OpenCV', 'LLM', 'Computer Vision', 'NLP', 'RAG', 'Coding Agents (Skills, Tools, MCP, Prompt Engineering)', 'Agent Dev Frameworks (LangGraph)'];

  const softSkills = isEn
    ? ['Teamwork', 'Executive Communication', 'Adaptability', 'Critical Thinking', 'Cross-functional Collaboration', 'Problem Solving', 'Creativity']
    : ['Teamwork', 'Comunicazione dei risultati', 'Flessibilit\u00e0', 'Pensiero critico', 'Collaborazione cross-funzionale', 'Problem Solving', 'Creativit\u00e0'];

  const languages = isEn
    ? ['Italian: C2 (Native)', 'English: C1 (Advanced)']
    : ['Italiano: C2 (Madrelingua)', 'Inglese: C1 (Livello Avanzato)'];

  // ---------- header band ----------

  const bandH = 46;
  setColor(doc.setFillColor.bind(doc), COLORS.headerBg);
  doc.rect(0, 0, pageW, bandH, 'F');

  const headLink = [220, 224, 240]; // soft white for links on the navy band

  // name
  setFont('bold', 20);
  setColor(doc.setTextColor.bind(doc), COLORS.white);
  doc.text('Luca Di Giacomo', margin, 15.5);

  // role
  setFont('normal', 9.5);
  setColor(doc.setTextColor.bind(doc), COLORS.accentLight);
  const role = 'AI & Data Specialist | M.Sc. Artificial Intelligence & Data Engineering';
  doc.text(role, margin, 21);

  // accent bar
  setColor(doc.setFillColor.bind(doc), COLORS.accent);
  doc.rect(margin, 23.4, 24, 1.1, 'F');

  // birth + nationality
  setFont('normal', 8.5);
  setColor(doc.setTextColor.bind(doc), [200, 203, 216]);
  doc.text(
    isEn
      ? 'Date of birth: March 17, 1997   |   Nationality: Italian'
      : 'Data di nascita: 17 Marzo 1997   |   Nazionalit\u00e0: Italiana',
    margin, 29
  );

  // clickable header links
  const hSep = '   |   ';
  setFont('normal', 8.5);
  const hSepW = doc.getTextWidth(hSep);

  let hx = margin;
  hx += addLink('(+39) 3405133275', 'tel:+393405133275', { fontSize: 8.5, color: headLink, x: hx, yPos: 34 });
  doc.setTextColor(...COLORS.white);
  doc.text(hSep, hx, 34);
  hx += hSepW;
  hx += addLink('digiacomoluca1797@gmail.com', 'mailto:digiacomoluca1797@gmail.com', { fontSize: 8.5, color: headLink, x: hx, yPos: 34 });

  hx = margin;
  hx += addLink(isEn ? 'personal website' : 'sito personale', 'https://dgl1797.github.io/dgl1797/', { fontSize: 8.5, color: headLink, x: hx, yPos: 39.5 });
  doc.setTextColor(...COLORS.white);
  doc.text(hSep, hx, 39.5);
  hx += hSepW;
  hx += addLink('LinkedIn', 'https://www.linkedin.com/in/luca-di-giacomo-78267a38b', { fontSize: 8.5, color: headLink, x: hx, yPos: 39.5 });

  y = 53;

  // ---------- professional summary ----------

  addSectionHeader(isEn ? 'Professional Summary' : 'Profilo Professionale');
  const pFs = 8.5;
  setFont('normal', pFs);
  const pLines = doc.splitTextToSize(summary, maxW - 6);
  const pLineH = pFs * 0.42;
  checkPageBreak(pLines.length * pLineH + 4);
  y += 1;
  setColor(doc.setFillColor.bind(doc), COLORS.accent);
  doc.rect(margin, y - pLines.length * pLineH + 1.2, 0.8, pLines.length * pLineH, 'F');
  setColor(doc.setTextColor.bind(doc), COLORS.text);
  doc.text(pLines, margin + 4, y, { maxWidth: maxW - 6 });
  y += pLines.length * pLineH + 5;

  // ---------- work experience ----------

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
    24
  );
  addText(isEn ? 'University of Pisa   |   Final Grade: 108/110' : 'Universit\u00e0 di Pisa   |   Valutazione: 108/110', { fontSize: 8, color: COLORS.gray, gap: 2 });
  addText(isEn ? 'Thesis: Model Weight Learning as a Novel Paradigm in Computer Vision' : 'Tesi: Model Weight Learning as a Novel Paradigm in Computer Vision', { fontSize: 8, italic: true, color: COLORS.text, gap: 2 });
  addLink(isEn ? 'Key Projects' : 'Progetti', 'https://github.com/dgl1797/University-of-Pisa-Projects', { fontSize: 9, color: COLORS.accent, bold: true });
  y += 6.5;

  addSubLabel('AI Engineering', 8);
  aiProjects.forEach(p => addBullet(p, { fontSize: 7.5 }));
  y += 1;
  addSubLabel('Software Engineering', 8);
  swProjects.forEach(p => addBullet(p, { fontSize: 7.5 }));
  y += 2;

  addEntryHeader(
    isEn ? 'B.Sc. in Computer Engineering (L-8)' : 'Laurea Triennale in Ingegneria Informatica (L-8)',
    isEn ? 'Sep 2015 – Jul 2021' : 'Set 2015 – Lug 2021',
    22
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
    addBullet('Algoritmi e Strutture Dati: Principali algoritmi, ottimizzazione e complessit\u00e0 computazionale. [C/C++]', { fontSize: 7.5 });
    addBullet('Basi di Dati: Algebra relazionale e RDBMs SQL con progetto pratico. [SQL, JS, HTML, CSS]', { fontSize: 7.5 });
    addBullet('Programmazione a Oggetti: Software Engineering, Ciclo di vita, OOP. [UML, Java]', { fontSize: 7.5 });
    addBullet('Sistemi Operativi: Sistemi operativi e multi-thread programming. [C/C++]', { fontSize: 7.5 });
    addBullet('Reti di Calcolatori: Protocolli di comunicazione ISO/OSI.', { fontSize: 7.5, gap: 4 });
  }

  // ---------- technical skills ----------

  addSectionHeader(isEn ? 'Technical Skills' : 'Competenze Tecniche');
  const colGap = 8;
  const colW = (maxW - colGap) / 2;
  const hSw = chipColumnHeight(swSkills, colW);
  const hAi = chipColumnHeight(aiSkills, colW);
  checkPageBreak(Math.max(hSw, hAi) + 2);
  const topSkills = y;
  addChipColumn(isEn ? 'Software Engineering' : 'Software Engineering', swSkills, margin, colW);
  addChipColumn(isEn ? 'Artificial Intelligence' : 'Artificial Intelligence', aiSkills, margin + colW + colGap, colW);
  y = topSkills + Math.max(hSw, hAi) + 2;

  // ---------- soft skills & languages ----------

  addSectionHeader(isEn ? 'Soft Skills' : 'Competenze Trasversali');
  renderChips(softSkills, { fontSize: 7.5 });

  addSectionHeader(isEn ? 'Languages' : 'Competenze Linguistiche');
  renderChips(languages, { fontSize: 8 });

  addText(isEn
    ? 'I authorize the processing of my personal data in accordance with Italian Legislative Decree 196/2003 and Regulation (EU) 2016/679 (GDPR).'
    : 'Autorizzo il trattamento dei miei dati personali ai sensi del d. lgs. 196/2003 e del GDPR 679/16.',
    { fontSize: 7, color: COLORS.faint, gap: 2 });

  // ---------- page chrome & footer (added last across every page) ----------

  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // footer rule
    const fy = pageH - 14;
    setColor(doc.setDrawColor.bind(doc), COLORS.accent);
    doc.setLineWidth(0.6);
    doc.line(margin, fy, pageW - margin, fy);

    setFont('normal', 7.5);
    setColor(doc.setTextColor.bind(doc), COLORS.faint);
    doc.text('Luca Di Giacomo — Curriculum Vitae', margin, pageH - 8.5);
    doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 8.5, { align: 'right' });
  }

  doc.save('Luca_Di_Giacomo_Resume_' + (isEn ? 'EN' : 'IT') + '.pdf');
}