const fs = require('fs');

(async () => {

const response = await fetch("https://data.blast.tv/minigames/counterstrikle/players.json", {
    "headers": {
    "accept": "application/json, text/plain, */*",
    "accept-language": "fr,fr-FR;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
    "cache-control": "no-cache",
    "pragma": "no-cache",
    "priority": "u=1, i",
    "sec-ch-ua": "\"Microsoft Edge\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://blast.tv/",
    "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "method": "GET"
});

// Then parse the JSON separately
const playersList = await response.json();

let resp = "";

for (let i = 0; i < playersList.length; i++) {
    const player = playersList[i];
    console.log(`Trying player: ${player.nickname} (${player.id})`);
    const guess = await fetch("https://api.blast.tv/v1/counterstrikle/guesses", {
    "headers": {
        "accept": "application/json, text/plain, */*",
        "accept-language": "fr,fr-FR;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "cache-control": "no-cache",
        "content-type": "application/json",
        "pragma": "no-cache",
        "priority": "u=1, i",
        "sec-ch-ua": "\"Microsoft Edge\";v=\"137\", \"Chromium\";v=\"137\", \"Not/A)Brand\";v=\"24\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "Referer": "https://blast.tv/",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    },
    "body": `{"playerId":"${player.id}"}`,
    "method": "POST"
    });

    const guessData = await guess.json();
    console.log(guessData);
    playersList[i].guessData = guessData; // Store guess data for each player
}

fs.writeFileSync('playersFullInfo.json', JSON.stringify(playersList, null, 2));

})();