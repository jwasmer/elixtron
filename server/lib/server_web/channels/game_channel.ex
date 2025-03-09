defmodule GameServerWeb.GameChannel do
  use Phoenix.Channel
  require Logger
  alias GameServer.Game.GameState

  def join("game:lobby", _message, socket) do
    # Generate a player ID
    player_id = "player-#{System.unique_integer([:positive])}"
    socket = assign(socket, :player_id, player_id)

    # Add player to game state
    {:ok, player} = GameState.add_player(player_id, %{x: 0, y: 1, z: 0})

    # Get current players
    players = GameState.get_players()

    # Notify other players about the new player
    broadcast_from!(socket, "player_joined", %{
      playerId: player_id,
      position: player.position,
      timestamp: :os.system_time(:millisecond)
    })

    # Send initial state to the new player
    {:ok, %{
      playerId: player_id,
      players: players,
      timestamp: :os.system_time(:millisecond)
    }, socket}
  end

  def handle_in("player_position", %{"position" => position} = payload, socket) do
    player_id = socket.assigns.player_id

    # Update game state
    {:ok, _updated} = GameState.update_player_position(player_id, position)

    # Broadcast to other players
    broadcast_from!(socket, "player_position", %{
      playerId: player_id,
      position: position,
      rotation: payload["rotation"],
      timestamp: payload["timestamp"] || :os.system_time(:millisecond)
    })

    {:noreply, socket}
  end

  def handle_in("ping", _payload, socket) do
    # Send pong response
    push(socket, "pong", %{timestamp: :os.system_time(:millisecond)})
    {:noreply, socket}
  end

  def terminate(_reason, socket) do
    player_id = socket.assigns.player_id

    # Remove player from game state
    GameState.remove_player(player_id)

    # Notify other players
    broadcast_from!(socket, "player_left", %{
      playerId: player_id,
      timestamp: :os.system_time(:millisecond)
    })

    :ok
  end
end
