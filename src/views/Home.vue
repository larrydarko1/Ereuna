<template>
    <div class="landing-page">
      <div class="navbar">
        <button class="navbtn">About</button>
        <button class="navbtn">Offer</button>
        <img class="icon" src="@/assets/icons/owl.png" alt="Owl Icon">
        <button class="navbtn">Sign Up</button>
        <button class="navbtn">Login</button>
      </div>
  
      <div class="hero-section">
       iNTERACTIVE 3D Animation goes here
</div>

    <!-- Additional placeholders for scrolling -->
    <div class="content-section">
      <h2>Feature 1</h2>
      <p>Details about feature 1...</p>
    </div>
    <div class="content-section">
      <h2>Feature 2</h2>
      <p>Details about feature 2...</p>
    </div>
    <div class="content-section">
      <h2>Feature 3</h2>
      <p>Details about feature 3...</p>
    </div>
    <div class="content-section">
      <h2>Feature 4</h2>
      <p>Details about feature 4...</p>
    </div>
    <div class="content-section">
      <h2>Feature 5</h2>
      <p>Details about feature 5...</p>
    </div>
  
      <div class="footer">
        <p>&copy; 2025. All rights reserved.</p>
      </div>
    </div>
  </template>
  
  <script setup>
    // Add any necessary script logic here
  </script>
  
  <style scoped>
  
  .navbar {
  display: flex;
  justify-content: space-around;
  align-items: center;
  background-color: #525252; /* Keep the original background color */
  border-radius: 25px;
  color: whitesmoke;
  padding: 10px 0;
  box-shadow: 0 2px 5px rgba(0, 0,  0, 0.1);
  position: fixed; /* Change to fixed to keep it at the top */
  top: 2%; /* Position it at the top of the viewport */
  left: 2%; /* Align it to the left */
  right: 2%; /* Align it to the right */
  z-index: 1000; 
  opacity: 0.60;
}

  .content-section {
  padding: 40px 20px;
  background-color: #1f1f1f; /* Dark background for content sections */
  margin: 10px 0;
  border-radius: 5px;
}
  
  .icon {
    width: 30px; /* Increased size for better visibility */
    height: 30px; /* Increased size for better visibility */
  }
  
  .hero-section {
    color: white;
    height: 1000px;
  }
  
  .footer {
    padding: 20px;
    background-color: #525252;
    color: whitesmoke;
    text-align: center;
    margin-top: 20px;
  }
  
  .navbtn{
    border: none;
    background-color: transparent;
    color: whitesmoke;
    opacity: 0.70;
  }

  .navbtn:hover{
     background-color: transparent;
     opacity: 1;
     color: #9b9cfc;
     cursor: pointer;
  }

  
  </style>