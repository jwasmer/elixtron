defmodule Server.Game.GameState do
  use GenServer
  require Logger

  # Client API
  def start_link(_) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get_state do
    GenServer.call(__MODULE__, :get_state)
  end

  def add_player(player_id, position) do
    GenServer.call(__MODULE__, {:add_player, player_id, position})
  end

  def remove_player(player_id) do
    GenServer.call(__MODULE__, {:remove_player, player_id})
  end

  def update_player_position(player_id, position) do
    GenServer.call(__MODULE__, {:update_player_position, player_id, position})
  end

  def get_players do
    GenServer.call(__MODULE__, :get_players)
  end

  # Server callbacks
  @impl true
  def init(_) do
    Logger.info("Game state initialized")
    {:ok, %{players: %{}}}
  end

  @impl true
  def handle_call(:get_state, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_call({:add_player, player_id, position}, _from, state) do
    Logger.info("Player joined: #{player_id}")

    new_player = %{
      position: position || %{x: 0, y: 1, z: 0},
      rotation: %{x: 0, y: 0, z: 0},
      joined_at: :os.system_time(:millisecond)
    }

    new_state = %{state | players: Map.put(state.players, player_id, new_player)}

    {:reply, {:ok, new_player}, new_state}
  end

  @impl true
  def handle_call({:remove_player, player_id}, _from, state) do
    Logger.info("Player left: #{player_id}")

    new_players = Map.delete(state.players, player_id)
    new_state = %{state | players: new_players}

    {:reply, :ok, new_state}
  end

  @impl true
  def handle_call({:update_player_position, player_id, position}, _from, state) do
    case Map.get(state.players, player_id) do
      nil ->
        {:reply, {:error, :player_not_found}, state}

      player ->
        updated_player = Map.put(player, :position, position)
        new_players = Map.put(state.players, player_id, updated_player)
        new_state = %{state | players: new_players}

        {:reply, {:ok, updated_player}, new_state}
    end
  end

  @impl true
  def handle_call(:get_players, _from, state) do
    {:reply, state.players, state}
  end
end
