# LOOT JACKAL, LOOT! - Leaderboard Web

Web page that displays the "Loot Jackal, Loot!" game leaderboard in real-time, connecting to Firebase Realtime Database.

🌐 [View Live Leaderboard](https://fededc512.github.io/jackal-leaderboard-web/)

## ✨ Features

- 🏆 **Full leaderboard** with all registered scores
- 🥇🥈🥉 **Medals** for top 3 players, ⭐ **Top 10 highlighted**
- 🔄 **Real-time updates** via Firebase Realtime Database
- 🟢 **Connection status**: Live / Reconnecting / Disconnected
- ⏰ **Last update timestamp**
- ⏱️ **Time shown next to scores**
- 📱 **Responsive design** with animated space background

## 🎮 Coherence with the Godot Game

This web leaderboard is fully compatible with the Godot game's leaderboard system. Both versions connect to the same Firebase database path and use the same data structure, ensuring scores uploaded from the game appear instantly on the web page.

The core behavior is identical: a 10-second loading timeout, real-time listeners for data updates, automatic cleanup of Firebase connections when closing the page, and descending score sorting.

The main differences are intentional adaptations for the web context. While the Godot game requires authentication to upload scores, the web page uses public read access (no login needed) since it's read-only. The game shows only the top 10 scores, but the web version displays all scores with the top 10 highlighted, which is better for monitoring. The web page also adds a connection status indicator and a last update timestamp, useful features when viewing remotely that aren't needed in-game.


## 📋 TODO

- [x] Replace site icon with a proper favicon
- [x] Add a separate leaderboard section for the release version
- [x] Display time alongside score
- [ ] Add the game logo