<template>
  <footer>
    <p class="left">Ereuna Platform / Version 1.0.0 / Copyright &copy; 2025 / Developed by <a class="link" href="https://github.com/larrydarko1">Lorenzo Mazzola</a></p>
    <p class="right">For technical support, send an email to <a class="link" href="mailto:contact@ereuna.co">contact@ereuna.co</a></p>
  </footer>
</template>

<script>
export default {
  name: 'Footer',
}
</script>

<style lang="scss">
@use '../style.scss' as *;

footer {
  position: fixed;
  display: flex;
  justify-content: space-between;
  left: 0;
  bottom: 0;
  width: 100%;
  background-color: $base1;
  color: $text1;
  padding: 10px;
  z-index: 1000;
  min-width: 1400px;
}

.left, .right {
  color: #cdcdcd7b;
  opacity: 1;
  font-size: 12px;
  border: none;
  margin: 0;
}

.link{
  color: #cdcdcd7b;
  opacity: 1;
  font-size: 12px;
  border: none;
  margin: 0;
}


.link:hover{
  color: $accent2;
}

.left {
  margin-left: 2%;
}

.right {
  margin-right: 2%;
}
</style>