# Fibre
Fibre is a screen recorder for recording demo vidoes. It doesn't generate link previews like other platforms, but it's simple and can be expanded upon as needed (roughly 260 lines of code). 

## Working with Fibre
Fibre uses [Stitches](https://stitches.dev/) for styling and a few icons from [Radix-Icons](https://icons.radix-ui.com/). Both can be easily replaced.

The app itself is in `/src/app.tsx`. 

Bundling is done using Esbuild and uses Go version 1.19. I've included a script titled `watcher.sh` in the root directory that, when run, spins up a local developement server on `localhost:8080`. A bundled 'production' build can be created by running `go run builder.go` in the `/builder` directory.