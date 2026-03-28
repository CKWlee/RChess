# StealthChess

chess disguised as an RStudio session. the board renders as a fake corrplot heatmap, moves go through an R-like console, and the game logic is full chess under the hood. built so it looks like normal analyst work at a glance.

**[live demo →](https://rchess-cbf96.web.app)**

---

- accepts SAN and coordinate notation (`e4`, `Nf3`, `Bxe5`, `O-O`)
- minimax AI with alpha-beta pruning, runs entirely in-browser
- Elo tracking with Google sign-in and cloud profile persistence
- falls back to a local profile if you stay anonymous
- boss-mode toggle, R-like console UX

## run locally

```bash
npm install
npm run dev
```

then open `http://localhost:3000`

## console commands

```r
> move("e4")
> move("Nf3")
> board()
> help()
> new_game()
> resign()
> .rs_help()
```

## firebase setup

1. copy `.env.example` to `.env.local`
2. fill in the `VITE_FIREBASE_*` values
3. enable Google auth in Firebase Console
4. deploy `firestore.rules`

## deploy

```bash
npm run build
npx firebase-tools deploy --only hosting
```

## license

MIT