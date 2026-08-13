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

    // PDF download — professional formatting pass
    function downloadPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const isEn = currentLang === 'en';

      const pageW = 210;
      const pageH = 297;
      const margin = 18;
      const maxW = pageW - 2 * margin;
      const footerZone = 14; // reserved space at bottom of every page
      let y = margin;

      const COLORS = {
        headerBg: [26, 26, 46],   // #1a1a2e
        accent: [37, 99, 235],    // #2563eb
        accentLight: [147, 197, 253], // #93c5fd
        dark: [26, 26, 46],       // #1a1a2e
        gray: [85, 85, 85],       // #555
        text: [51, 51, 51],       // #333
        faint: [136, 136, 136],   // #888
        line: [210, 210, 210],
        white: [255, 255, 255]
      };

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

      // Section header: accent tab + title + underline. Reserves room so the
      // header never gets orphaned alone at the bottom of a page.
      function addSectionHeader(title) {
        checkPageBreak(18); // header + room for at least one line beneath it
        y += 3;
        setColor(doc.setFillColor.bind(doc), COLORS.accent);
        doc.rect(margin, y - 3.6, 2.4, 4.6, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11.5);
        setColor(doc.setTextColor.bind(doc), COLORS.dark);
        doc.text(title.toUpperCase(), margin + 5, y);
        y += 2.5;
        setColor(doc.setDrawColor.bind(doc), COLORS.line);
        doc.setLineWidth(0.35);
        doc.line(margin, y, pageW - margin, y);
        y += 6;
      }

      // Job / degree header row: bold title on the left, date range right-aligned
      // on the same baseline so entries read cleanly as a timeline.
      function addEntryHeader(title, dateRange, minFollowing = 12) {
        // Reserve space for the header itself PLUS a minimum amount of the
        // content that follows it (institution line / first bullet), so the
        // header never ends up alone at the bottom of a page.
        checkPageBreak(9 + minFollowing);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        setColor(doc.setTextColor.bind(doc), COLORS.dark);
        const titleLines = doc.splitTextToSize(title, maxW - 42);
        doc.text(titleLines, margin, y);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        setColor(doc.setTextColor.bind(doc), COLORS.accent);
        doc.text(dateRange, pageW - margin, y, { align: 'right' });
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
        const lines = doc.splitTextToSize(text, maxW - bulletIndent);
        const lineHeight = fontSize * 0.42;
        checkPageBreak(lines.length * lineHeight + gap);
        doc.text('•', margin, y);
        doc.text(lines, margin + bulletIndent, y);
        y += lines.length * lineHeight + gap;
      }

      // Clickable link with blue underlined shown text instead of the raw URL.
      // Renders the text, attaches a link annotation, and draws an underline.
      function addLink(text, url, opts = {}) {
        const {
          fontSize = 8.5,
          color = COLORS.accent,
          bold = false,
          x = margin,
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
        // Reserve space for the label itself PLUS a minimum amount of the
        // bullet content that follows it, so it never sits alone at the
        // bottom of a page with its bullets pushed to the next one.
        checkPageBreak(6 + minFollowing);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        setColor(doc.setTextColor.bind(doc), COLORS.accent);
        doc.text(text, margin, y);
        y += 4.2;
      }

      // ---------- header band ----------

      doc.setFillColor(...COLORS.headerBg);
      doc.rect(0, 0, pageW, 45, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(21);
      doc.setTextColor(...COLORS.white);
      doc.text('Luca Di Giacomo', margin, 16);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.accentLight);
      doc.text('AI & Data Specialist | M.Sc. Artificial Intelligence & Data Engineering', margin, 23);

      doc.setFontSize(8.5);
      doc.setTextColor(220, 220, 230);
      doc.text(
        isEn
          ? 'Date of birth: March 17, 1997   |   Nationality: Italian'
          : 'Data di nascita: 17 Marzo 1997   |   Nazionalit\u00e0: Italiana',
        margin, 29
      );
      // clickable header links (blue underlined text instead of raw URLs)
      const headerLinkColor = [96, 165, 250]; // readable blue on the dark header band
      const hSep = '   |   ';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const hSepW = doc.getTextWidth(hSep);

      // phone + email
      let hx = margin;
      hx += addLink('(+39) 3405133275', 'tel:+393405133275', { fontSize: 8.5, color: headerLinkColor, x: hx, yPos: 34 });
      doc.setTextColor(...COLORS.white);
      doc.text(hSep, hx, 34);
      hx += hSepW;
      hx += addLink('digiacomoluca1797@gmail.com', 'mailto:digiacomoluca1797@gmail.com', { fontSize: 8.5, color: headerLinkColor, x: hx, yPos: 34 });

      // personal website + LinkedIn
      hx = margin;
      hx += addLink(isEn ? 'personal website' : 'sito personale', 'https://dgl1797.github.io/dgl1797/', { fontSize: 8.5, color: headerLinkColor, x: hx, yPos: 39 });
      doc.setTextColor(...COLORS.white);
      doc.text(hSep, hx, 39);
      hx += hSepW;
      hx += addLink('LinkedIn', 'https://www.linkedin.com/in/luca-di-giacomo-78267a38b', { fontSize: 8.5, color: headerLinkColor, x: hx, yPos: 39 });

      y = 53;

      // ---------- professional summary ----------

      addSectionHeader(isEn ? 'Professional Summary' : 'Profilo Professionale');
      if (isEn) {
        addText('AI & Software Engineer with a solid academic background from Politecnico di Torino (B.Sc. in Computer Engineering) and the University of Pisa (M.Sc. in Artificial Intelligence and Data Engineering). I combine advanced Software Engineering competencies with AI Engineering expertise. Backed by experience in both IT consulting and product development, I have built strong problem-solving abilities, a collaborative mindset, and high adaptability.', { fontSize: 8.5, color: COLORS.text, gap: 4 });
      } else {
        addText('AI & Software Engineer con un solido background accademico tra il Politecnico di Torino (Laurea Triennale in Ingegneria Informatica) e l\'Universit\u00e0 di Pisa (Laurea Magistrale in Artificial Intelligence and Data Engineering). Unisco competenze avanzate di Software Engineering e di AI Engineering. Grazie all\'esperienza maturata tra consulenza e sviluppo di prodotto, ho affinato spiccate capacit\u00e0 di problem solving, attitudine al lavoro di squadra e un\'elevata flessibilit\u00e0.', { fontSize: 8.5, color: COLORS.text, gap: 4 });
      }

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
        24 // institution/grade line, thesis line, project link and sub-label follow
      );
      addText(isEn ? 'University of Pisa   |   Final Grade: 108/110' : 'Universit\u00e0 di Pisa   |   Valutazione: 108/110', { fontSize: 8, color: COLORS.gray, gap: 2 });
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
        addBullet('Algoritmi e Strutture Dati: Principali algoritmi, ottimizzazione e complessit\u00e0 computazionale. [C/C++]', { fontSize: 7.5 });
        addBullet('Basi di Dati: Algebra relazionale e RDBMs SQL con progetto pratico. [SQL, JS, HTML, CSS]', { fontSize: 7.5 });
        addBullet('Programmazione a Oggetti: Software Engineering, Ciclo di vita, OOP. [UML, Java]', { fontSize: 7.5 });
        addBullet('Sistemi Operativi: Sistemi operativi e multi-thread programming. [C/C++]', { fontSize: 7.5 });
        addBullet('Reti di Calcolatori: Protocolli di comunicazione ISO/OSI.', { fontSize: 7.5, gap: 4 });
      }

      // ---------- technical skills ----------

      addSectionHeader(isEn ? 'Technical Skills' : 'Competenze Tecniche');
      if (isEn) {
        addSubLabel('Software Engineering', 10);
        addText('SQL, Node.js, Spring Boot, FastAPI, Flask, Java, JavaScript/TypeScript, Git, Docker, React.js, Angular, Python, C/C++, MySQL, MongoDB, Redis, Neo4j, Qdrant.', { fontSize: 8, color: COLORS.text, gap: 3.5 });
        addSubLabel('Artificial Intelligence', 10);
        addText('Machine Learning, Deep Learning, Pandas, NumPy, Scikit-learn, OpenCV, LLM, Computer Vision, NLP, RAG, Coding Agents (Skills, Tools, MCP, Prompt Engineering), Agent Development Frameworks (LangGraph).', { fontSize: 8, color: COLORS.text, gap: 4 });
      } else {
        addSubLabel('Software Engineering', 10);
        addText('SQL, Node.js, Springboot, Fastapi, Flask, Java, Javascript/Typescript, Git, Docker, React.js, Angular, Python, C/C++, MySQL, MongoDB, Redis, Neo4j, Qdrant.', { fontSize: 8, color: COLORS.text, gap: 3.5 });
        addSubLabel('Artificial Intelligence', 10);
        addText('Machine Learning, Deep Learning, Pandas, Numpy, Scikit-learn, OpenCV, LLM, Computer Vision, NLP, RAG, Coding Agents (Skills, Tools, MCP, Prompt Engineering), Agent Development Frameworks (LangGraph).', { fontSize: 8, color: COLORS.text, gap: 4 });
      }

      // ---------- soft skills ----------

      addSectionHeader(isEn ? 'Soft Skills' : 'Competenze Trasversali');
      addText(isEn
        ? 'Teamwork, Executive Communication, Adaptability, Critical Thinking, Cross-functional Collaboration, Problem Solving, Creativity.'
        : 'Teamwork, Comunicazione dei risultati, Flessibilit\u00e0, Pensiero critico, Collaborazione cross-funzionale, Problem Solving, Creativit\u00e0.',
        { fontSize: 8, color: COLORS.text, gap: 4 });

      // ---------- languages ----------

      addSectionHeader(isEn ? 'Languages' : 'Competenze Linguistiche');
      addText(isEn ? 'Italian: C2 (Native)   |   English: C1 (Advanced)' : 'Italiano: C2 (Madrelingua)   |   Inglese: C1 (Livello Avanzato)', { fontSize: 8.5, color: COLORS.text, gap: 6 });

      addText(isEn
        ? 'I authorize the processing of my personal data in accordance with Italian Legislative Decree 196/2003 and Regulation (EU) 2016/679 (GDPR).'
        : 'Autorizzo il trattamento dei miei dati personali ai sensi del d. lgs. 196/2003 e del GDPR 679/16.',
        { fontSize: 7, color: COLORS.faint, gap: 2 });

      // ---------- footer (page numbers, added last across every page) ----------

      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(...COLORS.faint);
        doc.text('Luca Di Giacomo — Curriculum Vitae', margin, pageH - 9);
        doc.text(`${i} / ${totalPages}`, pageW - margin, pageH - 9, { align: 'right' });
      }

      doc.save('Luca_Di_Giacomo_Resume_' + (isEn ? 'EN' : 'IT') + '.pdf');
    }