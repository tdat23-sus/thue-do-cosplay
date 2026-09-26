const characters = [
    {
        name: "Hu Tao",
        description: "Genshin Impact",
        image: "https://placehold.co/500x700?text=Hu+Tao"
    },
    {
        name: "Furina",
        description: "Genshin Impact",
        image: "https://placehold.co/500x700?text=Furina"
    },
    {
        name: "Hatsune Miku",
        description: "Vocaloid",
        image: "https://placehold.co/500x700?text=Miku"
    },
    {
        name: "Kafka",
        description: "Honkai: Star Rail",
        image: "https://placehold.co/500x700?text=Kafka"
    }
];

const characterList = document.getElementById("character-list");
const calendarPage = document.getElementById("calendar-page");

function showCharacters() {

    characterList.innerHTML = "";

    characters.forEach((character, index) => {

        const card = document.createElement("div");

        card.className = "character-card";

        card.innerHTML = `
            <img src="${character.image}">
            <h3>${character.name}</h3>
            <p>${character.description}</p>
        `;

        card.onclick = () => showCalendar(index);

        characterList.appendChild(card);
    });
}

function showCalendar(index) {

    const character = characters[index];

    characterList.classList.add("hidden");
    calendarPage.classList.remove("hidden");

    document.getElementById("character-name").textContent =
        character.name;

    document.getElementById("character-description").textContent =
        character.description;

    createCalendar();
}

function createCalendar() {

    const calendar = document.getElementById("calendar");

    calendar.innerHTML = `
        <h3>Tháng 9 / 2026</h3>

        <div class="calendar-grid">

            <div>CN</div>
            <div>T2</div>
            <div>T3</div>
            <div>T4</div>
            <div>T5</div>
            <div>T6</div>
            <div>T7</div>

            ${createDays()}

        </div>
    `;
}

function createDays() {

    let html = "";

    for (let day = 1; day <= 30; day++) {

        const rented = [5, 12, 18, 19, 25].includes(day);

        html += `
            <div class="day ${rented ? "rented" : "available"}"
                 ${rented ? "" : `onclick="selectDay(${day})"`}>
                ${day}
                <br>
                ${rented ? "Đã thuê" : "Trống"}
            </div>
        `;
    }

    return html;
}

function selectDay(day) {

    alert("Bạn chọn ngày " + day + " để thuê.");
}

function goBack() {

    calendarPage.classList.add("hidden");
    characterList.classList.remove("hidden");
}

showCharacters();