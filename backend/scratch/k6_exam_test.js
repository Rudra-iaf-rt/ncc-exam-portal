import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import papaparse from "https://jslib.k6.io/papaparse/5.1.1/index.js";

// Load test data
const csvData = new SharedArray("Test Users", function () {
  const fileData = open("./test_users.csv");
  const result = papaparse.parse(fileData, { header: true });
  return result.data;
});

// Configure test options
export const options = {
  vus: 500,        // 500 concurrent users
  duration: "10m", // Give it enough time to run through 200 questions
};

const BASE_URL = __ENV.API_URL || "http://localhost:3000/api";

export default function () {
  // Each VU picks a unique user from the array based on its ID
  const userIndex = (__VU - 1) % csvData.length;
  const user = csvData[userIndex];

  if (!user || !user.token || !user.examId) {
    return; // Skip invalid rows
  }

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user.token}`,
    },
  };

  // 1. Start Attempt
  const startRes = http.post(`${BASE_URL}/attempt/start`, JSON.stringify({ examId: user.examId }), params);
  check(startRes, { "start status is 200/201": (r) => r.status === 200 || r.status === 201 });

  // Simulate reading instructions
  sleep(1);

  // 2. Loop 200 times answering questions
  for (let i = 0; i < 200; i++) {
    const answerPayload = {
      examId: user.examId,
      questionId: null, // Depending on the actual API structure, this might just save the index
      selectedAnswer: ["A", "B", "C", "D"][i % 4],
      nextQuestionIndex: i + 1,
    };
    
    // Some implementations use `/attempt/answer`, some use `/attempt/save-progress`
    const ansRes = http.post(`${BASE_URL}/attempt/save-progress`, JSON.stringify(answerPayload), params);
    
    // Simulating thinking time/network delay between 0.5s and 1s
    sleep(Math.random() * 0.5 + 0.5);
  }

  // 3. Submit
  const submitRes = http.post(`${BASE_URL}/attempt/submit`, JSON.stringify({ examId: user.examId }), params);
  check(submitRes, { "submit status is 200": (r) => r.status === 200 });
}
