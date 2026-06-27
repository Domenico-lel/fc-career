# FC Career — Modalità Carriera Allenatore (MVP)

Web app gestionale che simula una mini-stagione: gestione rosa, simulazione
partite, calendario e classifica. Tutto in locale (localStorage), con
un'architettura pronta per il passaggio a backend/DB in produzione.

## Avvio

```bash
npm install
npm run dev
```

Apri l'URL mostrato (di solito http://localhost:5173).

## Architettura (a strati)

```
src/
├─ domain/   Logica pura (TS, zero React): motore, calendario, classifica, modelli
├─ data/     Persistenza: GameRepository (interfaccia) + LocalStorageRepository + dati seed
├─ state/    GameContext: collega la UI al domain e gestisce il salvataggio
└─ ui/       Solo presentazione (componenti React + schermate)
```

Regola: `domain/` non importa mai da `ui/` o `data/`. La dipendenza va in una
direzione sola, così il refactoring verso la produzione resta indolore.

### Passaggio a produzione (futuro)

Creare una `ApiGameRepository` che implementa `GameRepository` chiamando un
backend, e sostituirla in `src/state/GameContext.tsx`. La UI non cambia.

## Cuore del gioco

- `domain/engine/matchEngine.ts` — simulazione partita (Expected Goals + Poisson),
  deterministica con seed. Tutto il bilanciamento è nella costante `CONFIG`.
- `domain/league/` — generazione calendario (round-robin) e calcolo classifica.
- `domain/game/gameService.ts` — orchestrazione della stagione.
