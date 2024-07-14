document.addEventListener("DOMContentLoaded", function() {
    var dots = document.querySelector(".dots");

    dots.addEventListener("click", function() {
        displayText();
    });
});

function displayText() {
    var text = document.getElementById("textField");
    if (text.style.display === "none" || text.style.display === "") {
        text.style.display = "block";
    } else {
        text.style.display = "none";
    }
  }