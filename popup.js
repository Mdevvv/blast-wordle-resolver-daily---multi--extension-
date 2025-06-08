// Get DOM elements
const playersContainer = document.getElementById('players-container');
const playersTbody = document.getElementById('players-tbody');
const regenButton = document.getElementById('regen-btn');

// Store all players and filtered players
let allPlayers = [];
let filteredPlayers = [];
let countries = null;

// Load player data when popup opens
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Loading player data and countries data...');
    
    // Load countries data first
    try {
        const response = await fetch(chrome.runtime.getURL('countries.json'));
        if (!response.ok) {
            throw new Error(`Failed to load countries data: ${response.status}`);
        }
        countries = Object.values(await response.json());
        console.log(`Loaded ${countries.length} countries`);
    } catch (error) {
        console.error('Error loading countries data:', error);
    }
    
    loadPlayersData();
});

// Function to load player data from the JSON file
function loadPlayersData() {
    console.log('Loading player data...');
    
    // Add a debug message to display in the table while loading
    playersTbody.innerHTML = `<tr><td colspan="6">Loading players data...</td></tr>`;
    
    fetch(chrome.runtime.getURL('playersFullInfo.json'))
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to load player data: ${response.status}`);
            }
            return response.json();
        })
        .then(players => {
            console.log(`Loaded ${players.length} players`);
            allPlayers = players;
            filteredPlayers = [...players];
            displayPlayers(filteredPlayers);
        })
        .catch(error => {
            console.error('Error loading player data:', error);
            playersTbody.innerHTML = `<tr><td colspan="6">Error loading player data: ${error.message}</td></tr>`;
        });
}

// Function to display players in the table
function displayPlayers(players) {
    // Clear existing rows
    playersTbody.innerHTML = '';
    
    console.log('Displaying players, count:', players.length);
    
    // Count of players actually displayed
    let displayedCount = 0;
    
    // Add player rows
    players.forEach((player, index) => {
        // Skip empty entries
        if (!player || Object.keys(player).length === 0) return;
        
        const row = document.createElement('tr');
        
        // Extract the nickname
        const nickname = player.nickname || 'Unknown';
        
        try {
            // Get data values with safer access
            const guessData = player.guessData || {};
            
            // First try to access through data.name, if that's null, try value, if both fail use empty string
            let team = '';
            if (guessData.team) {
                if (guessData.team.data && guessData.team.data.name) {
                    team = guessData.team.data.name;
                } else if (guessData.team.value) {
                    team = guessData.team.value;
                }
            }
            
            const nationality = guessData.nationality ? guessData.nationality.value || '' : '';
            const age = guessData.age ? guessData.age.value || '' : '';
            const role = guessData.role ? guessData.role.value || '' : '';
            const majorAppearances = guessData.majorAppearances ? guessData.majorAppearances.value || '' : '';
            
            row.innerHTML = `
                <td>${nickname}</td>
                <td>${team}</td>
                <td>${nationality}</td>
                <td>${age}</td>
                <td>${role}</td>
                <td>${majorAppearances}</td>
            `;
            
            playersTbody.appendChild(row);
            displayedCount++;
        } catch (error) {
            console.error(`Error processing player ${nickname}:`, error);
        }
    });
    
    console.log(`Displayed ${displayedCount} players out of ${players.length}`);
    
    // If no players were displayed, show an error message
    if (displayedCount === 0) {
        playersTbody.innerHTML = `<tr><td colspan="6">No players match current filters.</td></tr>`;
    }
}

function countriesFilter(nationality) {
    if (!countries) {
        console.error('Countries data not loaded');
        return;
    }

    const result = nationality.result.toUpperCase();
    const countryValue = nationality.value.toUpperCase();

    if (result == "CORRECT") {
        filteredPlayers = filteredPlayers.filter(player => 
            player.guessData && player.guessData.nationality && 
            player.guessData.nationality.value.toUpperCase() === countryValue);
    } else {
        const country = countries.find(country => country.code === countryValue);
        if (!country) {
            console.error(`Country not found: ${countryValue}`);
            return;
        }
        
        const region = country.region;
        if(result == "INCORRECT") {
            filteredPlayers = filteredPlayers.filter(player => {
                if (!player.guessData || !player.guessData.nationality) return false;
                const playerCountry = countries.find(country => country.code === player.guessData.nationality.value);
                return playerCountry && playerCountry.region !== region;
            });
        } else if (result == 'INCORRECT_CLOSE') {
            filteredPlayers = filteredPlayers.filter(player => {
                if (!player.guessData || !player.guessData.nationality) return false;
                const playerCountry = countries.find(country => country.code === player.guessData.nationality.value);
                return playerCountry && playerCountry.region === region;
            });
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
            filteredPlayers = filteredPlayers.filter(player => player.guessData.team.data == null);
        } else if(result == "INCORRECT") {
            filteredPlayers = filteredPlayers.filter(player => player.guessData.team.data != null);
        }
    } else {
        if(result == "CORRECT") {
            filteredPlayers = filteredPlayers.filter(player => player.guessData.team.data != null && player.guessData.team.data.id === teamID);
        }
        else if(result == "INCORRECT") {
            filteredPlayers = filteredPlayers.filter(player => player.guessData.team.data == null || player.guessData.team.data.id !== teamID);
        }
    }
}

function roleFilter(role) {
    const result = role.result.toUpperCase();
    const roleValue = role.value.toUpperCase();

    if (result == "CORRECT") {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.role.value.toUpperCase() === roleValue);
    }
    else if (result == "INCORRECT") {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.role.value.toUpperCase() !== roleValue);
    }
}

function ageFilter(age) {
    const result = age.result.toUpperCase();
    const ageValue = age.value;

    if (result == "CORRECT") {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.age.value === ageValue);
    }
    else if (result.includes("LOW")) {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.age.value > ageValue);
    } else if (result.includes("HIGH")) {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.age.value < ageValue);
    }
}

function majorFilter(major) {
    const result = major.result.toUpperCase();
    const majorValue = major.value;
    if (result == "CORRECT") {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.majorAppearances.value === majorValue);
    } else if (result.includes("LOW")) {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.majorAppearances.value > majorValue);
    } else if (result.includes("HIGH")) {
        filteredPlayers = filteredPlayers.filter(player => player.guessData.majorAppearances.value < majorValue);
    }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message) => {
    console.log('Received message:', message);
    
    if (message.type === 'guess-result') {
        const guessData = message.data;
        console.log('Processing guess result:', guessData);
        
        // Apply filters based on guess result
        try {
            // Make a copy of all players as our starting point for this round of filtering
            filteredPlayers = [...filteredPlayers];
            
            // Apply each filter
            if (guessData.nationality) countriesFilter(guessData.nationality);
            if (guessData.team) teamFilter(guessData.team);
            if (guessData.role) roleFilter(guessData.role);
            if (guessData.age) ageFilter(guessData.age);
            if (guessData.majorAppearances) majorFilter(guessData.majorAppearances);
            
            // Display the filtered list
            displayPlayers(filteredPlayers);
            
            // Add a status message
            const status = document.createElement('div');
            status.textContent = `Filtered to ${filteredPlayers.length} player(s) based on guess: ${guessData.nickname}`;
            status.className = 'status-message';
            document.body.insertBefore(status, playersContainer);
            
            // Remove after 5 seconds
            setTimeout(() => {
                if (status.parentNode) {
                    status.parentNode.removeChild(status);
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error applying filters:', error);
        }
    }
});

// Button event handler to reset filters
regenButton.addEventListener('click', () => {
    console.log('Resetting filters');
    filteredPlayers = [...allPlayers];
    displayPlayers(filteredPlayers);
    
    // Add a status message
    const status = document.createElement('div');
    status.textContent = 'Filters reset: showing all players';
    status.className = 'status-message';
    status.style.backgroundColor = '#cce5ff';  // Blue background
    status.style.color = '#004085';  // Dark blue text
    document.body.insertBefore(status, playersContainer);
    
    // Remove after 3 seconds
    setTimeout(() => {
        if (status.parentNode) {
            status.parentNode.removeChild(status);
        }
    }, 3000);
});

// Inform background script that popup is ready
chrome.runtime.sendMessage({ type: 'popup-ready' });