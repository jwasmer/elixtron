# lib/game/world.ex
defmodule Game.World do
  use GenServer
  require Logger

  alias Game.ECS.Entity
  alias Game.ECS.Components

  # Client API

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  def add_player(client_id) do
    GenServer.call(__MODULE__, {:add_player, client_id})
  end

  def remove_player(client_id) do
    GenServer.call(__MODULE__, {:remove_player, client_id})
  end

  def update_player(client_id, position, rotation) do
    GenServer.cast(__MODULE__, {:update_player, client_id, position, rotation})
  end

  def get_state do
    GenServer.call(__MODULE__, :get_state)
  end

  # Server callbacks

  def init(_opts) do
    # Schedule the game loop update
    Process.send_after(self(), :tick, 50)  # 20 FPS

    {:ok, %{
      entities: %{},                  # Map of entity_id => entity
      player_entities: %{},           # Map of client_id => entity_id
      systems: initialize_systems(),
      last_update: System.monotonic_time(:millisecond)
    }}
  end

  def handle_call({:add_player, client_id}, _from, state) do
    # Create a new player entity
    entity = Entity.new()
      |> Entity.add_component(Components.Position.type(), Components.Position.new(0, 1, 0))
      |> Entity.add_component(Components.Rotation.type(), Components.Rotation.new(0, 0, 0))
      |> Entity.add_component(Components.Player.type(), Components.Player.new(client_id))

    # Update state
    new_state = %{state |
      entities: Map.put(state.entities, entity.id, entity),
      player_entities: Map.put(state.player_entities, client_id, entity.id)
    }

    Logger.info("Player #{client_id} joined! Entity ID: #{entity.id}")

    {:reply, {:ok, entity.id}, new_state}
  end

  def handle_call({:remove_player, client_id}, _from, state) do
    case Map.get(state.player_entities, client_id) do
      nil ->
        {:reply, :ok, state}
      entity_id ->
        Logger.info("Player #{client_id} left! Entity ID: #{entity_id}")

        # Remove player entity
        new_state = %{state |
          entities: Map.delete(state.entities, entity_id),
          player_entities: Map.delete(state.player_entities, client_id)
        }

        {:reply, :ok, new_state}
    end
  end

  def handle_call(:get_state, _from, state) do
    # Convert entities to a list for easier processing by clients
    entity_list = Map.values(state.entities)
    {:reply, entity_list, state}
  end

  def handle_cast({:update_player, client_id, position, rotation}, state) do
    case Map.get(state.player_entities, client_id) do
      nil ->
        {:noreply, state}
      entity_id ->
        entity = Map.get(state.entities, entity_id)

        # Update position and rotation
        updated_entity = entity
          |> Entity.add_component(Components.Position.type(), Components.Position.new(
              position["x"], position["y"], position["z"]))
          |> Entity.add_component(Components.Rotation.type(), Components.Rotation.new(
              rotation["x"], rotation["y"], rotation["z"]))

        # Update state
        updated_entities = Map.put(state.entities, entity_id, updated_entity)

        {:noreply, %{state | entities: updated_entities}}
    end
  end

  def handle_info(:tick, state) do
    current_time = System.monotonic_time(:millisecond)
    delta_time = (current_time - state.last_update) / 1000.0

    # Update all systems
    updated_entities = apply_systems(Map.values(state.entities), state.systems, delta_time)

    # Update the entity map
    updated_entity_map = Enum.reduce(updated_entities, state.entities, fn entity, acc ->
      Map.put(acc, entity.id, entity)
    end)

    # Broadcast updated state to all players through the Network server
    Game.Network.Server.broadcast_state(updated_entities)

    # Schedule next tick
    Process.send_after(self(), :tick, 50)  # 20 FPS

    {:noreply, %{state |
      entities: updated_entity_map,
      last_update: current_time
    }}
  end

  # Private functions

  defp initialize_systems do
    [
      Game.ECS.Systems.Movement
      # Add more systems as needed
    ]
  end

  defp apply_systems(entities, systems, delta_time) do
    Enum.reduce(systems, entities, fn system, current_entities ->
      system.update(current_entities, delta_time)
    end)
  end
end
