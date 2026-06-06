export const getLatestCommits = async (repoUrl: string, limit: number = 5) => {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);

  if (!match) {
    throw new Error("Invalid GitHub Repository URL");
  }

  const [, owner, repo] = match as [string, string, string];
  const cleanRepo = repo.replace(/\.git$/, "").replace(/\/$/, "");

  const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits?per_page=${limit}`;

  const response = await fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      ...(process.env.GITHUB_TOKEN && {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      }),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = (await response.json()) as any[];

  return data.map((commitData: any) => ({
    sha: commitData.sha.substring(0, 7),
    message: commitData.commit.message,
    author: commitData.commit.author.name,
    date: commitData.commit.author.date,
    url: commitData.html_url,
  }));
};
