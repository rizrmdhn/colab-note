{ }:

let pkgs = import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/5624e1334b26ddc18da37e132b6fa8e93b481468.tar.gz") { overlays = [ (import (builtins.fetchTarball "https://github.com/railwayapp/nix-npm-overlay/archive/main.tar.gz")) ]; };
in with pkgs;
  let
    APPEND_LIBRARY_PATH = "${lib.makeLibraryPath [ libGL libuuid ] }";
    myLibraries = writeText "libraries" ''
      export LD_LIBRARY_PATH="${APPEND_LIBRARY_PATH}:$LD_LIBRARY_PATH"
      
    '';
  in
    buildEnv {
      name = "5624e1334b26ddc18da37e132b6fa8e93b481468-env";
      paths = [
        (runCommand "5624e1334b26ddc18da37e132b6fa8e93b481468-env" { } ''
          mkdir -p $out/etc/profile.d
          cp ${myLibraries} $out/etc/profile.d/5624e1334b26ddc18da37e132b6fa8e93b481468-env.sh
        '')
        bun nodejs_18
      ];
    }
