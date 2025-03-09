defmodule Server.ECS.System do
  @moduledoc """
  Base behavior for systems.
  """

  @callback update(entities :: [Server.ECS.Entity.t()], delta_time :: float()) :: [Server.ECS.Entity.t()]
end

defmodule Server.ECS.Systems.Movement do
  @behaviour Server.ECS.System

  alias Server.ECS.Entity
  alias Server.ECS.Components.{Position, Velocity}

  def update(entities, delta_time) do
    Enum.map(entities, fn entity ->
      position = Entity.get_component(entity, Position.type())
      velocity = Entity.get_component(entity, Velocity.type())

      if position != nil && velocity != nil do
        new_position = %Position{
          x: position.x + velocity.dx * delta_time,
          y: position.y + velocity.dy * delta_time,
          z: position.z + velocity.dz * delta_time
        }

        Entity.add_component(entity, Position.type(), new_position)
      else
        entity
      end
    end)
  end
end
