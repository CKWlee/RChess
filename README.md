# StealthChess

This is a playable chess game wearing an RStudio costume.

- why it exists: quick chess sessions in plain sight
- why it is weird: board is rendered as a fake corrplot heatmap
- why it feels real: console workflow, pane layout, fake analyst session details

Live app:
https://rchess-cbf96.web.app

## What You Can Do

- play from the console with SAN or coordinate notation
- switch AI depth in Tools -> Global Options
- sign in with Google and persist Elo + game history
- play anonymous with local fallback storage
- toggle boss mode with Esc

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Console Commands

```r
> move("e4")
> move("Nf3")
> move("Bxe5")
> move("O-O")
> move("e8=Q")
> board()
> help()
> new_game()
> resign()
> .rs_help()
```

Notes:
- SAN and coordinate input both work
- if you type raw SAN without move(...), the app nudges you with the expected format

## Firebase Setup

1. copy .env.example to .env.local
2. fill all VITE_FIREBASE_* values
3. enable Google auth in Firebase Console
4. create Firestore and deploy firestore.rules

## Deploy

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## Safe GitHub Upload Notes

- .env.local and .env are ignored
- Copilot local instruction files are ignored
- common key/json credential patterns are ignored

## Tech Stack

- React + Vite
- custom chess engine (no chess.js dependency)
- minimax + alpha-beta pruning
- Firebase Auth + Firestore + Hosting

## License

MIT
