defmodule Server.ECS.Component do
  @moduledoc """
  Base behavior for components.
  """

  @callback type() :: atom()
end

# Example components
defmodule Server.ECS.Components.Position do
  @behaviour Server.ECS.Component

  defstruct [:x, :y, :z]

  def type, do: :position

  def new(x \\ 0, y \\ 0, z \\ 0) do
    %__MODULE__{x: x, y: y, z: z}
  end
end

defmodule Server.ECS.Components.Velocity do
  @behaviour Server.ECS.Component

  defstruct [:dx, :dy, :dz]

  def type, do: :velocity

  def new(dx \\ 0, dy \\ 0, dz \\ 0) do
    %__MODULE__{dx: dx, dy: dy, dz: dz}
  end
end
