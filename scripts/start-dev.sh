# scripts/start-dev.sh
#!/bin/bash

# Create a log directory
mkdir -p logs

# Start the Elixir server
echo "Starting Elixir server..."
cd server
mix deps.get
elixir --no-halt -S mix run -e "Server.Application.start(:normal, [])" > ../logs/backend.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Start the Electron client (first instance)
echo "Starting first client..."
cd ../client
npm install
npm run start > ../logs/client1.log 2>&1 &
CLIENT_PID=$!

echo "Wait a few seconds before starting the second client..."
sleep 5

# Start a second instance
echo "Starting second client..."
npm run start-second > ../logs/client2.log 2>&1 &
SECOND_CLIENT_PID=$!

# Handle termination
function cleanup {
  echo "Shutting down..."
  kill $SERVER_PID
  kill $CLIENT_PID
  kill $SECOND_CLIENT_PID
  exit 0
}

trap cleanup SIGINT SIGTERM

echo "All processes started. Press Ctrl+C to exit."
wait