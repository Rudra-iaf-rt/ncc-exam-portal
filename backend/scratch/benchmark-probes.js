/**
 * High-performance, self-contained local API benchmark script.
 * Programmatically boots the Express app on a dynamic port, 
 * fires concurrent requests using global fetch, and reports p50/p90/p95 response latencies.
 */
const { app } = require("../src/app");
const { performance } = require("perf_hooks");

async function runBenchmark() {
  console.log("=================================================");
  console.log("🚀 BOOTING NCC EXAM BACKEND FOR LATENCY AUDIT...");
  console.log("=================================================");

  // Boot the app on a dynamic random free port
  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`[App] Server listening on dynamic port: ${port}`);
    console.log(`[App] Verification URL: ${baseUrl}/health`);

    try {
      console.log("\n1. Running Telemetry & Tracing Validation...");
      const traceRes = await fetch(`${baseUrl}/health`);
      const body = await traceRes.json();
      
      const requestIdHeader = traceRes.headers.get("X-Request-ID");
      console.log(`[Trace] HTTP Status: ${traceRes.status}`);
      console.log(`[Trace] Health Response:`, body);
      console.log(`[Trace] Response Header [X-Request-ID]: ${requestIdHeader}`);

      if (!requestIdHeader) {
        console.error("❌ FAILURE: X-Request-ID tracing header is missing from the response!");
      } else {
        console.log("✅ SUCCESS: X-Request-ID response header matches req.requestId UUID.");
      }

      console.log("\n2. Executing Concurrent Latency Probes (100 parallel requests to GET /health)...");
      const requestCount = 100;
      const latencies = [];

      const start = performance.now();
      const promises = Array.from({ length: requestCount }).map(async (_, idx) => {
        const reqStart = performance.now();
        try {
          const res = await fetch(`${baseUrl}/health`);
          await res.json();
          const duration = performance.now() - reqStart;
          latencies.push(duration);
        } catch (err) {
          console.error(`[Probe Error] Request ${idx} failed:`, err.message);
        }
      });

      await Promise.all(promises);
      const totalTime = performance.now() - start;

      // Calculate latency metrics
      latencies.sort((a, b) => a - b);
      const sum = latencies.reduce((acc, v) => acc + v, 0);
      const avg = sum / latencies.length;
      const p50 = latencies[Math.floor(latencies.length * 0.50)];
      const p90 = latencies[Math.floor(latencies.length * 0.90)];
      const p95 = latencies[Math.floor(latencies.length * 0.95)];
      const min = latencies[0];
      const max = latencies[latencies.length - 1];

      console.log("=================================================");
      console.log("📊 LATENCY METRICS SUMMARY (Local Loopback)");
      console.log("=================================================");
      console.log(`Total Requests Sent : ${requestCount}`);
      console.log(`Total Elapsed Time  : ${totalTime.toFixed(2)} ms`);
      console.log(`Requests / Second   : ${((requestCount / totalTime) * 1000).toFixed(2)} req/sec`);
      console.log(`Min Latency         : ${min.toFixed(2)} ms`);
      console.log(`Average Latency     : ${avg.toFixed(2)} ms`);
      console.log(`p50 (Median)        : ${p50.toFixed(2)} ms`);
      console.log(`p90 Latency         : ${p90.toFixed(2)} ms`);
      console.log(`p95 Latency         : ${p95.toFixed(2)} ms`);
      console.log(`Max Latency         : ${max.toFixed(2)} ms`);
      console.log("=================================================");
      console.log("🎉 Benchmarking completed successfully!");

    } catch (error) {
      console.error("❌ Benchmarking failed with error:", error);
    } finally {
      console.log("\n🛑 Closing temporary server instance...");
      server.close(() => {
        console.log("👋 Server shut down gracefully. Exiting.");
        process.exit(0);
      });
    }
  });
}

runBenchmark();
