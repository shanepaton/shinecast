// Fills a scoreboard page from data.json, which the app keeps up to date in the same folder. Every page here uses it.
// A page needs the elements named below (see scoreboard-singles.html), and says where they go in its own css.

// ---- Settings --------------------------------------------------------------------------------------------------------

const NAME_SIZE = 33; // the biggest a name gets. Longer ones shrink to fit
const PREFIX_SIZE = 22;
const MIN_NAME_SIZE = 12;
const SOCIAL_SECONDS = 12; // how long a caster's twitter shows before their twitch, and back
const REFRESH_MS = 500;
const BEST_OF = { 3: "Best of 3", 5: "Best of 5", crews: "Crews", endless: "Endless" };

// The folder the app writes data.json and images/ to. Pages live in html/ or a folder inside it, so it is above that.
const OVERLAY_ROOT = (() => {
    const marker = "/overlay/html/";
    const path = decodeURIComponent(location.pathname);
    const at = path.lastIndexOf(marker);
    if (at < 0) return "";
    const folders = path.slice(at + marker.length).split("/").length - 1; // folders between html/ and the page
    return "../".repeat(folders + 1);
})();

// ---- Helpers ---------------------------------------------------------------------------------------------------------

const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Fades an element out, runs `update` while it can't be seen, and fades it back in. Does nothing if it is already
 * changing: the next refresh looks again. An element starts out hidden, so the first thing shown fades in too.
 */
function fade(element, update) {
    if (element.dataset.fading) return;
    element.dataset.fading = "true";
    const wasShowing = !element.classList.contains("away");
    element.classList.add("away");
    const fadeOutMs = parseFloat(getComputedStyle(element).transitionDuration) * 1000; // the css says how long
    setTimeout(async () => {
        try {
            await update();
        } finally {
            element.classList.remove("away");
            delete element.dataset.fading;
        }
    }, wasShowing ? fadeOutMs : 0);
}

/** Changes an element's text with a fade, but only if the text is different. */
function showText(element, text) {
    if (element.textContent !== text) fade(element, () => (element.textContent = text));
}

// ---- Players ---------------------------------------------------------------------------------------------------------

/** Shrinks a name until it fits its box. */
function fitName(box) {
    const prefix = $(".prefix", box), name = $(".nameText", box);
    prefix.style.fontSize = `${PREFIX_SIZE}px`;
    name.style.fontSize = `${NAME_SIZE}px`;
    for (let size = NAME_SIZE; box.scrollWidth > box.clientWidth && size > MIN_NAME_SIZE; size--) {
        name.style.fontSize = `${size}px`;
        prefix.style.fontSize = `${Math.round((size * PREFIX_SIZE) / NAME_SIZE)}px`;
    }
}

// The port goes on the page as data-port, and scoreboard.css decides what colour each port is.
function showName(box, { prefix = "", name = "", port = "" }) {
    const prefixText = $(".prefix", box), nameText = $(".nameText", box);
    if (prefixText.textContent === prefix && nameText.textContent === name) {
        box.dataset.port = port; // only the port changed
        return;
    }
    fade(box, () => {
        prefixText.textContent = prefix;
        nameText.textContent = name;
        box.dataset.port = port;
        fitName(box);
    });
}

/** The character's stock icon, on the pages that have one. Hidden until there is a character to show. */
function showStock(image, source, version) {
    if (!image) return;
    // The file keeps its name when the skin changes, so the version in the address makes the browser fetch it again.
    const address = source ? `${source}?${encodeURIComponent(version)}` : "";
    if ((image.dataset.shown ?? "") === address) return;
    image.dataset.shown = address;
    fade(image, async () => {
        image.hidden = !address;
        if (!address) return;
        image.src = OVERLAY_ROOT + address;
        await image.decode().catch(() => {}); // so it doesn't fade in half loaded
    });
}

function showTeam(team, player = {}) {
    showName($(".name", team), player);
    const score = $(".score", team);
    score.textContent = player.score ?? 0;
    score.dataset.port = player.port ?? "";
    showStock($(".stock", team), player.images?.stock, `${player.character}-${player.skin}`);
}

// ---- Round and casters -----------------------------------------------------------------------------------------------

function showRound({ round = "", bestOf } = {}) {
    showText($("#roundName"), round);
    showText($("#bestOf"), round ? (BEST_OF[bestOf] ?? "") : "");
}

// Which social each caster shows right now. Twitter and twitch take turns, but a caster with only one shows just that.
let showTwitter = true;
function socialOf({ twitter, twitch }) {
    if (twitter && twitch) return showTwitter ? twitter : twitch;
    return twitter || twitch || "";
}

function showCaster(element, caster = {}) {
    showText($(".casterName", element), caster.name ?? "");
    showText($(".casterSocial", element), socialOf(caster));
}

// ---- Putting it together ---------------------------------------------------------------------------------------------

let casters = [];
function showCasters() {
    document.querySelectorAll(".caster").forEach((element, index) => showCaster(element, casters[index]));
}

function render(data) {
    const { players = [], tournament = {} } = data;
    casters = data.casters ?? [];
    showTeam($("#team1"), players[0]);
    showTeam($("#team2"), players[1]);
    showRound(tournament);
    showCasters();
}

// OBS's local file browser sources can't use fetch, so the data is read the old way.
let lastText = "";
function refresh() {
    const request = new XMLHttpRequest();
    request.addEventListener("load", () => {
        if (request.responseText === lastText) return;
        try {
            render(JSON.parse(request.responseText));
            lastText = request.responseText;
        } catch {
            /* the file is being written: try again in a moment */
        }
    });
    request.open("GET", `${OVERLAY_ROOT}data.json?t=${Date.now()}`);
    request.send();
}

function tick() {
    const now = new Date();
    $("#clock").textContent = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
}

setInterval(refresh, REFRESH_MS);
setInterval(tick, 1000);
setInterval(() => {
    showTwitter = !showTwitter;
    showCasters();
}, SOCIAL_SECONDS * 1000);
refresh();
tick();
