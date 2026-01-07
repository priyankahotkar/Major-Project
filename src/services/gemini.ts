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

Based on this data, create a detailed learning roadmap that includes:
1. Assessment of current skills and areas for improvement
2. Weekly breakdown of tasks and learning objectives
3. Recommended practice problems (from LeetCode/Codeforces) matching their current level
4. Project suggestions based on their GitHub activity and interests
5. Resources and learning materials
6. Milestones and progress tracking metrics
7. Tips for improving contest performance
8. Suggested open-source contribution opportunities

Format the response in markdown with clear sections and subsections.`;

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
- When summary stage is reached, do NOT ask more questions. Instead, produce a compact evaluation report in markdown with:
  - Score out of 10
  - Strengths
  - Weak areas
  - Topics to improve
  - Hiring recommendation (e.g., Strong Hire / Hire / Weak Hire / No Hire).
Format:
- For normal stages: start with FEEDBACK: ... then QUESTION: ...
- For final summary: start with SUMMARY_REPORT_MARKDOWN: then the markdown report only.`;

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
Remember: ONE question at a time, and keep responses concise.

${stageContext}`;

    const result = await this.model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Simple parsing heuristic
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