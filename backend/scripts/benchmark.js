require("../src/lib/load-env");
const { app } = require("../src/app");
const { prisma } = require("../src/lib/prisma");
const jwt = require("jsonwebtoken");
const http = require("http");

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

// We will track response times
const results = {};

async function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer(app);
    server.listen(PORT, () => {
      resolve(server);
    });
  });
}

async function measure(name, method, path, headers, body = null, iterations = 10) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      const options = {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      };
      if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
        options.body = JSON.stringify(body);
      }
      
      const res = await fetch(`${BASE_URL}${path}`, options);
      // Consume the response
      await res.text();
      
      const end = performance.now();
      times.push(end - start);
    } catch (err) {
      console.error(`Error in ${name}:`, err.message);
      // Still record a failed request time if it threw?
    }
  }

  if (times.length === 0) return;

  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95Index = Math.floor(times.length * 0.95);
  const p95 = times[p95Index] || times[times.length - 1];
  const min = times[0];
  const max = times[times.length - 1];

  results[name] = {
    method,
    path,
    avg: avg.toFixed(2),
    p95: p95.toFixed(2),
    min: min.toFixed(2),
    max: max.toFixed(2),
  };
}

async function run() {
  console.log("Starting server...");
  const server = await startServer();

  console.log("Ensuring test user exists...");
  let user = await prisma.user.findFirst({ where: { role: "STUDENT" } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Test Student",
        email: "teststudent@example.com",
        password: "hashedpassword",
        role: "STUDENT",
      }
    });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET || "fallback_secret",
    { expiresIn: "1h" }
  );

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  console.log("Starting benchmarks...");

  await measure("Health Check", "GET", "/health", {});
  await measure("Get Current User", "GET", "/api/auth/me", authHeaders);
  await measure("List Exams Catalog", "GET", "/api/exams", authHeaders);
  
  const exam = await prisma.exam.findFirst({ where: { status: "LIVE" } });
  if (exam) {
    await measure("Get Single Exam", "GET", `/api/exams/${exam.id}`, authHeaders);
    // Be careful with Attempt APIs as they mutate state and could fail if already submitted
  }

  await measure("List Materials", "GET", "/api/materials", authHeaders);
  await measure("List Results", "GET", "/api/results", authHeaders);
  await measure("List Notifications", "GET", "/api/notifications", authHeaders);

  console.log("\n--- BENCHMARK RESULTS ---");
  console.table(results);

  server.close();
  await prisma.$disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error("Benchmark failed", err);
  await prisma.$disconnect();
  process.exit(1);
});
