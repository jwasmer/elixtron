# lib/network/server.ex
defmodule Game.Network.Server do
  use GenServer
  require Logger

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def broadcast_state(entities) do
    GenServer.cast(__MODULE__, {:broadcast_state, entities})
  end

  def init(opts) do
    port = Keyword.get(opts, :port, 12345)

    {:ok, socket} = RakNet.open_socket(port)

    Logger.info("Game server started on port #{port}")

    {:ok, %{
      socket: socket,
      clients: %{}  # client_id => {address, port}
    }}
  end

  def handle_info({:raknet, {address, port}, packet}, state) do
    try do
      case Jason.decode(packet) do
        {:ok, %{"type" => "connect", "client_id" => client_id}} ->
          handle_client_connect(client_id, address, port, state)

        {:ok, %{"type" => "disconnect", "client_id" => client_id}} ->
          handle_client_disconnect(client_id, state)

        {:ok, %{"type" => "input", "client_id" => client_id, "position" => position, "rotation" => rotation}} ->
          # Update player position in the world
          Game.World.update_player(client_id, position, rotation)
          {:noreply, state}

        {:ok, %{"type" => "ping", "client_id" => client_id}} ->
          # Just acknowledge ping
          send_packet(address, port, Jason.encode!(%{type: "pong"}), state)
          {:noreply, state}

        _ ->
          Logger.warn("Unknown packet format from #{address}:#{port}")
          {:noreply, state}
      end
    rescue
      e ->
        Logger.error("Error processing packet: #{inspect(e)}")
        {:noreply, state}
    end
  end

  def handle_cast({:broadcast_state, entities}, state) do
    # Encode game state
    game_state = Jason.encode!(%{
      type: "state_update",
      entities: serialize_entities(entities)
    })

    # Send to all clients
    Enum.each(state.clients, fn {_client_id, {address, port}} ->
      send_packet(address, port, game_state, state)
    end)

    {:noreply, state}
  end

  defp handle_client_connect(client_id, address, port, state) do
    Logger.info("Client connected: #{client_id} from #{address}:#{port}")

    # Register the client
    updated_clients = Map.put(state.clients, client_id, {address, port})

    # Add player to the game world
    Game.World.add_player(client_id)

    # Send acknowledgment
    send_packet(address, port, Jason.encode!(%{type: "connect_ack", client_id: client_id}), state)

    {:noreply, %{state | clients: updated_clients}}
  end

  defp handle_client_disconnect(client_id, state) do
    Logger.info("Client disconnected: #{client_id}")

    # Remove player from the game world
    Game.World.remove_player(client_id)

    # Unregister the client
    updated_clients = Map.delete(state.clients, client_id)

    {:noreply, %{state | clients: updated_clients}}
  end

  defp send_packet(address, port, data, state) do
    RakNet.send_packet(state.socket, {address, port}, data)
  end

  defp serialize_entities(entities) do
    Enum.map(entities, fn entity ->
      %{
        id: entity.id,
        components: serialize_components(entity.components)
      }
    end)
  end

  defp serialize_components(components) do
    Map.new(components, fn {type, component} ->
      {Atom.to_string(type), Map.from_struct(component)}
    end)
  end
end
