# AGENTS.md

Linee guida per mantenere il progetto pulito, leggibile e facile da modificare.

## Obiettivo

Il codice deve essere semplice da capire, sicuro da cambiare e coerente con il dominio dell'app: gestione studio di massoterapia, clienti, calendario, abbonamenti, voucher, pagamenti e area utente.

Prima di modificare una funzionalita, leggere i requisiti in `docs/app.txt`, `docs/specs.txt` e nei workflow in `docs/WORK FLOW MTUSA MASSAGES.xlsx`.

## Comandi Utili

- `npm run dev`: avvia Vite in sviluppo.
- `npm run build`: verifica che l'app compili per produzione.

Eseguire sempre `npm run build` dopo modifiche a React, CSS, configurazione o dipendenze.

## Principi Di Clean Code

- Preferire codice esplicito a codice "furbo".
- Ogni funzione deve fare una cosa sola e avere un nome che descrive chiaramente cosa fa.
- Evitare duplicazione di logica: se una regola di business compare in piu punti, estrarla in una funzione.
- Non mescolare rendering UI, trasformazioni dati e integrazioni esterne nella stessa funzione quando crescono di complessita.
- Usare nomi di variabili coerenti con il dominio: `client`, `appointment`, `voucher`, `subscription`, `prepaid`, `payment`.
- Evitare abbreviazioni poco chiare.
- Non aggiungere commenti che ripetono il codice; commentare solo decisioni, vincoli o logiche non ovvie.

## React

- Tenere i componenti piccoli e orientati a una responsabilita.
- Spostare componenti riutilizzabili fuori da `App` quando crescono oltre una singola vista.
- Evitare componenti con troppe props non correlate; in quel caso creare oggetti di dominio o sotto-componenti.
- Non mutare direttamente array o oggetti nello stato React. Usare sempre copie tramite `map`, spread o funzioni pure.
- Derivare valori con `useMemo` solo quando migliora chiarezza o prestazioni reali.
- Usare `useEffect` solo per effetti esterni: API, script, storage, timers, integrazioni browser.
- Evitare logica di business direttamente dentro JSX complesso; preparare variabili leggibili prima del `return`.

## Stato E Dati

- Mantenere una singola fonte di verita per ogni dato.
- Gli appuntamenti devono riferirsi ai clienti tramite `clientId`, non duplicare l'intera anagrafica.
- Le regole di calendario, cancellazione, abbonamenti e voucher devono vivere in funzioni dedicate se usate in piu schermate.
- Non salvare credenziali o segreti nel codice. Usare variabili `VITE_*` e documentarle in `.env.example`.
- Per integrazioni reali con backend o Google Calendar, isolare le chiamate API in moduli dedicati.

## UI E CSS

- Preferire layout chiari, densi e operativi: questa e un'app gestionale, non una landing page.
- Usare classi CSS descrittive e coerenti.
- Non creare stili ad hoc duplicati se una classe esistente risolve lo stesso caso.
- Verificare sempre mobile e desktop quando si modifica griglie, tabelle, calendario o form.
- Testi nei pulsanti: brevi, orientati all'azione, coerenti con il workflow.
- Non inserire testo istruttivo ridondante nell'interfaccia se il controllo e gia chiaro.

## Form

- Ogni form deve avere campi `name` coerenti con la struttura dati.
- Validare almeno i campi obbligatori lato UI.
- I form di creazione e modifica devono riusare lo stesso componente quando hanno gli stessi campi.
- Dopo la creazione di un record, selezionare il nuovo elemento se e utile per il workflow.
- Dopo una modifica, mostrare un feedback chiaro nello stato o nella notifica.

## Workflow Di Dominio

- Il calendario deve mantenere buffer di 15 minuti tra trattamenti.
- Appuntamenti con abbonamento o voucher possono avere conferma istantanea.
- Appuntamenti senza abbonamento/voucher richiedono approvazione operatore.
- Entro 24 ore dalla cancellazione, abbonamento o voucher scalano un trattamento.
- La prepagata/wallet deve avere credito e validita.
- L'area utente deve mostrare solo i dati del cliente selezionato.
- Le azioni operative dell'operatore non devono comparire in viste pensate come sola lettura per l'utente.

## Google Calendar

- Non hardcodare `clientId`, `apiKey` o `calendarId`.
- Usare `.env` locale e mantenere `.env.example` aggiornato.
- Prima di sincronizzare, verificare che l'utente abbia completato il login Google.
- Le funzioni di import/export eventi devono gestire errori e stato visibile.
- Se la logica Google cresce, spostarla in un modulo dedicato, ad esempio `src/googleCalendar.js`.

## Testing E Verifica

- Dopo ogni modifica funzionale eseguire `npm run build`.
- Per modifiche al calendario verificare:
  - slot liberi visibili;
  - appuntamenti nel giorno e orario corretti;
  - vista area utente filtrata sul cliente;
  - comportamento mobile senza sovrapposizioni.
- Per modifiche ai clienti verificare:
  - creazione;
  - modifica;
  - selezione cliente;
  - coerenza con appuntamenti esistenti.
- Per modifiche a pagamenti/voucher verificare che non vengano persi abbonamenti, credito o storico.

## Manutenzione

- Non modificare file generati come `dist/` se non richiesto.
- Non editare `node_modules/`.
- Aggiornare documentazione e `.env.example` quando si aggiungono nuove variabili o integrazioni.
- Tenere le modifiche piccole e focalizzate: una richiesta, un insieme coerente di cambiamenti.
- Se una funzione diventa difficile da leggere, estrarre sotto-funzioni prima di aggiungere altra logica.

## Stile Di Commit O Patch

- Descrivere il cambiamento in termini di comportamento, non solo di file toccati.
- Evitare refactor non richiesti insieme a modifiche funzionali.
- Non rimuovere logica esistente senza verificare se e collegata a un workflow documentato.


## Componentizzazione

Evita i monoliti.
Dividi il progetto in componenti semplici.
Un file un componente.
I file devono essere piccoli leggibili e manutenibili.
Non devono essere troppo grandi per agevolare la comprensione.
Non devono essere troppo piccoli per mantenere una granularita`ottimale trade-off.


## Master details

Ogni lista deve essere mostrata a griglia e consentire add, edit, delete di una riga. Quando si va in edit o add deve fare switch con componente di dettaglio. su conferma deve mostrare la griglia aggiornata.

## Modello

Il modello della applicazione deve essere esplicitato in un file a se stante model e aggiornato ogni volta che si rende necessario.
Lo stato della applicazione deve essere tutto su un model appModel che puo`essere persistito rapidamente e ripristinato all'avvio.

## Sezioni

L'applicazione deve essere scomposta in sezioni e moduli che vengono attivati mediante routing.
Il tutto deve essere orchestrato da App.jsx.

## README.md

Aggiorna sempre README.md per rispecchiare il sistema con le sezioni standard per build deploy etc.



