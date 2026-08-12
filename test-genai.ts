import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function test() {
  const tools = [{
    functionDeclarations: [{
      name: "get_weather",
      description: "Get the weather",
      parameters: {
        type: Type.OBJECT,
        properties: {
          location: { type: Type.STRING }
        }
      }
    }]
  }];

  const chat = ai.chats.create({
    model: "gemini-flash-latest",
    config: { tools }
  });

  console.log("Sending message...");
  let response = await chat.sendMessage({ message: "What's the weather in London?" });
  console.log("Calls:", response.functionCalls);

  if (response.functionCalls?.length) {
    const call = response.functionCalls[0];
    const functionResponseParts = [{
      functionResponse: {
        name: call.name,
        id: call.id,
        response: { temp: 20 }
      }
    }];
    
    console.log("Sending function response...");
    try {
      // Test 1: Array of parts
      let res2 = await chat.sendMessage(functionResponseParts);
      console.log("Success with array:", res2.text);
    } catch (e: any) {
      console.error("Error with array:", e.message);
      try {
         // Test 2: object with message
         let res3 = await chat.sendMessage({ message: functionResponseParts });
         console.log("Success with {message}:", res3.text);
      } catch (err: any) {
         console.error("Error with {message}:", err.message);
      }
    }
  }
}

test().catch(console.error);
