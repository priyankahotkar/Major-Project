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
      const response = await fetch(`https://leetcode-api-pied.vercel.app/user/${username}`);
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
}