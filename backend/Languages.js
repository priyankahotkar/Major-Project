const username = "priyankahotkar";

async function getLanguages() {
  try {
    const reposResponse = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100`
    );

    const repos = await reposResponse.json();

    // Check if repos is actually an array
    if (!Array.isArray(repos)) {
      console.error("GitHub API Error:", repos.message);
      return;
    }

    let languageStats = {};

    // Fetch languages from each repo
    await Promise.all(
      repos.map(async (repo) => {
        if (!repo.languages_url) return;

        const res = await fetch(repo.languages_url);
        const langs = await res.json();

        // Ignore API error responses
        if (langs.message) return;

        for (const lang in langs) {
          languageStats[lang] = (languageStats[lang] || 0) + langs[lang];
        }
      })
    );

    // Convert to language array
    const languagesArray = Object.keys(languageStats);

    console.log("\nLanguages Used:\n");
    console.log(languagesArray);

  } catch (error) {
    console.error("Error fetching GitHub data:", error);
  }
}

getLanguages();