const https = require('https');

/**
 * Call Google Gemini API if key is present
 */
const callGeminiAPI = async (prompt, systemInstruction = '') => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return null;

  return new Promise((resolve) => {
    const postData = JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: systemInstruction
                ? `${systemInstruction}\n\nStudent Request:\n${prompt}`
                : prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const parsed = JSON.parse(data);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            resolve(text || null);
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
};

/**
 * Fallback Academic Knowledge Engine (generates intelligent structured advice)
 */
const generateStructuredAcademicAdvice = (action, { title, subject, description, query }) => {
  const safeTitle = title || 'Coursework Assignment';
  const safeSubject = subject || 'General Studies';
  const safeDesc = description || 'Standard academic coursework requirements.';

  if (action === 'summarize') {
    return `### 📋 Assignment Summary: ${safeTitle}\n\n` +
      `* **Subject Context:** ${safeSubject}\n` +
      `* **Core Objective:** Complete all specified analysis, practical implementations, and documentation for "${safeTitle}".\n` +
      `* **Key Deliverables:** Verified solutions, clear explanations of methodology, and clean formatting.\n` +
      `* **Quality Checklist:** Ensure academic citations, check calculations, and review formatting prior to submission.`;
  }

  if (action === 'guidance') {
    return `### 🎯 Personalized Academic Guidance for "${safeTitle}"\n\n` +
      `* **Strategic Approach (${safeSubject}):**\n` +
      `  1. Carefully dissect the assignment rubric before writing any code or draft.\n` +
      `  2. Formulate a structured thesis or architectural blueprint first.\n` +
      `  3. Allocate 70% of time to core development/analysis and 30% to verification and report polish.\n\n` +
      `* **Top Traps to Avoid:**\n` +
      `  - Submitting unformatted code or missing units on calculations.\n` +
      `  - Leaving submission to the last 30 minutes before deadline.\n\n` +
      `* **Pro-Tip for Excellence:** Include diagrams, cite primary literature/lectures, and add clean markdown headers for maximum clarity.`;
  }

  if (action === 'explain') {
    const topic = query || safeTitle;
    return `### 🧠 Topic Deep-Dive: "${topic}"\n\n` +
      `* **Core Concept:** In ${safeSubject}, understanding ${topic} requires connecting foundational principles with practical problem-solving.\n` +
      `* **Key Mechanisms:**\n` +
      `  1. Identify the primary inputs, constraints, and formulas applicable to this problem.\n` +
      `  2. Break down the theoretical framework step-by-step before applying computational steps.\n` +
      `  3. Validate edge cases and confirm that results match theoretical expectations.\n` +
      `* **Study Advice:** Re-read lecture notes covering ${safeSubject} chapters relevant to this topic, and work through one solved practice example first!`;
  }

  if (action === 'schedule') {
    return `### 📅 Recommended Study Schedule for ${safeTitle}\n\n` +
      `* **Day 1 — Discovery & Outline (45 mins):** Read requirements, review relevant textbook sections, and draft a high-level roadmap.\n` +
      `* **Day 2 — Deep Work Session (2 x 25-min Pomodoros):** Draft the core body, solve technical problems, or write project code.\n` +
      `* **Day 3 — Review & Refinement (30 mins):** Run unit tests, verify calculations, and check formatting against grading rubrics.\n` +
      `* **Day 4 — Final Polish & Submission (15 mins):** Export to PDF/DOCX, verify attachments, and submit on TaskFlow.`;
  }

  if (action === 'breakdown') {
    return `### 🔨 4-Step Milestone Breakdown for ${safeTitle}\n\n` +
      `1. **Milestone 1 (Research & Preparation):** Collect class references, formulas, and dataset/source links.\n` +
      `2. **Milestone 2 (Drafting / Prototyping):** Complete 50% of the core problems or document structure.\n` +
      `3. **Milestone 3 (Implementation & Analysis):** Finalize all proofs, code, or analysis diagrams.\n` +
      `4. **Milestone 4 (Self-Audit & Wrap-Up):** Check against syllabus expectations and confirm file readability.`;
  }

  // Default interactive academic chat response
  const userQ = query || 'how to approach this assignment';
  return `### 🎓 TaskFlow AI Study Coach\n\n` +
    `Regarding your question: *"${userQ}"* in **${safeSubject}**:\n\n` +
    `1. **Focus Area:** Structure your study around the core problem statement of "${safeTitle}".\n` +
    `2. **Methodology:** Divide complex questions into simpler sub-questions. Solve each part independently.\n` +
    `3. **Best Practice:** Use 25-minute Pomodoro study sprints to maintain peak focus without burnout.\n\n` +
    `*Tip: If you need clarification on specific concepts or code syntax, type your exact question!*`;
};

/**
 * @desc    Generate AI study assistance
 * @route   POST /api/ai/assistant
 * @access  Private
 */
const getAIAssistance = async (req, res, next) => {
  try {
    const { action = 'summarize', title, subject, description, query } = req.body;

    const systemPrompt =
      'You are TaskFlow AI, an encouraging and academically rigorous academic study assistant for university students. ' +
      'Help students organize, summarize, understand, and break down their assignments into achievable steps. Format responses in clean markdown with bullet points and bold headers.';

    let prompt = '';
    if (action === 'summarize') {
      prompt = `Please provide a concise, structured summary and key deliverables checklist for this assignment:\nTitle: ${title}\nSubject: ${subject}\nInstructions: ${description}`;
    } else if (action === 'guidance') {
      prompt = `Provide personalized step-by-step academic guidance and tips to achieve top marks on this assignment:\nTitle: ${title}\nSubject: ${subject}\nRequirements: ${description}\nGive specific recommendations for preparation, technical execution, and avoiding common mistakes.`;
    } else if (action === 'explain') {
      prompt = `Please explain the key academic concepts and give study intuition for:\nTopic/Question: ${query || title}\nSubject: ${subject}\nContext: ${description}`;
    } else if (action === 'schedule') {
      prompt = `Create a realistic 3-to-4 day student study schedule with specific Pomodoro time estimates for this assignment:\nTitle: ${title}\nSubject: ${subject}\nDetails: ${description}`;
    } else if (action === 'breakdown') {
      prompt = `Break this assignment down into 4 clear, sequential, bite-sized actionable milestones:\nTitle: ${title}\nSubject: ${subject}\nInstructions: ${description}`;
    } else {
      prompt = `The student is asking: "${query}". Context: Subject is ${subject}, Assignment is "${title}" (${description}). Provide a helpful, step-by-step academic explanation.`;
    }

    // Attempt Gemini API call
    let reply = await callGeminiAPI(prompt, systemPrompt);

    // If Gemini API is not configured or offline, use structured academic fallback
    if (!reply) {
      reply = generateStructuredAcademicAdvice(action, { title, subject, description, query });
    }

    return res.status(200).json({
      success: true,
      action,
      response: reply,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAIAssistance,
};
