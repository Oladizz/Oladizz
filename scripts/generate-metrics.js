#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const PAT = process.env.GITHUB_PAT;

if (!PAT) {
  console.error('Error: GITHUB_PAT environment variable is not set');
  process.exit(1);
}

const headers = {
  'Authorization': `token ${PAT}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'GitHub-Metrics-Generator'
};

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers }, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function generateMetrics() {
  console.log('📊 Starting metrics generation...');
  
  try {
    // Get authenticated user info
    console.log('Fetching user info...');
    const userData = await makeRequest('https://api.github.com/user');
    
    // Get all repositories (paginated)
    console.log('Fetching repositories...');
    const allRepos = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      console.log(`  Fetching page ${page}...`);
      const repos = await makeRequest(
        `https://api.github.com/user/repos?per_page=100&page=${page}&sort=updated&direction=desc`
      );
      
      if (repos.length === 0) {
        hasMore = false;
      } else {
        allRepos.push(...repos);
        page++;
      }
    }
    
    console.log(`Found ${allRepos.length} repositories`);
    
    // Get top contributors
    console.log('Aggregating data...');
    const languages = {};
    const topRepos = allRepos
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 10);
    
    // Collect languages
    allRepos.forEach(repo => {
      if (repo.language) {
        languages[repo.language] = (languages[repo.language] || 0) + 1;
      }
    });
    
    // Build metrics object
    const metrics = {
      generated_at: new Date().toISOString(),
      user: {
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
        bio: userData.bio || 'No bio',
        location: userData.location || 'Not specified',
        public_repos: userData.public_repos,
        followers: userData.followers,
        following: userData.following,
        profile_url: userData.html_url
      },
      statistics: {
        total_repositories: allRepos.length,
        public_repositories: allRepos.filter(r => !r.private).length,
        private_repositories: allRepos.filter(r => r.private).length,
        total_stars: allRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0),
        total_forks: allRepos.reduce((sum, repo) => sum + repo.forks_count, 0),
        total_watchers: allRepos.reduce((sum, repo) => sum + repo.watchers_count, 0),
        total_issues: allRepos.reduce((sum, repo) => sum + repo.open_issues_count, 0),
        total_languages: Object.keys(languages).length
      },
      languages: Object.entries(languages)
        .sort((a, b) => b[1] - a[1])
        .reduce((obj, [lang, count]) => {
          obj[lang] = count;
          return obj;
        }, {}),
      top_repositories: topRepos.map(repo => ({
        name: repo.name,
        description: repo.description || 'No description',
        url: repo.html_url,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        language: repo.language,
        topics: repo.topics || [],
        updated_at: repo.updated_at,
        created_at: repo.created_at
      }))
    };
    
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Write metrics to file
    const outputPath = path.join(dataDir, 'metrics.json');
    fs.writeFileSync(outputPath, JSON.stringify(metrics, null, 2));
    
    // Update README with latest metrics
    updateReadme(metrics);
    
    console.log(`✅ Metrics generated successfully!`);
    console.log(`   Total Repos: ${metrics.statistics.total_repositories}`);
    console.log(`   Total Stars: ${metrics.statistics.total_stars}`);
    console.log(`   Top Languages: ${Object.keys(metrics.languages).slice(0, 3).join(', ')}`);
    console.log(`   Output: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error generating metrics:', error.message);
    process.exit(1);
  }
}

generateMetrics();

// Function to update README with metrics
function updateReadme(metrics) {
  const fs = require('fs');
  const path = require('path');
  
  const readmePath = path.join(__dirname, '../README.md');
  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  const stats = metrics.statistics;
  const user = metrics.user;
  const topLanguages = Object.entries(metrics.languages)
    .slice(0, 5)
    .map(([lang, count]) => `${lang}`)
    .join(', ');
  
  const metricsSection = `## 📊 Account Metrics Dashboard

View real-time statistics of my GitHub account with interactive dashboards:

### Live Metrics
- **📈 Auto-generated every 6 hours** via GitHub Actions
- **${stats.total_repositories} Total Repositories** (${stats.public_repositories} public, ${stats.private_repositories} private)
- **${stats.total_languages} Programming Languages** (${topLanguages}, and more)
- **${user.followers} Followers** | **${user.following} Following**

### 🎨 Dashboard Views

| Dashboard | Description |
|-----------|-------------|
| [**Account Metrics (GitHub Actions)**](account-metrics-github-actions.html) | **Recommended** - Full account overview with live metrics, fetched automatically every 6 hours. No input required. |
| [**Single Repository Metrics**](metrics.html) | Detailed metrics for this repository specifically. |
| [**Interactive Dashboard (PAT Input)**](account-metrics.html) | Real-time metrics by entering a GitHub PAT token in your browser. |

**🚀 Start here:** Open [account-metrics-github-actions.html](account-metrics-github-actions.html) to see your metrics dashboard!`;
  
  // Replace the metrics section
  const metricsRegex = /## 📊 Account Metrics Dashboard[\s\S]*?(?=\n---\n)/;
  
  if (metricsRegex.test(readmeContent)) {
    readmeContent = readmeContent.replace(metricsRegex, metricsSection);
  } else {
    // If section doesn't exist, add it after the header
    readmeContent = readmeContent.replace(
      /(<\/div>\n\n---\n)/,
      `</div>\n\n---\n\n${metricsSection}\n\n---\n`
    );
  }
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('✅ README.md updated with latest metrics');
}
