<template>
  <router-view></router-view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const number = ref(0); // Replace this with your actual number variable

const numberClass = computed(() => {
  return number.value > 0 ? 'positive' : 'negative';
});
</script>

<style>
* {
  font-family: Helvetica, Arial;
  font-size: 10px;
}

body {
  background-color: #0f0f1b;
  padding: 0%;
  margin: 0%;
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.positive {
  color: #4caf50;
}

.negative {
  color: #90bff9;
}

/* #0f0f1b  - colore background base scuro / header footer base
#6848a8 - colore viola per bottone login - potrebbe essere bello come highlight
#fffff - bianco puro, per me va bene, magari usarlo con opacità per effetto highlight 
#b2b2b2 - bianco sporco, per icone dentro bianco, anche questo mi piace 
#2c2b3e- secondo background, più chiaro, può servire.
#4caf50 - colore verde, positivo, buono
#90bff9 - colore azzurrino misto viola per indicare valore negativo, buono.


#51428b - colore hover element screener, non è male dai.
#4c4a66 - colore hover menu tendina, non è male.


#7662be - colore selected screener, non mi piace tanto, andrebbe sostituito
#544966 - colore da sostituire, summary tabelle charts , anche screener.
#3a3246 - colore da sostituire, watchlist, mi fa ancora più schifo di quello di prima.
#3a3246 - colore earnings grafico, sostituisci con #6848a8 e vediamo 

Servono colori standardizzati per la piattaforma.

Base 1 - #0f0f1b
Base 2 (contrasto) - #2c2b3e
Standard (colore superficie base) - ???
Bianco 1 
Bianco 2 (più scuro) - icone nello screener vanno benissimo, usiamo quelle come riferimento
Colore UP 
Colore DOWN
Hover-color 1 (acceso)
Hover-color2 (pacato)
Highlight-color 1 (più acceso)
Highlight-color 2 (più leggero)
*/
</style>
