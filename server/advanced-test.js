// Advanced testing for LINE Shared Expense Tracker
const SERVER_URL = "http://localhost:3000";

async function advancedTest() {
  console.log("🔍 Advanced Testing - LINE Shared Expense Tracker\n");

  // Test all API endpoints without auth (should return 401)
  const endpoints = [
    "/api/users",
    "/api/groups",
    "/api/expenses",
    "/api/debts",
    "/api/auth/profile",
  ];

  console.log("🔐 Testing API Protection...");
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${SERVER_URL}${endpoint}`);
      const data = await response.json();

      if (response.status === 401) {
        console.log(`✅ ${endpoint} - Protected correctly`);
      } else {
        console.log(`❌ ${endpoint} - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}`);
    }
  }

  // Test LINE webhook endpoint (should be accessible)
  console.log("\n📱 Testing LINE Webhook...");
  try {
    const response = await fetch(`${SERVER_URL}/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ test: "data" }),
    });

    console.log(`✅ Webhook Status: ${response.status}`);
  } catch (error) {
    console.log(`❌ Webhook Error: ${error.message}`);
  }

  // Test CORS
  console.log("\n🌐 Testing CORS...");
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      headers: {
        Origin: "http://localhost:5173",
      },
    });

    const corsHeader = response.headers.get("access-control-allow-origin");
    console.log(`✅ CORS Header: ${corsHeader || "Not set"}`);
  } catch (error) {
    console.log(`❌ CORS Error: ${error.message}`);
  }

  console.log("\n🎯 Test Summary Complete!");
}

advancedTest();
