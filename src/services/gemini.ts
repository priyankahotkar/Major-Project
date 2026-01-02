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

export class GeminiService {
  private model: any;

  constructor() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_api_key_here') {
      // Use mock responses for testing
      console.warn('Using mock Gemini service - please set a valid API key for real AI responses');
      this.model = null;
      return;
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

  async chat(message: string, history: Array<{ role: 'user' | 'model', parts: string }> = []): Promise<string> {
    try {
      // If using mock service
      if (!this.model) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        return this.getMockResponse(message);
      }

      const chat = this.model.startChat({
        history: history.map(h => ({
          role: h.role,
          parts: [{ text: h.parts }],
        })),
      });

      const result = await chat.sendMessage(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  private getMockResponse(message: string): string {
    const responses = [
      "Hello! I'm your AI assistant. I can help you with coding questions, career advice, and learning recommendations. What would you like to know?",
      "That's a great question! Based on your interests, I recommend focusing on data structures and algorithms. Would you like me to suggest some specific problems to practice?",
      "I understand you're working on a mentorship platform. That's awesome! I can help you with technical questions, best practices, or even suggest improvements to your project.",
      "For learning new technologies, I suggest starting with small projects. Break down complex concepts into manageable pieces. What specific technology are you interested in?",
      "Debugging is a crucial skill! When you encounter an error, check the console first, then verify your imports and dependencies. Can you share the specific error you're seeing?",
      "Code reviews are essential for growth. Look for code readability, performance optimizations, and potential bugs. Would you like me to review some of your code?",
      "Version control with Git is fundamental. Make small, frequent commits with clear messages. Branching strategies help manage features and bug fixes.",
      "Testing ensures code reliability. Start with unit tests for individual functions, then integration tests. Tools like Jest make this easier.",
      "Clean code principles: meaningful variable names, small functions, DRY (Don't Repeat Yourself), and good documentation. These make your code maintainable.",
      "When learning, focus on understanding concepts rather than memorizing syntax. Build projects, contribute to open source, and teach others what you learn."
    ];

    // Simple keyword matching for more relevant responses
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm your AI coding assistant. I can help you with programming questions, career advice, and learning recommendations. What would you like to know?";
    }

    if (lowerMessage.includes('react') || lowerMessage.includes('javascript') || lowerMessage.includes('typescript')) {
      return "Great choice! React with TypeScript is excellent for building modern web applications. Focus on understanding hooks, component lifecycle, and state management. I can help you with specific questions about these topics!";
    }

    if (lowerMessage.includes('python') || lowerMessage.includes('django') || lowerMessage.includes('flask')) {
      return "Python is fantastic for backend development! Django is great for full-featured web apps, while Flask offers more flexibility. For data science, libraries like pandas and scikit-learn are essential. What aspect interests you most?";
    }

    if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('mongodb')) {
      return "Database design is crucial! SQL databases like PostgreSQL are great for structured data, while MongoDB excels with flexible schemas. Always consider relationships, indexing, and data normalization. Need help with a specific query?";
    }

    if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('interview')) {
      return "Career growth in tech is exciting! Focus on building projects, contributing to open source, and networking. Practice coding interviews regularly. LeetCode, HackerRank, and CodeSignal are great platforms. What role are you targeting?";
    }

    if (lowerMessage.includes('error') || lowerMessage.includes('bug') || lowerMessage.includes('debug')) {
      return "Debugging is a skill that improves with practice! Start by reproducing the error, then use console.log strategically. Check your browser's developer tools, network tab, and error messages. Share the specific error, and I'll help you troubleshoot!";
    }

    // Return a random response if no keywords match
    return responses[Math.floor(Math.random() * responses.length)];
  }
}