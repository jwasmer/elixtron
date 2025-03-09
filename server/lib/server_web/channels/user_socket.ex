# lib/game_server_web/channels/user_socket.ex
defmodule ServerWeb.UserSocket do
  use Phoenix.Socket

  # Channels
  channel "game:*", ServerWeb.GameChannel

  @impl true
  def connect(_params, socket, _connect_info) do
    {:ok, socket}
  end

  @impl true
  def id(_socket), do: nil
end
