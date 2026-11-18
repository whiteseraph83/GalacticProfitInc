# Asset di riferimento

Immagini fornite dall'utente in chat, salvate qui come riferimento
artistico. Non sono sprite pronti per il rendering di gioco (sfondo
spaziale non ritagliato, formato carta non diviso in zona immagine/testo):
vedi sezione A5 del documento di design.

- `planets/`: 7 pianeti di esempio con filtri colore/bordo luminoso e un
  foglio riepilogativo degli 8 archetipi (`archetipi_sheet_ref.webp`).
  Da usare come riferimento quando, al Macrostep 1, si implementeranno le
  varianti `planetVisualProfile` (tint, alone, scala, atmosfera).
- `cards/`: 6 template di carta (uno per ciascuna carta base) con cornice
  tecnologica e illustrazione gia' al ~50% della superficie. Da usare come
  riferimento quando, al Macrostep 3, i testi/numeri verranno renderizzati
  dinamicamente da React sopra questi frame (mai incollati nell'immagine
  raster).
- `ships/`: 9 illustrazioni vista dall'alto, una per tipo di nave (nave
  madre, navette esplorazione/indagine/recupero/cargo, nave mineraria,
  nave costruzione, nave ricerca, nave difesa). Sfondo spaziale NON
  ritagliato: non sono ancora sprite trasparenti utilizzabili cosi' come
  sono. Il Macrostep 2 usa grafiche vettoriali procedurali (PixiJS
  Graphics) per nave madre/navette/nave mineraria, in attesa di un
  ritaglio/masking di queste immagini in asset realmente pronti per il
  rendering. La nave difesa e' puramente di riferimento concettuale: il
  documento di design vieta armi/combattimento offensivo (A4).
