{
  description = "development shell";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      nixpkgs,
      flake-utils,
      ...
    }:
    let
      forSystem =
        system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
        in
        {
          devShell = pkgs.mkShell {
            name = "fluenza-console-dev-shell";
            buildInputs = [
              pkgs.nodejs_22
              pkgs.nodePackages.pnpm
            ];
          };
        };
    in
    flake-utils.lib.eachDefaultSystem forSystem;
}
