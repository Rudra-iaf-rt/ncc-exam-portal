const fs = require("fs");
const path = require("path");

function calculatePercentile(arr, p) {
  if (arr.length === 0) return 0;
  arr.sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * arr.length) - 1;
  return arr[index];
}

async function main() {
  const logFile = path.join(__dirname, "query_times.jsonl");
  if (!fs.existsSync(logFile)) {
    console.error("No query_times.jsonl found.");
    return;
  }

  const lines = fs.readFileSync(logFile, "utf-8").split("\n").filter(Boolean);
  const metrics = {};

  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const key = `${data.model}.${data.operation}`;
      if (!metrics[key]) {
        metrics[key] = [];
      }
      metrics[key].push(data.timeMs);
    } catch (e) {
      // Ignore malformed lines
    }
  }

  let report = `# Database Query Performance Report\n\n`;
  report += `| Query Type | Count | Avg (ms) | p95 (ms) | p99 (ms) | Min (ms) | Max (ms) |\n`;
  report += `|------------|-------|----------|----------|----------|----------|----------|\n`;

  for (const [key, times] of Object.entries(metrics)) {
    const count = times.length;
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const p95 = calculatePercentile(times, 95);
    const p99 = calculatePercentile(times, 99);
    const min = Math.min(...times);
    const max = Math.max(...times);

    report += `| ${key} | ${count} | ${avg.toFixed(2)} | ${p95.toFixed(2)} | ${p99.toFixed(2)} | ${min.toFixed(2)} | ${max.toFixed(2)} |\n`;
  }

  const reportPath = path.join(__dirname, "..", "artifacts", "load_test_report.md");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, report);

  console.log(`Report generated at ${reportPath}`);
}

main().catch(console.error);
