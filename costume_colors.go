package main

import (
	"fmt"
	"strings"

	"github.com/ethangamma24/slippi-go/pkg/slippi/melee"
)

var playable_characters = []melee.ExternalCharacterID{
	melee.Ext_CaptainFalcon,
	melee.Ext_DonkeyKong,
	melee.Ext_Fox,
	melee.Ext_GameAndWatch,
	melee.Ext_Kirby,
	melee.Ext_Bowser,
	melee.Ext_Link,
	melee.Ext_Luigi,
	melee.Ext_Mario,
	melee.Ext_Marth,
	melee.Ext_Mewtwo,
	melee.Ext_Ness,
	melee.Ext_Peach,
	melee.Ext_Pikachu,
	melee.Ext_IceClimbers,
	melee.Ext_Jigglypuff,
	melee.Ext_Samus,
	melee.Ext_Yoshi,
	melee.Ext_Zelda,
	melee.Ext_Sheik,
	melee.Ext_Falco,
	melee.Ext_YoungLink,
	melee.Ext_DrMario,
	melee.Ext_Roy,
	melee.Ext_Pichu,
	melee.Ext_Ganondorf,
}

var costume_colours = map[melee.ExternalCharacterID][]string{
	melee.Ext_CaptainFalcon: {"Default", "Black", "Red", "White", "Green", "Blue"},
	melee.Ext_DonkeyKong:    {"Default", "Black", "Red", "Blue", "Green"},
	melee.Ext_Fox:           {"Default", "Red", "Blue", "Green"},
	melee.Ext_GameAndWatch:  {"Default", "Red", "Blue", "Green"},
	melee.Ext_Kirby:         {"Default", "Yellow", "Blue", "Red", "Green", "White"},
	melee.Ext_Bowser:        {"Default", "Red", "Blue", "Black"},
	melee.Ext_Link:          {"Default", "Red", "Blue", "Black", "White"},
	melee.Ext_Luigi:         {"Default", "White", "Blue", "Red"},
	melee.Ext_Mario:         {"Default", "Yellow", "Black", "Blue", "Green"},
	melee.Ext_Marth:         {"Default", "Red", "Green", "Black", "White"},
	melee.Ext_Mewtwo:        {"Default", "Red", "Blue", "Green"},
	melee.Ext_Ness:          {"Default", "Yellow", "Blue", "Green"},
	melee.Ext_Peach:         {"Default", "Daisy", "White", "Blue", "Green"},
	melee.Ext_Pikachu:       {"Default", "Red", "Party Hat", "Cowboy Hat"},
	melee.Ext_IceClimbers:   {"Default", "Green", "Orange", "Red"},
	melee.Ext_Jigglypuff:    {"Default", "Red", "Blue", "Headband", "Crown"},
	melee.Ext_Samus:         {"Default", "Pink", "Black", "Green", "Purple"},
	melee.Ext_Yoshi:         {"Default", "Red", "Blue", "Yellow", "Pink", "Cyan"},
	melee.Ext_Zelda:         {"Default", "Red", "Blue", "Green", "White"},
	melee.Ext_Sheik:         {"Default", "Red", "Blue", "Green", "White"},
	melee.Ext_Falco:         {"Default", "Red", "Blue", "Green"},
	melee.Ext_YoungLink:     {"Default", "Red", "Blue", "White", "Black"},
	melee.Ext_DrMario:       {"Default", "Red", "Blue", "Green", "Black"},
	melee.Ext_Roy:           {"Default", "Red", "Blue", "Green", "Yellow"},
	melee.Ext_Pichu:         {"Default", "Red", "Blue", "Green"},
	melee.Ext_Ganondorf:     {"Default", "Red", "Blue", "Green", "Purple"},
}

func costumeColor(character_id melee.ExternalCharacterID, costume_index int) string {
	colors, ok := costume_colours[character_id]
	if !ok || costume_index < 0 || costume_index >= len(colors) {
		return fmt.Sprintf("Costume %d", costume_index)
	}

	return colors[costume_index]
}

func characterNames() []string {
	names := make([]string, 0, len(playable_characters))
	for _, character_id := range playable_characters {
		names = append(names, character_id.DisplayName())
	}

	return names
}

func costumeColorsForCharacter(character_name string) []string {
	character_name = strings.TrimSpace(character_name)
	for _, character_id := range playable_characters {
		if character_id.DisplayName() != character_name {
			continue
		}

		colors := costume_colours[character_id]
		return append([]string(nil), colors...)
	}

	return nil
}

func costumeIndex(character_name, skin_color string) int {
	skin_color = strings.TrimSpace(skin_color)
	for index, color := range costumeColorsForCharacter(character_name) {
		if color == skin_color {
			return index
		}
	}

	return -1
}
