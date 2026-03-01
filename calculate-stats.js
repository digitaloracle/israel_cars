const { execSync } = require('child_process');
const fs = require('fs');

const AI_PATTERNS = [
  /Co-authored-by: GitHub Copilot <noreply@github\.com>/i,
  /Co-authored-by: cursor-ai <sos@cursor\.sh>/i,
  /Co-authored-by: Cursor <sos@cursor\.sh>/i,
  /AI-Assistant:/i,
  /Generated-by:/i,
  /AI-Generated: true/i,
  /Co-authored-by: .*<.*ai.*@.*>/i,
  /\[ai-commit\]/i,
  /aider:/i,
  /\(aider\)/i,
  /\[aider\]/i,
  /Gemini/i,
  /Claude/i,
  /Codex/i,
  /Amazon Q/i,
  /amazon-q-developer\[bot\]/i,
  /Codeium/i,
  /Tabnine/i,
  /Assisted-by:/i,
  /AI-Model:/i
];

function getCommits() {
  const rawLimit = process.env.COMMIT_LIMIT;
  if (rawLimit !== undefined && !/^\d+$/.test(rawLimit)) {
    throw new Error(`COMMIT_LIMIT must be a positive integer, got: ${rawLimit}`);
  }
  const limit = rawLimit ? `-n ${rawLimit}` : '';
  // Get all commit messages, separated by a special delimiter
  const output = execSync(`git log ${limit} --format="%B%n---COMMIT-END---" --no-merges`).toString();
  return output.split('---COMMIT-END---').map(s => s.trim()).filter(Boolean);
}

function analyzeCommits(commits) {
  let aiCount = 0;
  let totalCount = commits.length;

  commits.forEach(msg => {
    const isAI = AI_PATTERNS.some(pattern => pattern.test(msg));
    if (isAI) {
      aiCount++;
    }
  });

  const humanCount = totalCount - aiCount;
  const humanPercentage = totalCount > 0 ? Math.round((humanCount / totalCount) * 100) : 100;

  return {
    total: totalCount,
    ai: aiCount,
    human: humanCount,
    humanPercentage: humanPercentage
  };
}

let commits;
try {
  commits = getCommits();
} catch (error) {
  console.error('Error reading git log:', error.message);
  process.exit(1);
}
const stats = analyzeCommits(commits);

console.log('--- Stats ---');
console.log(`Total Commits: ${stats.total}`);
console.log(`Hand Crafted: ${stats.human} (${stats.humanPercentage}%)`);
console.log(`AI Co-edited: ${stats.ai}`);

// Save to a JSON for Shields.io or Action consumption
const shieldsData = {
  schemaVersion: 1,
  label: 'hand crafted',
  message: `${stats.humanPercentage}%`,
  color: stats.humanPercentage > 80 ? 'green' : stats.humanPercentage > 50 ? 'yellow' : 'orange',
  cacheSeconds: 3600
};

fs.writeFileSync('hand-crafted-stats.json', JSON.stringify(shieldsData, null, 2));
console.log('\nSaved stats to hand-crafted-stats.json');
