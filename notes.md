
# AI Agent with LangChain + MongoDB Notes

## 1. Project Setup
- TypeScript + ES Modules (`"type": "module"` in package.json)  
- Installed packages: `@langchain/core`, `@langchain/google-genai`, `@langchain/mongodb`, `zod`, `dotenv`, `mongodb`, `express`  
- `.env` stores sensitive info like `MONGODB_ATLAS_URI`  

---

## 2. MongoDB Connection
- `MongoClient(uri)` connects to Atlas  
- `await client.connect()` ensures connection upfront (optional: lazy connects on first query)  
- `db.collection("employees")` selects the collection  
- `await collection.deleteMany({})` clears old data  

---

## 3. Employee Schema & Data
- Zod schema defines structure and types:  
```ts
const EmployeeSchema = z.object({ employee_id: z.string(), ... });
type Employee = z.infer<typeof EmployeeSchema>;
````

* `StructuredOutputParser.fromZodSchema()` converts LLM JSON → typed objects

---

## 4. LLM & Embeddings

* Google Gemini LLM (`ChatGoogleGenerativeAI`) generates fake employee data
* `GoogleGenerativeAIEmbeddings` converts text → vector arrays
* `pageContent` = text summary of employee
* `metadata` = original employee object

---

## 5. Data Processing Flow

1. `generateData()` → LLM produces employee array
2. `createEmployeeSummary()` → convert each employee to readable text
3. Combine into:

```ts
{ pageContent: summary, metadata: { ...record } }
```

4. `MongoDBAtlasVectorSearch.fromDocuments()` → converts `pageContent` to embeddings and stores vector + metadata in MongoDB

---

## 6. Notes on Promises

* `Promise.all(array.map(async))` → process all records concurrently
* `.catch(console.error)` → handle uncaught promise errors

---

## 7. Semantic Search Preparation

* Text → Embeddings → Stored in MongoDB
* Required for similarity search or AI retrieval
* `embedding_text` stores summary, `embedding` stores numeric vector, `metadata` stores original record

---

## 8. Key Takeaways

* Explicit `connect()` is safer but optional
* `.gitignore` prevents committing `node_modules`, `.env`, and build files
* LLM output is JSON as string → parsed to objects for type safety
* `pageContent` vs `metadata` separates human-readable text from structured data

## LangGraph is a state machine — it moves between steps (called nodes).

### User messages (HumanMessage)
### AI replies (AIMessage)
### Tool results (ToolMessage)

```powershell
$body = @{
    message = "Build a team to make an iOS app, and tell me the talent gaps"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/chat" `
                  -Method Post `
                  -ContentType "application/json" `
                  -Body $body

