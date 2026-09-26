/* =========================================
   CHARACTER DATA
========================================= */

const characters = [

    {
        id: "hutao",

        name: "Hu Tao",

        category: "Genshin Impact",

        price: "250.000đ / ngày",

        description:
            "Bộ cosplay Hu Tao với trang phục và phụ kiện cơ bản.",

        image:
            "https://placehold.co/700x900/e8dce5/332b33?text=HU+TAO",

        items: [
            "Trang phục Hu Tao",
            "Tóc giả",
            "Phụ kiện",
            "Các chi tiết đi kèm"
        ],

        rentedDays: [
            5,
            12,
            18,
            19,
            25
        ]
    },


    {
        id: "furina",

        name: "Furina",

        category: "Genshin Impact",

        price: "300.000đ / ngày",

        description:
            "Bộ cosplay Furina phong cách Fontaine.",

        image:
            "https://placehold.co/700x900/dce7f0/28313b?text=FURINA",

        items: [
            "Trang phục Furina",
            "Tóc giả",
            "Phụ kiện",
            "Trang sức"
        ],

        rentedDays: [
            3,
            4,
            15,
            22
        ]
    },


    {
        id: "miku",

        name: "Hatsune Miku",

        category: "Vocaloid",

        price: "200.000đ / ngày",

        description:
            "Bộ cosplay Hatsune Miku với tóc giả và phụ kiện.",

        image:
            "https://placehold.co/700x900/dcefeb/263634?text=MIKU",

        items: [
            "Trang phục",
            "Tóc giả xanh",
            "Phụ kiện",
            "Cà vạt"
        ],

        rentedDays: [
            7,
            8,
            20
        ]
    },


    {
        id: "kafka",

        name: "Kafka",

        category: "Honkai: Star Rail",

        price: "300.000đ / ngày",

        description:
            "Bộ cosplay Kafka phong cách Honkai: Star Rail.",

        image:
            "https://placehold.co/700x900/e9dce1/352c30?text=KAFKA",

        items: [
            "Trang phục Kafka",
            "Tóc giả",
            "Kính",
            "Phụ kiện"
        ],

        rentedDays: [
            2,
            10,
            11,
            27
        ]
    },


    {
        id: "raiden",

        name: "Raiden Shogun",

        category: "Genshin Impact",

        price: "280.000đ / ngày",

        description:
            "Bộ cosplay Raiden Shogun với trang phục và phụ kiện.",

        image:
            "https://placehold.co/700x900/e2dff0/302d3d?text=RAIDEN",

        items: [
            "Trang phục",
            "Tóc giả",
            "Phụ kiện",
            "Đạo cụ"
        ],

        rentedDays: [
            6,
            14,
            21,
            28
        ]
    },


    {
        id: "navia",

        name: "Navia",

        category: "Genshin Impact",

        price: "280.000đ / ngày",

        description:
            "Bộ cosplay Navia phong cách Fontaine.",

        image:
            "https://placehold.co/700x900/f0e2cf/3b3328?text=NAVIA",

        items: [
            "Trang phục Navia",
            "Tóc giả",
            "Mũ",
            "Phụ kiện"
        ],

        rentedDays: [
            9,
            16,
            23
        ]
    }

];


/* =========================================
   STATE
========================================= */

let selectedCharacter = null;

let currentMonth = 8;

let currentYear = 2026;


/* =========================================
   ELEMENTS
========================================= */

const characterList =
    document.getElementById("character-list");

const characterCount =
    document.getElementById("character-count");

const homePage =
    document.getElementById("home-page");

const characterPage =
    document.getElementById("character-page");


/* =========================================
   SHOW CHARACTERS
========================================= */

function showCharacters(list = characters) {

    characterList.innerHTML = "";

    characterCount.textContent =
        `${list.length} nhân vật`;


    if (list.length === 0) {

        characterList.innerHTML = `
            <p style="grid-column:1/-1;color:#888;">
                Không tìm thấy nhân vật.
            </p>
        `;

        return;
    }


    list.forEach(character => {

        const card =
            document.createElement("article");

        card.className =
            "character-card";


        card.innerHTML = `

            <img
                class="character-card-image"
                src="${character.image}"
                alt="${character.name}"
            >

            <div class="character-card-info">

                <div class="character-card-category">
                    ${character.category}
                </div>

                <h3 class="character-card-name">
                    ${character.name}
                </h3>

                <div class="character-card-price">
                    ${character.price}
                </div>

            </div>

        `;


        card.onclick = () => {

            openCharacter(character.id);

        };


        characterList.appendChild(card);

    });

}


/* =========================================
   OPEN CHARACTER
========================================= */

function openCharacter(id) {

    const character =
        characters.find(item => item.id === id);


    if (!character) return;


    selectedCharacter =
        character;


    homePage.classList.add("hidden");

    characterPage.classList.remove("hidden");


    document.getElementById("detail-image").src =
        character.image;

    document.getElementById("detail-image").alt =
        character.name;


    document.getElementById("detail-category").textContent =
        character.category;


    document.getElementById("detail-name").textContent =
        character.name;


    document.getElementById("detail-description").textContent =
        character.description;


    document.getElementById("detail-price").textContent =
        character.price;


    const items =
        document.getElementById("detail-items");


    items.innerHTML = "";


    character.items.forEach(item => {

        const li =
            document.createElement("li");

        li.textContent = item;

        items.appendChild(li);

    });


    currentMonth = 8;

    currentYear = 2026;


    renderCalendar();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================
   HOME
========================================= */

function goHome() {

    characterPage.classList.add("hidden");

    homePage.classList.remove("hidden");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================
   SEARCH
========================================= */

function searchCharacters() {

    const keyword =
        document
            .getElementById("search-input")
            .value
            .toLowerCase()
            .trim();


    const result =
        characters.filter(character =>

            character.name
                .toLowerCase()
                .includes(keyword)

            ||

            character.category
                .toLowerCase()
                .includes(keyword)

        );


    showCharacters(result);

}


/* =========================================
   CALENDAR
========================================= */

function renderCalendar() {

    if (!selectedCharacter) return;


    const calendar =
        document.getElementById("calendar");


    const monthTitle =
        document.getElementById("month-title");


    const monthNames = [

        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12"

    ];


    monthTitle.textContent =
        `${monthNames[currentMonth]} ${currentYear}`;


    calendar.innerHTML = "";


    const weekdays = [

        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "CN"

    ];


    weekdays.forEach(day => {

        const element =
            document.createElement("div");

        element.className =
            "calendar-weekday";

        element.textContent =
            day;

        calendar.appendChild(element);

    });


    /*
       JS: Sunday = 0

       We convert it so Monday = 0
    */

    const firstDay =
        new Date(
            currentYear,
            currentMonth,
            1
        ).getDay();


    const mondayIndex =
        firstDay === 0
            ? 6
            : firstDay - 1;


    for (
        let i = 0;
        i < mondayIndex;
        i++
    ) {

        const empty =
            document.createElement("div");

        empty.className =
            "calendar-empty";

        calendar.appendChild(empty);

    }


    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const element =
            document.createElement("div");


        const rented =
            selectedCharacter.rentedDays
                .includes(day);


        element.className =
            `calendar-day ${
                rented
                    ? "rented"
                    : "available"
            }`;


        element.innerHTML = `

            <div class="calendar-day-number">
                ${day}
            </div>

            <span class="day-status">
                ${
                    rented
                        ? "Đã thuê"
                        : "Còn trống"
                }
            </span>

        `;


        if (!rented) {

            element.onclick = () => {

                openBooking(day);

            };

        }


        calendar.appendChild(element);

    }

}


/* =========================================
   MONTH NAVIGATION
========================================= */

function previousMonth() {

    currentMonth--;

    if (currentMonth < 0) {

        currentMonth = 11;

        currentYear--;

    }


    renderCalendar();

}


function nextMonth() {

    currentMonth++;

    if (currentMonth > 11) {

        currentMonth = 0;

        currentYear++;

    }


    renderCalendar();

}


/* =========================================
   BOOKING
========================================= */

function openBooking(day) {

    const modal =
        document.getElementById("booking-modal");


    document.getElementById("booking-title")
        .textContent =
        `Thuê ${selectedCharacter.name}`;


    document.getElementById("booking-date")
        .textContent =
        `Ngày ${day}/${currentMonth + 1}/${currentYear}`;


    modal.classList.remove("hidden");


    document
        .getElementById("customer-name")
        .focus();

}


function closeBooking() {

    document
        .getElementById("booking-modal")
        .classList.add("hidden");

}


/* =========================================
   SUBMIT BOOKING
========================================= */

function submitBooking(event) {

    event.preventDefault();


    const name =
        document
            .getElementById("customer-name")
            .value;


    const phone =
        document
            .getElementById("customer-phone")
            .value;


    console.log(
        "BOOKING:",
        {
            character:
                selectedCharacter.name,

            name:
                name,

            phone:
                phone,

            note:
                document
                    .getElementById("customer-note")
                    .value
        }
    );


    closeBooking();


    showToast(
        "Đã gửi yêu cầu thuê!"
    );


    event.target.reset();

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById("toast");


    toast.textContent =
        message;


    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* =========================================
   SEARCH BUTTON
========================================= */

function focusSearch() {

    goHome();


    setTimeout(() => {

        document
            .getElementById("search-input")
            .focus();

    }, 100);

}


/* =========================================
   INITIALIZE
========================================= */

showCharacters();
