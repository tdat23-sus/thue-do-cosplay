/* =========================================
   SUPABASE + AUTH
========================================= */

const SUPABASE_URL =
    "https://rydkgmtlmhjftbwukzdn.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_wIOEpyFJLjH_aWSwnUIF-g_WCvEUOot";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

let currentUser = null;
let currentProfile = null;
let authMode = "login";
let pendingBookingDay = null;


/* =========================================
   AUTH MODAL
========================================= */

function openAuthModal(message = "") {

    const modal =
        document.getElementById("auth-modal");

    document.getElementById("auth-message")
        .textContent = message;

    modal.classList.remove("hidden");

    setAuthMode(authMode);

    setTimeout(() => {

        document
            .getElementById("auth-email")
            .focus();

    }, 50);
}


function closeAuthModal() {

    document
        .getElementById("auth-modal")
        .classList.add("hidden");

}


function toggleAuthMode() {

    setAuthMode(
        authMode === "login"
            ? "register"
            : "login"
    );
}


function setAuthMode(mode) {

    authMode = mode;

    const register =
        mode === "register";


    document
        .getElementById("auth-title")
        .textContent =
        register
            ? "Tạo tài khoản"
            : "Đăng nhập";


    document
        .getElementById("auth-submit")
        .textContent =
        register
            ? "Đăng ký"
            : "Đăng nhập";


    document
        .getElementById("auth-name-label")
        .classList
        .toggle(
            "hidden",
            !register
        );


    document
        .getElementById("auth-switch-text")
        .textContent =
        register
            ? "Đã có tài khoản?"
            : "Chưa có tài khoản?";


    document
        .getElementById("auth-switch")
        .textContent =
        register
            ? "Đăng nhập"
            : "Đăng ký";
}


/* =========================================
   AUTH SUBMIT
========================================= */

async function handleAuthSubmit(event) {

    event.preventDefault();


    const email =
        document
            .getElementById("auth-email")
            .value
            .trim();


    const password =
        document
            .getElementById("auth-password")
            .value;


    const name =
        document
            .getElementById("auth-name")
            .value
            .trim();


    const submitButton =
        document
            .getElementById("auth-submit");


    submitButton.disabled = true;

    submitButton.textContent =
        "Đang xử lý...";


    try {

        /* =========================
           REGISTER
        ========================= */

        if (authMode === "register") {

            const { data, error } =
                await supabaseClient.auth.signUp({

                    email,

                    password,

                    options: {

                        data: {
                            full_name: name
                        }

                    }

                });


            if (error)
                throw error;


            if (data.session) {

                showToast(
                    "Tạo tài khoản thành công!"
                );

            } else {

                showToast(
                    "Đăng ký thành công. Kiểm tra email nếu Supabase yêu cầu xác nhận."
                );

            }


            closeAuthModal();

        }


        /* =========================
           LOGIN
        ========================= */

        else {

            const { error } =
                await supabaseClient
                    .auth
                    .signInWithPassword({

                        email,

                        password

                    });


            if (error)
                throw error;


            closeAuthModal();


            showToast(
                "Đăng nhập thành công!"
            );


            /*
               Nếu người dùng bấm vào
               một ngày thuê trước khi
               đăng nhập, sau khi đăng nhập
               sẽ quay lại cửa sổ thuê.
            */

            if (
                pendingBookingDay !== null
            ) {

                const day =
                    pendingBookingDay;


                pendingBookingDay =
                    null;


                setTimeout(() => {

                    openBooking(day);

                }, 150);

            }

        }


    } catch (error) {

        console.error(
            "AUTH ERROR:",
            error
        );


        document
            .getElementById("auth-message")
            .textContent =
            translateAuthError(
                error.message
            );


    } finally {

        submitButton.disabled = false;


        submitButton.textContent =
            authMode === "register"
                ? "Đăng ký"
                : "Đăng nhập";

    }

}


/* =========================================
   AUTH ERROR TRANSLATION
========================================= */

function translateAuthError(message) {

    if (!message)
        return "Có lỗi xảy ra.";


    if (
        message.includes(
            "Invalid login credentials"
        )
    ) {

        return "Email hoặc mật khẩu không đúng.";

    }


    if (
        message.includes(
            "User already registered"
        )
    ) {

        return "Email này đã được đăng ký.";

    }


    if (
        message.includes(
            "Password should be at least"
        )
    ) {

        return "Mật khẩu phải có ít nhất 6 ký tự.";

    }


    if (
        message.includes(
            "Email not confirmed"
        )
    ) {

        return "Email chưa được xác nhận.";

    }


    return message;
}


/* =========================================
   LOGOUT
========================================= */

async function signOutUser() {

    const { error } =
        await supabaseClient
            .auth
            .signOut();


    if (error) {

        console.error(error);

        showToast(
            "Không thể đăng xuất."
        );

        return;
    }


    showToast(
        "Đã đăng xuất."
    );
}


/* =========================================
   LOAD PROFILE
========================================= */

async function loadCurrentProfile(user) {

    currentUser = user;

    currentProfile = null;


    if (!user) {

        updateAuthUI();

        return;
    }


    const { data, error } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, full_name, phone, avatar_url, role"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "PROFILE ERROR:",
            error
        );

    } else {

        currentProfile = data;

    }


    updateAuthUI();
}


/* =========================================
   UPDATE AUTH UI
========================================= */

function updateAuthUI() {

    const button =
        document.getElementById(
            "auth-button"
        );


    const userBox =
        document.getElementById(
            "auth-user"
        );


    const name =
        document.getElementById(
            "auth-user-name"
        );


    const role =
        document.getElementById(
            "auth-user-role"
        );


    if (!button || !userBox)
        return;


    /* =========================
       NOT LOGGED IN
    ========================= */

    if (!currentUser) {

        button.style.display =
            "inline-block";

        userBox.style.display =
            "none";

        return;
    }


    /* =========================
       LOGGED IN
    ========================= */

    button.style.display =
        "none";

    userBox.style.display =
        "flex";


    name.textContent =
        currentProfile?.full_name ||
        currentUser.email ||
        "Tài khoản";


    const isAdmin =
        currentProfile?.role === "admin";


    role.textContent =
        isAdmin
            ? "ADMIN"
            : "KHÁCH";


    role.style.display =
        "inline-block";
}


/* =========================================
   AUTH STATE LISTENER
========================================= */

supabaseClient
    .auth
    .onAuthStateChange(
        (_event, session) => {

            setTimeout(() => {

                loadCurrentProfile(
                    session?.user || null
                );

            }, 0);

        }
    );


/* =========================================
   INIT AUTH
========================================= */

async function initAuth() {

    const { data, error } =
        await supabaseClient
            .auth
            .getSession();


    if (error) {

        console.error(
            "SESSION ERROR:",
            error
        );

        return;
    }


    await loadCurrentProfile(
        data.session?.user || null
    );
}


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
    document.getElementById(
        "character-list"
    );


const characterCount =
    document.getElementById(
        "character-count"
    );


const homePage =
    document.getElementById(
        "home-page"
    );


const characterPage =
    document.getElementById(
        "character-page"
    );


/* =========================================
   SHOW CHARACTERS
========================================= */

function showCharacters(
    list = characters
) {

    characterList.innerHTML = "";


    characterCount.textContent =
        `${list.length} nhân vật`;


    if (list.length === 0) {

        characterList.innerHTML = `

            <p
                style="
                    grid-column:1/-1;
                    color:#888;
                "
            >
                Không tìm thấy nhân vật.
            </p>

        `;

        return;
    }


    list.forEach(character => {

        const card =
            document.createElement(
                "article"
            );


        card.className =
            "character-card";


        card.innerHTML = `

            <img
                class="character-card-image"
                src="${character.image}"
                alt="${character.name}"
            >

            <div
                class="character-card-info"
            >

                <div
                    class="character-card-category"
                >
                    ${character.category}
                </div>

                <h3
                    class="character-card-name"
                >
                    ${character.name}
                </h3>

                <div
                    class="character-card-price"
                >
                    ${character.price}
                </div>

            </div>

        `;


        card.onclick = () => {

            openCharacter(
                character.id
            );

        };


        characterList.appendChild(
            card
        );

    });

}


/* =========================================
   OPEN CHARACTER
========================================= */

function openCharacter(id) {

    const character =
        characters.find(
            item => item.id === id
        );


    if (!character)
        return;


    selectedCharacter =
        character;


    homePage.classList.add(
        "hidden"
    );


    characterPage.classList.remove(
        "hidden"
    );


    document
        .getElementById("detail-image")
        .src =
        character.image;


    document
        .getElementById("detail-image")
        .alt =
        character.name;


    document
        .getElementById("detail-category")
        .textContent =
        character.category;


    document
        .getElementById("detail-name")
        .textContent =
        character.name;


    document
        .getElementById("detail-description")
        .textContent =
        character.description;


    document
        .getElementById("detail-price")
        .textContent =
        character.price;


    const items =
        document.getElementById(
            "detail-items"
        );


    items.innerHTML = "";


    character.items.forEach(
        item => {

            const li =
                document.createElement(
                    "li"
                );


            li.textContent =
                item;


            items.appendChild(
                li
            );

        }
    );


    /*
       Hiện tại vẫn mở mặc định
       tháng 9/2026.
    */

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

    characterPage.classList.add(
        "hidden"
    );


    homePage.classList.remove(
        "hidden"
    );


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
            .getElementById(
                "search-input"
            )
            .value
            .toLowerCase()
            .trim();


    const result =
        characters.filter(
            character =>

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

    if (!selectedCharacter)
        return;


    const calendar =
        document.getElementById(
            "calendar"
        );


    const monthTitle =
        document.getElementById(
            "month-title"
        );


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


    weekdays.forEach(
        day => {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "calendar-weekday";


            element.textContent =
                day;


            calendar.appendChild(
                element
            );

        }
    );


    /*
       JavaScript:
       Sunday = 0

       Chuyển sang:
       Monday = 0
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
            document.createElement(
                "div"
            );


        empty.className =
            "calendar-empty";


        calendar.appendChild(
            empty
        );

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
            document.createElement(
                "div"
            );


        const rented =
            selectedCharacter
                .rentedDays
                .includes(day);


        element.className =
            `calendar-day ${
                rented
                    ? "rented"
                    : "available"
            }`;


        element.innerHTML = `

            <div
                class="calendar-day-number"
            >
                ${day}
            </div>

            <span
                class="day-status"
            >
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


        calendar.appendChild(
            element
        );

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

    /*
       Nếu chưa đăng nhập,
       yêu cầu đăng nhập trước.
    */

    if (!currentUser) {

        pendingBookingDay = day;


        openAuthModal(
            "Bạn cần đăng nhập để gửi yêu cầu thuê."
        );


        return;
    }


    const modal =
        document.getElementById(
            "booking-modal"
        );


    document
        .getElementById(
            "booking-title"
        )
        .textContent =
        `Thuê ${selectedCharacter.name}`;


    document
        .getElementById(
            "booking-date"
        )
        .textContent =
        `Ngày ${day}/${currentMonth + 1}/${currentYear}`;


    modal.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "customer-name"
        )
        .value =
        currentProfile?.full_name ||
        "";


    document
        .getElementById(
            "customer-phone"
        )
        .value =
        currentProfile?.phone ||
        "";


    document
        .getElementById(
            "customer-name"
        )
        .focus();

}


/* =========================================
   CLOSE BOOKING
========================================= */

function closeBooking() {

    document
        .getElementById(
            "booking-modal"
        )
        .classList.add(
            "hidden"
        );

}


/* =========================================
   SUBMIT BOOKING
========================================= */

function submitBooking(event) {

    event.preventDefault();


    if (!currentUser) {

        closeBooking();


        pendingBookingDay =
            null;


        openAuthModal(
            "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."
        );


        return;
    }


    const name =
        document
            .getElementById(
                "customer-name"
            )
            .value
            .trim();


    const phone =
        document
            .getElementById(
                "customer-phone"
            )
            .value
            .trim();


    const note =
        document
            .getElementById(
                "customer-note"
            )
            .value
            .trim();


    console.log(

        "BOOKING PREVIEW:",

        {

            user_id:
                currentUser.id,

            character:
                selectedCharacter.name,

            name,

            phone,

            note

        }

    );


    /*
       BƯỚC HIỆN TẠI:

       Auth đã kết nối Supabase.

       Đơn thuê sẽ được ghi vào
       bảng rentals sau khi
       characters cũng được chuyển
       từ dữ liệu cứng sang Supabase
       ở bước kế tiếp.
    */


    closeBooking();


    showToast(
        "Đã nhận thông tin. Bước tiếp theo sẽ lưu đơn vào Supabase."
    );


    event.target.reset();

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 2500);

}


/* =========================================
   SEARCH BUTTON
========================================= */

function focusSearch() {

    goHome();


    setTimeout(() => {

        document
            .getElementById(
                "search-input"
            )
            .focus();

    }, 100);

}


/* =========================================
   CLOSE AUTH WHEN CLICK OUTSIDE
========================================= */

document
    .getElementById("auth-modal")
    ?.addEventListener(
        "click",
        (event) => {

            if (
                event.target.id ===
                "auth-modal"
            ) {

                closeAuthModal();

            }

        }
    );


/* =========================================
   INITIALIZE
========================================= */

showCharacters();

initAuth();
