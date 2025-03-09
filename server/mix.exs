defmodule Server.MixProject do
  use Mix.Project

  def project do
    [
      app: :server,
      version: "0.1.0",
      elixir: "~> 1.13",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      extra_applications: [:logger],
      mod: {Server.Application, []}
    ]
  end

  # Define dependencies outside of any other function
  defp deps do
    [
      {:raknet, git: "https://github.com/X-Plane/elixir-raknet.git"},
      {:jason, "~> 1.2"},
      {:poolboy, "~> 1.5"},
      {:uuid, "~> 1.1"}
    ]
  end
end
