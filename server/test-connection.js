// Simple test script to verify client-server connection

const CLIENT_URL = "http://localhost:5173";
const SERVER_URL = "http://localhost:3000";

async function testConnection() {
  console.log("🧪 Testing LINE Shared Expense Tracker...\n");

  // Test Server
  console.log("📡 Testing Server...");
  try {
    const serverResponse = await fetch(`${SERVER_URL}/health`);
    const serverData = await serverResponse.json();
    console.log("✅ Server Status:", serverData.status);
    console.log("⏰ Server Uptime:", Math.round(serverData.uptime), "seconds");
  } catch (error) {
    console.log("❌ Server Error:", error.message);
  }

  // Test Client
  console.log("\n🌐 Testing Client...");
  try {
    const clientResponse = await fetch(CLIENT_URL);
    console.log("✅ Client Status Code:", clientResponse.status);
    console.log(
      "✅ Client Content-Type:",
      clientResponse.headers.get("content-type")
    );
  } catch (error) {
    console.log("❌ Client Error:", error.message);
  }

  // Test API endpoints (without auth)
  console.log("\n🔐 Testing API Authentication...");
  try {
    const apiResponse = await fetch(`${SERVER_URL}/api/auth/profile`);
    const apiData = await apiResponse.json();
    console.log("✅ API Protection working:", apiData.error.message);
  } catch (error) {
    console.log("❌ API Error:", error.message);
  }

  console.log("\n🎉 Test completed!");
}

testConnection();
