const { successResponse, errorResponse } = require('../utils/responseHelper');

// Intelligent Knowledge Base & Curriculum Context
const CURRICULUM_TOPICS = {
  web_dev: ['React.js', 'Node.js', 'Express', 'MySQL', 'MongoDB', 'REST APIs', 'Redux', 'JWT Authentication', 'HTML/CSS/Bootstrap'],
  data_science: ['Python', 'Pandas', 'NumPy', 'Scikit-Learn', 'Machine Learning', 'Data Visualization', 'SQL Analytics', 'Neural Networks'],
  devops: ['Docker', 'Kubernetes', 'CI/CD Pipelines', 'AWS / Google Cloud', 'Linux Administration', 'Git & GitHub', 'Terraform', 'Nginx']
};

/**
 * Knowledge Engine for Academic Concepts, Code Samples & Explanations
 */
const generateAIResponse = (prompt, role, courseName) => {
  const query = prompt.toLowerCase();

  // 1. React & Frontend
  if (query.includes('useeffect') || query.includes('hook') || query.includes('react')) {
    return {
      title: 'React.js Component Lifecycle & Hooks Explained',
      content: `In modern React, **Hooks** allow functional components to manage state and side-effects.

### 🔑 Key Concepts:
1. **\`useState\`**: Declares state variables that persist across renders.
2. **\`useEffect\`**: Handles side-effects like fetching data from REST APIs, timer subscriptions, and DOM updates.

\`\`\`jsx
import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Runs on mount (empty dependency array [])
    api.get('/courses')
      .then(res => setCourses(res.data?.courses || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return loading ? <p>Loading courses...</p> : (
    <ul>{courses.map(c => <li key={c.id}>{c.name} - ₹{c.fee_amount}</li>)}</ul>
  );
}
\`\`\`

💡 **Best Practice:** Always specify dependencies in the array \`[dep1, dep2]\` to avoid infinite re-render loops.`
    };
  }

  // 2. MySQL, Database & Transactions
  if (query.includes('sql') || query.includes('mysql') || query.includes('transaction') || query.includes('acid') || query.includes('database')) {
    return {
      title: 'Relational Database Design & ACID Transactions in MySQL',
      content: `**ACID Properties** ensure database transactions are processed reliably:

- **Atomicity**: All operations succeed or all rollback (e.g. coin wallet deduction + admission creation).
- **Consistency**: Data adheres to all schema constraints and foreign keys.
- **Isolation**: Concurrent transactions do not interfere with each other.
- **Durability**: Committed data is permanently saved even after server crashes.

### 🛠️ MySQL Parameterized Query Example:
\`\`\`sql
-- Atomic Transaction Example:
START TRANSACTION;

UPDATE student_wallet 
SET coins_balance = coins_balance - 1500, total_spent = total_spent + 1500 
WHERE student_id = 4 AND coins_balance >= 1500;

INSERT INTO coin_transactions (wallet_id, transaction_type, amount, balance_after, reason)
VALUES (1, 'DEBIT', 1500, 8500, 'Course Enrollment Fee');

COMMIT;
\`\`\``
    };
  }

  // 3. Docker & DevOps
  if (query.includes('docker') || query.includes('container') || query.includes('devops') || query.includes('kubernetes')) {
    return {
      title: 'Docker Containerization & Multi-Stage Production Builds',
      content: `**Docker** packages applications and their dependencies into lightweight, isolated containers.

### 🐳 Production \`Dockerfile\` for Node.js Express:
\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV PORT=5000 NODE_ENV=production
EXPOSE 5000
CMD ["node", "server.js"]
\`\`\`

### 🚀 Common Docker Commands:
- \`docker build -t campusflow-backend .\` (Build container image)
- \`docker run -p 5000:5000 -d campusflow-backend\` (Run container in background)
- \`docker ps\` (View running containers)`
    };
  }

  // 4. Mock Interview Preparation
  if (query.includes('interview') || query.includes('question') || query.includes('prep') || query.includes('viva')) {
    return {
      title: '🎯 Top Technical Interview Questions & Model Answers',
      content: `### 1. What is the difference between SQL and NoSQL databases?
- **SQL (MySQL, PostgreSQL)**: Relational, structured tables, predefined schema, supports ACID transactions and complex JOINs. Ideal for financial ledgers, student portals, and admission systems.
- **NoSQL (MongoDB, Redis)**: Document or Key-Value store, flexible schema, horizontally scalable. Ideal for unstructured logs, caching, and real-time feeds.

### 2. How does JWT Authentication work?
1. Client submits email + password to \`/api/auth/login\`.
2. Server verifies bcrypt password hash and generates signed JWT token with payload \`{ userId, roleId, roleName }\`.
3. Client stores token in \`localStorage\` and sends it in HTTP header: \`Authorization: Bearer <token>\`.
4. Express middleware verifies signature before allowing access to protected API routes.

### 3. What is CORS and how does CampusFlow handle it?
CORS (Cross-Origin Resource Sharing) is a browser security mechanism that restricts HTTP requests from different origins (e.g. \`localhost:5173\` to \`localhost:5000\`). CampusFlow configures Express \`cors()\` middleware with allowed origins and support for credentials.`
    };
  }

  // 5. Resume & ATS Tips
  if (query.includes('resume') || query.includes('ats') || query.includes('placement') || query.includes('job')) {
    return {
      title: '📄 Full-Stack Developer Resume Optimization & ATS Keywords',
      content: `### 🚀 Must-Have Keywords for Your Resume:
- **Languages & Frameworks:** JavaScript (ES6+), React.js, Node.js, Express.js, HTML5, CSS3, Bootstrap 5.
- **Databases & ORM:** MySQL, Parameterized SQL Queries, ACID Transactions, Database Indexing.
- **Architecture & Security:** RESTful API Design, JWT Authentication, Role-Based Access Control (RBAC), bcrypt.
- **Tools & Cloud:** Git, GitHub, Docker, Vite, Nodemailer SMTP, Vercel, Render.

### 💡 Project Bullet Point Template:
> *"Architected and deployed **CampusFlow**, an enterprise-grade Training & Admission Portal featuring RBAC across 6 roles, a coin-based enrollment wallet, real-time timetable alerts via Nodemailer, and ACID-compliant MySQL financial ledgers."*`
    };
  }

  // General Academic Concept Answer
  return {
    title: `Academic Explanation: ${prompt.slice(0, 50)}...`,
    content: `Here is a structured explanation for **"${prompt}"**:

### 📌 Core Concept:
${prompt} is an essential part of the modern software engineering and software development lifecycle. It enables modular, scalable, and maintainable software architecture.

### 🔍 Key Takeaways:
1. **Separation of Concerns:** Keep your presentation layer (React UI), business logic (Express controllers), and data storage (MySQL database) decoupled.
2. **Security First:** Always sanitize inputs, use parameterized queries to prevent SQL injections, and hash passwords using \`bcrypt\`.
3. **Maintainability:** Use clean modular folder structures and standardized response helpers (\`successResponse\`, \`errorResponse\`).

Feel free to ask for specific code examples, debugging assistance, or mock interview questions!`
  };
};

/**
 * POST /api/ai/ask
 * Interactive AI Academic Assistant
 */
const askAITutor = async (req, res) => {
  try {
    const { prompt, course_name } = req.body;
    if (!prompt || !prompt.trim()) {
      return errorResponse(res, 400, 'Please provide a question or topic prompt');
    }

    const role = req.user?.role_name || 'STUDENT';
    const response = generateAIResponse(prompt.trim(), role, course_name);

    return successResponse(res, 200, 'AI response generated', {
      prompt: prompt.trim(),
      response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return errorResponse(res, 500, 'AI Tutor service error', error.message);
  }
};

module.exports = { askAITutor };
