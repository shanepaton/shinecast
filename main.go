package main

import (
	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/widget"
)

type Player struct {
	Name      string
	Tag       string
	Pronouns  string
	Character int
	Skin      int
	Score     int
	Port      int
}

type MatchData struct {
	Players [4]Player
	Map     int
}

func player_panel(player *Player) fyne.CanvasObject {
	name := widget.NewEntry()

	name.OnChanged = func(value string) {
		player.Name = value
	}

	return name
}

func ui(match_data *MatchData) fyne.CanvasObject {
	//return horizontal box with 4 player panels
	return container.NewHBox(
		player_panel(&match_data.Players[0]),
		player_panel(&match_data.Players[1]),
		player_panel(&match_data.Players[2]),
		player_panel(&match_data.Players[3]),
	)
}

func main() {

	application := app.NewWithID("ca.shanepaton.shinecast")
	window := application.NewWindow("shinecast")
	window.Resize(fyne.NewSize(800, 300))

	match_data := MatchData{
		Players: [4]Player{
			{Name: "Player 1", Tag: "P1", Pronouns: "they/them", Character: 0, Skin: 0, Score: 0, Port: 0},
			{Name: "Player 2", Tag: "P2", Pronouns: "he/him", Character: 1, Skin: 1, Score: 0, Port: 1},
			{Name: "Player 3", Tag: "P3", Pronouns: "she/her", Character: 2, Skin: 2, Score: 0, Port: 2},
			{Name: "Player 4", Tag: "P4", Pronouns: "they/them", Character: 3, Skin: 3, Score: 0, Port: 3},
		},
		Map: 0,
	}

	window.SetContent(ui(&match_data))

	window.ShowAndRun()
}
