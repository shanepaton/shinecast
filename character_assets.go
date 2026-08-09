package main

import (
	"os"
	"path/filepath"
	"strings"

	"fyne.io/fyne/v2"
)

func characterPortraitPath(characterName, skinColor string) string {
	characterName = strings.TrimSpace(characterName)
	skinColor = strings.TrimSpace(skinColor)

	path := filepath.Join("img", "Portraits", characterName, skinColor+".png")
	if _, err := os.Stat(path); err == nil {
		return path
	}

	fallback := filepath.Join("img", "Portraits", "Random.png")
	if _, err := os.Stat(fallback); err == nil {
		return fallback
	}

	return ""
}

func characterCSSPath(characterName string) string {
	characterName = strings.TrimSpace(characterName)

	path := filepath.Join("img", "CSS", characterName+".png")
	if _, err := os.Stat(path); err == nil {
		return path
	}

	fallback := filepath.Join("img", "CSS", "Random.png")
	if _, err := os.Stat(fallback); err == nil {
		return fallback
	}

	return ""
}

func characterCSSResource(characterName string) fyne.Resource {
	path := characterCSSPath(characterName)
	if path == "" {
		return nil
	}

	resource, err := fyne.LoadResourceFromPath(path)
	if err != nil {
		return nil
	}

	return resource
}
