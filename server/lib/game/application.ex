# lib/game/application.ex
defmodule Game.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Start the main game server with RakNet
      {Game.Network.Server, [port: 12345]},
      # Start the game world
      {Game.World, []}
    ]

    opts = [strategy: :one_for_one, name: Game.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
