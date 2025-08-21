import { useEffect, useState } from "react";

const App = () => {
  const [message, setMessage] = useState("");
  // Each message has: { role: "user" or "ai", text: "..." }
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  useEffect(() => {
    console.log("saving chat")
    const saved = localStorage.getItem("chat");
    if (saved) {
      setChat(JSON.parse(saved));
    }
  }, []);
  useEffect(() => {
    console.log("Updated chat")
    localStorage.setItem("chat", JSON.stringify(chat));
  }, [chat]);
  async function sendMessage() {
    const res = await fetch("http://localhost:3000/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    setChat((prev) => [
      ...prev,
      { role: "user", text: message },
      { role: "ai", text: data.response },
    ]);
    setMessage("");
  }

  return (
    <main>
      <h1 className="text-4xl font-semibold text-center tracking-tighter text-black">
        LangGraph Agent
      </h1>
      <div className="w-full max-w-2xl h-[600px] bg-gray-900/80 mx-auto mt-10 p-5 border border-gray-800 rounded-2xl shadow-md overflow-y-auto space-y-3 ">
        {chat.map((c, i) => (
          <div className="flex flex-col" key={i}>
            {c.role === "user" ? (
              <div className="self-end bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl rounded-br-sm max-w-[75%]">
                {c.text}
              </div>
            ) : (
              <div className="self-start bg-gray-100 text-gray-900 px-4 py-2 rounded-2xl rounded-bl-sm max-w-[75%]">
                {c.text}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className=" flex justify-between gap-5 items-center w-full max-w-2xl mx-auto mt-5 bg-white h-14 rounded-2xl p-5">
        <input
          type="text"
          value={message}
          placeholder="Enter your query"
          onChange={(e) => setMessage(e.target.value)}
          className="text-black w-full outline-none bg-transparent placeholder-gray-400 flex-1"
        />
        <button
          className="bg-black text-white text-sm font-medium rounded-2xl px-4 py-2 "
          onClick={sendMessage}
        >
          submit
        </button>
      </div>
    </main>
  );
};

export default App;
