# lib/ecs/entity.ex
defmodule Server.ECS.Entity do
  @moduledoc """
  Represents a ser entity with a unique ID and associated components.
  """

  defstruct [:id, components: %{}]

  def new(id \\ UUID.uuid4()) do
    %__MODULE__{id: id}
  end

  def add_component(entity, component_type, component) do
    updated_components = Map.put(entity.components, component_type, component)
    %{entity | components: updated_components}
  end

  def remove_component(entity, component_type) do
    updated_components = Map.delete(entity.components, component_type)
    %{entity | components: updated_components}
  end

  def get_component(entity, component_type) do
    Map.get(entity.components, component_type)
  end
end
