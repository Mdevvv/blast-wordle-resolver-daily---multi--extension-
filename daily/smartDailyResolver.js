const fs = require('fs');
let playersList = JSON.parse(fs.readFileSync('../playersFullInfo.json', 'utf8'));
const contries = Object.values(JSON.parse(fs.readFileSync('../countries.json', 'utf8')));

function randomInt(max, min = 0) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function countriesFilter(nationality) {
    const result = nationality.result.toUpperCase();
    const countryValue = nationality.value.toUpperCase();

    if (result == "CORRECT") {
        playersList = playersList.filter(player => player.guessData.nationality.value === countryValue);
        
    } else {
        const region = contries.find(country => country.code === countryValue).region;
        if(result == "INCORRECT") {
            playersList = playersList.filter(player => contries.find(country => country.code === player.guessData.nationality.value).region !== region);
        } else if (result == 'INCORRECT_CLOSE') {
            playersList = playersList.filter(player => contries.find(country => country.code === player.guessData.nationality.value).region === region);
        }
    }
}

function teamFilter(team) {
    const result = team.result.toUpperCase();
    let teamID = null;
    if(team.data != null) {
        teamID = team.data.id;
    }

    if(teamID == null) {
        if(result == "CORRECT") {
            playersList = playersList.filter(player => player.guessData.team.data == null);
        } else if(result == "INCORRECT") {
            playersList = playersList.filter(player => player.guessData.team.data != null);
        }
    } else {
        if(result == "CORRECT") {
            playersList = playersList.filter(player => player.guessData.team.data != null && player.guessData.team.data.id === teamID);
        }
        else if(result == "INCORRECT") {
            playersList = playersList.filter(player => player.guessData.team.data == null || player.guessData.team.data.id !== teamID);
        }
    }
}

function roleFilter(role) {
    const result = role.result.toUpperCase();
    const roleValue = role.value.toUpperCase();

    if (result == "CORRECT") {
        playersList = playersList.filter(player => player.guessData.role.value.toUpperCase() === roleValue);
    }
    else if (result == "INCORRECT") {
        playersList = playersList.filter(player => player.guessData.role.value.toUpperCase() !== roleValue);
    }
}

function ageFilter(age) {
    const result = age.result.toUpperCase();
    const ageValue = age.value;

    if (result == "CORRECT") {
        playersList = playersList.filter(player => player.guessData.age.value === ageValue);
    }
    else if (result.includes("LOW")) {
        playersList = playersList.filter(player => player.guessData.age.value > ageValue);
    } else if (result.includes("HIGH")) {
        playersList = playersList.filter(player => player.guessData.age.value < ageValue);
    }
}

function majorFilter(major) {
    const result = major.result.toUpperCase();
    const majorValue = major.value;
    if (result == "CORRECT") {
        playersList = playersList.filter(player => player.guessData.majorAppearances.value === majorValue);
    } else if (result.includes("LOW")) {
        playersList = playersList.filter(player => player.guessData.majorAppearances.value > majorValue);
    } else if (result.includes("HIGH")) {
        playersList = playersList.filter(player => player.guessData.majorAppearances.value < majorValue);
    }
}


(async () => {
    let attempts = 1;
    while (playersList.length > 0) {
        const rd = randomInt(playersList.length); 
        const player = playersList[rd];
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
        if (guessData.isSuccess) {
            console.log(`\nPlayer found: ${player.nickname} (${player.id})`);
            console.log("attemps", attempts);
            playersList = [];
        } else {
            playersList = playersList.filter(p => p.id !== player.id);
            countriesFilter(guessData.nationality)
            teamFilter(guessData.team);
            roleFilter(guessData.role);
            ageFilter(guessData.age);
            majorFilter(guessData.majorAppearances);
            attempts++;
            console.log(`Remaining players: ${playersList.length}`);
        }
    }
})();

