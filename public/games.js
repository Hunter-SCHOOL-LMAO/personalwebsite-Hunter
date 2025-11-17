// Rock Paper Scissors Game with Firebase Leaderboard
// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore, collection, addDoc, query, where, orderBy, limit, onSnapshot, getDocs, deleteDoc, doc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Game state
let currentStreak = 0;
let playerName = localStorage.getItem('rpsPlayerName') || 'Anonymous';

// DOM elements
const choiceBtns = document.querySelectorAll('.choice-btn');
const resultsDiv = document.getElementById('results');
const winStreakDisplay = document.getElementById('winStreak');
const playerNameInput = document.getElementById('playerNameInput');
const setNameBtn = document.getElementById('setNameBtn');
const currentPlayerNameDisplay = document.getElementById('currentPlayerName');
const leaderboardList = document.getElementById('leaderboardList');

// Display current player name
updatePlayerNameDisplay();

// Set player name
setNameBtn.addEventListener('click', () => {
  const newName = playerNameInput.value.trim();
  if (newName) {
    playerName = newName;
    localStorage.setItem('rpsPlayerName', playerName);
    playerNameInput.value = '';
    updatePlayerNameDisplay();
  }
});

// Allow setting name with Enter key
playerNameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    setNameBtn.click();
  }
});

function updatePlayerNameDisplay() {
  currentPlayerNameDisplay.textContent = `Playing as: ${playerName}`;
}

// Game choices
const choices = ['rock', 'paper', 'scissors'];
const emojis = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
};

// Add click event to all choice buttons
choiceBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const playerChoice = btn.dataset.choice;
    playRound(playerChoice);
  });
});

function playRound(playerChoice) {
  // Computer makes random choice
  const computerChoice = choices[Math.floor(Math.random() * choices.length)];
  
  // Determine winner
  const result = determineWinner(playerChoice, computerChoice);
  
  // Update streak
  if (result === 'win') {
    currentStreak++;
    winStreakDisplay.textContent = currentStreak;
  } else if (result === 'lose') {
    // Save to leaderboard if streak > 0
    if (currentStreak > 0) {
      saveToLeaderboard(currentStreak);
    }
    currentStreak = 0;
    winStreakDisplay.textContent = currentStreak;
  }
  // Tie doesn't affect streak
  
  // Display results
  displayResults(playerChoice, computerChoice, result);
}

function determineWinner(player, computer) {
  if (player === computer) return 'tie';
  
  if (
    (player === 'rock' && computer === 'scissors') ||
    (player === 'paper' && computer === 'rock') ||
    (player === 'scissors' && computer === 'paper')
  ) {
    return 'win';
  }
  
  return 'lose';
}

function displayResults(playerChoice, computerChoice, result) {
  let message = '';
  let resultClass = '';
  
  if (result === 'win') {
    message = '🎉 You Win!';
    resultClass = 'win';
  } else if (result === 'lose') {
    message = '😞 You Lose!';
    resultClass = 'lose';
  } else {
    message = '🤝 It\'s a Tie!';
    resultClass = 'tie';
  }
  
  resultsDiv.innerHTML = `
    <div class="result-message ${resultClass}">${message}</div>
    <p>You chose: ${emojis[playerChoice]} ${playerChoice}</p>
    <p>Computer chose: ${emojis[computerChoice]} ${computerChoice}</p>
  `;
}

async function saveToLeaderboard(streak) {
  try {
    const leaderboardRef = collection(db, 'rps_leaderboard');
    
    // Query all entries for this player
    const q = query(
      leaderboardRef,
      where('playerName', '==', playerName)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Check if player already has an equal or better streak
    let hasEqualOrBetter = false;
    const oldEntries = [];
    
    querySnapshot.forEach((document) => {
      const data = document.data();
      oldEntries.push(document.id);
      if (data.winStreak >= streak) {
        hasEqualOrBetter = true;
      }
    });
    
    // Only add if no equal or better streak exists
    if (!hasEqualOrBetter) {
      // Add the new entry
      await addDoc(leaderboardRef, {
        playerName: playerName,
        winStreak: streak,
        timestamp: new Date().toISOString()
      });
      console.log(`Saved streak of ${streak} to leaderboard`);
      
      // Delete all old entries for this player
      const deletePromises = oldEntries.map(docId => 
        deleteDoc(doc(db, 'rps_leaderboard', docId))
      );
      await Promise.all(deletePromises);
      
      if (oldEntries.length > 0) {
        console.log(`Removed ${oldEntries.length} old entry(ies) for ${playerName}`);
      }
    } else {
      console.log(`Duplicate entry not saved: ${playerName} with ${streak} or more wins already exists`);
    }
  } catch (error) {
    console.error('Error saving to leaderboard:', error);
    alert('Error saving to leaderboard. Please check your Firebase configuration and ensure Firestore rules allow writes.');
  }
}

// Load and display leaderboard with real-time updates
function loadLeaderboard() {
  try {
    const leaderboardRef = collection(db, 'rps_leaderboard');
    const q = query(leaderboardRef, orderBy('winStreak', 'desc'), limit(10));
    
    onSnapshot(q, (querySnapshot) => {
      leaderboardList.innerHTML = '';
      
      if (querySnapshot.empty) {
        leaderboardList.innerHTML = '<li class="loading-message">No scores yet. Be the first!</li>';
        return;
      }
      
      // Track ranks with proper handling for ties
      let currentRank = 1;
      let previousStreak = null;
      let entriesAtCurrentRank = 0;
      
      querySnapshot.forEach((doc, index) => {
        const data = doc.data();
        
        // Update rank if the streak changed
        if (previousStreak !== null && data.winStreak < previousStreak) {
          currentRank += entriesAtCurrentRank;
          entriesAtCurrentRank = 0;
        }
        
        entriesAtCurrentRank++;
        previousStreak = data.winStreak;
        
        const li = document.createElement('li');
        li.className = 'leaderboard-item';
        
        // Display rank as number
        const rankDisplay = `${currentRank}.`;
        
        li.innerHTML = `
          <span class="leaderboard-rank">${rankDisplay}</span>
          <span class="leaderboard-name">${data.playerName}</span>
          <span class="leaderboard-score">${data.winStreak} wins</span>
        `;
        
        // Highlight current player's entry
        if (data.playerName === playerName) {
          li.style.backgroundColor = '#f0f7f0';
          li.style.fontWeight = '600';
        }
        
        leaderboardList.appendChild(li);
      });
    }, (error) => {
      console.error('Error loading leaderboard:', error);
      leaderboardList.innerHTML = '<li class="loading-message">Error loading leaderboard. Check Firebase configuration.</li>';
    });
  } catch (error) {
    console.error('Error setting up leaderboard:', error);
    leaderboardList.innerHTML = '<li class="loading-message">Error loading leaderboard. Check Firebase configuration.</li>';
  }
}

// Initialize leaderboard on page load
loadLeaderboard();

