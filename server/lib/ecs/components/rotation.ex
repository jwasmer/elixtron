# lib/ecs/components/rotation.ex
defmodule Game.ECS.Components.Rotation do
  @behaviour Game.ECS.Component

  defstruct [:x, :y, :z]

  def type, do: :rotation

  def new(x \\ 0, y \\ 0, z \\ 0) do
    %__MODULE__{x: x, y: y, z: z}
  end
end

# lib/ecs/components/player.ex
defmodule Game.ECS.Components.Player do
  @behaviour Game.ECS.Component

  defstruct [:client_id]

  def type, do: :player

  def new(client_id) do
    %__MODULE__{client_id: client_id}
  end
end
