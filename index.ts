import express from "express";
import type { Express, Request, Response } from "express";
import { MongoClient } from "mongodb";
import { callAgent } from "./agent.js";
import "dotenv/config";
const app: Express = express();
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_ATLAS_URI as string);
async function startServer() {
  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });
    console.log("pinged it");
    app.get("/", (req: Request, res: Response) => {
      res.send("LangGraph Agent Server");
    });

    app.post("/chat", async (req: Request, res: Response) => {
      const initalMessage = req.body.message;
      const threadId = Date.now().toString();
      try {
        const response = await callAgent(client, initalMessage, threadId);
        res.json({ threadId, response });
      } catch (error) {
        console.error("Error starting the conversation:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    });
    app.post("/chat/:threadId", async (req: Request, res: Response) => {
      const { threadId } = req.params;
      const { message } = req.body;
      try {
        const response = await callAgent(client, message, threadId as string);
        res.json({response})
      } catch (error) {
        console.error("Error in chat:", error);
        res.status(500).json({error:"Internal server error"})
      }
    });
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("error connecting to mongodb", error);
    process.exit(1);
  }
}

startServer();
