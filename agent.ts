import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { tool } from "@langchain/core/tools";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { Collection, MongoClient } from "mongodb";
import { z } from "zod";
import "dotenv/config";

const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GOOGLE_API_KEY as string,
  modelName: "text-embedding-004",
});

export async function callAgent(
  client: MongoClient,
  query: string,
  thread_id: string
) {
  const dbName = "hr_database";
  const db = client.db(dbName);
  const collection = db.collection("employees");

  const GraphState = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
      reducer: (x, y) => x.concat(y),
    }),
  });

  const employeeLookupTool = tool(
    async ({ query, n = 10 }) => {
      console.log("employee look up tool is called");
      const dbConfig = {
        collection: collection,
        indexName: "vector_index",
        textKey: "embedding_text",
        embeddingKey: "embedding",
      };
      const vectorStore = new MongoDBAtlasVectorSearch(embeddings, dbConfig);
      const result = await vectorStore.similaritySearchWithScore(query, n);
      return JSON.stringify(result);
    },
    {
      name: "employee_lookup",
      description: "Gathers employee details from the HR table",
      schema: z.object({
        query: z.string().describe("The search query"),
        n: z
          .number()
          .optional()
          .default(10)
          .describe("Number of results to return"),
      }),
    }
  );
  const tools = [employeeLookupTool];
  const toolNode = new ToolNode<typeof GraphState.State>(tools);
  const llm = new ChatGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_API_KEY as string,
    model: "gemini-1.5-flash",
    temperature: 0,
  }).bindTools(tools);

  async function callModel(state: typeof GraphState.State) {
    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        `You are a helpful AI assistant, collaborating with other assistants.
       Use the provided tools to progress towards answering the question.
       If you are unable to fully answer, that's OK — another assistant will take over.
       Do what you can to make progress.
       If you or any assistant has the final answer, prefix it with:
       FINAL ANSWER so the team knows to stop.

       You have access to these tools: {tool_names}.
       {system_message}
       Current time: {time}.`,
      ],
      new MessagesPlaceholder("messages"),
    ]);
    const formattedPrompt = await prompt.formatMessages({
      system_message: "You are helpful HR Chatbot Agent",
      time: new Date().toISOString(),
      tool_names: tools.map((tool) => tool.name).join(","),
      messages: state.messages,
    });
    const result = await llm.invoke(formattedPrompt);
    return { messages: [result] };
  }
  function shouldContinue(state: typeof GraphState.State) {
    const messages = state.messages;

    const lastMessage = messages[messages.length - 1] as AIMessage;
    if (lastMessage.tool_calls?.length) {
      return "tools";
    }
    return "__end__";
  }
  // agent → (decides) → tools → back to agent → (decides) → end
  const workflow = new StateGraph(GraphState)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

  const checkpointer = new MongoDBSaver({ client, dbName });
  const app = workflow.compile({ checkpointer });
  const finalState = await app.invoke(
    {
      messages: [new HumanMessage(query)],
    },
    { recursionLimit: 15, configurable: { thread_id: thread_id } }
  );
  console.log(finalState.messages[finalState.messages.length - 1]?.content);

  return finalState.messages[finalState.messages.length - 1]?.content;
}
