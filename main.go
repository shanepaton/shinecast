package main

import (
	"context"
	"fmt"
	"log"

	"fyne.io/fyne/v2"
	"fyne.io/fyne/v2/app"
	"fyne.io/fyne/v2/container"
	"fyne.io/fyne/v2/theme"
	"fyne.io/fyne/v2/widget"
	"github.com/ethangamma24/slippi-go/pkg/slippi"
	"github.com/fsnotify/fsnotify"
)

type Player struct {
	Name      string
	Tag       string
	Pronouns  string
	Character string
	SkinColor string
	Skin      int
	Score     int
	Port      int
}

type MatchData struct {
	Players [4]Player
	Map     int
	BestOf  int
}

type SetData struct {
	MatchData []MatchData
}

func limitText(value string, maxLength int) string {
	runes := []rune(value)
	if len(runes) <= maxLength {
		return value
	}

	return string(runes[:maxLength])
}

func player_panel(player *Player) fyne.CanvasObject {

	name := widget.NewEntry()
	tag := widget.NewEntry()
	pronouns := widget.NewEntry()
	score := widget.NewLabel(fmt.Sprintf("%d", player.Score))

	name.SetPlaceHolder("Name")
	tag.SetPlaceHolder("Tag")
	pronouns.SetPlaceHolder("Pronouns")
	score.Alignment = fyne.TextAlignCenter

	name.SetText(player.Name)
	tag.SetText(limitText(player.Tag, 4))

	name.OnChanged = func(value string) {
		player.Name = value
	}

	tag.OnChanged = func(value string) {
		limitedValue := limitText(value, 4)
		if value != limitedValue {
			tag.SetText(limitedValue)
			return
		}

		player.Tag = value
	}

	pronouns.OnChanged = func(value string) {
		player.Pronouns = value
	}

	decrementScore := widget.NewButtonWithIcon("", theme.ContentRemoveIcon(), func() {
		if player.Score == 0 {
			return
		}

		player.Score--
		score.SetText(fmt.Sprintf("%d", player.Score))
	})

	incrementScore := widget.NewButtonWithIcon("", theme.ContentAddIcon(), func() {
		player.Score++
		score.SetText(fmt.Sprintf("%d", player.Score))
	})

	player_data := container.NewVBox(
		name,
		container.NewGridWithColumns(2, tag, pronouns),
		container.NewGridWithColumns(3, decrementScore, score, incrementScore),
	)

	card := widget.NewCard("P"+string(rune(player.Port+48)), "", player_data)

	return card
}

func ui(match_data *MatchData) fyne.CanvasObject {
	//return horizontal box with 4 player panels
	return container.NewVBox(
		container.NewGridWithColumns(4,
			player_panel(&match_data.Players[0]),
			player_panel(&match_data.Players[1]),
			player_panel(&match_data.Players[2]),
			player_panel(&match_data.Players[3]),
		),
		widget.NewEntry(),
	)
}

func monitor_replay_folder(path string) (*fsnotify.Watcher, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	go func() {
		for {
			select {
			case event, ok := <-watcher.Events:
				if !ok {
					return
				}
				if event.Has(fsnotify.Create) {
					fmt.Println("New file detected:", event.Name)
				}
			case err, ok := <-watcher.Errors:
				if !ok {
					return
				}
				log.Println("Watcher error:", err)
			}
		}
	}()

	err = watcher.Add(path)
	if err != nil {
		watcher.Close()
		return nil, err
	}

	return watcher, nil
}

func new_match_data(file_path string, match_data *MatchData) {
	ctx := context.Background()

	match := slippi.NewGame(file_path)

	settings, err := match.SettingsTyped(ctx)
	if err != nil {
		log.Fatal(err)
	}

	match_data.Players[0].Character = settings.Players[0].CharacterID.DisplayName()
	match_data.Players[0].Skin = int(settings.Players[0].CostumeIndex)
	match_data.Players[0].SkinColor = costumeColor(settings.Players[0].CharacterID, match_data.Players[0].Skin)
	match_data.Players[0].Tag = settings.Players[0].NameTag
	match_data.Players[0].Name = settings.Players[0].DisplayName
	match_data.Players[0].Port = int(settings.Players[0].Port)

	match_data.Players[1].Character = settings.Players[1].CharacterID.DisplayName()
	match_data.Players[1].Skin = int(settings.Players[1].CostumeIndex)
	match_data.Players[1].SkinColor = costumeColor(settings.Players[1].CharacterID, match_data.Players[1].Skin)
	match_data.Players[1].Tag = settings.Players[1].NameTag
	match_data.Players[1].Name = settings.Players[1].DisplayName
	match_data.Players[1].Port = int(settings.Players[1].Port)

	match_data.Players[2].Character = settings.Players[2].CharacterID.DisplayName()
	match_data.Players[2].Skin = int(settings.Players[2].CostumeIndex)
	match_data.Players[2].SkinColor = costumeColor(settings.Players[2].CharacterID, match_data.Players[2].Skin)
	match_data.Players[2].Tag = settings.Players[2].NameTag
	match_data.Players[2].Name = settings.Players[2].DisplayName
	match_data.Players[2].Port = int(settings.Players[2].Port)

	match_data.Players[3].Character = settings.Players[3].CharacterID.DisplayName()
	match_data.Players[3].Skin = int(settings.Players[3].CostumeIndex)
	match_data.Players[3].SkinColor = costumeColor(settings.Players[3].CharacterID, match_data.Players[3].Skin)
	match_data.Players[3].Tag = settings.Players[3].NameTag
	match_data.Players[3].Name = settings.Players[3].DisplayName
	match_data.Players[3].Port = int(settings.Players[3].Port)

	match_data.Map = int(settings.Stage)

}

func main() {

	application := app.NewWithID("ca.shanepaton.shinecast")
	window := application.NewWindow("shinecast")
	window.Resize(fyne.NewSize(800, 300))

	match_data := MatchData{
		BestOf: 3,
	}
	new_match_data("C:\\Users\\spaton\\Documents\\Slippi\\Spectate\\wilco\\Game_20260415T200110.slp", &match_data)

	window.SetContent(ui(&match_data))

	window.ShowAndRun()
}
