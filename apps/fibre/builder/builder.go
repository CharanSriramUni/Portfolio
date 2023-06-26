package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/evanw/esbuild/pkg/api"
)

func main() {
	watchMode := flag.Bool("watch", false, "Watch mode")
	flag.Parse()

	if *watchMode { // Builds the bundle and watches for changes
		ctx, err := api.Context(api.BuildOptions{
			EntryPoints: []string{"../root.tsx"},
			Bundle:      true,
			Write:       true,
			Outdir:      "../dist",
		})

		err2 := ctx.Watch(api.WatchOptions{})

		if err != nil || err2 != nil {
			fmt.Print(err, err2)
			os.Exit(1)
		}

		fmt.Print("Change watcher registered...\n")

		_, err3 := ctx.Serve(api.ServeOptions{
			Servedir: "../dist",
			Port:     8080,
			Host:     "localhost",
		})

		if err3 != nil {
			fmt.Print(err3)
			os.Exit(1)
		}

		fmt.Print("Serving dev server on http://localhost:8080\n")

		// Hang to keep the process alive
		<-make(chan struct{})

	} else { // Builds the normal bundle
		result := api.Build(api.BuildOptions{
			EntryPoints:       []string{"../root.tsx"},
			Bundle:            true,
			MinifyWhitespace:  true,
			MinifyIdentifiers: true,
			MinifySyntax:      true,
			Write:             true,
			Outfile:           "../dist/root.js",
		})

		if len(result.Errors) > 0 {
			fmt.Print(result.Errors)
			os.Exit(1)
		}
	}
}
