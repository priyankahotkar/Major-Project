import { GoogleGenerativeAI } from '@google/generative-ai';

interface GithubUserData {
  public_repos: number;
  followers: number;
  repos: Array<{
    name: string;
    language: string;
    stargazers_count: number;
  }>;
  recent_events: Array<{
    type: string;
    repo: string;
    created_at: string;
  }>;
  languages: Array<{
    type:string
  }>
}

interface LeetCodeUserData {
  ranking: number;
  reputation: number;
  submitStats: {
    acSubmissionNum: Array<{
      difficulty: string;
      count: number;
    }>;
  };
}

interface CodeforcesUserData {
  handle: string;
  rank: string;
  rating: number;
  maxRating: number;
  contests: number;
  solvedProblems: number;
}

export type InterviewStage =
  | 'introduction'
  | 'technical'
  | 'coding'
  | 'behavioral'
  | 'summary';

export interface InterviewTurn {
  stage: InterviewStage;
  question: string;
  userAnswer: string;
  feedback: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewState {
  stage: InterviewStage;
  difficulty: 'easy' | 'medium' | 'hard';
  turns: InterviewTurn[];
}

export class GeminiService {
  private model: any;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please check your .env file.');
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private async fetchGithubData(username: string): Promise<GithubUserData> {
    try {
      // Fetch basic user info
      const userResponse = await fetch(`https://api.github.com/users/${username}`);
      const userData = await userResponse.json();

      // Fetch repositories
      const reposResponse = await fetch(
        `https://api.github.com/users/${username}/repos?sort=updated&per_page=10`
      );
      const repos = await reposResponse.json();

      // Fetch recent events
      const eventsResponse = await fetch(
        `https://api.github.com/users/${username}/events?per_page=30`
      );
      const events = await eventsResponse.json();

let languageStats: Record<string, number> = {};

await Promise.all(
  repos.map(async (repo: any) => {
    const langs = await fetch(repo.languages_url).then(res => res.json());

    for (const lang in langs) {
      languageStats[lang] = (languageStats[lang] || 0) + langs[lang];
    }
  })
);

      console.log(JSON.stringify(languageStats, null, 2));

      return {
        public_repos: userData.public_repos,
        followers: userData.followers,
        repos: repos.map((repo: any) => ({
          name: repo.name,
          language: repo.language,
          stargazers_count: repo.stargazers_count,
        })),
        recent_events: events.map((event: any) => ({
          type: event.type,
          repo: event.repo.name,
          created_at: event.created_at,
        })),
        languages: userData.languageStats,
      };
    } catch (error) {
      console.error('Error fetching GitHub data:', error);
      throw error;
    }
  }

  private async fetchLeetCodeData(username: string): Promise<LeetCodeUserData> {
    try {
      const response = await fetch(`/api/leetcode/user/${username}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching LeetCode data:', error);
      throw error;
    }
  }

  private async fetchCodeforcesData(username: string): Promise<CodeforcesUserData> {
    try {
      // Fetch user info
      const userResponse = await fetch(`https://codeforces.com/api/user.info?handles=${username}`);
      const userData = await userResponse.json();
      const user = userData.result[0];

      // Fetch rating history
      const ratingResponse = await fetch(`https://codeforces.com/api/user.rating?handle=${username}`);
      const ratingData = await ratingResponse.json();

      // Fetch submissions
      const submissionsResponse = await fetch(
        `https://codeforces.com/api/user.status?handle=${username}&from=1&count=100`
      );
      const submissionsData = await submissionsResponse.json();
      const solvedProblems = new Set(
        submissionsData.result
          .filter((sub: any) => sub.verdict === 'OK')
          .map((sub: any) => sub.problem.name)
      ).size;

      return {
        handle: user.handle,
        rank: user.rank,
        rating: user.rating,
        maxRating: user.maxRating,
        contests: ratingData.result.length,
        solvedProblems,
      };
    } catch (error) {
      console.error('Error fetching Codeforces data:', error);
      throw error;
    }
  }

  async generateRoadmap(userInfo: {
    githubUsername: string;
    leetcodeUsername: string;
    codeforcesUsername: string;
    goal: string;
    duration: string;
  }): Promise<string> {
    try {
      const duration = (userInfo.duration || '').toLowerCase();
      let totalWeeks = 12;

      if (duration.includes('1 month')) totalWeeks = 4;
      else if (duration.includes('3 month')) totalWeeks = 12;
      else if (duration.includes('6 month')) totalWeeks = 24;
      else if (duration.includes('1 year')) totalWeeks = 52;

      // Fetch data from all platforms
      const [githubData, leetcodeData, codeforcesData] = await Promise.all([
        this.fetchGithubData(userInfo.githubUsername),
        this.fetchLeetCodeData(userInfo.leetcodeUsername),
        this.fetchCodeforcesData(userInfo.codeforcesUsername),
      ]);

      const prompt = `Create a personalized learning roadmap based on the following user data:

GitHub Profile:
- Total Repositories: ${githubData.public_repos}
- Followers: ${githubData.followers}
- Top Languages: ${Array.from(new Set(githubData.repos.map(r => r.language).filter(Boolean))).join(', ')}
- Recent Activity: ${githubData.recent_events.length} events in the last month
- Languages: 

LeetCode Profile:
- Ranking: ${leetcodeData.ranking}
- Reputation: ${leetcodeData.reputation}
- Problems Solved:
${leetcodeData.submitStats.acSubmissionNum.map(stat => `  ${stat.difficulty}: ${stat.count}`).join('\n')}

Codeforces Profile:
- Rank: ${codeforcesData.rank}
- Current Rating: ${codeforcesData.rating}
- Max Rating: ${codeforcesData.maxRating}
- Contests Participated: ${codeforcesData.contests}
- Problems Solved: ${codeforcesData.solvedProblems}

User Goals:
- ${userInfo.goal}
- Desired Duration: ${userInfo.duration}
- Total Weeks (approx): ${totalWeeks}

Based on this data, create a detailed learning roadmap that focuses on concrete weekly plans:

1. Start with a **very short overall assessment paragraph** (3–5 sentences max). Do NOT put this assessment under any "Week N" heading.

2. Then provide a **weekly breakdown of tasks and learning objectives for exactly ${totalWeeks} weeks**.
   - Use markdown headings in this exact form so they are easy to parse:
     - "Week 1 - short title"
     - "Week 2 - short title"
     - ...
     - "Week ${totalWeeks} - short title"
   - Under each week heading, include:
     - One short objective sentence.
     - A bullet list (\`- \`) of 3–7 specific, actionable tasks for that week.
   - Do NOT create any extra weeks, empty weeks, or placeholder weeks like "Week 3 ---".

3. After the weekly plan, you may add additional sections (outside of any "Week N" heading) for:
   - Recommended practice problems (from LeetCode/Codeforces) matching their current level.
   - Project suggestions based on their GitHub activity and interests.
   - Resources and learning materials.
   - Milestones and progress tracking metrics.
   - Tips for improving contest performance.
   - Suggested open-source contribution opportunities.

Format the response in markdown with clear sections and subsections, and make sure every weekly plan section starts with "Week N - " as described above so it can be easily parsed.

Example output format (for a 2-week plan example only; you must output ${totalWeeks} weeks for the real user):

### Overall Assessment
You have a solid foundation in programming basics. Your next gains will come from consistent problem-solving and one portfolio project. Focus on building habits and tightening fundamentals before pushing difficulty.

## Weekly Plan

### Week 1 - Foundations & Routine
Objective: Build a daily routine and refresh core basics.
- Do 5 easy problems on arrays/strings.
- Review time/space complexity basics.
- Set up a GitHub repo for your learning notes.

### Week 2 - Problem Solving & Patterns
Objective: Learn common patterns and apply them consistently.
- Do 5 easy + 2 medium problems using two pointers / sliding window.
- Write notes: pattern, when to use, and pitfalls for each problem.
- Refactor one past solution for readability.

## Resources
- (Add resource links / titles here)
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating roadmap:', error);
      throw error;
    }
  }

  /**
   * Drive one step of an AI interview.
   * The frontend owns the state machine; this method just returns the next interviewer message
   * and optionally the final summary, based on the current interview state and the latest answer.
   */
  async generateInterviewStep(params: {
    state: InterviewState;
    lastUserAnswer: string;
    targetRole: string;
    preferredLanguage?: string;
  }): Promise<{
    interviewerMessage: string;
    nextStage: InterviewStage;
    nextDifficulty: 'easy' | 'medium' | 'hard';
    isFinal: boolean;
    summaryMarkdown?: string;
  }> {
    const { state, lastUserAnswer, targetRole, preferredLanguage = 'Java' } = params;

    const turnsSummary = state.turns
      .map(
        (t, index) =>
          `Turn ${index + 1} [${t.stage} | ${t.difficulty}] 
Interviewer: ${t.question}
Candidate: ${t.userAnswer}
Feedback: ${t.feedback}`
      )
      .join('\n\n');

    const systemPrompt = `You are a senior software engineering interviewer at a top tech company.
- Conduct a structured interview with stages: introduction, technical (OOP, OS, DBMS, CN), coding (${preferredLanguage}), behavioral, then a summary.
- Ask ONE question at a time in a short, clear way.
- After each user answer, briefly (2-4 sentences) explain if it is correct / partially correct / wrong, and suggest how to improve.
- Then either ask the next, slightly harder or easier question depending on their performance, or finish if the interview is complete.
- Difficulty must adapt: good answers -> harder, weak answers -> easier/clarifying.
- Java should be the default language for coding questions.
- Do NOT include any code execution results, only plain text.
- When summary stage is reached, do NOT ask more questions. Instead, evaluate the candidate based on the entire conversation (all Q&A so far) and produce ONLY a final report. Start your response with SUMMARY_REPORT_MARKDOWN: then the markdown report. The report must include these sections as headings (## or ###): Overall Score, Performance Summary, Technical Knowledge, Problem Solving, Communication Skills, Coding Quality, Strengths, Areas for Improvement, Recommended Resources, Interview Transcript. Fill each section based on the candidate's answers; use N/A or a brief note where a section does not apply (e.g. no coding yet). Even if the interview was ended early with few answers, still produce this report.
Format:
- For normal stages: start with FEEDBACK: ... then QUESTION: ...
- For final summary (when stage is summary): start with SUMMARY_REPORT_MARKDOWN: then the markdown report only. Do not include FEEDBACK or QUESTION.`;

    const stageContext = `Current stage: ${state.stage}
Current difficulty: ${state.difficulty}
Target role: ${targetRole}
Preferred coding language: ${preferredLanguage}

Conversation so far (if any):
${turnsSummary || 'No previous turns yet.'}

Most recent candidate answer (may be empty for the very first question):
${lastUserAnswer || 'No answer yet (this is the first question).'} 
`;

    const prompt = `${systemPrompt}

Now generate the next step based on the current stage and answer.
${state.stage === 'summary' ? 'The interview has been ended. Evaluate the candidate based on the conversation above and output ONLY SUMMARY_REPORT_MARKDOWN: followed by your markdown report with the required sections.' : 'Remember: ONE question at a time, and keep responses concise.'}

${stageContext}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // When we requested a summary (stage is summary), always return a report
    if (state.stage === 'summary') {
      const summaryMarkdown = text.trim().startsWith('SUMMARY_REPORT_MARKDOWN:')
        ? text.replace(/^SUMMARY_REPORT_MARKDOWN:\s*/i, '').trim()
        : text.trim();
      return {
        interviewerMessage: 'Thank you for completing the interview. Here is your report:',
        nextStage: 'summary',
        nextDifficulty: state.difficulty,
        isFinal: true,
        summaryMarkdown: summaryMarkdown || 'Report generated. Review your feedback above.',
      };
    }

    // Simple parsing heuristic for normal steps
    if (text.trim().startsWith('SUMMARY_REPORT_MARKDOWN:')) {
      const summaryMarkdown = text.replace('SUMMARY_REPORT_MARKDOWN:', '').trim();
      return {
        interviewerMessage: 'Thank you for completing the interview. Here is your report:',
        nextStage: 'summary',
        nextDifficulty: state.difficulty,
        isFinal: true,
        summaryMarkdown,
      };
    }

    const feedbackMatch = text.match(/FEEDBACK:(.*?)(QUESTION:|$)/s);
    const questionMatch = text.match(/QUESTION:(.*)$/s);

    const feedback = feedbackMatch ? feedbackMatch[1].trim() : '';
    const interviewerQuestion = questionMatch ? questionMatch[1].trim() : text.trim();

    // Very lightweight difficulty / stage update; frontend can further refine logic if needed
    let nextDifficulty = state.difficulty;
    const positiveSignals = ['good', 'correct', 'great', 'excellent'];
    const negativeSignals = ['incorrect', 'wrong', 'missing', 'weak', 'incomplete'];
    const lowerFeedback = feedback.toLowerCase();

    if (positiveSignals.some((w) => lowerFeedback.includes(w))) {
      nextDifficulty = state.difficulty === 'easy' ? 'medium' : 'hard';
    } else if (negativeSignals.some((w) => lowerFeedback.includes(w))) {
      nextDifficulty = state.difficulty === 'hard' ? 'medium' : 'easy';
    }

    // Stage transitions are managed by the frontend; we just echo current stage
    return {
      interviewerMessage: text.trim(),
      nextStage: state.stage,
      nextDifficulty,
      isFinal: false,
    };
  }
}