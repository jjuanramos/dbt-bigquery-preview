
const coll = document.getElementsByClassName("collapsible");
for (let i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
        const button = coll[i].getElementsByTagName("button")[0];
        if (button.innerHTML === "▶ { ... }") {
            button.innerHTML = "▼ hide";
        } else {
            button.innerHTML = "▶ { ... }";
        }
        this.classList.toggle("active");
        const content = this.nextElementSibling;
        if (content.style.display === "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });
}