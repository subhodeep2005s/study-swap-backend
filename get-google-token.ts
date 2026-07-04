import { OAuth2Client } from "google-auth-library";
import * as readline from "readline";
import "dotenv/config";

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 1. Generate a url that asks permissions for Google Calendar
const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];

const url = oauth2Client.generateAuthUrl({
  // 'offline' gets a refresh_token
  access_type: "offline",
  // 'consent' forces the prompt to ensure a refresh_token is returned
  prompt: "consent",
  scope: SCOPES,
});

console.log("\n=======================================================");
console.log("1. Open this URL in your browser and log in with your StudySwap Google account:");
console.log(url);
console.log("=======================================================\n");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 2. Wait for the user to paste the code
rl.question("2. After logging in, you will be redirected to localhost (which will likely say 'Site can't be reached'). Look at the URL in your browser and copy the value after '?code='.\n\nPaste the code here: ", async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log("\n=======================================================");
    console.log("✅ SUCCESS! Copy this refresh token into your .env file:");
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("=======================================================\n");
  } catch (error) {
    console.error("Error exchanging code for token:", error);
  }
  rl.close();
});
