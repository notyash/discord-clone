const ws = new WebSocket("ws://localhost:8000/rpc");
ws.onopen = async () => {
  console.log(" Connected to SurrealDB WebSocket");
  // 1. Authenticate as Ferris
  send("signin", [{
    ns: "discord_clone",
    db: "dev",
    ac: "account",
    email: "ferris@test.com",
    pass: "pass123"
  }]);
};
let queryStarted = false;
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  // If signin succeeded, start the LIVE SELECT
  if (msg.id === 1 && !queryStarted) {
    queryStarted = true;
    console.log(" Authenticated as Ferris! Starting LIVE SELECT on #general...");
    send("query", ["LIVE SELECT * FROM message WHERE channel = channel:general;"]);
  } else if (msg.id === 2) {
    console.log(` Live query active with UUID: ${msg.result?.[0]?.result}`);
    console.log(" Waiting for real-time messages... (Keep this terminal open)\n");
  } else {
    // Incoming real-time Live Query push notification
    console.log(" [REAL-TIME EVENT RECEIVED]:", JSON.stringify(msg, null, 2));
  }
};
let reqId = 1;
function send(method, params) {
  ws.send(JSON.stringify({ id: reqId++, method, params }));
}